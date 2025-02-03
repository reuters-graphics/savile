import fs from 'fs';
import { promisify } from 'util';
import imgSize from 'image-size';
import path from 'path';
import sharp, { type Sharp } from 'sharp';
import { customAlphabet } from 'nanoid';

const asyncImgSize = promisify(imgSize);
const nanoid = customAlphabet('abcdefghijkABCDEFGHIJK', 6);

const uniqifyBasename = (filePath: string) => {
  const ext = path.extname(filePath);
  const filename = path.basename(filePath, ext);
  const dirname = path.dirname(filePath);
  return path.join(dirname, filename + '.temp.' + nanoid() + ext);
};

const replaceExtension = (filePath: string, extension: ImageFormat) => {
  const ext = path.extname(filePath);
  const filename = path.basename(filePath, ext);
  const dirname = path.dirname(filePath);
  return path.join(dirname, filename + '.' + extension);
};

interface Stats {
  width: number;
  height: number;
  size: number;
}

type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif';

export class Image {
  /**
   * Absolute path to the current image on the filesystem
   */
  path: string;
  relPath: string;
  private rootDir: string;
  /**
   * Path to a temporary version of the file, used when
   * resizing, optimizing or reformating.
   */
  tempPath: string;
  /**
   * Type of the current image.
   */
  type: ImageFormat | undefined;
  /**
   * Sharp instance of current image
   */
  private sharpImg?: Sharp;
  stats?: Stats;
  constructor(imgPath: string, rootDir: string) {
    this.path = imgPath;
    this.rootDir = rootDir;
    this.relPath = path.relative(rootDir, imgPath);
    this.tempPath = uniqifyBasename(imgPath);
    this.type = this.getType();
  }

  private getType(): ImageFormat | undefined {
    const ext = path.extname(this.path).toLowerCase();
    switch (ext) {
      case '.png':
        return 'png';
      case '.jpg':
      case '.jpeg':
        return 'jpeg';
      case '.webp':
        return 'webp';
      case '.avif':
        return 'avif';
      default:
        return undefined;
    }
  }

  /**
   * Get width, height and size (in KB) of an image
   */
  async getStats() {
    const imgSize = await asyncImgSize(this.path);
    if (!imgSize || !imgSize.width || !imgSize.height) {
      throw new Error(`Error measuring image: ${this.path}`);
    }
    const { width, height } = imgSize;
    /** Size in KB */
    const size = Math.ceil(fs.statSync(this.path).size / 1024);
    this.stats = {
      width,
      height,
      size,
    } as Stats;
    return this.stats;
  }

  private getSharpImg() {
    if (this.sharpImg) return this.sharpImg;
    this.sharpImg = sharp(fs.readFileSync(this.path));
    return this.sharpImg;
  }

  /**
   * Resize the image to a maximum width
   * @param width Width in pixels
   */
  resize(width: number) {
    const sharp = this.getSharpImg();
    // Don't resize if the width is already smaller
    if (this.stats!.width <= width) return;
    this.sharpImg = sharp.resize({ width });
  }

  /**
   * Optimise the image to a percent quality
   * @param quality Quality as an integer between 0 - 100
   */
  optimise(quality: number) {
    const sharp = this.getSharpImg();
    if (this.type === 'png') {
      this.sharpImg = sharp.png({ quality });
    } else if (this.type === 'jpeg') {
      this.sharpImg = sharp.jpeg({ quality, optimiseScans: true });
    } else if (this.type === 'webp') {
      this.sharpImg = sharp.webp({ quality, lossless: true });
    } else if (this.type === 'avif') {
      this.sharpImg = sharp.avif({ quality });
    }
  }

  /**
   * Reformat the image into a new format, e.g., JPEG to PNG.
   * @param format Image format to convert the image to
   */
  reformat(format: ImageFormat) {
    if (this.type === format) return;
    const sharp = this.getSharpImg();
    this.sharpImg = sharp.toFormat(format);
    this.type = format;
    this.tempPath = replaceExtension(this.tempPath, this.type);
  }

  /**
   * Make JPEG image progressive
   */
  makeProgressive() {
    const sharp = this.getSharpImg();
    if (this.type === 'jpeg') {
      this.sharpImg = sharp.jpeg({ optimiseScans: true });
    }
  }

  async overwriteImg() {
    const sharp = this.getSharpImg();
    const buffer = await sharp.toBuffer();
    fs.writeFileSync(this.tempPath, buffer);
    fs.unlinkSync(this.path);
    /**
     * If we've reformatted the image, update the image path extension
     * after we've deleted the original.
     */
    if (this.getType() !== this.type) {
      this.path = replaceExtension(this.path, this.type!);
    }

    fs.copyFileSync(this.tempPath, this.path);
    fs.unlinkSync(this.tempPath);
    await this.getStats();
  }
}
