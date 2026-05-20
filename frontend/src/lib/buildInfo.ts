export const appBuildId =
  import.meta.env.VITE_APP_BUILD ?? 'development';

export const appBuildCommit =
  import.meta.env.VITE_APP_BUILD_COMMIT ?? 'unknown';

/** Human-readable label for Settings footer, e.g. "2026-05-20 14:33". */
export function formatBuildLabel(buildIso: string): string {
  if (buildIso === 'development') return 'development';
  const d = new Date(buildIso);
  if (Number.isNaN(d.getTime())) return buildIso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type VersionJson = {
  build: string;
  commit: string;
};
