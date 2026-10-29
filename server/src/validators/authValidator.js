/**
 * Helper to validate email format via regular expression.
 */
const isValidEmail = (email) => {
  return /^\S+@\S+\.\S+$/.test(email);
};

/**
 * Validates registration payload for public patient signups.
 */
export const validateRegister = (req, res, next) => {
  const { name, email, password, phone, dateOfBirth, gender, bloodGroup, emergencyContact } = req.body;

  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Name is required and must be at least 2 characters long.');
  }

  if (!email || !isValidEmail(email)) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password is required and must be at least 6 characters long.');
  }

  if (!phone || typeof phone !== 'string' || phone.trim().length < 8) {
    errors.push('A valid phone number is required (min 8 digits).');
  }

  if (dateOfBirth && isNaN(new Date(dateOfBirth).getTime())) {
    errors.push('A valid date of birth is required (YYYY-MM-DD).');
  }

  if (!gender || !['male', 'female', 'other'].includes(gender)) {
    errors.push("Gender is required and must be 'male', 'female', or 'other'.");
  }

  if (bloodGroup && !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(bloodGroup)) {
    errors.push('A valid blood group is required (A+, A-, B+, B-, AB+, AB-, O+, O-).');
  }

  if (!emergencyContact || !emergencyContact.name || !emergencyContact.phone || !emergencyContact.relationship) {
    errors.push('Emergency contact requires name, phone, and relationship.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

/**
 * Validates login payload.
 */
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !isValidEmail(email)) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('Password is required.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

/**
 * Validates doctor creation payload (Admin only).
 */
export const validateCreateDoctor = (req, res, next) => {
  const { name, email, password, phone, specialization, experienceYears, consultationFee } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Doctor name is required (min 2 characters).');
  }

  if (!email || !isValidEmail(email)) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password is required and must be at least 6 characters long.');
  }

  if (!phone || typeof phone !== 'string' || phone.trim().length < 8) {
    errors.push('A valid phone number is required.');
  }

  if (!specialization || typeof specialization !== 'string' || specialization.trim().length === 0) {
    errors.push('Specialization is required.');
  }

  if (experienceYears === undefined || isNaN(Number(experienceYears)) || Number(experienceYears) < 0) {
    errors.push('Experience years must be a non-negative number.');
  }

  if (consultationFee === undefined || isNaN(Number(consultationFee)) || Number(consultationFee) < 0) {
    errors.push('Consultation fee must be a non-negative number.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

/**
 * Validates admin creation payload (Admin only).
 */
export const validateCreateAdmin = (req, res, next) => {
  const { name, email, password, phone } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Admin name is required (min 2 characters).');
  }

  if (!email || !isValidEmail(email)) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password is required and must be at least 6 characters long.');
  }

  if (!phone || typeof phone !== 'string' || phone.trim().length < 8) {
    errors.push('A valid phone number is required.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

export default {
  validateRegister,
  validateLogin,
  validateCreateDoctor,
  validateCreateAdmin,
};
