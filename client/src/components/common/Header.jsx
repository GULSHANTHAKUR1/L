import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import UserProfileMenu from './UserProfileMenu.jsx';
import NotificationPanel from './NotificationPanel.jsx';
import api from '../../api/axios.js';

export const Header = ({ onToggleSidebar }) => {
  const { user, role } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchUnreadCount = async () => {
      try {
        const res = await api.get('/notifications?unreadOnly=true&limit=1');
        if (isMounted && res.data?.unreadCount !== undefined) {
          setUnreadCount(res.data.unreadCount);
        }
      } catch (err) {
        // Silently catch unread fetch failure in background
      }
    };

    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30s
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [user]);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle navigation"
        >
          <span className="text-xl">☰</span>
        </button>

        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm shadow">
            H
          </div>
          <span className="hidden font-bold tracking-tight text-slate-800 sm:inline text-lg">
            HETEROHMS
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Bell with Dropdown Panel */}
        <div className="relative">
          <button
            onClick={() => setPanelOpen((prev) => !prev)}
            className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 transition focus:outline-none"
            title="Notifications"
            aria-label="Open notifications"
          >
            <span className="text-lg">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <NotificationPanel
            isOpen={panelOpen}
            onClose={() => setPanelOpen(false)}
            onCountChange={(count) => setUnreadCount(count)}
          />
        </div>

        {/* User Profile Menu */}
        <UserProfileMenu />
      </div>
    </header>
  );
};

export default Header;
