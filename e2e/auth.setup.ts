import { test as setup, expect } from '@playwright/test';
import { STORAGE_STATE } from '../playwright.config';

const authFile = STORAGE_STATE;
const username = 'testuser';
const password = 'password';
const email = 'testuser@example.com';

setup('create or reset and then authenticate test user', async ({ request }) => {
  // Step 1: Hit our dedicated test endpoint to ensure the user exists with a clean slate.
  await request.post('/api/test/reset', {
    data: { username, email, password }
  });

  // Step 2: Now that the user is guaranteed to exist with the correct password, log in.
  const response = await request.post('/api/login/local', {
    data: { username, password }
  });

  // Check that the login was successful.
  expect(response.ok(), 'API login after reset should be successful').toBeTruthy();

  // Save the successful authentication state.
  await request.storageState({ path: authFile });
});