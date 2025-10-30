import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';

let browserInstance: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  const userDataDir = path.resolve(process.env.USER_DATA_DIR || './user-data');
  const headless = process.env.HEADLESS === 'true';

  console.log('Launching browser with config:', {
    headless,
    userDataDir,
  });

  try {
    browserInstance = await puppeteer.launch({
    headless,
    userDataDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--flag-switches-begin --disable-site-isolation-trials --flag-switches-end',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
    defaultViewport: {
      width: 1280,
      height: 800,
    },
  });

  // Set additional properties to avoid detection and check for existing cookies
  {
    const pages = await browserInstance.pages();
    if (pages.length > 0) {
      const page = pages[0];
      await page.evaluateOnNewDocument(() => {
        // Remove webdriver property
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });

        // Mock plugins and languages
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });

        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });
      });

      // Check if we have existing Amazon cookies
      const client = await page.target().createCDPSession();
      const { cookies } = await client.send('Network.getCookies', {
        urls: ['https://www.amazon.com'],
      });
      await client.detach();

      console.log('✓ Browser launched successfully');
      console.log('✓ User data dir:', userDataDir);
      console.log(`✓ Loaded ${cookies.length} existing Amazon cookies from profile`);

      // Check for session cookies
      const hasSessionCookies = cookies.some((c: any) => c.name === 'session-id' || c.name === 'session-token');
      if (hasSessionCookies) {
        console.log('✓ Found Amazon session cookies - you may already be logged in');
      } else {
        console.log('ℹ No Amazon session cookies found - you will need to log in');
      }
    } else {
      console.log('✓ Browser launched successfully');
      console.log('✓ User data dir:', userDataDir);
    }
  }

    return browserInstance;
  } catch (error) {
    console.error('Failed to launch browser:', error);
    if (error instanceof Error && error.message.includes('already running')) {
      console.error('\n⚠️  Another browser instance is using the user data directory.');
      console.error('   Please close any other instances or use a different USER_DATA_DIR.');
      console.error('   You can kill the process with: lsof -ti:3001 | xargs kill -9\n');
    }
    throw error;
  }
}

export async function getPage(): Promise<Page> {
  const browser = await getBrowser();
  const pages = await browser.pages();

  let page: Page;
  if (pages.length > 0) {
    page = pages[0];
  } else {
    page = await browser.newPage();
  }

  // Apply anti-detection measures to the page
  await page.evaluateOnNewDocument(() => {
    // Remove webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });

    // Mock plugins and languages
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });

    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
  });

  return page;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    console.log('\nClosing browser and saving session data...');

    try {
      // Get all pages and inspect cookies before closing
      const pages = await browserInstance.pages();
      if (pages.length > 0) {
        const page = pages[0];

        // Use CDP to get cookies (non-deprecated API)
        const client = await page.target().createCDPSession();
        const { cookies } = await client.send('Network.getAllCookies');
        await client.detach();

        console.log(`Saving ${cookies.length} total cookies`);

        // Log Amazon session cookies
        const amazonCookies = cookies.filter((c: any) => c.domain.includes('amazon'));
        console.log(`Amazon cookies: ${amazonCookies.length}`);

        const sessionCookies = amazonCookies.filter((c: any) => !c.expires || c.expires === -1);
        if (sessionCookies.length > 0) {
          console.log(`⚠️  Warning: ${sessionCookies.length} session-only Amazon cookies will be lost on browser close`);
          console.log('Session cookies:', sessionCookies.map((c: any) => c.name).join(', '));
        }
      }
    } catch (error) {
      console.error('Error while inspecting cookies:', error);
    }

    await browserInstance.close();
    browserInstance = null;
    console.log('✓ Browser closed, session data saved to user-data directory');
  }
}
