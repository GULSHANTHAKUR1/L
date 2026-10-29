import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';
import PageTitle from '../../components/common/PageTitle.jsx';
import Timeline from '../../components/timeline/Timeline.jsx';

/**
 * Patient Chronological Medical Timeline Page (Prompt 17)
 *
 * Supported Routes:
 * - /admin/patients/:patientId/timeline
 * - /doctor/patients/:patientId/timeline
 * - /patient/timeline (patient sees their own timeline)
 */
export const PatientTimelinePage = () => {
  const { role, user } = useAuth();
  const { patientId: routePatientId } = useParams();

  // If patient role, strictly view own profile ID
  const targetPatientId = role === 'patient' ? (user?._id || user?.id) : routePatientId;

  const [timelineData, setTimelineData] = useState([]);
  const [patientInfo, setPatientInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTimeline = useCallback(async () => {
    if (!targetPatientId) {
      setError('Patient identifier not found.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.get(`/search/timeline/${targetPatientId}`);
      if (res.data?.success) {
        setTimelineData(res.data.timeline || []);
        setPatientInfo(res.data.patient || null);
      } else {
        setError(res.data?.message || 'Failed to load medical timeline.');
      }
    } catch (err) {
      const errMsg =
        err.message ||
        err.response?.data?.message ||
        'Could not load patient medical timeline. Please verify permissions or try again.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [targetPatientId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const getBackLink = () => {
    if (role === 'patient') return '/patient/dashboard';
    if (role === 'doctor') return targetPatientId ? `/doctor/patients/${targetPatientId}` : '/doctor/patients';
    if (role === 'admin') return targetPatientId ? `/admin/patients/${targetPatientId}` : '/admin/patients';
    return '/';
  };

  const getSearchWithPatientLink = () => {
    if (role === 'patient') return '/patient/search';
    if (role === 'doctor') return `/doctor/search?patientId=${targetPatientId}`;
    if (role === 'admin') return `/admin/search?patientId=${targetPatientId}`;
    return '#';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header and Back Link */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={getBackLink()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <span>←</span>
          <span>{role === 'patient' ? 'Back to Dashboard' : 'Back to Patient Profile'}</span>
        </Link>

        {targetPatientId && (
          <Link
            to={getSearchWithPatientLink()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-sky-50 px-3.5 py-1.5 text-xs font-bold text-sky-700 border border-sky-200/90 hover:bg-sky-100 transition shadow-xs"
          >
            <span>🔍</span>
            <span>Search Patient Records</span>
          </Link>
        )}
      </div>

      <PageTitle
        title={role === 'patient' ? 'My Health Timeline' : 'Patient Medical Timeline'}
        subtitle="Unified reverse-chronological event history across clinical EHR notes, prescriptions, consultations, and diagnostic scans."
      />

      {/* Mandatory Non-Diagnostic Clinical Safety Banner */}
      <div className="rounded-2xl border border-sky-200/90 bg-gradient-to-r from-sky-50/90 via-blue-50/80 to-indigo-50/90 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="text-xl">🛡️</span>
          <div className="text-xs text-slate-700 leading-relaxed">
            <p className="font-bold text-slate-900">Clinical Safety Notice</p>
            <p className="mt-0.5 text-slate-600">
              The medical timeline provides organized historical health record tracking. It does not diagnose
              conditions, recommend treatments, or replace direct consultation with a qualified medical doctor.
            </p>
          </div>
        </div>
      </div>

      {/* Patient Profile Card (When viewing a specific patient) */}
      {patientInfo && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-bold text-lg shadow-sm">
              {patientInfo.name ? patientInfo.name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{patientInfo.name}</h3>
              <p className="text-xs text-slate-500">{patientInfo.email || 'Registered Patient'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Events
              </span>
              <span className="text-sm font-bold text-slate-800">{timelineData.length}</span>
            </div>
            <div className="rounded-xl bg-sky-50 border border-sky-100 px-3 py-2 text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-sky-600">
                Status
              </span>
              <span className="text-sm font-bold text-sky-800">Active Record</span>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Chronological Timeline */}
      <Timeline
        timeline={timelineData}
        loading={loading}
        error={error}
        onRetry={fetchTimeline}
        patient={patientInfo}
      />
    </div>
  );
};

export default PatientTimelinePage;
