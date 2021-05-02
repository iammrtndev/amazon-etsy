import * as chalkUtils from '../utils/chalkUtils';
import draftLog from 'draftlog';
import ScrapingTask, { consoleDraft, statusEnum } from './ScrapingTask';
draftLog.into(console);

declare type dashboardInfo = {
  draft: consoleDraft | null;
  update: () => void;
};

export declare type Dashboard = {
  [info: string]: dashboardInfo;
  pending: dashboardInfo;
  succeded: dashboardInfo;
  failed: dashboardInfo;
};

const dashboard: Dashboard = {
  pending: {
    draft: null,
    update() {
      const count = Object.values(scrapingTasks).filter(
        (task) => task.status == statusEnum.pending
      ).length;
      this.draft!(chalkUtils.warning(` ${count} Pending  `));
    },
  },
  succeded: {
    draft: null,
    update() {
      const count = Object.values(scrapingTasks).filter(
        (task) => task.status == statusEnum.succeded
      ).length;
      this.draft!(chalkUtils.success(` ${count} Succeded `));
    },
  },
  failed: {
    draft: null,
    update() {
      const count = Object.values(scrapingTasks).filter(
        (task) => task.status == statusEnum.failed
      ).length;
      this.draft!(chalkUtils.error(` ${count} Failed   `));
    },
  },
};
let scrapingTasks: ScrapingTask[] = [];

export function init(tasks: ScrapingTask[]) {
  process.stdout.write('\x1Bc');
  for (const info in dashboard) {
    dashboard[info].draft = console.draft();
    dashboard[info].update();
  }
  console.log();
  scrapingTasks = tasks;
  scrapingTasks.forEach((task) => task.setupDraft(dashboard));
  dashboard.pending.update();
}
