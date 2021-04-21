import JPGImage from '../services/JPGImage';

export class AmazonProduct {
  url: string;
  title: string = '';
  description: string = '';
  details: string = '';
  price: string = '';
  images: JPGImage[] = [];
  constructor(url: string) {
    this.url = url;
  }
}
