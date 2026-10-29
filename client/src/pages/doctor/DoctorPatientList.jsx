import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

export const DoctorPatientList = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchAssignedPatients = async () => {
    try {
      setLoading(true);
      setError(null);

      // Doctors access patients assigned through their appointments
      const res = await api.get('/appointments?limit=100');
      if (res.data?.success && res.data?.data) {
        const appts = res.data.data;
        // Group by unique patient
        const patientMap = new Map();
        appts.forEach((a) => {
          if (a.patientId && a.patientId._id) {
            if (!patientMap.has(a.patientId._id)) {
              patientMap.set(a.patientId._id, {
                ...a.patientId,
                lastAppointment: a.appointmentDate,
                lastStatus: a.status,
              });
            }
          }
        });

        setPatients(Array.from(patientMap.values()));
      }
    } catch (err) {
      setError('Failed to fetch assigned clinical patient roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedPatients();
  }, []);

  const filteredPatients = patients.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.phone && p.phone.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageTitle
          title="Assigned Clinical Patient Roster"
          subtitle={`Patients with consultations scheduled with you (${patients.length} linked patients).`}
        />
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter assigned patients by name, email, or contact number..."
          className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchAssignedPatients} />}

      {loading ? (
        <div className="py-16">
          <LoadingSpinner text="Retrieving authorized patient list..." />
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <EmptyState
            title="No assigned patients"
            description="Patients who book an appointment with you will automatically be linked to your clinical roster."
            icon="👥"
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Patient Name</th>
                  <th className="px-6 py-3.5">Email & Contact</th>
                  <th className="px-6 py-3.5">Recent Consultation</th>
                  <th className="px-6 py-3.5 text-right">EHR Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map((patient) => (
                  <tr key={patient._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {patient.name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-800">{patient.email}</div>
                      <div className="text-xs text-slate-400">{patient.phone || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="font-semibold text-slate-700">{patient.lastAppointment}</span>
                      <span className="ml-2 uppercase text-[10px] font-bold text-blue-600">
                        ({patient.lastStatus})
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link
                        to={`/doctor/patients/${patient._id}`}
                        className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                      >
                        Clinical File →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorPatientList;
