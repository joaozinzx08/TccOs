import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const password = 'Senha123!';
test('Fluxo visual original: proteção, criar empresa, login, equipe, ordens, chat, artigos e navegação', async ({
  page,
}) => {
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto('/admin/dashboard.html');
  await expect(page).toHaveURL(/login.html/);
  await page.goto('/criar-empresa.html');
  await page.fill('#nome', 'Empresa Navegador');
  await page.fill('#responsavel', 'Admin Navegador');
  await page.fill('#email', 'navegador@example.com');
  await page.fill('#senha', password);
  await page.fill('#senha2', password);
  await page.check('#aceitar-termos');
  await page.click('#btn-criar');
  await expect(page).toHaveURL(/admin\/dashboard.html/, { timeout: 15000 });
  await expect(page.locator('#empresa-code')).toContainText('GEST-');
  const session = await page.evaluate(() => ({
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('usuario')),
    empresa: JSON.parse(localStorage.getItem('empresa')),
  }));
  expect(session.token.split('.')).toHaveLength(3);
  await page.click('#logout');
  await expect(page).toHaveURL(/login.html/);
  await page.fill('#email', 'navegador@example.com');
  await page.fill('#senha', password);
  await page.click('#btn-login');
  await expect(page).toHaveURL(/admin\/dashboard.html/);
  await page.goto('/admin/usuarios.html');
  await page.getByRole('button', { name: /Novo Usuário/ }).click();
  await page.fill('#user-nome', 'Pessoa Equipe');
  await page.fill('#user-email', 'equipe@example.com');
  await page.fill('#user-senha', password);
  await page.selectOption('#user-role-input', 'colaborador');
  await page.click('#btn-salvar-user');
  await expect(page.locator('#users-table-body')).toContainText('Pessoa Equipe');
  await page.goto('/admin/ordens.html');
  await page
    .getByRole('button', { name: /Nova OS/ })
    .first()
    .click();
  await page.fill('#os-titulo', 'Reparo no equipamento');
  await page.fill('#os-descricao', 'Equipamento não inicia durante o expediente.');
  await page.locator('#os-setor-responsavel').selectOption({ index: 1 });
  await page.locator('#os-form button[type="submit"]').click();
  await expect(page.locator('#os-modal')).not.toBeVisible();
  await expect(page.locator('body')).toContainText('Reparo no equipamento');
  await page.getByText('Reparo no equipamento', { exact: true }).first().click();
  await expect(page.locator('#detail-content')).toContainText('Ordem criada');
  await expect(page.locator('.status-action-btn').first()).toBeDisabled();
  await page.goto('/admin/chat.html');
  await page.getByText('Geral da Empresa', { exact: true }).first().click();
  await page.fill('#chat-input', 'Mensagem persistida no servidor');
  await page.click('#chat-send-btn');
  await expect(page.locator('#chat-messages')).toContainText('Mensagem persistida no servidor');
  await page.reload();
  await page.getByText('Geral da Empresa', { exact: true }).first().click();
  await expect(page.locator('#chat-messages')).toContainText('Mensagem persistida no servidor');
  await page.goto('/admin/conhecimento.html');
  await page.click('#btn-novo-artigo');
  await page.fill('#artigo-titulo', 'Manual de abertura de ordens');
  await page.selectOption('#artigo-categoria', { index: 1 });
  await page.fill('#artigo-resumo', 'Procedimento para a equipe registrar solicitações.');
  await page.fill(
    '#artigo-conteudo',
    'Abra uma ordem com título e descrição claros. Acompanhe pelo protocolo.',
  );
  await page.click('#btn-salvar-artigo');
  await expect(page.locator('body')).toContainText('Manual de abertura de ordens');
  await page.reload();
  await expect(page.locator('body')).toContainText('Manual de abertura de ordens');
  for (const name of [
    'dashboard',
    'empresa',
    'setores',
    'kanban',
    'calendario',
    'relatorios',
    'notificacoes',
    'auditoria',
    'perfil',
    'configuracoes',
  ]) {
    await page.goto('/admin/' + name + '.html');
    await page.waitForTimeout(250);
    await expect(page.locator('body')).not.toContainText('Não foi possível carregar esta tela');
  }
  expect(pageErrors).toEqual([]);
});

