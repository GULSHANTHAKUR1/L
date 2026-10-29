import mongoose from 'mongoose';

/**
 * Validates document upload metadata fields.
 */
export const validateUploadDocument = (req, res, next) => {
  const { documentType, patientId, relatedRecordId } = req.body;
  const errors = [];

  const allowedDocumentTypes = ['lab-report', 'xray', 'prescription', 'discharge-summary', 'other'];

  if (!documentType || !allowedDocumentTypes.includes(documentType)) {
    errors.push(`documentType is required and must be one of: [${allowedDocumentTypes.join(', ')}].`);
  }

  if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
    errors.push('A valid patient ID is required.');
  }

  if (relatedRecordId && !mongoose.Types.ObjectId.isValid(relatedRecordId)) {
    errors.push('Invalid relatedRecordId format.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  next();
};

export default { validateUploadDocument };
