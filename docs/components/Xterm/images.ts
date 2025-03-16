import { Jimp } from 'jimp';

export async function createImage(width = 600, height = 400, type: 'jpeg' | 'png' = 'jpeg') {
  const image = new Jimp({ width, height, color: 0xffffffff });
  return image.getBuffer(`image/${type}`);
}

export const fetchImage = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    return createImage(1200, 600);
  }
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export async function fetchPlaceholderImage(width: number, height: number, extension = 'jpg') {
  const placeholderUrl = `https://placehold.co/${width}x${height || width}.${extension}`;
  return fetchImage(placeholderUrl);
}