import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchNotifications, type NotificationItem } from '../api/notifications';
import { loadSettings } from '../settings/storage';
import { playNotificationBellSound, unlockNotificationAudio } from './notification-audio';

const POLL_MS = 60_000;
const POLL_MS_PANEL_OPEN = 30_000;

export function useNotificationPolling(panelOpen: boolean) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const unreadIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const poll = useCallback(async (options?: { silent?: boolean }) => {
    setLoading(true);
    try {
      const data = await fetchNotifications();
      const unreadItems = data.items.filter((n) => !n.readAt);
      const nextUnreadIds = new Set(unreadItems.map((n) => n.id));
      const count = data.unreadCount ?? unreadItems.length;

      const hadBaseline = initializedRef.current;
      const hasNewUnread = [...nextUnreadIds].some((id) => !unreadIdsRef.current.has(id));

      if (
        !options?.silent &&
        hadBaseline &&
        hasNewUnread &&
        count > 0 &&
        loadSettings().notificationEnabled !== false
      ) {
        void playNotificationBellSound();
      }

      unreadIdsRef.current = nextUnreadIds;
      initializedRef.current = true;
      setItems(data.items);
      setUnreadCount(count);
    } catch {
      if (!initializedRef.current) {
        setItems([]);
        setUnreadCount(0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void poll({ silent: true });

    const onFirstInteraction = () => {
      unlockNotificationAudio();
      document.removeEventListener('pointerdown', onFirstInteraction);
      document.removeEventListener('keydown', onFirstInteraction);
    };
    document.addEventListener('pointerdown', onFirstInteraction);
    document.addEventListener('keydown', onFirstInteraction);

    let timer: ReturnType<typeof setInterval> | null = null;

    const clearTimer = () => {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const schedule = () => {
      clearTimer();
      if (document.hidden) return;
      const ms = panelOpen ? POLL_MS_PANEL_OPEN : POLL_MS;
      timer = setInterval(() => void poll(), ms);
    };

    const onVisible = () => {
      if (!document.hidden) void poll();
      schedule();
    };

    const onFocus = () => {
      if (!document.hidden) void poll();
    };

    schedule();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);

    return () => {
      clearTimer();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('pointerdown', onFirstInteraction);
      document.removeEventListener('keydown', onFirstInteraction);
    };
  }, [poll, panelOpen]);

  return { items, unreadCount, loading, reload: poll };
}
