import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';

export const MedicalRecordDetail = () => {
  const { recordId } = useParams();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/medical-records/${recordId}`);
        if (res.data?.success && res.data?.data) {
          setRecord(res.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to retrieve clinical record.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [recordId]);

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner text="Loading clinical record details..." />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="space-y-4">
        <Link to="/doctor/dashboard" className="text-xs font-semibold text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>
        <ErrorAlert message={error || 'Clinical medical record not found.'} />
      </div>
    );
  }

  const patientId = record.patientId?._id || record.patientId;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to={`/doctor/patients/${patientId}`}
            className="text-xs font-semibold text-slate-500 hover:text-blue-600 mb-1 inline-block"
          >
            ← Back to Patient Clinical File
          </Link>
          <PageTitle
            title="Clinical Medical Record"
            subtitle={`Record #${record._id.slice(-6).toUpperCase()} | Documented on ${new Date(
              record.createdAt
            ).toLocaleDateString()}`}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs text-slate-600">
          <div>
            <span className="font-bold uppercase text-[10px] text-slate-400 block">Patient</span>
            <span className="font-bold text-slate-900 text-sm">{record.patientId?.name || 'Patient'}</span>
            <span className="block text-slate-500">{record.patientId?.email}</span>
          </div>
          <div>
            <span className="font-bold uppercase text-[10px] text-slate-400 block">Attending Physician</span>
            <span className="font-bold text-slate-900 text-sm">Dr. {record.doctorId?.name || 'Doctor'}</span>
            <span className="block text-slate-500">{record.doctorId?.specialization}</span>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            Clinical Diagnosis
          </h4>
          <p className="text-base font-bold text-slate-900">{record.diagnosis}</p>
        </div>

        {record.symptoms?.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Presenting Symptoms
            </h4>
            <div className="flex flex-wrap gap-2">
              {record.symptoms.map((s, idx) => (
                <span
                  key={idx}
                  className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            Treatment Plan & Notes
          </h4>
          <p className="text-sm text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-wrap">
            {record.treatmentNotes}
          </p>
        </div>

        {record.followUpDate && (
          <div className="flex items-center gap-2 rounded-xl bg-blue-50/70 p-3 text-xs font-semibold text-blue-800 border border-blue-200">
            <span>📅</span> Recommended Follow-Up: {record.followUpDate}
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalRecordDetail;
