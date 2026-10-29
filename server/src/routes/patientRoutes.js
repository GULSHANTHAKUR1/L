import express from 'express';
import {
  getPatients,
  getPatientById,
  updateMyProfile,
  updatePatientByAdmin,
} from '../controllers/patientController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import {
  validatePatientSelfUpdate,
  validatePatientAdminUpdate,
} from '../validators/patientValidator.js';

const router = express.Router();

// List patients (Admin only)
router.get('/', protect, authorizeRoles('admin'), getPatients);

// Patient self-update
router.patch('/me', protect, authorizeRoles('patient'), validatePatientSelfUpdate, updateMyProfile);

// Get single patient profile (Admin all; Patient own; Doctor linked only)
router.get('/:patientId', protect, getPatientById);

// Update patient profile (Admin only)
router.patch(
  '/:patientId',
  protect,
  authorizeRoles('admin'),
  validatePatientAdminUpdate,
  updatePatientByAdmin
);

export default router;
