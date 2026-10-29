import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import MedicalRecord from '../models/MedicalRecord.js';

/**
 * Checks if a doctor is clinically linked to a patient through any
 * active or historical appointments, or through medical records.
 *
 * @param {string|ObjectId} doctorId - User ID of the doctor
 * @param {string|ObjectId} patientId - User ID of the patient
 * @returns {Promise<boolean>} True if linked, false otherwise
 */
export const isDoctorLinkedToPatient = async (doctorId, patientId) => {
  if (!doctorId || !patientId) return false;

  // Fail-safe closed: If DB is not connected, deny access
  if (mongoose.connection.readyState !== 1) {
    return false;
  }

  // 1. Check if an appointment exists between this doctor and patient
  const hasAppointment = await Appointment.exists({
    doctorId,
    patientId,
    status: { $in: ['booked', 'confirmed', 'completed'] },
  });

  if (hasAppointment) return true;

  // 2. Check if a medical record exists created by this doctor for this patient
  const hasMedicalRecord = await MedicalRecord.exists({
    doctorId,
    patientId,
  });

  return Boolean(hasMedicalRecord);
};

/**
 * Returns a deduplicated array of all patient IDs linked to a doctor
 * via active/completed appointments or medical records.
 *
 * @param {string|ObjectId} doctorId - User ID of the doctor
 * @returns {Promise<Array<string>>} Array of linked patient ID strings
 */
export const getPatientsLinkedToDoctor = async (doctorId) => {
  if (!doctorId) return [];

  // Fail-safe closed: If DB is not connected, return empty list
  if (mongoose.connection.readyState !== 1) {
    return [];
  }

  const [appointmentPatientIds, recordPatientIds] = await Promise.all([
    Appointment.find({
      doctorId,
      status: { $in: ['booked', 'confirmed', 'completed'] },
    }).distinct('patientId'),
    MedicalRecord.find({ doctorId }).distinct('patientId'),
  ]);

  const uniqueIds = new Set([
    ...appointmentPatientIds.map((id) => id.toString()),
    ...recordPatientIds.map((id) => id.toString()),
  ]);

  return Array.from(uniqueIds);
};

export default {
  isDoctorLinkedToPatient,
  getPatientsLinkedToDoctor,
};

