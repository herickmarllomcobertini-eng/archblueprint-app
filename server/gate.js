'use strict';
/**
 * Portao do modo protegido (beta).
 * - CHUNK_SECRET (variavel de ambiente) e o segredo mestre: gera nomes, chaves e tokens.
 * - Os pedacos de conteudo e as imagens ficam cifrados (AES-256-GCM) em arquivos publicos /c/<nome>.bin.
 * - So a API entrega a chave de cada arquivo, e so para quem tem um token JWT valido
 *   e pede a partir do proprio dominio do site.
 */
const crypto = require('crypto');

const TOKEN_TTL = 600; // segundos

function master() {
  const m = process.env.CHUNK_SECRET;
  return m && m.length >= 24 ? m : null;
}
const mac = (label, data) => crypto.createHmac('sha256', master()).update(`${label}:${data}`).digest();

/** Nome do arquivo cifrado: muda quando o conteudo muda (cache longo e seguro) e nao revela nada. */
function blobName(kind, id, plain) {
  const h = crypto.createHash('sha256').update(plain).digest('hex');
  return mac('name', `${kind}:${id}:${h}`).toString('hex').slice(0, 24);
}
const keyFor = (name) => mac('key', name); // 32 bytes = AES-256

/** Formato: IV(12) + texto cifrado + tag(16). Mesmo formato que o WebCrypto do navegador le. */
function encrypt(plain, name) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', keyFor(name), iv);
  c.setAAD(Buffer.from(name));
  const enc = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([iv, enc, c.getAuthTag()]);
}

// ---- JWT (HS256) sem dependencias
const b64u = (b) => Buffer.from(b).toString('base64url');
const HEADER = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const jwtKey = () => mac('jwt', 'v1');

function sign(claims, ttl = TOKEN_TTL) {
  const now = Math.floor(Date.now() / 1000);
  const body = b64u(JSON.stringify({ ...claims, iat: now, exp: now + ttl, jti: crypto.randomBytes(8).toString('hex') }));
  const sig = crypto.createHmac('sha256', jwtKey()).update(`${HEADER}.${body}`).digest('base64url');
  return `${HEADER}.${body}.${sig}`;
}

function verify(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || parts[0] !== HEADER) return null;
  const expected = crypto.createHmac('sha256', jwtKey()).update(`${parts[0]}.${parts[1]}`).digest();
  const given = Buffer.from(parts[2], 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  let claims;
  try { claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')); } catch { return null; }
  if (typeof claims.exp !== 'number' || claims.exp < Math.floor(Date.now() / 1000)) return null;
  return claims;
}

const uaHash = (req) =>
  crypto.createHash('sha256').update(String(req.headers['user-agent'] || '')).digest('hex').slice(0, 16);

/** So aceita pedidos feitos pelo proprio site (navegador): mesma origem e Referer do mesmo dominio. */
function sameSite(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
  const allowed = new Set([host, ...String(process.env.ALLOWED_HOSTS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)]);
  const sfs = req.headers['sec-fetch-site'];
  const ref = req.headers.referer || req.headers.origin;
  if (sfs && sfs !== 'same-origin') return false;
  if (!sfs && !ref) return false;
  if (ref) {
    try { if (!allowed.has(new URL(ref).host.toLowerCase())) return false; } catch { return false; }
  }
  return true;
}

// Limite simples por IP (vale por instancia; o limite forte fica no firewall da Vercel)
const hits = new Map();
function limited(req, bucket, max, windowMs = 60000) {
  const ip = String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '').split(',')[0].trim();
  const slot = Math.floor(Date.now() / windowMs);
  const key = `${bucket}:${ip}:${slot}`;
  const n = (hits.get(key) || 0) + 1;
  hits.set(key, n);
  if (hits.size > 5000) for (const k of hits.keys()) if (!k.endsWith(`:${slot}`)) hits.delete(k);
  return n > max;
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.end(JSON.stringify(body));
}

module.exports = { TOKEN_TTL, master, blobName, keyFor, encrypt, sign, verify, uaHash, sameSite, limited, send };
