import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:8082',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'CI=1 npx expo start --web --port 8082',
    url: 'http://127.0.0.1:8082',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
