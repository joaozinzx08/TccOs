import express from 'express';
import { mailer } from './mail.js';
import { accountRecovery } from './account-recovery.js';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, unlinkSync, readFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { database } from './db.js';
import { tokens } from './tokens.js';
import {
  roles,
  hashPassword,
  verifyPassword,
  publicUser,
  fail,
  text,
  password,
  email,
} from './security.js';

export const statuses = [
  'Aberta',
  'Encaminhada',
  'Em análise',
  'Em atendimento',
  'Aguardando informação',
  'Concluída',
  'Cancelada',
];
export const priorities = ['Baixa', 'Média', 'Alta', 'Urgente'];
const now = () => new Date().toISOString();
const CLOSED = ['Concluída', 'Cancelada'];
const transitions = {
  Aberta: ['Encaminhada', 'Em análise', 'Em atendimento', 'Cancelada'],
  Encaminhada: ['Em análise', 'Em atendimento', 'Aguardando informação', 'Cancelada'],
  'Em análise': ['Encaminhada', 'Em atendimento', 'Aguardando informação', 'Cancelada'],
  'Em atendimento': ['Em análise', 'Aguardando informação', 'Concluída', 'Cancelada'],
  'Aguardando informação': ['Encaminhada', 'Em análise', 'Em atendimento', 'Cancelada'],
  Concluída: ['Em análise', 'Em atendimento'],
  Cancelada: ['Em análise'],
};
const optional = (value, max = 1000) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';
const isAdmin = (u) => u.role === 'administrador_principal';
const isManager = (u) => u.role !== 'colaborador';
const bool = (value, fallback = false) =>
  value === undefined ? fallback : value === true || value === 'true';
function deadline(value) {
  if (!value) return null;
  if (!Number.isFinite(Date.parse(value))) fail(400, 'Prazo inválido.');
  return new Date(value).toISOString();
}

