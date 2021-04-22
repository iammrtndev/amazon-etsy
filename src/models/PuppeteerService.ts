import puppeteer from 'puppeteer-extra';
import { Browser, LaunchOptions } from 'puppeteer';

export default abstract class PuppeteerService {
  protected abstract browser: Browser | undefined;
  protected abstract launchOptions: LaunchOptions;

  protected async setupBrowserAsync() {
    if (this.browser != null) return;
    this.browser = await puppeteer.launch(this.launchOptions);
  }

  public async closeBrowserAsync() {
    await this.browser?.close();
    this.browser = undefined;
  }
}
