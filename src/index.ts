import { createBrowser, takeScreenshot, randomWait } from './utils';
import type { Page } from 'rebrowser-puppeteer-core';

async function main() {
  try {
    console.log('Starting advanced stealth bot detection test...');
    
    // Create browser using utility function with enhanced stealth options
    const browser = await createBrowser({
      proxies: true, // Enable proxy to help avoid detection
      stealth: true, // Enable advanced stealth mode
      timeout: 120000, // Long timeout for reliability
    });
    
    // Get existing pages or create a new one
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    // List of sites to test for bot detection
    const testSites = [
      { 
        name: "SannySoft Bot Detection", 
        url: "https://bot.sannysoft.com", 
        description: "Basic fingerprinting tests" 
      },
      { 
        name: "NowSecure", 
        url: "https://nowsecure.nl", 
        description: "Advanced bot detection tests" 
      }
    ];
    
    // Test each site
    for (const site of testSites) {
      console.log(`\n🔍 Testing: ${site.name} (${site.url})`);
      console.log(`Description: ${site.description}`);
      
      // Navigate to the site
      console.log(`Navigating to ${site.url}...`);
      await page.goto(site.url, {
        waitUntil: 'networkidle0',
        timeout: 60000,
      });
      
      // Add some randomized human-like behavior
      await randomWait(2000, 4000);
      
      // Take a screenshot
      await takeScreenshot(page, `${site.name.toLowerCase().replace(/\s+/g, '-')}`);
      
      // Get page title and URL
      const title = await page.title();
      const currentUrl = page.url();

      console.log("Current URL: ", currentUrl);

      // Log basic information
      console.log(`Test completed for ${site.name}`);
      console.log(`Page title: ${title}`);
      
      // Add delay between sites to appear more human-like
      if (testSites.indexOf(site) < testSites.length - 1) {
        await randomWait(3000, 6000);
      }
    }

    // Run the Google Search test
    await testGoogleSearch(page);
    
    // Close the browser
    await browser.close();
    
    console.log('\n✅ Test completed successfully!');
    console.log('Check the screenshots directory for results.');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

/**
 * Conducts a structured test of Google Search functionality
 * with detailed interaction and results analysis
 */
async function testGoogleSearch(page: Page): Promise<void> {
  console.log('\n🔍 Starting detailed Google search test...');
  
  try {
    // Make sure we're on Google
    await page.goto('https://www.google.com', {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
    
    // Define search query
    const searchQuery = 'puppeteer stealth browser automation';
    console.log(`Performing search for: "${searchQuery}"`);
    
    // Find search input - try both textarea and input
    let searchInput;
    if (await page.$('textarea[name="q"]')) {
      searchInput = 'textarea[name="q"]';
    } else if (await page.$('input[name="q"]')) {
      searchInput = 'input[name="q"]';
    } else {
      throw new Error('Could not find Google search input');
    }
    
    // Clear input and type search query
    await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (element) {
        if (element.tagName === 'TEXTAREA') {
          (element as HTMLTextAreaElement).value = '';
        } else {
          (element as HTMLInputElement).value = '';
        }
      }
    }, searchInput);
    
    await page.type(searchInput, searchQuery, { delay: 100 });
    await randomWait(800, 1500);
    
    // Take screenshot before search
    await takeScreenshot(page, 'google-search-query');
    
    // Press Enter to search
    console.log('Pressing Enter to search...');
    await page.keyboard.press('Enter');
    
    // Wait for results
    console.log('Waiting for search results...');
    await page.waitForNavigation({ timeout: 10000 }).catch(() => {
      console.log('Navigation timeout - continuing anyway');
    });
    
    // Make sure page is done loading
    await page.waitForFunction(
      () => document.readyState === 'complete',
      { timeout: 10000 }
    );
    
    await randomWait(2000, 3000);
    
    // Take screenshot of results
    await takeScreenshot(page, 'google-search-results');
    
    // Extract titles of top results
    console.log('Top search results:');
    const searchResults = await page.evaluate(() => {
      const titles = Array.from(document.querySelectorAll('h3')).slice(0, 5);
      return titles.map(title => title.textContent);
    });
    
    searchResults.forEach((title: string | null, index: number) => {
      if (title) console.log(`${index + 1}. ${title}`);
    });
    
    // Click first result
    console.log('Clicking on first search result...');
    const resultLink = await page.$('#search a');
    
    if (resultLink) {
      await Promise.all([
        page.waitForNavigation({ timeout: 30000 }),
        resultLink.click()
      ]);
      
      await randomWait(3000, 5000);
      
      // Log page info
      const pageTitle = await page.title();
      console.log(`Landed on page: "${pageTitle}"`);
      console.log(`URL: ${page.url()}`);
      
      // Take screenshot
      await takeScreenshot(page, 'google-search-result-page');
      
      // Simple scrolling for reading simulation
      console.log('Scrolling down page...');
      await page.evaluate(() => {
        window.scrollBy(0, 500);
      });
      
      await randomWait(1000, 2000);
      
      await page.evaluate(() => {
        window.scrollBy(0, 500);
      });
      
      await randomWait(3000, 5000);
      
      // Go back to results
      console.log('Going back to search results...');
      await page.goBack();
      await randomWait(2000, 3000);
    } else {
      console.log('No search result link found to click');
    }
    
    console.log('Google search test completed');
    
  } catch (error: unknown) {
    console.error(`Google search test failed: ${error instanceof Error ? error.message : String(error)}`);
    await takeScreenshot(page, 'google-search-error');
  }
}

// Run the main function
main(); 