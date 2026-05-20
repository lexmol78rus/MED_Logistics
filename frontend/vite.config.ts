import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFileSync, existsSync } from 'node:fs';
import path from 'path';
import { defineConfig } from 'vite';

function loadBuildEnv(): Record<string, string> {
  const envPath = path.resolve(__dirname, '.env.build');
  if (!existsSync(envPath)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m) out[m[1]] = m[2];
  }
  return out;
}

export default defineConfig(() => {
  const buildEnv = loadBuildEnv();
  return {
    envDir: '.',
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_APP_BUILD': JSON.stringify(
        buildEnv.VITE_APP_BUILD ?? 'development',
      ),
      'import.meta.env.VITE_APP_BUILD_COMMIT': JSON.stringify(
        buildEnv.VITE_APP_BUILD_COMMIT ?? 'unknown',
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
