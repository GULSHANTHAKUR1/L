import express from 'express';
import {
  createPrescription,
  getPrescriptions,
  getPrescriptionById,
  updatePrescription,
  deletePrescription,
} from '../controllers/prescriptionController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import {
  validateCreatePrescription,
  validateUpdatePrescription,
} from '../validators/prescriptionValidator.js';

const router = express.Router();

// Create prescription (Assigned Doctor only)
router.post(
  '/',
  protect,
  authorizeRoles('doctor'),
  validateCreatePrescription,
  createPrescription
);

// List prescriptions (Role-scoped visibility)
router.get('/', protect, getPrescriptions);

// View single prescription
router.get('/:prescriptionId', protect, getPrescriptionById);

// Update prescription (Creator Doctor or Admin only)
router.patch('/:prescriptionId', protect, validateUpdatePrescription, updatePrescription);

// Delete prescription and purge search vectors (Creator Doctor or Admin only)
router.delete('/:prescriptionId', protect, deletePrescription);

export default router;
