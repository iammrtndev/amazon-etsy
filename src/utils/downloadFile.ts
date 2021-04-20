import path from 'path';
import axios from 'axios';
import fs from 'fs';

export default async function downloadFile(
  url: string,
  output: string
): Promise<string> {
  const writer = fs.createWriteStream(output);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      resolve(path.resolve(output));
    });
    writer.on('error', reject);
  });
}
