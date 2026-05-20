import { apiFetch } from './client';

export type NotificationItem = {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  href?: string;
};

export type NotificationsResponse = {
  items: NotificationItem[];
  total: number;
  unreadCount?: number;
};

export function fetchNotifications() {
  return apiFetch<NotificationsResponse>('/notifications');
}

export function markNotificationRead(id: string) {
  return apiFetch<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead() {
  return apiFetch<{ success: boolean }>('/notifications/read-all', { method: 'PATCH' });
}
