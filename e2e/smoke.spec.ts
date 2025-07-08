import { test, expect } from '@playwright/test';

test('has title and can see battle team selector', async ({ page }) => {
  // The test now starts as a logged-in user.
  // We go directly to the page we want to test.
  await page.goto('/battle-arena');

  // Expect a title to contain a substring.
  await expect(page).toHaveTitle(/Primal Rift/);

  // Find the main heading on the BattleTeamSelector component
  const heading = page.getByRole('heading', {
    name: 'Assemble Your Battle Team',
  });

  // Assert that the heading is visible on the page
  await expect(heading).toBeVisible();
});