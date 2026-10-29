import React from 'react';
import RoleRoute from '../components/routing/RoleRoute.jsx';
import DashboardLayout from './DashboardLayout.jsx';

export const DoctorLayout = () => {
  return (
    <RoleRoute allowedRoles={['doctor']}>
      <DashboardLayout />
    </RoleRoute>
  );
};

export default DoctorLayout;
