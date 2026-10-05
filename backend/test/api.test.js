import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';
test('Fluxo completo, isolamento, autorização, persistência e logout', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'gestao-test-'));
  const app = createApp({
    dbPath: path.join(dir, 'test.sqlite'),
    uploads: path.join(dir, 'uploads'),
    testing: true,
    jwtSecret: 'integration-test-secret-with-at-least-32-bytes',
  });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function call(route, token, body, method = body ? 'POST' : 'GET') {
    const res = await fetch(base + route, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json() };
  }
  try {
    assert.equal((await call('/ordens')).status, 401);
    const a = await call('/empresas', null, {
      nome: 'Empresa A',
      responsavel: 'Admin A',
      email: 'admin@example.com',
      senha: 'Senha123!',
    });
    const b = await call('/empresas', null, {
      nome: 'Empresa B',
      responsavel: 'Admin B',
      email: 'admin@example.com',
      senha: 'Senha123!',
    });
    assert.equal(a.status, 201);
    assert.equal(b.status, 201);
    assert.notEqual(a.data.empresa.codigo, b.data.empresa.codigo);
    const at = a.data.token,
      bt = b.data.token;
    assert.equal(at.split('.').length, 3);
    assert.equal(
      JSON.parse(Buffer.from(at.split('.')[1], 'base64url')).empresaId,
      a.data.empresa.id,
    );
    assert.equal((await call('/perfil', at.slice(0, -5) + 'abcde')).status, 401);
    assert.equal(
      (
        await call('/login', null, {
          codigoEmpresa: a.data.empresa.codigo,
          email: 'admin@example.com',
          senha: 'errada',
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await call('/login', null, {
          codigoEmpresa: a.data.empresa.codigo,
          email: 'admin@example.com',
          senha: 'Senha123!',
        })
      ).status,
      200,
    );
    const sectors = (await call('/setores', at)).data;
    const joined = await call('/empresas/entrar', null, {
      codigoEmpresa: a.data.empresa.codigo,
      nome: 'Colaborador',
      email: 'col@example.com',
      senha: 'Senha123!',
    });
    const ct = joined.data.token;
    assert.equal(joined.status, 201);
    const user = await call('/usuarios', at, {
      nome: 'Gestor',
      email: 'gestor@example.com',
      senha: 'Senha123!',
      role: 'gestor',
      setorId: sectors[0].id,
    });
    assert.equal(user.status, 201);
    assert.ok(user.data.id);
    assert.equal(user.data.senha, undefined);
    const g = await call('/login', null, {
      codigoEmpresa: a.data.empresa.codigo,
      email: 'gestor@example.com',
      senha: 'Senha123!',
    });
    const gt = g.data.token;
    assert.equal(
      (
        await call('/usuarios', ct, {
          nome: 'Escalar',
          email: 'x@example.com',
          senha: 'Senha123!',
          role: 'administrador_principal',
        })
      ).status,
      403,
    );
    const created = await call('/ordens', ct, {
      titulo: 'Consertar equipamento',
      descricao: 'Parou de funcionar',
      setorResponsavelId: sectors[0].id,
      prioridade: 'Alta',
      sigilo: true,
    });
    assert.equal(created.status, 201);
    const id = created.data.id;
    assert.equal((await call('/ordens', bt)).data.length, 0);
    assert.equal((await call('/ordens/' + id, bt)).status, 404);
    assert.equal(
      (await call('/ordens/' + id, ct, { status: 'Concluída', observacao: 'Teste' }, 'PUT')).status,
      403,
    );
    assert.equal((await call('/ordens/' + id, gt, { status: 'Concluída' }, 'PUT')).status, 400);
    assert.equal(
      (await call('/ordens/' + id, gt, { status: 'Inventado', observacao: 'Teste' }, 'PUT')).status,
      400,
    );
    assert.equal(
      (
        await call(
          '/ordens/' + id,
          gt,
          { status: 'Em atendimento', observacao: 'Atendimento iniciado' },
          'PATCH',
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          '/ordens/' + id,
          gt,
          { status: 'Concluída', observacao: 'Equipamento reparado' },
          'PATCH',
        )
      ).status,
      200,
    );
    assert.equal(
      (await call('/ordens/' + id + '/comentarios', ct, { descricao: 'Obrigado' })).status,
      201,
    );
    const detail = (await call('/ordens/' + id, ct)).data;
    assert.equal(detail.historico.length, 4);
    assert.equal(detail.status, 'Concluída');
    assert.equal((await call('/dashboard', ct)).data.concluidas, 1);
    assert.ok((await call('/notificacoes', ct)).data.length);
    const own = (await call('/setores', bt)).data[0];
    assert.equal(
      (await call('/ordens', ct, { titulo: 'X', descricao: 'X', setorResponsavelId: own.id }))
        .status,
      404,
    );
    const article = await call('/conhecimento', gt, {
      titulo: 'Manual',
      conteudo: 'Conteúdo',
      categoria: 'TI',
    });
    assert.equal(article.status, 201);
    assert.equal((await call('/conhecimento', bt)).data.length, 0);
    const chat = (await call('/chats', ct)).data[0];
    assert.equal((await call(`/chats/${chat.id}/mensagens`, ct, { texto: 'Olá' })).status, 201);
    assert.equal((await call(`/chats/${chat.id}/mensagens`, at)).data.length, 1);
    assert.equal((await call(`/chats/${chat.id}/mensagens`, bt)).status, 404);
    const fd = new FormData();
    fd.append('arquivo', new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }), 'teste.pdf');
    const uploaded = await fetch(base + `/ordens/${id}/anexos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ct}` },
      body: fd,
    });
    assert.equal(uploaded.status, 201);
    const attachment = await uploaded.json();
    assert.equal(
      (
        await fetch(base + `/ordens/${id}/anexos/${attachment.id}`, {
          headers: { Authorization: `Bearer ${ct}` },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(base + `/ordens/${id}/anexos/${attachment.id}`, {
          headers: { Authorization: `Bearer ${bt}` },
        })
      ).status,
      404,
    );
    assert.equal(
      (await call('/usuarios/' + user.data.id, at, { ...user.data, ativo: false }, 'PUT')).status,
      200,
    );
    assert.equal((await call('/perfil', gt)).status, 401);
    const rotated = await call('/empresa/renovar-codigo', at, {});
    assert.notEqual(rotated.data.codigo, a.data.empresa.codigo);
    assert.equal(
      (
        await call('/login', null, {
          codigoEmpresa: a.data.empresa.codigo,
          email: 'admin@example.com',
          senha: 'Senha123!',
        })
      ).status,
      401,
    );
    assert.equal((await call('/logout', ct, {})).status, 200);
    assert.equal((await call('/perfil', ct)).status, 401);
    assert.ok((await call('/auditoria', at)).data.length > 0);
    app.locals.db.sql.close();
    const reopened = createApp({
      dbPath: path.join(dir, 'test.sqlite'),
      uploads: path.join(dir, 'uploads'),
      testing: true,
      jwtSecret: 'integration-test-secret-with-at-least-32-bytes',
    });
    assert.equal(reopened.locals.db.list('ordens', a.data.empresa.id).length, 1);
    reopened.locals.db.sql.close();
  } finally {
    await new Promise((r) => server.close(r));
    try {
      app.locals.db.sql.close();
    } catch {}
    rmSync(dir, { recursive: true, force: true });
  }
});
