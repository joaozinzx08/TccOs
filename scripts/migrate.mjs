import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { migrateLegacy } from '../backend/src/migrate.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
config({ path: path.join(root, 'backend/.env'), quiet: true });
const source = process.argv[2];
if (!source) throw Error('Uso: npm run migrate:legacy -- "caminho/para/backend/db.json"');
console.log(
  migrateLegacy({
    source: path.resolve(source),
    destination: path.resolve(root, 'backend', process.env.DATABASE_PATH || 'data/gestao.sqlite'),
    uploads: path.resolve(root, 'backend', process.env.UPLOADS_PATH || 'data/uploads'),
  }),
);
