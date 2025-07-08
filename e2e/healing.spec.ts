import { test, expect } from '@playwright/test';

test('can use a healing ability on an ally', async ({ page }) => {
  // 1. Navigate directly to the Battle Arena as a logged-in user
  await page.goto('/battle-arena');

  // 2. Select a team with a healer (River-Spirit Axolotl)
  await expect(page.getByRole('heading', { name: 'Assemble Your Battle Team' })).toBeVisible();
  await page.getByText('River-Spirit Axolotl').click();
  await page.getByText('Geode Tortoise').click();
  await expect(page.getByText('Slots: 2/3')).toBeVisible();

  // 3. Start the battle
  await page.getByRole('button', { name: 'Start Battle!' }).click();

  // 4. Choose the healer as the lead monster
  await expect(page.getByRole('heading', { name: 'Choose Your Lead Monster' })).toBeVisible();
  await page.getByText('River-Spirit Axolotl').locator('../..').getByRole('button', { name: 'Choose as Lead' }).click();

  // 5. Wait for combat to load and find the healing ability
  await expect(page.getByText("Opponent's Bench")).toBeVisible({ timeout: 15000 });
  const healAbility = page.locator('div:not(.opacity-50) > div > span:has-text("Restoring Geyser")');
  await expect(healAbility).toBeVisible();

  // 6. Use the ability and target an ally
  await healAbility.click();
  const targetAlly = page.locator('div.bench-card').first();
  await targetAlly.click();

  // 8. Verify the outcome in the battle log
  // This is the step we now EXPECT to fail, proving our test works.
  await expect(page.getByText(/used Restoring Geyser/)).toBeVisible({ timeout: 10000 });
});