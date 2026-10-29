import express from 'express';
import {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  cancelAppointment,
} from '../controllers/appointmentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import {
  validateCreateAppointment,
  validateUpdateStatus,
  validateCancelAppointment,
} from '../validators/appointmentValidator.js';

const router = express.Router();

// Book appointment (Patient only)
router.post('/', protect, authorizeRoles('patient'), validateCreateAppointment, createAppointment);

// List appointments (Role-scoped visibility)
router.get('/', protect, getAppointments);

// View single appointment
router.get('/:appointmentId', protect, getAppointmentById);

// Update appointment status (Admin or Assigned Doctor)
router.patch('/:appointmentId/status', protect, validateUpdateStatus, updateAppointmentStatus);

// Cancel appointment
router.patch('/:appointmentId/cancel', protect, validateCancelAppointment, cancelAppointment);

export default router;
