import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export const CreateMedicalRecord = () => {
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
    diagnosis: '',
    treatmentNotes: '',
    followUpDate: '',
  });

  const [symptomInput, setSymptomInput] = useState('');
  const [symptomsList, setSymptomsList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAvailableAppointments = async () => {
      try {
        setLoadingAppts(true);
        const res = await api.get('/appointments?limit=50');
        if (res.data?.success && res.data?.data) {
          setAppointments(res.data.data);
          // Auto-select first appointment if not supplied in query
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
        // Silently continue
      } finally {
        setLoadingAppts(false);
      }
    };

    fetchAvailableAppointments();
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

  const handleAddSymptom = (e) => {
    e.preventDefault();
    if (symptomInput.trim() && !symptomsList.includes(symptomInput.trim())) {
      setSymptomsList([...symptomsList, symptomInput.trim()]);
      setSymptomInput('');
    }
  };

  const handleRemoveSymptom = (idx) => {
    setSymptomsList(symptomsList.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.appointmentId || !formData.patientId) {
      setError('Please select an active appointment consultation session.');
      return;
    }

    if (!formData.diagnosis.trim() || !formData.treatmentNotes.trim()) {
      setError('Diagnosis and treatment notes are required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        symptoms: symptomsList,
        followUpDate: formData.followUpDate || undefined,
      };

      const res = await api.post('/medical-records', payload);
      if (res.data?.success) {
        showToast('Clinical medical record documented successfully!', 'success');
        navigate(`/doctor/patients/${formData.patientId}`);
      }
    } catch (err) {
      setError(
        err.response?.data?.errors?.join(', ') ||
          err.response?.data?.message ||
          'Failed to record clinical findings.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle
          title="Document Clinical Medical Record"
          subtitle="Record diagnosis, clinical symptoms, and treatment notes for an assigned consultation."
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
              <option value="">No active consultations available</option>
            ) : (
              appointments.map((appt) => (
                <option key={appt._id} value={appt._id}>
                  {appt.appointmentDate} ({appt.startTime}) - Patient: {appt.patientId?.name || 'Patient'} [Status: {appt.status}]
                </option>
              ))
            )}
          </select>
        </div>

        {/* Diagnosis */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Primary Clinical Diagnosis <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.diagnosis}
            onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
            placeholder="e.g. Essential Hypertension (Stage 2) with mild headache"
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Symptoms Tag Builder */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Presenting Symptoms (Tags)
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={symptomInput}
              onChange={(e) => setSymptomInput(e.target.value)}
              placeholder="Type symptom (e.g. Dizziness, Palpitations) and press Add"
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSymptom(e);
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddSymptom}
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 transition"
            >
              Add Tag
            </button>
          </div>

          <div className="flex flex-wrap gap-2 min-h-[32px]">
            {symptomsList.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveSymptom(i)}
                  className="hover:text-rose-600 text-xs font-bold"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Treatment Notes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Treatment Notes & Plan <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={formData.treatmentNotes}
            onChange={(e) => setFormData({ ...formData, treatmentNotes: e.target.value })}
            placeholder="Clinical evaluation findings, recommended investigations, lifestyle modifications, and medication counseling."
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Follow-up Date */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Recommended Follow-Up Date (Optional)
          </label>
          <input
            type="date"
            value={formData.followUpDate}
            onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
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
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {saving && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            Save Medical Record
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateMedicalRecord;
