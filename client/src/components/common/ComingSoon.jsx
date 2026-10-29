import React from 'react';
import PageTitle from './PageTitle.jsx';

export const ComingSoon = ({ title = 'Page Under Development', moduleName = 'This feature' }) => {
  return (
    <div>
      <PageTitle title={title} subtitle="Module preview" />
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 text-3xl mb-4">
          ⏱️
        </div>
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        <p className="mt-2 text-sm text-slate-500 max-w-md">
          {moduleName} will be fully constructed in the upcoming frontend module milestone.
          The backend API and authorization layer for this service are verified and live.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
          Scheduled for next implementation prompt
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
