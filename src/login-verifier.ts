import puppeteer from 'rebrowser-puppeteer-core';
import Browserbase from '@browserbasehq/sdk';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const BROWSERBASE_API_KEY = process.env.BROWSERBASE_API_KEY as string;
const BROWSERBASE_PROJECT_ID = process.env.BROWSERBASE_PROJECT_ID as string;

// Validate environment variables
if (!BROWSERBASE_API_KEY) {
  throw new Error('BROWSERBASE_API_KEY is required');
}
if (!BROWSERBASE_PROJECT_ID) {
  throw new Error('BROWSERBASE_PROJECT_ID is required');
}

// Define login test sites
interface LoginSite {
  name: string;
  url: string;
  usernameSelector: string;
  passwordSelector: string;
  submitSelector: string;
  successIndicator: string;
  failureIndicator?: string;
  credentials: {
    username: string;
    password: string;
  };
  beforeLogin?: (page: any) => Promise<void>;
}

// Initialize Browserbase
const bb = new Browserbase({
  apiKey: BROWSERBASE_API_KEY,
});

// Create a screenshots directory if it doesn't exist
const screenshotsDir = path.join(process.cwd(), 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

// Function to test login on a site
async function testLogin(site: LoginSite): Promise<{
  site: string;
  success: boolean;
  message: string;
  screenshotPath: string;
}> {
  console.log(`Testing login for ${site.name}...`);
  
  // Create a new session on Browserbase
  const session = await bb.sessions.create({
    projectId: BROWSERBASE_PROJECT_ID,
    proxies: true, // Enable proxy to avoid detection
  });
  
  console.log(`Session created: ${session.id}`);
  
  // Connect rebrowser-puppeteer-core to the Browserbase session
  const browser = await puppeteer.connect({
    browserWSEndpoint: session.connectUrl,
  });
  
  console.log('Connected to browser');
  const sessionUrl = `https://www.browserbase.com/sessions/${session.id}`
  console.log(`🔍 Live View Link: ${sessionUrl}`); 
  console.log('👆 Open this URL to view the session in real-time in Browserbase dashboard');
  
  // Get existing pages or create a new one
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  
  // Set viewport
  await page.setViewport({ width: 1280, height: 800 });
  
  // Create screenshot path
  const screenshotPath = path.join(screenshotsDir, `${site.name.toLowerCase()}.png`);
  
  try {
    // Navigate to the login page
    console.log(`Navigating to ${site.url}...`);
    await page.goto(site.url, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });
    
    // Execute any pre-login steps if specified
    if (site.beforeLogin) {
      console.log('Executing pre-login steps...');
      await site.beforeLogin(page);
    }
    
    // Fill in the login form
    console.log('Filling in login form...');
    await page.waitForSelector(site.usernameSelector);
    await page.type(site.usernameSelector, site.credentials.username);
    
    await page.waitForSelector(site.passwordSelector);
    await page.type(site.passwordSelector, site.credentials.password);
    
    // Take a screenshot before submitting
    await page.screenshot({ path: path.join(screenshotsDir, `${site.name.toLowerCase()}-before-submit.png`) });
    
    // Submit the form
    console.log('Submitting login form...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
      page.click(site.submitSelector),
    ]);
    
    // Wait for either success or failure indicators
    console.log('Checking login result...');
    let success = false;
    let message = '';
    
    try {
      // Wait for either success or failure indicators
      const result = await Promise.race([
        page.waitForSelector(site.successIndicator, { timeout: 10000 })
          .then(() => ({ success: true, message: 'Login successful' })),
        site.failureIndicator
          ? page.waitForSelector(site.failureIndicator, { timeout: 10000 })
              .then(() => ({ success: false, message: 'Login failed - error message detected' }))
          : Promise.resolve(null),
      ]);
      
      if (result) {
        success = result.success;
        message = result.message;
      } else {
        // If no indicator was found, check if success indicator exists now
        const successExists = await page.$(site.successIndicator);
        success = !!successExists;
        message = success 
          ? 'Login appears successful' 
          : 'Login status unclear - could not find success indicator';
      }
    } catch (error) {
      success = false;
      message = `Error checking login status: ${error}`;
    }
    
    // Take a final screenshot
    await page.screenshot({ path: screenshotPath });
    
    console.log(`Login test for ${site.name}: ${success ? 'PASSED' : 'FAILED'} - ${message}`);
    
    return {
      site: site.name,
      success,
      message,
      screenshotPath,
    };
  } catch (error) {
    const errorMessage = `Error testing login: ${error}`;
    console.error(errorMessage);
    
    // Try to take a screenshot anyway
    try {
      await page.screenshot({ path: screenshotPath });
    } catch (err) {
      console.error('Failed to take error screenshot');
    }
    
    return {
      site: site.name,
      success: false,
      message: errorMessage,
      screenshotPath,
    };
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
}

async function main() {
  // Define test sites
  // Note: Use dummy credentials for demo purposes
  const sites: LoginSite[] = [
    {
      name: 'OrangeHRM',
      url: 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login',
      usernameSelector: 'input[name="username"]',
      passwordSelector: 'input[name="password"]',
      submitSelector: 'button[type="submit"]',
      successIndicator: '.oxd-userdropdown',
      credentials: {
        username: 'Admin',
        password: 'admin123',
      },
    },
  ];
  
  console.log('Starting login verification tests...');
  
  for (const site of sites) {
    try {
      await testLogin(site);
    } catch (error) {
      console.error(`Failed to test login for ${site.name}:`, error);
    }
  }
  
  console.log('\n✅ Login verification tests completed!');
  console.log('Check the screenshots directory for results.');
}

// Run the main function
main();
