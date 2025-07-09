import { chromium } from 'playwright';

async function debugTest() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: './playwright/.auth/user.json'
  });
  
  const page = await context.newPage();
  
  // Go to battle-arena
  console.log('Navigating to /battle-arena...');
  await page.goto('http://localhost:5000/battle-arena');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Check if authenticated by checking for user data
  console.log('Checking authentication...');
  const authResponse = await page.request.get('/api/auth/user');
  console.log('Auth status:', authResponse.status());
  
  if (authResponse.status() === 200) {
    const userData = await authResponse.json();
    console.log('User data:', userData);
  }
  
  // Take screenshot
  await page.screenshot({ path: 'debug_screenshot.png' });
  
  // Check for heading
  console.log('Looking for heading...');
  try {
    const heading = page.getByRole('heading', { name: 'Assemble Your Battle Team' });
    const isVisible = await heading.isVisible();
    console.log('Heading visible:', isVisible);
    
    if (!isVisible) {
      // Check what's actually on the page
      const pageContent = await page.content();
      console.log('Page title:', await page.title());
      console.log('Page content length:', pageContent.length);
      
      // Look for any headings
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
      console.log('All headings found:', headings);
    }
  } catch (error) {
    console.error('Error finding heading:', error);
  }
  
  await browser.close();
}

debugTest().catch(console.error);