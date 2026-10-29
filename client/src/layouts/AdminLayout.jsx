import React from 'react';
import RoleRoute from '../components/routing/RoleRoute.jsx';
import DashboardLayout from './DashboardLayout.jsx';

export const AdminLayout = () => {
  return (
    <RoleRoute allowedRoles={['admin']}>
      <DashboardLayout />
    </RoleRoute>
  );
};

export default AdminLayout;
