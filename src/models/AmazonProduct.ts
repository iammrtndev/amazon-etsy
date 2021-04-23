import JPGImage from '../services/JPGImage';

export class AmazonProduct {
  url: string;
  title: string = '';
  description: string = '';
  details: string = '';
  price: string = '';
  images: JPGImage[] = [];
  constructor(
    url: string,
    title: string,
    description: string,
    details: string,
    price: string
  ) {
    this.url = url;
    this.title = title && title;
    this.description = description && description;
    this.details = details && details;
    this.price = price && price;
  }
}
