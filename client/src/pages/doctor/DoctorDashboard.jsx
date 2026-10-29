import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import PageTitle from '../../components/common/PageTitle.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export const DoctorDashboard = () => {
  const { user } = useAuth();

  const [metrics, setMetrics] = useState({
    todayCount: 0,
    upcomingCount: 0,
    completedCount: 0,
    patientsCount: 0,
  });
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDoctorDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const todayStr = new Date().toISOString().split('T')[0];

      const [todayRes, allApptsRes, recordsRes] = await Promise.allSettled([
        api.get(`/appointments?date=${todayStr}&limit=10`),
        api.get('/appointments?limit=100'),
        api.get('/medical-records?limit=1'),
      ]);

      const isDemoDoctor =
        user?._id === 'demo-doctor-id' || user?.email === 'dr.sharma@heterohms.com';

      if (todayRes.status === 'fulfilled') {
        setTodayAppointments(todayRes.value.data?.data || []);
      } else if (isDemoDoctor) {
        setTodayAppointments([
          {
            _id: 'appt-doc-1',
            patientId: { name: 'Rahul Verma', phone: '+91 98765 43210', gender: 'male', age: 34 },
            appointmentDate: todayStr,
            startTime: '10:00 AM',
            endTime: '10:30 AM',
            status: 'confirmed',
            reason: 'Hypertension follow-up & ECG evaluation',
          },
          {
            _id: 'appt-doc-2',
            patientId: { name: 'Priya Patel', phone: '+91 98123 45678', gender: 'female', age: 29 },
            appointmentDate: todayStr,
            startTime: '11:15 AM',
            endTime: '11:45 AM',
            status: 'confirmed',
            reason: 'Routine cardiac health screening',
          },
          {
            _id: 'appt-doc-3',
            patientId: { name: 'Amit Singh', phone: '+91 97555 12345', gender: 'male', age: 52 },
            appointmentDate: todayStr,
            startTime: '02:00 PM',
            endTime: '02:30 PM',
            status: 'booked',
            reason: 'Post-angioplasty medication review',
          },
        ]);
      } else {
        setTodayAppointments([]);
      }

      if (allApptsRes.status === 'fulfilled') {
        const appts = allApptsRes.value.data?.data || [];
        const todayCount = appts.filter((a) => a.appointmentDate === todayStr).length;
        const upcomingCount = appts.filter(
          (a) => a.appointmentDate >= todayStr && ['booked', 'confirmed'].includes(a.status)
        ).length;
        const completedCount = appts.filter((a) => a.status === 'completed').length;
        const uniquePatients = new Set(appts.map((a) => a.patientId?._id || a.patientId)).size;

        setMetrics({
          todayCount,
          upcomingCount,
          completedCount,
          patientsCount: uniquePatients,
        });
      } else if (isDemoDoctor) {
        setMetrics({
          todayCount: 6,
          upcomingCount: 18,
          completedCount: 42,
          patientsCount: 35,
        });
      } else {
        setMetrics({
          todayCount: 0,
          upcomingCount: 0,
          completedCount: 0,
          patientsCount: 0,
        });
      }
    } catch (err) {
      // Fallback preview data already set
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorDashboard();
  }, []);

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner text="Loading physician clinical queue and today's schedule..." />
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const map = {
      booked: 'bg-amber-100 text-amber-800 border-amber-200',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
          map[status] || 'bg-slate-100 text-slate-700'
        }`}
      >
        {status?.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageTitle
          title={`Clinical Hub: Dr. ${user?.name || 'Physician'}`}
          subtitle="Consultation queue, assigned patient history, and weekly availability."
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/doctor/schedule"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            ⏰ Manage Schedule
          </Link>
          <Link
            to="/doctor/search"
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            🔍 Clinical Search
          </Link>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchDoctorDashboard} />}

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Today's Visits</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              📅
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-blue-600">{metrics.todayCount}</p>
          <span className="text-xs text-slate-500 mt-1 block">Scheduled for today</span>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Upcoming Pipeline</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              🩺
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">{metrics.upcomingCount}</p>
          <span className="text-xs text-slate-500 mt-1 block">Booked / Confirmed slots</span>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Completed Visits</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              ✓
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-emerald-600">{metrics.completedCount}</p>
          <span className="text-xs text-slate-500 mt-1 block">Successfully concluded</span>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Patients</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              👥
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">{metrics.patientsCount}</p>
          <span className="text-xs text-slate-500 mt-1 block">Linked medical profiles</span>
        </div>
      </div>

      {/* Quick Action Clinical Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold">Fast Clinical Workflow</h3>
          <p className="text-xs text-blue-100 mt-1">
            Create diagnosis notes, issue itemized prescriptions, or upload patient diagnostic scans.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/doctor/medical-records/create"
            className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-blue-700 shadow hover:bg-blue-50 transition"
          >
            ➕ New Medical Record
          </Link>
          <Link
            to="/doctor/prescriptions/create"
            className="rounded-xl bg-blue-500 px-4 py-2 text-xs font-bold text-white shadow hover:bg-blue-400 transition"
          >
            💊 Issue Prescription
          </Link>
        </div>
      </div>

      {/* Today's Queue */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Today's Appointment Queue</h3>
            <p className="text-xs text-slate-500">Live consultation timeline for active clinic sessions.</p>
          </div>
          <Link
            to="/doctor/appointments"
            className="text-xs font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
          >
            View Master Calendar →
          </Link>
        </div>

        {todayAppointments.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No consultations scheduled for today"
              description="Your consultation calendar is clear today. View upcoming appointments in the scheduler."
              icon="☕"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Time Slot</th>
                  <th className="px-6 py-3.5">Patient</th>
                  <th className="px-6 py-3.5">Reason for Visit</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todayAppointments.map((appt) => (
                  <tr key={appt._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {appt.startTime} - {appt.endTime}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {appt.patientId?.name || 'Patient'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                      {appt.reasonForVisit || 'General Clinical Consultation'}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(appt.status)}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link
                        to={`/doctor/appointments/${appt._id}`}
                        className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                      >
                        Consultation →
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

export default DoctorDashboard;
