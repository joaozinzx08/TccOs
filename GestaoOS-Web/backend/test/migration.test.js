import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { migrateLegacy } from '../src/migrate.js';
import { database } from '../src/db.js';
import { verifyPassword } from '../src/security.js';

test('Migração JSON para tabelas relacionais, preservação de senha e UNIQUE no banco', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'gestao-migration-')),
    destination = path.join(dir, 'db.sqlite'),
    source = path.join(dir, 'db.json');
  try {
    mkdirSync(path.join(dir, 'uploads/anexos'), { recursive: true });
    writeFileSync(path.join(dir, 'uploads/anexos/a.pdf'), '%PDF-1.4');
    writeFileSync(
      source,
      JSON.stringify({
        empresas: [{ id: 'e', nome: 'Empresa', codigo: 'GEST-EXISTENTE', ativo: true }],
        setores: [{ id: 's', empresaId: 'e', nome: 'TI', ativo: true }],
        usuarios: [
          {
            id: 'u',
            empresaId: 'e',
            nome: 'Usuário',
            email: 'u@example.com',
            senha: bcrypt.hashSync('Senha123!', 10),
            role: 'gestor',
            setorId: 's',
            ativo: true,
          },
        ],
        ordensServico: [
          {
            id: 'o',
            empresaId: 'e',
            solicitanteId: 'u',
            setorResponsavelId: 's',
            titulo: 'Legado',
            status: 'Aberta',
            anexos: ['a.pdf'],
          },
        ],
        historico: [{ id: 'h', empresaId: 'e', ordemId: 'o', usuarioId: 'u', descricao: 'Criada' }],
      }),
    );
    const result = migrateLegacy({ source, destination, uploads: path.join(dir, 'private') });
    assert.equal(result.counts.ordens, 1);
    assert.equal(
      migrateLegacy({ source, destination, uploads: path.join(dir, 'private') }).alreadyImported,
      true,
    );
    const db = database(destination);
    try {
      assert.equal(db.get('ordens', 'o', 'e').anexos.length, 1);
      assert.equal(db.get('ordens', 'o', 'outra'), null);
      assert.equal(verifyPassword('Senha123!', db.get('usuarios', 'u', 'e').senha), true);
      assert.equal(db.sql.prepare('PRAGMA foreign_key_check').all().length, 0);
      assert.throws(
        () => db.save('empresas', 'e2', { id: 'e2', nome: 'Outra', codigo: 'GEST-EXISTENTE' }),
        /UNIQUE/,
      );
      db.save('empresas', 'e2', { id: 'e2', nome: 'Outra', codigo: 'GEST-OUTRA' });
      assert.throws(
        () =>
          db.save('usuarios', 'e2', { id: 'u2', nome: 'Inválido', role: 'gestor', setorId: 's' }),
        /FOREIGN KEY/,
      );
    } finally {
      db.sql.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
