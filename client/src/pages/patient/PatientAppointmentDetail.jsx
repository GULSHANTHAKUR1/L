import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export const PatientAppointmentDetail = () => {
  const { appointmentId } = useParams();
  const { showToast } = useToast();

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchAppointment = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/appointments/${appointmentId}`);
      if (res.data?.success && res.data?.data) {
        setAppointment(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retrieve appointment card.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointment();
  }, [appointmentId]);

  const handleCancel = async () => {
    try {
      setCancelling(true);
      await api.patch(`/appointments/${appointmentId}/cancel`, {
        cancellationReason: 'Cancelled by patient.',
      });
      showToast('Appointment successfully cancelled.', 'success');
      setCancelModalOpen(false);
      fetchAppointment();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel appointment.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner text="Retrieving appointment card..." />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="space-y-4">
        <Link to="/patient/appointments" className="text-xs font-semibold text-blue-600 hover:underline">
          ← Back to Appointments
        </Link>
        <ErrorAlert message={error || 'Appointment record not found.'} />
      </div>
    );
  }

  const isFuture =
    new Date(appointment.appointmentDate) >= new Date(new Date().setHours(0, 0, 0, 0));
  const isCancellable = isFuture && ['booked', 'confirmed'].includes(appointment.status);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/patient/appointments"
        className="text-xs font-semibold text-slate-500 hover:text-blue-600 inline-block mb-1"
      >
        ← Back to Appointments List
      </Link>

      <PageTitle
        title="Appointment Consultation Card"
        subtitle={`Session ID: ${appointment._id} | Date: ${appointment.appointmentDate}`}
      />

      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        {/* Status Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
              Booking Status
            </span>
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 uppercase mt-1">
              {appointment.status}
            </span>
          </div>

          {isCancellable && (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="rounded-xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
            >
              Cancel Booking
            </button>
          )}
        </div>

        {/* Doctor & Timing Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
          <div>
            <span className="text-xs font-bold uppercase text-slate-400 block">Attending Doctor</span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              Dr. {appointment.doctorId?.name || 'Physician'}
            </h3>
            <p className="text-xs text-slate-500">{appointment.doctorId?.email}</p>
          </div>

          <div>
            <span className="text-xs font-bold uppercase text-slate-400 block">Date & Shift</span>
            <p className="text-base font-extrabold text-blue-700 mt-1">
              {appointment.appointmentDate}
            </p>
            <p className="text-xs text-slate-600">
              {appointment.startTime} - {appointment.endTime}
            </p>
          </div>
        </div>

        {/* Reason for Visit */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            Reason for Consultation
          </h4>
          <p className="text-sm text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-100">
            {appointment.reasonForVisit || 'Regular health consultation.'}
          </p>
        </div>

        {/* Cancellation Notice if applicable */}
        {appointment.status === 'cancelled' && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 space-y-1">
            <span className="font-bold block">Cancellation Note:</span>
            <p>{appointment.cancellationReason || 'Cancelled by user or clinic administrator.'}</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={cancelModalOpen}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this booking? The slot will be released back to the clinic calendar."
        confirmText="Confirm Cancellation"
        isDanger={true}
        isLoading={cancelling}
        onConfirm={handleCancel}
        onClose={() => setCancelModalOpen(false)}
      />
    </div>
  );
};

export default PatientAppointmentDetail;
