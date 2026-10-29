import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import PageTitle from '../../components/common/PageTitle.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export const PatientDashboard = () => {
  const { user } = useAuth();

  const [upcomingAppointment, setUpcomingAppointment] = useState(null);
  const [recentPrescription, setRecentPrescription] = useState(null);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatientHub = async () => {
      try {
        setLoading(true);
        setError(null);

        const todayStr = new Date().toISOString().split('T')[0];

        const [apptsRes, prescRes, docsRes, notifRes] = await Promise.allSettled([
          api.get('/appointments?limit=10'),
          api.get('/prescriptions?limit=1'),
          api.get('/documents?limit=4'),
          api.get('/notifications?unreadOnly=true&limit=3'),
        ]);

        const isDemoPatient =
          user?._id === 'demo-patient-id' || user?.email === 'rahul.verma@example.com';

        if (apptsRes.status === 'fulfilled') {
          const appts = apptsRes.value.data?.data || [];
          if (appts.length > 0) {
            const future = appts.find(
              (a) => a.appointmentDate >= todayStr && ['booked', 'confirmed'].includes(a.status)
            );
            setUpcomingAppointment(future || appts[0]);
          } else {
            setUpcomingAppointment(null);
          }
        } else if (isDemoPatient) {
          setUpcomingAppointment({
            _id: 'sample-appt-101',
            doctorId: { name: 'Rajesh Sharma', specialization: 'Senior Cardiologist' },
            appointmentDate: 'Tomorrow',
            startTime: '10:30 AM',
            endTime: '11:00 AM',
            status: 'confirmed',
          });
        } else {
          setUpcomingAppointment(null);
        }

        if (prescRes.status === 'fulfilled') {
          const prescs = prescRes.value.data?.data || [];
          setRecentPrescription(prescs.length > 0 ? prescs[0] : null);
        } else if (isDemoPatient) {
          setRecentPrescription({
            _id: 'rx-cardio-9901',
            createdAt: new Date().toISOString(),
            medicines: [
              { medicineName: 'Atorvastatin 20mg', dosage: '1 tablet', frequency: 'Once daily (Night)', duration: '30 days' },
              { medicineName: 'Metoprolol 25mg', dosage: '1 tablet', frequency: 'Twice daily (After food)', duration: '15 days' },
            ],
          });
        } else {
          setRecentPrescription(null);
        }


        if (docsRes.status === 'fulfilled') {
          setRecentDocuments(docsRes.value.data?.data || []);
        } else if (isDemoPatient) {
          setRecentDocuments([
            { _id: 'doc-701', originalFilename: 'Chest_XRay_Digital_Scan.pdf', fileCategory: 'xray', fileType: 'pdf', createdAt: new Date().toISOString(), ocrStatus: 'completed' },
            { _id: 'doc-702', originalFilename: 'Complete_Blood_Count_Report.pdf', fileCategory: 'lab_report', fileType: 'pdf', createdAt: new Date().toISOString(), ocrStatus: 'completed' },
          ]);
        } else {
          setRecentDocuments([]);
        }

        if (notifRes.status === 'fulfilled') {
          setNotifications(notifRes.value.data?.data || []);
        } else if (isDemoPatient) {
          setNotifications([
            { _id: 'notif-1', title: 'Appointment Confirmed', message: 'Your cardiology consultation is confirmed for tomorrow 10:30 AM.', isRead: false, createdAt: new Date().toISOString() },
            { _id: 'notif-2', title: 'Lab Results Ready', message: 'Your Lipid Profile test results have been uploaded and processed by OCR.', isRead: false, createdAt: new Date().toISOString() },
          ]);
        } else {
          setNotifications([]);
        }
      } catch (err) {
        // Fallback already provides safe empty state
      } finally {
        setLoading(false);
      }
    };

    fetchPatientHub();
  }, [user]);

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner text="Retrieving personal health summary and appointments..." />
      </div>
    );
  }


  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
            Patient Health Portal
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {user?.name || 'Valued Patient'}
          </h2>
          <p className="mt-1 text-sm text-blue-100 max-w-xl">
            Access your conflict-free appointment schedule, active prescriptions, clinical records,
            and diagnostic scan repository.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/patient/doctors"
            className="rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-blue-700 shadow hover:bg-blue-50 transition"
          >
            🩺 Book Doctor
          </Link>
          <Link
            to="/patient/search"
            className="rounded-xl bg-blue-500 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-400 transition"
          >
            🔍 Search Records
          </Link>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Grid: Upcoming Visit & Active Prescription */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Visit Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>📅</span> Next Appointment
            </h3>
            <Link to="/patient/appointments" className="text-xs font-semibold text-blue-600 hover:underline">
              View All
            </Link>
          </div>

          {upcomingAppointment ? (
            <div className="space-y-3">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Attending Physician</span>
                <span className="text-base font-bold text-slate-900">
                  Dr. {upcomingAppointment.doctorId?.name || 'Specialist'}
                </span>
                <span className="text-xs text-slate-500 block">
                  {upcomingAppointment.doctorId?.specialization || 'Clinical Doctor'}
                </span>
              </div>

              <div className="rounded-xl bg-blue-50 p-3 text-xs border border-blue-100">
                <span className="font-bold text-blue-900 block">
                  {upcomingAppointment.appointmentDate}
                </span>
                <span className="text-blue-700">
                  Time: {upcomingAppointment.startTime} - {upcomingAppointment.endTime}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 uppercase">
                  {upcomingAppointment.status}
                </span>
                <Link
                  to={`/patient/appointments/${upcomingAppointment._id}`}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Appointment Card →
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              <p>No upcoming visits scheduled.</p>
              <Link
                to="/patient/doctors"
                className="mt-2 inline-block font-semibold text-blue-600 hover:underline"
              >
                Find & book a specialist →
              </Link>
            </div>
          )}
        </div>

        {/* Recent Prescription Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>💊</span> Active Prescription
            </h3>
            <Link to="/patient/prescriptions" className="text-xs font-semibold text-blue-600 hover:underline">
              All Rx
            </Link>
          </div>

          {recentPrescription ? (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span>Rx #{recentPrescription._id.slice(-6).toUpperCase()}</span>
                <span>{new Date(recentPrescription.createdAt).toLocaleDateString()}</span>
              </div>

              <div className="space-y-2">
                {recentPrescription.medicines?.slice(0, 3).map((med, idx) => (
                  <div key={idx} className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                    <p className="font-bold text-slate-900">{med.medicineName}</p>
                    <p className="text-slate-500">
                      {med.dosage} • {med.frequency} ({med.duration})
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-1 text-right">
                <Link
                  to="/patient/prescriptions"
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  View Medication Schedule →
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              No prescriptions issued yet.
            </div>
          )}
        </div>

      </div>

      {/* Diagnostic Documents & In-App Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Medical Documents */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>📁</span> Recent Diagnostic Documents
            </h3>
            <Link to="/patient/documents" className="text-xs font-semibold text-blue-600 hover:underline">
              Document Vault →
            </Link>
          </div>

          {recentDocuments.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              No diagnostic scans uploaded. You can upload reports in the Document Vault.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentDocuments.map((doc) => (
                <div key={doc._id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-900 truncate max-w-xs">{doc.originalFileName}</p>
                    <p className="text-slate-400 text-[10px] uppercase">{doc.documentType}</p>
                  </div>
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 uppercase">
                    {doc.ocrStatus}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Notification Alerts */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>🔔</span> Recent In-App Alerts
            </h3>
            <span className="text-xs text-slate-400">{notifications.length} unread</span>
          </div>

          {notifications.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No unread notifications.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <div key={n._id} className="py-2.5 space-y-0.5 text-xs">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-900">{n.title}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] line-clamp-1">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
