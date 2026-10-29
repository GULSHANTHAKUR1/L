import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';

export const DoctorProfileView = () => {
  const { doctorId } = useParams();

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/doctors/${doctorId}`);
        if (res.data?.success && res.data?.data) {
          setDoctor(res.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to retrieve physician credentials.');
      } finally {
        setLoading(false);
      }
    };

    fetchDoctor();
  }, [doctorId]);

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner text="Loading physician profile & availability slots..." />
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="space-y-4">
        <Link to="/patient/doctors" className="text-xs font-semibold text-blue-600 hover:underline">
          ← Back to Specialist Directory
        </Link>
        <ErrorAlert message={error || 'Physician profile not found.'} />
      </div>
    );
  }

  const docUserId = doctor.userId?._id || doctor.userId;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/patient/doctors"
        className="text-xs font-semibold text-slate-500 hover:text-blue-600 inline-block mb-1"
      >
        ← Back to Specialist Directory
      </Link>

      {/* Main Profile Header Card */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="rounded-md bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
              {doctor.specialization}
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              ● Active Staff
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Dr. {doctor.userId?.name || 'Physician'}
          </h2>
          <p className="text-xs text-slate-500">
            {doctor.experienceYears} Years Clinical Experience • {doctor.userId?.email}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="text-left sm:text-right">
            <span className="text-2xl font-extrabold text-slate-900">${doctor.consultationFee}</span>
            <span className="text-xs text-slate-400 block">Consultation Rate</span>
          </div>
          <Link
            to={`/patient/book-appointment/${docUserId}`}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition"
          >
            📅 Book Consultation Now
          </Link>
        </div>
      </div>

      {/* Clinical Biography */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Physician Biography & Qualifications
        </h3>
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
          {doctor.bio || 'Compassionate care physician committed to evidence-based healthcare delivery.'}
        </p>
      </div>

      {/* Weekly Availability Windows */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Weekly Consultation Shifts</h3>
            <p className="text-xs text-slate-500">
              Scheduled clinical hours during which conflict-free appointments can be booked.
            </p>
          </div>
          <span className="text-xs font-semibold text-blue-600">
            {doctor.availabilitySlots?.length || 0} Shift Windows
          </span>
        </div>

        {doctor.availabilitySlots?.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            No active shift windows registered for this physician.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {doctor.availabilitySlots?.map((slot, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{slot.dayOfWeek}</span>
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                    {slot.slotDurationMinutes || 30} min
                  </span>
                </div>
                <p className="text-slate-600 font-medium">
                  {slot.startTime} - {slot.endTime}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 text-center">
          <Link
            to={`/patient/book-appointment/${docUserId}`}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow hover:bg-blue-700 transition"
          >
            <span>📅</span> Select a Slot & Book Appointment
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfileView;
