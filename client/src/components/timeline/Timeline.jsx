import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Reusable Patient Timeline Component (Prompt 17)
 *
 * Renders reverse-chronological event timeline items across:
 * - Appointments
 * - Medical Records (EHR)
 * - Prescriptions
 * - Diagnostic Documents & Scans
 */
export const Timeline = ({
  timeline = [],
  loading = false,
  error = null,
  onRetry = null,
  patient = null,
}) => {
  const { role } = useAuth();
  const [filterType, setFilterType] = useState('all');

  const filterButtons = [
    { key: 'all', label: 'All Events', count: timeline.length },
    {
      key: 'medical_record',
      label: 'EHR Records',
      count: timeline.filter((t) => t.type === 'medical_record').length,
    },
    {
      key: 'prescription',
      label: 'Prescriptions',
      count: timeline.filter((t) => t.type === 'prescription').length,
    },
    {
      key: 'appointment',
      label: 'Appointments',
      count: timeline.filter((t) => t.type === 'appointment').length,
    },
    {
      key: 'document',
      label: 'Diagnostics & Scans',
      count: timeline.filter((t) => t.type === 'document').length,
    },
  ];

  const filteredItems = filterType === 'all'
    ? timeline
    : timeline.filter((item) => item.type === filterType);

  const getEventConfig = (type) => {
    switch (type) {
      case 'medical_record':
        return {
          icon: '📋',
          bg: 'bg-indigo-50',
          text: 'text-indigo-700',
          border: 'border-indigo-200',
          nodeBg: 'bg-indigo-600',
          line: 'border-indigo-200',
        };
      case 'prescription':
        return {
          icon: '💊',
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          nodeBg: 'bg-emerald-600',
          line: 'border-emerald-200',
        };
      case 'appointment':
        return {
          icon: '📅',
          bg: 'bg-sky-50',
          text: 'text-sky-700',
          border: 'border-sky-200',
          nodeBg: 'bg-sky-600',
          line: 'border-sky-200',
        };
      case 'document':
        return {
          icon: '📄',
          bg: 'bg-purple-50',
          text: 'text-purple-700',
          border: 'border-purple-200',
          nodeBg: 'bg-purple-600',
          line: 'border-purple-200',
        };
      default:
        return {
          icon: '📌',
          bg: 'bg-slate-50',
          text: 'text-slate-700',
          border: 'border-slate-200',
          nodeBg: 'bg-slate-600',
          line: 'border-slate-200',
        };
    }
  };

  const getDetailLink = (item) => {
    const sId = item.id;
    const pId = patient?.id;

    if (role === 'patient') {
      if (item.type === 'medical_record') return '/patient/medical-records';
      if (item.type === 'prescription') return '/patient/prescriptions';
      if (item.type === 'appointment') return `/patient/appointments/${sId}`;
      if (item.type === 'document') return '/patient/documents';
    }

    if (role === 'doctor') {
      if (item.type === 'medical_record') return `/doctor/medical-records/${sId}`;
      if (item.type === 'prescription') return `/doctor/prescriptions/${sId}`;
      if (item.type === 'appointment') return `/doctor/appointments/${sId}`;
      if (item.type === 'document') return '/doctor/documents';
      if (pId) return `/doctor/patients/${pId}`;
    }

    if (role === 'admin') {
      if (item.type === 'document') return '/admin/documents';
      if (pId) return `/admin/patients/${pId}`;
    }

    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 w-24 rounded-xl bg-slate-200 animate-pulse flex-shrink-0" />
          ))}
        </div>
        <div className="space-y-6 pl-4 border-l-2 border-slate-200">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 animate-pulse">
              <div className="flex justify-between">
                <div className="h-4 w-28 bg-slate-200 rounded" />
                <div className="h-4 w-20 bg-slate-200 rounded" />
              </div>
              <div className="h-5 w-1/2 bg-slate-200 rounded" />
              <div className="h-4 w-3/4 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-8 text-center space-y-3">
        <div className="text-3xl">⚠️</div>
        <h3 className="font-bold text-slate-900 text-sm">Failed to Load Patient Timeline</h3>
        <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-rose-700 transition"
          >
            Retry Loading
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilterType(btn.key)}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition flex-shrink-0 shadow-sm ${
              filterType === btn.key
                ? 'bg-sky-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span>{btn.label}</span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                filterType === btn.key ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {btn.count}
            </span>
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
            ⏱️
          </div>
          <h3 className="font-bold text-slate-800 text-base">No Timeline Events Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filterType === 'all'
              ? 'No clinical records, appointments, or prescriptions have been recorded yet.'
              : `No events match the "${filterButtons.find((f) => f.key === filterType)?.label}" filter.`}
          </p>
        </div>
      ) : (
        /* Vertical Responsive Timeline */
        <div className="relative pl-6 sm:pl-8 before:absolute before:bottom-0 before:top-3 before:left-3 sm:before:left-4 before:w-0.5 before:bg-slate-200">
          <div className="space-y-6">
            {filteredItems.map((item) => {
              const config = getEventConfig(item.type);
              const detailLink = getDetailLink(item);

              return (
                <div key={`${item.type}_${item.id}`} className="relative group">
                  {/* Timeline Node Marker */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-1.5 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-white shadow-sm ring-4 ring-white ${config.nodeBg}`}
                  >
                    <span className="text-xs sm:text-sm">{config.icon}</span>
                  </div>

                  {/* Timeline Event Card */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition space-y-3">
                    {/* Header: Date, Time & Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-bold border ${config.bg} ${config.text} ${config.border}`}
                        >
                          <span>{config.icon}</span>
                          <span>{item.badge}</span>
                        </span>

                        {item.status && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                            {item.status}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                        <span>
                          {new Date(item.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        {item.time && <span>• {item.time}</span>}
                      </div>
                    </div>

                    {/* Event Title */}
                    <div>
                      <h4 className="text-base font-bold text-slate-900 tracking-tight">{item.title}</h4>
                      {item.summary && (
                        <p className="mt-1 text-xs text-slate-600 leading-relaxed font-sans">
                          {item.summary}
                        </p>
                      )}
                    </div>

                    {/* Metadata Summary Chips */}
                    {item.metadata && Object.keys(item.metadata).length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                        {item.metadata.doctorName && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 border border-slate-200/60">
                            👨‍⚕️ {item.metadata.doctorName}
                          </span>
                        )}
                        {item.metadata.specialization && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 border border-slate-200/60">
                            🩺 {item.metadata.specialization}
                          </span>
                        )}
                        {item.metadata.slot && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 border border-slate-200/60">
                            ⏰ {item.metadata.slot}
                          </span>
                        )}
                        {item.metadata.documentType && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 border border-slate-200/60">
                            📁 {item.metadata.documentType}
                          </span>
                        )}
                        {item.metadata.totalAmount !== undefined && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800 border border-amber-200/70">
                            ₹{item.metadata.totalAmount}
                          </span>
                        )}
                        {item.metadata.medicinesCount !== undefined && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800 border border-emerald-200/70">
                            💊 {item.metadata.medicinesCount} Medicines
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Link */}
                    {detailLink && (
                      <div className="flex justify-end pt-1">
                        <Link
                          to={detailLink}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-800 transition"
                        >
                          <span>Open Record</span>
                          <span>→</span>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Timeline;
