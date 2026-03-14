/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_PATH?: string;
  readonly VITE_BACKEND_ORIGIN?: string;
  readonly VITE_API_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
