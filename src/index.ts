import { promptInputsAsync } from './utils/promptUtils';
import AmazonPuppeteer from './services/AmazonPuppeteer';
import fs from 'fs';
import path from 'path';
import { AmazonProduct } from './models/AmazonProduct';
import isURL from './utils/isURL';

const isDebug = true;

const amazonScraper = new AmazonPuppeteer();
const errors: { url: string; error: Error }[] = [];

main().catch((error: Error) => {
  console.log(error.message);
});

async function main() {
  const urls = await getURLs('../urls.txt');
  if (urls.length == 0)
    throw new Error('URLs list contains errors! Please verify your URLs.');
  if (isDebug) console.log(urls);

  const products = await getProducts(urls);
  if (isDebug) {
    console.log(products);
    console.log(errors);
  }
  await amazonScraper.browser?.close();
}

async function getURLs(txtDir: string) {
  let urls: string[] = [];
  const formatURLs = () => {
    urls = urls.map((url) => url.trim());
    urls = urls.filter((url) => isURL(url));
  };

  const absolutePath = path.resolve(txtDir);
  if (fs.existsSync(absolutePath)) {
    urls = fs.readFileSync(absolutePath, { encoding: 'utf8' }).split('\n');
  }
  formatURLs();
  // If {txtDir} file is empty
  if (urls.length == 0) {
    urls = await promptInputsAsync('Amazon product url: ');
  }
  formatURLs();
  return [...new Set(urls)];
}

async function getProducts(urls: string[]) {
  const products: AmazonProduct[] = [];
  for (const url of urls) {
    try {
      const product = await amazonScraper.scrapeProduct(url, !isDebug);
      await Promise.all(
        product.images.map((image) => {
          image.resize({ width: 2000 });
          return image.saveAsync('../tmp');
        })
      );
      products.push(product);
    } catch (error) {
      errors.push({ url, error });
    }
  }
  return products;
}
