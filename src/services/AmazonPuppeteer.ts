import filenamify from 'filenamify';
import { Browser, LaunchOptions, Page } from 'puppeteer';
import { AmazonProduct } from '../models/AmazonProduct';
import JPGImage from './JPGImage';
import PuppeteerService from '../models/PuppeteerService';

export default class AmazonPuppeteer extends PuppeteerService {
  protected browser: Browser | undefined;
  protected launchOptions: LaunchOptions;

  constructor(headless: boolean) {
    super();
    this.launchOptions = {
      headless,
      args: ['--disable-web-security'],
    };
  }

  public async scrapeProduct(url: string) {
    await this.setupBrowserAsync();
    const page = await this.browser!.newPage();
    try {
      const amazonProduct = await this.getAmazonProductInfo(url, page);
      const imageURLs: string[] = await this.getImageURLs(page);
      if (imageURLs.length == 0)
        throw new Error('Could not find an image for the product ');
      await this.loadImages(imageURLs, amazonProduct);

      return amazonProduct;
    } catch (error) {
      throw error;
    } finally {
      await page.close();
    }
  }

  private async getAmazonProductInfo(url: string, page: Page) {
    await page.goto(url, { waitUntil: 'networkidle0' });
    const { title, description, details } = await page.evaluate(async () => {
      let title = '',
        description = '',
        details = '';
      try {
        // @ts-ignore
        title = document.querySelector('#productTitle')!.innerText;
        description = document
          .querySelector('#bookDesc_iframe')!
          // @ts-ignore
          .contentWindow.document.querySelector('#iframeContent')!.innerText;
        details =
          // @ts-ignore
          document.querySelector('#detailBullets_feature_div')!.innerText;
      } catch (error) {
      } finally {
        return { title, description, details };
      }
    });
    return new AmazonProduct(url, title, description, details, '');
  }

  private async getImageURLs(page: Page) {
    const hasPreview = (await page.$('#sitbLogoImg')) !== null;
    if (hasPreview) {
      return await this.getProductPreviewImageURLs(page);
    } else {
      return await this.getProductImageURLs(page);
    }
  }

  private async getProductPreviewImageURLs(page: Page) {
    await page.click('#main-image-container');
    await page.waitForTimeout(6000);
    const isModernVersion = (await page.$('#litb-read-frame')) !== null;
    if (isModernVersion) {
      return await this.getProductModernPreviewImageURLs(page);
    } else {
      return await this.getProductOldPreviewImageURLs(page);
    }
  }

  private async getProductModernPreviewImageURLs(page: Page) {
    const frame = await (await page.$('#litb-read-frame'))!.contentFrame();
    await frame?.evaluate(() => {
      document
        .querySelector('#litb-renderer')!
        .scroll({ top: 99999, behavior: 'smooth' });
    });
    await page.waitForTimeout(5000);
    const imageURLs: string[] = await frame!.evaluate(() =>
      Array.from(document.querySelectorAll('#yj-html-render div img')).map(
        // @ts-ignore
        (img) => img.src
      )
    );
    return [...new Set(imageURLs)];
  }

  private async getProductOldPreviewImageURLs(page: Page) {
    const imageURLs: string[] = [];
    const sectionButtons = await page.$$('.sitbReader-bookmark');
    for (const button of sectionButtons) {
      await button.click();
      await page.waitForTimeout(3000);
      const URLs = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.imageOverlay+img')).map(
          // @ts-ignore
          (img) => img.src
        )
      );
      imageURLs.push(...URLs);
    }
    return [...new Set(imageURLs)];
  }

  private async getProductImageURLs(page: Page) {
    await page.click('.thumb-text.thumb');
    await page.waitForTimeout(6000);
    return await page.evaluate(() =>
      Array.from(document.querySelectorAll('.ig-thumb-image img')).map(
        // @ts-ignore
        (img) => img.src.replace(/\._(.*)\.jpg/, '.jpg')
      )
    );
  }

  private async loadImages(imageURLs: string[], amazonProduct: AmazonProduct) {
    const loadPromises = [];
    for (let i = 0; i < imageURLs.length; i++) {
      const name =
        filenamify(amazonProduct.title, {
          replacement: '_',
          maxLength: 99,
        }).replace(/\s/g, '_') + i;
      const image = new JPGImage(name);
      amazonProduct.images.push(image);
      loadPromises.push(image.loadAsync(imageURLs[i]));
    }
    await Promise.all(loadPromises);
  }
}
