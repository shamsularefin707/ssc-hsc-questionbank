import { defineConfig, devices } from '@playwright/test';

// PW_CHROMIUM lets a machine with a preinstalled Chromium skip `playwright install`.
const executablePath = process.env.PW_CHROMIUM || undefined;

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:4321', launchOptions: { executablePath } },
  webServer: { command: 'npm run preview -- --port 4321 --ignore-lock', port: 4321, reuseExistingServer: !process.env.CI },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
