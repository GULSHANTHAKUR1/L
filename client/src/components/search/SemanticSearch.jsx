import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Reusable Semantic Search Component (Prompt 17)
 *
 * Features:
 * - Natural language input with debounce (400ms) and explicit Search button
 * - Role-appropriate filters (Admin: all patients + date range; Doctor: authorized linked patients; Patient: strictly self)
 * - Minimum 3-character validation with real-time feedback
 * - Safe result cards with source badges, formatted dates, snippets, and authorized deep links
 * - Clinical non-diagnostic disclaimer
 * - Loading skeletons, empty state, and error handling with retry
 * - URL search params synchronization for seamless sharing
 * - Development-only similarity score toggle
 */
export const SemanticSearch = ({ preselectedPatientId = null }) => {
  const { user, role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial query params from URL
  const initialQuery = searchParams.get('q') || '';
  const initialPatientId = preselectedPatientId || searchParams.get('patientId') || '';
  const initialSourceType = searchParams.get('sourceType') || '';
  const initialDocumentType = searchParams.get('documentType') || '';

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [patientId, setPatientId] = useState(initialPatientId);
  const [sourceType, setSourceType] = useState(initialSourceType);
  const [documentType, setDocumentType] = useState(initialDocumentType);
  const [page, setPage] = useState(1);

  // Patient selector options for Doctor / Admin
  const [patientOptions, setPatientOptions] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  // Search Results & States
  const [results, setResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(Boolean(initialQuery.trim().length >= 3));

  // Development score flag
  const isDevMode = import.meta.env.DEV || false;
  const [showDevScore, setShowDevScore] = useState(false);

  // Debounce input change
  const debounceTimerRef = useRef(null);
  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(val);
    }, 450);
  };

  // Fetch authorized patient options for Admin or Doctor
  useEffect(() => {
    if (role === 'patient') return; // Patients never fetch/select other patients

    const fetchPatients = async () => {
      setLoadingPatients(true);
      try {
        if (role === 'admin') {
          const res = await api.get('/patients?limit=100');
          if (res.data?.success && res.data?.data) {
            setPatientOptions(
              res.data.data.map((p) => ({
                id: p._id,
                name: p.name || 'Unnamed Patient',
                email: p.email || '',
              }))
            );
          }
        } else if (role === 'doctor') {
          // Doctor receives only clinically linked patients from appointments
          const res = await api.get('/appointments?limit=100');
          if (res.data?.success && res.data?.data) {
            const patientMap = new Map();
            res.data.data.forEach((apt) => {
              if (apt.patientId && apt.patientId._id) {
                patientMap.set(apt.patientId._id, {
                  id: apt.patientId._id,
                  name: apt.patientId.name || 'Assigned Patient',
                  email: apt.patientId.email || '',
                });
              }
            });
            setPatientOptions(Array.from(patientMap.values()));
          }
        }
      } catch (err) {
        console.warn('Could not load patient filter list:', err.message);
      } finally {
        setLoadingPatients(false);
      }
    };

    fetchPatients();
  }, [role]);

  // Execute Semantic Search
  const executeSearch = useCallback(
    async (searchQuery, targetPage = 1) => {
      const trimmed = searchQuery.trim();
      if (trimmed.length < 3) {
        if (trimmed.length === 0) {
          setResults([]);
          setHasSearched(false);
          setError(null);
        }
        return;
      }

      setLoading(true);
      setError(null);
      setHasSearched(true);

      // Synchronize URL parameters safely
      const params = new URLSearchParams();
      params.set('q', trimmed);
      if (patientId && role !== 'patient') params.set('patientId', patientId);
      if (sourceType) params.set('sourceType', sourceType);
      if (documentType) params.set('documentType', documentType);
      if (targetPage > 1) params.set('page', targetPage);
      setSearchParams(params, { replace: true });

      try {
        const queryParams = {
          q: trimmed,
          page: targetPage,
          limit: 10,
        };

        if (patientId && role !== 'patient') {
          queryParams.patientId = patientId;
        }
        if (sourceType) queryParams.sourceType = sourceType;
        if (documentType) queryParams.documentType = documentType;

        const res = await api.get('/search/semantic', { params: queryParams });

        if (res.data?.success) {
          setResults(res.data.results || []);
          setTotalResults(res.data.totalResults || 0);
          setTotalPages(res.data.totalPages || 1);
          setPage(targetPage);
        } else {
          setError(res.data?.message || 'Search request failed.');
        }
      } catch (err) {
        const errMsg =
          err.message ||
          err.response?.data?.message ||
          'Failed to connect to search service. Please check your network or try again.';
        setError(errMsg);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [patientId, sourceType, documentType, role, setSearchParams]
  );

  // Trigger search on debounced query or filter change
  useEffect(() => {
    if (debouncedQuery.trim().length >= 3) {
      executeSearch(debouncedQuery, 1);
    }
  }, [debouncedQuery, patientId, sourceType, documentType, executeSearch]);

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (query.trim().length >= 3) {
      setDebouncedQuery(query);
      executeSearch(query, 1);
    }
  };

  const handleClear = () => {
    setQuery('');
    setDebouncedQuery('');
    setPatientId('');
    setSourceType('');
    setDocumentType('');
    setResults([]);
    setHasSearched(false);
    setError(null);
    setSearchParams({}, { replace: true });
  };

  // Safe route resolution based on user role and source item
  const getDetailRoute = (item) => {
    const sType = item.sourceType;
    const sId = item.sourceId;
    const pId = item.patientId || user?._id;

    if (role === 'patient') {
      if (sType === 'medical_record') return '/patient/medical-records';
      if (sType === 'prescription') return '/patient/prescriptions';
      if (sType === 'medical_document') return '/patient/documents';
      return '/patient/dashboard';
    }

    if (role === 'doctor') {
      if (sType === 'medical_record') return `/doctor/medical-records/${sId}`;
      if (sType === 'prescription') return `/doctor/prescriptions/${sId}`;
      if (sType === 'medical_document') return '/doctor/documents';
      return `/doctor/patients/${pId}`;
    }

    if (role === 'admin') {
      if (sType === 'medical_document') return '/admin/documents';
      return `/admin/patients/${pId}`;
    }

    return '#';
  };

  const getTimelineRoute = (item) => {
    const pId = item.patientId || user?._id;
    if (role === 'patient') return '/patient/timeline';
    if (role === 'doctor') return `/doctor/patients/${pId}/timeline`;
    if (role === 'admin') return `/admin/patients/${pId}/timeline`;
    return '#';
  };

  const getSourceBadge = (sourceType) => {
    switch (sourceType) {
      case 'medical_record':
        return {
          label: 'Medical Record (EHR)',
          bg: 'bg-indigo-50',
          text: 'text-indigo-700',
          border: 'border-indigo-200',
          icon: '📋',
        };
      case 'prescription':
        return {
          label: 'Prescription',
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          icon: '💊',
        };
      case 'medical_document':
      default:
        return {
          label: 'Diagnostic Document / Scan',
          bg: 'bg-purple-50',
          text: 'text-purple-700',
          border: 'border-purple-200',
          icon: '📄',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Mandatory Non-Diagnostic Clinical Safety Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-200/90 bg-gradient-to-r from-sky-50/90 via-blue-50/80 to-indigo-50/90 p-4 shadow-sm backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
            <span className="text-lg">🛡️</span>
          </div>
          <div className="text-xs leading-relaxed text-slate-700">
            <h4 className="font-bold text-slate-900">Clinical Safety & Information Notice</h4>
            <p className="mt-0.5 text-slate-600">
              Semantic search helps organize and retrieve authorized health records. It does not diagnose a
              condition, recommend treatment, or replace consultation with a qualified doctor.
            </p>
          </div>
        </div>
      </div>

      {/* Natural Language Query Bar & Filter Panel */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
        <form onSubmit={handleManualSearch} className="space-y-4">
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-4 text-slate-400 text-lg">🔍</span>
            <input
              type="text"
              value={query}
              onChange={handleQueryChange}
              placeholder={
                role === 'patient'
                  ? 'Search your medical records (e.g., "blood sugar checkup", "hypertension tablet", "chest X-ray")...'
                  : 'Search authorized clinical records by symptoms, diagnosis, medicine, or diagnostic scan...'
              }
              className="w-full rounded-xl border border-slate-300/90 bg-slate-50/50 py-3.5 pl-12 pr-28 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition"
            />

            <div className="absolute right-2 flex items-center gap-1.5">
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-lg p-2 text-xs font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                  title="Clear input"
                >
                  ✕
                </button>
              )}
              <button
                type="submit"
                disabled={loading || query.trim().length < 3}
                className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-sky-700 disabled:opacity-40 transition flex items-center gap-1.5"
              >
                {loading ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Search'
                )}
              </button>
            </div>
          </div>

          {/* Validation Feedback */}
          {query.trim().length > 0 && query.trim().length < 3 && (
            <p className="text-xs text-amber-600 flex items-center gap-1 font-medium pl-1">
              <span>⚠️</span> Please enter at least 3 characters to start semantic matching.
            </p>
          )}

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
            {/* Patient Selector (Admin & Doctor only, NEVER Patient) */}
            {role !== 'patient' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  {role === 'doctor' ? 'Authorized Patient' : 'Patient Filter'}
                </label>
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none"
                  disabled={Boolean(preselectedPatientId)}
                >
                  <option value="">{role === 'doctor' ? 'All Assigned Patients' : 'All Hospital Patients'}</option>
                  {patientOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.email ? `(${p.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Source Type Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Record Category
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none"
              >
                <option value="">All Categories</option>
                <option value="medical_document">Diagnostic Scans & Documents</option>
                <option value="medical_record">Clinical Records (EHR)</option>
                <option value="prescription">Doctor Prescriptions</option>
              </select>
            </div>

            {/* Document Type Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Document Specifics
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none"
              >
                <option value="">All Document Types</option>
                <option value="lab-report">Laboratory Report</option>
                <option value="prescription">Prescription Slip</option>
                <option value="discharge-summary">Discharge Summary</option>
                <option value="xray">X-Ray Scan</option>
                <option value="mri">MRI Scan</option>
                <option value="medical-record">Medical Record</option>
                <option value="scan">Other Diagnostic Scan</option>
                <option value="other">General Medical File</option>
              </select>
            </div>

            {/* Development Mode Toggle (Similarity score viewer) */}
            {isDevMode && (
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-500 hover:text-slate-800 select-none">
                  <input
                    type="checkbox"
                    checked={showDevScore}
                    onChange={(e) => setShowDevScore(e.target.checked)}
                    className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span>Dev: Show Similarity Scores</span>
                </label>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Search State Display: Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-44 rounded bg-slate-200 animate-pulse" />
            <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
          </div>
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-32 rounded-full bg-slate-200" />
                <div className="h-4 w-20 rounded bg-slate-200" />
              </div>
              <div className="h-6 w-3/4 rounded bg-slate-200" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-slate-100" />
                <div className="h-4 w-5/6 rounded bg-slate-100" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <div className="h-8 w-28 rounded-lg bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search State Display: Error with Retry */}
      {!loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-6 text-center space-y-3">
          <div className="text-3xl">⚠️</div>
          <h3 className="font-bold text-slate-900 text-sm">Unable to Complete Search</h3>
          <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
          <button
            onClick={() => executeSearch(debouncedQuery, page)}
            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-rose-700 transition"
          >
            Retry Query
          </button>
        </div>
      )}

      {/* Search State Display: Empty Results */}
      {!loading && !error && hasSearched && results.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-2xl text-sky-600">
            🔍
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">No Matching Health Records Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              No authorized clinical documents, EHR records, or prescriptions match "{query}".
            </p>
          </div>
          <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl max-w-sm mx-auto border border-slate-100">
            💡 <span className="font-semibold text-slate-600">Tip:</span> Try natural symptom phrases like{' '}
            <em>"cough and mild fever"</em>, <em>"hypertension medication"</em>, or <em>"discharge advice"</em>.
          </div>
        </div>
      )}

      {/* Search State Display: Verified Matching Result Cards */}
      {!loading && !error && results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-800">
              Matching Authorized Records ({totalResults})
            </h3>
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
          </div>

          <div className="space-y-3.5">
            {results.map((item, idx) => {
              const badge = getSourceBadge(item.sourceType);
              const detailRoute = getDetailRoute(item);
              const timelineRoute = getTimelineRoute(item);

              return (
                <div
                  key={`${item.sourceId}_${idx}`}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition space-y-3.5"
                >
                  {/* Card Header: Source Badge & Created Date */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        <span>{badge.icon}</span>
                        <span>{badge.label}</span>
                      </span>

                      {item.documentType && (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                          {item.documentType}
                        </span>
                      )}

                      {showDevScore && (
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-700 border border-amber-200">
                          Score: {(item.relevanceScore * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>

                    {item.createdAt && (
                      <span className="text-xs font-medium text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                  </div>

                  {/* Card Title */}
                  <div>
                    <h4 className="text-base font-bold text-slate-900 tracking-tight">{item.title}</h4>
                  </div>

                  {/* Snippet Card */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs text-slate-700 leading-relaxed font-sans">
                    <p className="line-clamp-3">"{item.snippet}"</p>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <Link
                      to={timelineRoute}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-sky-600 transition"
                    >
                      <span>⏱️</span>
                      <span>View Patient Timeline</span>
                    </Link>

                    <div className="flex items-center gap-2">
                      <Link
                        to={detailRoute}
                        className="inline-flex items-center gap-1 rounded-xl bg-sky-50 px-3.5 py-2 text-xs font-bold text-sky-700 border border-sky-200/80 hover:bg-sky-100 hover:border-sky-300 transition"
                      >
                        <span>View Details</span>
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                disabled={page <= 1}
                onClick={() => executeSearch(debouncedQuery, page - 1)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                ← Previous
              </button>
              <span className="text-xs text-slate-500 font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => executeSearch(debouncedQuery, page + 1)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SemanticSearch;
