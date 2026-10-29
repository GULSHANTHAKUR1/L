import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export const PublicLayout = () => {
  const { user, role, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [adminError, setAdminError] = useState(null);

  const closeAdminModal = () => {
    setShowAdminModal(false);
    setAdminEmail('');
    setAdminPassword('');
    setAdminError(null);
  };

  const handleAdminDashboardClick = () => {
    if (user && role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      setAdminError(null);
      setAdminEmail('');
      setAdminPassword('');
      setShowAdminModal(true);
    }
  };

  const handleAdminLoginSubmit = async (e) => {
    e.preventDefault();
    setAdminError(null);
    setSubmitting(true);

    try {
      const result = await login(adminEmail, adminPassword);
      if (result.user.role !== 'admin') {
        setAdminError('Access Denied: The provided account does not have administrator privileges.');
        return;
      }
      toast.success('Admin authenticated successfully! Opening Admin Dashboard...');
      closeAdminModal();
      navigate('/admin/dashboard');
    } catch (err) {
      setAdminError(err.message || 'Authentication failed. Please verify admin email and password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-base shadow">
              H
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-800">HETEROHMS</span>
              <span className="hidden text-[10px] uppercase font-semibold text-blue-600 ml-1.5 sm:inline">
                Hospital
              </span>
            </div>
          </Link>

          {/* Top Right Corner: Go to Admin Dashboard */}
          <nav className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAdminDashboardClick}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition active:scale-95"
            >
              <span>⚙️</span>
              <span>Go to Admin Dashboard →</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4">
          <p>© 2026 HETEROHMS Hospital. Connected Care. Intelligent Health Management.</p>
        </div>
      </footer>

      {/* Admin Verification Modal */}
      {showAdminModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAdminModal();
          }}
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 font-bold text-lg border border-slate-200">
                  ⚙️
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Admin Portal Verification</h3>
                  <p className="text-xs text-slate-500">Administrator credentials required to enter dashboard</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAdminModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                ✕
              </button>
            </div>

            {adminError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                {adminError}
              </div>
            )}

            <form onSubmit={handleAdminLoginSubmit} autoComplete="off" className="space-y-4">
              {/* Dummy hidden inputs to absorb browser autofill heuristics */}
              <input type="text" name="fake_admin_usr" style={{ display: 'none' }} tabIndex={-1} readOnly autoComplete="off" />
              <input type="password" name="fake_admin_pwd" style={{ display: 'none' }} tabIndex={-1} readOnly autoComplete="off" />

              <div>
                <label htmlFor="admin-email-input" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Admin Email Address
                </label>
                <input
                  id="admin-email-input"
                  name="admin_manual_email_no_autofill"
                  type="email"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="Enter admin email..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
              </div>

              <div>
                <label htmlFor="admin-password-input" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Admin Password
                </label>
                <input
                  id="admin-password-input"
                  name="admin_manual_password_no_autofill"
                  type="password"
                  required
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeAdminModal}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow hover:bg-slate-800 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Authenticate & Enter →</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicLayout;
