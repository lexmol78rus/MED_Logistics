import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { appBuildId } from '../lib/buildInfo';

type VersionJson = {
  build: string;
  commit?: string;
};

/**
 * Compares embedded build id with live /version.json (no-cache).
 * Alerts when nginx/browser serves a stale JS bundle after deploy.
 */
export default function BuildVersionCheck() {
  const notified = useRef(false);

  useEffect(() => {
    if (appBuildId === 'development') return;

    const controller = new AbortController();
    const reloadKey = 'med-warehouse-ui-reload-build';

    void fetch('/version.json', {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((remote: VersionJson | null) => {
        if (!remote?.build || notified.current) return;
        if (remote.build !== appBuildId) {
          // Auto-reload once per remote build to avoid users stuck on stale bundles after deploy.
          // Guard against reload loops (e.g. misconfigured caching).
          try {
            const already = sessionStorage.getItem(reloadKey);
            if (already !== remote.build) {
              sessionStorage.setItem(reloadKey, remote.build);
              window.location.reload();
              return;
            }
          } catch {
            // ignore
          }
          notified.current = true;
          toast.info('Доступна новая версия интерфейса. Обновите страницу.', {
            duration: 12_000,
          });
        }
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  return null;
}
