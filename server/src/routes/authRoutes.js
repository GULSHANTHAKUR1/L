import express from 'express';
import {
  register,
  login,
  logout,
  getMe,
  createDoctor,
  createAdmin,
  adminTest,
  doctorTest,
  patientTest,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import {
  validateRegister,
  validateLogin,
  validateCreateDoctor,
  validateCreateAdmin,
} from '../validators/authValidator.js';

const router = express.Router();

// Public Authentication Routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', logout);

// Protected Identity Route
router.get('/me', protect, getMe);

// Admin-Only Account Creation Routes
router.post('/create-doctor', protect, authorizeRoles('admin'), validateCreateDoctor, createDoctor);
router.post('/create-admin', protect, authorizeRoles('admin'), validateCreateAdmin, createAdmin);

// RBAC Verification Testing Endpoints
router.get('/admin-test', protect, authorizeRoles('admin'), adminTest);
router.get('/doctor-test', protect, authorizeRoles('doctor'), doctorTest);
router.get('/patient-test', protect, authorizeRoles('patient'), patientTest);

export default router;
