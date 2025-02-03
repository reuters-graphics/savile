import {
  describe,
  it,
  beforeEach,
  afterEach,
  vi,
  expect,
  type Mock,
} from 'vitest';
import { Savile } from '.';
import mock from 'mock-fs';
import path from 'path';
import { confirm, select, text } from '@clack/prompts';
import * as fs from 'fs';
import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

vi.mock('@clack/prompts', async (importOriginal) => {
  const mod = (await importOriginal()) as object;
  return {
    ...mod,
    select: vi.fn(),
    text: vi.fn(),
    confirm: vi.fn(),
  };
});

beforeEach(() => {
  mock(
    {
      [process.cwd()]: {
        images: {
          'one.png': mock.load(path.resolve(__dirname, './test/oversize.png')),
          'two.jpg': mock.load(path.resolve(__dirname, './test/oversize.jpg')),
          sub: {
            'one.png': mock.load(
              path.resolve(__dirname, './test/oversize.png')
            ),
            'two.JPEG': mock.load(
              path.resolve(__dirname, './test/oversize.jpg')
            ),
          },
          sub2: {
            'thingy-one.jpg': mock.load(
              path.resolve(__dirname, './test/oversize.jpg')
            ),
            'thingy-two.png': mock.load(
              path.resolve(__dirname, './test/oversize.png')
            ),
          },
        },
      },
    },
    { createCwd: false }
  );
});

afterEach(() => {
  mock.restore();
});

