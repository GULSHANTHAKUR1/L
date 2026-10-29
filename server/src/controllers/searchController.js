import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import MedicalDocument from '../models/MedicalDocument.js';
import MedicalRecord from '../models/MedicalRecord.js';
import Prescription from '../models/Prescription.js';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import { querySemanticSearch } from '../services/semanticSearchIntegrationService.js';
import { isDoctorLinkedToPatient, getPatientsLinkedToDoctor } from '../utils/ownershipHelpers.js';

const CLINICAL_DISCLAIMER =
  'Results are for record retrieval and do not constitute medical advice or diagnosis.';

/**
 * @desc    Authorized semantic natural language search across clinical records
 * @route   GET /api/search/semantic?q=<query>&patientId=<optional>&sourceType=<optional>&documentType=<optional>
 * @access  Protected (Strictly role-scoped)
 */
export const searchSemantic = asyncHandler(async (req, res) => {
  const { q, patientId, sourceType, documentType, page = 1, limit = 10 } = req.query;

  // 1. Validate query string length (3 to 300 characters)
  if (!q || typeof q !== 'string' || q.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Query must be at least 3 characters long.',
    });
  }

  if (q.trim().length > 300) {
    return res.status(400).json({
      success: false,
      message: 'Query cannot exceed 300 characters.',
    });
  }

  const callerRole = req.user.role;
  const callerId = req.user._id.toString();

  // Validate optional sourceType
  const allowedSourceTypes = ['medical_document', 'medical_record', 'prescription'];
  if (sourceType && !allowedSourceTypes.includes(sourceType)) {
    return res.status(400).json({
      success: false,
      message: `Invalid sourceType. Allowed: ${allowedSourceTypes.join(', ')}`,
    });
  }

  // Validate optional documentType
  const allowedDocumentTypes = ['lab-report', 'prescription', 'discharge-summary', 'xray', 'mri', 'medical-record', 'scan', 'other'];
  if (documentType && !allowedDocumentTypes.includes(documentType)) {
    return res.status(400).json({
      success: false,
      message: `Invalid documentType. Allowed: ${allowedDocumentTypes.join(', ')}`,
    });
  }

  // 2. Enforce Strict Role-Based Access Boundaries
  const filters = {};
  if (sourceType) filters.sourceType = sourceType;
  if (documentType) filters.documentType = documentType;

  let authorizedLinkedPatientIds = [];

  if (callerRole === 'patient') {
    // Patient can ONLY search their own records. Ignore or reject any external patientId.
    if (patientId && patientId !== callerId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot search records belonging to another patient.',
      });
    }
    filters.patientId = callerId;
  } else if (callerRole === 'doctor') {
    // Doctor can only search clinically linked patients
    authorizedLinkedPatientIds = await getPatientsLinkedToDoctor(req.user._id);

    if (patientId) {
      if (!mongoose.Types.ObjectId.isValid(patientId)) {
        return res.status(400).json({ success: false, message: 'Invalid patientId format.' });
      }
      if (!authorizedLinkedPatientIds.includes(patientId)) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are not authorized to search records for this unassigned patient.',
        });
      }
      filters.patientId = patientId;
    } else {
      // If doctor didn't specify a patientId, they are only allowed to see linked patients
      if (authorizedLinkedPatientIds.length === 0) {
        return res.status(200).json({
          success: true,
          query: q.trim(),
          totalResults: 0,
          results: [],
          disclaimer: CLINICAL_DISCLAIMER,
        });
      }
      // Apply strict linked patient IDs filter
      filters.patientIds = authorizedLinkedPatientIds;
    }
  } else if (callerRole === 'admin') {
    // Admin has global visibility across hospital records
    if (patientId) {
      if (!mongoose.Types.ObjectId.isValid(patientId)) {
        return res.status(400).json({ success: false, message: 'Invalid patientId format.' });
      }
      filters.patientId = patientId;
    }
  }

  // 3. Query Python AI Semantic Search Microservice
  const aiSearchResponse = await querySemanticSearch({
    query: q.trim(),
    filters,
    topK: 25,
  });

  const rawResults = aiSearchResponse.results || [];

  // 4. Post-Query Authorization & Existence Verification
  // Verifies each returned source record still exists in MongoDB and the caller is authorized
  const verifiedResults = [];

  for (const item of rawResults) {
    try {
      let recordExists = false;
      let recordPatientId = null;

      if (item.sourceType === 'medical_document') {
        const doc = await MedicalDocument.findById(item.sourceId).select('patientId documentType originalFileName createdAt');
        if (doc) {
          recordExists = true;
          recordPatientId = doc.patientId.toString();
        }
      } else if (item.sourceType === 'medical_record') {
        const rec = await MedicalRecord.findById(item.sourceId).select('patientId diagnosis createdAt');
        if (rec) {
          recordExists = true;
          recordPatientId = rec.patientId.toString();
        }
      } else if (item.sourceType === 'prescription') {
        const presc = await Prescription.findById(item.sourceId).select('patientId createdAt');
        if (presc) {
          recordExists = true;
          recordPatientId = presc.patientId.toString();
        }
      }

      if (!recordExists) {
        continue; // Discard purged or deleted records
      }

      // Check strict caller access
      let isAuthorized = false;
      if (callerRole === 'admin') {
        isAuthorized = true;
      } else if (callerRole === 'patient') {
        isAuthorized = recordPatientId === callerId;
      } else if (callerRole === 'doctor') {
        isAuthorized = authorizedLinkedPatientIds.includes(recordPatientId);
      }

      if (!isAuthorized) {
        continue; // Strip unauthorized results
      }

      // 5. Return Safe Fields Only (Do not expose raw Cloudinary URLs or full documents)
      verifiedResults.push({
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        patientId: recordPatientId,
        documentType: item.documentType || null,
        title: item.title || `${item.sourceType.replace('_', ' ').toUpperCase()}`,
        createdAt: item.date || null,
        snippet: item.snippet,
        relevanceScore: item.similarityScore,
      });
    } catch (checkErr) {
      console.warn(`[Search Verification Warning] Could not verify source '${item.sourceId}':`, checkErr.message);
    }
  }

  // 6. Pagination
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(25, parseInt(limit, 10)));
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedResults = verifiedResults.slice(startIndex, startIndex + limitNum);

  res.status(200).json({
    success: true,
    query: q.trim(),
    totalResults: verifiedResults.length,
    page: pageNum,
    totalPages: Math.ceil(verifiedResults.length / limitNum) || 1,
    results: paginatedResults,
    disclaimer: CLINICAL_DISCLAIMER,
  });
});

