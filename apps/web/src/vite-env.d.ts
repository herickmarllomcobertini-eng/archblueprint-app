/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" = ler /data/<pagina>.json (hospedagem estatica gratuita) em vez da API */
  readonly VITE_STATIC_DATA?: string;
}
