import { apiFetch } from './client';
import {
  assertPatchPayloadClean,
  buildManagerSettingsPatchPayload,
  buildSettingsPatchPayload,
  pickWarehouseSettings,
  type WarehouseSettings,
} from '../settings/storage';

export async function fetchSettings(): Promise<WarehouseSettings> {
  const raw = await apiFetch<WarehouseSettings & Record<string, unknown>>('/settings');
  return pickWarehouseSettings(raw);
}

export async function patchSettings(
  changes: Partial<WarehouseSettings> & Record<string, unknown>,
  options?: { managerScope?: boolean },
): Promise<WarehouseSettings> {
  const payload = options?.managerScope
    ? buildManagerSettingsPatchPayload(changes)
    : buildSettingsPatchPayload(changes);
  assertPatchPayloadClean(payload as unknown as Record<string, unknown>);

  const saved = await apiFetch<WarehouseSettings & Record<string, unknown>>('/settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return pickWarehouseSettings(saved);
}
