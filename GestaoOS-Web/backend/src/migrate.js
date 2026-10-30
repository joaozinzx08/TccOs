import { readFileSync, existsSync, mkdirSync, copyFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { database } from './db.js';

export function migrateLegacy({ source, destination, uploads }) {
  const bytes = readFileSync(source),
    data = JSON.parse(bytes),
    db = database(destination),
    copied = [];
  const hash = createHash('sha256').update(bytes).digest('hex');
  db.sql.exec(
    'CREATE TABLE IF NOT EXISTS legacy_imports(hash TEXT PRIMARY KEY, importedAt TEXT NOT NULL)',
  );
  try {
    if (db.sql.prepare('SELECT 1 FROM legacy_imports WHERE hash=?').get(hash))
      return { alreadyImported: true };
    if (db.list('empresas').length)
      throw Error(
        'O banco de destino já contém empresas. Use um destino vazio para evitar sobrescrever dados.',
      );
    const counts = {};
    db.transaction(() => {
      const mappings = {
        empresas: 'empresas',
        setores: 'setores',
        usuarios: 'usuarios',
        categorias: 'categorias',
        ordens: 'ordensServico',
        historico: 'historico',
        notificacoes: 'notificacoes',
        auditoria: 'auditoria',
        chats: 'chats',
        conhecimento: 'conhecimento',
      };
      // Knowledge is included in the schema separately; unknown legacy tokens
      // are never imported as authenticated sessions.
      for (const [target, key] of Object.entries(mappings)) {
        counts[target] = 0;
        for (const sourceItem of data[key] || []) {
          const item = { ...sourceItem },
            company = target === 'empresas' ? item.id : item.empresaId;
          if (!company) throw Error(`Empresa ausente em ${key}. Migração cancelada.`);
          if (target === 'empresas')
            Object.assign(item, {
              sla: item.sla || { Baixa: 120, Média: 72, Alta: 24, Urgente: 4 },
              permitirCadastro: item.permitirCadastro !== false,
              codigo: String(item.codigo).trim().toUpperCase(),
            });
          if (target === 'usuarios') {
            item.email = String(item.email).trim().toLowerCase();
            item.setorId = item.setorId || null;
          }
          if (target === 'chats') {
            item.data = item.data || item.dataCriacao;
            item.tipo = ['geral', 'empresa'].includes(item.tipo) ? 'empresa' : item.tipo;
            item.participantes = item.participantes || [];
            delete item.mensagens;
          }
          if (target === 'ordens') {
            item.protocolo = item.protocolo || `OS-${String(counts[target] + 1).padStart(5, '0')}`;
            item.solicitanteNome =
              (data.usuarios || []).find((u) => u.id === item.solicitanteId)?.nome || 'Usuário';
            item.anexos = (item.anexos || []).map((a) => {
              const filename = typeof a === 'string' ? a : a.id;
              if (path.basename(filename) !== filename) throw Error('Nome de anexo inválido.');
              const original = path.join(path.dirname(source), 'uploads', 'anexos', filename);
              if (!existsSync(original)) throw Error(`Anexo do legado ausente: ${filename}`);
              mkdirSync(uploads, { recursive: true });
              const dest = path.join(uploads, filename);
              if (!existsSync(dest)) {
                copyFileSync(original, dest);
                copied.push(dest);
              }
              return {
                id: filename,
                nome: typeof a === 'string' ? a : a.nome,
                tipo: /\.png$/i.test(filename)
                  ? 'image/png'
                  : /\.jpe?g$/i.test(filename)
                    ? 'image/jpeg'
                    : /\.webp$/i.test(filename)
                      ? 'image/webp'
                      : 'application/pdf',
              };
            });
          }
          db.save(target, company, item);
          counts[target]++;
          if (target === 'chats')
            for (const message of sourceItem.mensagens || [])
              db.save('mensagens', company, {
                ...message,
                chatId: item.id,
                usuarioId: message.usuarioId || message.remetenteId,
                texto: message.texto || message.mensagem,
                data: message.data || message.dataCriacao,
              });
        }
      }
      if (db.sql.prepare('PRAGMA foreign_key_check').all().length)
        throw Error('Relacionamentos inválidos no legado.');
      db.sql.prepare('INSERT INTO legacy_imports VALUES(?,?)').run(hash, new Date().toISOString());
    });
    return { alreadyImported: false, counts };
  } catch (e) {
    for (const file of copied) unlinkSync(file);
    throw e;
  } finally {
    db.sql.close();
  }
}
