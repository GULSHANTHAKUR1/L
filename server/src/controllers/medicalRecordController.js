import mongoose from 'mongoose';
import MedicalRecord from '../models/MedicalRecord.js';
import Appointment from '../models/Appointment.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createNotification } from '../utils/notificationHelper.js';
import { isDoctorLinkedToPatient } from '../utils/ownershipHelpers.js';
import {
  triggerMedicalRecordIndexing,
  deleteSourceFromIndex,
} from '../services/semanticSearchIntegrationService.js';

/**
 * @desc    Create a new Medical Record (Assigned Doctor only)
 * @route   POST /api/medical-records
 * @access  Protected (Doctor only)
 */
export const createMedicalRecord = asyncHandler(async (req, res) => {
  const { patientId, appointmentId, diagnosis, symptoms, treatmentNotes, followUpDate } = req.body;
  const doctorId = req.user._id;

  // 1. Verify appointment exists and belongs to both this doctor and this patient
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Referenced appointment not found.' });
  }

  if (appointment.doctorId.toString() !== doctorId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You cannot create a clinical record for an appointment assigned to another doctor.',
    });
  }

  if (appointment.patientId.toString() !== patientId.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Mismatch: The appointment does not belong to the specified patient.',
    });
  }

  // 2. Create the Medical Record
  const medicalRecord = await MedicalRecord.create({
    patientId,
    doctorId,
    appointmentId,
    diagnosis: diagnosis.trim(),
    symptoms: symptoms || [],
    treatmentNotes: treatmentNotes.trim(),
    followUpDate: followUpDate ? new Date(followUpDate) : null,
  });

  await medicalRecord.populate([
    { path: 'patientId', select: 'name email phone' },
    { path: 'doctorId', select: 'name specialization' },
  ]);

  // 3. Mark appointment as completed if currently confirmed or booked
  if (appointment.status !== 'completed') {
    appointment.status = 'completed';
    await appointment.save();
  }

  // 4. Notify patient
  await createNotification({
    recipientId: patientId,
    title: 'Medical Record Added',
    message: `Dr. ${req.user.name} has added clinical notes and diagnosis for your consultation.`,
    type: 'medical_record',
    relatedEntityType: 'MedicalRecord',
    relatedEntityId: medicalRecord._id,
  });

  // 5. Asynchronously trigger semantic vector indexing
  triggerMedicalRecordIndexing(medicalRecord);

  res.status(201).json({
    success: true,
    message: 'Medical record created successfully.',
    data: medicalRecord,
  });
});

/**
 * @desc    Get medical records list (Role-scoped: Admin all, Doctor own/linked, Patient own)
 * @route   GET /api/medical-records
 * @access  Protected
 */
export const getMedicalRecords = asyncHandler(async (req, res) => {
  const { patientId, doctorId, appointmentId, dateFrom, dateTo, page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};

  // Enforce role-based boundaries
  if (req.user.role === 'patient') {
    filter.patientId = req.user._id; // Patient sees only own records
  } else if (req.user.role === 'doctor') {
    if (patientId && mongoose.Types.ObjectId.isValid(patientId)) {
      // If doctor specifies patient, verify relationship
      const isLinked = await isDoctorLinkedToPatient(req.user._id, patientId);
      if (!isLinked) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are not authorized to view records for this unassigned patient.',
        });
      }
      filter.patientId = patientId;
    } else {
      // Default: doctor sees records they created
      filter.doctorId = req.user._id;
    }
  } else if (req.user.role === 'admin') {
    if (patientId && mongoose.Types.ObjectId.isValid(patientId)) filter.patientId = patientId;
    if (doctorId && mongoose.Types.ObjectId.isValid(doctorId)) filter.doctorId = doctorId;
  }

  if (appointmentId && mongoose.Types.ObjectId.isValid(appointmentId)) {
    filter.appointmentId = appointmentId;
  }

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  const [records, total] = await Promise.all([
    MedicalRecord.find(filter)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name specialization')
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 }),
    MedicalRecord.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: records.length,
    total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    data: records,
  });
});

/**
 * @desc    Get single medical record by ID (Enforces RBAC & ownership)
 * @route   GET /api/medical-records/:recordId
 * @access  Protected
 */
