import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { RESET_TTL_MS } from '../src/account-recovery.js';
import { mailer } from '../src/mail.js';

async function setup(t, options = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), 'gestao-recovery-'));
  let now = Date.now();
  const sent = [];
  const app = createApp({
    dbPath: path.join(directory, 'db.sqlite'),
    uploads: path.join(directory, 'uploads'),
    testing: true,
    jwtSecret: 'recovery-test-secret-with-32-characters',
    publicAppUrl: 'https://gestao.example.com',
    recoveryClock: () => now,
    sendMail: async (msg) => sent.push(msg),
    ...options,
  });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  t.after(async () => {
    await new Promise((r) => server.close(r));
    app.locals.db.sql.close();
    rmSync(directory, { recursive: true, force: true });
  });
  async function post(endpoint, body, token) {
    const r = await fetch(base + endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: JSON.stringify(body),
    });
    return { status: r.status, data: await r.json() };
  }
  const a = (
    await post('/empresas', {
      nome: 'Empresa',
      responsavel: 'Admin',
      email: 'admin@example.com',
      senha: 'Senha123!',
    })
  ).data;
  const identity = { email: 'admin@example.com', codigoEmpresa: a.empresa.codigo };
  const link = () => {
    const url = new URL(sent.at(-1).text.match(/https:\/\/\S+/)[0]);
    assert.equal(url.origin, 'https://gestao.example.com');
    assert.equal(url.pathname, '/redefinir-senha.html');
    assert.equal(url.search, '');
    return Object.fromEntries(new URLSearchParams(url.hash.slice(1)));
  };
  const reset = (credentials, extra = {}) =>
    post('/auth/redefinir-senha', {
      ...credentials,
      novaSenha: 'NovaSenha123!',
      confirmarSenha: 'NovaSenha123!',
      ...extra,
    });
  return {
    app,
    db: app.locals.db,
    sent,
    a,
    identity,
    post,
    base,
    link,
    reset,
    directory,
    advance: (ms) => {
      now += ms;
    },
  };
}

test('Link seguro de uso único: senha, auditoria e revogação de todas as sessões', async (t) => {
  const f = await setup(t);
  const login2 = (await f.post('/login', { ...f.identity, senha: 'Senha123!' })).data;
  const response = await f.post('/auth/esqueci-senha', f.identity);
  assert.equal(response.status, 200);
  assert.equal(response.data.expiresAt - response.data.serverNow, RESET_TTL_MS);
  assert.equal(response.data.maskedEmail, 'a***@example.com');
  const credentials = f.link();
  assert.match(credentials.token, /^[a-f0-9]{64}$/);
  const record = f.db.list('desafios', f.a.empresa.id)[0];
  assert.notEqual(record.tokenHash, credentials.token);
  assert.equal(JSON.stringify(response.data).includes(credentials.token), false);
  assert.equal((await f.post('/auth/validar-redefinicao', credentials)).status, 200);
  assert.equal((await f.reset(credentials)).status, 200);
  for (const token of [f.a.token, login2.token])
    assert.equal(
      (await fetch(f.base + '/perfil', { headers: { Authorization: 'Bearer ' + token } })).status,
      401,
    );
  assert.equal((await f.reset(credentials)).status, 400);
  assert.equal((await f.post('/auth/validar-redefinicao', credentials)).status, 400);
  assert.equal((await f.post('/login', { ...f.identity, senha: 'Senha123!' })).status, 401);
  assert.equal((await f.post('/login', { ...f.identity, senha: 'NovaSenha123!' })).status, 200);
  assert.equal(
    f.db.list('auditoria', f.a.empresa.id).filter((a) => a.acao === 'Senha recuperada').length,
    1,
  );
});

