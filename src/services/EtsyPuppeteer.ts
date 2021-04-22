import clipboardy from 'clipboardy';
import puppeteer from 'puppeteer-extra';
import puppeteerStealth from 'puppeteer-extra-plugin-stealth';
puppeteer.use(puppeteerStealth());
import { Browser, LaunchOptions } from 'puppeteer';
import PuppeteerService from '../models/PuppeteerService';
import { AmazonProduct } from '../models/AmazonProduct';
import { randomInt } from 'crypto';

export default class EtsyPuppeteer extends PuppeteerService {
  protected browser: Browser | undefined;
  protected launchOptions: LaunchOptions;

  constructor(headless: boolean) {
    super();
    this.launchOptions = {
      headless,
      executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      userDataDir: 'C:/Users/dev/AppData/Local/Google/Chrome/User Data',
      ignoreHTTPSErrors: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-sync',
        '--ignore-certificate-errors',
        '--lang=en-US,en;q=0.9',
      ],
      defaultViewport: null,
    };
  }

  public async publishAmazonProduct(
    product: AmazonProduct,
    category: string,
    price: string
  ) {
    await this.setupBrowserAsync();
    const width = 1280;
    const height = 720;
    const page = await this.browser!.newPage();
    await page.setViewport({ width, height });
    await page.goto(
      'https://www.etsy.com/your/listings/create?ref=listings_manager_prototype&from_page=/your/listings',
      {
        waitUntil: 'networkidle2',
      }
    );

    const fakeHumanAsync = async () => {
      await page.waitForTimeout(randomInt(3000, 6000));
      await page.mouse.move(
        randomInt(width / 2) + 300,
        randomInt(height / 3) + height / 3
      );
      page.mouse.wheel({ deltaY: randomInt(-3, 3) });
    };

    // Upload images
    const imageUploadInput = await page.$('#listing-edit-image-upload');
    const imagesPaths = product.images.map((image) => image.latestSavePath);
    await imageUploadInput?.uploadFile(...imagesPaths);
    await fakeHumanAsync();

    // Fill title
    await page.evaluate(() => {
      document.querySelector('#title-input')?.scrollIntoView();
    });
    await clipboardy.write(product.title);
    await page.focus('#title-input');
    await page.keyboard.down('Control');
    await page.keyboard.press('V');
    await page.keyboard.up('Control');
    await fakeHumanAsync();

    // Select options
    await page.select('#who_made-input', 'I did');
    fakeHumanAsync();
    await page.select('#is_supply-input', 'A finished product');
    fakeHumanAsync();
    await page.select('#when_made-input', '2020 - 2021');
    fakeHumanAsync();

    // Fill category
    await page.type('#taxonomy-search', category, {
      delay: randomInt(100, 600),
    });
    await fakeHumanAsync();

    await page.evaluate(() => {
      document.querySelector('#renewalOptionManual')?.scrollIntoView();
    });
    fakeHumanAsync();
    await page.click('#renewalOptionManual', { clickCount: randomInt(1, 3) });
    await fakeHumanAsync();

    await clipboardy.write(this.getDescriptionFromAmazonProduct(product));
    await page.focus('#description-text-area-input');
    await page.keyboard.down('Control');
    await page.keyboard.press('V');
    await page.keyboard.up('Control');
    await fakeHumanAsync();

    await page.evaluate(() => {
      document.querySelector('#price_retail-input')?.scrollIntoView();
    });
    fakeHumanAsync();
    await page.keyboard.type(price, { delay: randomInt(100, 600) });
    await fakeHumanAsync();

    await page.evaluate(() => {
      document
        .querySelector('.panel-body.linked-profiles-list input')
        ?.scrollIntoView();
    });
    await page.click('.panel-body.linked-profiles-list input');
    await fakeHumanAsync();

    // await page.click('button[data-save]');
    // await fakeHumanAsync();
  }

  private getDescriptionFromAmazonProduct(product: AmazonProduct) {
    const formattedDetails = product.details
      .split('\n')
      .splice(0, 7)
      .concat('\n');
    return `${product.description}\n\n${formattedDetails}`;
  }
}
