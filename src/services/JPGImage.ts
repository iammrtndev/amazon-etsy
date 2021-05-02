import axios from 'axios';
// @ts-ignore
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

interface resizeOptions {
  width?: number;
  height?: number;
}

export default class JPGImage {
  name: string;
  sharpOBJ: sharp.Sharp | undefined;
  latestSavePath: string | undefined;

  constructor(name: string) {
    this.name = name;
  }

  public async downloadAsync(url: string) {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
    });
    this.sharpOBJ = sharp(response.data as Buffer);
    return this;
  }

  public resize(options: resizeOptions) {
    if (this.sharpOBJ)
      this.sharpOBJ.resize({
        fit: 'contain',
        ...options,
      });
  }

  public async saveAsync(savePath: string) {
    if (fs.existsSync(savePath) == false) fs.mkdirSync(savePath);
    const output = path.resolve(savePath, `${this.name}.jpg`);
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
