'use strict';
const g = require('../server/gate');

// Entrega um token de vida curta ao navegador do site.
module.exports = (req, res) => {
  if (req.method !== 'GET') return g.send(res, 405, { error: 'method' });
  if (!g.master()) return g.send(res, 500, { error: 'CHUNK_SECRET ausente ou curto demais' });
  if (!g.sameSite(req)) return g.send(res, 403, { error: 'forbidden' });
  if (g.limited(req, 'token', 30)) return g.send(res, 429, { error: 'rate' });
  g.send(res, 200, { token: g.sign({ ua: g.uaHash(req) }), expiresIn: g.TOKEN_TTL });
};
