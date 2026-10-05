import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';
import { database } from '../backend/src/db.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (Number(process.versions.node.split('.')[0]) < 24)
  throw Error('Instale o Node.js 24 ou superior.');
const file = path.join(root, 'backend/.env');
let env = existsSync(file)
  ? readFileSync(file, 'utf8')
  : readFileSync(path.join(root, 'backend/.env.example'), 'utf8');
let parsed = parse(env);
if (!parsed.JWT_SECRET || Buffer.byteLength(parsed.JWT_SECRET) < 32) {
  const line = `JWT_SECRET=${randomBytes(64).toString('hex')}`;
  env = /^JWT_SECRET=.*$/m.test(env)
    ? env.replace(/^JWT_SECRET=.*$/m, line)
    : env + '\n' + line + '\n';
  writeFileSync(file, env, { mode: 0o600 });
} else if (!existsSync(file)) writeFileSync(file, env, { mode: 0o600 });
parsed = parse(env);
const db = database(path.resolve(root, 'backend', parsed.DATABASE_PATH || 'data/gestao.sqlite'));
db.sql.close();
mkdirSync(path.resolve(root, 'backend', parsed.UPLOADS_PATH || 'data/uploads'), {
  recursive: true,
});
console.log(
  'Setup concluído: .env configurado, segredo JWT individual e SQLite pronto. Execute npm run dev.',
);
