import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Megaphone, X, Siren, MapPin } from 'lucide-react';
import { categoryLabel } from '../constants/incidentCategories';

export interface IncomingNotification {
  id: string;
  senderName?: string;
  senderId?: string;
  message: string;
  type?: string;
  category?: string;
  severity?: number;
  reelId?: string;
  locationLabel?: string;
  createdAt?: string;
}

interface NotificationToastsProps {
  socket: Socket | null;
  userId?: string;
}

export const NotificationToasts: React.FC<NotificationToastsProps> = ({ socket, userId }) => {
  const [toasts, setToasts] = useState<IncomingNotification[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!socket || !userId) return undefined;
    // Join this user's room so targeted broadcasts reach them. Emit again on
    // (re)connect so a slow/handled connection never misses the join.
    const join = () => socket.emit('join_user', userId);
    socket.on('connect', join);
    join();

    const onNotification = (n: IncomingNotification) => {
      if (!n || !n.message) return;
      const id = n.id || `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [{ ...n, id }, ...prev].slice(0, 3));
      if (timers.current[id]) clearTimeout(timers.current[id]);
      timers.current[id] = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        delete timers.current[id];
      }, 9000);
    };

    socket.on('notification', onNotification);
    return () => {
      socket.off('connect', join);
      socket.off('notification', onNotification);
    };
  }, [socket, userId]);

  useEffect(() => {
    const all = timers.current;
    return () => Object.values(all).forEach(clearTimeout);
  }, []);

  const dismiss = (id: string) => {
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[1200] space-y-3 w-[340px] max-w-[calc(100vw-2.5rem)]">
      {toasts.map((toast) => {
        const isIncident = toast.type === 'incident_alert';
        return (
        <div
          key={toast.id}
          className={`bg-[#0d0d0d]/95 backdrop-blur-md border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 fade-in duration-300 ${
            isIncident ? 'border-red-500/40' : 'border-white/20'
          }`}
        >
          <div className={`h-0.5 w-full ${isIncident ? 'bg-gradient-to-r from-red-600 to-orange-500' : 'bg-gradient-to-r from-gray-500 to-gray-700'}`} />
          <div className="p-4 flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isIncident ? 'bg-red-500/15' : 'bg-white/10'}`}>
              {isIncident ? (
                <Siren className="w-4 h-4 text-red-400" />
              ) : (
                <Megaphone className="w-4 h-4 text-gray-200" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-[11px] font-bold uppercase tracking-wide truncate ${isIncident ? 'text-red-400' : 'text-white'}`}>
                  {isIncident
                    ? `Incident · ${categoryLabel(toast.category)}`
                    : toast.senderName
                      ? `Broadcast · ${toast.senderName}`
                      : 'New Broadcast'}
                </p>
                <button
                  onClick={() => dismiss(toast.id)}
                  className="text-gray-500 hover:text-white p-0.5 rounded-full transition-colors shrink-0"
                >
                  <X size={12} />
                </button>
              </div>
              {isIncident && toast.locationLabel && (
                <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                  <MapPin size={10} className="shrink-0" />
                  {toast.locationLabel}
                </p>
              )}
              <p className="text-[13px] text-gray-200 leading-relaxed mt-1">{toast.message}</p>
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
};