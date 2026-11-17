/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Distintivo de entorno en la cabecera (sección 9.2). Opcional; vacío en Producción. */
  readonly VITE_ENVIRONMENT_LABEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
