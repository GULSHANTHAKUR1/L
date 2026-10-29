import mongoose from 'mongoose';
import DoctorProfile from '../models/DoctorProfile.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * @desc    Get all active doctors with search, specialization filter, and pagination
 * @route   GET /api/doctors
 * @access  Protected (Authenticated users)
 */
export const getDoctors = asyncHandler(async (req, res) => {
  const { search, specialization, page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  // Build filter for doctor profile (non-admin only sees currently available doctors)
  const profileFilter = {};
  if (req.user?.role !== 'admin') {
    profileFilter.isAvailable = true;
  }

  if (specialization) {
    profileFilter.specialization = { $regex: specialization, $options: 'i' };
  }

  // Handle search across User (name, email, phone) or DoctorProfile (bio, specialization)
  if (search && search.trim()) {
    const term = search.trim();
    const matchingUsers = await User.find({
      role: 'doctor',
      $or: [
        { name: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
      ],
    }).select('_id');

    const userMatchIds = matchingUsers.map((u) => u._id);

    profileFilter.$or = [
      { userId: { $in: userMatchIds } },
      { specialization: { $regex: term, $options: 'i' } },
      { bio: { $regex: term, $options: 'i' } },
    ];
  }

  const [doctors, total] = await Promise.all([
    DoctorProfile.find(profileFilter)
      .populate('userId', 'name email phone avatarUrl isActive')
      .skip(skip)
      .limit(limitNum)
      .sort({ experienceYears: -1 }),
    DoctorProfile.countDocuments(profileFilter),
  ]);

  // Filter out any where user account itself is inactive (unless admin)
  const activeDoctors = req.user?.role === 'admin'
    ? doctors
    : doctors.filter((doc) => doc.userId && doc.userId.isActive);

  res.status(200).json({
    success: true,
    count: activeDoctors.length,
    total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    data: activeDoctors,
    doctors: activeDoctors,
  });
});

/**
 * @desc    Get single doctor profile by ID (supports DoctorProfile ID or User ID)
 * @route   GET /api/doctors/:doctorId
 * @access  Protected (Authenticated users)
 */
export const getDoctorById = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    return res.status(400).json({ success: false, message: 'Invalid doctor ID format.' });
  }

  // Find either by DoctorProfile._id or DoctorProfile.userId
  const doctor = await DoctorProfile.findOne({
    $or: [{ _id: doctorId }, { userId: doctorId }],
  }).populate('userId', 'name email phone avatarUrl isActive');

  if (!doctor || !doctor.userId || !doctor.userId.isActive) {
    return res.status(404).json({
      success: false,
      message: 'Doctor profile not found or account is inactive.',
    });
  }

  res.status(200).json({
    success: true,
    data: doctor,
  });
});

/**
 * @desc    Update doctor profile (Admin any; Doctor own bio & availability only)
 * @route   PATCH /api/doctors/:doctorId
 * @access  Protected (Admin or self Doctor)
 */
export const updateDoctorProfile = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    return res.status(400).json({ success: false, message: 'Invalid doctor ID format.' });
  }

  const doctor = await DoctorProfile.findOne({
    $or: [{ _id: doctorId }, { userId: doctorId }],
  });

  if (!doctor) {
    return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
  }

  // Role authorization logic
  const isAdmin = req.user.role === 'admin';
  const isSelfDoctor = req.user.role === 'doctor' && doctor.userId.toString() === req.user._id.toString();

  if (!isAdmin && !isSelfDoctor) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You are not authorized to update another doctor’s profile.',
    });
  }

  // If doctor, strictly restrict allowed fields
  if (isSelfDoctor && !isAdmin) {
    const { bio, availabilitySlots, consultationFee } = req.body;
    if (bio !== undefined) doctor.bio = bio;
    if (availabilitySlots !== undefined) doctor.availabilitySlots = availabilitySlots;
    if (consultationFee !== undefined) doctor.consultationFee = Number(consultationFee);
  } else if (isAdmin) {
    // Admin can update all clinical credentials
    const {
      specialization,
      qualifications,
      experienceYears,
      consultationFee,
      bio,
      availabilitySlots,
      isAvailable,
    } = req.body;

    if (specialization !== undefined) doctor.specialization = specialization;
    if (qualifications !== undefined) doctor.qualifications = qualifications;
    if (experienceYears !== undefined) doctor.experienceYears = Number(experienceYears);
    if (consultationFee !== undefined) doctor.consultationFee = Number(consultationFee);
    if (bio !== undefined) doctor.bio = bio;
    if (availabilitySlots !== undefined) doctor.availabilitySlots = availabilitySlots;
    if (isAvailable !== undefined) doctor.isAvailable = Boolean(isAvailable);
  }

  await doctor.save();
  await doctor.populate('userId', 'name email phone avatarUrl isActive');

  res.status(200).json({
    success: true,
    message: 'Doctor profile updated successfully.',
    data: doctor,
  });
});

/**
 * @desc    Update authenticated doctor's own availability slots
 * @route   PATCH /api/doctors/me/availability
 * @access  Protected (Doctor only)
 */
export const updateMyAvailability = asyncHandler(async (req, res) => {
  const { availabilitySlots } = req.body;

  const doctor = await DoctorProfile.findOne({ userId: req.user._id });

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor profile not found for the authenticated user.',
    });
  }

  doctor.availabilitySlots = availabilitySlots;
  await doctor.save();
  await doctor.populate('userId', 'name email phone avatarUrl isActive');

  res.status(200).json({
    success: true,
    message: 'Weekly availability schedule updated successfully.',
    data: doctor,
  });
});

export default {
  getDoctors,
  getDoctorById,
  updateDoctorProfile,
  updateMyAvailability,
};
