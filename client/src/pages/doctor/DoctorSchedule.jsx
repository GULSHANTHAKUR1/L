import React, { useState, useEffect } from 'react';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export const DoctorSchedule = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    const fetchCurrentSchedule = async () => {
      try {
        setLoading(true);
        setError(null);
        // Find current doctor profile
        const res = await api.get('/doctors?limit=50');
        if (res.data?.success && res.data?.doctors) {
          const myProfile = res.data.doctors.find(
            (d) => d.userId?._id === user?._id || d.userId === user?._id
          );
          if (myProfile && myProfile.availabilitySlots) {
            setSlots(myProfile.availabilitySlots);
          } else {
            // Default preset
            setSlots([
              { dayOfWeek: 'Monday', startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
              { dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
              { dayOfWeek: 'Friday', startTime: '14:00', endTime: '18:00', slotDurationMinutes: 30 },
            ]);
          }
        }
      } catch (err) {
        setError('Could not fetch existing schedule slots.');
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentSchedule();
  }, [user]);

  const handleAddSlot = () => {
    setSlots([
      ...slots,
      { dayOfWeek: 'Monday', startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
    ]);
  };

  const handleRemoveSlot = (index) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const handleSlotChange = (index, field, value) => {
    const updated = [...slots];
    updated[index][field] = field === 'slotDurationMinutes' ? Number(value) : value;
    setSlots(updated);
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await api.patch('/doctors/me/availability', {
        availabilitySlots: slots,
      });

      if (res.data?.success) {
        showToast('Weekly consultation availability saved successfully!', 'success');
      }
    } catch (err) {
      setError(
        err.response?.data?.errors?.join(', ') ||
          err.response?.data?.message ||
          'Failed to update weekly schedule.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner text="Retrieving configured availability schedule..." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageTitle
          title="Weekly Availability & Appointment Slots"
          subtitle="Configure weekly consultation windows used by patients for conflict-free atomic booking."
        />
        <button
          type="button"
          onClick={handleAddSlot}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-blue-700 transition self-start sm:self-auto"
        >
          ➕ Add Slot Window
        </button>
      </div>

      {error && <ErrorAlert message={error} />}

      <form onSubmit={handleSaveSchedule} className="space-y-6">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              Active Weekly Schedule ({slots.length} windows)
            </h3>
            <p className="text-xs text-slate-500">
              Patients can only reserve appointments within these confirmed clinical shifts.
            </p>
          </div>

          {slots.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No availability slots configured. Click 'Add Slot Window' to open clinical hours.
            </div>
          ) : (
            <div className="space-y-3">
              {slots.map((slot, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row items-center gap-3 justify-between"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full sm:w-auto flex-1">
                    {/* Day of Week */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Day of Week
                      </label>
                      <select
                        value={slot.dayOfWeek}
                        onChange={(e) => handleSlotChange(index, 'dayOfWeek', e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                      >
                        {daysOfWeek.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Start Time */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Start Time (HH:mm)
                      </label>
                      <input
                        type="time"
                        required
                        value={slot.startTime}
                        onChange={(e) => handleSlotChange(index, 'startTime', e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* End Time */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        End Time (HH:mm)
                      </label>
                      <input
                        type="time"
                        required
                        value={slot.endTime}
                        onChange={(e) => handleSlotChange(index, 'endTime', e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Slot Duration */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Duration (Min)
                      </label>
                      <select
                        value={slot.slotDurationMinutes || 30}
                        onChange={(e) =>
                          handleSlotChange(index, 'slotDurationMinutes', e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                      >
                        <option value={15}>15 Minutes</option>
                        <option value={20}>20 Minutes</option>
                        <option value={30}>30 Minutes</option>
                        <option value={45}>45 Minutes</option>
                        <option value={60}>60 Minutes</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(index)}
                    className="rounded-lg p-2 text-slate-400 hover:text-rose-600 transition text-sm flex-shrink-0 self-end sm:self-center"
                    title="Delete slot window"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              Save Availability Schedule
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default DoctorSchedule;
