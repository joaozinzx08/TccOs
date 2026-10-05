// Generate an endpoint inventory directly from the registered Express routes.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = ['app.js', 'account-recovery.js']
  .map((f) => readFileSync(path.join(root, 'backend/src', f), 'utf8'))
  .join('\n');
const publicRoutes = new Set([
  'POST /api/empresas',
  'POST /api/empresas/entrar',
  'POST /api/login',
  'GET /api/status',
  'GET /api/empresas/validar-codigo',
  'POST /api/contato',
  'POST /api/auth/esqueci-senha',
  'POST /api/auth/redefinir-senha',
  'POST /api/auth/confirmar-email',
  'GET /api/openapi.json',
]);
const schema = {
  openapi: '3.0.3',
  info: {
    title: 'GestãoOS — API',
    version: '4.0.0',
    description:
      'Inventário das rotas implementadas. Autenticação Bearer JWT. O servidor aplica permissões e isolamento por empresa. Exemplos, regras e filtros em docs/API.md. Os schemas detalhados cobrem os fluxos de entrada; os demais corpos são descritos no código e no guia.',
  },
  servers: [{ url: '/' }],
  security: [{ BearerJWT: [] }],
  components: {
    securitySchemes: { BearerJWT: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Erro: {
        type: 'object',
        properties: { error: { type: 'string' }, requestId: { type: 'string' } },
      },
      Login: {
        type: 'object',
        required: ['email', 'senha'],
        properties: {
          email: { type: 'string', format: 'email' },
          senha: { type: 'string', format: 'password' },
          codigoEmpresa: {
            type: 'string',
            description: 'Necessário se as credenciais identificarem mais de uma empresa.',
          },
        },
      },
      Empresa: {
        type: 'object',
        required: ['nome', 'responsavel', 'email', 'senha'],
        properties: {
          nome: { type: 'string' },
          responsavel: { type: 'string' },
          email: { type: 'string', format: 'email' },
          senha: { type: 'string', format: 'password', minLength: 8, maxLength: 128 },
        },
      },
      Ingresso: {
        type: 'object',
        required: ['codigoEmpresa', 'nome', 'email', 'senha'],
        properties: {
          codigoEmpresa: { type: 'string' },
          nome: { type: 'string' },
          email: { type: 'string', format: 'email' },
          senha: { type: 'string', format: 'password', minLength: 8, maxLength: 128 },
        },
      },
    },
  },
  paths: {},
};
const created = new Set([
  '/api/empresas',
  '/api/empresas/entrar',
  '/api/setores',
  '/api/categorias',
  '/api/usuarios',
  '/api/ordens',
  '/api/ordens/:id/comentarios',
  '/api/ordens/:id/anexos',
  '/api/conhecimento',
  '/api/chats',
  '/api/chats/:id/mensagens',
]);
for (const m of source.matchAll(/app\.(get|post|put|patch|delete)\(\s*'(\/api\/[^']+)'/g)) {
  const [, method, route] = m;
  const p = route.replace(/:(\w+)/g, '{$1}');
  const op = {
    tags: [route.split('/')[2]],
    summary: method.toUpperCase() + ' ' + p,
    operationId: method + '_' + route.replace(/[^a-zA-Z0-9]+/g, '_'),
    parameters: [...route.matchAll(/:(\w+)/g)].map((m) => ({
      name: m[1],
      in: 'path',
      required: true,
      schema: { type: 'string' },
    })),
    responses: {
      [method === 'post' && created.has(route) ? '201' : '200']: {
        description: 'Operação concluída. Consulte o guia para o formato da resposta.',
      },
      400: { description: 'Dados inválidos' },
      401: { description: 'Token ausente, inválido, expirado ou sessão revogada' },
      403: { description: 'Perfil sem permissão' },
      404: { description: 'Registro inexistente ou fora do escopo do usuário' },
      409: { description: 'Conflito ou transição inválida' },
      429: { description: 'Limite de requisições' },
    },
  };
  if (publicRoutes.has(method.toUpperCase() + ' ' + route)) op.security = [];
  if (['post', 'put', 'patch'].includes(method))
    op.requestBody = {
      required: false,
      content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
    };
  const ref =
    route === '/api/login'
      ? 'Login'
      : route === '/api/empresas'
        ? 'Empresa'
        : route === '/api/empresas/entrar'
          ? 'Ingresso'
          : null;
  if (ref)
    op.requestBody = {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/' + ref } } },
    };
  if (route === '/api/empresas/validar-codigo')
    op.parameters.push({ name: 'codigo', in: 'query', required: true, schema: { type: 'string' } });
  if (
    method === 'get' &&
    [
      'usuarios',
      'setores',
      'categorias',
      'ordens',
      'conhecimento',
      'auditoria',
      'notificacoes',
    ].some((x) => route === '/api/' + x)
  )
    for (const name of ['page', 'limit'])
      op.parameters.push({
        name,
        in: 'query',
        schema: { type: 'integer', minimum: 1 },
        description: 'Opcional. Sem paginação retorna array; com paginação retorna envelope.',
      });
  if (method === 'post' && (route.includes('/anexos') || route.endsWith('/avatar'))) {
    const key = route.endsWith('/avatar') ? 'avatar' : 'arquivo';
    op.requestBody = {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              [key]:
                ['avatar', 'arquivo'].includes(key)
                  ? { type: 'string', format: 'binary' }
                  : { type: 'array', items: { type: 'string', format: 'binary' } },
            },
          },
        },
      },
    };
  }
  (schema.paths[p] ??= {})[method] = op;
}
writeFileSync(path.join(root, 'docs/openapi.json'), JSON.stringify(schema, null, 2) + '\n');
console.log('OpenAPI gerado: ' + Object.keys(schema.paths).length + ' caminhos.');
