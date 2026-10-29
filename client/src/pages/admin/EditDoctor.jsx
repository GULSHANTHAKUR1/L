import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export const EditDoctor = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [doctorInfo, setDoctorInfo] = useState(null);
  const [formData, setFormData] = useState({
    specialization: '',
    experienceYears: 0,
    consultationFee: 0,
    bio: '',
    isAvailable: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/doctors/${doctorId}`);
        if (res.data?.success && res.data?.data) {
          const doc = res.data.data;
          setDoctorInfo(doc);
          setFormData({
            specialization: doc.specialization || 'General Medicine',
            experienceYears: doc.experienceYears || 0,
            consultationFee: doc.consultationFee || 0,
            bio: doc.bio || '',
            isAvailable: doc.isAvailable !== undefined ? doc.isAvailable : true,
          });
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load physician profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchDoctor();
  }, [doctorId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : name === 'experienceYears' || name === 'consultationFee'
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await api.patch(`/doctors/${doctorId}`, formData);
      if (res.data?.success) {
        showToast('Physician profile updated successfully!', 'success');
        navigate('/admin/doctors');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update doctor profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner text="Loading physician credentials and record..." />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle
          title={`Edit Profile: Dr. ${doctorInfo?.userId?.name || 'Physician'}`}
          subtitle="Update departmental assignment, consultation rates, and bio."
        />
        <Link
          to="/admin/doctors"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
        >
          ← Back to Directory
        </Link>
      </div>

      {error && <ErrorAlert message={error} />}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Read-Only Account Details */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Doctor Account Name
            </label>
            <input
              type="text"
              disabled
              value={doctorInfo?.userId?.name || ''}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Work Email
            </label>
            <input
              type="email"
              disabled
              value={doctorInfo?.userId?.email || ''}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600 cursor-not-allowed"
            />
          </div>

          {/* Specialization */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Specialization
            </label>
            <select
              name="specialization"
              value={formData.specialization}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Cardiology">Cardiology</option>
              <option value="Neurology">Neurology</option>
              <option value="Orthopedics">Orthopedics</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="General Medicine">General Medicine</option>
              <option value="Dermatology">Dermatology</option>
              <option value="Gynecology">Gynecology</option>
              <option value="Oncology">Oncology</option>
              <option value="Pulmonology">Pulmonology</option>
              <option value="Psychiatry">Psychiatry</option>
            </select>
          </div>

          {/* Experience Years */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Years of Experience
            </label>
            <input
              type="number"
              name="experienceYears"
              min={0}
              value={formData.experienceYears}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Consultation Fee */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Consultation Fee ($)
            </label>
            <input
              type="number"
              name="consultationFee"
              min={0}
              value={formData.consultationFee}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Availability Checkbox */}
          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="isAvailable"
              name="isAvailable"
              checked={formData.isAvailable}
              onChange={handleChange}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isAvailable" className="text-sm font-semibold text-slate-700">
              Active & Accepting Appointments
            </label>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Clinical Biography
          </label>
          <textarea
            name="bio"
            rows={3}
            value={formData.bio}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            to="/admin/doctors"
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
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditDoctor;
