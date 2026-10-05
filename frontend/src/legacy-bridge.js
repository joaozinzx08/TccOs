import Chart from 'chart.js/auto';
import DOMPurify from 'dompurify';
import { api, request, clearSession, download } from './api.js';
const scripts = new Map(),
  avatars = new Map();
const allowedActions = new Set([
  'abrirArtigo',
  'abrirConversa',
  'abrirDetalhes',
  'abrirModalDia',
  'abrirModalEditarSetor',
  'abrirModalEditarUsuario',
  'abrirModalDelete',
  'reativarUsuario',
  'reativarSetor',
  'atualizarStatus',
  'adicionarObservacao',
  'removerArquivo',
  'fecharModalDetalhes',
  'editarArtigo',
  'confirmarExclusao',
  'marcarUtil',
  'abrirNotificacao',
  'excluirNotificacao',
  'irParaOS',
  'toggleLida',
  'limparFiltros',
  'cancelarOS',
  'verOS',
  'iniciarConversa',
  'legacyDownload',
  'comentarOrdem',
]);
const splitStatements = (code) =>
  code
    .split(/;(?=(?:[^']*'[^']*')*[^']*$)/)
    .map((s) => s.trim())
    .filter(Boolean);
function parseAction(code) {
  const statements = splitStatements(code),
    actions = [];
  for (let statement of statements) {
    if (statement === 'event.stopPropagation()') {
      actions.push({ stop: true });
      continue;
    }
    if (statement === 'return false') {
      actions.push({ prevent: true });
      continue;
    }
    statement = statement.replace(/^if\(!this\.classList\.contains\('dragging'\)\)\s*/, '');
    const navigation = statement.match(/^window\.location\.href\s*=\s*(['"])([^'"]+)\1$/);
    if (navigation) {
      const href = navigation[2];
      if (
        !/^(?:\.\.\/)?(?:admin\/|gestor\/|colaborador\/)?[a-z-]+\.html(?:\?[a-zA-Z0-9=&_%-]*)?$/.test(
          href,
        )
      )
        return null;
      actions.push({ href });
      continue;
    }
    const match = statement.match(/^(\w+)\((.*)\)$/s);
    if (!match || !allowedActions.has(match[1])) return null;
    const raw = match[2].trim(),
      parts = raw
        ? raw.match(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\b(?:this|event|true|false|\d+)\b/g) || []
        : [];
    if (parts.join(',').replace(/\s/g, '') !== raw.replace(/\s/g, '')) return null;
    const args = [];
    for (const value of parts) {
      if (['this', 'event'].includes(value)) {
        args.push({ ref: value });
        continue;
      }
      if (value === 'true' || value === 'false') {
        args.push({ value: value === 'true' });
        continue;
      }
      if (/^\d+$/.test(value)) {
        args.push({ value: Number(value) });
        continue;
      }
      const text = value.slice(1, -1).replace(/\\(['"\\])/g, '$1');
      if (/[<>\r\n]/.test(text)) return null;
      args.push({ value: text });
    }
    actions.push({ fn: match[1], args });
  }
  return actions;
}
function secureLegacyHTML() {
  const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  let inside = false;
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    if (data.attrName === 'onclick' && parseAction(data.attrValue)) {
      data.forceKeepAttr = true;
    }
    if (['src', 'href'].includes(data.attrName) && /^javascript:/i.test(data.attrValue))
      data.keepAttr = false;
  });
  Object.defineProperty(Element.prototype, 'innerHTML', {
    ...descriptor,
    set(value) {
      if (inside || typeof value !== 'string') {
        descriptor.set.call(this, value);
        return;
      }
      inside = true;
      try {
        const wrappers = {
          TABLE: ['<table>', '</table>', 'table'],
          THEAD: ['<table><thead>', '</thead></table>', 'thead'],
          TBODY: ['<table><tbody>', '</tbody></table>', 'tbody'],
          TFOOT: ['<table><tfoot>', '</tfoot></table>', 'tfoot'],
          TR: ['<table><tbody><tr>', '</tr></tbody></table>', 'tr'],
        };
        const wrap = wrappers[this.tagName];
        let clean = DOMPurify.sanitize(wrap ? wrap[0] + value + wrap[1] : value, {
          FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'style', 'form'],
        });
        if (wrap) {
          const container = new DOMParser()
            .parseFromString(clean, 'text/html')
            .querySelector(wrap[2]);
          clean = container ? descriptor.get.call(container) : '';
        }
        descriptor.set.call(this, clean);
        for (const element of this.querySelectorAll('[onclick]')) {
          const actions = parseAction(element.getAttribute('onclick'));
          element.removeAttribute('onclick');
          if (actions)
            element.addEventListener('click', (event) => {
              for (const action of actions) {
                if (action.stop) {
                  event.stopPropagation();
                  continue;
                }
                if (action.prevent) {
                  event.preventDefault();
                  continue;
                }
                if (action.href) {
                  if (!element.classList.contains('dragging')) location.href = action.href;
                  continue;
                }
                const fn = window[action.fn];
                if (typeof fn === 'function') {
                  const args = action.args.map((a) =>
                    a.ref === 'this' ? element : a.ref === 'event' ? event : a.value,
                  );
                  Promise.resolve(fn(...args)).catch((error) =>
                    window.showToast?.(error.message, 'error'),
                  );
                }
              }
            });
        }
      } finally {
        inside = false;
      }
    },
  });
}
export function loadScript(src) {
  if (scripts.has(src)) return scripts.get(src);
  const result = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(Error('Não foi possível carregar ' + src));
    document.head.append(s);
  });
  scripts.set(src, result);
  return result;
}
function adapt(endpoint, data) {
  if (endpoint.split('?')[0] === '/notificacoes' && Array.isArray(data))
    return { notificacoes: data, naoLidas: data.filter((n) => !n.lida).length };
  return data;
}
let installed = false;
export function installBridge({ login }) {
  if (installed) return;
  installed = true;
  secureLegacyHTML();
  window.Chart = Chart;
  window.API_BASE = '/api';
  window.escapeHTML = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  window.onLegacyReady = (callback) => queueMicrotask(callback);
  window.clearSession = clearSession;
  window.avatarURL = (id) => avatars.get(id) || '/assets/logo.png';
  window.legacyDownload = (order, id, name) => download(`/ordens/${order}/anexos/${id}`, name);
  window.apiRequest = async (endpoint, options = {}) => {
    let body = options.body
      ? typeof options.body === 'string'
        ? JSON.parse(options.body)
        : options.body
      : undefined;
    if (/^\/ordens\/[^/]+$/.test(endpoint) && ['PUT', 'PATCH'].includes(options.method)) {
      if (
        body?.observacao &&
        !body.status &&
        !body.prioridade &&
        !body.prazo &&
        !body.responsavelId &&
        !body.setorResponsavelId
      ) {
        endpoint += '/comentarios';
        body = { descricao: body.observacao };
        options = { ...options, method: 'POST' };
      } else {
        if (body?.status && !body.observacao) {
          const motivo =
            document.getElementById('observacao-input')?.value.trim() ||
            prompt('Informe a justificativa para alterar o status:');
          if (!motivo) throw Error('Informe a justificativa.');
          body = { ...body, observacao: motivo };
        }
        const u = JSON.parse(localStorage.getItem('usuario') || '{}');
        if (u.role === 'colaborador' && body?.status === 'Cancelada') endpoint += '/cancelar';
        options = { ...options, method: 'PATCH' };
      }
    }
    if (
      /^\/(usuarios|setores)\/[^/]+$/.test(endpoint) &&
      options.method === 'PUT' &&
      Object.keys(body || {}).length === 1
    )
      options = { ...options, method: 'PATCH' };
    if (endpoint === '/perfil' && options.method === 'PUT')
      options = { ...options, method: 'PATCH' };
    if (body && !(body instanceof FormData)) options = { ...options, body: JSON.stringify(body) };
    let data;
    try {
      data = await api(endpoint, options);
    } catch (error) {
      if (endpoint === '/login' && error.code === 'COMPANY_CODE_REQUIRED') {
        const codigoEmpresa = prompt('Informe o código exclusivo da empresa:');
        if (!codigoEmpresa) throw error;
        data = await api(endpoint, {
          ...options,
          body: JSON.stringify({ ...body, codigoEmpresa }),
        });
      } else throw error;
    }
    if (data?.token && data?.usuario) login(data);
    if (data?.sessionRevoked) {
      clearSession();
      location.href = '/login.html';
    }
    if (
      endpoint.includes('/anexos') ||
      endpoint.includes('/comentarios') ||
      (/^\/ordens\/[^/]+$/.test(endpoint) && options.method === 'PATCH')
    ) {
      const id = endpoint.split('/')[2];
      if (document.getElementById('detail-modal')?.style.display === 'flex')
        queueMicrotask(() => window.abrirDetalhes?.(id));
    }
    return adapt(endpoint, data);
  };
  window.apiUpload = (endpoint, body) => api(endpoint, { method: 'POST', body });
  window.legacyFetch = async (url, options = {}) => {
    let endpoint = String(url)
      .replace(/^https?:\/\/localhost:3000/, '')
      .replace(/^\/api/, '');
    if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;
    if (endpoint === '/perfil' && options.method === 'PUT')
      options = { ...options, method: 'PATCH' };
    if (
      options.body &&
      typeof options.body === 'string' &&
      ['PUT', 'PATCH'].includes(options.method)
    ) {
      const body = JSON.parse(options.body);
      if (endpoint === '/perfil' && body.novaSenha) {
        const data = await window.apiRequest(endpoint, options);
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    const response = await request(endpoint, options),
      type = response.headers.get('content-type') || '';
    if (!type.includes('json')) return response;
    const data = await response.json();
    if (!response.ok) throw Error(data.error || 'Erro na requisição');
    if (endpoint === '/perfil/avatar' && data.avatar) {
      await cacheAvatar(data.avatar);
    }
    return new Response(JSON.stringify(adapt(endpoint, data)), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  document.addEventListener(
    'click',
    async (event) => {
      const logout = event.target.closest('#logout');
      if (logout) {
        event.preventDefault();
        event.stopImmediatePropagation();
        try {
          await api('/logout', { method: 'POST' });
        } finally {
          clearSession();
          location.href = '/login.html';
        }
      }
      const recovery = event.target.closest('.forgot-password');
      if (recovery) {
        event.preventDefault();
        event.stopImmediatePropagation();
        try {
          const codigoEmpresa = prompt('Código da empresa:'),
            email = document.getElementById('email')?.value || prompt('E-mail cadastrado:');
          if (!codigoEmpresa || !email) return;
          await api('/auth/esqueci-senha', {
            method: 'POST',
            body: JSON.stringify({ codigoEmpresa, email }),
          });
          alert('Se os dados estiverem corretos, um código foi enviado ao e-mail cadastrado.');
          const codigo = prompt('Código de 8 dígitos recebido:'),
            novaSenha = codigo && prompt('Nova senha (8 a 128 caracteres):');
          if (!codigo || !novaSenha) return;
          await api('/auth/redefinir-senha', {
            method: 'POST',
            body: JSON.stringify({ codigoEmpresa, email, codigo, novaSenha }),
          });
          window.showToast?.('Senha alterada. Faça seu login.', 'success');
        } catch (error) {
          window.showToast?.(error.message, 'error');
        }
      }
      const a = event.target.closest('[data-anexo]');
      if (a) {
        event.preventDefault();
        try {
          await download(`/ordens/${a.dataset.ordem}/anexos/${a.dataset.anexo}`, a.dataset.nome);
        } catch (e) {
          window.showToast?.(e.message, 'error');
        }
      }
    },
    true,
  );
}
async function cacheAvatar(id) {
  if (!id || avatars.has(id)) return;
  try {
    const r = await request('/avatares/' + id);
    if (r.ok) avatars.set(id, URL.createObjectURL(await r.blob()));
  } catch {}
}
export async function prepareLegacy(key) {
  if (/^(admin|gestor|colaborador)\//.test(key)) {
    const user = JSON.parse(localStorage.getItem('usuario') || '{}');
    await cacheAvatar(user.avatar);
    if (key.endsWith('/chat.html')) {
      const users = await api('/usuarios');
      await Promise.all(users.filter((u) => u.avatar).map((u) => cacheAvatar(u.avatar)));
    }
  }
}
export async function finishLegacy(key) {
  // Logout must revoke the server session even when the legacy page uses an
  // inline handler or a settings button instead of the shared sidebar link.
  window.logout = window.fazerLogout = async () => {
    try {
      await api('/logout', { method: 'POST' });
    } finally {
      clearSession();
      location.href = '/login.html';
    }
  };
  window.encerrarOutrasSessoes = async () => {
    try {
      await api('/sessoes', { method: 'DELETE' });
      window.showToast?.('Outras sessões encerradas', 'success');
    } catch (e) {
      window.showToast?.(e.message, 'error');
    }
  };
  if (key.endsWith('relatorios.html'))
    window.exportarCSV = () =>
      download('/relatorios/csv' + location.search, 'relatorio-ordens.csv');
  const category = document.getElementById('os-categoria'),
    sector = document.getElementById('os-setor-responsavel');
  if (category && sector) {
    const categories = await api('/categorias');
    const refresh = () => {
      const before = category.value;
      category.replaceChildren(
        ...categories
          .filter((c) => c.ativo !== false && (!c.setorId || c.setorId === sector.value))
          .map((c) => new Option(c.nome, c.nome)),
      );
      if ([...category.options].some((o) => o.value === before)) category.value = before;
      const sub = document.getElementById('os-subcategoria'),
        chosen = categories.find((c) => c.nome === category.value);
      if (sub?.tagName === 'INPUT') {
        let dl = document.getElementById('subcategorias-api');
        if (!dl) {
          dl = document.createElement('datalist');
          dl.id = 'subcategorias-api';
          document.body.append(dl);
          sub.setAttribute('list', dl.id);
        }
        dl.replaceChildren(...(chosen?.subcategorias || []).map((s) => new Option(s, s)));
        sub.title = 'Escolha uma subcategoria cadastrada ou deixe vazio.';
      }
    };
    sector.addEventListener('change', refresh);
    category.addEventListener('change', refresh);
    refresh();
  }
}
