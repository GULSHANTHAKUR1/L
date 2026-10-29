import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export const UserProfileMenu = () => {
  const { user, role, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/');
  };

  if (!user) return null;

  const roleBadgeColors = {
    admin: 'bg-rose-100 text-rose-700 ring-rose-600/20',
    doctor: 'bg-sky-100 text-sky-700 ring-sky-600/20',
    patient: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full p-1 text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
        aria-expanded={open}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-700 text-white font-semibold text-sm">
          {user.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="hidden text-left md:block pr-2">
          <div className="text-sm font-medium leading-none text-slate-800">{user.name}</div>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${
              roleBadgeColors[role] || 'bg-slate-100 text-slate-700 ring-slate-600/20'
            }`}
          >
            {role}
          </span>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white p-2 shadow-xl border border-slate-200 z-50 text-sm">
          <div className="border-b border-slate-100 px-3 py-2">
            <p className="font-semibold text-slate-800 truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                setOpen(false);
                if (role === 'patient') navigate('/patient/profile');
                else if (role === 'doctor') navigate('/doctor/schedule');
                else navigate('/admin/dashboard');
              }}
              className="w-full text-left rounded-md px-3 py-2 text-slate-700 hover:bg-slate-50"
            >
              Account Details
            </button>
          </div>

          <div className="border-t border-slate-100 pt-1">
            <button
              onClick={handleLogout}
              className="w-full text-left rounded-md px-3 py-2 text-rose-600 hover:bg-rose-50 font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileMenu;
