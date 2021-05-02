import JPGImage from '../services/JPGImage';

export class BookProduct {
  url: string;
  title: string = '';
  description: string = '';
  images: JPGImage[] = [];
  constructor(url: string, title: string, description: string) {
    this.url = url;
    this.title = title && title;
    this.description = description && description;
  }
}
