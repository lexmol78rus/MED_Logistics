import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '../../lib/api/notifications';
import { useNotificationPolling } from '../../lib/notifications/useNotificationPolling';
import { unlockNotificationAudio } from '../../lib/notifications/notification-audio';
import { loadSettings } from '../../lib/settings/storage';

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const animations = loadSettings().uiAnimations !== false;
  const { items, unreadCount, reload } = useNotificationPolling(open);

  const hasUnread = unreadCount > 0;

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
      void reload({ silent: true });
    }
    setOpen(false);
    if (n.href) navigate(n.href);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          unlockNotificationAudio();
          setOpen((v) => !v);
          void reload({ silent: true });
        }}
        className={cn(
          'relative flex items-center justify-center rounded-lg border transition-colors',
          'h-10 w-10',
          hasUnread
            ? 'border-amber-400 bg-amber-50 text-amber-800 shadow-sm hover:bg-amber-100'
            : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900',
        )}
        aria-label={hasUnread ? `Уведомления: ${unreadCount} непрочитанных` : 'Уведомления'}
      >
        {hasUnread && animations ? (
          <span
            className="pointer-events-none absolute inset-0 rounded-lg bg-amber-400/35 animate-ping"
            aria-hidden
          />
        ) : null}
        {hasUnread && animations ? (
          <span
            className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-amber-400/60 ring-offset-1 ring-offset-white notification-bell-ring"
            aria-hidden
          />
        ) : null}

        <Bell
          className={cn(
            'relative z-[1] h-5 w-5',
            hasUnread && animations && 'notification-bell-icon--alert',
          )}
          strokeWidth={hasUnread ? 2.5 : 2}
        />

        {hasUnread ? (
          <span
            className={cn(
              'absolute -top-1.5 -right-1.5 z-[2] flex min-w-[22px] h-[22px] items-center justify-center',
              'rounded-full bg-red-600 px-1 text-[11px] font-extrabold leading-none text-white',
              'shadow-md ring-2 ring-white',
              animations && 'notification-bell-badge--pulse',
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-h-96 overflow-auto rounded-lg border border-slate-300 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Уведомления
              {hasUnread ? (
                <span className="ml-1.5 text-red-600">({unreadCount} нов.)</span>
              ) : null}
            </span>
            {hasUnread ? (
              <button
                type="button"
                className="text-[10px] font-bold uppercase text-blue-700 hover:text-blue-900"
                onClick={() => {
                  void markAllNotificationsRead().then(() => reload({ silent: true }));
                }}
              >
                Прочитать все
              </button>
            ) : null}
          </div>
          {items.length === 0 ? (
            <p className="p-4 text-center text-xs text-slate-500">Нет активных уведомлений</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={cn(
                      'w-full px-3 py-2.5 text-left transition-colors hover:bg-slate-50',
                      !n.readAt && 'border-l-[3px] border-l-amber-500 bg-amber-50/60',
                    )}
                    onClick={() => void handleOpenItem(n)}
                  >
                    <p className="text-xs font-bold text-slate-900">{n.title}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-600">{n.message}</p>
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
