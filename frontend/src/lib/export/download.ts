import { apiBaseUrl } from '../../config/env';
import { useAuthStore } from '../../stores/authStore';

export type ExportResource = 'products' | 'lots' | 'movements' | 'expiry';

export type ExportOptions = {
  today?: boolean;
  filename?: string;
};

export async function downloadExport(
  resource: ExportResource,
  options: ExportOptions = {},
) {
  const token = useAuthStore.getState().accessToken;
  const params = new URLSearchParams({ format: 'csv' });
  if (options.today) params.set('today', 'true');
  const url = `${apiBaseUrl}/export/${resource}?${params.toString()}`;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error(`Ошибка экспорта (${response.status})`);
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition');
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const date = new Date().toISOString().slice(0, 10);
  const defaultName =
    resource === 'movements' && options.today
      ? `movements_shift_${date}.csv`
      : `${resource}.csv`;
  const filename = options.filename ?? match?.[1] ?? defaultName;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
