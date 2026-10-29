import express from 'express';
import {
  createMedicalRecord,
  getMedicalRecords,
  getMedicalRecordById,
  updateMedicalRecord,
  deleteMedicalRecord,
} from '../controllers/medicalRecordController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import {
  validateCreateMedicalRecord,
  validateUpdateMedicalRecord,
} from '../validators/medicalRecordValidator.js';

const router = express.Router();

// Create clinical medical record (Assigned Doctor only)
router.post(
  '/',
  protect,
  authorizeRoles('doctor'),
  validateCreateMedicalRecord,
  createMedicalRecord
);

// List medical records (Role-scoped visibility)
router.get('/', protect, getMedicalRecords);

// View single medical record
router.get('/:recordId', protect, getMedicalRecordById);

// Update medical record (Creator Doctor or Admin only)
router.patch('/:recordId', protect, validateUpdateMedicalRecord, updateMedicalRecord);

// Delete medical record and purge search vectors (Creator Doctor or Admin only)
router.delete('/:recordId', protect, deleteMedicalRecord);

export default router;
