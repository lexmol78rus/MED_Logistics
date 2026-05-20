import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '../../lib/api/notifications';

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchNotifications();
      setItems(data.items);
      setUnreadCount(
        data.unreadCount ?? data.items.filter((n) => !n.readAt).length,
      );
    } catch {
      setItems([]);
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 60_000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleOpenItem = async (n: NotificationItem) => {
    if (!n.readAt) {
      await markNotificationRead(n.id).catch(() => undefined);
      void load();
    }
    setOpen(false);
    if (n.href) navigate(n.href);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          void load();
        }}
        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded border border-transparent transition-colors relative"
        aria-label="Уведомления"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 bg-red-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-slate-300 rounded shadow-lg z-50 max-h-96 overflow-auto">
          <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Уведомления ({unreadCount} непрочит.)
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-[9px] font-bold text-blue-700 uppercase"
                onClick={() => {
                  void markAllNotificationsRead().then(() => load());
                }}
              >
                Прочитать все
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="p-4 text-xs text-slate-500 text-center">Нет активных уведомлений</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors ${
                      !n.readAt ? 'bg-blue-50/50' : ''
                    }`}
                    onClick={() => void handleOpenItem(n)}
                  >
                    <p className="text-xs font-bold text-slate-800">{n.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{n.message}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
