import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';

let browserInstance: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  const userDataDir = path.resolve(process.env.USER_DATA_DIR || './user-data');
  const headless = process.env.HEADLESS === 'true';

  browserInstance = await puppeteer.launch({
    headless,
    userDataDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: {
      width: 1280,
      height: 800,
    },
  });

  return browserInstance;
}

export async function getPage(): Promise<Page> {
  const browser = await getBrowser();
  const pages = await browser.pages();

  if (pages.length > 0) {
    return pages[0];
  }

  return await browser.newPage();
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
