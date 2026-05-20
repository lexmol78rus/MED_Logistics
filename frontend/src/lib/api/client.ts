import { apiBaseUrl } from '../../config/env';
import { refreshTokens } from './auth';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';
import type { ApiErrorBody } from '../../types/api';
import { mapApiMessageForUi } from '../uiTerminology';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

let refreshInFlight: Promise<boolean> | null = null;

function getAuthHeaders(): HeadersInit {
  const token = useAuthStore.getState().accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function tryRefreshSession(): Promise<boolean> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return false;

  if (!refreshInFlight) {
    refreshInFlight = refreshTokens(refreshToken)
      .then((tokens) => {
        useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken);
        if (tokens.user) {
          useUserStore.getState().setUser({
            userId: tokens.user.id,
            email: tokens.user.email,
            role: tokens.user.role,
          });
        }
        return true;
      })
      .catch(() => {
        useAuthStore.getState().clearAuth();
        useUserStore.getState().clearUser();
        return false;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

function forceLogout() {
  useAuthStore.getState().clearAuth();
  useUserStore.getState().clearUser();
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  const body = (await response.json().catch(() => ({}))) as T & ApiErrorBody;

  if (response.status === 401 && !retried) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return apiFetch<T>(path, options, true);
    }
    forceLogout();
    throw new ApiError('Сессия истекла', 401);
  }

  if (!response.ok) {
    const message = Array.isArray(body.message)
      ? body.message.join(', ')
      : body.message;
    const rawMessage = message || `Ошибка запроса (${response.status})`;
    const errorMessage = mapApiMessageForUi(rawMessage);
    console.error('[API]', options.method ?? 'GET', `${apiBaseUrl}${path}`, response.status, body);

    if (response.status === 403) {
      throw new ApiError(errorMessage || 'Недостаточно прав', 403);
    }

    throw new ApiError(errorMessage, response.status);
  }

  return body as T;
}

export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