test('Expiração real exatamente aos 5 minutos e prazo recuperável sem reiniciar', async (t) => {
  const f = await setup(t);
  const { data } = await f.post('/auth/esqueci-senha', f.identity);
  const credentials = f.link();
  f.advance(299999);
  assert.equal((await f.post('/auth/validar-redefinicao', credentials)).status, 200);
  const restored = await f.post('/auth/recuperacao-status', { receipt: data.receipt });
  assert.equal(restored.data.expiresAt, data.expiresAt);
  assert.equal(restored.data.expiresAt - restored.data.serverNow, 1);
  f.advance(1);
  assert.equal((await f.reset(credentials)).status, 400);
  assert.equal(
    (await f.post('/auth/recuperacao-status', { receipt: data.receipt })).data.expired,
    true,
  );
  assert.equal((await f.post('/login', { ...f.identity, senha: 'Senha123!' })).status, 200);
});

test('Novo envio invalida o anterior; apenas uma redefinição concorrente é aceita', async (t) => {
  const f = await setup(t);
  await f.post('/auth/esqueci-senha', f.identity);
  const old = f.link();
  await f.post('/auth/esqueci-senha', f.identity);
  const current = f.link();
  assert.equal((await f.reset(old)).status, 400);
  const statuses = (await Promise.all([f.reset(current), f.reset(current)]))
    .map((r) => r.status)
    .sort();
  assert.deepEqual(statuses, [200, 400]);
});

test('Contas ausentes/inativas têm resposta genérica; recibo não autoriza redefinição', async (t) => {
  const f = await setup(t);
  const good = await f.post('/auth/esqueci-senha', f.identity);
  const missing = await f.post('/auth/esqueci-senha', {
    ...f.identity,
    email: 'ausente@example.com',
  });
  const wrongCompany = await f.post('/auth/esqueci-senha', {
    ...f.identity,
    codigoEmpresa: 'NAO-EXISTE',
  });
  const user = f.db.get('usuarios', f.a.usuario.id, f.a.empresa.id);
  f.db.save('usuarios', f.a.empresa.id, { ...user, ativo: false });
  const inactive = await f.post('/auth/esqueci-senha', f.identity);
  for (const result of [missing, wrongCompany, inactive]) {
    assert.equal(result.status, 200);
    assert.deepEqual(Object.keys(result.data), Object.keys(good.data));
    assert.equal(result.data.message, good.data.message);
    assert.equal(
      (await f.post('/auth/recuperacao-status', { receipt: result.data.receipt })).status,
      200,
    );
  }
  assert.equal(f.sent.length, 1);
  assert.equal((await f.reset({ id: f.link().id, token: good.data.receipt })).status, 400);
  assert.equal(
    (await f.post('/auth/recuperacao-status', { receipt: good.data.receipt + '0' })).status,
    400,
  );
  assert.equal((await f.reset(f.link())).status, 400);
});

test('Link de outra empresa não aceita troca de ID; confirmação e tamanho da senha validados', async (t) => {
  const f = await setup(t);
  await f.post('/auth/esqueci-senha', f.identity);
  const first = f.link();
  const b = (
    await f.post('/empresas', {
      nome: 'Outra',
      responsavel: 'Admin B',
      email: 'admin@example.com',
      senha: 'Senha123!',
    })
  ).data;
  await f.post('/auth/esqueci-senha', { ...f.identity, codigoEmpresa: b.empresa.codigo });
  const second = f.link();
  assert.equal((await f.reset({ id: second.id, token: first.token })).status, 400);
  assert.equal((await f.reset(first, { confirmarSenha: 'Diferente123!' })).status, 400);
  assert.equal((await f.reset(first, { novaSenha: 'curta', confirmarSenha: 'curta' })).status, 400);
  assert.equal(
    (await f.reset(first, { novaSenha: 'a'.repeat(129), confirmarSenha: 'a'.repeat(129) })).status,
    400,
  );
  assert.equal((await f.reset(first)).status, 200);
  assert.equal(
    (await f.post('/login', { ...f.identity, codigoEmpresa: b.empresa.codigo, senha: 'Senha123!' }))
      .status,
    200,
  );
  assert.equal((await f.reset(second)).status, 200);
});

