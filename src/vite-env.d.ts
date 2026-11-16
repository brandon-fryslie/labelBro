/// <reference types="vite/client" />

// The VITE_* variables the app reads; Vite inlines them from the build environment.
interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_APP_VERSION?: string;
}
