import { apiBaseUrl } from '../../config/env';
import type { RoleTemplatesMap } from '../../stores/roleTemplatesStore';
import type { PermissionOverrides, UserRole } from '../rbac/permissions';

export type LoginResponse = {
  accessToken?: string;
  access_token?: string;
  refreshToken?: string;
  refresh_token?: string;
  user?: {
    id: string;
    email: string;
    role: UserRole;
    permissions?: PermissionOverrides | null;
  };
  roleTemplates?: RoleTemplatesMap;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string | null;
  user: LoginResponse['user'];
  roleTemplates?: RoleTemplatesMap;
};

export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<AuthTokens> {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const body = (await response.json().catch(() => ({}))) as LoginResponse & {
    message?: string | string[];
  };

  if (!response.ok) {
    const message = Array.isArray(body.message)
      ? body.message.join(', ')
      : body.message;
    throw new Error(message || 'Не удалось выполнить вход');
  }

  const accessToken = body.accessToken ?? body.access_token;
  if (!accessToken) {
    throw new Error('Сервер не вернул токен доступа');
  }

  return {
    accessToken,
    refreshToken: body.refreshToken ?? body.refresh_token ?? null,
    user: body.user,
    roleTemplates: body.roleTemplates,
  };
}

export async function refreshTokens(
  refreshToken: string,
): Promise<AuthTokens> {
  const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const body = (await response.json().catch(() => ({}))) as LoginResponse & {
    message?: string | string[];
  };

  if (!response.ok) {
    const message = Array.isArray(body.message)
      ? body.message.join(', ')
      : body.message;
    throw new Error(message || 'Сессия истекла');
  }

  const accessToken = body.accessToken ?? body.access_token;
  if (!accessToken) {
    throw new Error('Сервер не вернул токен доступа');
  }

  return {
    accessToken,
    refreshToken: body.refreshToken ?? body.refresh_token ?? null,
    user: body.user,
    roleTemplates: body.roleTemplates,
  };
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const response = await fetch(`${apiBaseUrl}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(body.message || 'Не удалось отправить запрос');
  }

  return { message: body.message ?? 'Письмо со ссылкой отправлено' };
}

export async function resetPasswordWithToken(
  token: string,
  password: string,
): Promise<{ success: boolean }> {
  const response = await fetch(`${apiBaseUrl}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    message?: string | string[];
  };

  if (!response.ok) {
    const message = Array.isArray(body.message)
      ? body.message.join(', ')
      : body.message;
    throw new Error(message || 'Ссылка восстановления недействительна');
  }

  return { success: true };
}

export async function logoutApi(): Promise<void> {
  const { useAuthStore } = await import('../../stores/authStore');
  const token = useAuthStore.getState().accessToken;
  if (!token) return;

  await fetch(`${apiBaseUrl}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  }).catch(() => undefined);
}
