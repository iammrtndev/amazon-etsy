import { promptInputAsync } from './utils/promptUtils';
import AmazonPuppeteer from './services/AmazonPuppeteer';

const amazonScraper = new AmazonPuppeteer();

(async () => {
  const input = await promptInputAsync('Amazon product url: ');
  const product = await amazonScraper.scrapeProduct(input);
  await Promise.all(
    product.images.map((image) => {
      image.resize({ width: 2000 });
      return image.saveAsync('tmp');
    })
  );
  console.log(product);
})();
