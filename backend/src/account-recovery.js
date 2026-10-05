import { randomInt, createHmac, timingSafeEqual } from 'node:crypto';
import { email, password, hashPassword, fail } from './security.js';

export function accountRecovery({ app, db, auth, sendMail, secret }) {
  const hash = (code) => createHmac('sha256', secret).update(code).digest('hex');
  const lookup = (body) => {
    const mail = email(body.email),
      company = db.sql.prepare('SELECT id FROM empresas WHERE codigo=? AND ativo=1').get(
        String(body.codigoEmpresa || '')
          .trim()
          .toUpperCase(),
      );
    if (!company) return null;
    return db.list('usuarios', company.id).find((u) => u.email === mail && u.ativo) || null;
  };
  async function issue(user, purpose) {
    const code = String(randomInt(10000000, 100000000));
    const challenge = db.transaction(() => {
      for (const c of db
        .list('desafios', user.empresaId)
        .filter((c) => c.usuarioId === user.id && c.finalidade === purpose))
        db.remove('desafios', c.id, user.empresaId);
      return db.save('desafios', user.empresaId, {
        usuarioId: user.id,
        finalidade: purpose,
        tokenHash: hash(code),
        expira: Date.now() + 15 * 60000,
        tentativas: 0,
        data: new Date().toISOString(),
      });
    });
    try {
      await sendMail({
        to: user.email,
        subject:
          purpose === 'senha'
            ? 'GestãoOS — recuperação de senha'
            : 'GestãoOS — confirmação de e-mail',
        text: `Seu código é ${code}. Ele expira em 15 minutos e só pode ser usado uma vez. Se você não pediu esta ação, ignore esta mensagem.`,
      });
    } catch (e) {
      db.remove('desafios', challenge.id, user.empresaId);
      throw e;
    }
  }
  function check(user, purpose, code) {
    if (!user) fail(400, 'Código inválido ou expirado.');
    const c = db
      .list('desafios', user.empresaId)
      .find((c) => c.usuarioId === user.id && c.finalidade === purpose);
    if (!c || c.expira <= Date.now() || c.tentativas >= 5)
      fail(400, 'Código inválido ou expirado.');
    const match =
      typeof code === 'string' &&
      /^\d{8}$/.test(code) &&
      timingSafeEqual(Buffer.from(hash(code), 'hex'), Buffer.from(c.tokenHash, 'hex'));
    if (!match) {
      db.save('desafios', user.empresaId, { ...c, tentativas: c.tentativas + 1 });
      fail(400, 'Código inválido ou expirado.');
    }
    return c;
  }
  app.post('/api/auth/esqueci-senha', async (req, res) => {
    const u = lookup(req.body);
    if (u) await issue(u, 'senha');
    res.json({
      message:
        'Se os dados estiverem corretos, você receberá um código com validade de 15 minutos.',
    });
  });
  app.post('/api/auth/redefinir-senha', (req, res) => {
    const senha = hashPassword(password(req.body.novaSenha)),
      u = lookup(req.body),
      c = check(u, 'senha', req.body.codigo);
    db.transaction(() => {
      db.save('usuarios', u.empresaId, { ...u, senha });
      db.remove('desafios', c.id, u.empresaId);
      for (const s of db.list('sessoes', u.empresaId).filter((s) => s.usuarioId === u.id))
        db.remove('sessoes', s.id, u.empresaId);
      db.save('auditoria', u.empresaId, {
        usuarioId: u.id,
        usuarioNome: u.nome,
        acao: 'Senha recuperada',
        detalhes: 'Sessões encerradas após recuperação',
        data: new Date().toISOString(),
      });
    });
    res.json({ ok: true });
  });
  app.post('/api/auth/solicitar-verificacao', auth, async (req, res) => {
    if (!req.user.emailVerificado) await issue(req.user, 'email');
    res.json({ message: 'Solicitação processada.' });
  });
  app.post('/api/auth/confirmar-email', (req, res) => {
    const u = lookup(req.body),
      c = check(u, 'email', req.body.codigo);
    db.transaction(() => {
      db.save('usuarios', u.empresaId, { ...u, emailVerificado: true });
      db.remove('desafios', c.id, u.empresaId);
    });
    res.json({ ok: true });
  });
}
