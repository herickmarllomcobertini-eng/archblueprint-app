import { gateMediaText, setMediaMap } from './protect';
import type { PagePayload } from './types';

export { fetchChunk } from './protect';

// Modo estatico (Vercel gratis): os dados foram exportados do SQLite para /data/<pagina>.json.
// Modo normal: a API Nest entrega o mesmo JSON em /api/pages/<pagina>.
const STATIC = import.meta.env.VITE_STATIC_DATA === 'true';

export async function fetchPage(slug: string): Promise<PagePayload> {
  if (STATIC) {
    const res = await fetch(`/data/${slug}.json`);
    if (!res.ok) throw new Error(`Falha ao carregar "${slug}" (${res.status})`);
    const text = await res.text();
    const probe = JSON.parse(text) as PagePayload;
    if (!probe.protected) return probe;
    // modo protegido: decifra as imagens da pagina e troca os caminhos por blob:
    setMediaMap(probe.mediaMap);
    return JSON.parse(await gateMediaText(text)) as PagePayload;
  }
  const res = await fetch(`/api/pages/${slug}`);
  if (!res.ok) throw new Error(`Falha ao carregar "${slug}" (${res.status})`);
  return res.json();
}
