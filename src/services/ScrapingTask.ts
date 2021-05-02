import draftLog from 'draftlog';
import * as chalkUtils from '../utils/chalkUtils';
import { Dashboard } from './scrapingDashboard';
draftLog.into(console);

export default class ScrapingTask {
  private _status: statusEnum = statusEnum.pending;
  public get status(): statusEnum {
    return this._status;
  }
  private set status(value: statusEnum) {
    this._status = value;
  }

  public readonly price: string;
  public readonly url: string;
  private dashboard: Dashboard | undefined;
  private draft: consoleDraft | undefined;

  constructor(price: string, url: string) {
    this.price = price;
    this.url = url;
  }

  public static getStatusDisplay(status: statusEnum) {}

  public setupDraft(dashboard: Dashboard) {
    this.dashboard = dashboard;
    this.draft = console.draft();
    this.update(this.url, statusEnum.pending);
  }

  public update(name: string, status: statusEnum) {
    if (this.dashboard == null || this.draft == null) return;
    this.status = status;
    const displayingName = chalkUtils.dir(
      name.length > 100
        ? `${name.slice(0, Math.min(name.length, 100))}...`
        : name
    );
    switch (status) {
      case statusEnum.pending:
        this.draft(`${displayingName} ${chalkUtils.warning(' Pending ')}`);
        this.dashboard.pending.update();
        break;
      case statusEnum.downloaded:
        this.draft(`${displayingName} ${chalkUtils.info(' Downloaded ')}`);
        break;
      case statusEnum.succeded:
        this.draft(`${displayingName} ${chalkUtils.success(' Succeded ')}`);
        this.dashboard.succeded.update();
        break;
      case statusEnum.failed:
        this.draft(`${displayingName} ${chalkUtils.error(' Failed ')}`);
        this.dashboard.failed.update();
        break;
    }
  }
}

export enum statusEnum {
  pending,
  downloaded,
  succeded,
  failed,
}

export declare type consoleDraft = (
  message?: any,
  ...optionalParams: any[]
) => void;
