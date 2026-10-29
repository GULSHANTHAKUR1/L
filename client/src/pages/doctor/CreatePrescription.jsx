import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export const CreatePrescription = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const queryPatientId = searchParams.get('patientId') || '';
  const queryAppointmentId = searchParams.get('appointmentId') || '';

  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(true);

  const [formData, setFormData] = useState({
    patientId: queryPatientId,
    appointmentId: queryAppointmentId,
    additionalInstructions: '',
  });

  const [medicines, setMedicines] = useState([
    {
      medicineName: '',
      dosage: '500mg',
      frequency: '1-0-1 (Twice daily)',
      duration: '5 days',
      instructions: 'Take after meals with water',
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoadingAppts(true);
        const res = await api.get('/appointments?limit=50');
        if (res.data?.success && res.data?.data) {
          setAppointments(res.data.data);
          if (!queryAppointmentId && res.data.data.length > 0) {
            const first = res.data.data[0];
            setFormData((prev) => ({
              ...prev,
              appointmentId: first._id,
              patientId: first.patientId?._id || first.patientId,
            }));
          }
        }
      } catch (err) {
        // Continue
      } finally {
        setLoadingAppts(false);
      }
    };

    fetchAppointments();
  }, [queryAppointmentId]);

  const handleAppointmentChange = (e) => {
    const apptId = e.target.value;
    const selected = appointments.find((a) => a._id === apptId);
    setFormData((prev) => ({
      ...prev,
      appointmentId: apptId,
      patientId: selected ? selected.patientId?._id || selected.patientId : prev.patientId,
    }));
  };

  const handleAddMedicineRow = () => {
    setMedicines([
      ...medicines,
      {
        medicineName: '',
        dosage: '1 tablet',
        frequency: '1-0-1',
        duration: '7 days',
        instructions: 'After meals',
      },
    ]);
  };

  const handleRemoveMedicineRow = (index) => {
    if (medicines.length === 1) {
      showToast('Prescription must contain at least one medicine.', 'warning');
      return;
    }
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleMedicineChange = (index, field, value) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.appointmentId || !formData.patientId) {
      setError('Please select an active consultation session.');
      return;
    }

    // Client-side validation for all medicine rows
    for (let i = 0; i < medicines.length; i++) {
      const med = medicines[i];
      if (!med.medicineName.trim()) {
        setError(`Medicine #${i + 1}: Name is required.`);
        return;
      }
      if (!med.dosage.trim()) {
        setError(`Medicine #${i + 1}: Dosage is required (e.g. 500mg).`);
        return;
      }
      if (!med.frequency.trim()) {
        setError(`Medicine #${i + 1}: Frequency is required (e.g. 1-0-1).`);
        return;
      }
      if (!med.duration.trim()) {
        setError(`Medicine #${i + 1}: Duration is required (e.g. 5 days).`);
        return;
      }
    }

    try {
      setSaving(true);
      const payload = {
        patientId: formData.patientId,
        appointmentId: formData.appointmentId,
        medicines,
        additionalInstructions: formData.additionalInstructions.trim(),
      };

      const res = await api.post('/prescriptions', payload);
      if (res.data?.success) {
        showToast('Prescription issued successfully!', 'success');
        navigate(`/doctor/patients/${formData.patientId}`);
      }
    } catch (err) {
      setError(
        err.response?.data?.errors?.join(', ') ||
          err.response?.data?.message ||
          'Failed to issue prescription.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle
          title="Prescription Builder"
          subtitle="Formulate structured medication charts with automated dosage and duration validation."
        />
        <Link
          to="/doctor/dashboard"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
        >
          ← Dashboard
        </Link>
      </div>

      {error && <ErrorAlert message={error} />}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm space-y-6"
      >
        {/* Linked Consultation Appointment */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Select Consultation Session <span className="text-rose-500">*</span>
          </label>
          <select
            value={formData.appointmentId}
            onChange={handleAppointmentChange}
            required
            disabled={loadingAppts}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {appointments.length === 0 ? (
              <option value="">No active consultations found</option>
            ) : (
              appointments.map((appt) => (
                <option key={appt._id} value={appt._id}>
                  {appt.appointmentDate} ({appt.startTime}) - Patient: {appt.patientId?.name || 'Patient'}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Dynamic Medicines Row Builder */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Medication Items ({medicines.length})</h3>
              <p className="text-xs text-slate-500">Add medicines, dosage, and duration instructions.</p>
            </div>
            <button
              type="button"
              onClick={handleAddMedicineRow}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
            >
              ➕ Add Medicine
            </button>
          </div>

          <div className="space-y-4">
            {medicines.map((med, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 relative space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-blue-700">
                    Medicine #{index + 1}
                  </span>
                  {medicines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMedicineRow(index)}
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Medicine Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Amoxicillin"
                      value={med.medicineName}
                      onChange={(e) => handleMedicineChange(index, 'medicineName', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Dosage <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 500mg"
                      value={med.dosage}
                      onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Frequency <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1-0-1 (Twice daily)"
                      value={med.frequency}
                      onChange={(e) => handleMedicineChange(index, 'frequency', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Duration <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 5 days"
                      value={med.duration}
                      onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Specific Patient Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Take immediately after meals with warm water. Do not skip doses."
                    value={med.instructions}
                    onChange={(e) => handleMedicineChange(index, 'instructions', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Instructions */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            General Clinical & Dietary Advice
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Maintain low salt diet, stay well hydrated, avoid vigorous physical exertion for 48 hours."
            value={formData.additionalInstructions}
            onChange={(e) => setFormData({ ...formData, additionalInstructions: e.target.value })}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            to="/doctor/dashboard"
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {saving && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            Sign & Issue Prescription
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePrescription;
