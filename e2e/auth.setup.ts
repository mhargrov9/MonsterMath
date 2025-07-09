import { test as setup, expect } from '@playwright/test';
import { STORAGE_STATE } from '../playwright.config';

const authFile = STORAGE_STATE;
const username = 'testuser';
const password = 'password';
const email = 'testuser@example.com';

setup('create or reset and then authenticate test user', async ({ page }) => {
  // Step 1: Hit our dedicated test endpoint to ensure the user exists with a clean slate.
  await page.request.post('/api/test/reset', {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ username, email, password })
  });

  // Step 2: Navigate to the login page and log in through the UI to establish session cookies
  await page.goto('/');
  
  // The Login tab is the default, so we can directly fill the form
  await page.getByPlaceholder('Enter your username').fill(username);
  await page.getByPlaceholder('Enter your password').fill(password);
  
  // Submit the form
  await page.getByRole('button', { name: 'Enter the Academy' }).click();
  
  // Wait for successful login - check for navigation or success element
  await expect(page.getByText('GOLD')).toBeVisible({ timeout: 10000 });

  // Wait a bit more to ensure session cookie is fully established
  await page.waitForTimeout(1000);

  // Verify authentication by checking the API endpoint
  const authCheckResponse = await page.request.get('/api/auth/user');
  expect(authCheckResponse.status()).toBe(200);

  // Save the successful authentication state with cookies
  await page.context().storageState({ path: authFile });
});