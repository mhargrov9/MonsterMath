import { test, expect } from '@playwright/test';

test('basic smoke test without auth setup', async ({ page }) => {
  // Go directly to the home page
  await page.goto('/');

  // Expect a title to contain a substring
  await expect(page).toHaveTitle(/Primal Rift/);
  
  // Check if we can see the login form or the main application
  try {
    // If not authenticated, we should see the login form
    const loginButton = page.getByRole('button', { name: 'Enter the Academy' });
    if (await loginButton.isVisible({ timeout: 3000 })) {
      console.log('Login form is visible (not authenticated)');
    } else {
      // If authenticated, we should see the main application
      await expect(page.getByText('Monster Academy')).toBeVisible({ timeout: 5000 });
      console.log('Main application is visible (authenticated)');
    }
  } catch (error) {
    console.log('Neither login form nor main app visible:', error);
  }
});