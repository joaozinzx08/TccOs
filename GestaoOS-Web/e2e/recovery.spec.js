import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// Development mode exercises the real local outbox. Production requires SMTP;
// the backend suite separately verifies delivery failures and invalid config.
test.skip(
  process.env.GESTAO_TEST_PRODUCTION === '1',
  'Envio local requer ambiente de desenvolvimento.',
);
async function ready(page, url) {
  await page.goto(url);
  await page.waitForFunction(
    () =>
      typeof window.legacyFetch === 'function' &&
      document.querySelector('#codigo-empresa, #btn-salvar-senha'),
  );
}
async function company(request, suffix) {
  const email = `recovery-${suffix}-${Date.now()}@example.com`;
  const response = await request.post('/api/empresas', {
    data: {
      nome: 'Empresa Recuperação',
      responsavel: 'Pessoa Teste',
      email,
      senha: 'Senha123!',
    },
  });
  expect(response.ok()).toBeTruthy();
  return { ...(await response.json()), email };
}
function message(email) {
  const dir = path.join(process.env.GESTAO_TEST_DIR, 'outbox');
  return readdirSync(dir)
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')))
    .filter((m) => m.to === email)
    .sort((a, b) => a.data.localeCompare(b.data))
    .at(-1);
}
function resetUrl(email) {
  return message(email).text.match(/http:\/\/\S+/)[0];
}

