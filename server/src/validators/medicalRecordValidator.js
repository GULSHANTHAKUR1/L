import mongoose from 'mongoose';

/**
 * Validates medical record creation payload.
 */
export const validateCreateMedicalRecord = (req, res, next) => {
  const { patientId, appointmentId, diagnosis, symptoms, treatmentNotes, followUpDate } = req.body;
  const errors = [];

  if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
    errors.push('A valid patient ID is required.');
  }

  if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
    errors.push('A valid appointment ID is required.');
  }

  if (!diagnosis || typeof diagnosis !== 'string' || diagnosis.trim().length < 2) {
    errors.push('Diagnosis is required (min 2 characters).');
  }

  if (symptoms !== undefined && !Array.isArray(symptoms)) {
    errors.push('Symptoms must be an array of text descriptions.');
  }

  if (!treatmentNotes || typeof treatmentNotes !== 'string' || treatmentNotes.trim().length < 2) {
    errors.push('Treatment notes are required (min 2 characters).');
  }

  if (followUpDate && isNaN(new Date(followUpDate).getTime())) {
    errors.push('Invalid follow-up date format.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  next();
};

/**
 * Validates medical record update payload.
 */
export const validateUpdateMedicalRecord = (req, res, next) => {
  const { diagnosis, symptoms, treatmentNotes, followUpDate } = req.body;
  const errors = [];

  if (diagnosis !== undefined && (typeof diagnosis !== 'string' || diagnosis.trim().length < 2)) {
    errors.push('Diagnosis must be at least 2 characters long.');
  }

  if (symptoms !== undefined && !Array.isArray(symptoms)) {
    errors.push('Symptoms must be an array of text descriptions.');
  }

  if (treatmentNotes !== undefined && (typeof treatmentNotes !== 'string' || treatmentNotes.trim().length < 2)) {
    errors.push('Treatment notes must be at least 2 characters long.');
  }

  if (followUpDate !== undefined && followUpDate !== null && isNaN(new Date(followUpDate).getTime())) {
    errors.push('Invalid follow-up date format.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  next();
};

export default { validateCreateMedicalRecord, validateUpdateMedicalRecord };
