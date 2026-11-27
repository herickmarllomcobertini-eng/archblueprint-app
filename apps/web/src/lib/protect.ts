/**
 * Modo protegido (beta): o conteudo sensivel chega cifrado (AES-GCM) em /c/<nome>.bin.
 * A chave de cada arquivo so e entregue pela API (/api/key) a quem tem um token valido,
 * pedido a partir do proprio site. Aqui: token, chave, decifrar e trocar /media/... por blob:.
 */
let token: { value: string; exp: number } | null = null;
let tokenPending: Promise<string> | null = null;
let mediaMap: Record<string, string> = {};
const mediaCache = new Map<string, Promise<string>>();

export function setMediaMap(map: Record<string, string> | undefined) {
  mediaMap = map ?? {};
}

async function getToken(force = false): Promise<string> {
  if (!force && token && token.exp - 20_000 > Date.now()) return token.value;
  if (!tokenPending) {
    tokenPending = fetch('/api/token', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`token ${r.status}`);
        const j = (await r.json()) as { token: string; expiresIn: number };
        token = { value: j.token, exp: Date.now() + j.expiresIn * 1000 };
        return j.token;
      })
      .finally(() => {
        tokenPending = null;
      });
  }
  return tokenPending;
}

async function fetchKey(name: string): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const t = await getToken(attempt > 0);
    const r = await fetch(`/api/key?c=${name}`, { headers: { Authorization: `Bearer ${t}` }, cache: 'no-store' });
    if (r.status === 401 && attempt === 0) continue; // token vencido: pede outro e tenta de novo
    if (!r.ok) throw new Error(`key ${r.status}`);
    return ((await r.json()) as { key: string }).key;
  }
  throw new Error('key: sem acesso');
}

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function decryptBlob(name: string): Promise<ArrayBuffer> {
  const [keyB64, res] = await Promise.all([fetchKey(name), fetch(`/c/${name}.bin`)]);
  if (!res.ok) throw new Error(`blob ${name}: ${res.status}`);
  const data = new Uint8Array(await res.arrayBuffer());
  const key = await crypto.subtle.importKey('raw', b64ToBytes(keyB64), 'AES-GCM', false, ['decrypt']);
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: data.slice(0, 12), additionalData: new TextEncoder().encode(name) },
    key,
    data.slice(12),
  );
}

function mediaUrl(path: string): Promise<string> {
  const name = mediaMap[path];
  if (!name) return Promise.resolve(path);
  let p = mediaCache.get(path);
  if (!p) {
    p = decryptBlob(name)
      .then((buf) => URL.createObjectURL(new Blob([buf], { type: 'image/avif' })))
      .catch((e) => {
        console.error('imagem', path, e);
        mediaCache.delete(path);
        return path;
      });
    mediaCache.set(path, p);
  }
  return p;
}

const MEDIA_RE = /\/media\/(?!fundos\/)[a-z0-9-]+\/[a-z0-9-]+\.avif/g;

/** Troca cada /media/<pasta>/<arquivo>.avif do texto pelo blob: da imagem ja decifrada. */
export async function gateMediaText(text: string): Promise<string> {
  const paths = [...new Set(text.match(MEDIA_RE) ?? [])];
  const urls = new Map(await Promise.all(paths.map(async (p) => [p, await mediaUrl(p)] as const)));
  return text.replace(MEDIA_RE, (m) => urls.get(m) ?? m);
}

/** Baixa e decifra um pedaco de conteudo (episodio, ficha, camadas). */
export async function fetchChunk<T>(name: string): Promise<T> {
  const buf = await decryptBlob(name);
  return JSON.parse(await gateMediaText(new TextDecoder().decode(buf))) as T;
}
