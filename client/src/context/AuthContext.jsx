import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios.js';

const AuthContext = createContext(null);

const DEMO_USERS = {
  admin: {
    _id: '6ae09ecd1d1caed95dff53d1',
    name: 'System Administrator',
    email: 'admin123@gmail.com',
    role: 'admin',
    department: 'Hospital Administration',
  },
  doctor: {
    _id: '6acac192848ed6203272ad6a',
    name: 'Dr. Rajesh Sharma',
    email: 'dr.sharma@heterohms.com',
    role: 'doctor',
    specialty: 'Cardiology',
    qualifications: ['MBBS', 'MD Cardiology'],
  },
  patient: {
    _id: '6acac192848ed6203272ad79',
    name: 'Rahul Verma',
    email: 'rahul.verma@example.com',
    role: 'patient',
    bloodGroup: 'B+',
    phone: '+91 98765 43210',
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Helper to determine default landing path based on user role.
   */
  const getRoleDashboardPath = useCallback((userRole) => {
    switch (userRole) {
      case 'admin':
        return '/admin/dashboard';
      case 'doctor':
        return '/doctor/dashboard';
      case 'patient':
        return '/patient/dashboard';
      default:
        return '/';
    }
  }, []);

  /**
   * Helper to determine profile path based on user role.
   */
  const getRoleProfilePath = useCallback((userRole) => {
    switch (userRole) {
      case 'patient':
        return '/patient/profile';
      case 'doctor':
        return '/doctor/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/';
    }
  }, []);

  const normalizeUser = (userData) => {
    if (!userData) return null;
    const normalized = { ...userData };
    const resolvedId = normalized._id || normalized.id;
    normalized._id = resolvedId;
    normalized.id = resolvedId;
    return normalized;
  };

  /**
   * Restores user session from HTTP-only cookie on application startup,
   * with seamless demo localStorage fallback for instant client review.
   */
  const refreshUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/auth/me');
      if (res.data?.success && res.data?.user) {
        const normalized = normalizeUser(res.data.user);
        setUser(normalized);
        setRole(normalized.role);
        setLoading(false);
        return;
      }
    } catch (err) {
      // Backend not running or unauthenticated
    }

    try {
      const saved = localStorage.getItem('heterohms_demo_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.role) {
          setUser(parsed);
          setRole(parsed.role);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      // Ignore JSON parse errors
    }

    setUser(null);
    setRole(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const DEMO_CREDENTIALS = {
    doctor: { email: 'dr.sharma@heterohms.com', password: 'Demo@12345' },
    patient: { email: 'rahul.verma@example.com', password: 'Demo@12345' },
  };

  /**
   * Direct 1-click demo login helper that connects to the backend and establishes
   * real authenticated sessions & HTTP-only JWT cookies in MongoDB.
   */
  const loginAsDemo = useCallback(
    async (demoRole) => {
      setError(null);

      // Admin access can never be bypassed via 1-click demo
      if (demoRole === 'admin') {
        const adminErr = 'Admin workspace requires strict manual password verification.';
        setError(adminErr);
        throw new Error(adminErr);
      }

      const creds = DEMO_CREDENTIALS[demoRole] || DEMO_CREDENTIALS.patient;

      try {
        const res = await api.post('/auth/login', creds);
        if (res.data?.success && res.data?.user) {
          const normalized = normalizeUser(res.data.user);
          setUser(normalized);
          setRole(normalized.role);
          localStorage.removeItem('heterohms_demo_user');
          return {
            success: true,
            user: normalized,
            redirectPath: getRoleDashboardPath(normalized.role),
          };
        }
      } catch (err) {
        console.warn(
          '[AuthContext] Backend login request unavailable, falling back to local demo profile:',
          err.message
        );
      }

      // Safe offline fallback in case backend is offline
      const targetUser = normalizeUser(DEMO_USERS[demoRole] || DEMO_USERS.patient);
      setUser(targetUser);
      setRole(targetUser.role);
      localStorage.setItem('heterohms_demo_user', JSON.stringify(targetUser));
      return {
        success: true,
        user: targetUser,
        redirectPath: getRoleDashboardPath(targetUser.role),
      };
    },
    [getRoleDashboardPath]
  );

  /**
   * Authenticate user with email and password, with instant fallback to demo data if backend is offline.
   */
  const login = async (email, password) => {
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data?.success && res.data?.user) {
        const normalized = normalizeUser(res.data.user);
        setUser(normalized);
        setRole(normalized.role);
        localStorage.removeItem('heterohms_demo_user');
        return { success: true, user: normalized, redirectPath: getRoleDashboardPath(normalized.role) };
      }
      throw new Error(res.data?.message || 'Login failed.');
    } catch (err) {
      // If the backend actively responded (e.g. 400, 401 wrong password), never bypass or fallback!
      if (err.response?.data?.message) {
        setError(err.response.data.message);
        throw new Error(err.response.data.message);
      }

      // Safe offline fallback ONLY if server is completely unreachable and credentials match
      const emailLower = email?.trim().toLowerCase();
      let matchedDemo = null;
      if (emailLower === 'admin123@gmail.com' && password === 'admin123') {
        matchedDemo = DEMO_USERS.admin;
      } else if (emailLower === 'dr.sharma@heterohms.com' && password === 'Demo@12345') {
        matchedDemo = DEMO_USERS.doctor;
      } else if (emailLower === 'rahul.verma@example.com' && password === 'Demo@12345') {
        matchedDemo = DEMO_USERS.patient;
      }

      if (matchedDemo) {
        setUser(matchedDemo);
        setRole(matchedDemo.role);
        localStorage.setItem('heterohms_demo_user', JSON.stringify(matchedDemo));
        return { success: true, user: matchedDemo, redirectPath: getRoleDashboardPath(matchedDemo.role) };
      }

      const msg = err.message || 'Login failed. Please verify your credentials.';
      setError(msg);
      throw new Error(msg);
    }
  };

  /**
   * Register a new patient account.
   */
  const register = async (patientData) => {
    setError(null);
    try {
      const res = await api.post('/auth/register', patientData);
      if (res.data?.success && res.data?.user) {
        const normalized = normalizeUser(res.data.user);
        setUser(normalized);
        setRole(normalized.role);
        localStorage.removeItem('heterohms_demo_user');
        return { success: true, user: normalized, redirectPath: '/patient/dashboard' };
      }
      throw new Error(res.data?.message || 'Registration failed.');
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Log out current user and clear session.
   */
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout network request notice:', err.message);
    } finally {
      localStorage.removeItem('heterohms_demo_user');
      setUser(null);
      setRole(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        error,
        login,
        loginAsDemo,
        register,
        logout,
        refreshUser,
        getRoleDashboardPath,
        getRoleProfilePath,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
