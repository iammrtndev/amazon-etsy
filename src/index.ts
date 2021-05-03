import * as amazonPuppeteer from './services/amazonPuppeteer';
import * as chalkUtils from './utils/chalkUtils';
import * as etsyPuppeteer from './services/etsyPuppeteer';
import * as scrapingDashboard from './services/scrapingDashboard';
import * as sentry from '@sentry/node';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import ScrapingTask, { statusEnum } from './services/ScrapingTask';
import { BookProduct } from './models/BookProduct';
import { dectectRunningAsync } from './utils/processUtils';
dotenv.config();

declare global {
  namespace NodeJS {
    interface Global {
      __rootdir__: string;
    }
  }
}

if (process.env.NODE_ENV != 'dev') {
  global.__rootdir__ = __dirname || process.cwd();
  if (process.env.SENTRY_DSN == null) errorExit('SENTRY_DSN is null');
  sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    debug: false,
  });
}

main().catch((error) => {
  sentry.captureException(error);
  errorExit();
});

async function main() {
  if (await dectectRunningAsync('chrome.exe'))
    errorExit('Chrome is open. Please close it and try again');

  const scrapingTasks = getScrapingTasks('../urls.txt');
  const scrapingTasksMap: { [url: string]: ScrapingTask } = {};
  for (const scrapingTask of scrapingTasks) {
    scrapingTasksMap[scrapingTask.url] = scrapingTask;
  }
  scrapingDashboard.init(scrapingTasks);

  const imagePromises: Promise<void>[] = [];
  const bookProducts: BookProduct[] = [];
  for (const url of scrapingTasks.map((task) => task.url)) {
    try {
      const product = await amazonPuppeteer.scrapeProductAsync(url);
      imagePromises.push(
        ...product.images.map((image) => {
          image.resize({ width: 2000 });
          return image.saveAsync('../tmp');
        })
      );
      bookProducts.push(product);
      scrapingTasksMap[url].update(product.title, statusEnum.downloaded);
    } catch (error) {
      scrapingTasksMap[url].update(url, statusEnum.failed);
      sentry.captureException(error);
    }
  }
  await Promise.all(imagePromises);
  await amazonPuppeteer.browser?.close();
  if (process.env.NODE_ENV == 'dev') return;

  for (const bookProduct of bookProducts) {
    const scrapingTask = scrapingTasksMap[bookProduct.url];
    try {
      await etsyPuppeteer.publishBookProduct(
        bookProduct,
        'Coloring Book',
        scrapingTask.price
      );
      scrapingTask.update(bookProduct.title, statusEnum.succeded);
    } catch (error) {
      scrapingTask.update(bookProduct.title, statusEnum.failed);
      sentry.captureException(error);
    }
  }
  await etsyPuppeteer.browser?.close();
  process.exit();
}

function errorExit(message: String = '') {
  if (message != '') console.log(chalkUtils.error(` ${message} `));
  process.exit();
}

function getScrapingTasks(textPath: string) {
  const textLines = getTextLines(textPath);
  const scrapeTasks = textLines.map((line) => {
    const split = line.split(' ');
    const price = split[0];
    const url = split[1]?.trim();
    console.log([line, price, url]);
    if (
      isNaN(+price) ||
      /https+:\/\/www.amazon.com\/.*\/dp\/[0-9]{10}\/.*/.test(url) == false
    )
      return new ScrapingTask(price, url, { hasURLError: true });

    return new ScrapingTask(price, url);
  });

  return [...new Set(scrapeTasks)];
}

function getTextLines(textPath: string) {
  const absolutePath = path.resolve(textPath);
  if (fs.existsSync(absolutePath) == false)
    errorExit(`"${chalkUtils.dir(absolutePath)}" does not exist !`);
  const textLines = fs
    .readFileSync(absolutePath, { encoding: 'utf8' })
    .trim()
    .split('\n');
  if (textLines.join('') === '')
    errorExit(`${chalkUtils.dir(absolutePath)} is empty !`);
  return textLines;
}
