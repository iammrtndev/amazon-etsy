import puppeteer from 'puppeteer-extra';
import { AmazonProduct } from '../models/AmazonProduct';
import JPGImage from './JPGImage';

export default class AmazonPuppeteer {
  async scrapeProduct(url: string) {
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--disable-web-security'],
    });
    const page = await browser.newPage();
    await page.goto(url);

    const amazonProduct = new AmazonProduct(url);

    const { title, description, details, price } = await page.evaluate(
      async () => {
        const title = document.querySelector('#productTitle')!.innerText;
        const description = document
          .querySelector('#bookDesc_iframe')!
          .contentWindow.document.querySelector('#iframeContent')!.innerText;
        const details = document.querySelector('#detailBullets_feature_div')!
          .innerText;
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
      await page.waitForTimeout(3000);
      imageURLs = await frame!.evaluate(() =>
        Array.from(document.querySelectorAll('#yj-html-render div img')).map(
          (img) => img.src
        )
      );

      // imageURLs = await page.evaluate(() => {
      //   const readerFrame = document.querySelector('#litb-read-frame')!
      //     .contentWindow.document;
      //   readerFrame
      //     .querySelector('#litb-renderer')!
      //     .scroll({ top: 9999, behavior: 'smooth' });
      //   return Array.from(
      //     readerFrame.querySelectorAll('#yj-html-render div img')
      //   ).map((img) => img.src);
      // });
    }
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
