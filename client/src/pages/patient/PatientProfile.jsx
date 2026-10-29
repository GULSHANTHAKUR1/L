import React, { useState, useEffect } from 'react';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export const PatientProfile = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    street: '',
    city: '',
    state: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelationship: '',
    medicalHistorySummary: '',
  });

  const [allergyInput, setAllergyInput] = useState('');
  const [allergies, setAllergies] = useState([]);

  const [conditionInput, setConditionInput] = useState('');
  const [chronicConditions, setChronicConditions] = useState([]);

  useEffect(() => {
    const fetchMyProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        // Find own profile
        const res = await api.get('/auth/me');
        if (res.data?.success && res.data?.user) {
          const u = res.data.user;
          const patientId = u._id || u.id;
          // Get patient profile details
          const patRes = await api.get(`/patients/${patientId}`);
          if (patRes.data?.success && patRes.data?.data) {
            const p = patRes.data.data;
            setProfile(p);
            setFormData({
              street: p.address?.street || '',
              city: p.address?.city || '',
              state: p.address?.state || '',
              emergencyName: p.emergencyContact?.name || '',
              emergencyPhone: p.emergencyContact?.phone || '',
              emergencyRelationship: p.emergencyContact?.relationship || '',
              medicalHistorySummary: p.medicalHistorySummary || '',
            });
            setAllergies(p.allergies || []);
            setChronicConditions(p.chronicConditions || []);
          }
        }
      } catch (err) {
        setError('Could not retrieve patient medical profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchMyProfile();
  }, []);

  const handleAddAllergy = (e) => {
    e.preventDefault();
    if (allergyInput.trim() && !allergies.includes(allergyInput.trim())) {
      setAllergies([...allergies, allergyInput.trim()]);
      setAllergyInput('');
    }
  };

  const handleRemoveAllergy = (idx) => {
    setAllergies(allergies.filter((_, i) => i !== idx));
  };

  const handleAddCondition = (e) => {
    e.preventDefault();
    if (conditionInput.trim() && !chronicConditions.includes(conditionInput.trim())) {
      setChronicConditions([...chronicConditions, conditionInput.trim()]);
      setConditionInput('');
    }
  };

  const handleRemoveCondition = (idx) => {
    setChronicConditions(chronicConditions.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const payload = {
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
        },
        emergencyContact: {
          name: formData.emergencyName,
          phone: formData.emergencyPhone,
          relationship: formData.emergencyRelationship,
        },
        allergies,
        chronicConditions,
        medicalHistorySummary: formData.medicalHistorySummary,
      };

      const res = await api.patch('/patients/me', payload);
      if (res.data?.success) {
        showToast('Personal medical profile updated successfully!', 'success');
      }
    } catch (err) {
      setError(
        err.response?.data?.errors?.join(', ') ||
          err.response?.data?.message ||
          'Failed to update profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner text="Retrieving verified personal health profile..." />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageTitle
        title="Personal Health Profile & Contacts"
        subtitle="Maintain emergency contacts, address, and critical allergy alerts visible to your attending physicians."
      />

      {error && <ErrorAlert message={error} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Read-Only Demographics */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Verified Demographics (Hospital Registered)
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Name</span>
              <span className="font-bold text-slate-900">{profile?.userId?.name || 'Patient'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Gender</span>
              <span className="capitalize font-semibold text-slate-800">
                {profile?.gender || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Database Login & Security Activity */}
        <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-blue-100 pb-2">
            <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
              <span>🛡️</span> Database Authentication & Login History
            </h3>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
              Stored in MongoDB
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block font-medium">Database Login Count</span>
              <span className="font-extrabold text-blue-700 text-sm">{user?.loginCount || 1} logins recorded</span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Last Login Timestamp</span>
              <span className="font-semibold text-slate-800">
                {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Active Session'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Registered Account Email</span>
              <span className="font-semibold text-slate-800">{user?.email || 'Current User'}</span>
            </div>
          </div>
          {user?.loginHistory && user.loginHistory.length > 0 && (
            <div className="pt-2 border-t border-blue-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Recent Recorded Logins:
              </span>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {user.loginHistory.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] text-slate-600 bg-white/70 rounded-lg px-2.5 py-1">
                    <span>🕒 {new Date(item.timestamp).toLocaleString()}</span>
                    <span className="text-slate-400 font-mono text-[10px]">IP: {item.ipAddress || '127.0.0.1'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Emergency Contact */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <span>🚨</span> Emergency Contact Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Contact Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.emergencyName}
                onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                placeholder="e.g. Ramesh Sahu"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Emergency Phone <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.emergencyPhone}
                onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Relationship <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.emergencyRelationship}
                onChange={(e) => setFormData({ ...formData, emergencyRelationship: e.target.value })}
                placeholder="e.g. Spouse / Parent"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Residential Address
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Street Address
              </label>
              <input
                type="text"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder="123 Hospital Lane"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                State / Province
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Clinical Allergies & Chronic Conditions */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Medical Alerts & Self-Reported Conditions
          </h3>

          {/* Allergies */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Allergies (Medicines, Foods, Latex)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={allergyInput}
                onChange={(e) => setAllergyInput(e.target.value)}
                placeholder="Type allergy (e.g. Penicillin) and press Add"
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAllergy(e);
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddAllergy}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 transition"
              >
                Add Tag
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[28px]">
              {allergies.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200"
                >
                  ⚠️ {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveAllergy(i)}
                    className="hover:text-rose-900"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Chronic Conditions */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Chronic Conditions (e.g. Asthma, Diabetes Type 2)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={conditionInput}
                onChange={(e) => setConditionInput(e.target.value)}
                placeholder="Type condition and press Add"
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCondition(e);
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddCondition}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 transition"
              >
                Add Tag
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[28px]">
              {chronicConditions.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveCondition(i)}
                    className="hover:text-amber-900"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Medical History Summary */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Personal Medical History Notes
            </label>
            <textarea
              rows={3}
              value={formData.medicalHistorySummary}
              onChange={(e) => setFormData({ ...formData, medicalHistorySummary: e.target.value })}
              placeholder="Past surgeries, family medical history, or long-term medication context..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {saving && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            Save Profile Updates
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientProfile;
