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
import { select, text } from '@clack/prompts';
import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

vi.mock('@clack/prompts', async (importOriginal) => {
  const mod = (await importOriginal()) as object;
  return {
    ...mod,
    select: vi.fn(),
    multiselect: vi.fn(),
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
        },
      },
    },
    { createCwd: false }
  );
});

afterEach(() => {
  mock.restore();
  vi.clearAllMocks();
});

/** Pull the `validate` fn off the most recent mocked `text()` call. */
const lastValidate = () => {
  const calls = (text as Mock).mock.calls;
  return calls[calls.length - 1][0].validate as (
    v: string | undefined
  ) => string | undefined;
};

describe('validate guards survive clack 1.x passing `undefined`', () => {
  it('queryImages', async () => {
    const savile = new Savile('images');
    await savile.findImages();
    (text as Mock).mockResolvedValueOnce('*.jpg');
    // @ts-ignore OK private
    await savile.queryImages();
    const validate = lastValidate();

    // The regression: clack 1.x hands `undefined` to validate on empty Enter.
    expect(validate(undefined)).toBe('A query is required');
    expect(validate('')).toBe('A query is required');
    // Still matches normally.
    expect(validate('*.jpg')).toBeUndefined();
    expect(validate('*.nope')).toMatch(/didn't match/);
  });

  it('promptResizeWidth', async () => {
    const savile = new Savile('images');
    await savile.findImages();
    (text as Mock).mockResolvedValueOnce('1200');
    // @ts-ignore OK private
    await savile.promptResizeWidth();
    const validate = lastValidate();

    expect(validate(undefined)).toBe('A value is required');
    expect(validate('')).toBe('A value is required');
    expect(validate('abc')).toBe('Value must be a number');
    expect(validate('1200')).toBeUndefined();
  });

  it('promptOptimiseQuality — and does not falsely reject "0"', async () => {
    const savile = new Savile('images');
    await savile.findImages();
    (text as Mock).mockResolvedValueOnce('85');
    // @ts-ignore OK private
    await savile.promptOptimiseQuality();
    const validate = lastValidate();

    expect(validate(undefined)).toBe('A value is required');
    expect(validate('85')).toBeUndefined();
    // '0' is falsy-adjacent but a non-empty string, so it must reach the
    // range check rather than the required check.
    expect(validate('0')).toBe('Quality must be a number between 0 - 100');
  });

  it('selectImages by width', async () => {
    const savile = new Savile('images');
    await savile.findImages();
    (select as Mock).mockResolvedValueOnce('width');
    (text as Mock).mockResolvedValueOnce('1');
    // @ts-ignore OK private
    await savile.selectImages();
    const validate = lastValidate();

    expect(validate(undefined)).toBe('A value is required');
    expect(validate('abc')).toBe('Value must be a number');
  });

  it('selectImages by size', async () => {
    const savile = new Savile('images');
    await savile.findImages();
    (select as Mock).mockResolvedValueOnce('size');
    (text as Mock).mockResolvedValueOnce('1');
    // @ts-ignore OK private
    await savile.selectImages();
    const validate = lastValidate();

    expect(validate(undefined)).toBe('A value is required');
    expect(validate('abc')).toBe('Value must be a number');
  });
});
