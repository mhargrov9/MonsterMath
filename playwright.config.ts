import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module-safe way to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const STORAGE_STATE = path.join(__dirname, 'playwright/.auth/user.json');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: 'html',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5000',
    trace: 'on-first-retry',
  },

  projects: [
    // Project to run authentication setup
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // Main project for tests, depends on setup
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use the saved authentication state
        storageState: STORAGE_STATE,
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});