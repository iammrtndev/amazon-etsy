import { exec } from 'child_process';

export async function dectectRunningAsync(processName: string) {
  return new Promise((resolve) => {
    exec('tasklist', (err, stdout, stderr) => {
      resolve(stdout.toLowerCase().indexOf(processName.toLowerCase()) > -1);
    });
  });
}
