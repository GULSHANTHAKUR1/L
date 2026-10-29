import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const { user, role, getRoleDashboardPath, getRoleProfilePath, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // If user is already authenticated and gives credentials again -> open their profile!
    if (user) {
      toast.info(`Active session detected for ${user.name}. Opening your profile.`);
      navigate(getRoleProfilePath(role));
      return;
    }

    if (!email || !password) {
      setFormError('Please enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await login(email, password);
      toast.success(`Welcome back, ${result.user.name}!`);
      navigate(from || result.redirectPath, { replace: true });
    } catch (err) {
      setFormError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  // Demo auto-fill helper for rapid local testing
  const handleQuickFill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Demo@12345');
    setFormError(null);
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-sky-700 text-white font-bold text-xl shadow">
            H
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Sign in to HETEROHMS</h2>
          <p className="mt-1 text-sm text-slate-500">Access your hospital clinical workspace or patient health portal</p>
        </div>

        <ErrorAlert message={formError} onClose={() => setFormError(null)} />

        {user && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-xs">
            <div className="flex items-center gap-2 font-bold text-blue-900 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Active Session Verified
            </div>
            <p className="text-slate-600 mb-3">
              You are signed in as <strong>{user.name}</strong> ({role?.toUpperCase()}). Re-submitting login credentials will open your profile directly.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate(getRoleProfilePath(role))}
                className="flex-1 rounded-lg bg-blue-600 py-1.5 font-semibold text-white hover:bg-blue-700 transition"
              >
                👤 Open Profile
              </button>
              <button
                type="button"
                onClick={() => navigate(getRoleDashboardPath(role))}
                className="flex-1 rounded-lg border border-slate-300 bg-white py-1.5 font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                📊 Go to Dashboard
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@hospital.com"
              required
              disabled={submitting}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Password
              </label>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              disabled={submitting}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-sky-700 py-3 text-sm font-semibold text-white shadow-md hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          New patient?{' '}
          <Link to="/register" className="font-semibold text-sky-700 hover:text-sky-800 underline">
            Register for an account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
