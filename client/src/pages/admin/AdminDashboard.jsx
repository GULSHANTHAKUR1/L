import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import PageTitle from '../../components/common/PageTitle.jsx';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    patients: 0,
    doctors: 0,
    todayAppointments: 0,
    documents: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const todayStr = new Date().toISOString().split('T')[0];

      const [patientsRes, doctorsRes, appointmentsRes, todayApptRes, docsRes] =
        await Promise.allSettled([
          api.get('/patients?limit=1'),
          api.get('/doctors?limit=1'),
          api.get('/appointments?limit=6'),
          api.get(`/appointments?date=${todayStr}&limit=1`),
          api.get('/documents?limit=1'),
        ]);

      const patientsCount =
        patientsRes.status === 'fulfilled' && typeof patientsRes.value.data?.total === 'number'
          ? patientsRes.value.data.total
          : 0;
      const doctorsCount =
        doctorsRes.status === 'fulfilled' && typeof doctorsRes.value.data?.total === 'number'
          ? doctorsRes.value.data.total
          : 0;
      const todayApptCount =
        todayApptRes.status === 'fulfilled' && typeof todayApptRes.value.data?.total === 'number'
          ? todayApptRes.value.data.total
          : 0;
      const documentsCount =
        docsRes.status === 'fulfilled' && typeof docsRes.value.data?.total === 'number'
          ? docsRes.value.data.total
          : 0;

      setMetrics({
        patients: patientsCount,
        doctors: doctorsCount,
        todayAppointments: todayApptCount,
        documents: documentsCount,
      });

      if (appointmentsRes.status === 'fulfilled') {
        setRecentAppointments(appointmentsRes.value.data?.data || []);
      } else {
        setRecentAppointments([]);
      }
    } catch (err) {
      // Fallback preview data already set
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner text="Aggregating clinical and hospital operations metrics..." />
      </div>
    );
  }

  const statusBadge = (status) => {
    const map = {
      booked: 'bg-amber-100 text-amber-800 border-amber-200',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
          map[status] || 'bg-slate-100 text-slate-700 border-slate-200'
        }`}
      >
        {status?.toUpperCase() || 'UNKNOWN'}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle
          title="Hospital Operations Overview"
          subtitle="Real-time administrative telemetry, patient census, and appointment pipeline."
        />
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchDashboardData} />}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Patients */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Patients</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 text-lg">
              👥
            </span>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-slate-900">{metrics.patients}</p>
          <Link
            to="/admin/patients"
            className="mt-2 inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            View patient registry →
          </Link>
        </div>

        {/* Total Doctors */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Doctors</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 text-lg">
              👨‍⚕️
            </span>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-slate-900">{metrics.doctors}</p>
          <Link
            to="/admin/doctors"
            className="mt-2 inline-flex items-center text-xs font-medium text-sky-600 hover:text-sky-700"
          >
            Manage staff roster →
          </Link>
        </div>

        {/* Today's Appointments */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Today's Visits</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 text-lg">
              📅
            </span>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-slate-900">{metrics.todayAppointments}</p>
          <Link
            to="/admin/appointments"
            className="mt-2 inline-flex items-center text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            View appointment list →
          </Link>
        </div>


        {/* Uploaded Documents */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Medical Scans</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 text-lg">
              📁
            </span>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-slate-900">{metrics.documents}</p>
          <Link
            to="/admin/documents"
            className="mt-2 inline-flex items-center text-xs font-medium text-purple-600 hover:text-purple-700"
          >
            Audit document vault →
          </Link>
        </div>
      </div>

      {/* Recent Appointments Section */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Appointments</h3>
            <p className="text-xs text-slate-500">Live booking stream across all medical departments.</p>
          </div>
          <Link
            to="/admin/appointments"
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
          >
            View All ({recentAppointments.length})
          </Link>
        </div>

        {recentAppointments.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No appointments scheduled"
              description="Appointments booked by patients will appear in this real-time stream."
              icon="📅"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-bold uppercase text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Patient</th>
                  <th className="px-6 py-3.5">Assigned Doctor</th>
                  <th className="px-6 py-3.5">Schedule</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentAppointments.map((appt) => (
                  <tr key={appt._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {appt.patientId?.name || 'Patient User'}
                    </td>
                    <td className="px-6 py-4">
                      {appt.doctorId?.name?.startsWith('Dr.') ? appt.doctorId?.name : `Dr. ${appt.doctorId?.name || 'Assigned Physician'}`}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-medium text-slate-800">
                        {appt.appointmentDate}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {appt.startTime} - {appt.endTime}
                      </div>
                    </td>
                    <td className="px-6 py-4">{statusBadge(appt.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to="/admin/appointments"
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
