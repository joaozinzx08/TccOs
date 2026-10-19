import { test, expect } from '@playwright/test';
import sharp from 'sharp';

const password = 'Senha123!';

async function createCompany(request, suffix) {
  const email = `gestor-${suffix}-${Date.now()}@example.com`;
  const response = await request.post('/api/empresas', {
    data: { nome: 'Empresa Gestor', responsavel: 'Admin', email, senha: password },
  });
  expect(response.status()).toBe(201);
  return { ...(await response.json()), email };
}

test('Gestor separa OS do setor das próprias solicitações e atualiza foto de perfil', async ({
  page,
  request,
}) => {
  const company = await createCompany(request, 'scopes');
  const headers = { Authorization: `Bearer ${company.token}` };
  const sectors = await (await request.get('/api/setores', { headers })).json();
  const other = await request.post('/api/setores', { headers, data: { nome: 'Financeiro' } });
  expect(other.status()).toBe(201);
  const finance = await other.json();
  const managerEmail = `gestor-ti-${Date.now()}@example.com`;
  const manager = await request.post('/api/usuarios', {
    headers,
    data: {
      nome: 'Gestor de TI',
      email: managerEmail,
      senha: password,
      role: 'gestor',
      setorId: sectors[0].id,
    },
  });
  expect(manager.status()).toBe(201);
  const managerSession = await (
    await request.post('/api/login', {
      data: { email: managerEmail, senha: password, codigoEmpresa: company.empresa.codigo },
    })
  ).json();
  const received = await request.post('/api/ordens', {
    headers,
    data: {
      titulo: 'OS recebida pelo setor',
      descricao: 'Precisa de atendimento pela TI.',
      setorResponsavelId: sectors[0].id,
    },
  });
  expect(received.status()).toBe(201);
  const created = await request.post('/api/ordens', {
    headers: { Authorization: `Bearer ${managerSession.token}` },
    data: {
      titulo: 'Solicitação criada pelo gestor',
      descricao: 'O gestor solicita uma atividade ao Financeiro.',
      setorResponsavelId: finance.id,
    },
  });
  expect(created.status()).toBe(201);

  await page.goto('/login.html');
  await page.evaluate((session) => {
    localStorage.setItem('token', session.token);
    localStorage.setItem('usuario', JSON.stringify(session.usuario));
    localStorage.setItem('empresa', JSON.stringify(session.empresa));
  }, managerSession);
  await page.goto('/gestor/ordens.html?escopo=meu-setor');
  await expect(page.locator('#escopo-descricao')).toContainText('Ordens destinadas ao seu setor');
  await expect(page.locator('body')).toContainText('OS recebida pelo setor');
  await expect(page.locator('body')).not.toContainText('Solicitação criada pelo gestor');
  await page.goto('/gestor/ordens.html?escopo=minhas');
  await expect(page.locator('#escopo-descricao')).toContainText('Ordens que você abriu');
  await expect(page.locator('body')).toContainText('Solicitação criada pelo gestor');
  await expect(page.locator('body')).not.toContainText('OS recebida pelo setor');

  await page.goto('/gestor/perfil.html');
  await expect(page.locator('#profile-avatar')).toBeVisible();
  await page.locator('#avatar-input').setInputFiles({
    name: 'perfil.png',
    mimeType: 'image/png',
    buffer: await sharp({
      create: { width: 200, height: 100, channels: 3, background: '#2563eb' },
    })
      .png()
      .toBuffer(),
  });
  await expect(page.locator('#avatar-status')).toContainText('Foto salva:');
  await expect(page.locator('#profile-avatar img')).toHaveAttribute('src', /^blob:/);
  await expect(page.locator('#sidebar-avatar img')).toHaveAttribute('src', /^blob:/);
});
