/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_ENV: string;
  readonly VITE_APP_BUILD: string;
  readonly VITE_APP_BUILD_COMMIT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
