import fs from 'fs';
import path from 'path';
import AmazonPuppeteer from './services/AmazonPuppeteer';
import EtsyPuppeteer from './services/EtsyPuppeteer';
import { AmazonProduct } from './models/AmazonProduct';
import isURL from './utils/isURL';

const isDebug = true;

const amazonPuppeteer = new AmazonPuppeteer(!isDebug);
const etsyPuppeteer = new EtsyPuppeteer(!isDebug);
const errors: { url: string; error: Error }[] = [];

main().catch((error: Error) => {
  console.log(error.message);
});

async function main() {
  const URLWithPriceCollection = await getURLWithPriceCollection('../urls.txt');
  if (URLWithPriceCollection == null || URLWithPriceCollection.length == 0)
    throw new Error('URLs list contains errors! Please verify your URLs.');
  if (isDebug) console.log(URLWithPriceCollection);

  const productWithPriceCollection = await getProductWithPriceCollection(
    URLWithPriceCollection
  );
  if (isDebug) console.log(errors);
  console.log(productWithPriceCollection);

  for (const { product, price } of productWithPriceCollection) {
    await etsyPuppeteer.publishAmazonProduct(product, 'Coloring Books', price);
  }
}

async function getURLWithPriceCollection(txtDir: string) {
  const absolutePath = path.resolve(txtDir);
  if (fs.existsSync(absolutePath) == false) return;

  const lines = fs.readFileSync(absolutePath, { encoding: 'utf8' }).split('\n');
  if (lines.length == 0) return;

  let URLWithPriceCollection: URLWithPrice[] = lines.map((line) => {
    const split = line.split(' ');
    return { url: split[1].trim(), price: split[0] };
  });
  URLWithPriceCollection = URLWithPriceCollection.filter(
    (obj) => isNaN(+obj.price) == false && isURL(obj.url)
  );
  return [...new Set(URLWithPriceCollection)];
}

async function getProductWithPriceCollection(
  URLWithPriceCollection: URLWithPrice[]
) {
  const productWithPriceCollection: ProductWithPrice[] = [];
  for (let i = 0; i < URLWithPriceCollection.length; i++) {
    const { url, price } = URLWithPriceCollection[i];
    try {
      const product = await amazonPuppeteer.scrapeProduct(url);
      await Promise.all(
        product.images.map((image) => {
          image.resize({ width: 2000 });
          return image.saveAsync('../tmp');
        })
      );
      productWithPriceCollection.push({ price, product });
    } catch (error) {
      errors.push({ url, error });
    }
  }
  await amazonPuppeteer.closeBrowserAsync();
  return productWithPriceCollection;
}

interface URLWithPrice {
  url: string;
  price: string;
}

interface ProductWithPrice {
  product: AmazonProduct;
  price: string;
}
