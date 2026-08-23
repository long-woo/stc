interface ImportMetaEnv {
  readonly VITE_API_MODE?: "mock" | "remote";
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