export function createApp({
  dbPath = 'data/gestao.sqlite',
  uploads = 'data/uploads',
  frontend,
  testing = false,
  jwtSecret = process.env.JWT_SECRET,
  jwtTtl = process.env.JWT_EXPIRES_IN || '8h',
  authLimit = 25,
  sendMail,
} = {}) {
  const db = database(dbPath),
    app = express();
  app.locals.db = db;
  mkdirSync(uploads, { recursive: true });
  const { session, auth } = tokens(db, { secret: jwtSecret, ttl: jwtTtl });
  app.disable('x-powered-by');
  // Original pages use inline handlers and inline CSS. No eval or third-party
  // script origins are allowed. New React handlers are compiled by Vite.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'script-src': ["'self'"],
          'script-src-attr': ["'unsafe-inline'"],
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
          'img-src': ["'self'", 'data:', 'blob:'],
          'connect-src': ["'self'"],
          'upgrade-insecure-requests': null,
        },
      },
    }),
  );
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '1mb' }));
  if (!testing) {
    app.use(
      '/api',
      rateLimit({
        windowMs: 60000,
        limit: 300,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: 'Muitas requisições. Aguarde um minuto.' },
      }),
    );
    app.use(
      ['/api/login', '/api/empresas', '/api/auth', '/api/contato'],
      rateLimit({
        windowMs: 900000,
        limit: authLimit,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: 'Muitas tentativas. Aguarde 15 minutos.' },
      }),
    );
  }
  const list = (kind, req) => db.list(kind, req.company);
  const get = (kind, id, req) =>
    db.get(kind, String(id || ''), req.company) || fail(404, 'Registro não encontrado.');
  const audit = (req, acao, detalhes) =>
    db.save('auditoria', req.company, {
      usuarioId: req.user?.id || null,
      usuarioNome: req.user?.nome || 'Sistema',
      acao,
      detalhes,
      data: now(),
      ip: req.ip,
      requestId: req.requestId,
    });
  const principal = (req, res, next) => {
    if (!isAdmin(req.user)) fail(403, 'Somente o administrador principal pode realizar esta ação.');
    next();
  };
  const manager = (req, res, next) => {
    if (!isManager(req.user)) fail(403, 'Permissão negada.');
    next();
  };
  const revoke = (company, userId, keep) => {
    for (const s of db
      .list('sessoes', company)
      .filter((s) => s.usuarioId === userId && s.id !== keep))
      db.remove('sessoes', s.id, company);
  };
  const sector = (id, req) => {
    const s = get('setores', id, req);
    if (!s.ativo) fail(400, 'Setor inativo.');
    return s;
  };
  const companyByCode = (value) => {
    const code = String(value || '')
      .trim()
      .toUpperCase();
    const r = db.sql.prepare('SELECT id FROM empresas WHERE codigo=?').get(code);
    return r ? db.get('empresas', r.id, r.id) : null;
  };
  const uniqueCode = () => {
    let code;
    do {
      code = `GEST-${randomBytes(10).toString('hex').toUpperCase()}`;
    } while (db.sql.prepare('SELECT 1 FROM company_codes WHERE codigo=?').get(code));
    return code;
  };
  function paginated(items, req, res) {
    if (req.query.page === undefined && req.query.limit === undefined) return res.json(items);
    const page = Number(req.query.page || 1),
      limit = Number(req.query.limit || 25);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100)
      fail(400, 'Paginação inválida: page >= 1; limit entre 1 e 100.');
    return res.json({
      items: items.slice((page - 1) * limit, page * limit),
      page,
      limit,
      total: items.length,
      pages: Math.ceil(items.length / limit),
    });
  }
  const visible = (o, req) =>
    isAdmin(req.user) ||
    o.solicitanteId === req.user.id ||
    (isManager(req.user) && o.setorResponsavelId === req.user.setorId);
  const canManage = (o, req) =>
    o.solicitanteId !== req.user.id &&
    (isAdmin(req.user) || (isManager(req.user) && o.setorResponsavelId === req.user.setorId));
  const order = (req) => {
    const o = get('ordens', req.params.id, req);
    if (!visible(o, req)) fail(404, 'Ordem não encontrada.');
    return o;
  };
  const history = (req, o, acao, descricao) =>
    db.save('historico', req.company, {
      ordemId: o.id,
      usuarioId: req.user.id,
      usuarioNome: req.user.nome,
      acao,
      descricao,
      data: now(),
    });
  const notify = (req, userId, titulo, mensagem, ordemId) =>
    db.save('notificacoes', req.company, {
      usuarioId: userId,
      titulo,
      mensagem,
      ordemId,
      lida: false,
      data: now(),
    });
  function serializeOrder(o, req, detail = false) {
    const result = { ...o, podeGerenciar: canManage(o, req) };
    if (detail) result.historico = list('historico', req).filter((h) => h.ordemId === o.id);
    if (o.sigilo && o.solicitanteId !== req.user.id) {
      result.solicitanteId = null;
      result.solicitanteNome = 'Sigiloso';
      result.setorSolicitanteId = null;
      result.anexos = result.anexos.map((a) => ({ ...a, usuarioId: null }));
      if (detail)
        result.historico = result.historico.map((h) =>
          h.usuarioId === o.solicitanteId
            ? { ...h, usuarioId: null, usuarioNome: 'Solicitante sigiloso' }
            : h,
        );
    }
    return result;
  }
  function orders(req) {
    let rows = list('ordens', req).filter((o) => visible(o, req));
    const { status, setorId, categoria, prioridade, q, periodo, de, ate } = req.query;
    if (status && !statuses.includes(status)) fail(400, 'Status inválido.');
    if (prioridade && !priorities.includes(prioridade)) fail(400, 'Prioridade inválida.');
    let start = de ? Date.parse(de) : null,
      end = ate ? Date.parse(ate) : null;
    if ((de && !Number.isFinite(start)) || (ate && !Number.isFinite(end)))
      fail(400, 'Período inválido.');
    if (ate && /^\d{4}-\d{2}-\d{2}$/.test(ate)) end += 86400000 - 1;
    if (periodo && /^\d+d$/.test(periodo))
      start = Date.now() - Number(periodo.slice(0, -1)) * 86400000;
    if (start !== null && end !== null && start > end)
      fail(400, 'Data inicial posterior à data final.');
    rows = rows.filter(
      (o) =>
        (!status || o.status === status) &&
        (!setorId || o.setorResponsavelId === setorId) &&
        (!categoria || o.categoria === categoria || o.categoriaId === categoria) &&
        (!prioridade || o.prioridade === prioridade) &&
        (!q || `${o.protocolo} ${o.titulo}`.toLowerCase().includes(String(q).toLowerCase())) &&
        (start === null || Date.parse(o.dataAbertura) >= start) &&
        (end === null || Date.parse(o.dataAbertura) <= end),
    );
    return rows.sort((a, b) =>
      req.query.sort === 'urgencia'
        ? priorities.indexOf(b.prioridade) - priorities.indexOf(a.prioridade) ||
          a.dataAbertura.localeCompare(b.dataAbertura)
        : b.dataAbertura.localeCompare(a.dataAbertura),
    );
  }
  function report(req) {
    const os = orders(req),
      open = os.filter((o) => !CLOSED.includes(o.status)),
      done = os.filter((o) => o.status === 'Concluída' && o.dataConclusao);
    const group = (fn) =>
      Object.entries(
        os.reduce((acc, o) => {
          const label = fn(o);
          acc[label] = (acc[label] || 0) + 1;
          return acc;
        }, {}),
      ).map(([label, value]) => ({ label, value, nome: label, total: value }));
    const stats = {
      total: os.length,
      abertas: os.filter((o) => o.status === 'Aberta').length,
      emAnalise: os.filter((o) => o.status === 'Em análise').length,
      emAtendimento: os.filter((o) => o.status === 'Em atendimento').length,
      concluidas: done.length,
      canceladas: os.filter((o) => o.status === 'Cancelada').length,
      urgentes: open.filter((o) => o.prioridade === 'Urgente').length,
      atrasadas: open.filter((o) => o.prazo && Date.parse(o.prazo) < Date.now()).length,
    };
    const sectors = list('setores', req),
      response = os.filter((o) => o.primeiraResposta);
    const charts = {
      porStatus: group((o) => o.status),
      porCategoria: group((o) => o.categoria || 'Geral'),
      porSetor: group(
        (o) => sectors.find((s) => s.id === o.setorResponsavelId)?.nome || 'Não definido',
      ),
    };
    const tempoMedioHoras = done.length
      ? done.reduce(
          (n, o) => n + (Date.parse(o.dataConclusao) - Date.parse(o.dataAbertura)) / 3600000,
          0,
        ) / done.length
      : 0;
    return {
      ...stats,
      stats,
      charts,
      tempoMedioHoras,
      tempoMedio: Math.round((tempoMedioHoras / 24) * 10) / 10,
      tempoMedioRespostaHoras: response.length
        ? response.reduce(
            (n, o) => n + (Date.parse(o.primeiraResposta) - Date.parse(o.dataAbertura)) / 3600000,
            0,
          ) / response.length
        : 0,
      emAndamento: open.length,
      taxaConclusao: os.length ? Math.round((done.length / os.length) * 100) : 0,
      porPrioridade: Object.fromEntries(
        priorities.map((p) => [p, os.filter((o) => o.prioridade === p).length]),
      ),
      porStatus: charts.porStatus,
      porSetor: charts.porSetor,
      porCategoria: charts.porCategoria,
      recentes: os.slice(0, 6).map((o) => serializeOrder(o, req)),
      ultimasOS: os.slice(0, 5).map((o) => serializeOrder(o, req)),
      slaVencido: open
        .filter((o) => o.prazo && Date.parse(o.prazo) < Date.now())
        .map((o) => serializeOrder(o, req)),
      semResposta: open.filter((o) => !o.primeiraResposta).map((o) => serializeOrder(o, req)),
    };
  }
  app.get('/api/status', (req, res) =>
    res.json({ status: 'online', versao: '4.0.0', database: 'sqlite' }),
  );
  const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs');
  app.get('/docs', (req, res) => res.type('text/plain').sendFile(path.join(docsRoot, 'API.md')));
  app.get('/api/openapi.json', (req, res) => res.sendFile(path.join(docsRoot, 'openapi.json')));
  app.post('/api/empresas', (req, res) => {
    const nome = text(req.body.nome, 'Empresa'),
      responsavel = text(req.body.responsavel, 'Responsável'),
      mail = email(req.body.email),
      senha = hashPassword(password(req.body.senha));
    const result = db.transaction(() => {
      const id = randomUUID(),
        codigo = uniqueCode();
      const empresa = db.save('empresas', id, {
        id,
        nome,
        email: mail,
        codigo,
        ativo: true,
        dataCriacao: now(),
        sla: { Baixa: 168, Média: 120, Alta: 72, Urgente: 24 },
        permitirCadastro: true,
      });
      const user = db.save('usuarios', id, {
        empresaId: id,
        nome: responsavel,
        email: mail,
        senha,
        role: 'administrador_principal',
        setorId: null,
        ativo: true,
        emailVerificado: false,
        dataCriacao: now(),
      });
      for (const nome of [
        'Administração',
        'Recursos Humanos',
        'TI / Sistemas',
        'Manutenção',
        'Produção',
        'Financeiro',
      ])
        db.save('setores', id, { nome, descricao: '', ativo: true, dataCriacao: now() });
      for (const [nome, subcategorias] of [
        ['Estrutura Física', ['Elétrica', 'Hidráulica', 'Mobiliário', 'Limpeza', 'Outros']],
        ['Sistemas e Processos Internos', ['Hardware', 'Software', 'Rede', 'Processos', 'Outros']],
        [
          'Pessoas, Conduta e Situações Sensíveis',
          ['Conduta', 'Relacionamento', 'Sugestão', 'Outros'],
        ],
        ['Outra', ['Outros']],
      ])
        db.save('categorias', id, { nome, subcategorias, ativo: true, setorId: null });
      db.save('chats', id, {
        nome: 'Geral da Empresa',
        tipo: 'empresa',
        participantes: [],
        data: now(),
      });
      audit(
        { ...req, company: id, user },
        'Empresa criada',
        'Empresa e administrador principal cadastrados',
      );
      return { empresa, ...session(user) };
    });
    res.status(201).json(result);
  });
  app.post('/api/login', (req, res) => {
    const mail = email(req.body.email),
      pass = String(req.body.senha || '');
    let empresa, user;
    if (req.body.codigoEmpresa) {
      empresa = companyByCode(req.body.codigoEmpresa);
      user = empresa && db.list('usuarios', empresa.id).find((u) => u.email === mail);
    } else {
      const candidates = db.sql
        .prepare('SELECT id,empresaId FROM usuarios WHERE email=? AND ativo=1')
        .all(mail)
        .map((r) => db.get('usuarios', r.id, r.empresaId));
      const matches = candidates.filter(
        (u) => verifyPassword(pass, u.senha) && db.get('empresas', u.empresaId, u.empresaId)?.ativo,
      );
      if (matches.length > 1)
        return res.status(409).json({
          error: 'Este acesso pertence a mais de uma empresa. Informe o código da empresa.',
          code: 'COMPANY_CODE_REQUIRED',
        });
      user = matches[0];
      empresa = user && db.get('empresas', user.empresaId, user.empresaId);
    }
    if (!user || !user.ativo || !empresa?.ativo || !verifyPassword(pass, user.senha))
      fail(401, 'Código da empresa, e-mail ou senha inválidos.');
    const result = db.transaction(() => {
      audit({ ...req, company: empresa.id, user }, 'Login', 'Sessão iniciada');
      return { ...session(user), empresa };
    });
    res.json(result);
  });
  app.get('/api/empresas/validar-codigo', (req, res) => {
    const e = companyByCode(req.query.codigo);
    if (!e?.ativo) fail(404, 'Código inválido.');
    res.json({ valido: true, empresa: { nome: e.nome }, nome: e.nome });
  });
  app.post('/api/empresas/entrar', (req, res) => {
    const empresa = companyByCode(req.body.codigoEmpresa || req.body.codigo);
    if (!empresa?.ativo) fail(400, 'Código da empresa inválido.');
    if (!empresa.permitirCadastro) fail(403, 'Solicite seu cadastro ao administrador.');
    const mail = email(req.body.email),
      nome = text(req.body.nome, 'Nome'),
      senha = hashPassword(password(req.body.senha));
    const result = db.transaction(() => {
      if (db.list('usuarios', empresa.id).some((u) => u.email === mail))
        fail(409, 'E-mail já cadastrado nesta empresa.');
      const user = db.save('usuarios', empresa.id, {
        empresaId: empresa.id,
        nome,
        email: mail,
        senha,
        role: 'colaborador',
        setorId: null,
        ativo: true,
        emailVerificado: false,
        dataCriacao: now(),
      });
      audit(
        { ...req, company: empresa.id, user },
        'Colaborador ingressou',
        'Ingresso com código da empresa',
      );
      return { ...session(user), empresa };
    });
    res.status(201).json(result);
  });
  app.post('/api/contato', (req, res) => {
    const b = req.body;
    db.sql
      .prepare('INSERT INTO contatos(id,nome,email,assunto,mensagem,data) VALUES(?,?,?,?,?,?)')
      .run(
        randomUUID(),
        text(b.nome, 'Nome'),
        email(b.email),
        text(b.assunto, 'Assunto'),
        text(b.mensagem, 'Mensagem', 5000),
        now(),
      );
    res.status(201).json({ ok: true, message: 'Mensagem registrada.' });
  });
  accountRecovery({
    app,
    db,
    auth,
    sendMail: sendMail || mailer({ directory: path.resolve(uploads, '../outbox') }),
    secret: jwtSecret,
  });
  app.use('/api', auth);
  app.post('/api/logout', (req, res) => {
    db.transaction(() => {
      db.remove('sessoes', req.session.id, req.company);
      audit(req, 'Logout', 'Sessão encerrada');
    });
    res.json({ ok: true });
  });
  app.get('/api/sessoes', (req, res) =>
    res.json(
      list('sessoes', req)
        .filter((s) => s.usuarioId === req.user.id)
        .map((s) => ({
          id: s.id,
          criadoEm: s.criadoEm,
          expira: s.expira,
          atual: s.id === req.session.id,
        })),
    ),
  );
  app.delete('/api/sessoes', (req, res) => {
    revoke(req.company, req.user.id, req.session.id);
    audit(req, 'Sessões revogadas', 'Outras sessões encerradas');
    res.json({ ok: true });
  });
  app.delete('/api/sessoes/:id', (req, res) => {
    const s = get('sessoes', req.params.id, req);
    if (s.usuarioId !== req.user.id) fail(404, 'Sessão não encontrada.');
    db.remove('sessoes', s.id, req.company);
    res.json({ ok: true });
  });
  app.get('/api/perfil', (req, res) =>
    res.json({ ...publicUser(req.user), empresa: get('empresas', req.company, req).nome }),
  );
  function profile(req, res) {
    const user = { ...req.user };
    if (req.body.nome !== undefined) user.nome = text(req.body.nome, 'Nome');
    if (req.body.telefone !== undefined) user.telefone = optional(req.body.telefone, 40);
    if (req.body.preferencias !== undefined) {
      if (
        !req.body.preferencias ||
        typeof req.body.preferencias !== 'object' ||
        Array.isArray(req.body.preferencias)
      )
        fail(400, 'Preferências inválidas.');
      user.preferencias = { ...user.preferencias, ...req.body.preferencias };
    }
    db.transaction(() => {
      if (req.body.novaSenha) {
        if (!verifyPassword(String(req.body.senhaAtual || ''), user.senha))
          fail(400, 'Senha atual incorreta.');
        user.senha = hashPassword(password(req.body.novaSenha));
        revoke(req.company, user.id);
      }
      db.save('usuarios', req.company, user);
      audit(
        req,
        req.body.novaSenha ? 'Senha alterada' : 'Perfil atualizado',
        'Dados de perfil atualizados',
      );
    });
    res.json({ ...publicUser(user), sessionRevoked: !!req.body.novaSenha });
  }
  app.put('/api/perfil', profile);
  app.patch('/api/perfil', profile);
  app.get('/api/empresa', (req, res) =>
    res.json({
      ...get('empresas', req.company, req),
      totalUsuarios: list('usuarios', req).length,
      totalSetores: list('setores', req).length,
    }),
  );
  app.put('/api/empresa', principal, (req, res) => {
    const e = get('empresas', req.company, req);
    e.nome = text(req.body.nome, 'Empresa');
    if (req.body.permitirCadastro !== undefined)
      e.permitirCadastro = req.body.permitirCadastro === true;
    for (const p of priorities) {
      const h = Number(req.body.sla?.[p] ?? e.sla[p]);
      if (!Number.isFinite(h) || h < 1 || h > 8760) fail(400, 'SLA deve ter entre 1 e 8760 horas.');
      e.sla[p] = h;
    }
    db.transaction(() => {
      db.save('empresas', req.company, e);
      audit(req, 'Empresa atualizada', e.nome);
    });
    res.json(e);
  });
  app.post('/api/empresa/renovar-codigo', principal, (req, res) => {
    const e = db.transaction(() => {
      const e = get('empresas', req.company, req);
      e.codigo = uniqueCode();
      db.save('empresas', req.company, e);
      audit(req, 'Código renovado', 'Código de ingresso alterado');
      return e;
    });
    res.json(e);
  });
  app.get('/api/setores', (req, res) => paginated(list('setores', req), req, res));
  app.post('/api/setores', principal, (req, res) => {
    const s = db.transaction(() => {
      const s = db.save('setores', req.company, {
        nome: text(req.body.nome, 'Nome'),
        descricao: optional(req.body.descricao),
        ativo: true,
        dataCriacao: now(),
      });
      audit(req, 'Setor criado', s.nome);
      return s;
    });
    res.status(201).json(s);
  });
  function saveSector(req, res) {
    const s = get('setores', req.params.id, req);
    if (req.body.nome !== undefined) s.nome = text(req.body.nome, 'Nome');
    if (req.body.descricao !== undefined) s.descricao = optional(req.body.descricao);
    if (typeof req.body.ativo === 'boolean') s.ativo = req.body.ativo;
    db.transaction(() => {
      db.save('setores', req.company, s);
      audit(req, 'Setor atualizado', s.nome);
    });
    res.json(s);
  }
  app.put('/api/setores/:id', principal, saveSector);
  app.patch('/api/setores/:id', principal, saveSector);
  app.delete('/api/setores/:id', principal, (req, res) => {
    get('setores', req.params.id, req);
    if (
      list('usuarios', req).some((u) => u.setorId === req.params.id) ||
      list('ordens', req).some((o) => o.setorResponsavelId === req.params.id) ||
      list('categorias', req).some((c) => c.setorId === req.params.id)
    )
      fail(409, 'Setor vinculado a usuários, categorias ou ordens. Desative-o.');
    db.transaction(() => {
      db.remove('setores', req.params.id, req.company);
      audit(req, 'Setor excluído', req.params.id);
    });
    res.json({ ok: true });
  });
  app.get('/api/categorias', (req, res) =>
    res.json(
      list('categorias', req).filter(
        (c) => !req.query.setorId || !c.setorId || c.setorId === req.query.setorId,
      ),
    ),
  );
  function categoryWrite(req, id) {
    if (!isAdmin(req.user) && req.user.role !== 'administrador_setor')
      fail(403, 'Permissão negada.');
    const old = id ? get('categorias', id, req) : {},
      setorId = req.body.setorId || null;
    if (
      !isAdmin(req.user) &&
      (setorId !== req.user.setorId || (id && old.setorId !== req.user.setorId))
    )
      fail(403, 'Categoria de outro setor.');
    if (setorId) sector(setorId, req);
    const subcategorias = req.body.subcategorias || [];
    if (!Array.isArray(subcategorias) || subcategorias.length > 40)
      fail(400, 'Subcategorias inválidas.');
    const c = {
      ...old,
      nome: text(req.body.nome, 'Nome'),
      setorId,
      ativo: req.body.ativo !== false,
      subcategorias: [...new Set(subcategorias.map((s) => text(s, 'Subcategoria', 100)))],
    };
    return db.transaction(() => {
      const result = db.save('categorias', req.company, c);
      audit(req, 'Categoria atualizada', c.nome);
      return result;
    });
  }
  app.post('/api/categorias', manager, (req, res) => res.status(201).json(categoryWrite(req)));
  app.put('/api/categorias/:id', manager, (req, res) =>
    res.json(categoryWrite(req, req.params.id)),
  );
  app.delete('/api/categorias/:id', principal, (req, res) => {
    const c = get('categorias', req.params.id, req);
    if (list('ordens', req).some((o) => o.categoriaId === c.id))
      fail(409, 'Categoria vinculada a ordens. Desative-a.');
    db.remove('categorias', c.id, req.company);
    audit(req, 'Categoria excluída', c.nome);
    res.json({ ok: true });
  });
  app.get('/api/usuarios', (req, res) => {
    const management = req.query.gestao === '1';
    if (management && !isAdmin(req.user) && req.user.role !== 'administrador_setor')
      fail(403, 'Permissão negada.');
    const users = list('usuarios', req)
      .filter((u) => !management || isAdmin(req.user) || u.setorId === req.user.setorId)
      .map((u) =>
        isAdmin(req.user) ||
        (req.user.role === 'administrador_setor' && u.setorId === req.user.setorId) ||
        u.id === req.user.id
          ? publicUser(u)
          : {
              id: u.id,
              nome: u.nome,
              setorId: u.setorId,
              ativo: u.ativo,
              role: u.role,
              avatar: u.avatar,
            },
      );
    paginated(users, req, res);
  });
  function saveUser(req, id) {
    const old = id ? get('usuarios', id, req) : null,
      body = req.body;
    if (!isAdmin(req.user) && req.user.role !== 'administrador_setor')
      fail(403, 'Permissão negada.');
    const role = body.role || old?.role || 'colaborador',
      setorId = body.setorId === undefined ? old?.setorId || null : body.setorId || null;
    if (!roles.includes(role)) fail(400, 'Perfil inválido.');
    if (setorId) sector(setorId, req);
    if (['gestor', 'administrador_setor'].includes(role) && !setorId)
      fail(400, 'Vincule este perfil a um setor.');
    if (
      !isAdmin(req.user) &&
      (setorId !== req.user.setorId ||
        !['gestor', 'colaborador'].includes(role) ||
        (old &&
          (old.setorId !== req.user.setorId || !['gestor', 'colaborador'].includes(old.role))))
    )
      fail(403, 'Você só pode gerenciar gestores e colaboradores do próprio setor.');
    if (old?.id === req.user.id && (body.ativo === false || role !== req.user.role))
      fail(400, 'Não é possível remover seu próprio acesso administrativo.');
    const mail = email(body.email ?? old?.email);
    if (list('usuarios', req).some((u) => u.email === mail && u.id !== id))
      fail(409, 'E-mail já cadastrado.');
    const u = {
      ...old,
      id: old?.id || randomUUID(),
      nome: text(body.nome ?? old?.nome, 'Nome'),
      email: mail,
      role,
      setorId,
      ativo: body.ativo === undefined ? (old?.ativo ?? true) : body.ativo === true,
      empresaId: req.company,
      dataCriacao: old?.dataCriacao || now(),
    };
    if (!old || body.senha) u.senha = hashPassword(password(body.senha));
    return db.transaction(() => {
      db.save('usuarios', req.company, u);
      if (
        old &&
        (old.role !== u.role || old.ativo !== u.ativo || old.setorId !== u.setorId || body.senha)
      )
        revoke(req.company, u.id);
      audit(req, old ? 'Usuário atualizado' : 'Usuário criado', u.nome);
      return publicUser(u);
    });
  }
  app.post('/api/usuarios', manager, (req, res) => res.status(201).json(saveUser(req)));
  app.put('/api/usuarios/:id', manager, (req, res) => res.json(saveUser(req, req.params.id)));
  app.patch('/api/usuarios/:id', manager, (req, res) => res.json(saveUser(req, req.params.id)));
  app.get('/api/ordens', (req, res) =>
    paginated(
      orders(req).map((o) => serializeOrder(o, req)),
      req,
      res,
    ),
  );
  const upload = multer({
    storage: multer.diskStorage({
      destination: uploads,
      filename: (req, file, cb) => cb(null, randomUUID()),
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: 5, fields: 25 },
    fileFilter: (req, file, cb) =>
      ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(file.mimetype)
        ? cb(null, true)
        : cb(Object.assign(new Error('Envie PNG, JPG, WebP ou PDF.'), { status: 400 })),
  });
  function validFile(file) {
    const bytes = readFileSync(file.path);
    const valid = {
      'image/png': () =>
        bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      'image/jpeg': () => bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
      'image/webp': () =>
        bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP',
      'application/pdf': () => bytes.toString('ascii', 0, 5) === '%PDF-',
    };
    if (!valid[file.mimetype]?.())
      fail(400, 'O conteúdo do arquivo não corresponde ao formato informado.');
    return {
      id: file.filename,
      nome: path.basename(file.originalname).replace(/[\r\n]/g, ''),
      tipo: file.mimetype,
      data: now(),
    };
  }
  const cleanup = (files) => {
    for (const f of files || []) if (existsSync(f.path)) unlinkSync(f.path);
  };
  function categoryChoice(body, req, setorId) {
    const id = body.categoriaId,
      name = body.categoria;
    let category;
    if (id) category = get('categorias', id, req);
    else if (name) category = list('categorias', req).find((c) => c.nome === name);
    if (
      (id || name) &&
      (!category || category.ativo === false || (category.setorId && category.setorId !== setorId))
    )
      fail(400, 'Categoria inválida para o setor.');
    const subcategoria = optional(body.subcategoria, 100);
    if (subcategoria && (!category || (category.subcategorias || []).indexOf(subcategoria) < 0))
      fail(400, 'Subcategoria inválida.');
    return {
      categoriaId: category?.id || null,
      categoria: category?.nome || 'Geral',
      subcategoria,
    };
  }
  app.post('/api/ordens', upload.array('anexos', 5), (req, res) => {
    try {
      sector(req.body.setorResponsavelId, req);
      const prioridade = req.body.prioridade || 'Média';
      if (!priorities.includes(prioridade)) fail(400, 'Prioridade inválida.');
      const e = get('empresas', req.company, req),
        category = categoryChoice(req.body, req, req.body.setorResponsavelId);
      const anexos = (req.files || []).map((f) => ({ ...validFile(f), usuarioId: req.user.id }));
      const o = db.transaction(() => {
        const next = db.sql
          .prepare(
            'SELECT COALESCE(MAX(CAST(substr(protocolo,4) AS INTEGER)),0)+1 AS next FROM ordens WHERE empresaId=?',
          )
          .get(req.company).next;
        const o = db.save('ordens', req.company, {
          titulo: text(req.body.titulo, 'Título'),
          descricao: text(req.body.descricao, 'Descrição', 10000),
          setorResponsavelId: req.body.setorResponsavelId,
          setorSolicitanteId: req.user.setorId,
          solicitanteId: req.user.id,
          solicitanteNome: req.user.nome,
          ...category,
          prioridade,
          status: 'Aberta',
          sigilo: bool(req.body.sigilo),
          prazo:
            deadline(req.body.prazo) ||
            new Date(Date.now() + e.sla[prioridade] * 3600000).toISOString(),
          protocolo: `OS-${String(next).padStart(5, '0')}`,
          dataAbertura: now(),
          dataAtualizacao: now(),
          anexos,
        });
        history(req, o, 'Abertura', 'Ordem criada');
        for (const u of list('usuarios', req).filter(
          (u) =>
            u.ativo &&
            u.id !== req.user.id &&
            (isAdmin(u) || (isManager(u) && u.setorId === o.setorResponsavelId)),
        ))
          notify(req, u.id, 'Nova ordem', o.protocolo, o.id);
        audit(req, 'Ordem criada', o.protocolo);
        return o;
      });
      res.status(201).json(serializeOrder(o, req));
    } catch (e) {
      cleanup(req.files);
      throw e;
    }
  });
  app.get('/api/ordens/:id', (req, res) => res.json(serializeOrder(order(req), req, true)));
  function updateOrder(req, res) {
    const o = order(req),
      b = req.body;
    if (!canManage(o, req))
      fail(403, 'A ordem deve ser atendida por outro responsável autorizado.');
    const status = b.status || o.status;
    if (!statuses.includes(status)) fail(400, 'Status inválido.');
    const obs = text(b.observacao, 'Justificativa', 3000);
    if (status !== o.status && !transitions[o.status]?.includes(status))
      fail(409, 'Transição de status inválida.');
    if (b.prioridade && !priorities.includes(b.prioridade)) fail(400, 'Prioridade inválida.');
    const setorId = b.setorResponsavelId || o.setorResponsavelId;
    if (setorId !== o.setorResponsavelId) {
      sector(setorId, req);
      if (!isAdmin(req.user) && req.user.role !== 'administrador_setor')
        fail(403, 'Somente administradores podem encaminhar para outro setor.');
    }
    const responsavelId =
      b.responsavelId === undefined
        ? setorId !== o.setorResponsavelId
          ? null
          : o.responsavelId
        : b.responsavelId || null;
    if (responsavelId) {
      const u = get('usuarios', responsavelId, req);
      if (
        !u.ativo ||
        !isManager(u) ||
        (!isAdmin(u) && u.setorId !== setorId) ||
        u.id === o.solicitanteId
      )
        fail(400, 'Responsável inválido. O solicitante não pode atender a própria ordem.');
    }
    const previous = o.status;
    const result = db.transaction(() => {
      const updated = {
        ...o,
        status,
        prioridade: b.prioridade || o.prioridade,
        prazo: deadline(b.prazo === undefined ? o.prazo : b.prazo),
        setorResponsavelId: setorId,
        responsavelId,
        dataAtualizacao: now(),
        primeiraResposta: o.primeiraResposta || now(),
        dataConclusao: status === 'Concluída' ? o.dataConclusao || now() : null,
      };
      if (b.titulo !== undefined) updated.titulo = text(b.titulo, 'Título');
      if (b.descricao !== undefined) updated.descricao = text(b.descricao, 'Descrição', 10000);
      if (b.categoriaId || b.categoria || b.subcategoria !== undefined)
        Object.assign(updated, categoryChoice(b, req, setorId));
      db.save('ordens', req.company, updated);
      history(req, o, 'Atualização', `${previous} → ${status}. ${obs}`);
      notify(req, o.solicitanteId, 'Ordem atualizada', `${o.protocolo}: ${status}`, o.id);
      audit(req, 'Ordem atualizada', o.protocolo);
      return updated;
    });
    res.json(serializeOrder(result, req));
  }
  app.patch('/api/ordens/:id', manager, updateOrder);
  app.put('/api/ordens/:id', manager, updateOrder);
  app.patch('/api/ordens/:id/cancelar', (req, res) => {
    const o = order(req);
    if (o.solicitanteId !== req.user.id || o.status !== 'Aberta')
      fail(403, 'Somente o solicitante pode cancelar uma ordem ainda aberta.');
    const motivo = text(req.body.observacao, 'Justificativa', 3000);
    db.transaction(() => {
      o.status = 'Cancelada';
      o.dataAtualizacao = now();
      db.save('ordens', req.company, o);
      history(req, o, 'Cancelamento', motivo);
      audit(req, 'Ordem cancelada', o.protocolo);
    });
    res.json(serializeOrder(o, req));
  });
  app.post('/api/ordens/:id/comentarios', (req, res) => {
    const o = order(req),
      descricao = text(req.body.descricao, 'Mensagem', 5000);
    const h = db.transaction(() => {
      const h = history(req, o, 'Comentário', descricao);
      if (o.solicitanteId !== req.user.id) {
        if (!o.primeiraResposta) {
          o.primeiraResposta = now();
          db.save('ordens', req.company, o);
        }
        notify(req, o.solicitanteId, 'Nova resposta', o.protocolo, o.id);
      } else
        for (const u of list('usuarios', req).filter(
          (u) =>
            u.ativo &&
            u.id !== req.user.id &&
            (isAdmin(u) || (isManager(u) && u.setorId === o.setorResponsavelId)),
        ))
          notify(req, u.id, 'Novo comentário', o.protocolo, o.id);
      audit(req, 'Comentário adicionado', o.protocolo);
      return h;
    });
    res.status(201).json(h);
  });
  app.post(
    '/api/ordens/:id/anexos',
    (req, res, next) => {
      if (order(req).anexos.length >= 5) fail(400, 'Limite de cinco anexos.');
      next();
    },
    upload.single('arquivo'),
    (req, res) => {
      try {
        if (!req.file) fail(400, 'Selecione um arquivo.');
        const o = order(req),
          a = { ...validFile(req.file), ordemId: o.id, usuarioId: req.user.id };
        db.transaction(() => {
          db.save('anexos', req.company, a);
          audit(req, 'Anexo adicionado', o.protocolo);
        });
        res.status(201).json(a);
      } catch (e) {
        cleanup([req.file].filter(Boolean));
        throw e;
      }
    },
  );
  app.get('/api/ordens/:id/anexos/:arquivo', (req, res) => {
    const o = order(req),
      a = o.anexos.find((a) => a.id === req.params.arquivo);
    if (!a) fail(404, 'Anexo não encontrado.');
    res.download(path.resolve(uploads, a.id), a.nome);
  });
  app.delete('/api/ordens/:id/anexos/:arquivo', (req, res) => {
    const o = order(req),
      a = o.anexos.find((a) => a.id === req.params.arquivo);
    if (!a) fail(404, 'Anexo não encontrado.');
    if (a.usuarioId !== req.user.id && !canManage(o, req)) fail(403, 'Permissão negada.');
    db.transaction(() => {
      db.remove('anexos', a.id, req.company);
      audit(req, 'Anexo removido', o.protocolo);
    });
    const file = path.resolve(uploads, a.id);
    if (existsSync(file)) unlinkSync(file);
    res.json({ ok: true });
  });
  app.get('/api/dashboard', (req, res) => res.json(report(req)));
  app.get('/api/relatorios', manager, (req, res) => res.json(report(req)));
  app.get('/api/relatorios/csv', manager, (req, res) => {
    const cell = (value) => {
      let s = String(value ?? '');
      if (/^[\s]*[=+@\-\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replaceAll('"', '""') + '"';
    };
    const rows = [
      [
        'Protocolo',
        'Título',
        'Status',
        'Prioridade',
        'Setor',
        'Categoria',
        'Abertura',
        'Prazo',
        'Conclusão',
      ],
      ...orders(req).map((o) => [
        o.protocolo,
        o.titulo,
        o.status,
        o.prioridade,
        get('setores', o.setorResponsavelId, req).nome,
        o.categoria,
        o.dataAbertura,
        o.prazo,
        o.dataConclusao,
      ]),
    ];
    audit(req, 'Relatório exportado', 'CSV de ordens autorizadas');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="ordens.csv"');
    res.send('\uFEFF' + rows.map((row) => row.map(cell).join(';')).join('\r\n'));
  });
  app.get('/api/notificacoes', (req, res) => {
    const rows = list('notificacoes', req)
      .filter((n) => n.usuarioId === req.user.id)
      .reverse();
    if (req.query.legacy === '1')
      return res.json({ notificacoes: rows, naoLidas: rows.filter((n) => !n.lida).length });
    paginated(rows, req, res);
  });
  const markNotification = (req, res) => {
    const n = get('notificacoes', req.params.id, req);
    if (n.usuarioId !== req.user.id) fail(404, 'Notificação não encontrada.');
    n.lida = req.body.lida !== false;
    db.save('notificacoes', req.company, n);
    res.json(n);
  };
  app.put('/api/notificacoes/:id', markNotification);
  app.patch('/api/notificacoes/:id', markNotification);
  app.patch('/api/notificacoes', (req, res) => {
    db.transaction(() => {
      for (const n of list('notificacoes', req).filter(
        (n) => n.usuarioId === req.user.id && !n.lida,
      ))
        db.save('notificacoes', req.company, { ...n, lida: true });
    });
    res.json({ ok: true });
  });
  app.delete('/api/notificacoes/:id', (req, res) => {
    const n = get('notificacoes', req.params.id, req);
    if (n.usuarioId !== req.user.id) fail(404, 'Notificação não encontrada.');
    db.remove('notificacoes', n.id, req.company);
    res.json({ ok: true });
  });
  app.get('/api/auditoria', principal, (req, res) => {
    const secretOrders = list('ordens', req).filter(
      (o) => o.sigilo && o.solicitanteId !== req.user.id,
    );
    const rows = list('auditoria', req)
      .reverse()
      .map((a) =>
        secretOrders.some((o) => a.detalhes === o.protocolo && a.usuarioId === o.solicitanteId)
          ? { ...a, usuarioId: null, usuarioNome: 'Solicitante sigiloso', ip: null }
          : a,
      );
    paginated(rows, req, res);
  });
  app.post('/api/conhecimento/:id/visualizacao', (req, res) => {
    const a = get('conhecimento', req.params.id, req);
    a.visualizacoes = (a.visualizacoes || 0) + 1;
    db.save('conhecimento', req.company, a);
    res.json({ ok: true });
  });
  app.post('/api/conhecimento/:id/util', (req, res) => {
    const a = get('conhecimento', req.params.id, req);
    db.transaction(() => {
      const r = db.sql
        .prepare('INSERT OR IGNORE INTO votos_artigos(empresaId,artigoId,usuarioId) VALUES(?,?,?)')
        .run(req.company, a.id, req.user.id);
      if (r.changes) {
        a.uteis = (a.uteis || 0) + 1;
        db.save('conhecimento', req.company, a);
      }
    });
    res.json({ uteis: a.uteis });
  });
  app.get('/api/conhecimento', (req, res) => paginated(list('conhecimento', req), req, res));
  const articleFields = (b) => ({
    titulo: text(b.titulo, 'Título'),
    conteudo: text(b.conteudo, 'Conteúdo', 20000),
    categoria: text(b.categoria || 'Geral', 'Categoria'),
    resumo: optional(b.resumo, 500),
    tags: Array.isArray(b.tags) ? b.tags.slice(0, 15).map((v) => text(v, 'Tag', 40)) : [],
    fixado: b.fixado === true,
    atualizadoEm: now(),
  });
  app.post('/api/conhecimento', manager, (req, res) => {
    const a = db.transaction(() => {
      const a = db.save('conhecimento', req.company, {
        ...articleFields(req.body),
        autorId: req.user.id,
        autorNome: req.user.nome,
        data: now(),
        criadoEm: now(),
        visualizacoes: 0,
        uteis: 0,
      });
      audit(req, 'Artigo criado', a.titulo);
      return a;
    });
    res.status(201).json(a);
  });
  const editArticle = (req) => {
    const a = get('conhecimento', req.params.id, req);
    if (a.autorId !== req.user.id && !isAdmin(req.user))
      fail(403, 'Somente o autor ou administrador principal pode editar.');
    return a;
  };
  app.put('/api/conhecimento/:id', manager, (req, res) => {
    const a = editArticle(req);
    Object.assign(a, articleFields(req.body));
    db.transaction(() => {
      db.save('conhecimento', req.company, a);
      audit(req, 'Artigo atualizado', a.titulo);
    });
    res.json(a);
  });
  app.delete('/api/conhecimento/:id', manager, (req, res) => {
    const a = editArticle(req);
    db.transaction(() => {
      db.remove('conhecimento', a.id, req.company);
      audit(req, 'Artigo excluído', a.titulo);
    });
    res.json({ ok: true });
  });
  const chats = (req) =>
    list('chats', req).filter((c) => c.tipo === 'empresa' || c.participantes.includes(req.user.id));
  app.get('/api/chats', (req, res) => res.json(chats(req)));
  app.post('/api/chats', (req, res) => {
    const other = get('usuarios', req.body.usuarioId, req);
    if (other.id === req.user.id || !other.ativo) fail(400, 'Selecione outro usuário ativo.');
    const c = db.transaction(() => {
      let c = chats(req).find((c) => c.tipo === 'privado' && c.participantes.includes(other.id));
      if (!c)
        c = db.save('chats', req.company, {
          nome: `${req.user.nome} / ${other.nome}`,
          tipo: 'privado',
          participantes: [req.user.id, other.id],
          data: now(),
        });
      return c;
    });
    res.status(201).json(c);
  });
  const chat = (req) =>
    chats(req).find((c) => c.id === req.params.id) || fail(404, 'Conversa não encontrada.');
  app.patch('/api/chats/:id/leitura', (req, res) => {
    chat(req);
    db.transaction(() => {
      for (const m of list('mensagens', req).filter((m) => m.chatId === req.params.id))
        db.save('mensagens', req.company, {
          ...m,
          lidaPor: [...new Set([...(m.lidaPor || [m.usuarioId]), req.user.id])],
        });
    });
    res.json({ ok: true });
  });
  app.get('/api/chats/:id/mensagens', (req, res) => {
    chat(req);
    const rows = list('mensagens', req).filter((m) => m.chatId === req.params.id);
    paginated(rows, req, res);
  });
  app.post('/api/chats/:id/mensagens', (req, res) => {
    const c = chat(req);
    const m = db.transaction(() => {
      const m = db.save('mensagens', req.company, {
        chatId: c.id,
        usuarioId: req.user.id,
        usuarioNome: req.user.nome,
        texto: text(req.body.texto, 'Mensagem', 3000),
        data: now(),
      });
      if (c.tipo === 'privado')
        for (const id of c.participantes.filter((id) => id !== req.user.id))
          notify(req, id, 'Nova mensagem privada', `Mensagem de ${req.user.nome}`, null);
      return m;
    });
    res.status(201).json(m);
  });
  app.post('/api/perfil/avatar', upload.single('avatar'), (req, res) => {
    try {
      if (!req.file || !req.file.mimetype.startsWith('image/'))
        fail(400, 'Selecione uma imagem PNG, JPG ou WebP.');
      validFile(req.file);
      const old = req.user.avatar;
      db.save('usuarios', req.company, {
        ...req.user,
        avatar: req.file.filename,
        avatarTipo: req.file.mimetype,
      });
      audit(req, 'Foto de perfil atualizada', 'Avatar atualizado');
      if (old && existsSync(path.join(uploads, old))) unlinkSync(path.join(uploads, old));
      res.json({ avatar: req.file.filename });
    } catch (e) {
      cleanup([req.file].filter(Boolean));
      throw e;
    }
  });
  app.get('/api/avatares/:id', (req, res) => {
    const u = list('usuarios', req).find((u) => u.avatar === req.params.id);
    if (!u) fail(404, 'Imagem não encontrada.');
    res.type(u.avatarTipo || 'image/png').sendFile(path.resolve(uploads, u.avatar));
  });
  app.use('/api', (req, res) =>
    res.status(404).json({ error: 'Rota não encontrada.', requestId: req.requestId }),
  );
  if (frontend && existsSync(frontend)) {
    app.use(express.static(frontend));
    app.get('/{*path}', (req, res) => res.sendFile(path.join(frontend, 'index.html')));
  }
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    let status = err.status || 500,
      message = err.message;
    if (err instanceof multer.MulterError) {
      status = 400;
      message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Arquivo maior que 5 MB.'
          : 'Upload inválido ou limite de arquivos excedido.';
    }
    if (/UNIQUE constraint failed/.test(err.message)) {
      status = 409;
      message = 'Já existe um registro com esses dados.';
    }
    if (/FOREIGN KEY constraint failed|CHECK constraint failed/.test(err.message)) {
      status = 400;
      message = 'Dados ou vínculos inválidos.';
    }
    if (status === 500) {
      console.error({ requestId: req.requestId, error: err.message });
      message = 'Erro interno. Tente novamente.';
    }
    res.status(status).json({ error: message, requestId: req.requestId });
  });
  return app;
}
