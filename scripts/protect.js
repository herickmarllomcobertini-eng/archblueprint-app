#!/usr/bin/env node
'use strict';
/**
 * Modo protegido (beta). Roda depois do export estatico (apps/web/public/data/*.json completos):
 *  1. cifra o conteudo sensivel (texto dos episodios, fichas, auréolas/camadas) em pedacos
 *     apps/web/public/c/<nome>.bin e deixa nos JSON publicos so o "esqueleto" (titulos, listas);
 *  2. cifra as imagens .avif (exceto fundos/, usadas direto pelo CSS);
 *  3. grava em cada pagina a referencia de cada pedaco e o mapa de imagens.
 * Precisa de CHUNK_SECRET (>= 24 caracteres) no ambiente.
 */
const fs = require('fs');
const path = require('path');
const gate = require('../server/gate');

const ROOT = path.resolve(process.env.PROTECT_ROOT || path.join(__dirname, '..'));
const PUB = path.join(ROOT, 'apps/web/public');
const DATA = path.join(PUB, 'data');
const OUT = path.join(PUB, 'c');
const KEEP_PUBLIC = new Set(['fundos']);

if (!gate.master()) {
  console.error('ERRO: defina CHUNK_SECRET (minimo 24 caracteres) em Vercel > Settings > Environment Variables.');
  process.exit(1);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
let blobs = 0;
let blobBytes = 0;

function writeBlob(kind, id, plain) {
  const name = gate.blobName(kind, id, plain);
  const enc = gate.encrypt(plain, name);
  fs.writeFileSync(path.join(OUT, `${name}.bin`), enc);
  blobs++;
  blobBytes += enc.length;
  return name;
}
const chunk = (kind, id, obj) => writeBlob(kind, id, Buffer.from(JSON.stringify(obj), 'utf8'));

// 1) imagens
const mediaMap = {};
const mediaDir = path.join(PUB, 'media');
if (fs.existsSync(mediaDir)) {
  for (const folder of fs.readdirSync(mediaDir)) {
    const dir = path.join(mediaDir, folder);
    if (!fs.statSync(dir).isDirectory() || KEEP_PUBLIC.has(folder)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.avif')) continue;
      const buf = fs.readFileSync(path.join(dir, file));
      mediaMap[`/media/${folder}/${file}`] = writeBlob('media', `${folder}/${file}`, buf);
      fs.unlinkSync(path.join(dir, file));
    }
    if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  }
}

// 2) paginas
const MARK = /<!--@camadas:([^>]+?)-->/g;
const refs = (s) => [...String(s || '').matchAll(MARK)].map((m) => m[1]);
let removedChars = 0;

for (const file of fs.readdirSync(DATA).filter((f) => f.endsWith('.json'))) {
  const full = JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'));
  if (full.protected) throw new Error(`${file} ja esta protegido (rode o export estatico de novo antes)`);

  for (const e of full.episodes || []) {
    e.chunk = chunk('episodes', e.slug, { bodyHtml: e.bodyHtml, afterHtml: e.afterHtml });
    removedChars += (e.bodyHtml || '').length + (e.afterHtml || '').length;
    e.bodyHtml = '';
    e.afterHtml = '';
  }

  for (const grp of full.characterGroups || []) {
    for (const c of grp.characters) {
      c.chunk = chunk('characters', String(c.id), { parts: c.parts });
      removedChars += JSON.stringify(c.parts).length;
      c.parts = [];
    }
  }

  const usedCamadas = new Set();
  const blocksText = (full.blocks || []).map((b) => b.html).join('\n');
  for (const g of full.layerGroups || []) {
    const wanted = new Set(refs(g.trailingHtml));
    for (const l of g.layers) for (const f of ['beforeHtml', 'numHtml', 'preNameHtml', 'bodyHtml']) refs(l[f]).forEach((r) => wanted.add(r));
    const camadaGroups = (full.camadaGroups || []).filter((cg) => wanted.has(cg.id));
    const snapshot = JSON.parse(JSON.stringify(g));
    g.chunk = chunk('layers', g.id, { group: snapshot, camadaGroups });
    removedChars += JSON.stringify(snapshot).length + JSON.stringify(camadaGroups).length;
    camadaGroups.forEach((cg) => usedCamadas.add(cg.id));
    g.layers = [];
    g.trailingHtml = '';
  }
  // grupos de camadas usados direto em blocos publicos continuam publicos
  full.camadaGroups = (full.camadaGroups || []).filter((cg) => !usedCamadas.has(cg.id) || blocksText.includes(`@camadas:${cg.id}`));

  full.protected = true;
  full.mediaMap = mediaMap;
  fs.writeFileSync(path.join(DATA, file), JSON.stringify(full));
  console.log(`protegido: data/${file}`);
}

console.log(`${blobs} arquivos cifrados em public/c (${(blobBytes / 1024).toFixed(0)} KB); ` +
  `${(removedChars / 1024).toFixed(0)} KB de texto sairam dos JSON publicos; ${Object.keys(mediaMap).length} imagens cifradas.`);
