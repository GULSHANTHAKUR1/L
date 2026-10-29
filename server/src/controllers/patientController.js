import mongoose from 'mongoose';
import PatientProfile from '../models/PatientProfile.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { isDoctorLinkedToPatient } from '../utils/ownershipHelpers.js';

/**
 * @desc    Get all patients with pagination & search (Admin only)
 * @route   GET /api/patients
 * @access  Protected (Admin only)
 */
export const getPatients = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const userQuery = { role: 'patient' };

  if (search && search.trim()) {
    const term = search.trim();
    userQuery.$or = [
      { name: { $regex: term, $options: 'i' } },
      { email: { $regex: term, $options: 'i' } },
      { phone: { $regex: term, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(userQuery)
      .select('name email phone avatarUrl isActive createdAt')
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 }),
    User.countDocuments(userQuery),
  ]);

  // Find linked profiles for these users
  const userIds = users.map((u) => u._id);
  const profiles = await PatientProfile.find({ userId: { $in: userIds } });
  const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

  // Shape response so frontend gets patient profile and populated user
  const data = users.map((u) => {
    const profile = profileMap.get(u._id.toString());
    return {
      _id: profile?._id || u._id,
      userId: u,
      gender: profile?.gender || 'Not Specified',
      emergencyContact: profile?.emergencyContact || null,
      address: profile?.address || {},
      allergies: profile?.allergies || [],
      chronicConditions: profile?.chronicConditions || [],
      createdAt: profile?.createdAt || u.createdAt,
    };
  });

  res.status(200).json({
    success: true,
    count: data.length,
    total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    data,
    patients: data,
  });
});

/**
 * @desc    Get single patient profile by ID (Role & Ownership Enforced)
 * @route   GET /api/patients/:patientId
 * @access  Protected (Admin all; Patient own; Doctor linked only)
 */
export const getPatientById = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    return res.status(400).json({ success: false, message: 'Invalid patient ID format.' });
  }

  // Find either by PatientProfile._id or PatientProfile.userId
  let patient = await PatientProfile.findOne({
    $or: [{ _id: patientId }, { userId: patientId }],
  }).populate('userId', 'name email phone avatarUrl isActive');

  // Fallback: If profile record not found, search User collection directly
  if (!patient) {
    const userPatient = await User.findOne({ _id: patientId, role: 'patient' });
    if (userPatient) {
      patient = {
        _id: userPatient._id,
        userId: userPatient,
        gender: 'Not Specified',
        bloodGroup: 'N/A',
        emergencyContact: null,
        address: {},
        allergies: [],
        chronicConditions: [],
        createdAt: userPatient.createdAt,
      };
    }
  }

  if (!patient) {
    return res.status(404).json({ success: false, message: 'Patient profile not found.' });
  }

  const callerRole = req.user.role;
  const callerId = req.user._id.toString();
  const targetPatientUserId = patient.userId._id.toString();

  // 1. Admin has global visibility
  if (callerRole === 'admin') {
    return res.status(200).json({ success: true, data: patient });
  }

  // 2. Patient can only access their own profile
  if (callerRole === 'patient') {
    if (callerId !== targetPatientUserId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot access medical profiles of other patients.',
      });
    }
    return res.status(200).json({ success: true, data: patient });
  }

  // 3. Doctor can only access if authorized through appointment or record relationship
  if (callerRole === 'doctor') {
    const isLinked = await isDoctorLinkedToPatient(req.user._id, patient.userId._id);
    if (!isLinked) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view this patient (no clinical appointment or record link).',
      });
    }
    return res.status(200).json({ success: true, data: patient });
  }

  return res.status(403).json({ success: false, message: 'Unauthorized profile access.' });
});

/**
 * @desc    Patient updates their own profile
 * @route   PATCH /api/patients/me
 * @access  Protected (Patient only)
 */
export const updateMyProfile = asyncHandler(async (req, res) => {
  const patient = await PatientProfile.findOne({ userId: req.user._id });

  if (!patient) {
    return res.status(404).json({ success: false, message: 'Patient profile not found.' });
  }

  const { address, emergencyContact, allergies, chronicConditions, medicalHistorySummary } = req.body;

  if (address !== undefined) patient.address = address;
  if (emergencyContact !== undefined) patient.emergencyContact = emergencyContact;
  if (allergies !== undefined) patient.allergies = allergies;
  if (chronicConditions !== undefined) patient.chronicConditions = chronicConditions;
  if (medicalHistorySummary !== undefined) patient.medicalHistorySummary = medicalHistorySummary;

  await patient.save();
  await patient.populate('userId', 'name email phone avatarUrl isActive');

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully.',
    data: patient,
  });
});

/**
 * @desc    Admin updates a patient profile
 * @route   PATCH /api/patients/:patientId
 * @access  Protected (Admin only)
 */
export const updatePatientByAdmin = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    return res.status(400).json({ success: false, message: 'Invalid patient ID format.' });
  }

  const patient = await PatientProfile.findOne({
    $or: [{ _id: patientId }, { userId: patientId }],
  });

  if (!patient) {
    return res.status(404).json({ success: false, message: 'Patient profile not found.' });
  }

  const {
    dateOfBirth,
    gender,
    address,
    emergencyContact,
    bloodGroup,
    allergies,
    chronicConditions,
    medicalHistorySummary,
  } = req.body;

  if (dateOfBirth !== undefined) patient.dateOfBirth = new Date(dateOfBirth);
  if (gender !== undefined) patient.gender = gender;
  if (address !== undefined) patient.address = address;
  if (emergencyContact !== undefined) patient.emergencyContact = emergencyContact;
  if (bloodGroup !== undefined) patient.bloodGroup = bloodGroup;
  if (allergies !== undefined) patient.allergies = allergies;
  if (chronicConditions !== undefined) patient.chronicConditions = chronicConditions;
  if (medicalHistorySummary !== undefined) patient.medicalHistorySummary = medicalHistorySummary;

  await patient.save();
  await patient.populate('userId', 'name email phone avatarUrl isActive');

  res.status(200).json({
    success: true,
    message: 'Patient profile updated by admin.',
    data: patient,
  });
});

export default {
  getPatients,
  getPatientById,
  updateMyProfile,
  updatePatientByAdmin,
};
