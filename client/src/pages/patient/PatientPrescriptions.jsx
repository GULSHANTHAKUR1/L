import React, { useState, useEffect } from 'react';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

export const PatientPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/prescriptions?limit=50');
      if (res.data?.success && res.data?.data) {
        setPrescriptions(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retrieve prescription records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageTitle
          title="My Prescriptions & Medication Schedules"
          subtitle={`Active medication courses issued by your attending physicians (${prescriptions.length} records).`}
        />
        {prescriptions.length > 0 && (
          <button
            onClick={() => window.print()}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition self-start sm:self-auto"
          >
            🖨️ Print Prescription History
          </button>
        )}
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchPrescriptions} />}

      {loading ? (
        <div className="py-16">
          <LoadingSpinner text="Retrieving medication charts..." />
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <EmptyState
            title="No prescriptions on record"
            description="Medication orders issued by doctors following consultations will appear here."
            icon="💊"
          />
        </div>
      ) : (
        <div className="space-y-6">
          {prescriptions.map((presc) => (
            <div
              key={presc._id}
              className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <span className="font-mono text-xs font-extrabold text-blue-700">
                    ℞ #{presc._id.slice(-6).toUpperCase()}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    Dr. {presc.doctorId?.name || 'Physician'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {presc.doctorId?.specialization || 'Clinical Doctor'}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-xs text-slate-500 font-semibold block">
                    Issued: {new Date(presc.createdAt).toLocaleDateString([], {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Medicines Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-400 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Medicine</th>
                      <th className="px-4 py-3">Dosage</th>
                      <th className="px-4 py-3">Frequency</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {presc.medicines?.map((med, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-slate-900">{med.medicineName}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{med.dosage}</td>
                        <td className="px-4 py-3">{med.frequency}</td>
                        <td className="px-4 py-3 font-semibold text-blue-700">{med.duration}</td>
                        <td className="px-4 py-3 text-slate-500 italic">
                          {med.instructions || 'As advised'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Instructions */}
              {presc.additionalInstructions && (
                <div className="rounded-xl bg-blue-50/50 p-4 border border-blue-100 text-xs">
                  <span className="font-bold text-blue-900 block mb-0.5">Doctor's Advice:</span>
                  <p className="text-blue-800 leading-relaxed">{presc.additionalInstructions}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientPrescriptions;
