import express from 'express';
import {
  getDoctors,
  getDoctorById,
  updateDoctorProfile,
  updateMyAvailability,
} from '../controllers/doctorController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import {
  validateDoctorUpdate,
  validateDoctorAvailability,
} from '../validators/doctorValidator.js';

const router = express.Router();

// Public authenticated doctor browsing
router.get('/', protect, getDoctors);

// Doctor availability update (Doctor only)
router.patch(
  '/me/availability',
  protect,
  authorizeRoles('doctor'),
  validateDoctorAvailability,
  updateMyAvailability
);

// Doctor profile detail
router.get('/:doctorId', protect, getDoctorById);

// Update doctor profile (Admin or Doctor own)
router.patch('/:doctorId', protect, validateDoctorUpdate, updateDoctorProfile);

export default router;
