import { test, expect } from '@playwright/test';

test('has title and can see battle team selector', async ({ page }) => {
  // The test now starts as a logged-in user.
  // We go directly to the home page.
  await page.goto('/');

  // Expect a title to contain a substring.
  await expect(page).toHaveTitle(/Primal Rift/);

  // Wait for the page to load completely
  await page.waitForLoadState('networkidle');

  // Verify we can see the main header
  await expect(page.getByText('Monster Academy')).toBeVisible();

  // Click the BATTLE ARENA tab to access the battle functionality
  await page.getByRole('button', { name: 'BATTLE ARENA' }).click();

  // Wait for the battle arena content to load
  await page.waitForTimeout(2000);

  // Find the main heading on the BattleTeamSelector component
  const heading = page.getByRole('heading', {
    name: 'Assemble Your Battle Team',
  });

  // Assert that the heading is visible on the page
  await expect(heading).toBeVisible({ timeout: 10000 });
});