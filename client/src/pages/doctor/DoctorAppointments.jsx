import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export const DoctorAppointments = () => {
  const { showToast } = useToast();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Action status modal
  const [statusAction, setStatusAction] = useState({
    isOpen: false,
    appointment: null,
    targetStatus: '',
    loading: false,
  });

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (date) params.append('date', date);
      params.append('page', page);
      params.append('limit', 10);

      const res = await api.get(`/appointments?${params.toString()}`);
      if (res.data?.success) {
        setAppointments(res.data.data || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.total || 0);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch doctor appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [page, status, date]);

  const handleStatusUpdate = async () => {
    const { appointment, targetStatus } = statusAction;
    if (!appointment || !targetStatus) return;

    try {
      setStatusAction((prev) => ({ ...prev, loading: true }));
      if (targetStatus === 'cancelled') {
        await api.patch(`/appointments/${appointment._id}/cancel`, {
          cancellationReason: 'Cancelled by attending physician.',
        });
      } else {
        await api.patch(`/appointments/${appointment._id}/status`, {
          status: targetStatus,
        });
      }

      showToast(`Appointment status updated to ${targetStatus.toUpperCase()}.`, 'success');
      setStatusAction({ isOpen: false, appointment: null, targetStatus: '', loading: false });
      fetchAppointments();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status.', 'error');
      setStatusAction((prev) => ({ ...prev, loading: false }));
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
          title="Physician Appointment Schedule"
          subtitle={`Consultation bookings assigned to your clinical calendar (${totalCount} total).`}
        />
        <Link
          to="/doctor/schedule"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition self-start sm:self-auto"
        >
          ⏰ Configure Weekly Slots
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Status Filter</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Appointments</option>
            <option value="booked">Booked (Pending)</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Date Filter</label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={() => {
              setStatus('');
              setDate('');
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchAppointments} />}

      {loading ? (
        <div className="py-16">
          <LoadingSpinner text="Retrieving consultation calendar..." />
        </div>
      ) : appointments.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <EmptyState
            title="No appointments found"
            description="No consultations match the selected date or status filter."
            icon="📅"
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Schedule</th>
                  <th className="px-6 py-3.5">Patient</th>
                  <th className="px-6 py-3.5">Reason for Visit</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((appt) => (
                  <tr key={appt._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{appt.appointmentDate}</div>
                      <div className="text-xs text-slate-400">
                        {appt.startTime} - {appt.endTime}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {appt.patientId?.name || 'Patient User'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                      {appt.reasonForVisit || 'Regular consultation'}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(appt.status)}</td>
                    <td className="px-6 py-4 text-right space-x-1.5">
                      <Link
                        to={`/doctor/appointments/${appt._id}`}
                        className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                      >
                        Details
                      </Link>
                      {appt.status === 'booked' && (
                        <button
                          onClick={() =>
                            setStatusAction({
                              isOpen: true,
                              appointment: appt,
                              targetStatus: 'confirmed',
                              loading: false,
                            })
                          }
                          className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                        >
                          Confirm
                        </button>
                      )}
                      {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                        <button
                          onClick={() =>
                            setStatusAction({
                              isOpen: true,
                              appointment: appt,
                              targetStatus: 'completed',
                              loading: false,
                            })
                          }
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                        >
                          Mark Done
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
        isOpen={statusAction.isOpen}
        title={`Set Appointment Status to ${statusAction.targetStatus?.toUpperCase()}`}
        message={`Are you sure you want to mark this appointment for patient ${
          statusAction.appointment?.patientId?.name || ''
        } as ${statusAction.targetStatus}?`}
        confirmText="Confirm"
        isDanger={statusAction.targetStatus === 'cancelled'}
        isLoading={statusAction.loading}
        onConfirm={handleStatusUpdate}
        onClose={() =>
          setStatusAction({ isOpen: false, appointment: null, targetStatus: '', loading: false })
        }
      />
    </div>
  );
};

export default DoctorAppointments;
