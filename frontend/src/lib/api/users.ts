import { apiFetch } from './client';
import { clampPageSize } from '../pagination';
import type { UserRole } from '../rbac/permissions';
import { ROLE_LABELS } from '../rbac/permissions';

export type UserProfile = {
  userId: string;
  email: string;
  role: UserRole;
};

export type MeResponse = {
  user: UserProfile;
};

export type UserListItem = {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function userDisplayName(user: Pick<UserListItem, 'displayName' | 'email'>): string {
  if (user.displayName?.trim()) return user.displayName.trim();
  const local = user.email.split('@')[0] ?? user.email;
  return local.replace(/[._-]/g, ' ');
}

export type UsersListResponse = {
  items: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export function roleLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? role;
}

export function userInitials(email: string): string {
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || '??';
}

export function fetchMe() {
  return apiFetch<MeResponse>('/users/me');
}

export function fetchUsers(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(clampPageSize(params.pageSize)));
  if (params.search) qs.set('search', params.search);
  if (params.role) qs.set('role', params.role);
  const query = qs.toString();
  return apiFetch<UsersListResponse>(`/users${query ? `?${query}` : ''}`);
}

export function createUser(body: {
  displayName?: string;
  email: string;
  password: string;
  role: UserRole;
  isActive?: boolean;
}) {
  return apiFetch<UserListItem>('/users', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateUser(
  id: string,
  body: { role?: UserRole; isActive?: boolean },
) {
  return apiFetch<UserListItem>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function resetUserPassword(id: string, password: string) {
  return apiFetch<{ success: boolean }>(`/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export function deleteUser(id: string) {
  return apiFetch<{ success: boolean }>(`/users/${id}`, {
    method: 'DELETE',
  });
}
