import type { PagePayload } from './types';

// Modo estatico (Vercel gratis): os dados foram exportados do SQLite para /data/<pagina>.json.
// Modo normal: a API Nest entrega o mesmo JSON em /api/pages/<pagina>.
const STATIC = import.meta.env.VITE_STATIC_DATA === 'true';

export async function fetchPage(slug: string): Promise<PagePayload> {
  const res = await fetch(STATIC ? `/data/${slug}.json` : `/api/pages/${slug}`);
  if (!res.ok) throw new Error(`Falha ao carregar "${slug}" (${res.status})`);
  return res.json();
}
