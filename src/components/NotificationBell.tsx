import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { io, Socket } from 'socket.io-client';
import { Bell, Megaphone, Siren, MapPin, X, CheckCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { categoryLabel } from '../constants/incidentCategories';
import { StreamService, AppNotification } from '../services/StreamService';

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${Math.max(seconds, 0)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 380,
  });
  const triggerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const measurePanel = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const avail = window.innerWidth;
    const width = Math.min(380, avail - 32);
    let left = r.right - width;
    if (left < 16) left = 16;
    if (left + width > avail - 16) left = avail - width - 16;
    setPos({ top: r.bottom + 12, left, width });
  };

  // Live socket: join this user's room so broadcasts and incident alerts
  // aimed at this account arrive instantly and appear in the bell.
  useEffect(() => {
    if (!userId) return undefined;

    const socket = io(import.meta.env.VITE_API_URL);
    socketRef.current = socket;

    const join = () => {
      if (userId) socket.emit('join_user', userId);
    };
    const onNotification = (n: AppNotification) => {
      if (!n || !n.message) return;
      const id = n.id || `${Date.now()}-${Math.random()}`;
      const copy: AppNotification = { ...n, id, read: n.read ?? false };
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        if (seen.has(id)) return prev;
        return [copy, ...prev].slice(0, 50);
      });
    };

    socket.on('connect', join);
    socket.on('notification', onNotification);
    join();

    return () => {
      socket.off('connect', join);
      socket.off('notification', onNotification);
      socketRef.current = null;
      socket.disconnect();
    };
  }, [userId]);

  // Load anything persisted while offline/reopened.
  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    StreamService.getNotifications(50).then((list) => {
      if (cancelled) return;
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const incoming = list.filter((n) => n.id && !seen.has(n.id));
        return [...incoming, ...prev].slice(0, 50);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const unreadCount = items.filter((n) => !n.read).length;

  // Reposition the floating panel if the page scrolls/resizes while open.
  useEffect(() => {
    if (!open) return undefined;
    measurePanel();
    window.addEventListener('scroll', measurePanel, true);
    window.addEventListener('resize', measurePanel);
    return () => {
      window.removeEventListener('scroll', measurePanel, true);
      window.removeEventListener('resize', measurePanel);
    };
  }, [open]);

  const openPanel = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      measurePanel();
      if (items.some((n) => !n.read)) {
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
        StreamService.markNotificationsRead();
      }
    }
  };

  const dismiss = (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="relative" ref={triggerRef}>
      <button
        onClick={openPanel}
        aria-label="Notifications"
        className="relative text-gray-400 hover:text-gray-200 transition-colors bg-[#111111] p-2 rounded-full border border-[#1f1f1f]"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-black flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[1300]" onClick={() => setOpen(false)} />
            <div
              style={{ top: pos.top, left: pos.left, width: pos.width }}
              className="fixed z-[1300] bg-[#121212] border border-[#1f1f1f] rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 fade-in duration-150"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f]">
                <h3 className="text-white text-sm font-semibold flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                    <Bell className="w-3.5 h-3.5 text-white" />
                  </span>
                  Notifications
                </h3>
                <button
                  onClick={() => {
                    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
                    StreamService.markNotificationsRead();
                  }}
                  className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-full transition-colors"
                >
                  <CheckCheck size={12} />
                  Mark all read
                </button>
              </div>

            <div className="max-h-[420px] overflow-y-auto no-scrollbar">
              {items.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center px-4">
                  <Megaphone className="w-9 h-9 text-gray-600 mb-3" />
                  <p className="text-gray-400 text-sm font-medium">No notifications yet</p>
                  <p className="text-gray-600 text-xs mt-1">
                    Broadcasts and incident alerts sent to you will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#1f1f1f]/60">
                  {items.map((n) => {
                    const isIncident = n.type === 'incident_alert';
                    return (
                      <div key={n.id} className="relative px-4 py-3 hover:bg-white/5 transition-colors">
                        {!n.read && (
                          <span className="absolute left-1.5 top-4 w-1.5 h-1.5 rounded-full bg-red-500" />
                        )}
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              isIncident ? 'bg-red-500/15' : 'bg-blue-500/15'
                            }`}
                          >
                            {isIncident ? (
                              <Siren className="w-4 h-4 text-red-400" />
                            ) : (
                              <Megaphone className="w-4 h-4 text-blue-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={`text-[11px] font-bold uppercase tracking-wide truncate ${
                                  isIncident ? 'text-red-400' : 'text-white'
                                }`}
                              >
                                {isIncident
                                  ? `Incident · ${categoryLabel(n.category)}`
                                  : n.senderName
                                    ? `Broadcast · ${n.senderName}`
                                    : 'New Broadcast'}
                              </p>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-gray-500">
                                  {timeAgo(n.createdAt)}
                                </span>
                                <button
                                  onClick={() => dismiss(n.id)}
                                  className="text-gray-500 hover:text-white p-0.5 rounded-full transition-colors"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                            {isIncident && n.locationLabel && (
                              <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                                <MapPin size={10} className="shrink-0" />
                                {n.locationLabel}
                              </p>
                            )}
                            <p className="text-[13px] text-gray-200 leading-relaxed mt-1">
                              {n.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          </>,
          document.body
        )}
    </div>
  );
};