test('Login: envio real, e-mail oculto, contador persistente, redefinição e link de uso único', async ({
  page,
  request,
  context,
}) => {
  const a = await company(request, 'login');
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', () => {
    throw Error('A recuperação não deve abrir prompts.');
  });
  await ready(page, '/login.html');
  await page.fill('#codigo-empresa', a.empresa.codigo);
  await page.fill('#email', a.email);
  await page.click('.forgot-password');
  await expect(
    page.getByRole('heading', { name: 'Redefinição de senha', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.recovery-card')).toContainText('r***@example.com');
  await expect(page.locator('#login-form')).not.toBeVisible();
  await expect(page.getByRole('timer')).toHaveText(/0[45]:\d{2}/);
  const receipt = await page.evaluate(
    () => JSON.parse(localStorage.getItem('gestaoos.password-recovery')).receipt,
  );
  const before = await request.post('/api/auth/recuperacao-status', { data: { receipt } });
  const deadline = (await before.json()).expiresAt;
  await page.reload();
  await expect(page.getByRole('timer')).toHaveText(/0[45]:\d{2}/);
  const after = await request.post('/api/auth/recuperacao-status', { data: { receipt } });
  expect((await after.json()).expiresAt).toBe(deadline);
  await page.screenshot({
    path: 'test-results/recovery-sent.png',
    fullPage: true,
    animations: 'disabled',
  });
  const reset = await context.newPage();
  await reset.goto(resetUrl(a.email));
  await expect(reset.locator('#reset-password')).toBeVisible();
  await reset.fill('#reset-password', 'NovaSenha123!');
  await reset.fill('#reset-confirm', 'Diferente123!');
  await reset.getByRole('button', { name: 'Redefinir senha', exact: true }).click();
  await expect(reset.getByRole('alert')).toContainText('não coincidem');
  await reset.fill('#reset-confirm', 'NovaSenha123!');
  await reset.getByRole('button', { name: 'Redefinir senha', exact: true }).click();
  await expect(reset.getByRole('heading', { name: 'Senha redefinida', exact: true })).toBeVisible();
  expect(
    (
      await request.get('/api/perfil', { headers: { Authorization: `Bearer ${a.token}` } })
    ).status(),
  ).toBe(401);
  const login = await request.post('/api/login', {
    data: { email: a.email, codigoEmpresa: a.empresa.codigo, senha: 'NovaSenha123!' },
  });
  expect(login.ok()).toBeTruthy();
  await reset.goto(resetUrl(a.email));
  await expect(reset.getByRole('alert')).toContainText('já foi utilizado ou expirou');
  expect(errors).toEqual([]);
});

test('Card expira, novo envio funciona e o servidor recusa link vencido', async ({
  page,
  request,
}) => {
  const a = await company(request, 'expiry');
  await page.clock.install();
  await ready(page, '/login.html');
  await page.fill('#codigo-empresa', a.empresa.codigo);
  await page.fill('#email', a.email);
  await page.click('.forgot-password');
  await expect(page.getByRole('timer')).toBeVisible();
  const oldUrl = resetUrl(a.email);
  await page.clock.fastForward(300001);
  await expect(
    page.getByRole('heading', { name: 'O link de redefinição expirou', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Solicitar novo link' }).click();
  await expect(page.getByRole('timer')).toHaveText(/0[45]:\d{2}/);
  await page.goto(oldUrl);
  await expect(page.getByRole('alert')).toContainText('já foi utilizado ou expirou');
  const newUrl = resetUrl(a.email);
  await page.goto(newUrl);
  await expect(page.locator('#reset-password')).toBeVisible();
  const id = new URLSearchParams(new URL(newUrl).hash.slice(1)).get('id');
  const db = new DatabaseSync(path.join(process.env.GESTAO_TEST_DIR, 'test.sqlite'));
  db.prepare('UPDATE desafios SET expira=? WHERE id=?').run(Date.now() - 1, id);
  db.close();
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('já foi utilizado ou expirou');
  await expect(page.locator('#reset-password')).toHaveCount(0);
});

for (const [role, folder] of [
  ['administrador_principal', 'admin'],
  ['administrador_setor', 'admin'],
  ['gestor', 'gestor'],
  ['colaborador', 'colaborador'],
]) {
  test(`Perfil ${role}: envia ao e-mail autenticado e preserva alteração normal`, async ({
    page,
    request,
  }) => {
    const a = await company(request, role);
    let session = a;
    if (role !== 'administrador_principal') {
      const sectors = await (
        await request.get('/api/setores', { headers: { Authorization: `Bearer ${a.token}` } })
      ).json();
      const email = `${role}-${Date.now()}@example.com`;
      const user = await request.post('/api/usuarios', {
        headers: { Authorization: `Bearer ${a.token}` },
        data: {
          nome: 'Pessoa Teste',
          email,
          senha: 'Senha123!',
          role,
          setorId: sectors[0].id,
        },
      });
      expect(user.ok()).toBeTruthy();
      session = await (
        await request.post('/api/login', {
          data: { email, senha: 'Senha123!', codigoEmpresa: a.empresa.codigo },
        })
      ).json();
    }
    await page.goto('/login.html');
    await page.evaluate((s) => {
      localStorage.setItem('token', s.token);
      localStorage.setItem('usuario', JSON.stringify(s.usuario));
      localStorage.setItem('empresa', JSON.stringify(s.empresa));
    }, session);
    await ready(page, `/${folder}/perfil.html`);
    await page
      .getByRole('button', { name: /Alterar Senha/ })
      .first()
      .click();
    await expect(page.locator('#senha-atual')).toBeVisible();
    await expect(page.locator('#senha-nova')).toBeVisible();
    await page.getByRole('button', { name: 'Redefinir por e-mail' }).click();
    await expect(page.getByRole('dialog')).toContainText('Enviamos um link');
    await expect(page.getByRole('timer')).toBeVisible();
    expect(message(session.usuario.email).to).toBe(session.usuario.email);
    await page.getByRole('button', { name: 'Voltar ao perfil' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page
      .getByRole('button', { name: /Alterar Senha/ })
      .first()
      .click();
    await page.fill('#senha-atual', 'Senha123!');
    await page.fill('#senha-nova', 'AlteracaoNormal123!');
    await page.fill('#senha-confirmar', 'AlteracaoNormal123!');
    await page.click('#btn-salvar-senha');
    await expect(page).toHaveURL(/login.html/);
  });
}

test('Tela de redefinição cabe no celular e mostra erro de link inválido', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/redefinir-senha.html#id=invalido&token=invalido');
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: 'test-results/recovery-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
});
