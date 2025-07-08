import { test, expect } from '@playwright/test';

test('has title and can see battle team selector', async ({ page }) => {
  // Navigate to the home page
  await page.goto('/');

  // Expect a title to contain a substring.
  await expect(page).toHaveTitle(/Primal Rift/);

  // Find the main heading on the BattleTeamSelector component
  const heading = page.getByRole('heading', {
    name: 'Assemble Your Battle Team',
  });

  // Assert that the heading is visible on the page
  await expect(heading).toBeVisible();
});