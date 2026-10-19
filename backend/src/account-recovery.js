import { randomInt, randomBytes, randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { email, password, hashPassword, fail } from './security.js';

export const RESET_TTL_MS = 5 * 60 * 1000;
const invalidLink = () =>
  fail(400, 'Este link é inválido, já foi utilizado ou expirou. Solicite um novo link.');

export function accountRecovery({
  app,
  db,
  auth,
  sendMail,
  secret,
  publicAppUrl,
  clock = Date.now,
}) {
  const hash = (value) => createHmac('sha256', secret).update(value).digest('hex');
  const sameHash = (a, b) =>
    typeof a === 'string' &&
    typeof b === 'string' &&
    /^[a-f0-9]{64}$/.test(a) &&
    /^[a-f0-9]{64}$/.test(b) &&
    timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  const lookup = (body) => {
    const mail = email(body.email);
    const company = db.sql.prepare('SELECT id FROM empresas WHERE codigo=? AND ativo=1').get(
      String(body.codigoEmpresa || '')
        .trim()
        .toUpperCase(),
    );
    if (!company) return null;
    return db.list('usuarios', company.id).find((u) => u.email === mail && u.ativo) || null;
  };
  const mask = (mail) => {
    const [local, domain] = mail.split('@');
    return `${local.slice(0, 1)}***@${domain}`;
  };
  function appUrl() {
    // Never construct password links from a request's Host/Origin header.
    const configured =
      publicAppUrl || (process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : '');
    let url;
    try {
      url = new URL(configured);
    } catch {
      fail(503, 'Recuperação de senha indisponível. Configure PUBLIC_APP_URL no servidor.');
    }
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')
    )
      fail(503, 'PUBLIC_APP_URL deve ser um endereço válido (HTTPS em produção).');
    return new URL('/redefinir-senha.html', url);
  }
  // The receipt only allows the browser to recover the server's deadline. It
  // contains no account identity or password-reset credential.
  function receipt(expira) {
    const payload = Buffer.from(JSON.stringify({ expira })).toString('base64url');
    return `${payload}.${hash('receipt:' + payload)}`;
  }
  function receiptDeadline(value) {
    if (typeof value !== 'string' || value.length > 300) fail(400, 'Solicite um novo link.');
    const [payload, signature, extra] = value.split('.');
    if (extra || !sameHash(hash('receipt:' + payload), signature))
      fail(400, 'Solicite um novo link.');
    let data;
    try {
      data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    } catch {
      fail(400, 'Solicite um novo link.');
    }
    if (!Number.isSafeInteger(data.expira)) fail(400, 'Solicite um novo link.');
    return data.expira;
  }
  const timing = (expiresAt) => ({ expiresAt, serverNow: clock() });
  function checkLink(body) {
    if (
      typeof body.id !== 'string' ||
      body.id.length > 80 ||
      typeof body.token !== 'string' ||
      !/^[a-f0-9]{64}$/.test(body.token)
    )
      invalidLink();
    const row = db.sql.prepare('SELECT empresaId FROM desafios WHERE id=?').get(body.id);
    const c = row && db.get('desafios', body.id, row.empresaId);
    if (
      !c ||
      c.finalidade !== 'senha' ||
      c.expira <= clock() ||
      !sameHash(hash(body.token), c.tokenHash)
    )
      invalidLink();
    const user = db.get('usuarios', c.usuarioId, c.empresaId);
    const company = db.get('empresas', c.empresaId, c.empresaId);
    if (!user?.ativo || !company?.ativo) invalidLink();
    return { c, user };
  }
  async function sendReset(user, mail) {
    const url = appUrl();
    const expira = clock() + RESET_TTL_MS;
    if (user) {
      const token = randomBytes(32).toString('hex');
      const challenge = db.transaction(() => {
        for (const c of db
          .list('desafios', user.empresaId)
          .filter((c) => c.usuarioId === user.id && c.finalidade === 'senha'))
          db.remove('desafios', c.id, user.empresaId);
        return db.save('desafios', user.empresaId, {
          id: randomUUID(),
          usuarioId: user.id,
          finalidade: 'senha',
          tokenHash: hash(token),
          expira,
          tentativas: 0,
          data: new Date(clock()).toISOString(),
        });
      });
      // Fragments stay out of HTTP logs and Referer headers.
      url.hash = new URLSearchParams({ id: challenge.id, token }).toString();
      try {
        await sendMail({
          to: user.email,
          subject: 'GestãoOS — redefinição de senha',
          text: `Redefinir minha senha\n\n${url.href}\n\nEste link expira em 5 minutos a partir da solicitação e só pode ser usado uma vez. Após redefinir a senha, todas as sessões serão encerradas. Se você não solicitou esta alteração, ignore esta mensagem.`,
          html: `<h2>Redefinição de senha</h2><p>Recebemos uma solicitação para redefinir sua senha do GestãoOS.</p><p><a href="${url.href.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Redefinir minha senha</a></p><p>O link expira em <strong>5 minutos</strong> a partir da solicitação e só pode ser usado uma vez.</p><p>Após redefinir, faça login novamente. Se não solicitou esta alteração, ignore esta mensagem.</p>`,
        });
      } catch {
        db.remove('desafios', challenge.id, user.empresaId);
        fail(503, 'Não foi possível enviar o e-mail agora. Tente novamente em instantes.');
      }
    }
    return {
      // Same response for unknown/inactive accounts; do not disclose membership.
      message:
        'Se os dados corresponderem a uma conta ativa, o link será enviado ao e-mail informado.',
      maskedEmail: mask(mail),
      receipt: receipt(expira),
      ...timing(expira),
    };
  }
  app.post('/api/auth/esqueci-senha', async (req, res) => {
    const mail = email(req.body.email);
    if (!String(req.body.codigoEmpresa || '').trim()) fail(400, 'Informe o código da empresa.');
    res.json(await sendReset(lookup(req.body), mail));
  });
  app.post('/api/auth/esqueci-senha/perfil', auth, async (req, res) => {
    res.json(await sendReset(req.user, req.user.email));
  });
  app.post('/api/auth/recuperacao-status', (req, res) => {
    const expiresAt = receiptDeadline(req.body.receipt);
    res.json({ ...timing(expiresAt), expired: expiresAt <= clock() });
  });
  app.post('/api/auth/validar-redefinicao', (req, res) => {
    const { c } = checkLink(req.body);
    res.json(timing(c.expira));
  });
  app.post('/api/auth/redefinir-senha', (req, res) => {
    const novaSenha = password(req.body.novaSenha);
    if (novaSenha !== req.body.confirmarSenha) fail(400, 'As senhas não coincidem.');
    db.transaction(() => {
      // Validation and consumption occur together: only one request can win.
      const { c, user } = checkLink(req.body);
      db.save('usuarios', user.empresaId, { ...user, senha: hashPassword(novaSenha) });
      db.remove('desafios', c.id, user.empresaId);
      for (const s of db.list('sessoes', user.empresaId).filter((s) => s.usuarioId === user.id))
        db.remove('sessoes', s.id, user.empresaId);
      db.save('auditoria', user.empresaId, {
        usuarioId: user.id,
        usuarioNome: user.nome,
        acao: 'Senha recuperada',
        detalhes: 'Sessões encerradas após recuperação por link',
        data: new Date(clock()).toISOString(),
      });
    });
    res.json({ ok: true });
  });

  // E-mail verification is a separate flow; retain its existing 8-digit codes.
  async function issueVerification(user) {
    const code = String(randomInt(10000000, 100000000));
    const challenge = db.transaction(() => {
      for (const c of db
        .list('desafios', user.empresaId)
        .filter((c) => c.usuarioId === user.id && c.finalidade === 'email'))
        db.remove('desafios', c.id, user.empresaId);
      return db.save('desafios', user.empresaId, {
        usuarioId: user.id,
        finalidade: 'email',
        tokenHash: hash(code),
        expira: clock() + 15 * 60000,
        tentativas: 0,
        data: new Date(clock()).toISOString(),
      });
    });
    try {
      await sendMail({
        to: user.email,
        subject: 'GestãoOS — confirmação de e-mail',
        text: `Seu código é ${code}. Ele expira em 15 minutos e só pode ser usado uma vez. Se você não pediu esta ação, ignore esta mensagem.`,
      });
    } catch (e) {
      db.remove('desafios', challenge.id, user.empresaId);
      throw e;
    }
  }
  app.post('/api/auth/solicitar-verificacao', auth, async (req, res) => {
    if (!req.user.emailVerificado) await issueVerification(req.user);
    res.json({ message: 'Solicitação processada.' });
  });
  app.post('/api/auth/confirmar-email', (req, res) => {
    const user = lookup(req.body);
    const c =
      user &&
      db
        .list('desafios', user.empresaId)
        .find((c) => c.usuarioId === user.id && c.finalidade === 'email');
    if (!c || c.expira <= clock() || c.tentativas >= 5) fail(400, 'Código inválido ou expirado.');
    if (
      typeof req.body.codigo !== 'string' ||
      !/^\d{8}$/.test(req.body.codigo) ||
      !sameHash(hash(req.body.codigo), c.tokenHash)
    ) {
      db.save('desafios', user.empresaId, { ...c, tentativas: c.tentativas + 1 });
      fail(400, 'Código inválido ou expirado.');
    }
    db.transaction(() => {
      db.save('usuarios', user.empresaId, { ...user, emailVerificado: true });
      db.remove('desafios', c.id, user.empresaId);
    });
    res.json({ ok: true });
  });
}
