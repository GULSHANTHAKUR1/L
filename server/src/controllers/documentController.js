import mongoose from 'mongoose';
import MedicalDocument from '../models/MedicalDocument.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  uploadStreamToCloudinary,
  deleteFromCloudinary,
  generateSecureDownloadUrl,
} from '../config/cloudinary.js';
import { triggerOcrProcessing } from '../services/ocrIntegrationService.js';
import { createNotification } from '../utils/notificationHelper.js';
import { isDoctorLinkedToPatient } from '../utils/ownershipHelpers.js';
import { deleteSourceFromIndex } from '../services/semanticSearchIntegrationService.js';

/**
 * @desc    Upload a heterogeneous medical document (PDF, PNG, JPG) to Cloudinary & MongoDB
 * @route   POST /api/documents/upload
 * @access  Protected (Patient own, Doctor linked, Admin any)
 */
export const uploadDocument = asyncHandler(async (req, res) => {
  let { documentType, patientId, relatedRecordId } = req.body;
  const callerId = req.user._id.toString();
  const callerRole = req.user.role;

  // If patient uploads, automatically scope to their own authenticated ID
  if (callerRole === 'patient') {
    patientId = callerId;
  }

  // 1. Verify target patient exists
  const targetPatient = await User.findOne({ _id: patientId, role: 'patient' });
  if (!targetPatient) {
    return res.status(404).json({ success: false, message: 'Referenced patient account not found.' });
  }

  // 2. Enforce Strict RBAC Upload Boundaries
  if (callerRole === 'patient') {
    // Patient can only upload to their own medical profile
    if (callerId !== patientId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only upload documents attached to your own patient profile.',
      });
    }
  } else if (callerRole === 'doctor') {
    // Doctor can only upload for clinically linked patients
    const isLinked = await isDoctorLinkedToPatient(req.user._id, patientId);
    if (!isLinked) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to upload documents for an unassigned patient.',
      });
    }
  }

  // 3. Stream File Buffer to Cloudinary
  const targetFolder = `heterohms/medical_documents/${patientId}`;
  let cloudinaryResult;

  try {
    cloudinaryResult = await uploadStreamToCloudinary(
      req.file.buffer,
      targetFolder,
      req.file.originalname,
      req.file.mimetype === 'application/pdf' ? 'auto' : 'image'
    );
  } catch (cloudErr) {
    return res.status(502).json({
      success: false,
      message: `Cloudinary upload service failed: ${cloudErr.message}`,
    });
  }

  // 4. Save MedicalDocument metadata in MongoDB (with rollback cleanup if DB write fails)
  let medicalDocument;
  try {
    medicalDocument = await MedicalDocument.create({
      patientId,
      uploadedBy: req.user._id,
      relatedRecordId: relatedRecordId || null,
      documentType,
      originalFileName: req.file.originalname,
      mimeType: req.file.mimetype,
      cloudinaryUrl: cloudinaryResult.secure_url,
      cloudinaryPublicId: cloudinaryResult.public_id,
      extractedText: '',
      ocrStatus: 'pending',
      embeddingStatus: 'pending',
      pageCount: 1,
    });
  } catch (dbError) {
    // Rollback: Destroy orphaned file on Cloudinary if database write fails
    console.error('[DB Failure Rollback] Cleaning up orphaned Cloudinary asset:', cloudinaryResult.public_id);
    await deleteFromCloudinary(cloudinaryResult.public_id);
    throw dbError;
  }

  await medicalDocument.populate([
    { path: 'patientId', select: 'name email' },
    { path: 'uploadedBy', select: 'name role' },
  ]);

  // 5. Create notification for patient
  await createNotification({
    recipientId: patientId,
    title: 'Medical Document Uploaded',
    message: `A new ${documentType} ('${req.file.originalname}') was uploaded to your profile by ${req.user.name}.`,
    type: 'document',
    relatedEntityType: 'MedicalDocument',
    relatedEntityId: medicalDocument._id,
  });

  // 6. Trigger Asynchronous Non-Blocking OCR Task Placeholder
  triggerOcrProcessing(medicalDocument._id, medicalDocument.cloudinaryUrl, medicalDocument.mimeType);

  res.status(201).json({
    success: true,
    message: 'Medical document uploaded and queued for text processing.',
    data: medicalDocument,
  });
});

/**
 * @desc    Get medical documents list (Role-scoped visibility)
 * @route   GET /api/documents
 * @access  Protected
 */
export const getDocuments = asyncHandler(async (req, res) => {
  const { documentType, patientId, ocrStatus, page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};

  if (req.user.role === 'patient') {
    filter.patientId = req.user._id; // Patient sees only own documents
  } else if (req.user.role === 'doctor') {
    if (patientId && mongoose.Types.ObjectId.isValid(patientId)) {
      const isLinked = await isDoctorLinkedToPatient(req.user._id, patientId);
      if (!isLinked) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You cannot view documents for an unassigned patient.',
        });
      }
      filter.patientId = patientId;
    } else {
      // Return documents uploaded by this doctor or where they have clinical link
      filter.uploadedBy = req.user._id;
    }
  } else if (req.user.role === 'admin') {
    if (patientId && mongoose.Types.ObjectId.isValid(patientId)) filter.patientId = patientId;
  }

  if (documentType) filter.documentType = documentType;
  if (ocrStatus) filter.ocrStatus = ocrStatus;

  const [documents, total] = await Promise.all([
    MedicalDocument.find(filter)
      .populate('patientId', 'name email')
      .populate('uploadedBy', 'name role')
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 }),
    MedicalDocument.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: documents.length,
    total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    data: documents,
  });
});

