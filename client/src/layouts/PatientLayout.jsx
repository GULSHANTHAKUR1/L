import React from 'react';
import RoleRoute from '../components/routing/RoleRoute.jsx';
import DashboardLayout from './DashboardLayout.jsx';

export const PatientLayout = () => {
  return (
    <RoleRoute allowedRoles={['patient']}>
      <DashboardLayout />
    </RoleRoute>
  );
};

export default PatientLayout;
