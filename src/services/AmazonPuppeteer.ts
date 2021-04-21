import puppeteer from 'puppeteer-extra';
import { AmazonProduct } from '../models/AmazonProduct';
import JPGImage from './JPGImage';

export default class AmazonPuppeteer {
  async scrapeProduct(url: string, headless: boolean) {
    const browser = await puppeteer.launch({
      headless,
      args: ['--disable-web-security'],
    });
    const page = await browser.newPage();
    await page.goto(url);

    const amazonProduct = new AmazonProduct(url);

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
    amazonProduct.title = title && title;
    amazonProduct.description = description && description;
    amazonProduct.details = details && details;
    amazonProduct.price = price && price;

    let imageURLs: string[] = [];

    await page.click('#main-image-container');
    await page.waitForTimeout(3000);
    const sectionButtons = await page.$$('.sitbReader-bookmark');
    if (sectionButtons.length > 0) {
      for (const button of sectionButtons) {
        await button.click();
        await page.waitForTimeout(1000);
        const URLs = await page.evaluate(() =>
          Array.from(document.querySelectorAll('.imageOverlay+img')).map(
            // @ts-ignore
            (img) => img.src
          )
        );
        imageURLs.push(...URLs);
      }
    } else {
      const frame = await (await page.$('#litb-read-frame'))!.contentFrame();
      await frame?.evaluate(() => {
        document
          .querySelector('#litb-renderer')!
          .scroll({ top: 9999, behavior: 'smooth' });
      });
      await page.waitForTimeout(5000);
      imageURLs = await frame!.evaluate(() =>
        Array.from(document.querySelectorAll('#yj-html-render div img')).map(
          // @ts-ignore
          (img) => img.src
        )
      );
    }
    await browser.close();
    imageURLs = [...new Set(imageURLs)];

    const loadPromises = [];
    for (let i = 0; i < imageURLs.length; i++) {
      const image = new JPGImage(amazonProduct.title + i);
      amazonProduct.images.push(image);
      loadPromises.push(image.loadAsync(imageURLs[i]));
    }
    await Promise.all(loadPromises);

    return amazonProduct;
  }
}
