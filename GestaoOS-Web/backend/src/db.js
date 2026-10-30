import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Tenant-qualified foreign keys protect relationships independently of HTTP.
const specs = {
  empresas: {
    fields: 'nome email codigo dataCriacao',
    bool: 'ativo permitirCadastro emailVerificado',
    json: 'sla',
    extra: 'UNIQUE(codigo)',
  },
  setores: { fields: 'nome descricao dataCriacao', bool: 'ativo' },
  usuarios: {
    fields: 'nome email senha role setorId telefone avatar dataCriacao',
    bool: 'ativo emailVerificado',
    json: 'preferencias',
    extra:
      "UNIQUE(empresaId,email), CHECK(role IN ('administrador_principal','administrador_setor','gestor','colaborador')), FOREIGN KEY(empresaId,setorId) REFERENCES setores(empresaId,id) DEFERRABLE INITIALLY DEFERRED",
  },
  categorias: {
    fields: 'nome setorId',
    bool: 'ativo',
    json: 'subcategorias',
    extra:
      'FOREIGN KEY(empresaId,setorId) REFERENCES setores(empresaId,id) DEFERRABLE INITIALLY DEFERRED',
  },
  ordens: {
    fields:
      'titulo descricao setorResponsavelId setorSolicitanteId solicitanteId solicitanteNome categoria categoriaId subcategoria prioridade status prazo protocolo dataAbertura dataAtualizacao dataConclusao responsavelId primeiraResposta',
    bool: 'sigilo',
    extra:
      'UNIQUE(empresaId,protocolo), FOREIGN KEY(empresaId,setorResponsavelId) REFERENCES setores(empresaId,id) DEFERRABLE INITIALLY DEFERRED, FOREIGN KEY(empresaId,solicitanteId) REFERENCES usuarios(empresaId,id) DEFERRABLE INITIALLY DEFERRED, FOREIGN KEY(empresaId,responsavelId) REFERENCES usuarios(empresaId,id) DEFERRABLE INITIALLY DEFERRED, FOREIGN KEY(empresaId,categoriaId) REFERENCES categorias(empresaId,id) DEFERRABLE INITIALLY DEFERRED',
  },
  anexos: {
    fields: 'ordemId nome tipo usuarioId data',
    extra:
      'FOREIGN KEY(empresaId,ordemId) REFERENCES ordens(empresaId,id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED',
  },
  historico: {
    fields: 'ordemId usuarioId usuarioNome acao descricao data',
    extra:
      'FOREIGN KEY(empresaId,ordemId) REFERENCES ordens(empresaId,id) DEFERRABLE INITIALLY DEFERRED',
  },
  notificacoes: {
    fields: 'usuarioId titulo mensagem ordemId data',
    bool: 'lida',
    extra:
      'FOREIGN KEY(empresaId,usuarioId) REFERENCES usuarios(empresaId,id) DEFERRABLE INITIALLY DEFERRED',
  },
  auditoria: { fields: 'usuarioId usuarioNome acao detalhes data ip requestId' },
  chats: { fields: 'nome tipo data', json: 'participantes' },
  mensagens: {
    fields: 'chatId usuarioId usuarioNome texto data',
    extra:
      'FOREIGN KEY(empresaId,chatId) REFERENCES chats(empresaId,id) DEFERRABLE INITIALLY DEFERRED, FOREIGN KEY(empresaId,usuarioId) REFERENCES usuarios(empresaId,id) DEFERRABLE INITIALLY DEFERRED',
  },
  conhecimento: {
    fields: 'titulo conteudo categoria tipo autorId autorNome data dataCriacao dataAtualizacao',
    numbers: 'visualizacoes uteis',
    json: 'tags',
    bool: 'destaque',
  },
  sessoes: {
    fields: 'usuarioId criadoEm',
    numbers: 'expira',
    extra:
      'FOREIGN KEY(empresaId,usuarioId) REFERENCES usuarios(empresaId,id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED',
  },
  desafios: {
    fields: 'usuarioId finalidade tokenHash data',
    numbers: 'expira tentativas',
    extra:
      'FOREIGN KEY(empresaId,usuarioId) REFERENCES usuarios(empresaId,id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED',
  },
};
for (const spec of Object.values(specs))
  for (const key of ['fields', 'bool', 'json', 'numbers'])
    spec[key] = (spec[key] || '').split(' ').filter(Boolean);

