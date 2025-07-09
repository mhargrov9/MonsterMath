import { test, expect } from '@playwright/test';

test('authentication state is properly loaded', async ({ page }) => {
  // Check if we can access the user API endpoint (should work if authenticated)
  const response = await page.request.get('/api/auth/user');
  expect(response.status()).toBe(200);
  
  const userData = await response.json();
  expect(userData.username).toBe('testuser');
  expect(userData.email).toBe('testuser@example.com');
  
  console.log('✅ Authentication state is working correctly');
});