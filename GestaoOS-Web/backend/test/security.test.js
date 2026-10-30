import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';
const secret = 'test-secret-with-at-least-thirty-two-characters';
async function fixture(fn, options = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'gestao-sec-'));
  const app = createApp({
    dbPath: path.join(dir, 'test.sqlite'),
    uploads: path.join(dir, 'uploads'),
    testing: true,
    jwtSecret: secret,
    ...options,
  });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (route, token, body, method = body ? 'POST' : 'GET') => {
    const res = await fetch(base + route, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (res.headers.get('content-type') || '').includes('json')
      ? await res.json()
      : await res.text();
    return { status: res.status, data, headers: res.headers };
  };
  try {
    await fn({ app, call, base });
  } finally {
    await new Promise((r) => server.close(r));
    app.locals.db.sql.close();
    rmSync(dir, { recursive: true, force: true });
  }
}
const company = (call, n) =>
  call('/empresas', null, {
    nome: 'Empresa ' + n,
    responsavel: 'Admin ' + n,
    email: 'admin@example.com',
    senha: 'Senha123!',
  });
async function user(call, admin, e, role, email, setorId) {
  const u = await call('/usuarios', admin, {
    nome: role,
    email,
    senha: 'Senha123!',
    role,
    setorId,
  });
  assert.equal(u.status, 201);
  const l = await call('/login', null, { codigoEmpresa: e.codigo, email, senha: 'Senha123!' });
  assert.equal(l.status, 200);
  return { ...u.data, token: l.data.token };
}
test('Perfis separados, sigilo em detalhe/histórico e bloqueio de atendimento da própria OS', () =>
  fixture(async ({ call }) => {
    const { data: a } = await company(call, 'A'),
      at = a.token;
    const sectors = (await call('/setores', at)).data;
    const g = await user(call, at, a.empresa, 'gestor', 'g@example.com', sectors[0].id);
    const sa = await user(
      call,
      at,
      a.empresa,
      'administrador_setor',
      'sa@example.com',
      sectors[0].id,
    );
    const c = await user(call, at, a.empresa, 'colaborador', 'c@example.com', sectors[1].id);
    const other = await user(call, at, a.empresa, 'gestor', 'other@example.com', sectors[1].id);
    const managedUsers = await call('/usuarios?gestao=1', sa.token);
    assert.equal(managedUsers.status, 200);
    assert.ok(managedUsers.data.every((u) => u.setorId === sectors[0].id));
    assert.equal((await call('/usuarios?gestao=1', g.token)).status, 403);
    assert.equal((await call('/usuarios', g.token, { nome: 'x' })).status, 403);
    assert.equal(
      (
        await call('/usuarios', sa.token, {
          nome: 'x',
          email: 'x@example.com',
          senha: 'Senha123!',
          role: 'administrador_principal',
          setorId: sectors[0].id,
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call('/usuarios', sa.token, {
          nome: 'x',
          email: 'x@example.com',
          senha: 'Senha123!',
          role: 'colaborador',
          setorId: sectors[1].id,
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call('/usuarios', sa.token, {
          nome: 'x',
          email: 'x@example.com',
          senha: 'Senha123!',
          role: 'colaborador',
          setorId: sectors[0].id,
        })
      ).status,
      201,
    );
    for (const token of [c.token, g.token, sa.token])
      assert.equal((await call('/empresa/renovar-codigo', token, {})).status, 403);
    const created = await call('/ordens', c.token, {
      titulo: 'Sigilo',
      descricao: 'Descrição',
      setorResponsavelId: sectors[0].id,
      sigilo: true,
    });
    assert.equal(created.status, 201);
    const id = created.data.id;
    assert.equal((await call('/ordens/' + id, other.token)).status, 404);
    const d = (await call('/ordens/' + id, g.token)).data;
    assert.equal(d.solicitanteId, null);
    assert.equal(d.historico[0].usuarioId, null);
    assert.ok(!JSON.stringify(d).includes(c.id));
    const own = await call('/ordens', at, {
      titulo: 'Minha ordem',
      descricao: 'Descrição',
      setorResponsavelId: sectors[0].id,
    });
    assert.equal(
      (
        await call(
          '/ordens/' + own.data.id,
          at,
          { status: 'Em atendimento', observacao: 'Tentar autoatendimento' },
          'PATCH',
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          '/ordens/' + id,
          g.token,
          { status: 'Concluída', observacao: 'Pular fluxo' },
          'PATCH',
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await call(
          '/ordens/' + id,
          g.token,
          { status: 'Em atendimento', responsavelId: c.id, observacao: 'Atribuição inválida' },
          'PATCH',
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await call(
          '/ordens/' + id,
          g.token,
          { status: 'Em atendimento', responsavelId: g.id, observacao: 'Iniciado' },
          'PATCH',
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          '/ordens/' + id,
          g.token,
          { status: 'Concluída', observacao: 'Resolvido' },
          'PATCH',
        )
      ).status,
      200,
    );
    assert.equal((await call('/relatorios', g.token)).data.concluidas, 1);
    assert.equal((await call('/auditoria', sa.token)).status, 403);
  }));
test('JWT adulterado, expirado, algoritmo/issuer/audience inválidos e revogação total após senha', () =>
  fixture(async ({ call }) => {
    const { data: a } = await company(call, 'A');
    const claims = jwt.decode(a.token);
    const sign = (opts) =>
      jwt.sign({ empresaId: a.empresa.id }, secret, {
        algorithm: 'HS256',
        subject: claims.sub,
        jwtid: claims.jti,
        issuer: 'gestaoos',
        audience: 'gestaoos-web',
        expiresIn: '1h',
        ...opts,
      });
    for (const token of [
      sign({ expiresIn: -1 }),
      sign({ issuer: 'outro' }),
      sign({ audience: 'outro' }),
      sign({ algorithm: 'HS384' }),
      a.token.replace(/.$/, '!'),
    ])
      assert.equal((await call('/perfil', token)).status, 401);
    const login = await call('/login', null, {
      codigoEmpresa: a.empresa.codigo,
      email: 'admin@example.com',
      senha: 'Senha123!',
    });
    assert.equal((await call('/sessoes', a.token)).data.length, 2);
    assert.equal((await call('/sessoes', a.token, undefined, 'DELETE')).status, 200);
    assert.equal((await call('/perfil', login.data.token)).status, 401);
    const changed = await call(
      '/perfil',
      a.token,
      { senhaAtual: 'Senha123!', novaSenha: 'OutraSenha123!' },
      'PATCH',
    );
    assert.equal(changed.status, 200);
    assert.equal((await call('/perfil', a.token)).status, 401);
    assert.equal(
      (
        await call('/login', null, {
          codigoEmpresa: a.empresa.codigo,
          email: 'admin@example.com',
          senha: 'Senha123!',
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await call('/login', null, {
          codigoEmpresa: a.empresa.codigo,
          email: 'admin@example.com',
          senha: 'OutraSenha123!',
        })
      ).status,
      200,
    );
  }));
test('Isolamento transversal, chat privado, UNIQUE permanente e exportação protegida', () =>
  fixture(async ({ call, app, base }) => {
    const [{ data: a }, { data: b }] = await Promise.all([company(call, 'A'), company(call, 'B')]);
    const at = a.token,
      bt = b.token,
      as = (await call('/setores', at)).data[0],
      bs = (await call('/setores', bt)).data[0];
    const c = await user(call, at, a.empresa, 'colaborador', 'c@example.com', as.id),
      d = await user(call, at, a.empresa, 'colaborador', 'd@example.com', as.id);
    const chat = await call('/chats', c.token, { usuarioId: d.id });
    await call(`/chats/${chat.data.id}/mensagens`, c.token, { texto: 'Privada' });
    for (const token of [at, bt])
      assert.equal((await call(`/chats/${chat.data.id}/mensagens`, token)).status, 404);
    assert.equal((await call('/chats', c.token, { usuarioId: b.usuario.id })).status, 404);
    const o = await call('/ordens', c.token, {
      titulo: '=CMD(1)',
      descricao: 'Descrição',
      setorResponsavelId: as.id,
    });
    for (const [route, body, method] of [
      [`/ordens/${o.data.id}`, null, 'GET'],
      [`/ordens/${o.data.id}/comentarios`, { descricao: 'x' }, 'POST'],
      [`/setores/${as.id}`, { nome: 'x' }, 'PUT'],
      [`/usuarios/${c.id}`, { ativo: false }, 'PATCH'],
    ])
      assert.equal((await call(route, bt, body, method)).status, 404);
    assert.equal(
      (await call('/ordens', c.token, { titulo: 'x', descricao: 'x', setorResponsavelId: bs.id }))
        .status,
      404,
    );
    const csv = await call('/relatorios/csv', at);
    assert.equal(csv.status, 200);
    assert.ok(csv.data.includes("'=CMD(1)"));
    assert.equal((await call('/relatorios/csv', c.token)).status, 403);
    const old = a.empresa.codigo,
      newCode = (await call('/empresa/renovar-codigo', at, {})).data.codigo;
    assert.notEqual(old, newCode);
    assert.throws(
      () => app.locals.db.save('empresas', b.empresa.id, { ...b.empresa, codigo: old }),
      /UNIQUE/,
    );
    const burst = await Promise.all(
      Array.from({ length: 8 }, (_, i) => company(call, 'Burst' + i)),
    );
    assert.equal(new Set(burst.map((x) => x.data.empresa.codigo)).size, 8);
    const page = await call('/ordens?page=1&limit=1', at);
    assert.equal(page.data.items.length, 1);
    assert.equal(page.data.total, 1);
    assert.equal((await call('/ordens?limit=999', at)).status, 400);
    const fd = new FormData();
    fd.append(
      'arquivo',
      new Blob(['<script>alert(1)</script>'], { type: 'image/png' }),
      'fake.png',
    );
    assert.equal(
      (
        await fetch(base + `/ordens/${o.data.id}/anexos`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${c.token}` },
          body: fd,
        })
      ).status,
      400,
    );
    assert.equal((await call('/empresa', at)).headers.get('x-content-type-options'), 'nosniff');
  }));
test('Rate limit real do login retorna 429 com JSON', () =>
  fixture(
    async ({ call }) => {
      for (let i = 0; i < 3; i++)
        assert.equal(
          (await call('/login', null, { email: 'n@example.com', senha: 'invalida' })).status,
          401,
        );
      const r = await call('/login', null, { email: 'n@example.com', senha: 'invalida' });
      assert.equal(r.status, 429);
      assert.ok(r.data.error);
      assert.ok(r.headers.get('retry-after'));
    },
    { testing: false, authLimit: 3 },
  ));
