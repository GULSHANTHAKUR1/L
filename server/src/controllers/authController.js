import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import PatientProfile from '../models/PatientProfile.js';
import { generateTokenAndSetCookie, clearTokenCookie } from '../utils/generateToken.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * @desc    Public Registration - Exclusively registers patients
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    dateOfBirth,
    gender,
    address,
    emergencyContact,
    bloodGroup,
    allergies,
    chronicConditions,
    medicalHistorySummary,
  } = req.body;

  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email address already exists.',
    });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Security guarantee: Public registration is locked to 'patient' role
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'patient',
    phone: phone.trim(),
    isActive: true,
  });

  // Create linked PatientProfile
  const patientProfile = await PatientProfile.create({
    userId: user._id,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    gender,
    address: address || {},
    emergencyContact,
    bloodGroup: bloodGroup || 'O+',
    allergies: allergies || [],
    chronicConditions: chronicConditions || [],
    medicalHistorySummary: medicalHistorySummary || '',
  });

  // Generate JWT and attach HTTP-only cookie
  generateTokenAndSetCookie(res, user);

  res.status(201).json({
    success: true,
    message: 'Patient account registered successfully.',
    user: {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive,
      profile: patientProfile,
    },
  });
});

/**
 * @desc    Login user & issue HTTP-only JWT cookie
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  // Look up user including passwordHash
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  // Validate active status
  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Your account has been deactivated. Please contact hospital administration.',
    });
  }

  // Verify password securely
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  // Fetch associated profile if applicable
  let profile = null;
  if (user.role === 'doctor') {
    profile = await DoctorProfile.findOne({ userId: user._id });
  } else if (user.role === 'patient') {
    profile = await PatientProfile.findOne({ userId: user._id });
  }

  // Record and persist login data in database
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Browser Client';
  const loginTimestamp = new Date();

  user.lastLoginAt = loginTimestamp;
  user.loginCount = (user.loginCount || 0) + 1;
  user.loginHistory = user.loginHistory || [];
  user.loginHistory.unshift({
    timestamp: loginTimestamp,
    ipAddress: typeof clientIp === 'string' ? clientIp.split(',')[0].trim() : '127.0.0.1',
    userAgent: userAgent.slice(0, 200),
  });
  if (user.loginHistory.length > 20) {
    user.loginHistory = user.loginHistory.slice(0, 20);
  }
  await user.save({ validateBeforeSave: false });

  // Set HTTP-only JWT cookie
  generateTokenAndSetCookie(res, user);

  res.status(200).json({
    success: true,
    message: 'Logged in successfully.',
    user: {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      loginCount: user.loginCount,
      loginHistory: user.loginHistory.slice(0, 5),
      profile,
    },
  });
});

/**
 * @desc    Log out current user & clear JWT cookie
 * @route   POST /api/auth/logout
 * @access  Public / Authenticated
 */
export const logout = asyncHandler(async (req, res) => {
  clearTokenCookie(res);
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
});

/**
 * @desc    Get currently authenticated user & role profile
 * @route   GET /api/auth/me
 * @access  Protected
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = req.user;

  let profile = null;
  if (user.role === 'doctor') {
    profile = await DoctorProfile.findOne({ userId: user._id });
  } else if (user.role === 'patient') {
    profile = await PatientProfile.findOne({ userId: user._id });
  }

  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      loginCount: user.loginCount || 0,
      loginHistory: user.loginHistory?.slice(0, 5) || [],
      profile,
    },
  });
});

/**
 * @desc    Create a new Doctor account & DoctorProfile (Admin only)
 * @route   POST /api/auth/create-doctor
 * @access  Protected (Admin only)
 */
export const createDoctor = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    specialization,
    qualifications,
    experienceYears,
    consultationFee,
    bio,
    availabilitySlots,
  } = req.body;

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'A user with this email already exists.',
    });
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const doctorUser = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'doctor',
    phone: phone.trim(),
    isActive: true,
  });

  const doctorProfile = await DoctorProfile.create({
    userId: doctorUser._id,
    specialization: specialization.trim(),
    qualifications: qualifications || [],
    experienceYears: Number(experienceYears),
    consultationFee: Number(consultationFee),
    bio: bio || '',
    availabilitySlots: availabilitySlots || [],
    isAvailable: true,
  });

  res.status(201).json({
    success: true,
    message: 'Doctor account and profile created successfully.',
    doctor: {
      id: doctorUser._id,
      name: doctorUser.name,
      email: doctorUser.email,
      role: doctorUser.role,
      phone: doctorUser.phone,
      profile: doctorProfile,
    },
  });
});

/**
 * @desc    Create a new Admin account (Admin only / Controlled setup)
 * @route   POST /api/auth/create-admin
 * @access  Protected (Admin only)
 */
export const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'A user with this email already exists.',
    });
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const adminUser = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'admin',
    phone: phone.trim(),
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message: 'Admin account created successfully.',
    admin: {
      id: adminUser._id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
      phone: adminUser.phone,
    },
  });
});

/**
 * @desc    RBAC Verification Test Endpoints
 */
export const adminTest = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin RBAC authorization test PASSED.',
    user: { id: req.user._id, role: req.user.role, email: req.user.email },
  });
};

export const doctorTest = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Doctor RBAC authorization test PASSED.',
    user: { id: req.user._id, role: req.user.role, email: req.user.email },
  });
};

export const patientTest = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Patient RBAC authorization test PASSED.',
    user: { id: req.user._id, role: req.user.role, email: req.user.email },
  });
};

export default {
  register,
  login,
  logout,
  getMe,
  createDoctor,
  createAdmin,
  adminTest,
  doctorTest,
  patientTest,
};
