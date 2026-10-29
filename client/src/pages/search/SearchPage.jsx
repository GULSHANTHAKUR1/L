import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import PageTitle from '../../components/common/PageTitle.jsx';
import SemanticSearch from '../../components/search/SemanticSearch.jsx';

/**
 * Universal Role-Adaptive Semantic Search Page (Prompt 17)
 *
 * Supported Routes:
 * - /admin/search
 * - /doctor/search
 * - /patient/search
 */
export const SearchPage = () => {
  const { role } = useAuth();

  const getPageInfo = () => {
    switch (role) {
      case 'patient':
        return {
          title: 'My Medical Records Search',
          subtitle: 'Search through your clinical consultations, prescriptions, lab reports, and diagnostic scans.',
          queryTips: [
            'blood sugar test report',
            'hypertension medication instructions',
            'chest pain after exercise',
            'discharge advice and follow-up',
          ],
        };
      case 'doctor':
        return {
          title: 'Clinical Semantic Search & EHR Retrieval',
          subtitle: 'Retrieve authorized medical notes, symptoms, and OCR diagnostic reports across your assigned patients.',
          queryTips: [
            'acute pharyngitis with mild fever',
            'elevated HbA1c with metformin dosage',
            'normal sinus rhythm ECG findings',
            'chest X-ray clear bilateral fields',
          ],
        };
      case 'admin':
      default:
        return {
          title: 'Hospital-Wide Clinical Semantic Search',
          subtitle: 'Enterprise search across all authorized medical documents, clinical EHR records, and prescriptions.',
          queryTips: [
            'cardiology consultation notes',
            'amoxicillin prescription logs',
            'radiology chest X-ray scans',
            'inpatient discharge summaries',
          ],
        };
    }
  };

  const info = getPageInfo();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <PageTitle
        title={info.title}
        subtitle={info.subtitle}
      />

      {/* Suggested Search Examples */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
        <span className="font-bold text-slate-700 flex items-center gap-1">
          <span>💡</span> Example Searches:
        </span>
        {info.queryTips.map((tip, idx) => (
          <span
            key={idx}
            className="rounded-lg bg-white px-2.5 py-1 text-slate-600 border border-slate-200/70 shadow-xs"
          >
            "{tip}"
          </span>
        ))}
      </div>

      {/* Embedded Semantic Search Engine */}
      <SemanticSearch />
    </div>
  );
};

export default SearchPage;
