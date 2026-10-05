import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const dir = mkdtempSync(path.join(tmpdir(), 'gestao-e2e-'));
const production = process.env.GESTAO_TEST_PRODUCTION === '1';
const baseURL = `http://127.0.0.1:${production ? 3017 : 5179}`;
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  reporter: 'list',
  use: {
    baseURL,
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      ...(process.env.GESTAO_CHROMIUM_EXECUTABLE
        ? { executablePath: path.resolve(process.env.GESTAO_CHROMIUM_EXECUTABLE) }
        : {}),
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  },
  webServer: {
    command: production ? 'node backend/src/server.js' : 'node scripts/dev.mjs',
    url: baseURL + '/api/status',
    reuseExistingServer: false,
    timeout: 30000,
    env: {
      NODE_ENV: production ? 'production' : 'development',
      HOST: '127.0.0.1',
      PORT: '3017',
      VITE_PORT: '5179',
      DATABASE_PATH: path.join(dir, 'test.sqlite'),
      UPLOADS_PATH: path.join(dir, 'uploads'),
      JWT_SECRET: 'browser-test-secret-at-least-thirty-two-characters',
    },
  },
});
