import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export const BookAppointment = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [conflictError, setConflictError] = useState(null);

  // Form State
  const [appointmentDate, setAppointmentDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0] // Tomorrow
  );
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reasonForVisit, setReasonForVisit] = useState('');

  // Computed available slots based on doctor's schedule and chosen date
  const [availableSlots, setAvailableSlots] = useState([]);

  useEffect(() => {
    const fetchDoctorProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        // doctorId in route is the user ID of doctor
        const res = await api.get('/doctors?limit=50');
        if (res.data?.success && res.data?.doctors) {
          const matched = res.data.doctors.find(
            (d) => d.userId?._id === doctorId || d.userId === doctorId || d._id === doctorId
          );
          if (matched) {
            setDoctor(matched);
          } else {
            setError('Doctor profile not found.');
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to retrieve doctor availability.');
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorProfile();
  }, [doctorId]);

  // Regenerate slot buttons when date changes
  useEffect(() => {
    if (!doctor || !appointmentDate) return;

    const dateObj = new Date(appointmentDate);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

    // Find doctor's availability for that day
    const daySlots = (doctor.availabilitySlots || []).filter(
      (s) => s.dayOfWeek.toLowerCase() === dayName.toLowerCase()
    );

    const generated = [];

    if (daySlots.length > 0) {
      daySlots.forEach((slotConfig) => {
        const [startH, startM] = slotConfig.startTime.split(':').map(Number);
        const [endH, endM] = slotConfig.endTime.split(':').map(Number);
        const duration = slotConfig.slotDurationMinutes || 30;

        let curMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        while (curMinutes + duration <= endMinutes) {
          const sh = Math.floor(curMinutes / 60).toString().padStart(2, '0');
          const sm = (curMinutes % 60).toString().padStart(2, '0');

          const nextMin = curMinutes + duration;
          const eh = Math.floor(nextMin / 60).toString().padStart(2, '0');
          const em = (nextMin % 60).toString().padStart(2, '0');

          generated.push({
            startTime: `${sh}:${sm}`,
            endTime: `${eh}:${em}`,
            label: `${sh}:${sm} - ${eh}:${em}`,
          });

          curMinutes += duration;
        }
      });
    } else {
      // Default daily clinical slots if doctor has open schedule
      const defaultTimes = [
        { startTime: '09:00', endTime: '09:30', label: '09:00 - 09:30' },
        { startTime: '09:30', endTime: '10:00', label: '09:30 - 10:00' },
        { startTime: '10:00', endTime: '10:30', label: '10:00 - 10:30' },
        { startTime: '11:00', endTime: '11:30', label: '11:00 - 11:30' },
        { startTime: '14:00', endTime: '14:30', label: '14:00 - 14:30' },
        { startTime: '15:00', endTime: '15:30', label: '15:00 - 15:30' },
        { startTime: '16:00', endTime: '16:30', label: '16:00 - 16:30' },
      ];
      generated.push(...defaultTimes);
    }

    setAvailableSlots(generated);
    if (generated.length > 0) {
      setSelectedSlot(generated[0]);
    } else {
      setSelectedSlot(null);
    }
  }, [doctor, appointmentDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // Prevent double submit

    setError(null);
    setConflictError(null);

    if (!selectedSlot) {
      setError('Please select an available consultation slot.');
      return;
    }

    if (!reasonForVisit.trim()) {
      setError('Please provide a reason or chief symptom for your visit.');
      return;
    }

    try {
      setSubmitting(true);
      const targetDocUserId = doctor.userId?._id || doctor.userId || doctorId;

      const payload = {
        doctorId: targetDocUserId,
        appointmentDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        reasonForVisit: reasonForVisit.trim(),
      };

      const res = await api.post('/appointments', payload);
      if (res.data?.success) {
        showToast('Appointment successfully scheduled and conflict-free locked!', 'success');
        navigate('/patient/appointments');
      }
    } catch (err) {
      if (err.response?.status === 409) {
        // Atomic conflict error explicitly displayed
        setConflictError(
          err.response.data?.message ||
            `Slot Conflict: ${selectedSlot.label} on ${appointmentDate} has just been reserved. Please pick another slot.`
        );
      } else {
        setError(
          err.response?.data?.errors?.join(', ') ||
            err.response?.data?.message ||
            'Appointment booking failed.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner text="Checking real-time doctor availability slots..." />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/patient/doctors"
        className="text-xs font-semibold text-slate-500 hover:text-blue-600 inline-block mb-1"
      >
        ← Back to Specialist Directory
      </Link>

      <PageTitle
        title={`Book Appointment: Dr. ${doctor?.userId?.name || 'Physician'}`}
        subtitle={`Specialization: ${doctor?.specialization} | Fee: $${doctor?.consultationFee} | Conflict-free atomic locking guaranteed.`}
      />

      {error && <ErrorAlert message={error} />}

      {/* Explicit Conflict Error Banner */}
      {conflictError && (
        <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-5 shadow-sm space-y-2 animate-shake">
          <div className="flex items-center gap-2 text-rose-800 font-extrabold text-sm">
            <span>⚠️</span> Slot Conflict Detected
          </div>
          <p className="text-xs text-rose-700 leading-relaxed">{conflictError}</p>
          <p className="text-[11px] text-rose-600 font-medium">
            Our atomic database lock prevents double-booking. Please choose a different time slot below.
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm space-y-6"
      >
        {/* Step 1: Select Consultation Date */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            1. Select Date of Consultation <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            required
            min={new Date().toISOString().split('T')[0]}
            value={appointmentDate}
            onChange={(e) => {
              setAppointmentDate(e.target.value);
              setConflictError(null);
            }}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Step 2: Time Slot Picker */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            2. Choose Available Time Slot <span className="text-rose-500">*</span>
          </label>
          {availableSlots.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              No shift slots found for this date. Please select another day.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
              {availableSlots.map((slot, idx) => {
                const isSelected = selectedSlot?.startTime === slot.startTime;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedSlot(slot);
                      setConflictError(null);
                    }}
                    className={`rounded-xl border py-2.5 px-3 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>⏰</span> {slot.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 3: Reason for Visit */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            3. Reason for Visit / Presenting Symptoms <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={reasonForVisit}
            onChange={(e) => setReasonForVisit(e.target.value)}
            placeholder="Briefly describe symptoms, duration, or reason for requesting consultation..."
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Summary Footer */}
        <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-slate-400 block font-medium">Selected Slot</span>
            <span className="font-bold text-slate-900">
              {appointmentDate} ({selectedSlot?.label || 'None selected'})
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting || !selectedSlot}
            className="w-full sm:w-auto rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Atomic Slot Locking...
              </>
            ) : (
              'Confirm & Book Appointment →'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookAppointment;
