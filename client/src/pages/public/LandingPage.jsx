import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export const LandingPage = () => {
  const { user, role, getRoleDashboardPath, getRoleProfilePath, login, loginAsDemo, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // If user is already authenticated and submits credentials again -> open their profile
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
      navigate(result.redirectPath || getRoleDashboardPath(result.user.role));
    } catch (err) {
      setFormError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-16 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero Section matching Screenshot 1 */}
      <section className="relative overflow-hidden pt-4 pb-6">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* Left Column: Hospital Info */}
          <div className="space-y-7">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100/90 px-3.5 py-1 text-xs font-semibold text-blue-700">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              24/7 Emergency Services Available
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
              Welcome to{' '}
              <span className="text-blue-600">HETEROHMS</span>
              <br />
              Hospital
            </h1>

            {/* Tagline & Description */}
            <div className="space-y-2.5 max-w-xl">
              <p className="text-lg sm:text-xl font-semibold text-blue-700 tracking-tight">
                Connected Care. Intelligent Health Management.
              </p>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Providing world-class healthcare services for you and your family. Experience
                compassionate care with state-of-the-art medical facilities and highly qualified
                healthcare professionals.
              </p>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3.5 p-4 bg-white rounded-2xl shadow-sm border border-slate-200/90 hover:shadow-md transition">
                <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 text-blue-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Visit Us</p>
                  <p className="text-sm font-semibold text-slate-800">1234 Main St, City, State</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-4 bg-white rounded-2xl shadow-sm border border-slate-200/90 hover:shadow-md transition">
                <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 text-blue-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Call Us</p>
                  <p className="text-sm font-semibold text-slate-800">(123) 436-7880</p>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-100">
              <div>
                <p className="text-3xl sm:text-4xl font-extrabold text-blue-600">50+</p>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">Expert Doctors</p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-extrabold text-blue-600">15K+</p>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">Happy Patients</p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-extrabold text-blue-600">20+</p>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">Departments</p>
              </div>
            </div>

          </div>

          {/* Right Column: Interactive Portal Login & Active Profile Card */}
          <div className="relative">
            <div className="absolute -top-6 -right-6 w-72 h-72 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-6 -left-6 w-72 h-72 bg-sky-200/30 rounded-full blur-3xl pointer-events-none" />

            <div className="relative rounded-3xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-6 sm:p-8 shadow-2xl space-y-5">
              {!user ? (
                /* Unauthenticated View: Direct Login Card on Homepage */
                <>
                  <div className="border-b border-slate-100 pb-4">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      <span>🔐</span> Hospital Portal Sign In
                    </div>
                    <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-900">
                      Sign In to Your Workspace
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Login to access your clinical or patient dashboard. Each session is recorded in the database.
                    </p>
                  </div>

                  {formError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                      {formError}
                    </div>
                  )}

                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Work / Patient Email
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. rahul.verma@example.com"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>Authenticating & Logging in...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In to Dashboard</span>
                          <span>→</span>
                        </>
                      )}
                    </button>
                  </form>

                  <p className="text-center text-xs text-slate-500 pt-1">
                    Don't have an account?{' '}
                    <Link to="/register" className="font-semibold text-blue-600 hover:underline">
                      Register as Patient
                    </Link>
                  </p>
                </>
              ) : (
                /* Authenticated View: Active Session & Profile Quick Access */
                <>
                  <div className="border-b border-slate-100 pb-4">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Active Session Verified
                    </div>
                    <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-900">
                      Welcome, {user.name}!
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      You are authenticated as <span className="font-bold text-slate-700 uppercase">{role}</span>.
                      Login data has been recorded in the database.
                    </p>
                  </div>

                  {/* Security & Database Audit Info */}
                  <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Account Email:</span>
                      <span className="font-bold text-slate-900">{user.email}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Database Logins:</span>
                      <span className="font-bold text-blue-600">{user.loginCount || 1} sessions logged</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Last Login Timestamp:</span>
                      <span className="font-semibold text-slate-800">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active Now'}
                      </span>
                    </div>
                  </div>

                  {/* Primary Navigation Actions */}
                  <div className="space-y-2.5 pt-1">
                    <Link
                      to={getRoleDashboardPath(role)}
                      className="w-full block text-center rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition"
                    >
                      📊 Enter {role.toUpperCase()} Dashboard →
                    </Link>
                    <Link
                      to={getRoleProfilePath(role)}
                      className="w-full block text-center rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                    >
                      👤 Open My Profile
                    </Link>
                  </div>

                  {/* Re-entering Credentials to Open Profile */}
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-500 mb-2">
                      Want to verify credentials again? Submit to open your profile directly:
                    </p>
                    <form onSubmit={handleFormSubmit} className="space-y-2">
                      <input
                        type="password"
                        placeholder="Re-enter password to open profile"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        className="w-full rounded-lg bg-slate-800 py-2 text-xs font-bold text-white hover:bg-slate-900 transition"
                      >
                        Verify Credentials & Open Profile →
                      </button>
                    </form>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => logout()}
                      className="text-xs text-rose-600 font-semibold hover:underline"
                    >
                      Sign Out of Current Session
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 pt-6 border-t border-slate-200">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow transition">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700 text-2xl mb-4">
            📅
          </div>
          <h3 className="text-lg font-bold text-slate-800">Atomic Conflict Prevention</h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Database-backed compound unique indexing guarantees zero double-bookings. Real-time slot locking
            prevents concurrency race conditions.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow transition">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-700 text-2xl mb-4">
            🩺
          </div>
          <h3 className="text-lg font-bold text-slate-800">Role-Isolated Clinical Records</h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Strict RBAC ensures doctors only access assigned patients, patients see only their own history,
            and administrators retain hospital oversight.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow transition">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 text-2xl mb-4">
            🔍
          </div>
          <h3 className="text-lg font-bold text-slate-800">Unified Clinical Search</h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Multi-modal semantic vector search and timeline synthesis across clinical EHR notes, prescriptions, and lab reports.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow transition">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 text-2xl mb-4">
            ☁️
          </div>
          <h3 className="text-lg font-bold text-slate-800">Cloudinary Media Storage</h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Secure memory-stream uploads for lab reports, PDFs, and X-ray scans with automated MIME verification
            and 10 MB boundary enforcement.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow transition">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 text-2xl mb-4">
            🔒
          </div>
          <h3 className="text-lg font-bold text-slate-800">Hardened Session Cookies</h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            JWT session tokens reside strictly inside HTTP-only, SameSite cookies, neutralizing client-side
            XSS attacks and script token leakage.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow transition">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-700 text-2xl mb-4">
            🤖
          </div>
          <h3 className="text-lg font-bold text-slate-800">Decoupled AI Microservice</h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Integrated architecture ready for Phase 2 Tesseract OCR text extraction and clinical semantic
            vector search via Python FastAPI.
          </p>
        </div>
      </section>

      {/* Role Access Matrix */}
      <section className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800 text-center">Three Specialized Portals</h2>
        <div className="grid gap-6 md:grid-cols-3 mt-8">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
            <span className="rounded bg-rose-100 px-2 py-1 text-xs font-bold text-rose-700 uppercase">Admin Portal</span>
            <h4 className="font-semibold text-slate-800 mt-3">Hospital Management</h4>
            <p className="text-xs text-slate-500 mt-1">Manage staff, patient registry, financial reconciliations, and hospital analytics.</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
            <span className="rounded bg-sky-100 px-2 py-1 text-xs font-bold text-sky-700 uppercase">Doctor Portal</span>
            <h4 className="font-semibold text-slate-800 mt-3">Clinical Operations</h4>
            <p className="text-xs text-slate-500 mt-1">Weekly availability scheduling, patient consultation queue, clinical notes, and prescriptions.</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
            <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700 uppercase">Patient Portal</span>
            <h4 className="font-semibold text-slate-800 mt-3">Personal Health Record</h4>
            <p className="text-xs text-slate-500 mt-1">Search doctors, instant conflict-free booking, prescriptions, lab uploads, and health timelines.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
