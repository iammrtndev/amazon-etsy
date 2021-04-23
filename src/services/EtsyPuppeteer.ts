import clipboardy from 'clipboardy';
// @ts-ignore
import fse from 'fs-extra';
import path from 'path';
import puppeteer from 'puppeteer-extra';
import PuppeteerService from '../models/PuppeteerService';
import puppeteerStealth from 'puppeteer-extra-plugin-stealth';
import { AmazonProduct } from '../models/AmazonProduct';
import { Browser, LaunchOptions } from 'puppeteer';
import { homedir } from 'os';
import { randomInt } from 'crypto';
puppeteer.use(puppeteerStealth());

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
    console.log('Copying "User Data" folder...');
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
    const waitAroundAsync = async (min: number, max: number) => {
      await page.waitForTimeout(randomInt(min, max));
    };

    // Upload images
    const imageUploadInput = await page.$('#listing-edit-image-upload');
    const imagesPaths = product.images.map((image) => image.latestSavePath);
    await imageUploadInput?.uploadFile(...imagesPaths);
    await waitAroundAsync(3000, 12000);

    // Fill title
    await clipboardy.write(product.title);
    await page.focus('#title-input');
    await page.keyboard.down('Control');
    await page.keyboard.press('V');
    await page.keyboard.up('Control');
    await waitAroundAsync(3000, 9000);
    // Select infos
    await page.type('#who_made-input', 'I', typeOptions);
    await waitAroundAsync(2000, 4000);
    await page.type('#is_supply-input', 'A', typeOptions);
    await waitAroundAsync(2000, 4000);
    await page.type('#when_made-input', '2', typeOptions);
    await waitAroundAsync(2000, 4000);
    // Fill category
    await page.type('#taxonomy-search', category, typeOptions);
    await waitAroundAsync(3000, 6000);
    await page.keyboard.press('Enter');
    await waitAroundAsync(2000, 4000);
    // Fill description
    await clipboardy.write(this.getDescriptionFromAmazonProduct(product));
    await page.focus('#description-text-area-input');
    await waitAroundAsync(3000, 6000);
    await page.keyboard.down('Control');
    await page.keyboard.press('V');
    await page.keyboard.up('Control');
    await waitAroundAsync(2000, 4000);
    // Select manual renew
    await page.click('#renewalOptionManual');
    await waitAroundAsync(3000, 6000);
    // Fill price
    await page.focus('#description-text-area-input');
    await waitAroundAsync(2000, 4000);
    await page.type('#price_retail-input', price, typeOptions);
    await waitAroundAsync(3000, 6000);
    // Select ship option
    await page.click('.panel-body.linked-profiles-list input');
    await waitAroundAsync(3000, 6000);
    // Save as draft
    await page.click('button[data-save]');
    await waitAroundAsync(3000, 6000);

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
