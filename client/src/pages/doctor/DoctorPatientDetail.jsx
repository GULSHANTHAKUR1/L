import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

export const DoctorPatientDetail = () => {
  const { patientId } = useParams();

  const [patient, setPatient] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatientEhr = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch patient profile
        const patientRes = await api.get(`/patients/${patientId}`);
        if (patientRes.data?.success && patientRes.data?.data) {
          const profile = patientRes.data.data;
          setPatient(profile);

          const targetUserId = profile.userId?._id || profile.userId;

          // Fetch patient EHR records concurrently
          const [recordsRes, prescRes, docsRes, apptRes] = await Promise.allSettled([
            api.get(`/medical-records?patientId=${targetUserId}&limit=20`),
            api.get(`/prescriptions?patientId=${targetUserId}&limit=20`),
            api.get(`/documents?patientId=${targetUserId}&limit=20`),
            api.get(`/appointments?patientId=${targetUserId}&limit=20`),
          ]);

          if (recordsRes.status === 'fulfilled' && recordsRes.value.data?.data) {
            setMedicalRecords(recordsRes.value.data.data);
          }
          if (prescRes.status === 'fulfilled' && prescRes.value.data?.data) {
            setPrescriptions(prescRes.value.data.data);
          }
          if (docsRes.status === 'fulfilled' && docsRes.value.data?.data) {
            setDocuments(docsRes.value.data.data);
          }
          if (apptRes.status === 'fulfilled' && apptRes.value.data?.data) {
            setAppointments(apptRes.value.data.data);
          }
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            'Access denied: You can only view clinical records of patients assigned to your care.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPatientEhr();
  }, [patientId]);

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner text="Retrieving authorized clinical records..." />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="space-y-4">
        <Link to="/doctor/patients" className="text-xs font-semibold text-blue-600 hover:underline">
          ← Back to Assigned Patients
        </Link>
        <ErrorAlert message={error || 'Authorized patient file not found.'} />
      </div>
    );
  }

  const targetUserId = patient.userId?._id || patient.userId;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/doctor/patients"
            className="text-xs font-semibold text-slate-500 hover:text-blue-600 mb-1 inline-block"
          >
            ← Back to Patient Roster
          </Link>
          <PageTitle
            title={`Authorized Clinical EHR: ${patient.userId?.name || 'Patient'}`}
            subtitle={`Gender: ${patient.gender || 'N/A'}`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to={`/doctor/patients/${targetUserId}/timeline`}
            className="rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-sky-700 transition"
          >
            ⏱️ Medical Timeline
          </Link>
          <Link
            to={`/doctor/medical-records/create?patientId=${targetUserId}`}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700 transition"
          >
            ➕ Add Clinical Record
          </Link>
          <Link
            to={`/doctor/prescriptions/create?patientId=${targetUserId}`}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-700 transition"
          >
            💊 Issue Prescription
          </Link>
        </div>
      </div>

      {/* Allergies & Clinical Alerts Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
            <span>⚠️</span> Known Patient Allergies
          </h4>
          {patient.allergies?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {patient.allergies.map((allergy, i) => (
                <span
                  key={i}
                  className="rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800 border border-rose-200"
                >
                  {allergy}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-rose-600">No known allergies on record.</p>
          )}
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
            <span>ℹ️</span> Chronic Conditions
          </h4>
          {patient.chronicConditions?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {patient.chronicConditions.map((cond, i) => (
                <span
                  key={i}
                  className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200"
                >
                  {cond}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-amber-600">No chronic conditions recorded.</p>
          )}
        </div>
      </div>

      {/* Medical Records Section */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Clinical Medical Records</h3>
            <p className="text-xs text-slate-500">Diagnosis and physician progress notes.</p>
          </div>
          <span className="text-xs font-semibold text-slate-400">{medicalRecords.length} records</span>
        </div>

        {medicalRecords.length === 0 ? (
          <EmptyState
            title="No medical records recorded"
            description="Use 'Add Clinical Record' above to document diagnoses and examination findings."
            icon="📋"
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {medicalRecords.map((record) => (
              <div key={record._id} className="py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">{record.diagnosis}</h4>
                  <span className="text-xs text-slate-400">
                    {new Date(record.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {record.symptoms?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {record.symptoms.map((s, idx) => (
                      <span
                        key={idx}
                        className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {record.treatmentNotes}
                </p>
                <div className="flex items-center justify-between pt-1">
                  {record.followUpDate && (
                    <span className="text-[11px] font-semibold text-blue-700">
                      📅 Follow-up: {record.followUpDate}
                    </span>
                  )}
                  <Link
                    to={`/doctor/medical-records/${record._id}`}
                    className="text-xs font-semibold text-blue-600 hover:underline ml-auto"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prescriptions Section */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Active & Past Prescriptions</h3>
            <p className="text-xs text-slate-500">Medication charts and dosage instructions.</p>
          </div>
          <span className="text-xs font-semibold text-slate-400">{prescriptions.length} issued</span>
        </div>

        {prescriptions.length === 0 ? (
          <EmptyState
            title="No prescriptions issued"
            description="Use 'Issue Prescription' to construct a medication regimen."
            icon="💊"
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {prescriptions.map((presc) => (
              <div key={presc._id} className="py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-700">
                    RX #{presc._id.slice(-6).toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(presc.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {presc.medicines?.map((med, mIdx) => (
                    <div
                      key={mIdx}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1"
                    >
                      <p className="font-bold text-slate-900">{med.medicineName}</p>
                      <p className="text-slate-600">
                        {med.dosage} • {med.frequency}
                      </p>
                      <p className="text-[11px] text-slate-400">Duration: {med.duration}</p>
                      {med.instructions && (
                        <p className="text-[11px] italic text-slate-500">{med.instructions}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-right">
                  <Link
                    to={`/doctor/prescriptions/${presc._id}`}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    View Prescription Sheet →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Diagnostic Documents Vault */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Diagnostic Scans & Lab Reports</h3>
            <p className="text-xs text-slate-500">Authorized medical scans in document vault.</p>
          </div>
          <Link
            to={`/doctor/documents?patientId=${targetUserId}`}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            Upload / View Vault →
          </Link>
        </div>

        {documents.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No diagnostic documents uploaded for this patient.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {documents.map((doc) => (
              <div
                key={doc._id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900 truncate max-w-xs">{doc.originalFileName}</p>
                  <p className="text-slate-400 uppercase text-[10px] mt-0.5">
                    {doc.documentType} • {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  {doc.ocrStatus}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorPatientDetail;
