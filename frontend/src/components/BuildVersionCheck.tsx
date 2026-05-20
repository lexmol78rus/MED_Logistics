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

    void fetch('/version.json', {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((remote: VersionJson | null) => {
        if (!remote?.build || notified.current) return;
        if (remote.build !== appBuildId) {
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