/**
 * @desc    Get single document by ID (Enforces RBAC & ownership)
 * @route   GET /api/documents/:documentId
 * @access  Protected
 */
export const getDocumentById = asyncHandler(async (req, res) => {
  const { documentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    return res.status(400).json({ success: false, message: 'Invalid document ID format.' });
  }

  const document = await MedicalDocument.findById(documentId)
    .populate('patientId', 'name email phone')
    .populate('uploadedBy', 'name role')
    .populate('relatedRecordId', 'diagnosis visitDate');

  if (!document) {
    return res.status(404).json({ success: false, message: 'Medical document not found.' });
  }

  const callerId = req.user._id.toString();
  const callerRole = req.user.role;

  if (callerRole === 'admin') {
    return res.status(200).json({ success: true, data: document });
  }

  if (callerRole === 'patient') {
    if (document.patientId._id.toString() !== callerId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot view medical files of other patients.',
      });
    }
    return res.status(200).json({ success: true, data: document });
  }

  if (callerRole === 'doctor') {
    const isUploader = document.uploadedBy._id.toString() === callerId;
    const isLinked = await isDoctorLinkedToPatient(req.user._id, document.patientId._id);

    if (!isUploader && !isLinked) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view documents for this unassigned patient.',
      });
    }
    return res.status(200).json({ success: true, data: document });
  }

  return res.status(403).json({ success: false, message: 'Unauthorized document access.' });
});

/**
 * @desc    Delete medical document safely from Cloudinary and MongoDB
 * @route   DELETE /api/documents/:documentId
 * @access  Protected (Admin any, Doctor own uploaded, Patient own uploaded)
 */
export const deleteDocument = asyncHandler(async (req, res) => {
  const { documentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    return res.status(400).json({ success: false, message: 'Invalid document ID format.' });
  }

  const document = await MedicalDocument.findById(documentId);
  if (!document) {
    return res.status(404).json({ success: false, message: 'Medical document not found.' });
  }

  const callerId = req.user._id.toString();
  const callerRole = req.user.role;

  const isAdmin = callerRole === 'admin';
  const isUploader = document.uploadedBy.toString() === callerId;

  // Authorization policy: Admin can delete any; Doctors/Patients only delete what they uploaded
  if (!isAdmin && !isUploader) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You can only delete documents that you uploaded.',
    });
  }

  // 1. Delete from Cloudinary
  try {
    await deleteFromCloudinary(document.cloudinaryPublicId);
  } catch (cloudErr) {
    console.warn('[Cloudinary Warning] Asset deletion failed or already removed:', cloudErr.message);
  }

  // Purge from Semantic Search vector index
  deleteSourceFromIndex(document._id, 'medical_document');

  // 2. Delete from MongoDB
  await document.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Medical document deleted successfully from storage and database.',
  });
});

/**
 * @desc    Get safe authorized download URL
 * @route   GET /api/documents/:documentId/download
 * @access  Protected (Authorized viewers only)
 */
export const downloadDocument = asyncHandler(async (req, res) => {
  const { documentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    return res.status(400).json({ success: false, message: 'Invalid document ID format.' });
  }

  const document = await MedicalDocument.findById(documentId);
  if (!document) {
    return res.status(404).json({ success: false, message: 'Medical document not found.' });
  }

  const callerId = req.user._id.toString();
  const callerRole = req.user.role;

  // Enforce access verification before issuing download URL
  if (callerRole === 'patient' && document.patientId.toString() !== callerId) {
    return res.status(403).json({ success: false, message: 'Forbidden: Access denied.' });
  }

  if (callerRole === 'doctor') {
    const isUploader = document.uploadedBy.toString() === callerId;
    const isLinked = await isDoctorLinkedToPatient(req.user._id, document.patientId);

    if (!isUploader && !isLinked) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access denied.' });
    }
  }

  const downloadUrl = generateSecureDownloadUrl(document.cloudinaryPublicId, document.mimeType);

  res.status(200).json({
    success: true,
    downloadUrl: downloadUrl || document.cloudinaryUrl,
    fileName: document.originalFileName,
    mimeType: document.mimeType,
  });
});

/**
 * @desc    Manually re-trigger OCR processing for an existing document
 * @route   POST /api/documents/:documentId/retry-ocr
 * @access  Protected (Patient own, Doctor linked, Admin any)
 */
export const retryDocumentOcr = asyncHandler(async (req, res) => {
  const { documentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    return res.status(400).json({ success: false, message: 'Invalid document ID format.' });
  }

  const document = await MedicalDocument.findById(documentId);
  if (!document) {
    return res.status(404).json({ success: false, message: 'Medical document not found.' });
  }

  const callerId = req.user._id.toString();
  const callerRole = req.user.role;

  // Authorization check
  if (callerRole === 'patient' && document.patientId.toString() !== callerId) {
    return res.status(403).json({ success: false, message: 'Forbidden: Access denied.' });
  }

  if (callerRole === 'doctor') {
    const isUploader = document.uploadedBy.toString() === callerId;
    const isLinked = await isDoctorLinkedToPatient(req.user._id, document.patientId);
    if (!isUploader && !isLinked) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access denied.' });
    }
  }

  // Reset status to processing and trigger pipeline
  document.ocrStatus = 'processing';
  document.ocrError = null;
  await document.save();

  triggerOcrProcessing(document._id, document.cloudinaryUrl, document.mimeType);

  res.status(200).json({
    success: true,
    message: 'OCR text extraction re-triggered successfully.',
    data: {
      documentId: document._id,
      ocrStatus: document.ocrStatus,
    },
  });
});

export default {
  uploadDocument,
  getDocuments,
  getDocumentById,
  deleteDocument,
  downloadDocument,
  retryDocumentOcr,
};
