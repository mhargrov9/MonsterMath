import { test, expect } from '@playwright/test';

test('has title and can see battle team selector', async ({ page }) => {
  // Add a listener to catch all console error messages from the browser
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`Browser Console ERROR: ${msg.text()}`);
    }
  });

  // 1. Navigate to the home page.
  await page.goto('/');

  // 2. Wait for the page to be fully loaded.
  await page.waitForLoadState('networkidle');

  // 3. Check for the title.
  await expect(page).toHaveTitle(/Primal Rift/);

  // 4. Click the "BATTLE ARENA" tab to navigate.
  await page.getByRole('tab', { name: 'BATTLE ARENA' }).click();

  // 5. Verify the main heading is visible.
  const heading = page.getByRole('heading', { name: 'Assemble Your Battle Team' });
  await expect(heading).toBeVisible();
});