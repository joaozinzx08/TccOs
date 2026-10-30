import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const child = spawn(
  process.execPath,
  [path.join(root, 'node_modules/@playwright/test/cli.js'), 'test'],
  { cwd: root, stdio: 'inherit', env: { ...process.env, GESTAO_TEST_PRODUCTION: '1' } },
);
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