test('Colaborador e gestor: ingresso, anexo privado, atendimento, comentário, histórico e conclusão', async ({
  page,
  browser,
  request,
}) => {
  const a = await (
    await request.post('/api/empresas', {
      data: {
        nome: 'Fluxo Equipes',
        responsavel: 'Admin Equipes',
        email: 'admin-equipes@example.com',
        senha: password,
      },
    })
  ).json();
  const headers = { Authorization: 'Bearer ' + a.token };
  const sectors = await (await request.get('/api/setores', { headers })).json();
  await request.post('/api/usuarios', {
    headers,
    data: {
      nome: 'Gestor Equipes',
      email: 'gestor-equipes@example.com',
      senha: password,
      role: 'gestor',
      setorId: sectors[0].id,
    },
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/entrar-empresa.html');
  await page.fill('#codigo', a.empresa.codigo);
  await page.fill('#nome', 'Colaborador Equipes');
  await page.fill('#email', 'col-equipes@example.com');
  await page.fill('#senha', password);
  await page.fill('#senha2', password);
  await page.click('#btn-entrar');
  await expect(page).toHaveURL(/colaborador\/dashboard.html/, { timeout: 15000 });
  await page.goto('/colaborador/minhas-ordens.html?acao=nova');
  await expect(page.locator('#os-modal')).toBeVisible();
  await page.fill('#os-titulo', 'Consertar impressora da equipe');
  await page.fill('#os-descricao', 'A impressora está sem funcionar desde o início do expediente.');
  await page.selectOption('#os-setor-responsavel', sectors[0].id);
  await page.check('#os-sigilo');
  await page.locator('#os-anexos').setInputFiles({
    name: 'registro.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n%%EOF'),
  });
  await page.click('#btn-salvar-os');
  await expect(page.locator('#os-modal')).not.toBeVisible();
  await page.getByText('Consertar impressora da equipe', { exact: true }).click();
  await expect(page.locator('#detail-content')).toContainText('Ordem criada');
  const downloadable = page.waitForEvent('download');
  await page.locator('[data-anexo]').click();
  expect((await downloadable).suggestedFilename()).toBe('registro.pdf');
  const context = await browser.newContext(),
    manager = await context.newPage();
  manager.on('pageerror', (e) => errors.push(e.message));
  manager.on('dialog', (d) =>
    d.type() === 'prompt' ? d.accept('Atendimento registrado pelo gestor') : d.accept(),
  );
  try {
    await manager.goto(new URL('/login.html', page.url()).href);
    await manager.fill('#email', 'gestor-equipes@example.com');
    await manager.fill('#senha', password);
    await manager.click('#btn-login');
    await expect(manager).toHaveURL(/gestor\/dashboard.html/);
    await manager.goto(new URL('/gestor/ordens.html', page.url()).href);
    await manager.getByText('Consertar impressora da equipe', { exact: true }).click();
    await manager.getByRole('button', { name: 'Atendimento', exact: true }).click();
    await expect(manager.locator('#detail-content')).toContainText(
      'Atendimento registrado pelo gestor',
    );
    await manager.fill('#observacao-input', 'Impressora reparada e validada pela equipe.');
    await manager.getByRole('button', { name: 'Adicionar', exact: true }).click();
    await expect(manager.locator('#detail-content')).toContainText(
      'Impressora reparada e validada pela equipe.',
    );
    await manager.getByRole('button', { name: 'Concluída', exact: true }).click();
    await expect(manager.locator('#detail-content .os-status')).toContainText('Concluída');
    await page.reload();
    await page.getByText('Consertar impressora da equipe', { exact: true }).click();
    await expect(page.locator('#detail-content')).toContainText(
      'Impressora reparada e validada pela equipe.',
    );
    await page.fill('#comentario-colaborador', 'Confirmo que voltou a funcionar.');
    await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
    await expect(page.locator('#detail-content')).toContainText('Confirmo que voltou a funcionar.');
  } finally {
    await context.close();
  }
  expect(errors).toEqual([]);
});

test('Layout em celular preserva as dimensões do legado', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['index.html', 'login.html', 'criar-empresa.html', 'entrar-empresa.html']) {
    const html = readFileSync('frontend/legacy/' + route, 'utf8')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace('<head>', `<head><base href="${test.info().project.use.baseURL}/">`);
    await page.route('**/__legacy_compare.html', (route) =>
      route.fulfill({ contentType: 'text/html', body: html }),
    );
    await page.goto('/__legacy_compare.html');
    await page.waitForFunction(() =>
      [...document.styleSheets].some((s) => s.href?.endsWith('/css/style.css')),
    );
    const legacyWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    await page.unroute('**/__legacy_compare.html');
    await page.goto('/' + route);
    await page.waitForTimeout(180);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      route,
    ).toBeLessThanOrEqual(legacyWidth + 1);
  }
});

test('Administrador de setor gerencia somente sua equipe e opções autorizadas', async ({
  page,
  request,
}) => {
  const created = await request.post('/api/empresas', {
    data: {
      nome: 'Setores Navegador',
      responsavel: 'Principal',
      email: 'principal-setores@example.com',
      senha: password,
    },
  });
  expect(created.status()).toBe(201);
  const company = await created.json(),
    headers = { Authorization: 'Bearer ' + company.token };
  const sectors = await (await request.get('/api/setores', { headers })).json();
  for (const [nome, email, role, setorId] of [
    ['Admin do setor', 'setorial@example.com', 'administrador_setor', sectors[0].id],
    ['Equipe externa', 'fora-setor@example.com', 'colaborador', sectors[1].id],
  ])
    expect(
      (
        await request.post('/api/usuarios', {
          headers,
          data: { nome, email, role, setorId, senha: password },
        })
      ).status(),
    ).toBe(201);
  await page.goto('/login.html');
  await page.fill('#email', 'setorial@example.com');
  await page.fill('#senha', password);
  await page.click('#btn-login');
  await expect(page).toHaveURL(/admin\/dashboard.html/);
  await page.goto('/admin/usuarios.html');
  await expect(page.locator('#users-table-body')).toContainText('Admin do setor');
  await expect(page.locator('#users-table-body')).not.toContainText('Equipe externa');
  await page.getByRole('button', { name: /Novo Usuário/ }).click();
  await expect(page.locator('#user-setor')).toBeDisabled();
  await expect(page.locator('#user-setor')).toHaveValue(sectors[0].id);
  await expect(
    page.locator('#user-role-input option[value="administrador_principal"]'),
  ).toBeDisabled();
  await page.fill('#user-nome', 'Pessoa do meu setor');
  await page.fill('#user-email', 'pessoa-setor@example.com');
  await page.fill('#user-senha', password);
  await page.click('#btn-salvar-user');
  await expect(page.locator('#users-table-body')).toContainText('Pessoa do meu setor');
});
