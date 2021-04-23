import clipboardy from 'clipboardy';
import puppeteer from 'puppeteer-extra';
import puppeteerStealth from 'puppeteer-extra-plugin-stealth';
puppeteer.use(puppeteerStealth());
import { Browser, LaunchOptions } from 'puppeteer';
import PuppeteerService from '../models/PuppeteerService';
import { AmazonProduct } from '../models/AmazonProduct';
import { randomInt } from 'crypto';
import { homedir } from 'os';
import path from 'path';
import fse from 'fs-extra';

const userDataDir = `${homedir().replace(
  /\\/g,
  '/'
)}/AppData/Local/Google/Chrome/User Data`;
const userDataDirLocal = path.resolve('./User Data');

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
      userDataDir: userDataDirLocal,
      args: [
        '--lang=en-US,en;q=0.9',
        `--window-size=${this.width},${this.height}`,
      ],
      ignoreHTTPSErrors: true,
      defaultViewport: null,
    };
  }

  protected async setupBrowserAsync() {
    if (this.browser != null) return;
    fse.copySync(userDataDir, userDataDirLocal, { overwrite: true });
    this.browser = await puppeteer.launch(this.launchOptions);
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
    const typeOptions = { delay: randomInt(90, 120) };
    const fakeHumanAsync = async () => {
      await page.waitForTimeout(randomInt(3000, 12000));
    };

    // Upload images
    const imageUploadInput = await page.$('#listing-edit-image-upload');
    const imagesPaths = product.images.map((image) => image.latestSavePath);
    await imageUploadInput?.uploadFile(...imagesPaths);
    await fakeHumanAsync();

    // Fill title
    await clipboardy.write(product.title);
    await page.focus('#title-input');
    await page.keyboard.down('Control');
    await page.keyboard.press('V');
    await page.keyboard.up('Control');
    await fakeHumanAsync();
    // Select infos
    await page.type('#who_made-input', 'I', typeOptions);
    await fakeHumanAsync();
    await page.type('#is_supply-input', 'A', typeOptions);
    await fakeHumanAsync();
    await page.type('#when_made-input', '2', typeOptions);
    await fakeHumanAsync();
    // Fill category
    await page.type('#taxonomy-search', category, typeOptions);
    await fakeHumanAsync();
    // Select manual renew
    await page.click('#renewalOptionManual');
    await fakeHumanAsync();
    // Fill description
    await clipboardy.write(this.getDescriptionFromAmazonProduct(product));
    await page.focus('#description-text-area-input');
    await page.keyboard.down('Control');
    await page.keyboard.press('V');
    await page.keyboard.up('Control');
    await fakeHumanAsync();
    // Fill price
    await page.type('#price_retail-input', price, typeOptions);
    await fakeHumanAsync();
    // Select ship option
    await page.click('.panel-body.linked-profiles-list input');
    await fakeHumanAsync();
    // Save as draft
    await page.click('button[data-save]');
    await fakeHumanAsync();

    await page.close();
  }

  private getDescriptionFromAmazonProduct(product: AmazonProduct) {
    const formattedDetails = product.details
      .split('\n')
      .splice(0, 8)
      .join('\n');
    return `${product.description.trim()}\n\n${formattedDetails}`;
  }
}
