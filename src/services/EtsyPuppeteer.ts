import clipboardy from 'clipboardy';
import puppeteer from 'puppeteer-extra';
import puppeteerStealth from 'puppeteer-extra-plugin-stealth';
puppeteer.use(puppeteerStealth());
import { Browser, LaunchOptions } from 'puppeteer';
import PuppeteerService from '../models/PuppeteerService';
import { AmazonProduct } from '../models/AmazonProduct';
import { randomInt } from 'crypto';
import { homedir } from 'os';

export default class EtsyPuppeteer extends PuppeteerService {
  protected browser: Browser | undefined;
  protected launchOptions: LaunchOptions;
  private width: number = 1280;
  private height: number = 720;

  constructor(headless: boolean) {
    super();
    this.launchOptions = {
      headless,
      executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      userDataDir: `${homedir().replace(
        /\\/g,
        '/'
      )}/AppData/Local/Google/Chrome/User Data`,
      args: [
        '--lang=en-US,en;q=0.9',
        `--window-size=${this.width},${this.height}`,
      ],
      ignoreHTTPSErrors: true,
      defaultViewport: null,
    };
  }

  public async publishAmazonProduct(
    product: AmazonProduct,
    category: string,
    price: string
  ) {
    await this.setupBrowserAsync();
    const page = await this.browser!.newPage();
    await page.goto(
      'https://www.etsy.com/your/listings/create?ref=listings_manager_prototype&from_page=/your/listings',
      {
        waitUntil: 'networkidle2',
      }
    );
    const typeOptions = { delay: randomInt(50, 100) };

    // Upload images
    const imageUploadInput = await page.$('#listing-edit-image-upload');
    const imagesPaths = product.images.map((image) => image.latestSavePath);
    await imageUploadInput?.uploadFile(...imagesPaths);
    await page.waitForTimeout(randomInt(3000, 6000));

    // Fill title
    await page.evaluate(() => {
      document.querySelector('#title-input')?.scrollIntoView();
    });
    await clipboardy.write(product.title);
    await page.focus('#title-input');
    await page.keyboard.down('Control');
    await page.keyboard.press('V');
    await page.keyboard.up('Control');
    await page.waitForTimeout(randomInt(1000, 3000));

    // Select options
    await page.type('#who_made-input', 'I', typeOptions);
    await page.waitForTimeout(randomInt(1000, 3000));
    await page.type('#is_supply-input', 'A', typeOptions);
    await page.waitForTimeout(randomInt(1000, 6000));
    await page.type('#when_made-input', '2', typeOptions);
    await page.waitForTimeout(randomInt(1000, 3000));

    // Fill category
    await page.type('#taxonomy-search', category, typeOptions);
    await page.waitForTimeout(randomInt(1000, 6000));

    await page.evaluate(() => {
      document.querySelector('#renewalOptionManual')?.scrollIntoView();
    });
    await page.click('#renewalOptionManual');
    await page.waitForTimeout(randomInt(1000, 6000));

    await clipboardy.write(this.getDescriptionFromAmazonProduct(product));
    await page.focus('#description-text-area-input');
    await page.keyboard.down('Control');
    await page.keyboard.press('V');
    await page.keyboard.up('Control');
    await page.waitForTimeout(randomInt(1000, 6000));

    await page.evaluate(() => {
      document.querySelector('#price_retail-input')?.scrollIntoView();
    });
    await page.waitForTimeout(randomInt(1000, 6000));
    await page.type(price, '#price_retail-input', typeOptions);
    await page.waitForTimeout(randomInt(1000, 6000));

    await page.evaluate(() => {
      document
        .querySelector('.panel-body.linked-profiles-list input')
        ?.scrollIntoView();
    });
    await page.click('.panel-body.linked-profiles-list input');
    await page.waitForTimeout(randomInt(1000, 6000));

    // await page.click('button[data-save]');
    // await page.waitForTimeout(randomInt(3000, 6000));
  }

  private getDescriptionFromAmazonProduct(product: AmazonProduct) {
    const formattedDetails = product.details
      .split('\n')
      .splice(0, 7)
      .concat('\n');
    return `${product.description}\n\n${formattedDetails}`;
  }
}
