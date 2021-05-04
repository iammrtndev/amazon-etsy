import draftLog from 'draftlog';
import * as chalkUtils from '../utils/chalkUtils';
import { Dashboard } from './scrapingDashboard';
draftLog.into(console);

export default class ScrapingTask {
  private _status: statusEnum = statusEnum.pending;
  public get status(): statusEnum {
    return this._status;
  }

  public readonly price: string;
  public readonly url: string;
  public readonly hasURLError: boolean;

  private dashboard: Dashboard | undefined;
  private draft: consoleDraft | undefined;

  constructor(
    price: string,
    url: string,
    { hasURLError } = { hasURLError: false }
  ) {
    this.price = price;
    this.url = url;
    this.hasURLError = hasURLError;
  }

  public setupDraft(dashboard: Dashboard) {
    this.dashboard = dashboard;
    this.draft = console.draft();
    this.update(
      this.url,
      this.hasURLError ? statusEnum.failed : statusEnum.pending
    );
  }

  public update(name: string, status: statusEnum) {
    if (this.dashboard == null || this.draft == null) return;
    this._status = status;
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
        const error = this.hasURLError ? ' URL ERROR ' : ' Failed ';
        this.draft(`${displayingName} ${chalkUtils.error(error)}`);
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