/**
 * @desc    Get complete chronological medical timeline for a patient
 * @route   GET /api/search/timeline/:patientId
 * @access  Protected (Patient self, Doctor linked, Admin any)
 */
export const getPatientTimeline = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    return res.status(400).json({ success: false, message: 'Invalid patientId format.' });
  }

  const callerRole = req.user.role;
  const callerId = req.user._id.toString();

  // 1. RBAC Access Verification
  if (callerRole === 'patient' && patientId !== callerId) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You can only view your own medical timeline.',
    });
  }

  if (callerRole === 'doctor') {
    const isLinked = await isDoctorLinkedToPatient(req.user._id, patientId);
    if (!isLinked) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view the timeline of an unassigned patient.',
      });
    }
  }

  // Verify target patient exists
  const patient = await User.findOne({ _id: patientId, role: 'patient' }).select('name email');
  if (!patient) {
    return res.status(404).json({ success: false, message: 'Patient account not found.' });
  }

  // 2. Fetch all medical records, appointments, prescriptions, and documents in parallel
  const [appointments, medicalRecords, prescriptions, documents] = await Promise.all([
    Appointment.find({ patientId })
      .populate('doctorId', 'name specialization')
      .sort({ appointmentDate: -1 }),
    MedicalRecord.find({ patientId })
      .populate('doctorId', 'name specialization')
      .sort({ createdAt: -1 }),
    Prescription.find({ patientId })
      .populate('doctorId', 'name specialization')
      .sort({ createdAt: -1 }),
    MedicalDocument.find({ patientId })
      .populate('uploadedBy', 'name role')
      .sort({ createdAt: -1 }),
  ]);

  // 3. Assemble Unified Chronological Timeline Items
  const timelineItems = [];

  // Appointments
  for (const a of appointments) {
    timelineItems.push({
      id: a._id,
      type: 'appointment',
      date: a.appointmentDate,
      time: a.startTime,
      title: `Consultation with Dr. ${a.doctorId?.name || 'Physician'}`,
      summary: a.reason || 'Routine consultation',
      status: a.status,
      badge: 'Appointment',
      badgeColor: 'sky',
      metadata: {
        specialization: a.doctorId?.specialization || 'Clinical Specialist',
        slot: `${a.startTime} - ${a.endTime}`,
      },
    });
  }

  // Medical Records (EHR)
  for (const r of medicalRecords) {
    timelineItems.push({
      id: r._id,
      type: 'medical_record',
      date: r.createdAt.toISOString().split('T')[0],
      time: r.createdAt.toTimeString().split(' ')[0],
      title: `EHR Diagnosis: ${r.diagnosis}`,
      summary: r.treatmentNotes || 'Clinical notes recorded',
      status: 'recorded',
      badge: 'Medical Record',
      badgeColor: 'indigo',
      metadata: {
        doctorName: r.doctorId?.name || 'Physician',
        symptoms: r.symptoms || [],
        followUpDate: r.followUpDate ? r.followUpDate.toISOString().split('T')[0] : null,
      },
    });
  }

  // Prescriptions
  for (const p of prescriptions) {
    const medNames = (p.medicines || []).map((m) => m.medicineName).join(', ');
    timelineItems.push({
      id: p._id,
      type: 'prescription',
      date: p.createdAt.toISOString().split('T')[0],
      time: p.createdAt.toTimeString().split(' ')[0],
      title: `Prescription issued (${p.medicines?.length || 0} medicines)`,
      summary: medNames || 'Medication schedule',
      status: 'active',
      badge: 'Prescription',
      badgeColor: 'emerald',
      metadata: {
        doctorName: p.doctorId?.name || 'Physician',
        medicinesCount: p.medicines?.length || 0,
        instructions: p.additionalInstructions || null,
      },
    });
  }

  // Medical Documents / Scans
  for (const d of documents) {
    timelineItems.push({
      id: d._id,
      type: 'document',
      date: d.createdAt.toISOString().split('T')[0],
      time: d.createdAt.toTimeString().split(' ')[0],
      title: `Uploaded ${d.documentType.toUpperCase()}: ${d.originalFileName}`,
      summary: `Document type: ${d.documentType} (OCR: ${d.ocrStatus})`,
      status: d.ocrStatus,
      badge: 'Document',
      badgeColor: 'purple',
      metadata: {
        documentType: d.documentType,
        uploader: d.uploadedBy?.name || 'User',
        ocrStatus: d.ocrStatus,
      },
    });
  }

  // Sort descending by date
  timelineItems.sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());

  res.status(200).json({
    success: true,
    patient: {
      id: patient._id,
      name: patient.name,
      email: patient.email,
    },
    totalEvents: timelineItems.length,
    timeline: timelineItems,
    disclaimer: CLINICAL_DISCLAIMER,
  });
});

export default {
  searchSemantic,
  getPatientTimeline,
};
