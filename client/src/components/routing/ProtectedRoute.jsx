import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';

/**
 * Route guard that redirects unauthenticated users to /login,
 * saving the current location for post-login return.
 */
export const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <LoadingSpinner message="Checking active session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Strict role check: blocks non-admin users from accessing admin section
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
