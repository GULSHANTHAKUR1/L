import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage = () => {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 text-4xl mb-6 shadow-sm">
        🔍
      </div>

      <h1 className="text-3xl font-extrabold text-slate-900">404 — Page Not Found</h1>
      <p className="mt-2 text-base text-slate-600 max-w-md">
        The requested medical portal route or resource could not be found or may have been relocated.
      </p>

      <div className="mt-6 flex gap-3 justify-center">
        <Link
          to="/"
          className="rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-sky-800 transition"
        >
          Return to Homepage
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
