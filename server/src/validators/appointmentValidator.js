import mongoose from 'mongoose';

/**
 * Validates appointment booking request.
 */
export const validateCreateAppointment = (req, res, next) => {
  const { doctorId, appointmentDate, startTime, endTime, reasonForVisit } = req.body;
  const errors = [];

  if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
    errors.push('A valid doctor ID is required.');
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!appointmentDate || !dateRegex.test(appointmentDate)) {
    errors.push('appointmentDate is required in YYYY-MM-DD format.');
  } else {
    // Validate date is not in the past (comparing with start of today)
    const targetDate = new Date(`${appointmentDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (targetDate < today) {
      errors.push('Appointment date cannot be in the past.');
    }
  }

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!startTime || !timeRegex.test(startTime)) {
    errors.push('startTime is required in HH:mm format.');
  }

  if (!endTime || !timeRegex.test(endTime)) {
    errors.push('endTime is required in HH:mm format.');
  }

  if (startTime && endTime && startTime >= endTime) {
    errors.push('startTime must be earlier than endTime.');
  }

  if (!reasonForVisit || typeof reasonForVisit !== 'string' || reasonForVisit.trim().length < 3) {
    errors.push('Reason for visit is required (min 3 characters).');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  next();
};

/**
 * Validates status update transition.
 */
export const validateUpdateStatus = (req, res, next) => {
  const { status } = req.body;
  const allowedStatuses = ['confirmed', 'completed', 'cancelled'];

  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Allowed values: [${allowedStatuses.join(', ')}].`,
    });
  }

  next();
};

/**
 * Validates cancellation request.
 */
export const validateCancelAppointment = (req, res, next) => {
  const { cancellationReason } = req.body;

  if (cancellationReason && typeof cancellationReason !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Cancellation reason must be a text string.',
    });
  }

  next();
};

export default {
  validateCreateAppointment,
  validateUpdateStatus,
  validateCancelAppointment,
};
