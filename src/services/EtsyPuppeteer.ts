import * as chalkUtils from '../utils/chalkUtils';
import clipboardy from 'clipboardy';
import fse from 'fs-extra';
import path from 'path';
import puppeteer from 'puppeteer-extra';
import puppeteerStealth from 'puppeteer-extra-plugin-stealth';
import { BookProduct } from '../models/BookProduct';
import { Browser, Page } from 'puppeteer';
import { homedir } from 'os';
import { randomInt } from 'crypto';
puppeteer.use(puppeteerStealth());

export let browser: Browser | undefined;

export async function publishBookProduct(
  bookProduct: BookProduct,
  category: string,
  price: string
) {
  if (browser == null) await setupBrowserAsync();
  const page = await browser!.newPage();
  await page.goto(
    'https://www.etsy.com/your/listings/create?ref=listings_manager_prototype&from_page=/your/listings',
    {
      waitUntil: 'networkidle2',
    }
  );

  await uploadImages(page, bookProduct);
  await fillTitle(bookProduct, page);
  await selectDetailsOptions(page);
  await fillCategory(page, category);
  await fillDescription(bookProduct, page);
  await selectManualRenew(page);
  await fillPrice(page, price);
  await selectShipOptions(page);
  await clickSave(page);
  await page.close();
}

async function setupBrowserAsync() {
  const userDataDir = `${homedir().replace(
    /\\/g,
    '/'
  )}/AppData/Local/Google/Chrome/User Data`;
  const userDataDirLocal = path.resolve('./User Data');
  const draft = console.draft(
    chalkUtils.info(`\n\nCopying ${chalkUtils.dir('User Data')} folder...`)
  );
  draft('\0');
  fse.copySync(userDataDir, userDataDirLocal, { overwrite: true });
  browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    userDataDir: userDataDirLocal,
    args: ['--lang=en-US,en;q=0.9', `--window-size=1280,720`],
    ignoreHTTPSErrors: true,
    defaultViewport: null,
  });
}

async function waitAroundAsync(page: Page, min: number, max: number) {
  await page.waitForTimeout(randomInt(min, max));
}

async function pasteAsync(page: Page, str: string) {
  await clipboardy.write(str);
  await page.keyboard.down('Control');
  await page.keyboard.press('V');
  await page.keyboard.up('Control');
}

async function uploadImages(page: Page, bookProduct: BookProduct) {
  const imagesPaths = bookProduct.images.map(
    (image) => image.latestSavePath || ''
  );
  const imageUploadInput = await page.$('#listing-edit-image-upload');
  await imageUploadInput!.uploadFile(...imagesPaths);
  await waitAroundAsync(page, 3000, 12000);
}

async function fillTitle(bookProduct: BookProduct, page: Page) {
  await page.focus('#title-input');
  await pasteAsync(page, bookProduct.title);
  await waitAroundAsync(page, 3000, 9000);
}

async function selectDetailsOptions(page: Page) {
  await page.type('#who_made-input', 'I');
  await waitAroundAsync(page, 2000, 4000);
  await page.type('#is_supply-input', 'A');
  await waitAroundAsync(page, 3000, 4000);
  await page.type('#when_made-input', '2');
  await waitAroundAsync(page, 2000, 3000);
}

async function fillCategory(page: Page, category: string) {
  await page.type('#taxonomy-search', category, { delay: randomInt(100, 150) });
  await waitAroundAsync(page, 3000, 6000);
  await page.keyboard.press('Enter');
  await waitAroundAsync(page, 2000, 4000);
}

async function fillDescription(bookProduct: BookProduct, page: Page) {
  await page.focus('#description-text-area-input');
  await waitAroundAsync(page, 3000, 6000);
  await pasteAsync(page, bookProduct.description);
  await waitAroundAsync(page, 2000, 4000);
}

async function selectManualRenew(page: Page) {
  await page.click('#renewalOptionManual');
  await waitAroundAsync(page, 3000, 6000);
}

async function fillPrice(page: Page, price: string) {
  await page.focus('#description-text-area-input');
  await waitAroundAsync(page, 2000, 4000);
  await page.type('#price_retail-input', price, { delay: 100 });
  await waitAroundAsync(page, 3000, 6000);
}

async function selectShipOptions(page: Page) {
  await page.click('.panel-body.linked-profiles-list input');
  await waitAroundAsync(page, 3000, 6000);
}

async function clickSave(page: Page) {
  await page.click('button[data-save]');
  await waitAroundAsync(page, 3000, 6000);
}
