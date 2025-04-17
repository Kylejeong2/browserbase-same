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

// Initialize Browserbase
const bb = new Browserbase({
  apiKey: BROWSERBASE_API_KEY,
});

// Create required directories on startup
(function ensureRequiredDirectories() {
  const dirs = ['screenshots'];
  dirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
    }
  });
})();

/**
 * Creates a new Browserbase session and connects rebrowser-puppeteer-core to it
 * @param options Additional Browserbase session options
 * @returns Connected browser instance
 */
export async function createBrowser(options: {
  proxies?: boolean;
  headless?: boolean;
  userAgent?: string;
  stealth?: boolean;
  timeout?: number;
} = {}): Promise<any> {
  console.log('Creating Browserbase session...');
  
  // Create a new session on Browserbase with advanced options
  const session = await bb.sessions.create({
    projectId: BROWSERBASE_PROJECT_ID,
    // Advanced stealth mode options
    proxies: options.proxies ?? true,
    browserSettings: {
        advancedStealth: options.stealth ?? true, // Enable stealth mode by default
      },
  });
  
  console.log(`Session created: ${session.id}`);

  const sessionUrl = `https://www.browserbase.com/sessions/${session.id}`
  console.log(`🔍 Live View Link: ${sessionUrl}`); 
  console.log('👆 Open this URL to view the session in real-time in Browserbase dashboard');
  
  // Connect rebrowser-puppeteer-core to the Browserbase session
  const browser = await puppeteer.connect({
    browserWSEndpoint: session.connectUrl,
    defaultViewport: null // Use the viewport set in the session creation
  });
  
  console.log('Connected to browser');
  
  return browser;
}

/**
 * Creates a directory if it doesn't exist
 * @param dirPath Directory path to create
 */
export function ensureDirectoryExists(dirPath: string): void {
  const fullPath = path.isAbsolute(dirPath) ? dirPath : path.join(process.cwd(), dirPath);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created directory: ${fullPath}`);
  }
}

/**
 * Takes a screenshot with a timestamp in the filename
 * @param page Puppeteer page object
 * @param name Base name for the screenshot
 * @param dir Directory to save screenshot in (default: screenshots)
 */
export async function takeScreenshot(
  page: any,
  name: string,
  dir: string = 'screenshots'
): Promise<string> {
  ensureDirectoryExists(dir);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  const filePath = path.join(dir, filename);
  
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`Screenshot saved to: ${filePath}`);
  
  return filePath;
}

/**
 * Wait for a random amount of time to simulate human behavior
 * @param min Minimum time in milliseconds
 * @param max Maximum time in milliseconds
 */
export async function randomWait(min: number = 1000, max: number = 3000): Promise<void> {
  const waitTime = Math.floor(Math.random() * (max - min) + min);
  console.log(`Waiting for ${waitTime}ms...`);
  await new Promise(resolve => setTimeout(resolve, waitTime));
}