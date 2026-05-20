/**
 * Build-time API base URL (Vite). Production default: same-origin /api/v1 via nginx.
 */
export const apiBaseUrl =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api/v1';

export const appEnv = import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE;

export const isProduction = appEnv === 'production';
