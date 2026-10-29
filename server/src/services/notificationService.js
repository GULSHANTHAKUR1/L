import Notification from '../models/Notification.js';

/**
 * Core notification creation function.
 *
 * @param {Object} params
 * @param {string|ObjectId} params.recipientId - Target user ID
 * @param {string} params.title - Notification headline
 * @param {string} params.message - Descriptive text
 * @param {string} params.type - 'appointment' | 'prescription' | 'bill' | 'document' | 'system'
 * @param {string} [params.relatedEntityType] - Referenced model ('Appointment', 'MedicalRecord', etc.)
 * @param {string|ObjectId} [params.relatedEntityId] - Target entity _id
 * @returns {Promise<Object|null>} Created notification document
 */
export const createNotification = async ({
  recipientId,
  title,
  message,
  type,
  relatedEntityType = null,
  relatedEntityId = null,
}) => {
  try {
    return await Notification.create({
      recipientId,
      title,
      message,
      type,
      relatedEntityType,
      relatedEntityId,
      isRead: false,
    });
  } catch (error) {
    console.error(`[Notification Service Error] Failed to dispatch to ${recipientId}:`, error.message);
    return null;
  }
};

/**
 * Dispatches notifications when an appointment is booked.
 */
export const notifyAppointmentBooked = async (appointment, patientUser, doctorUser) => {
  return Promise.all([
    createNotification({
      recipientId: appointment.patientId,
      title: 'Appointment Booked',
      message: `Your appointment with Dr. ${doctorUser.name} on ${appointment.appointmentDate} at ${appointment.startTime} is booked.`,
      type: 'appointment',
      relatedEntityType: 'Appointment',
      relatedEntityId: appointment._id,
    }),
    createNotification({
      recipientId: appointment.doctorId,
      title: 'New Appointment Booked',
      message: `Patient ${patientUser.name} booked a consultation for ${appointment.appointmentDate} at ${appointment.startTime}.`,
      type: 'appointment',
      relatedEntityType: 'Appointment',
      relatedEntityId: appointment._id,
    }),
  ]);
};

/**
 * Dispatches notification when appointment status transitions (confirmed, completed, cancelled).
 */
export const notifyAppointmentStatus = async (appointment, oldStatus, newStatus, doctorName) => {
  return createNotification({
    recipientId: appointment.patientId,
    title: 'Appointment Status Updated',
    message: `Your appointment with Dr. ${doctorName} on ${appointment.appointmentDate} changed from '${oldStatus}' to '${newStatus}'.`,
    type: 'appointment',
    relatedEntityType: 'Appointment',
    relatedEntityId: appointment._id,
  });
};

/**
 * Dispatches notification when a prescription is issued.
 */
export const notifyPrescriptionIssued = async (prescription, doctorName, count = 1) => {
  return createNotification({
    recipientId: prescription.patientId,
    title: 'Prescription Issued',
    message: `Dr. ${doctorName} has issued a new prescription with ${count} medicine item(s).`,
    type: 'prescription',
    relatedEntityType: 'Prescription',
    relatedEntityId: prescription._id,
  });
};

/**
 * Dispatches notification when a clinical medical record is created.
 */
export const notifyMedicalRecordCreated = async (record, doctorName) => {
  return createNotification({
    recipientId: record.patientId,
    title: 'Clinical Record Added',
    message: `Dr. ${doctorName} documented clinical notes and diagnosis for your recent consultation.`,
    type: 'appointment',
    relatedEntityType: 'MedicalRecord',
    relatedEntityId: record._id,
  });
};


/**
 * Dispatches notification when a medical document is uploaded.
 */
export const notifyDocumentUploaded = async (document, uploaderName) => {
  return createNotification({
    recipientId: document.patientId,
    title: 'Medical Document Uploaded',
    message: `${uploaderName} uploaded a new ${document.documentType} ('${document.originalFileName}').`,
    type: 'document',
    relatedEntityType: 'MedicalDocument',
    relatedEntityId: document._id,
  });
};

/**
 * Dispatches notification when OCR text extraction completes.
 */
export const notifyOcrCompleted = async (documentId, patientId, originalFileName) => {
  return createNotification({
    recipientId: patientId,
    title: 'OCR Text Extraction Completed',
    message: `Automated text extraction for '${originalFileName}' has finished and is available for review.`,
    type: 'document',
    relatedEntityType: 'MedicalDocument',
    relatedEntityId: documentId,
  });
};

/**
 * Dispatches notification when OCR text extraction fails.
 */
export const notifyOcrFailed = async (documentId, patientId, originalFileName, errorMessage) => {
  return createNotification({
    recipientId: patientId,
    title: 'OCR Extraction Failed',
    message: `Text extraction for '${originalFileName}' could not be completed: ${errorMessage}`,
    type: 'document',
    relatedEntityType: 'MedicalDocument',
    relatedEntityId: documentId,
  });
};

/**
 * Dispatches notification for vector semantic search indexing status.
 */
export const notifyIndexingStatus = async (documentId, patientId, status) => {
  return createNotification({
    recipientId: patientId,
    title: status === 'completed' ? 'Semantic Search Indexing Ready' : 'Semantic Indexing Failed',
    message:
      status === 'completed'
        ? 'Your medical document has been indexed for fast clinical search.'
        : 'Semantic search indexing encountered an issue and will retry.',
    type: 'system',
    relatedEntityType: 'MedicalDocument',
    relatedEntityId: documentId,
  });
};

export default {
  createNotification,
  notifyAppointmentBooked,
  notifyAppointmentStatus,
  notifyPrescriptionIssued,
  notifyMedicalRecordCreated,
  notifyDocumentUploaded,
  notifyOcrCompleted,
  notifyOcrFailed,
  notifyIndexingStatus,
};
