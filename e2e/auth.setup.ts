import { test as setup, expect } from '@playwright/test';
import { STORAGE_STATE } from '../playwright.config';

const authFile = STORAGE_STATE;
const username = 'testuser';
const password = 'password';

setup('authenticate via API', async ({ request }) => {
  // Send a direct API request to the login endpoint as a JSON payload
  const response = await request.post('/api/login/local', {
    data: {
      username: username,
      password: password,
    }
  });

  // Check that the login was successful.
  expect(response.ok()).toBeTruthy();

  // Save the returned authentication state (cookies) to the file.
  await request.storageState({ path: authFile });
});