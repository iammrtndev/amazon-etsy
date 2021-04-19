import puppeteer from 'puppeteer-extra';
import puppeteerStealth from 'puppeteer-extra-plugin-stealth';
import { LaunchOptions } from 'puppeteer';
import { executablePath, userDataDir } from '../chromePath.json';

puppeteer.use(puppeteerStealth());

const options: LaunchOptions = {
  headless: false,
  executablePath: executablePath,
  userDataDir: userDataDir,
  ignoreHTTPSErrors: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-sync',
    '--ignore-certificate-errors',
    '--lang=en-US,en;q=0.9',
  ],
  defaultViewport: {
    width: 1280,
    height: 720,
  },
};

(async () => {
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  await page.goto('https://etsy.com/');
})();