describe('Savile', () => {
  it('should find and measure images', async () => {
    const savile = new Savile(path.join(process.cwd(), 'images'));

    await savile.findImages();
    // @ts-ignore OK private
    expect(savile.images!.length).toBe(6);
    // @ts-ignore OK private
    expect(savile.images!.filter((i) => i.stats!.size > 500).length).toBe(3);
    // @ts-ignore OK private
    expect(savile.images!.filter((i) => i.stats!.size <= 250).length).toBe(3);
  });

  it('should log image files sizes', async () => {
    const savile = new Savile('images');
    await savile.findImages();
    await savile.logImageFileSize();
  });

  it('should log image widths', async () => {
    const savile = new Savile('images');
    await savile.findImages();
    await savile.logImageWidth();
  });

  it('should match images by string query', async () => {
    const savile = new Savile('images');

    await savile.findImages();
    // File extension match
    // @ts-ignore OK private
    expect(savile.matchImagesByQuery('*.jpg').length).toBe(2);
    // Case-insensitive
    // @ts-ignore OK private
    expect(savile.matchImagesByQuery('*.jpeg').length).toBe(1);
    // Brace match
    // @ts-ignore OK private
    expect(savile.matchImagesByQuery('*.{jpg,jpeg}').length).toBe(3);
    // Directory match
    // @ts-ignore OK private
    expect(savile.matchImagesByQuery('sub/*').length).toBe(2);
    // @ts-ignore OK private
    expect(savile.matchImagesByQuery('sub2/*').length).toBe(2);
    // Partial filename match
    // @ts-ignore OK private
    expect(savile.matchImagesByQuery('thingy-*.jpg').length).toBe(1);
    // @ts-ignore OK private
    expect(savile.matchImagesByQuery('thingy-*.*').length).toBe(2);
    // Basename match
    // @ts-ignore OK private
    expect(savile.matchImagesByQuery('one.png').length).toBe(2);
  });

  it('should match images by width query', async () => {
    const savile = new Savile('images');

    await savile.findImages();
    // @ts-ignore OK private
    expect(savile.matchImagesByWidth(2000).length).toBe(3);
    // @ts-ignore OK private
    expect(savile.matchImagesByWidth(1000).length).toBe(6);
  });

  it('should match with prompted query', async () => {
    const savile = new Savile('images');
    await savile.findImages();
    (text as Mock).mockResolvedValueOnce('*jpeg');
    // @ts-ignore OK private
    expect((await savile.queryImages()).length).toBe(1);
    (text as Mock).mockResolvedValueOnce('thingy-*.*');
    // @ts-ignore OK private
    expect((await savile.queryImages()).length).toBe(2);
  });

  it('should resize by prompted max width', async () => {
    const savile = new Savile('images');
    await savile.findImages();
    (text as Mock).mockResolvedValueOnce('1999');
    (confirm as Mock).mockResolvedValueOnce(true);
    // @ts-ignore OK private
    expect((await savile.resizeByMaxWidth()).length).toBe(3);
    // @ts-ignore OK private
    expect(savile.matchImagesByWidth(2000).length).toBe(0);
  });

  it('should resize by prompted query', async () => {
    const savile = new Savile('images');
    await savile.findImages();
    (text as Mock).mockResolvedValueOnce('*.{jpg,jpeg}');
    (text as Mock).mockResolvedValueOnce('600');
    (confirm as Mock).mockResolvedValueOnce(true);
    // @ts-ignore OK private
    const resized = await savile.resizeByQuery();
    expect(resized.length).toBe(3);
    expect(resized.every((i) => i.stats!.width === 600)).toBe(true);
    // @ts-ignore OK private
    expect(savile.matchImagesByWidth(2000).length).toBe(0);
  });

  it('should resize > query', async () => {
    const savile = new Savile('images');
    await savile.findImages();
    (select as Mock).mockResolvedValueOnce('query');
    (text as Mock).mockResolvedValueOnce('*.{jpg,jpeg}');
    (text as Mock).mockResolvedValueOnce('600');
    (confirm as Mock).mockResolvedValueOnce(true);
    const resized = (await savile.resize())!;
    expect(resized.length).toBe(3);
    expect(resized.every((i) => i.stats!.width === 600)).toBe(true);
    // @ts-ignore OK private
    expect(savile.matchImagesByWidth(2000).length).toBe(0);
  });

  it('should resize > max', async () => {
    const savile = new Savile('images');
    await savile.findImages();
    (select as Mock).mockResolvedValueOnce('max');
    (text as Mock).mockResolvedValueOnce('1999');
    (confirm as Mock).mockResolvedValueOnce(true);
    const resized = (await savile.resize())!;
    expect(resized.length).toBe(3);
    expect(resized.every((i) => i.stats!.width === 1999)).toBe(true);
    // @ts-ignore OK private
    expect(savile.matchImagesByWidth(2000).length).toBe(0);
  });

  it('should optimise', async () => {
    const savile = new Savile('images');
    await savile.findImages();
    // @ts-ignore OK private
    const ogImg = savile.matchImagesByQuery('thingy-one.jpg')[0];
    const ogSize = ogImg.stats!.size;
    (text as Mock).mockResolvedValueOnce('thingy-one.jpg');
    (text as Mock).mockResolvedValueOnce('80');
    (confirm as Mock).mockResolvedValueOnce(true);
    await savile.optimise();
    // @ts-ignore OK private
    const newImg = savile.matchImagesByQuery('thingy-one.jpg')[0];
    const newSize = newImg.stats!.size;
    expect(ogSize).toBeGreaterThan(newSize);
  });

  it('should reformat', async () => {
    const savile = new Savile('images');
    await savile.findImages();
    // @ts-ignore OK private
    const ogImg = savile.matchImagesByQuery('thingy-one.jpg')[0];
    const ogSize = ogImg.stats!.size;
    expect(ogSize).toBeGreaterThan(0);
    (text as Mock).mockResolvedValueOnce('thingy-one.jpg');
    (select as Mock).mockResolvedValueOnce('webp');
    (confirm as Mock).mockResolvedValueOnce(true);
    await savile.reformat();
    expect(fs.existsSync('images/sub2/thingy-one.jpg')).toBe(false);
    expect(fs.existsSync('images/sub2/thingy-one.webp')).toBe(true);
    // @ts-ignore OK private
    const newImg = savile.matchImagesByQuery('thingy-one.webp')[0];
    expect(newImg).toBeTruthy();
    const newSize = newImg.stats!.size;
    expect(ogSize).toBeGreaterThan(newSize);
  });

  it('should progressivise by query', async () => {
    const savile = new Savile('images');
    await savile.findImages();
    // @ts-ignore OK private
    const ogImg = savile.matchImagesByQuery('thingy-one.jpg')[0];
    const ogSize = ogImg.stats!.size;
    (text as Mock).mockResolvedValueOnce('thingy-one.jpg');
    (confirm as Mock).mockResolvedValueOnce(true);

    // @ts-ignore OK private
    await savile.progresiviseByQuery();

    // @ts-ignore OK private
    const newImg = savile.matchImagesByQuery('thingy-one.jpg')[0];
    expect(ogSize).toBeGreaterThan(newImg.stats!.size);
  });

  it('should progressivise by query', async () => {
    const savile = new Savile('images');
    await savile.findImages();
    // @ts-ignore OK private
    const ogImg = savile.matchImagesByQuery('thingy-one.jpg')[0];
    const ogSize = ogImg.stats!.size;
    (confirm as Mock).mockResolvedValueOnce(true);

    // @ts-ignore OK private
    await savile.progresiviseAll();

    // @ts-ignore OK private
    const newImg = savile.matchImagesByQuery('thingy-one.jpg')[0];
    expect(ogSize).toBeGreaterThan(newImg.stats!.size);
  });
}, 10_000);
