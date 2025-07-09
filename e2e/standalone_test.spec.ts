import { test, expect } from '@playwright/test';

test('standalone smoke test', async ({ page }) => {
  // Go directly to the home page
  await page.goto('/');

  // Expect a title to contain a substring
  await expect(page).toHaveTitle(/Primal Rift/);
  
  console.log('Page loaded successfully');
});