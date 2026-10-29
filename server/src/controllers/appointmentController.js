import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createNotification } from '../utils/notificationHelper.js';

/**
 * @desc    Book a new appointment (Patient only, conflict-prevention guaranteed)
 * @route   POST /api/appointments
 * @access  Protected (Patient only)
 */
export const createAppointment = asyncHandler(async (req, res) => {
  const { doctorId, appointmentDate, startTime, endTime, reasonForVisit } = req.body;
  const patientId = req.user._id;

  // 1. Verify doctor exists and has an active clinical profile
  const doctorUser = await User.findOne({ _id: doctorId, role: 'doctor', isActive: true });
  if (!doctorUser) {
    return res.status(404).json({
      success: false,
      message: 'Doctor not found or account is currently inactive.',
    });
  }

  const doctorProfile = await DoctorProfile.findOne({ userId: doctorId, isAvailable: true });
  if (!doctorProfile) {
    return res.status(400).json({
      success: false,
      message: 'Doctor is currently not accepting new appointments.',
    });
  }

  // 2. Atomic Slot Conflict Check: Ensure no booked/confirmed appointment exists at this slot
  const conflictingAppointment = await Appointment.findOne({
    doctorId,
    appointmentDate,
    startTime,
    status: { $in: ['booked', 'confirmed'] },
  });

  if (conflictingAppointment) {
    return res.status(409).json({
      success: false,
      message: `Appointment conflict: Dr. ${doctorUser.name} already has an active appointment scheduled on ${appointmentDate} at ${startTime}. Please select a different time slot.`,
    });
  }

  // 3. Create appointment with error handling for race condition (unique index)
  let appointment;
  try {
    appointment = await Appointment.create({
      patientId,
      doctorId,
      appointmentDate,
      startTime,
      endTime,
      status: 'booked',
      reasonForVisit: reasonForVisit.trim(),
    });
  } catch (error) {
    // Catch MongoDB duplicate key error code 11000 from the compound unique index
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: `Appointment conflict: This slot was just booked by another patient. Please choose another slot.`,
      });
    }
    throw error;
  }

  await appointment.populate([
    { path: 'doctorId', select: 'name email phone avatarUrl' },
    { path: 'patientId', select: 'name email phone avatarUrl' },
  ]);

  // 4. Create in-app notifications for both patient and doctor
  await Promise.all([
    createNotification({
      recipientId: patientId,
      title: 'Appointment Booked',
      message: `Your appointment with Dr. ${doctorUser.name} on ${appointmentDate} at ${startTime} has been booked.`,
      type: 'appointment',
      relatedEntityType: 'Appointment',
      relatedEntityId: appointment._id,
    }),
    createNotification({
      recipientId: doctorId,
      title: 'New Appointment Booked',
      message: `Patient ${req.user.name} has booked an appointment for ${appointmentDate} at ${startTime}.`,
      type: 'appointment',
      relatedEntityType: 'Appointment',
      relatedEntityId: appointment._id,
    }),
  ]);

  res.status(201).json({
    success: true,
    message: 'Appointment booked successfully.',
    data: appointment,
  });
});

/**
 * @desc    Get appointments list (Role-scoped: Admin all, Doctor own, Patient own)
 * @route   GET /api/appointments
 * @access  Protected
 */
export const getAppointments = asyncHandler(async (req, res) => {
  const { status, date, doctorId, patientId, page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};

  // Enforce role-based query boundaries
  if (req.user.role === 'patient') {
    filter.patientId = req.user._id; // Patient cannot see other appointments
    if (doctorId && mongoose.Types.ObjectId.isValid(doctorId)) filter.doctorId = doctorId;
  } else if (req.user.role === 'doctor') {
    filter.doctorId = req.user._id; // Doctor cannot see other doctors' appointments
    if (patientId && mongoose.Types.ObjectId.isValid(patientId)) filter.patientId = patientId;
  } else if (req.user.role === 'admin') {
    // Admin has full visibility with optional filters
    if (doctorId && mongoose.Types.ObjectId.isValid(doctorId)) filter.doctorId = doctorId;
    if (patientId && mongoose.Types.ObjectId.isValid(patientId)) filter.patientId = patientId;
  }

  if (status) filter.status = status;
  if (date) filter.appointmentDate = date;

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .populate('doctorId', 'name email phone specialization')
      .populate('patientId', 'name email phone')
      .skip(skip)
      .limit(limitNum)
      .sort({ appointmentDate: 1, startTime: 1 }),
    Appointment.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: appointments.length,
    total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    data: appointments,
  });
});

/**
 * @desc    Get single appointment by ID (Enforces ownership)
 * @route   GET /api/appointments/:appointmentId
 * @access  Protected (Admin, Assigned Doctor, or Assigned Patient)
 */
