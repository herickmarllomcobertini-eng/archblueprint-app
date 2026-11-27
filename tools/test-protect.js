#!/usr/bin/env node
'use strict';
/**
 * Teste de ponta a ponta do modo protegido (sem React):
 *   fixture (JSON da API) -> scripts/protect.js -> funcoes /api/token e /api/key ->
 *   biblioteca do navegador (src/lib/protect.ts + api.ts) lendo tudo e comparando com o original.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ptest-'));
const FULL = path.join(TMP, 'full');
const PROT = path.join(TMP, 'prot');
const SECRET = 'segredo-de-teste-com-mais-de-24-chars';
process.env.CHUNK_SECRET = SECRET;
process.env.PROTECT_ROOT = PROT;

let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; console.log('  ok  ' + msg); };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); passed++; console.log('  ok  ' + msg); };

// ---------- 1) fixture + protect
for (const d of [FULL, PROT]) execFileSync('python3', [path.join(REPO, 'tools/make_fixture.py'), d], { stdio: 'ignore' });
execFileSync('node', [path.join(REPO, 'scripts/protect.js')], { env: process.env, stdio: 'inherit' });
const readJson = (root, f) => JSON.parse(fs.readFileSync(path.join(root, 'apps/web/public/data', f), 'utf8'));

// ---------- 2) nada legivel vazou
console.log('\n[1] conteudo nao aparece em arquivos publicos');
const strip = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const fullHome = readJson(FULL, 'home.json');
const fullHier = readJson(FULL, 'hierarquia.json');
const samples = [];
for (const e of fullHome.episodes.slice(0, 12)) { const t = strip(e.bodyHtml); if (t.length > 120) samples.push(t.slice(60, 110)); }
for (const l of fullHier.layerGroups.flatMap((g) => g.layers).slice(0, 12)) { const t = strip(l.bodyHtml); if (t.length > 80) samples.push(t.slice(20, 60)); }
for (const c of fullHome.characterGroups.flatMap((g) => g.characters).slice(0, 8)) {
  for (const p of c.parts) for (const fp of p.fieldParts || []) if (fp.t === 'value' && strip(fp.html).length > 60) samples.push(strip(fp.html).slice(10, 50));
}
ok(samples.length >= 20, `${samples.length} trechos de texto separados para procurar`);
let leaks = 0;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const f of walk(path.join(PROT, 'apps/web/public'))) {
  const buf = fs.readFileSync(f);
  for (const s of samples) if (buf.includes(Buffer.from(s, 'utf8'))) { leaks++; console.log('  VAZOU', s, 'em', f); }
}
eq(leaks, 0, 'nenhum trecho de episodio/ficha/camada aparece em public/ (data, c, media)');
const left = walk(path.join(PROT, 'apps/web/public/media')).map((f) => path.relative(PROT, f));
ok(left.every((f) => f.includes('/fundos/')), 'em public/media so sobra fundos/ (' + left.join(', ') + ')');
const protHome = readJson(PROT, 'home.json');
ok(protHome.protected === true && protHome.episodes.every((e) => e.bodyHtml === '' && e.chunk), 'esqueleto: episodios sem texto e com referencia ao pedaco');

// ---------- 3) funcoes da API
console.log('\n[2] funcoes /api/token e /api/key');
const token = require(path.join(REPO, 'api/token.js'));
const key = require(path.join(REPO, 'api/key.js'));
const gate = require(path.join(REPO, 'server/gate.js'));
const call = (handler, { url, method = 'GET', headers = {}, ip = '10.0.0.1' }) => new Promise((resolve) => {
  const req = { url, method, headers: { 'x-forwarded-for': ip, ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])) }, socket: {} };
  const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { resolve({ status: this.statusCode, headers: this.headers, body: b ? JSON.parse(b) : null }); } };
  handler(req, res);
});
const SITE = { host: 'site.test', 'sec-fetch-site': 'same-origin', referer: 'https://site.test/', 'user-agent': 'UA-1' };
let r = await0();
function await0() { return null; }
(async () => {
  r = await call(token, { url: '/api/token', headers: { host: 'site.test' }, ip: '1.1.1.1' });
  eq(r.status, 403, 'curl sem cabecalhos do navegador: token negado (403)');
  r = await call(token, { url: '/api/token', headers: { ...SITE, 'sec-fetch-site': 'cross-site' }, ip: '1.1.1.2' });
  eq(r.status, 403, 'pedido de outro site (cross-site): negado');
  r = await call(token, { url: '/api/token', headers: { ...SITE, referer: 'https://outro.test/' }, ip: '1.1.1.3' });
  eq(r.status, 403, 'Referer de outro dominio: negado');
  r = await call(token, { url: '/api/token', headers: SITE, ip: '1.1.1.4' });
  eq(r.status, 200, 'pedido do proprio site: token entregue');
  const tk = r.body.token;
  const name = Object.values(protHome.mediaMap)[0];
  r = await call(key, { url: `/api/key?c=${name}`, headers: SITE, ip: '1.1.1.5' });
  eq(r.status, 401, 'chave sem token: negada (401)');
  r = await call(key, { url: `/api/key?c=${name}`, headers: { ...SITE, authorization: 'Bearer ' + tk }, ip: '1.1.1.6' });
  eq(r.status, 200, 'chave com token valido: entregue');
  eq(Buffer.from(r.body.key, 'base64').equals(gate.keyFor(name)), true, 'chave entregue e a derivada do segredo');
  r = await call(key, { url: `/api/key?c=${name}`, headers: { ...SITE, authorization: 'Bearer ' + tk, 'user-agent': 'OUTRO' }, ip: '1.1.1.7' });
  eq(r.status, 401, 'token usado por outro navegador (User-Agent diferente): negado');
  const bad = tk.slice(0, -3) + (tk.endsWith('AAA') ? 'BBB' : 'AAA');
  r = await call(key, { url: `/api/key?c=${name}`, headers: { ...SITE, authorization: 'Bearer ' + bad }, ip: '1.1.1.8' });
  eq(r.status, 401, 'token adulterado: negado');
  r = await call(key, { url: '/api/key?c=../../etc/passwd', headers: { ...SITE, authorization: 'Bearer ' + tk }, ip: '1.1.1.9' });
  eq(r.status, 400, 'nome invalido (path traversal): recusado');
  const realNow = Date.now;
  Date.now = () => realNow() + (gate.TOKEN_TTL + 5) * 1000;
  r = await call(key, { url: `/api/key?c=${name}`, headers: { ...SITE, authorization: 'Bearer ' + tk }, ip: '1.1.1.10' });
  Date.now = realNow;
  eq(r.status, 401, 'token vencido (>10 min): negado');
  let last;
  for (let i = 0; i < 32; i++) last = await call(token, { url: '/api/token', headers: SITE, ip: '2.2.2.2' });
  eq(last.status, 429, 'rajada de pedidos do mesmo IP: limitada (429)');

  // ---------- 4) biblioteca do navegador, ponta a ponta
  console.log('\n[3] biblioteca do navegador (protect.ts + api.ts) lendo o site protegido');
  const CLI = path.join(TMP, 'client');
  fs.mkdirSync(CLI, { recursive: true });
  for (const f of ['protect.ts', 'api.ts', 'types.ts']) {
    const src = fs.readFileSync(path.join(REPO, 'apps/web/src/lib', f), 'utf8').replace(/import\.meta\.env/g, "({ VITE_STATIC_DATA: 'true' } as Record<string, string>)");
    fs.writeFileSync(path.join(CLI, f), src);
  }
  const tsc = fs.existsSync('/opt/npm-tools/node_modules/typescript/bin/tsc') ? '/opt/npm-tools/node_modules/typescript/bin/tsc' : require.resolve('typescript/bin/tsc');
  execFileSync('node', [tsc, '--module', 'commonjs', '--target', 'es2022', '--lib', 'es2022,dom', '--strict', '--skipLibCheck', '--outDir', path.join(CLI, 'out'),
    path.join(CLI, 'protect.ts'), path.join(CLI, 'api.ts'), path.join(CLI, 'types.ts')], { stdio: 'inherit' });

  // mocks de navegador
  const sha = (b) => crypto.createHash('sha1').update(b).digest('hex');
  const mediaByHash = {};
  for (const f of walk(path.join(FULL, 'apps/web/public/media'))) mediaByHash[sha(fs.readFileSync(f))] = '/' + path.relative(path.join(FULL, 'apps/web/public'), f);
  globalThis.Blob = class { constructor(parts, opts) { this.buf = Buffer.from(parts[0]); this.type = (opts || {}).type; } };
  globalThis.URL = Object.assign(class extends URL {}, { createObjectURL: (b) => { const p = mediaByHash[sha(b.buf)]; if (!p) throw new Error('imagem desconhecida'); return 'blob:test' + p; } });
  const pub = path.join(PROT, 'apps/web/public');
  const reply = (status, buf) => ({ ok: status < 400, status, text: async () => buf.toString('utf8'), json: async () => JSON.parse(buf.toString('utf8')), arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) });
  let apiCalls = 0;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith('/data/') || u.startsWith('/c/')) { const f = path.join(pub, u); return fs.existsSync(f) ? reply(200, fs.readFileSync(f)) : reply(404, Buffer.from('')); }
    apiCalls++;
    const headers = { ...SITE, 'x-forwarded-for': '9.9.9.9', ...(init.headers || {}) };
    const h = u.startsWith('/api/token') ? token : key;
    const out = await call(h, { url: u, headers: { ...headers, authorization: (init.headers || {}).Authorization }, ip: '9.9.9.9' });
    return reply(out.status, Buffer.from(JSON.stringify(out.body)));
  };
  const lib = require(path.join(CLI, 'out/api.js'));

  const toBlob = (s) => s.replace(/\/media\/(?!fundos\/)[a-z0-9-]+\/[a-z0-9-]+\.avif/g, (m) => 'blob:test' + m);
  const page = await lib.fetchPage('home');
  ok(page.protected && page.episodes.length === fullHome.episodes.length, 'fetchPage(home) devolve o esqueleto com ' + page.episodes.length + ' episodios');
  const txt = JSON.stringify(page);
  ok(!/(?<!blob:test)\/media\/(?!fundos)/.test(txt) && txt.includes('blob:test/media/'), 'imagens da pagina viraram blob: (decifradas), sem caminho /media/ publico sobrando');
  eq(JSON.stringify(page.entityGroups), toBlob(JSON.stringify(fullHome.entityGroups)), 'cards de entidades (publicos) identicos ao original, com imagens em blob:');

  let nChunks = 0;
  for (const e of page.episodes) {
    const c = await lib.fetchChunk(e.chunk);
    const orig = fullHome.episodes.find((x) => x.slug === e.slug);
    eq(c, { bodyHtml: orig.bodyHtml, afterHtml: orig.afterHtml }, `episodio ${e.slug}`.padEnd(34)); nChunks++;
  }
  for (const g of page.characterGroups) for (const ch of g.characters) {
    const c = await lib.fetchChunk(ch.chunk);
    const orig = fullHome.characterGroups.flatMap((x) => x.characters).find((x) => x.id === ch.id);
    eq(JSON.stringify(c), toBlob(JSON.stringify({ parts: orig.parts })), `ficha ${ch.name}`.padEnd(34)); nChunks++;
  }
  const hier = await lib.fetchPage('hierarquia');
  for (const g of hier.layerGroups) {
    const c = await lib.fetchChunk(g.chunk);
    const orig = fullHier.layerGroups.find((x) => x.id === g.id);
    eq(JSON.stringify(c.group), toBlob(JSON.stringify(orig)), `camadas/auréolas ${g.id}`.padEnd(34));
    ok(c.camadaGroups.every((cg) => fullHier.camadaGroups.some((o) => o.id === cg.id)), `  grupos de camadas aninhados em ${g.id}: ${c.camadaGroups.length}`); nChunks++;
  }
  for (const g of hier.characterGroups) for (const ch of g.characters) {
    const c = await lib.fetchChunk(ch.chunk);
    const orig = fullHier.characterGroups.flatMap((x) => x.characters).find((x) => x.id === ch.id);
    eq(JSON.stringify(c), toBlob(JSON.stringify({ parts: orig.parts })), `ficha(hierarquia) ${ch.name}`.padEnd(34)); nChunks++;
  }
  console.log(`\n${nChunks} pedaços decifrados e iguais ao original; ${apiCalls} chamadas à API`);

  // token vence no meio da sessao: a biblioteca pede outro sozinha
  Date.now = () => realNow() + (gate.TOKEN_TTL + 30) * 1000;
  const again = await lib.fetchChunk(page.episodes[0].chunk);
  Date.now = realNow;
  ok(again.bodyHtml.length > 0, 'depois de 10 min o token vence e a biblioteca renova sozinha');

  // quanto texto visivel sobrou publico?
  const vis = (p) => [p.blocks.map((b) => strip(b.html)).join(' '), p.glossary.map((g) => strip(g.defHtml)).join(' ')].join(' ').length;
  const pubChars = vis(readJson(PROT, 'home.json')) + vis(readJson(PROT, 'hierarquia.json'));
  const allChars = [...fullHome.episodes.map((e) => strip(e.bodyHtml)), ...fullHier.layerGroups.flatMap((g) => g.layers.map((l) => strip(l.bodyHtml)))].join(' ').length;
  console.log(`texto de episodios+camadas/auréolas agora cifrado: ${(allChars / 1000).toFixed(0)} mil caracteres; texto de blocos+glossario ainda público: ${(pubChars / 1000).toFixed(0)} mil caracteres`);
  console.log(`\nTODOS OS TESTES PASSARAM (${passed} verificações)`);
  fs.rmSync(TMP, { recursive: true, force: true });
})().catch((e) => { console.error('\nFALHOU:', e); process.exit(1); });
