'use strict';
const g = require('../server/gate');

// Entrega a chave de UM arquivo cifrado, so com token valido (e do mesmo navegador).
module.exports = (req, res) => {
  if (req.method !== 'GET') return g.send(res, 405, { error: 'method' });
  if (!g.master()) return g.send(res, 500, { error: 'CHUNK_SECRET ausente ou curto demais' });
  if (!g.sameSite(req)) return g.send(res, 403, { error: 'forbidden' });
  const m = /^Bearer (.+)$/.exec(String(req.headers.authorization || ''));
  const claims = m ? g.verify(m[1]) : null;
  if (!claims || claims.ua !== g.uaHash(req)) return g.send(res, 401, { error: 'token' });
  if (g.limited(req, 'key', 200)) return g.send(res, 429, { error: 'rate' });
  const name = new URL(req.url, 'http://x').searchParams.get('c') || '';
  if (!/^[a-f0-9]{24}$/.test(name)) return g.send(res, 400, { error: 'nome' });
  g.send(res, 200, { key: g.keyFor(name).toString('base64') });
};
