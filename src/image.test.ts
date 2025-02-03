// image.test.ts
import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import mockFs from 'mock-fs';
import path from 'path';
import fs from 'fs';

import { Image } from './image';

describe('Image', () => {
  let rootDir: string;
  let testImagePath: string;

  beforeEach(() => {
    // We'll store our test image (and .savile.cache.json) under this directory
    rootDir = 'mockDir';
    testImagePath = path.join(rootDir, 'test-img.png');

    mockFs({
      [rootDir]: {
        'test-img.png': mockFs.load(path.join(__dirname, 'test/oversize.png')),
      },
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('should get image stats', async () => {
    const image = new Image(testImagePath, rootDir);

    // Stats from the original 1×1 PNG
    const stats = await image.getStats();
    expect(stats.width).toBeGreaterThan(0);
    expect(stats.height).toBeGreaterThan(0);
    expect(stats.size).toBeGreaterThan(0);
  });

  it('should reformat an image (PNG to JPEG)', async () => {
    const image = new Image(testImagePath, rootDir);

    image.reformat('jpeg');
    await image.overwriteImg();

    expect(image.path.endsWith('.jpeg')).toBe(true);
    expect(fs.existsSync(image.path)).toBe(true);
  });

  it('should resize the image', async () => {
    const image = new Image(testImagePath, rootDir);

    await image.getStats();

    image.resize(600);

    await image.overwriteImg();

    expect(image.stats!.width).toBe(600);
  });

  it('should not resize the image if it is already smaller than the width', async () => {
    const image = new Image(testImagePath, rootDir);

    await image.getStats();

    const currentWidth = image.stats!.width;

    image.resize(6000);

    await image.overwriteImg();

    expect(image.stats!.width).toBe(currentWidth);
  });
});
