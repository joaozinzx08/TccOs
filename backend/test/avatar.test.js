import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { createApp } from '../src/app.js';

test('Avatar: valida imagem, compacta em WebP e substitui a foto anterior', async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'gestao-avatar-'));
  const uploads = path.join(dir, 'uploads');
  const app = createApp({
    dbPath: path.join(dir, 'db.sqlite'),
    uploads,
    testing: true,
    jwtSecret: 'avatar-test-secret-with-at-least-32-characters',
  });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    app.locals.db.sql.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const create = await fetch(base + '/empresas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Empresa Avatar',
      responsavel: 'Admin Avatar',
      email: 'avatar@example.com',
      senha: 'Senha123!',
    }),
  });
  const session = await create.json();
  const upload = async (bytes, type, name) => {
    const form = new FormData();
    form.append('avatar', new Blob([bytes], { type }), name);
    const response = await fetch(base + '/perfil/avatar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.token}` },
      body: form,
    });
    return { status: response.status, data: await response.json() };
  };

  const large = await sharp({
    create: { width: 2400, height: 1200, channels: 3, background: '#2563eb' },
  })
    .jpeg({ quality: 95 })
    .toBuffer();
  const first = await upload(large, 'image/jpeg', 'foto.jpg');
  assert.equal(first.status, 200);
  assert.match(first.data.avatar, /^[a-f0-9-]+\.webp$/);
  assert.equal(first.data.largura, 1024);
  assert.equal(first.data.altura, 512);
  assert.ok(first.data.tamanhoFinal < first.data.tamanhoOriginal);
  const photo = await fetch(base + '/avatares/' + first.data.avatar, {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  assert.equal(photo.status, 200);
  assert.equal(photo.headers.get('content-type'), 'image/webp');
  assert.equal((await sharp(Buffer.from(await photo.arrayBuffer())).metadata()).format, 'webp');

  const second = await upload(
    await sharp({ create: { width: 20, height: 20, channels: 3, background: '#1d4ed8' } })
      .png()
      .toBuffer(),
    'image/png',
    'novo.png',
  );
  assert.equal(second.status, 200);
  assert.notEqual(second.data.avatar, first.data.avatar);
  assert.deepEqual(readdirSync(uploads), [second.data.avatar]);

  const forged = await upload(Buffer.from('not an image'), 'image/png', 'falsa.png');
  assert.equal(forged.status, 400);
  assert.deepEqual(readdirSync(uploads), [second.data.avatar]);
  const tooLarge = await upload(Buffer.alloc(5 * 1024 * 1024 + 1), 'image/jpeg', 'grande.jpg');
  assert.equal(tooLarge.status, 400);
});
