import mongoose from 'mongoose';
import Prescription from '../models/Prescription.js';
import Appointment from '../models/Appointment.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createNotification } from '../utils/notificationHelper.js';
import { isDoctorLinkedToPatient } from '../utils/ownershipHelpers.js';
import {
  triggerPrescriptionIndexing,
  deleteSourceFromIndex,
} from '../services/semanticSearchIntegrationService.js';

/**
 * @desc    Create a new Prescription (Assigned Doctor only)
 * @route   POST /api/prescriptions
 * @access  Protected (Doctor only)
 */
export const createPrescription = asyncHandler(async (req, res) => {
  const { patientId, appointmentId, medicines, additionalInstructions } = req.body;
  const doctorId = req.user._id;

  // Verify appointment relationship
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Referenced appointment not found.' });
  }

  if (appointment.doctorId.toString() !== doctorId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You cannot prescribe medicines for another doctor’s appointment.',
    });
  }

  if (appointment.patientId.toString() !== patientId.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Mismatch: The appointment does not belong to the specified patient.',
    });
  }

  const prescription = await Prescription.create({
    patientId,
    doctorId,
    appointmentId,
    medicines,
    additionalInstructions: additionalInstructions ? additionalInstructions.trim() : '',
  });

  await prescription.populate([
    { path: 'patientId', select: 'name email phone' },
    { path: 'doctorId', select: 'name specialization' },
  ]);

  // Create notification for patient
  await createNotification({
    recipientId: patientId,
    title: 'New Prescription Issued',
    message: `Dr. ${req.user.name} has issued a prescription with ${medicines.length} medicine item(s).`,
    type: 'prescription',
    relatedEntityType: 'Prescription',
    relatedEntityId: prescription._id,
  });

  // Asynchronously trigger semantic vector indexing
  triggerPrescriptionIndexing(prescription);

  res.status(201).json({
    success: true,
    message: 'Prescription issued successfully.',
    data: prescription,
  });
});

/**
 * @desc    Get prescriptions list (Role-scoped: Admin all, Doctor own/assigned, Patient own)
 * @route   GET /api/prescriptions
 * @access  Protected
 */
export const getPrescriptions = asyncHandler(async (req, res) => {
  const { patientId, doctorId, appointmentId, page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};

  if (req.user.role === 'patient') {
    filter.patientId = req.user._id;
  } else if (req.user.role === 'doctor') {
    if (patientId && mongoose.Types.ObjectId.isValid(patientId)) {
      const isLinked = await isDoctorLinkedToPatient(req.user._id, patientId);
      if (!isLinked) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You cannot view prescriptions for an unassigned patient.',
        });
      }
      filter.patientId = patientId;
    } else {
      filter.doctorId = req.user._id;
    }
  } else if (req.user.role === 'admin') {
    if (patientId && mongoose.Types.ObjectId.isValid(patientId)) filter.patientId = patientId;
    if (doctorId && mongoose.Types.ObjectId.isValid(doctorId)) filter.doctorId = doctorId;
  }

  if (appointmentId && mongoose.Types.ObjectId.isValid(appointmentId)) {
    filter.appointmentId = appointmentId;
  }

  const [prescriptions, total] = await Promise.all([
    Prescription.find(filter)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name specialization')
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 }),
    Prescription.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: prescriptions.length,
    total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    data: prescriptions,
  });
});

/**
 * @desc    Get single prescription by ID (Enforces RBAC & ownership)
 * @route   GET /api/prescriptions/:prescriptionId
 * @access  Protected
 */
export const getPrescriptionById = asyncHandler(async (req, res) => {
  const { prescriptionId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(prescriptionId)) {
    return res.status(400).json({ success: false, message: 'Invalid prescription ID format.' });
  }

  const prescription = await Prescription.findById(prescriptionId)
    .populate('patientId', 'name email phone')
    .populate('doctorId', 'name specialization phone')
    .populate('appointmentId', 'appointmentDate startTime endTime');

  if (!prescription) {
    return res.status(404).json({ success: false, message: 'Prescription not found.' });
  }

  const callerId = req.user._id.toString();
  const callerRole = req.user.role;

  if (callerRole === 'admin') {
    return res.status(200).json({ success: true, data: prescription });
  }

  if (callerRole === 'patient') {
    if (prescription.patientId._id.toString() !== callerId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot view other patients’ prescriptions.',
      });
    }
    return res.status(200).json({ success: true, data: prescription });
  }

  if (callerRole === 'doctor') {
    const isCreator = prescription.doctorId._id.toString() === callerId;
    const isLinked = await isDoctorLinkedToPatient(req.user._id, prescription.patientId._id);

    if (!isCreator && !isLinked) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view prescriptions for this unassigned patient.',
      });
    }
    return res.status(200).json({ success: true, data: prescription });
  }

  return res.status(403).json({ success: false, message: 'Unauthorized prescription access.' });
});

/**
 * @desc    Update prescription (Creator Doctor or Admin only)
 * @route   PATCH /api/prescriptions/:prescriptionId
 * @access  Protected (Creator Doctor or Admin)
 */
export const updatePrescription = asyncHandler(async (req, res) => {
  const { prescriptionId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(prescriptionId)) {
    return res.status(400).json({ success: false, message: 'Invalid prescription ID format.' });
  }

  const prescription = await Prescription.findById(prescriptionId);
  if (!prescription) {
    return res.status(404).json({ success: false, message: 'Prescription not found.' });
  }

  const callerId = req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  const isCreator = prescription.doctorId.toString() === callerId;

  if (!isAdmin && !isCreator) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Only the issuing doctor or an administrator can update this prescription.',
    });
  }

  const { medicines, additionalInstructions } = req.body;

  if (medicines !== undefined) prescription.medicines = medicines;
  if (additionalInstructions !== undefined) prescription.additionalInstructions = additionalInstructions.trim();

  await prescription.save();
  await prescription.populate([
    { path: 'patientId', select: 'name email phone' },
    { path: 'doctorId', select: 'name specialization' },
  ]);

  // Asynchronously update semantic vector indexing
  triggerPrescriptionIndexing(prescription);

  res.status(200).json({
    success: true,
    message: 'Prescription updated successfully.',
    data: prescription,
  });
});

/**
 * @desc    Delete prescription safely and purge from vector search index
 * @route   DELETE /api/prescriptions/:prescriptionId
 * @access  Protected (Creator Doctor or Admin)
 */
export const deletePrescription = asyncHandler(async (req, res) => {
  const { prescriptionId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(prescriptionId)) {
    return res.status(400).json({ success: false, message: 'Invalid prescription ID format.' });
  }

  const prescription = await Prescription.findById(prescriptionId);
  if (!prescription) {
    return res.status(404).json({ success: false, message: 'Prescription not found.' });
  }

  const callerId = req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  const isCreator = prescription.doctorId.toString() === callerId;

  if (!isAdmin && !isCreator) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Only the issuing doctor or an administrator can delete this prescription.',
    });
  }

  // Purge from Semantic Search vector index
  deleteSourceFromIndex(prescription._id, 'prescription');

  // Delete from MongoDB
  await prescription.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Prescription deleted successfully and purged from search index.',
  });
});

export default {
  createPrescription,
  getPrescriptions,
  getPrescriptionById,
  updatePrescription,
  deletePrescription,
};
