import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { fail, publicUser } from './security.js';

export function tokens(db, { secret, ttl = '8h', issuer = 'gestaoos', audience = 'gestaoos-web' }) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32)
    throw Error('JWT_SECRET deve ter pelo menos 32 caracteres. Execute npm run setup.');
  function session(user) {
    db.sql.prepare('DELETE FROM sessoes WHERE expira<=?').run(Date.now());
    const id = randomUUID();
    const token = jwt.sign({ empresaId: user.empresaId }, secret, {
      algorithm: 'HS256',
      expiresIn: ttl,
      issuer,
      audience,
      subject: user.id,
      jwtid: id,
    });
    const claims = jwt.decode(token);
    db.save('sessoes', user.empresaId, {
      id,
      usuarioId: user.id,
      criadoEm: new Date().toISOString(),
      expira: claims.exp * 1000,
    });
    return {
      token,
      tokenType: 'Bearer',
      expiresAt: new Date(claims.exp * 1000).toISOString(),
      usuario: publicUser(user),
    };
  }
  function auth(req, res, next) {
    const token = req.headers.authorization?.match(/^Bearer ([^\s]+)$/i)?.[1];
    if (!token) fail(401, 'Acesso negado. Faça seu login.');
    let claims;
    try {
      claims = jwt.verify(token, secret, { algorithms: ['HS256'], issuer, audience });
    } catch {
      fail(401, 'Token inválido ou expirado.');
    }
    if (
      typeof claims.empresaId !== 'string' ||
      typeof claims.sub !== 'string' ||
      typeof claims.jti !== 'string'
    )
      fail(401, 'Token inválido.');
    const s = db.get('sessoes', claims.jti, claims.empresaId),
      user = db.get('usuarios', claims.sub, claims.empresaId),
      company = db.get('empresas', claims.empresaId, claims.empresaId);
    if (
      !s ||
      s.usuarioId !== claims.sub ||
      s.expira <= Date.now() ||
      !user?.ativo ||
      !company?.ativo
    )
      fail(401, 'Sessão expirada ou revogada.');
    req.company = company.id;
    req.user = user;
    req.session = s;
    next();
  }
  return { session, auth };
}