export const getAppointmentById = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    return res.status(400).json({ success: false, message: 'Invalid appointment ID format.' });
  }

  const appointment = await Appointment.findById(appointmentId)
    .populate('doctorId', 'name email phone')
    .populate('patientId', 'name email phone');

  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Appointment not found.' });
  }

  // Authorization check
  const callerId = req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  const isAssignedDoctor = appointment.doctorId && appointment.doctorId._id.toString() === callerId;
  const isAssignedPatient = appointment.patientId && appointment.patientId._id.toString() === callerId;

  if (!isAdmin && !isAssignedDoctor && !isAssignedPatient) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You do not have permission to access this appointment.',
    });
  }

  res.status(200).json({
    success: true,
    data: appointment,
  });
});

/**
 * @desc    Update appointment status (Admin or Assigned Doctor only)
 * @route   PATCH /api/appointments/:appointmentId/status
 * @access  Protected (Admin or Assigned Doctor)
 */
export const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    return res.status(400).json({ success: false, message: 'Invalid appointment ID format.' });
  }

  const appointment = await Appointment.findById(appointmentId)
    .populate('doctorId', 'name')
    .populate('patientId', 'name');

  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Appointment not found.' });
  }

  // Authorization: Only Admin or Assigned Doctor
  const callerId = req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  const isAssignedDoctor = appointment.doctorId && appointment.doctorId._id.toString() === callerId;

  if (!isAdmin && !isAssignedDoctor) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Only the assigned doctor or an administrator can update appointment status.',
    });
  }

  // Prevent transitions from terminal states
  if (['completed', 'cancelled'].includes(appointment.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot update appointment that is already marked as '${appointment.status}'.`,
    });
  }

  const oldStatus = appointment.status;
  appointment.status = status;
  await appointment.save();

  // Notify patient of status update
  await createNotification({
    recipientId: appointment.patientId._id,
    title: 'Appointment Status Updated',
    message: `Your appointment with Dr. ${appointment.doctorId.name} for ${appointment.appointmentDate} has been updated from '${oldStatus}' to '${status}'.`,
    type: 'appointment',
    relatedEntityType: 'Appointment',
    relatedEntityId: appointment._id,
  });

  res.status(200).json({
    success: true,
    message: `Appointment status updated to '${status}'.`,
    data: appointment,
  });
});

/**
 * @desc    Cancel appointment (Patient own future; Doctor assigned; Admin any)
 * @route   PATCH /api/appointments/:appointmentId/cancel
 * @access  Protected
 */
export const cancelAppointment = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { cancellationReason } = req.body;

  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    return res.status(400).json({ success: false, message: 'Invalid appointment ID format.' });
  }

  const appointment = await Appointment.findById(appointmentId)
    .populate('doctorId', 'name')
    .populate('patientId', 'name');

  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Appointment not found.' });
  }

  if (appointment.status === 'cancelled') {
    return res.status(400).json({ success: false, message: 'Appointment is already cancelled.' });
  }

  if (appointment.status === 'completed') {
    return res.status(400).json({ success: false, message: 'Completed appointments cannot be cancelled.' });
  }

  const callerId = req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  const isAssignedDoctor = appointment.doctorId && appointment.doctorId._id.toString() === callerId;
  const isAssignedPatient = appointment.patientId && appointment.patientId._id.toString() === callerId;

  if (!isAdmin && !isAssignedDoctor && !isAssignedPatient) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You do not have permission to cancel this appointment.',
    });
  }

  // Patients can only cancel future or today's appointments
  if (isAssignedPatient && !isAdmin) {
    const apptDate = new Date(`${appointment.appointmentDate}T23:59:59`);
    if (apptDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Past appointments cannot be cancelled.',
      });
    }
  }

  appointment.status = 'cancelled';
  appointment.cancellationReason = cancellationReason || 'Cancelled by user';
  await appointment.save();

  // Send notifications to both parties
  await Promise.all([
    createNotification({
      recipientId: appointment.patientId._id,
      title: 'Appointment Cancelled',
      message: `Your appointment with Dr. ${appointment.doctorId.name} on ${appointment.appointmentDate} at ${appointment.startTime} was cancelled. Reason: ${appointment.cancellationReason}`,
      type: 'appointment',
      relatedEntityType: 'Appointment',
      relatedEntityId: appointment._id,
    }),
    createNotification({
      recipientId: appointment.doctorId._id,
      title: 'Appointment Cancelled',
      message: `Appointment with patient ${appointment.patientId.name} on ${appointment.appointmentDate} at ${appointment.startTime} was cancelled. Reason: ${appointment.cancellationReason}`,
      type: 'appointment',
      relatedEntityType: 'Appointment',
      relatedEntityId: appointment._id,
    }),
  ]);

  res.status(200).json({
    success: true,
    message: 'Appointment cancelled successfully. Time slot has been released.',
    data: appointment,
  });
});

export default {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  cancelAppointment,
};