export function database(filename) {
  if (filename !== ':memory:') mkdirSync(path.dirname(filename), { recursive: true });
  const sql = new DatabaseSync(filename);
  sql.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  sql.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, appliedAt TEXT NOT NULL)',
  );
  let depth = 0;
  function transaction(fn) {
    const sp = `tx_${depth++}`;
    sql.exec(depth === 1 ? 'BEGIN IMMEDIATE' : `SAVEPOINT ${sp}`);
    try {
      const result = fn();
      sql.exec(depth === 1 ? 'COMMIT' : `RELEASE ${sp}`);
      return result;
    } catch (e) {
      sql.exec(depth === 1 ? 'ROLLBACK' : `ROLLBACK TO ${sp}`);
      throw e;
    } finally {
      depth--;
    }
  }
  transaction(() => {
    for (const [name, spec] of Object.entries(specs)) {
      const columns = ['id TEXT NOT NULL PRIMARY KEY', 'empresaId TEXT NOT NULL'];
      columns.push(...spec.fields.map((f) => `${f} TEXT`));
      columns.push(...spec.bool.map((f) => `${f} INTEGER CHECK(${f} IN (0,1))`));
      columns.push(...spec.numbers.map((f) => `${f} INTEGER`));
      columns.push(...spec.json.map((f) => `${f} TEXT CHECK(${f} IS NULL OR json_valid(${f}))`));
      columns.push(
        "extras TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras))",
        'UNIQUE(empresaId,id)',
      );
      if (name !== 'empresas')
        columns.push(
          'FOREIGN KEY(empresaId) REFERENCES empresas(id) DEFERRABLE INITIALLY DEFERRED',
        );
      else columns.push('CHECK(empresaId=id)', 'CHECK(codigo IS NOT NULL AND length(codigo)>0)');
      if (spec.extra) columns.push(spec.extra);
      sql.exec(
        `CREATE TABLE IF NOT EXISTS ${name}(${columns.join(',')}); CREATE INDEX IF NOT EXISTS idx_${name}_empresa ON ${name}(empresaId);`,
      );
    }
    sql.exec(`CREATE INDEX IF NOT EXISTS idx_ordens_filtro ON ordens(empresaId,setorResponsavelId,status,dataAbertura);
      CREATE INDEX IF NOT EXISTS idx_ordens_solicitante ON ordens(empresaId,solicitanteId);
      CREATE INDEX IF NOT EXISTS idx_historico_ordem ON historico(empresaId,ordemId,data);
      CREATE INDEX IF NOT EXISTS idx_mensagens_chat ON mensagens(empresaId,chatId,data);
      CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(empresaId,usuarioId,lida);
      CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON sessoes(empresaId,usuarioId,expira);`);
  });
  const specFor = (kind) => {
    if (!Object.hasOwn(specs, kind)) throw Error('Tabela inválida');
    return specs[kind];
  };
  const decode = (kind, row) => {
    if (!row) return null;
    const spec = specFor(kind),
      result = { ...JSON.parse(row.extras), ...row };
    delete result.extras;
    for (const f of spec.bool) result[f] = row[f] === null ? undefined : !!row[f];
    for (const f of spec.json) result[f] = row[f] === null ? undefined : JSON.parse(row[f]);
    if (kind === 'ordens')
      result.anexos = list('anexos', row.empresaId).filter((a) => a.ordemId === row.id);
    return result;
  };
  function list(kind, company) {
    specFor(kind);
    const rows =
      company === undefined
        ? sql.prepare(`SELECT * FROM ${kind} ORDER BY rowid`).all()
        : sql.prepare(`SELECT * FROM ${kind} WHERE empresaId=? ORDER BY rowid`).all(company);
    return rows.map((r) => decode(kind, r));
  }
  function get(kind, id, company) {
    specFor(kind);
    return decode(
      kind,
      sql.prepare(`SELECT * FROM ${kind} WHERE id=? AND empresaId=?`).get(id, company),
    );
  }
  function save(kind, company, item) {
    const spec = specFor(kind),
      data = { ...item, id: item.id || randomUUID(), empresaId: company };
    const columns = [
      'id',
      'empresaId',
      ...spec.fields,
      ...spec.bool,
      ...spec.numbers,
      ...spec.json,
    ];
    const extras = Object.fromEntries(
      Object.entries(data).filter(([k]) => !columns.includes(k) && k !== 'anexos'),
    );
    const values = columns.map((f) =>
      data[f] === undefined || data[f] === null
        ? null
        : spec.bool.includes(f)
          ? Number(!!data[f])
          : spec.json.includes(f)
            ? JSON.stringify(data[f])
            : data[f],
    );
    columns.push('extras');
    values.push(JSON.stringify(extras));
    transaction(() => {
      const r = sql
        .prepare(
          `INSERT INTO ${kind}(${columns.join(',')}) VALUES(${columns.map(() => '?')}) ON CONFLICT(id) DO UPDATE SET ${columns
            .filter((f) => f !== 'id' && f !== 'empresaId')
            .map((f) => `${f}=excluded.${f}`)
            .join(',')} WHERE ${kind}.empresaId=excluded.empresaId`,
        )
        .run(...values);
      if (!r.changes) throw Error('Tentativa de sobrescrever registro de outra empresa');
      if (kind === 'ordens' && data.anexos)
        for (const a of data.anexos) save('anexos', company, { ...a, ordemId: data.id });
    });
    return get(kind, data.id, company);
  }
  function remove(kind, id, company) {
    specFor(kind);
    return sql.prepare(`DELETE FROM ${kind} WHERE id=? AND empresaId=?`).run(id, company);
  }
  // Permanent code registry prevents reuse even after a code is rotated.
  sql.exec(`CREATE TABLE IF NOT EXISTS company_codes(codigo TEXT PRIMARY KEY, empresaId TEXT NOT NULL REFERENCES empresas(id), criadoEm TEXT NOT NULL);
    INSERT OR IGNORE INTO company_codes SELECT codigo,id,COALESCE(dataCriacao,datetime('now')) FROM empresas;
    CREATE TRIGGER IF NOT EXISTS reserve_company_code_insert AFTER INSERT ON empresas BEGIN
      INSERT INTO company_codes VALUES(NEW.codigo,NEW.id,datetime('now'));
    END;
    CREATE TRIGGER IF NOT EXISTS reserve_company_code_update AFTER UPDATE OF codigo ON empresas WHEN OLD.codigo<>NEW.codigo BEGIN
      INSERT INTO company_codes VALUES(NEW.codigo,NEW.id,datetime('now'));
    END;`);
  sql.exec(`CREATE TABLE IF NOT EXISTS contatos(id TEXT PRIMARY KEY,nome TEXT NOT NULL,email TEXT NOT NULL,assunto TEXT NOT NULL,mensagem TEXT NOT NULL,data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS votos_artigos(empresaId TEXT NOT NULL,artigoId TEXT NOT NULL,usuarioId TEXT NOT NULL,PRIMARY KEY(empresaId,artigoId,usuarioId),FOREIGN KEY(empresaId,artigoId) REFERENCES conhecimento(empresaId,id) ON DELETE CASCADE,FOREIGN KEY(empresaId,usuarioId) REFERENCES usuarios(empresaId,id));`);
  sql.exec(`CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON auditoria BEGIN SELECT RAISE(ABORT,'Auditoria imutável'); END;
    CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON auditoria BEGIN SELECT RAISE(ABORT,'Auditoria imutável'); END;
    CREATE TRIGGER IF NOT EXISTS code_uppercase_insert BEFORE INSERT ON empresas WHEN NEW.codigo<>upper(NEW.codigo) BEGIN SELECT RAISE(ABORT,'CHECK constraint failed: código deve ser maiúsculo'); END;
    CREATE TRIGGER IF NOT EXISTS code_uppercase_update BEFORE UPDATE OF codigo ON empresas WHEN NEW.codigo<>upper(NEW.codigo) BEGIN SELECT RAISE(ABORT,'CHECK constraint failed: código deve ser maiúsculo'); END;`);
  const db = { sql, list, get, save, remove, transaction };
  // Opaque sessions from v0 are invalidated, never converted into JWT sessions.
  if (!sql.prepare('SELECT 1 FROM schema_migrations WHERE version=1').get()) {
    transaction(() => {
      if (sql.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='records'").get()) {
        const old = sql.prepare('SELECT kind,company,data FROM records ORDER BY rowid').all();
        for (const kind of Object.keys(specs).filter((k) => k !== 'sessoes'))
          for (const row of old.filter((r) => r.kind === kind))
            save(kind, row.company, JSON.parse(row.data));
        sql.exec('ALTER TABLE records RENAME TO records_backup_v0');
      }
      sql.prepare('INSERT INTO schema_migrations VALUES(1,?)').run(new Date().toISOString());
    });
  }
  return db;
}
