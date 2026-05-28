export const appBuildId =
  import.meta.env.VITE_APP_BUILD ?? 'development';

import { APP_TIMEZONE } from './datetime';

export const appBuildCommit =
  import.meta.env.VITE_APP_BUILD_COMMIT ?? 'unknown';

/** Human-readable label for Settings footer, e.g. "2026-05-20 14:33". */
export function formatBuildLabel(buildIso: string): string {
  if (buildIso === 'development') return 'development';
  const d = new Date(buildIso);
  if (Number.isNaN(d.getTime())) return buildIso;
  const parts = new Intl.DateTimeFormat('ru-RU', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

export type VersionJson = {
  build: string;
  commit: string;
};
