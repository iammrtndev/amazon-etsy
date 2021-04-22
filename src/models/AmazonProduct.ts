import JPGImage from '../services/JPGImage';

export class AmazonProduct {
  url: string;
  title: string;
  description: string;
  details: string;
  price: string;
  images: JPGImage[] = [];
  constructor(
    url: string,
    title: string,
    description: string,
    details: string,
    price: string
  ) {
    this.title = title || '';
    this.description = description || '';
    this.details = details || '';
    this.price = price || '';
    this.url = url;
  }
}
