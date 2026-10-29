import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export const Sidebar = ({ isOpen, onClose }) => {
  const { role } = useAuth();

  const adminLinks = [
    { label: 'Overview', to: '/admin/dashboard', icon: '📊' },
    { label: 'Doctor Directory', to: '/admin/doctors', icon: '👨‍⚕️' },
    { label: 'Patient Registry', to: '/admin/patients', icon: '👥' },
    { label: 'Appointments', to: '/admin/appointments', icon: '📅' },
    { label: 'Medical Documents', to: '/admin/documents', icon: '📁' },
  ];

  const doctorLinks = [
    { label: 'Doctor Dashboard', to: '/doctor/dashboard', icon: '🩺' },
    { label: 'My Appointments', to: '/doctor/appointments', icon: '📅' },
    { label: 'Assigned Patients', to: '/doctor/patients', icon: '👥' },
    { label: 'Weekly Schedule', to: '/doctor/schedule', icon: '⏰' },
    { label: 'Medical Documents', to: '/doctor/documents', icon: '📁' },
    { label: 'Clinical Search', to: '/doctor/search', icon: '🔍' },
  ];

  const patientLinks = [
    { label: 'Patient Portal', to: '/patient/dashboard', icon: '🏠' },
    { label: 'Find Doctors', to: '/patient/doctors', icon: '🩺' },
    { label: 'My Appointments', to: '/patient/appointments', icon: '📅' },
    { label: 'Medical Records', to: '/patient/medical-records', icon: '📋' },
    { label: 'Prescriptions', to: '/patient/prescriptions', icon: '💊' },
    { label: 'My Documents', to: '/patient/documents', icon: '📁' },
    { label: 'Health Timeline', to: '/patient/timeline', icon: '⏱️' },
    { label: 'Record Search', to: '/patient/search', icon: '🔍' },
  ];

  const links = role === 'admin' ? adminLinks : role === 'doctor' ? doctorLinks : patientLinks;

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition font-medium ${
      isActive
        ? 'bg-sky-50 text-sky-700 font-semibold'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white p-4 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-12 items-center justify-between px-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-700 text-white font-bold text-xs">
              H
            </div>
            <span className="font-bold text-slate-800 tracking-tight">HETEROHMS</span>
          </div>

          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>

        <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {role} Workspace
        </div>

        <nav className="space-y-1">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass} onClick={onClose} end>
              <span className="text-base">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
