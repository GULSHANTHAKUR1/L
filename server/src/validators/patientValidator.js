/**
 * Validates self-updates by a patient to their profile.
 * Restricts updates to permitted demographic and contact fields.
 */
export const validatePatientSelfUpdate = (req, res, next) => {
  const disallowedFields = ['userId', 'bloodGroup', 'dateOfBirth', 'gender', 'role', '_id'];
  const requestedFields = Object.keys(req.body);

  const attemptedDisallowed = requestedFields.filter((field) => disallowedFields.includes(field));

  if (attemptedDisallowed.length > 0) {
    return res.status(400).json({
      success: false,
      message: `You are not permitted to modify immutable fields: [${attemptedDisallowed.join(', ')}]. Contact administration for official changes.`,
    });
  }

  const { emergencyContact, allergies, chronicConditions } = req.body;
  const errors = [];

  if (emergencyContact !== undefined) {
    if (!emergencyContact.name || !emergencyContact.phone || !emergencyContact.relationship) {
      errors.push('Emergency contact must include name, phone, and relationship.');
    }
  }

  if (allergies !== undefined && !Array.isArray(allergies)) {
    errors.push('Allergies must be an array of strings.');
  }

  if (chronicConditions !== undefined && !Array.isArray(chronicConditions)) {
    errors.push('Chronic conditions must be an array of strings.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  next();
};

/**
 * Validates admin updates to patient profile.
 */
export const validatePatientAdminUpdate = (req, res, next) => {
  const { bloodGroup, gender, dateOfBirth } = req.body;
  const errors = [];

  if (bloodGroup && !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(bloodGroup)) {
    errors.push('Invalid blood group.');
  }

  if (gender && !['male', 'female', 'other'].includes(gender)) {
    errors.push("Gender must be 'male', 'female', or 'other'.");
  }

  if (dateOfBirth && isNaN(new Date(dateOfBirth).getTime())) {
    errors.push('Invalid date of birth format.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  next();
};

export default { validatePatientSelfUpdate, validatePatientAdminUpdate };
