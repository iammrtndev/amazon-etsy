import filenamify from 'filenamify';
import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import { BookProduct } from '../models/BookProduct';
import JPGImage from './JPGImage';

export let browser: Browser | undefined;
let page: Page | undefined;

export async function scrapeProductAsync(url: string) {
  if (browser == null) await setupBrowserAsync();

  try {
    const bookProduct = await getBookProductAsync(page!, url);
    const amazonImageURLs: string[] = await getAmazonImageURLsAsync(page!);
    if (amazonImageURLs.length == 0)
      throw new Error('Could not find an image for the product ');

    bookProduct.images = await downloadImagesAsync(
      amazonImageURLs,
      bookProduct.title
    );
    return bookProduct;
  } catch (error) {
    throw error;
  }
}

async function setupBrowserAsync() {
  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  });
  page = await browser!.newPage();
}

async function getBookProductAsync(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'networkidle0' });

  const rawTitle =
    // @ts-ignore
    (await page.$eval('#productTitle', (el) => el.innerText.trim())) || '';
  const title = rawTitle.replace(/(\$|\^|`|%|:|&)/g, '').slice(0, 140);

  const rawDetails = await page.$eval('#detailBullets_feature_div', (el) =>
    // @ts-ignore
    el.innerText.trim()
  );
  const details = rawDetails
    ? rawDetails.split('\n').splice(0, 8).join('\n')
    : '';

  const frame = await (await page.$('#bookDesc_iframe'))?.contentFrame();
  const rawDescription = await frame?.$eval('#iframeContent', (el) =>
    // @ts-ignore
    el.innerText.trim()
  );
  const description = rawDescription ? rawDescription.trim() : '';

  return new BookProduct(url, title, `${description}\n\n${details}`);
}

async function getAmazonImageURLsAsync(page: Page) {
  const hasPreview = (await page.$('#sitbLogoImg')) != null;
  return hasPreview == true
    ? await getPreviewImageURLsAsync(page)
    : await getImageURLsAsync(page);
}

async function getPreviewImageURLsAsync(page: Page) {
  await page.click('#main-image-container');
  await page.waitForTimeout(6000);
  const hasModernVersion = (await page.$('#litb-read-frame')) != null;
  return hasModernVersion == true
    ? await getModernPreviewImageURLsAsync(page)
    : await getOldPreviewImageURLsAsync(page);
}

async function getModernPreviewImageURLsAsync(page: Page) {
  const frameHandle = await page.$('#litb-read-frame');
  if (frameHandle == null) return [];
  const frame = await frameHandle.contentFrame();
  if (frame == null) return [];

  await frame.evaluate(() => {
    document
      .querySelector('#litb-renderer')!
      .scroll({ top: 99999, behavior: 'smooth' });
  });
  await page.waitForTimeout(6000);

  const imageURLs: string[] = await frame.$$eval(
    '#yj-html-render div img',
    // @ts-ignore
    (imgs) => imgs.map((img) => img.src)
  );
  return [...new Set(imageURLs)];
}

async function getOldPreviewImageURLsAsync(page: Page) {
  const imageURLs: string[] = [];
  const sectionButtons = await page.$$('.sitbReader-bookmark');
  for (const button of sectionButtons) {
    await button.click();
    await page.waitForTimeout(3000);
    const urls = await page.$$eval('.imageOverlay + img', (imgs) =>
      // @ts-ignore
      imgs.map((img) => img.src)
    );
    imageURLs.push(...urls);
  }
  return [...new Set(imageURLs)];
}

async function getImageURLsAsync(page: Page) {
  await page.click('.thumb-text.thumb');
  await page.waitForTimeout(6000);
  const imageURLs: string[] = await page.$$eval('.ig-thumb-image img', (imgs) =>
    // @ts-ignore
    imgs.map((img) => img.src.replace(/\._(.*)\.jpg/, '.jpg'))
  );
  return [...new Set(imageURLs)];
}

async function downloadImagesAsync(imageURLs: string[], bookTitle: string) {
  const imagePromises: Promise<JPGImage>[] = [];
  for (let i = 0; i < imageURLs.length; i++) {
    const name =
      filenamify(bookTitle, {
        replacement: '_',
        maxLength: 99,
      }).replace(/\s/g, '_') + i;
    const image = new JPGImage(name);
    imagePromises.push(image.downloadAsync(imageURLs[i]));
  }
  return await Promise.all(imagePromises);
}
