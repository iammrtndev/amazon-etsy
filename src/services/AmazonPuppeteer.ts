import filenamify from 'filenamify';
import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import { AmazonProduct } from '../models/AmazonProduct';
import JPGImage from './JPGImage';

export default class AmazonPuppeteer {
  browser: Browser | undefined;

  public async scrapeProduct(url: string, headless: boolean) {
    await this.setupBrowserAsync(headless);
    const page = await this.browser!.newPage();
    try {
      const amazonProduct = await this.getAmazonProduct(url, page);
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
  private async setupBrowserAsync(headless: boolean) {
    if (this.browser != null) return;
    this.browser = await puppeteer.launch({
      headless,
      args: ['--disable-web-security'],
    });
  }

  private async getAmazonProduct(url: string, page: Page) {
    await page.goto(url);
    const { title, description, details, price } = await page.evaluate(
      async () => {
        // @ts-ignore
        const title = document.querySelector('#productTitle')!.innerText;
        const description = document
          .querySelector('#bookDesc_iframe')!
          // @ts-ignore
          .contentWindow.document.querySelector('#iframeContent')!.innerText;
        const details =
          // @ts-ignore
          document.querySelector('#detailBullets_feature_div')!.innerText;
        // @ts-ignore
        const price = document.querySelector('#price')!.innerText;
        return { title, description, details, price };
      }
    );
    return new AmazonProduct(url, title, description, details, price);
  }

  private async getImageURLs(page: Page) {
    let imageURLs: string[] = [];
    await page.click('#main-image-container');
    await page.waitForTimeout(5000);
    const sectionButtons = await page.$$('.sitbReader-bookmark');
    if (sectionButtons.length > 0) {
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
    } else {
      await page.waitForSelector('#litb-read-frame');
      const frame = await (await page.$('#litb-read-frame'))!.contentFrame();
      await frame?.evaluate(() => {
        document
          .querySelector('#litb-renderer')!
          .scroll({ top: 99999, behavior: 'smooth' });
      });
      await page.waitForTimeout(5000);
      imageURLs = await frame!.evaluate(() =>
        Array.from(document.querySelectorAll('#yj-html-render div img')).map(
          // @ts-ignore
          (img) => img.src
        )
      );
    }
    imageURLs = [...new Set(imageURLs)];
    return imageURLs;
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
