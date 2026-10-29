import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';

export const PrescriptionDetail = () => {
  const { prescriptionId } = useParams();

  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPrescription = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/prescriptions/${prescriptionId}`);
        if (res.data?.success && res.data?.data) {
          setPrescription(res.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to retrieve prescription sheet.');
      } finally {
        setLoading(false);
      }
    };

    fetchPrescription();
  }, [prescriptionId]);

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner text="Retrieving medication prescription sheet..." />
      </div>
    );
  }

  if (error || !prescription) {
    return (
      <div className="space-y-4">
        <Link to="/doctor/dashboard" className="text-xs font-semibold text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>
        <ErrorAlert message={error || 'Prescription not found.'} />
      </div>
    );
  }

  const patientId = prescription.patientId?._id || prescription.patientId;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to={`/doctor/patients/${patientId}`}
            className="text-xs font-semibold text-slate-500 hover:text-blue-600 mb-1 inline-block"
          >
            ← Back to Patient EHR
          </Link>
          <PageTitle
            title="Official Clinical Prescription"
            subtitle={`Rx #${prescription._id.slice(-6).toUpperCase()} | Issued on ${new Date(
              prescription.createdAt
            ).toLocaleDateString()}`}
          />
        </div>

        <button
          onClick={() => window.print()}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
        >
          🖨️ Print Rx
        </button>
      </div>

      {/* Prescription Document Sheet */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-lg space-y-8">
        {/* Hospital & Doctor Letterhead */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6">
          <div>
            <span className="text-xs font-extrabold tracking-widest text-blue-600 uppercase">
              HETEROHMS Hospital
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              Dr. {prescription.doctorId?.name || 'Physician'}
            </h2>
            <p className="text-xs text-slate-500">
              {prescription.doctorId?.specialization || 'Clinical Specialist'}
            </p>
          </div>

          <div className="text-right">
            <span className="text-3xl font-serif font-bold text-blue-600">℞</span>
            <p className="text-xs font-mono text-slate-400 mt-1">
              #{prescription._id.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Patient Demographic Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-2xl bg-slate-50 p-4 text-xs text-slate-700 border border-slate-200/60">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Patient Name</span>
            <span className="font-bold text-slate-900 text-sm">
              {prescription.patientId?.name || 'Patient'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Date of Issue</span>
            <span className="font-semibold text-slate-800">
              {new Date(prescription.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Contact</span>
            <span className="text-slate-600">{prescription.patientId?.email}</span>
          </div>
        </div>

        {/* Medication Table */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Prescribed Medications & Regimen
          </h4>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Medicine</th>
                  <th className="px-4 py-3">Dosage</th>
                  <th className="px-4 py-3">Frequency</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Patient Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prescription.medicines?.map((med, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{med.medicineName}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{med.dosage}</td>
                    <td className="px-4 py-3">{med.frequency}</td>
                    <td className="px-4 py-3 font-semibold text-blue-700">{med.duration}</td>
                    <td className="px-4 py-3 text-slate-500 italic">
                      {med.instructions || 'As directed'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Additional Clinical Advice */}
        {prescription.additionalInstructions && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-1 text-xs">
            <span className="font-bold uppercase text-[10px] text-slate-400 block">
              Additional Clinical Instructions / Advice
            </span>
            <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
              {prescription.additionalInstructions}
            </p>
          </div>
        )}

        {/* Doctor Signature Footnote */}
        <div className="pt-8 border-t border-slate-100 flex items-end justify-between text-xs text-slate-400">
          <div>
            <p>Generated electronically by HETEROHMS Clinical System.</p>
            <p>Verification Hash: {prescription._id}</p>
          </div>
          <div className="text-right">
            <div className="font-serif italic font-bold text-slate-800 text-sm">
              Dr. {prescription.doctorId?.name || 'Physician'}
            </div>
            <p className="border-t border-slate-300 pt-1 mt-1 font-semibold text-slate-600">
              Authorized Signature
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionDetail;
