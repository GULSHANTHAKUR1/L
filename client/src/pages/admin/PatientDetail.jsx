import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

export const PatientDetail = () => {
  const { patientId } = useParams();

  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        setLoading(true);
        setError(null);

        const patientRes = await api.get(`/patients/${patientId}`);
        if (patientRes.data?.success && patientRes.data?.data) {
          const profile = patientRes.data.data;
          setPatient(profile);

          const userId = profile.userId?._id || profile.userId;

          // Fetch related records concurrently
          const [apptRes, docRes] = await Promise.allSettled([
            api.get(`/appointments?patientId=${userId}&limit=10`),
            api.get(`/documents?patientId=${userId}&limit=10`),
          ]);

          if (apptRes.status === 'fulfilled' && apptRes.value.data?.data) {
            setAppointments(apptRes.value.data.data);
          }
          if (docRes.status === 'fulfilled' && docRes.value.data?.data) {
            setDocuments(docRes.value.data.data);
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch patient records.');
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [patientId]);

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner text="Retrieving verified medical profile..." />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/patients"
          className="inline-flex items-center text-xs font-semibold text-blue-600 hover:underline"
        >
          ← Back to Patient Registry
        </Link>
        <ErrorAlert message={error || 'Patient profile not found.'} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/admin/patients"
            className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition mb-2 inline-block"
          >
            ← Back to Patient Registry
          </Link>
          <PageTitle
            title={`Patient File: ${patient.userId?.name || 'Patient'}`}
            subtitle={`Account ID: ${patient._id} | Registered Email: ${patient.userId?.email || 'N/A'}`}
          />
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/admin/patients/${patient.userId?._id || patient.userId}/timeline`}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-sky-700 transition"
          >
            <span>⏱️</span>
            <span>Medical Timeline</span>
          </Link>
        </div>
      </div>

      {/* Demographics & Clinical Information Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Demographics */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span>👤</span> Demographics & Contact
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Full Name</span>
              <span className="font-semibold text-slate-800">{patient.userId?.name}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Email Address</span>
              <span className="text-slate-700">{patient.userId?.email}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Phone Number</span>
              <span className="text-slate-700">{patient.userId?.phone || 'Not provided'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Gender</span>
              <span className="capitalize text-slate-700">{patient.gender || 'N/A'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Residential Address</span>
              <span className="text-slate-700">
                {patient.address
                  ? `${patient.address.street || ''}, ${patient.address.city || ''}, ${patient.address.state || ''}`
                  : 'Not provided'}
              </span>
            </div>
          </div>
        </div>

        {/* Emergency Contact & Medical Alerts */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span>🚨</span> Emergency & Clinical Alerts
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Emergency Contact</span>
              {patient.emergencyContact ? (
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                  <p className="font-semibold text-slate-800">{patient.emergencyContact.name}</p>
                  <p className="text-xs text-slate-500">
                    {patient.emergencyContact.relationship} • {patient.emergencyContact.phone}
                  </p>
                </div>
              ) : (
                <span className="text-slate-400">No emergency contact registered</span>
              )}
            </div>

            <div>
              <span className="text-xs text-slate-400 block font-medium mb-1">Known Allergies</span>
              {patient.allergies?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {patient.allergies.map((allergy, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200"
                    >
                      ⚠️ {allergy}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-400">No known allergies on record</span>
              )}
            </div>

            <div>
              <span className="text-xs text-slate-400 block font-medium mb-1">Chronic Conditions</span>
              {patient.chronicConditions?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {patient.chronicConditions.map((cond, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200"
                    >
                      {cond}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-400">None reported</span>
              )}
            </div>
          </div>
        </div>

        {/* Medical History Summary */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span>📋</span> Clinical History Summary
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
            {patient.medicalHistorySummary ||
              'No previous chronic clinical summary recorded. New patient file created in system.'}
          </p>
        </div>
      </div>

      {/* Linked Appointments & Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments Table */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="font-bold text-slate-900">Scheduled Appointments ({appointments.length})</h4>
            <Link to="/admin/appointments" className="text-xs font-semibold text-blue-600 hover:underline">
              Scheduler →
            </Link>
          </div>
          {appointments.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No appointments on record.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {appointments.map((appt) => (
                <div key={appt._id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">
                      Dr. {appt.doctorId?.name || 'Physician'}
                    </span>
                    <span className="text-slate-400 ml-2">
                      {appt.appointmentDate} ({appt.startTime})
                    </span>
                  </div>
                  <span className="capitalize font-semibold text-blue-600">{appt.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>


      </div>
    </div>
  );
};

export default PatientDetail;
