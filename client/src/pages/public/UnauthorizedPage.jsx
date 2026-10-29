import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export const UnauthorizedPage = () => {
  const { user, role, getRoleDashboardPath } = useAuth();

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 text-4xl mb-6 shadow-sm">
        🛡️
      </div>

      <h1 className="text-3xl font-extrabold text-slate-900">403 — Access Denied</h1>
      <p className="mt-2 text-base text-slate-600 max-w-md">
        You do not possess the role permissions required to access this clinical resource.
        Role boundaries are strictly governed by healthcare privacy compliance.
      </p>

      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        {user ? (
          <Link
            to={getRoleDashboardPath(role)}
            className="rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-sky-800 transition"
          >
            Return to {role.toUpperCase()} Workspace
          </Link>
        ) : (
          <Link
            to="/login"
            className="rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-sky-800 transition"
          >
            Sign in with Authorized Credentials
          </Link>
        )}

        <Link
          to="/"
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          Hospital Homepage
        </Link>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
