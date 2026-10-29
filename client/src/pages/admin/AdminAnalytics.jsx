import React, { useState, useEffect } from 'react';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';

export const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [appointmentStats, setAppointmentStats] = useState({
    booked: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    total: 0,
  });

  const [specializationStats, setSpecializationStats] = useState({});


  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch datasets to calculate analytics aggregates
        const [apptsRes, doctorsRes] = await Promise.allSettled([
          api.get('/appointments?limit=100'),
          api.get('/doctors?limit=100'),
        ]);

        // Process Appointments
        if (apptsRes.status === 'fulfilled' && apptsRes.value.data?.data) {
          const appts = apptsRes.value.data.data;
          const counts = { booked: 0, confirmed: 0, completed: 0, cancelled: 0 };
          appts.forEach((a) => {
            if (counts[a.status] !== undefined) counts[a.status]++;
          });
          setAppointmentStats({
            ...counts,
            total: appts.length,
          });
        }

        // Process Doctors by Specialization
        if (doctorsRes.status === 'fulfilled' && doctorsRes.value.data?.doctors) {
          const docs = doctorsRes.value.data.doctors;
          const specMap = {};
          docs.forEach((d) => {
            const spec = d.specialization || 'General Medicine';
            specMap[spec] = (specMap[spec] || 0) + 1;
          });
          setSpecializationStats(specMap);
        }


      } catch (err) {
        setError('Failed to compute analytics aggregates.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner text="Computing operational analytics & departmental distributions..." />
      </div>
    );
  }

  const apptTotal = appointmentStats.total || 1;
  const totalDoctors = Object.values(specializationStats).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-8">
      <PageTitle
        title="Hospital Departmental & Clinical Analytics"
        subtitle="Operational telemetry, consultation ratios, and clinical department distributions."
      />

      {error && <ErrorAlert message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Appointment Status Distribution */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">Appointment Status Distribution</h3>
            <p className="text-xs text-slate-500">
              Live consultation throughput across all clinical departments.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Completed Consultations</span>
                <span>
                  {appointmentStats.completed} (
                  {Math.round((appointmentStats.completed / apptTotal) * 100)}%)
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round((appointmentStats.completed / apptTotal) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Confirmed & Scheduled</span>
                <span>
                  {appointmentStats.confirmed} (
                  {Math.round((appointmentStats.confirmed / apptTotal) * 100)}%)
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round((appointmentStats.confirmed / apptTotal) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Booked (Pending Confirmation)</span>
                <span>
                  {appointmentStats.booked} (
                  {Math.round((appointmentStats.booked / apptTotal) * 100)}%)
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round((appointmentStats.booked / apptTotal) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Cancelled</span>
                <span>
                  {appointmentStats.cancelled} (
                  {Math.round((appointmentStats.cancelled / apptTotal) * 100)}%)
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round((appointmentStats.cancelled / apptTotal) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Doctors by Specialization */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">Physicians by Specialization</h3>
            <p className="text-xs text-slate-500">
              Departmental staffing ratios across medical specialties.
            </p>
          </div>

          <div className="space-y-3.5">
            {Object.keys(specializationStats).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No active doctor records.</p>
            ) : (
              Object.entries(specializationStats).map(([spec, count]) => {
                const pct = Math.round((count / totalDoctors) * 100);
                return (
                  <div key={spec}>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>{spec}</span>
                      <span>
                        {count} Doctors ({pct}%)
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Clearly Marked Pending Aggregate Endpoints API Contract */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
            ⚡
          </span>
          <h4 className="text-sm font-bold text-slate-800">
            Backend API Contract for Dedicated Aggregation Endpoints
          </h4>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          The analytics charts above dynamically aggregate active database records via the verified
          REST APIs (`/api/appointments`, `/api/doctors`). For large multi-tenant
          enterprise scaling (100,000+ records), the following pre-computed MongoDB aggregation
          pipeline endpoint contract is established:
        </p>
        <div className="rounded-xl bg-slate-900 p-4 text-[11px] font-mono text-slate-200 overflow-x-auto space-y-1">
          <div>// GET /api/analytics/overview (Future dedicated aggregation route)</div>
          <div>{`{`}</div>
          <div className="pl-4">
            "success": true,
          </div>
          <div className="pl-4">
            "appointmentsByStatus": {`{ "booked": 12, "confirmed": 28, "completed": 85, "cancelled": 4 }`},
          </div>
          <div className="pl-4">
            "doctorsBySpecialization": {`{ "Cardiology": 6, "Neurology": 4, "Orthopedics": 5 }`}
          </div>
          <div>{`}`}</div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
