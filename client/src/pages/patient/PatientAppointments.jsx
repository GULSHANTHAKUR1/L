import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export const PatientAppointments = () => {
  const { showToast } = useToast();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Cancellation Modal State
  const [cancelModal, setCancelModal] = useState({
    isOpen: false,
    appointment: null,
    loading: false,
  });

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('page', page);
      params.append('limit', 10);

      const res = await api.get(`/appointments?${params.toString()}`);
      if (res.data?.success) {
        setAppointments(res.data.data || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.total || 0);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch appointment history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [page, status]);

  const handleCancelAppointment = async () => {
    if (!cancelModal.appointment) return;
    try {
      setCancelModal((prev) => ({ ...prev, loading: true }));
      await api.patch(`/appointments/${cancelModal.appointment._id}/cancel`, {
        cancellationReason: 'Cancelled by patient from portal.',
      });

      showToast('Appointment cancelled successfully.', 'success');
      setCancelModal({ isOpen: false, appointment: null, loading: false });
      fetchAppointments();
    } catch (err) {
      showToast(err.response?.data?.message || 'Cancellation failed.', 'error');
      setCancelModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const getStatusBadge = (apptStatus) => {
    const map = {
      booked: 'bg-amber-100 text-amber-800 border-amber-200',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
          map[apptStatus] || 'bg-slate-100 text-slate-700'
        }`}
      >
        {apptStatus?.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageTitle
          title="My Scheduled Consultations"
          subtitle={`Your personal hospital appointment records and booking history (${totalCount} total).`}
        />
        <Link
          to="/patient/doctors"
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700 transition self-start sm:self-auto"
        >
          ➕ Book New Appointment
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold uppercase text-slate-400">Status:</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Appointments</option>
            <option value="booked">Booked (Pending)</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {status && (
          <button
            onClick={() => {
              setStatus('');
              setPage(1);
            }}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            Reset Filter
          </button>
        )}
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchAppointments} />}

      {loading ? (
        <div className="py-16">
          <LoadingSpinner text="Retrieving consultation bookings..." />
        </div>
      ) : appointments.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <EmptyState
            title="No appointments scheduled"
            description="You currently have no consultations in this filter category."
            icon="📅"
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Doctor</th>
                  <th className="px-6 py-3.5">Date & Slot</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Reason for Visit</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((appt) => {
                  const isFuture =
                    new Date(appt.appointmentDate) >= new Date(new Date().setHours(0, 0, 0, 0));
                  const isCancellable =
                    isFuture && ['booked', 'confirmed'].includes(appt.status);

                  return (
                    <tr key={appt._id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">
                          Dr. {appt.doctorId?.name || 'Physician'}
                        </div>
                        <div className="text-xs text-slate-400">
                          {appt.doctorId?.specialization}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{appt.appointmentDate}</div>
                        <div className="text-xs text-slate-400">
                          {appt.startTime} - {appt.endTime}
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(appt.status)}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                        {appt.reasonForVisit || 'Regular consultation'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Link
                          to={`/patient/appointments/${appt._id}`}
                          className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                        >
                          Details
                        </Link>
                        {isCancellable && (
                          <button
                            onClick={() =>
                              setCancelModal({
                                isOpen: true,
                                appointment: appt,
                                loading: false,
                              })
                            }
                            className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/50">
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={cancelModal.isOpen}
        title="Cancel Scheduled Appointment"
        message={`Are you sure you want to cancel your appointment with Dr. ${
          cancelModal.appointment?.doctorId?.name || 'Doctor'
        } on ${cancelModal.appointment?.appointmentDate}? This slot will be unlocked for other patients.`}
        confirmText="Yes, Cancel Booking"
        isDanger={true}
        isLoading={cancelModal.loading}
        onConfirm={handleCancelAppointment}
        onClose={() => setCancelModal({ isOpen: false, appointment: null, loading: false })}
      />
    </div>
  );
};

export default PatientAppointments;
