import mongoose from 'mongoose';

/**
 * Validates prescription creation payload.
 */
export const validateCreatePrescription = (req, res, next) => {
  const { patientId, appointmentId, medicines, additionalInstructions } = req.body;
  const errors = [];

  if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
    errors.push('A valid patient ID is required.');
  }

  if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
    errors.push('A valid appointment ID is required.');
  }

  if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
    errors.push('Prescription must contain an array of at least one medicine item.');
  } else {
    medicines.forEach((med, index) => {
      const idx = index + 1;
      if (!med.medicineName || typeof med.medicineName !== 'string' || med.medicineName.trim().length === 0) {
        errors.push(`Medicine #${idx}: medicineName is required.`);
      }
      if (!med.dosage || typeof med.dosage !== 'string' || med.dosage.trim().length === 0) {
        errors.push(`Medicine #${idx}: dosage is required (e.g. 500mg).`);
      }
      if (!med.frequency || typeof med.frequency !== 'string' || med.frequency.trim().length === 0) {
        errors.push(`Medicine #${idx}: frequency is required (e.g. 1-0-1).`);
      }
      if (!med.duration || typeof med.duration !== 'string' || med.duration.trim().length === 0) {
        errors.push(`Medicine #${idx}: duration is required (e.g. 5 days).`);
      }
    });
  }

  if (additionalInstructions !== undefined && typeof additionalInstructions !== 'string') {
    errors.push('additionalInstructions must be a text string.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  next();
};

/**
 * Validates prescription update payload.
 */
export const validateUpdatePrescription = (req, res, next) => {
  const { medicines, additionalInstructions } = req.body;
  const errors = [];

  if (medicines !== undefined) {
    if (!Array.isArray(medicines) || medicines.length === 0) {
      errors.push('medicines must be a non-empty array.');
    } else {
      medicines.forEach((med, index) => {
        const idx = index + 1;
        if (!med.medicineName || typeof med.medicineName !== 'string') {
          errors.push(`Medicine #${idx}: valid medicineName is required.`);
        }
        if (!med.dosage || typeof med.dosage !== 'string') {
          errors.push(`Medicine #${idx}: valid dosage is required.`);
        }
        if (!med.frequency || typeof med.frequency !== 'string') {
          errors.push(`Medicine #${idx}: valid frequency is required.`);
        }
        if (!med.duration || typeof med.duration !== 'string') {
          errors.push(`Medicine #${idx}: valid duration is required.`);
        }
      });
    }
  }

  if (additionalInstructions !== undefined && typeof additionalInstructions !== 'string') {
    errors.push('additionalInstructions must be a text string.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  next();
};

export default { validateCreatePrescription, validateUpdatePrescription };
