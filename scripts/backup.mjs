import { config } from 'dotenv';
import { mkdirSync, cpSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { database } from '../backend/src/db.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
config({ path: path.join(root, 'backend/.env'), quiet: true });
const source = path.resolve(root, 'backend', process.env.DATABASE_PATH || 'data/gestao.sqlite');
if (!existsSync(source)) throw Error('Banco não encontrado. Execute npm run setup.');
const destination = path.resolve(root, 'backups', new Date().toISOString().replaceAll(':', '-'));
mkdirSync(destination, { recursive: true });
const db = database(source);
try {
  db.sql.prepare('VACUUM INTO ?').run(path.join(destination, 'gestao.sqlite'));
} finally {
  db.sql.close();
}
const uploads = path.resolve(root, 'backend', process.env.UPLOADS_PATH || 'data/uploads');
if (existsSync(uploads)) cpSync(uploads, path.join(destination, 'uploads'), { recursive: true });
console.log('Backup concluído:', destination);
