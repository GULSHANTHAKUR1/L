import React, { useState, useEffect } from 'react';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

export const PatientMedicalRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      // Backend enforces that patient sees strictly their own records
      const res = await api.get('/medical-records?limit=50');
      if (res.data?.success && res.data?.data) {
        setRecords(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retrieve medical history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const filteredRecords = records.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.diagnosis && r.diagnosis.toLowerCase().includes(q)) ||
      (r.treatmentNotes && r.treatmentNotes.toLowerCase().includes(q)) ||
      (r.doctorId?.name && r.doctorId.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <PageTitle
        title="My Clinical Medical Records"
        subtitle="Electronic health record summaries, diagnoses, and physician clinical evaluations."
      />

      {/* Search Input */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by diagnosis, clinical notes, or doctor name..."
          className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchRecords} />}

      {loading ? (
        <div className="py-16">
          <LoadingSpinner text="Retrieving verified electronic health records..." />
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <EmptyState
            title="No medical records found"
            description="Clinical diagnosis notes from attending doctors will appear in this personal EHR history."
            icon="📋"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((rec) => (
            <div
              key={rec._id}
              className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-md transition space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{rec.diagnosis}</h3>
                  <p className="text-xs text-slate-500">
                    Evaluated by Dr. {rec.doctorId?.name || 'Physician'} ({rec.doctorId?.specialization || 'Clinical Staff'})
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-xs font-semibold text-slate-600 block">
                    {new Date(rec.createdAt).toLocaleDateString([], {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  {rec.followUpDate && (
                    <span className="text-[11px] font-bold text-blue-700">
                      📅 Follow-Up: {rec.followUpDate}
                    </span>
                  )}
                </div>
              </div>

              {rec.symptoms?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {rec.symptoms.map((s, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              <div>
                <span className="text-xs font-bold uppercase text-slate-400 block mb-1">
                  Treatment Notes & Recommendations
                </span>
                <p className="text-sm text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">
                  {rec.treatmentNotes}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientMedicalRecords;
