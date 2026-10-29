import React, { useEffect } from 'react';

export const PageTitle = ({ title, subtitle, actions }) => {
  useEffect(() => {
    document.title = title ? `${title} | HETEROHMS` : 'HETEROHMS - Hospital Management';
  }, [title]);

  return (
    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
};

export default PageTitle;