for (const role of ['administrador_principal', 'administrador_setor', 'gestor', 'colaborador']) {
  test(`Recuperação no perfil usa a identidade autenticada: ${role}`, async (t) => {
    const f = await setup(t);
    const user = f.db.get('usuarios', f.a.usuario.id, f.a.empresa.id);
    f.db.save('usuarios', f.a.empresa.id, {
      ...user,
      role,
      setorId: f.db.list('setores', f.a.empresa.id)[0].id,
    });
    const result = await f.post(
      '/auth/esqueci-senha/perfil',
      { email: 'invasor@example.com' },
      f.a.token,
    );
    assert.equal(result.status, 200);
    assert.equal(f.sent[0].to, user.email);
    assert.equal((await f.reset(f.link())).status, 200);
    assert.equal((await f.post('/auth/esqueci-senha/perfil', {}, f.a.token)).status, 401);
  });
}

test('Falha de e-mail não confirma envio e remove o token; configuração inválida é rejeitada', async (t) => {
  const f = await setup(t, {
    sendMail: async () => {
      throw Error('SMTP secret detail');
    },
  });
  const r = await f.post('/auth/esqueci-senha', f.identity);
  assert.equal(r.status, 503);
  assert.equal(JSON.stringify(r.data).includes('secret'), false);
  assert.equal(f.db.list('desafios', f.a.empresa.id).length, 0);
  const g = await setup(t, { publicAppUrl: 'javascript:invalid' });
  assert.equal((await g.post('/auth/esqueci-senha', g.identity)).status, 503);
  assert.equal(g.sent.length, 0);
});

test('Confirmação de e-mail mantém código, limite de tentativas e prazo próprio', async (t) => {
  const f = await setup(t);
  await f.post('/auth/solicitar-verificacao', {}, f.a.token);
  const code = f.sent.at(-1).text.match(/\d{8}/)[0];
  assert.equal((await f.reset({ ...f.identity, codigo: code })).status, 400);
  for (let i = 0; i < 5; i++)
    assert.equal(
      (await f.post('/auth/confirmar-email', { ...f.identity, codigo: '00000000' })).status,
      400,
    );
  assert.equal(
    (await f.post('/auth/confirmar-email', { ...f.identity, codigo: code })).status,
    400,
  );
  await f.post('/auth/solicitar-verificacao', {}, f.a.token);
  const expired = f.sent.at(-1).text.match(/\d{8}/)[0];
  f.advance(15 * 60000);
  assert.equal(
    (await f.post('/auth/confirmar-email', { ...f.identity, codigo: expired })).status,
    400,
  );
  await f.post('/auth/solicitar-verificacao', {}, f.a.token);
  const fresh = f.sent.at(-1).text.match(/\d{8}/)[0];
  assert.equal(
    (await f.post('/auth/confirmar-email', { ...f.identity, codigo: fresh })).status,
    200,
  );
  assert.equal(
    (await f.post('/auth/confirmar-email', { ...f.identity, codigo: fresh })).status,
    400,
  );
});

test('Caixa de saída de desenvolvimento preserva link e botão HTML', async (t) => {
  const f = await setup(t);
  await f.post('/auth/esqueci-senha', f.identity);
  const directory = path.join(f.directory, 'outbox');
  await mailer({ directory, env: { NODE_ENV: 'development' } })(f.sent[0]);
  const message = JSON.parse(readFileSync(path.join(directory, readdirSync(directory)[0]), 'utf8'));
  assert.match(message.html, /Redefinir minha senha/);
  assert.match(message.text, /#id=.*token=/);
});

test('Trocar a senha com a senha atual também invalida links de recuperação pendentes', async (t) => {
  const f = await setup(t);
  await f.post('/auth/esqueci-senha', f.identity);
  const credentials = f.link();
  const response = await fetch(f.base + '/perfil', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + f.a.token },
    body: JSON.stringify({ senhaAtual: 'Senha123!', novaSenha: 'Normal123!' }),
  });
  assert.equal(response.status, 200);
  assert.equal((await f.reset(credentials)).status, 400);
});
