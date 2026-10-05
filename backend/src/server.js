import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
config({ path: path.join(root, '.env'), quiet: true });
const app = createApp({
  dbPath: path.resolve(root, process.env.DATABASE_PATH || 'data/gestao.sqlite'),
  uploads: path.resolve(root, process.env.UPLOADS_PATH || 'data/uploads'),
  frontend: path.resolve(root, '../frontend/dist'),
});
const port = Number(process.env.PORT || 3000),
  host = process.env.HOST || '127.0.0.1';
const server = app.listen(port, host, () => console.log(`GestãoOS API: http://${host}:${port}`));
server.on('error', (e) => {
  console.error(
    e.code === 'EADDRINUSE'
      ? `Porta ${port} ocupada. Encerre a instância anterior ou altere PORT em backend/.env.`
      : e.message,
  );
  app.locals.db.sql.close();
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(() => {
      app.locals.db.sql.close();
      process.exit(0);
    }),
  );
