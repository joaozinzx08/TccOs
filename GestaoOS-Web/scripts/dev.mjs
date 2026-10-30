import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Direct Node processes work on Windows without shell:true / DEP0190.
const commands = [
  ['backend', ['--watch', 'src/server.js']],
  ['frontend', [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1']],
];
const children = commands.map(([dir, args]) =>
  spawn(process.execPath, args, { cwd: path.join(root, dir), stdio: 'inherit', shell: false }),
);
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  process.exitCode = code;
}
for (const child of children) {
  child.on('error', (e) => {
    console.error(e.message);
    stop(1);
  });
  child.on('exit', (code) => stop(code || 0));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
