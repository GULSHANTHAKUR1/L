/**
 * Validates updates to doctor profile.
 */
export const validateDoctorUpdate = (req, res, next) => {
  const { consultationFee, experienceYears, specialization, availabilitySlots } = req.body;
  const errors = [];

  if (consultationFee !== undefined && (isNaN(Number(consultationFee)) || Number(consultationFee) < 0)) {
    errors.push('Consultation fee must be a non-negative number.');
  }

  if (experienceYears !== undefined && (isNaN(Number(experienceYears)) || Number(experienceYears) < 0)) {
    errors.push('Experience years must be a non-negative number.');
  }

  if (specialization !== undefined && (typeof specialization !== 'string' || specialization.trim().length === 0)) {
    errors.push('Specialization cannot be empty.');
  }

  if (availabilitySlots !== undefined && !Array.isArray(availabilitySlots)) {
    errors.push('Availability slots must be an array.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  next();
};

/**
 * Validates update to doctor availability slots array.
 */
export const validateDoctorAvailability = (req, res, next) => {
  const { availabilitySlots } = req.body;
  const errors = [];

  if (!availabilitySlots || !Array.isArray(availabilitySlots)) {
    errors.push('availabilitySlots is required and must be an array.');
  } else {
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    availabilitySlots.forEach((slot, index) => {
      if (!validDays.includes(slot.dayOfWeek)) {
        errors.push(`Slot #${index + 1}: Invalid dayOfWeek '${slot.dayOfWeek}'.`);
      }
      if (!slot.startTime || !timeRegex.test(slot.startTime)) {
        errors.push(`Slot #${index + 1}: startTime must be in HH:mm format.`);
      }
      if (!slot.endTime || !timeRegex.test(slot.endTime)) {
        errors.push(`Slot #${index + 1}: endTime must be in HH:mm format.`);
      }
      if (slot.slotDurationMinutes && (isNaN(Number(slot.slotDurationMinutes)) || Number(slot.slotDurationMinutes) < 10)) {
        errors.push(`Slot #${index + 1}: slotDurationMinutes must be at least 10 minutes.`);
      }
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  next();
};

export default { validateDoctorUpdate, validateDoctorAvailability };
