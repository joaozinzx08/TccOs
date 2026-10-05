import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';
test('Recuperação e confirmação de e-mail: código único, expiração, tentativas e revogação', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'gestao-recovery-')),
    sent = [];
  const app = createApp({
    dbPath: path.join(directory, 'db.sqlite'),
    uploads: path.join(directory, 'uploads'),
    testing: true,
    jwtSecret: 'recovery-test-secret-with-32-characters',
    sendMail: async (msg) => sent.push(msg),
  });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
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
  try {
    const a = (
      await post('/empresas', {
        nome: 'Empresa',
        responsavel: 'Admin',
        email: 'admin@example.com',
        senha: 'Senha123!',
      })
    ).data;
    const identity = { email: 'admin@example.com', codigoEmpresa: a.empresa.codigo };
    assert.equal(
      (await post('/auth/esqueci-senha', { ...identity, email: 'ausente@example.com' })).status,
      200,
    );
    assert.equal(sent.length, 0);
    await post('/auth/esqueci-senha', identity);
    assert.equal(sent.length, 1);
    const code = sent[0].text.match(/\d{8}/)[0];
    assert.equal(
      (
        await post('/auth/redefinir-senha', {
          ...identity,
          codigo: code,
          novaSenha: 'NovaSenha123!',
        })
      ).status,
      200,
    );
    assert.equal(
      (await fetch(base + '/perfil', { headers: { Authorization: 'Bearer ' + a.token } })).status,
      401,
    );
    assert.equal(
      (
        await post('/auth/redefinir-senha', {
          ...identity,
          codigo: code,
          novaSenha: 'OutraSenha123!',
        })
      ).status,
      400,
    );
    const login = (await post('/login', { ...identity, senha: 'NovaSenha123!' })).data;
    await post('/auth/solicitar-verificacao', {}, login.token);
    const verification = sent.at(-1).text.match(/\d{8}/)[0];
    assert.equal(
      (await post('/auth/confirmar-email', { ...identity, codigo: verification })).status,
      200,
    );
    assert.equal(app.locals.db.get('usuarios', a.usuario.id, a.empresa.id).emailVerificado, true);
    await post('/auth/esqueci-senha', identity);
    const blockedCode = sent.at(-1).text.match(/\d{8}/)[0];
    for (let i = 0; i < 5; i++)
      assert.equal(
        (
          await post('/auth/redefinir-senha', {
            ...identity,
            codigo: '00000000',
            novaSenha: 'OutraSenha123!',
          })
        ).status,
        400,
      );
    assert.equal(
      (
        await post('/auth/redefinir-senha', {
          ...identity,
          codigo: blockedCode,
          novaSenha: 'OutraSenha123!',
        })
      ).status,
      400,
    );
    await post('/auth/esqueci-senha', identity);
    const expiredCode = sent.at(-1).text.match(/\d{8}/)[0];
    const record = app.locals.db
      .list('desafios', a.empresa.id)
      .find((d) => d.finalidade === 'senha');
    app.locals.db.save('desafios', a.empresa.id, { ...record, expira: Date.now() - 1000 });
    assert.equal(
      (
        await post('/auth/redefinir-senha', {
          ...identity,
          codigo: expiredCode,
          novaSenha: 'OutraSenha123!',
        })
      ).status,
      400,
    );
  } finally {
    await new Promise((r) => server.close(r));
    app.locals.db.sql.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