export const getMedicalRecordById = asyncHandler(async (req, res) => {
  const { recordId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(recordId)) {
    return res.status(400).json({ success: false, message: 'Invalid record ID format.' });
  }

  const record = await MedicalRecord.findById(recordId)
    .populate('patientId', 'name email phone')
    .populate('doctorId', 'name specialization phone')
    .populate('appointmentId', 'appointmentDate startTime endTime status reasonForVisit');

  if (!record) {
    return res.status(404).json({ success: false, message: 'Medical record not found.' });
  }

  const callerId = req.user._id.toString();
  const callerRole = req.user.role;

  // 1. Admin has global audit access
  if (callerRole === 'admin') {
    return res.status(200).json({ success: true, data: record });
  }

  // 2. Patient can only access their own records
  if (callerRole === 'patient') {
    if (record.patientId._id.toString() !== callerId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot access clinical records of other patients.',
      });
    }
    return res.status(200).json({ success: true, data: record });
  }

  // 3. Doctor must be creator or clinically linked to patient
  if (callerRole === 'doctor') {
    const isCreator = record.doctorId._id.toString() === callerId;
    const isLinked = await isDoctorLinkedToPatient(req.user._id, record.patientId._id);

    if (!isCreator && !isLinked) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view records of an unassigned patient.',
      });
    }
    return res.status(200).json({ success: true, data: record });
  }

  return res.status(403).json({ success: false, message: 'Unauthorized record access.' });
});

/**
 * @desc    Update medical record (Creator Doctor or Admin only)
 * @route   PATCH /api/medical-records/:recordId
 * @access  Protected (Creator Doctor or Admin)
 */
export const updateMedicalRecord = asyncHandler(async (req, res) => {
  const { recordId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(recordId)) {
    return res.status(400).json({ success: false, message: 'Invalid record ID format.' });
  }

  const record = await MedicalRecord.findById(recordId);
  if (!record) {
    return res.status(404).json({ success: false, message: 'Medical record not found.' });
  }

  const callerId = req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  const isCreator = record.doctorId.toString() === callerId;

  if (!isAdmin && !isCreator) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Only the creating physician or an administrator may modify this clinical record.',
    });
  }

  const { diagnosis, symptoms, treatmentNotes, followUpDate } = req.body;

  if (diagnosis !== undefined) record.diagnosis = diagnosis.trim();
  if (symptoms !== undefined) record.symptoms = symptoms;
  if (treatmentNotes !== undefined) record.treatmentNotes = treatmentNotes.trim();
  if (followUpDate !== undefined) record.followUpDate = followUpDate ? new Date(followUpDate) : null;

  await record.save();
  await record.populate([
    { path: 'patientId', select: 'name email phone' },
    { path: 'doctorId', select: 'name specialization' },
  ]);

  // Asynchronously update semantic vector index
  triggerMedicalRecordIndexing(record);

  res.status(200).json({
    success: true,
    message: 'Medical record updated successfully.',
    data: record,
  });
});

/**
 * @desc    Delete medical record safely and purge from vector search index
 * @route   DELETE /api/medical-records/:recordId
 * @access  Protected (Creator Doctor or Admin)
 */
export const deleteMedicalRecord = asyncHandler(async (req, res) => {
  const { recordId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(recordId)) {
    return res.status(400).json({ success: false, message: 'Invalid record ID format.' });
  }

  const record = await MedicalRecord.findById(recordId);
  if (!record) {
    return res.status(404).json({ success: false, message: 'Medical record not found.' });
  }

  const callerId = req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  const isCreator = record.doctorId.toString() === callerId;

  if (!isAdmin && !isCreator) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Only the creating physician or an administrator may delete this clinical record.',
    });
  }

  // Purge from Semantic Search vector index
  deleteSourceFromIndex(record._id, 'medical_record');

  // Delete from MongoDB
  await record.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Medical record deleted successfully and purged from search index.',
  });
});

export default {
  createMedicalRecord,
  getMedicalRecords,
  getMedicalRecordById,
  updateMedicalRecord,
  deleteMedicalRecord,
};
