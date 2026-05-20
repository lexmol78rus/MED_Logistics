import { apiFetch } from './client';
import type { WarehouseSettings } from '../settings/storage';

export function fetchSettings() {
  return apiFetch<WarehouseSettings>('/settings');
}

export function patchSettings(changes: Partial<WarehouseSettings>) {
  return apiFetch<WarehouseSettings>('/settings', {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
}
