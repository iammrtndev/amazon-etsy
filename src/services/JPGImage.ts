import axios from 'axios';
// @ts-ignore
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import filenamify from 'filenamify';

interface resizeOptions {
  width?: number;
  height?: number;
}

export default class JPGImage {
  name: string;
  sharpOBJ: sharp.Sharp | undefined;
  latestSavePath: string | undefined;

  constructor(name: string) {
    this.name = filenamify(name, { replacement: '' }).replace(/\s/g, '_');
  }

  async loadAsync(url: string) {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
    });
    this.sharpOBJ = sharp(response.data as Buffer);
  }

  resize(options: resizeOptions) {
    this.sharpOBJ?.resize({
      fit: 'contain',
      ...options,
    });
  }

  async saveAsync(relativePath: string) {
    if (!fs.existsSync(relativePath)) fs.mkdirSync(relativePath);
    const output = path.resolve(relativePath, `${this.name}.jpg`);
    const buffer = await this.sharpOBJ?.jpeg({ mozjpeg: true }).toBuffer()!;
    return new Promise<void>((resolve) => {
      fs.writeFile(output, buffer, (error) => {
        this.latestSavePath = output;
        if (error) throw error;
        resolve();
      });
    });
  }
}
