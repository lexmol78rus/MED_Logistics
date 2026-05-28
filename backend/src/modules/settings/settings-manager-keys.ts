import { PatchSettingsDto } from './dto/patch-settings.dto';

/** Warehouse settings a manager may change (FEFO + expiry thresholds). */
export const MANAGER_PATCHABLE_SETTING_KEYS = [
  'fefoEnabled',
  'fefoStrict',
  'expiryWarningDays',
  'expiryCriticalDays',
] as const satisfies readonly (keyof PatchSettingsDto)[];

export function pickManagerSettingsPatch(dto: PatchSettingsDto): PatchSettingsDto {
  const picked: PatchSettingsDto = {};
  for (const key of MANAGER_PATCHABLE_SETTING_KEYS) {
    if (dto[key] !== undefined) {
      (picked as Record<string, unknown>)[key] = dto[key];
    }
  }
  return picked;
}
