import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export const DoctorAppointmentDetail = () => {
  const { appointmentId } = useParams();
  const { showToast } = useToast();

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchAppointment = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/appointments/${appointmentId}`);
      if (res.data?.success && res.data?.data) {
        setAppointment(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retrieve appointment details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointment();
  }, [appointmentId]);

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdating(true);
      if (newStatus === 'cancelled') {
        await api.patch(`/appointments/${appointmentId}/cancel`, {
          cancellationReason: 'Cancelled by physician.',
        });
      } else {
        await api.patch(`/appointments/${appointmentId}/status`, { status: newStatus });
      }
      showToast(`Appointment status updated to ${newStatus}.`, 'success');
      fetchAppointment();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner text="Loading appointment clinical file..." />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="space-y-4">
        <Link
          to="/doctor/appointments"
          className="text-xs font-semibold text-blue-600 hover:underline"
        >
          ← Back to Appointments
        </Link>
        <ErrorAlert message={error || 'Appointment record not found.'} />
      </div>
    );
  }

  const patientId = appointment.patientId?._id || appointment.patientId;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/doctor/appointments"
            className="text-xs font-semibold text-slate-500 hover:text-blue-600 mb-1 inline-block"
          >
            ← Back to Appointments
          </Link>
          <PageTitle
            title="Consultation Session Detail"
            subtitle={`Session ID: ${appointment._id} | Date: ${appointment.appointmentDate}`}
          />
        </div>

        <div className="flex items-center gap-2">
          {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
            <button
              disabled={updating}
              onClick={() => handleStatusChange('completed')}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 transition disabled:opacity-50"
            >
              ✓ Conclude Consultation
            </button>
          )}
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Patient Info Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Patient Profile</h3>
            <Link
              to={`/doctor/patients/${patientId}`}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Full EHR History →
            </Link>
          </div>
          <div className="space-y-2.5 text-sm">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Patient Name</span>
              <span className="font-bold text-slate-900">
                {appointment.patientId?.name || 'Patient User'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Email</span>
              <span className="text-slate-700">{appointment.patientId?.email}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Phone</span>
              <span className="text-slate-700">{appointment.patientId?.phone || 'Not specified'}</span>
            </div>
          </div>
        </div>

        {/* Schedule & Slot Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Consultation Timing
          </h3>
          <div className="space-y-2.5 text-sm">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Scheduled Date</span>
              <span className="font-bold text-slate-900">{appointment.appointmentDate}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Slot Time</span>
              <span className="font-semibold text-blue-700">
                {appointment.startTime} - {appointment.endTime}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Status</span>
              <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 uppercase">
                {appointment.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reason for Visit Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Reason for Consultation / Presenting Complaint
        </h3>
        <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
          {appointment.reasonForVisit || 'No specific complaint entered by patient.'}
        </p>
      </div>

      {/* Action Banner to Issue Diagnosis or Prescription */}
      <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-bold">Document Clinical Findings</h4>
          <p className="text-xs text-slate-400 mt-1">
            Seamlessly bind clinical records and medication charts directly to this visit.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={`/doctor/medical-records/create?appointmentId=${appointment._id}&patientId=${patientId}`}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700 transition"
          >
            📋 Add Medical Record
          </Link>
          <Link
            to={`/doctor/prescriptions/create?appointmentId=${appointment._id}&patientId=${patientId}`}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-700 transition"
          >
            💊 Issue Prescription
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DoctorAppointmentDetail;
