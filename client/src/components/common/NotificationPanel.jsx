import React, { useState, useEffect } from 'react';
import api from '../../api/axios.js';

export const NotificationPanel = ({ isOpen, onClose, onCountChange }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/notifications?limit=20');
      if (res.data?.success) {
        setNotifications(res.data.data || []);
        if (onCountChange && res.data.unreadCount !== undefined) {
          onCountChange(res.data.unreadCount);
        }
      }
    } catch (err) {
      setError('Could not load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      if (onCountChange) onCountChange(0);
    } catch (err) {
      // ignore
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      if (onCountChange) {
        setNotifications((current) => {
          const unread = current.filter((x) => !x.isRead).length;
          onCountChange(unread);
          return current;
        });
      }
    } catch (err) {
      // ignore
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (onCountChange) {
        setNotifications((current) => {
          const unread = current.filter((x) => !x.isRead).length;
          onCountChange(unread);
          return current;
        });
      }
    } catch (err) {
      // ignore
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Background click listener */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-slate-800">Notifications</span>
            {notifications.some((n) => !n.isRead) && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                New
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
            >
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="flex items-center justify-center p-8 text-sm text-slate-400">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mr-2" />
              Loading notifications...
            </div>
          ) : error ? (
            <div className="p-4 text-center text-xs text-rose-600">{error}</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              🔔 No notifications yet.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id}
                className={`flex items-start gap-3 p-3.5 transition hover:bg-slate-50 ${
                  !n.isRead ? 'bg-blue-50/40' : ''
                }`}
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 text-sm">
                  {n.type === 'appointment'
                    ? '📅'
                    : n.type === 'document'
                    ? '📁'
                    : 'ℹ️'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-xs ${!n.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    {!n.isRead && (
                      <button
                        onClick={() => handleMarkRead(n._id)}
                        className="text-[11px] font-medium text-blue-600 hover:underline"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(n._id)}
                      className="text-[11px] font-medium text-slate-400 hover:text-rose-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationPanel;
