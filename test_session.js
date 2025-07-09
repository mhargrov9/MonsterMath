// Simple test to verify session creation
import { chromium } from 'playwright';

async function testSession() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Create a test user
  await page.request.post('http://localhost:5000/api/test/reset', {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ 
      username: 'testuser', 
      email: 'testuser@example.com', 
      password: 'password' 
    })
  });

  // Navigate to login page
  await page.goto('http://localhost:5000/');
  
  // Fill login form
  await page.getByPlaceholder('Enter your username').fill('testuser');
  await page.getByPlaceholder('Enter your password').fill('password');
  
  // Submit form
  await page.getByRole('button', { name: 'Enter the Academy' }).click();
  
  // Wait for login to complete
  await page.waitForTimeout(2000);
  
  // Check all cookies
  const cookies = await page.context().cookies();
  console.log('All cookies:', cookies);
  
  // Try to access authenticated endpoint
  const response = await page.request.get('http://localhost:5000/api/auth/user');
  console.log('Auth check status:', response.status());
  
  if (response.status() === 200) {
    const user = await response.json();
    console.log('User data:', user);
  }
  
  await browser.close();
}

testSession().catch(console.error);