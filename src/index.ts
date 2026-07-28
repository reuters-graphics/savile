import { glob } from 'glob';
import { Image, type ImageFormat } from './image';
import {
  spinner,
  select,
  multiselect,
  isCancel,
  cancel,
  confirm,
  text,
  log,
  note,
} from '@clack/prompts';
import * as path from 'path';
import colour from 'picocolors';
import { sleep, spinLoop } from './utils';
import micromatch from 'micromatch';
import dedent from 'dedent';

export { intro } from '@reuters-graphics/clack';
export { outro } from '@clack/prompts';

type Operation =
  | { kind: 'resize'; width: number }
  | { kind: 'optimise'; quality: number }
  | { kind: 'reformat'; format: ImageFormat }
  | { kind: 'progressive' };

const OPERATION_ORDER: Operation['kind'][] = [
  'resize',
  'reformat',
  'optimise',
  'progressive',
];

export class Savile {
  private cwd: string;
  /**
   * Absolute or relative path to images directory.
   */
  private rootDir: string;
  private images?: Image[];
  constructor(
    /**
     * Absolute or relative path to your images directory.
     */
    rootDir: string
  ) {
    this.cwd = process.cwd();
    this.rootDir =
      path.isAbsolute(rootDir) ? rootDir : path.join(this.cwd, rootDir);
  }

  /**
   * Find images in your images root directory.
   *
   * Looks for `.png`, `.jpg`,`.jpeg`,`.webp` and `.avif` files in the
   * images root directory and all sub-directories.
   */
  async findImages() {
    const s = spinner();
    s.start(`Finding images in ${path.relative(this.cwd, this.rootDir)}`);
    const imageFiles = glob.sync('**/*.{png,jpg,jpeg,webp,avif}', {
      cwd: this.rootDir,
      absolute: true,
      nocase: true,
    });
    this.images = imageFiles.map((imgPath) => new Image(imgPath, this.rootDir));
    await sleep(750);
    s.stop(`Found ${colour.cyan(this.images.length)} images.`);
    await this.measureImages();
  }

  private async measureImages() {
    const { images } = this;
    if (!images) throw Error;

    const loop = spinLoop('Measuring images');
    await loop(images, async (image) => image.getStats());

    return this.images!;
  }

  /**
   * Log images in buckets by file size.
   */
  async logImageFileSize() {
    const { images } = this;
    if (!images) throw Error;

    const massiveImages = images.filter((i) => i.stats!.size > 500);
    const largeImages = images.filter(
      (i) => i.stats!.size > 350 && i.stats!.size <= 500
    );
    const mediumImages = images.filter(
      (i) => i.stats!.size > 250 && i.stats!.size <= 350
    );
    const okImages = images.filter((i) => i.stats!.size <= 250);

    note(
      dedent`Possibly oversized:
      🔴 ${colour.bold(colour.red(massiveImages.length))} > 500KB
      🟠 ${largeImages.length} > 350KB
      🟡 ${mediumImages.length} > 250KB

      OK:
      🟢 ${colour.cyan(okImages.length)} ≤ 250KB`,
      'Images by file size'
    );
  }

  /**
   * Log images in buckets by pixel width.
   */
  async logImageWidth() {
    const { images } = this;
    if (!images) throw Error;

    const massiveImages = images.filter((i) => i.stats!.width > 2400);
    const largeImages = images.filter(
      (i) => i.stats!.width > 1800 && i.stats!.width <= 2400
    );
    const mediumImages = images.filter(
      (i) => i.stats!.width > 1200 && i.stats!.width <= 1800
    );
    const okImages = images.filter((i) => i.stats!.width <= 1200);

    note(
      dedent`Possibly oversized:
      🔴 ${colour.bold(colour.red(massiveImages.length))} > 2400px
      🟠 ${largeImages.length} > 1800px
      🟡 ${mediumImages.length} > 1200px

      OK:
      🟢 ${colour.cyan(okImages.length)} ≤ 1200px`,
      'Images by pixel width'
    );
  }

  private matchImagesByQuery(query: string) {
    const { images } = this;
    if (!images) throw Error;
    return images.filter((i) =>
      micromatch.isMatch(i.path, query, { contains: true, nocase: true })
    );
  }

  private matchImagesByWidth(width: number) {
    const { images } = this;
    if (!images) throw Error;
    return images.filter((i) => i.stats!.width > width);
  }

  private matchImagesBySize(size: number) {
    const { images } = this;
    if (!images) throw Error;
    return images.filter((i) => i.stats!.size > size);
  }

  private async queryImages() {
    note(
      dedent`By filename:
      - ${colour.cyan('myPhoto.jpg')}
      - ${colour.cyan('folder/graphic-sm.jpg')}

      With a wildcard:
      - ${colour.cyan('*.jpg')}
      - ${colour.cyan('folder/*')}
      - ${colour.cyan('graphic-*.jpg')}

      With brace options:
      - ${colour.cyan('*.{jpg,png}')}
      `,
      'Query examples'
    );
    const query = await text({
      message: 'Write a query to match the images you want to work with.',
      placeholder: '*.jpg',
      validate: (value: string | undefined) => {
        if (!value) return 'A query is required';
        const matchingImages = this.matchImagesByQuery(value);
        if (matchingImages.length === 0)
          return "Your query didn't match any images. Try another?";
      },
    });

    if (isCancel(query)) {
      cancel('Exiting Savile');
      process.exit(0);
    }

    return this.matchImagesByQuery(query);
  }

  private logSelectedImages(images: Image[]) {
    const log = images
      .map(
        (i) =>
          `- ${i.relPath} ${colour.dim(`(${i.stats!.width}px, ${i.stats!.size}KB)`)}`
      )
      .join('\n');
    note(log, `Selected ${images.length} images`);
  }

  /**
   * Select the set of images to work with, either all of them, by a
   * glob-style query, by a maximum pixel width, or by a minimum file size.
   */
  private async selectImages(): Promise<Image[]> {
    const { images } = this;
    if (!images) throw Error;

    if (images.length === 0) {
      log.info('No images found.');
      process.exit(0);
    }

    const mode = await select({
      message: 'Which images do you want to work with?',
      options: [
        {
          value: 'all',
          label: 'All images',
        },
        {
          value: 'query',
          label: 'Query for specific images',
        },
        {
          value: 'width',
          label: 'Images above a max pixel width',
        },
        {
          value: 'size',
          label: 'Images above a max file size',
        },
      ],
    });

    if (isCancel(mode)) {
      cancel('Exiting Savile');
      process.exit(0);
    }

    let selected: Image[];

    if (mode === 'all') {
      selected = images;
    } else if (mode === 'query') {
      selected = await this.queryImages();
    } else if (mode === 'width') {
      await this.logImageWidth();
      const value = await text({
        message: "What's the max pixel width you want to select images above?",
        placeholder: '1200',
        validate: (value: string | undefined) => {
          if (!value) return 'A value is required';
          const width = parseInt(value);
          if (isNaN(width)) return 'Value must be a number';
          const matchingImages = this.matchImagesByWidth(width);
          if (matchingImages.length === 0)
            return `Found no images bigger than ${value}px. Try a different width?`;
        },
      });

      if (isCancel(value)) {
        cancel('Exiting Savile');
        process.exit(0);
      }

      selected = this.matchImagesByWidth(parseInt(value));
    } else {
      await this.logImageFileSize();
      const value = await text({
        message:
          "What's the max file size (in KB) you want to select images above?",
        placeholder: '250',
        validate: (value: string | undefined) => {
          if (!value) return 'A value is required';
          const size = parseInt(value);
          if (isNaN(size)) return 'Value must be a number';
          const matchingImages = this.matchImagesBySize(size);
          if (matchingImages.length === 0)
            return `Found no images bigger than ${value}KB. Try a different size?`;
        },
      });

      if (isCancel(value)) {
        cancel('Exiting Savile');
        process.exit(0);
      }

      selected = this.matchImagesBySize(parseInt(value));
    }

    this.logSelectedImages(selected);

    return selected;
  }

  private async promptResizeWidth(): Promise<number> {
    const value = await text({
      message: "What's the max pixel width you want to resize your images to?",
      placeholder: '1200',
      validate: (value: string | undefined) => {
        if (!value) return 'A value is required';
        const width = parseInt(value);
        if (isNaN(width)) return 'Value must be a number';
        if (width <= 0) return 'Width must be greater than 0';
      },
    });

    if (isCancel(value)) {
      cancel('Exiting Savile');
      process.exit(0);
    }

    return parseInt(value);
  }

  private async promptOptimiseQuality(): Promise<number> {
    const value = await text({
      message:
        'What quality level should we optimise your images to, (lowest) 0 - 100 (highest)?',
      placeholder: '85',
      validate: (value: string | undefined) => {
        if (!value) return 'A value is required';
        const quality = parseInt(value);
        if (isNaN(quality)) return 'Value must be a number';
        if (quality <= 0 || quality > 100)
          return 'Quality must be a number between 0 - 100';
      },
    });

    if (isCancel(value)) {
      cancel('Exiting Savile');
      process.exit(0);
    }

    return parseInt(value);
  }

  private async promptReformatFormat(): Promise<ImageFormat> {
    const format = await select({
      message: 'What format do you want to convert these images to?',
      options: [
        {
          value: 'jpeg',
          label: 'JPEG',
        },
        {
          value: 'webp',
          label: 'WebP',
        },
        {
          value: 'avif',
          label: 'AVIF',
        },
      ],
    });

    if (isCancel(format)) {
      cancel('Exiting Savile');
      process.exit(0);
    }

    return format as ImageFormat;
  }

  /**
   * Ask which operations to run, in any order, and gather the
   * parameters each chosen operation needs.
   */
  private async chooseOperations(images: Image[]): Promise<Operation[]> {
    const kinds = await multiselect({
      message: 'What would you like to do to these images?',
      options: [
        {
          value: 'resize',
          label: 'Resize',
        },
        {
          value: 'optimise',
          label: 'Optimise',
        },
        {
          value: 'reformat',
          label: 'Reformat',
        },
        {
          value: 'progressive',
          label: 'Convert JPEGs to progressive images',
        },
      ],
      required: true,
    });

    if (isCancel(kinds)) {
      cancel('Exiting Savile');
      process.exit(0);
    }

    const chosen = new Set(kinds as Operation['kind'][]);
    const operations: Operation[] = [];

    for (const kind of OPERATION_ORDER) {
      if (!chosen.has(kind)) continue;

      if (kind === 'resize') {
        operations.push({ kind, width: await this.promptResizeWidth() });
      } else if (kind === 'reformat') {
        operations.push({ kind, format: await this.promptReformatFormat() });
      } else if (kind === 'optimise') {
        operations.push({ kind, quality: await this.promptOptimiseQuality() });
      } else if (kind === 'progressive') {
        const jpegCount = images.filter((i) => i.type === 'jpeg').length;
        if (jpegCount === 0) {
          log.info('None of your selected images are JPEGs — skipping.');
          continue;
        }
        operations.push({ kind });
      }
    }

    return operations;
  }

  private describeOperation(operation: Operation, images: Image[]): string {
    if (operation.kind === 'resize')
      return `Resize to max ${operation.width}px`;
    if (operation.kind === 'optimise')
      return `Optimise to ${operation.quality}% quality`;
    if (operation.kind === 'reformat')
      return `Reformat to .${operation.format}`;
    const jpegCount = images.filter((i) => i.type === 'jpeg').length;
    return `Make progressive (${jpegCount} JPEGs affected)`;
  }

  /**
   * Show a summary of the pending operations, confirm, then run them
   * across the selected images in a single pass.
   */
  private async confirmAndRun(images: Image[], operations: Operation[]) {
    const summary = operations
      .map((op) => `- ${this.describeOperation(op, images)}`)
      .join('\n');
    note(summary, `Planned operations for ${images.length} images`);

    const confirmed = await confirm({
      message: 'Proceed?',
    });

    if (isCancel(confirmed) || !confirmed) {
      cancel('Exiting Savile');
      process.exit(0);
    }

    const sizeBefore = images.reduce((sum, i) => sum + i.stats!.size, 0);

    const acted = await this.runOperations(images, operations);

    const sizeAfter = acted.reduce((sum, i) => sum + i.stats!.size, 0);
    this.logRunSummary(sizeBefore, sizeAfter, acted.length);

    return acted;
  }

  private logRunSummary(sizeBefore: number, sizeAfter: number, count: number) {
    const saved = sizeBefore - sizeAfter;
    const percent =
      sizeBefore === 0 ? 0 : Math.round((saved / sizeBefore) * 100);
    const savedLine =
      saved >= 0 ?
        `Saved ${colour.green(colour.bold(`${saved}KB`))} (${percent}%)`
      : `Added ${colour.red(colour.bold(`${Math.abs(saved)}KB`))} (${Math.abs(percent)}%)`;

    note(
      dedent`${count} images processed
      ${sizeBefore}KB → ${sizeAfter}KB

      ${savedLine}`,
      'Summary'
    );
  }

  private async runOperations(images: Image[], operations: Operation[]) {
    const loop = spinLoop('Working on images');

    await loop(images, async (image) => {
      for (const operation of operations) {
        if (operation.kind === 'resize') {
          image.resize(operation.width);
        } else if (operation.kind === 'reformat') {
          image.reformat(operation.format);
        } else if (operation.kind === 'optimise') {
          image.optimise(operation.quality);
        } else if (operation.kind === 'progressive') {
          image.makeProgressive();
        }
      }
      await image.overwriteImg();
    });

    return images;
  }

  /**
   * Resize images in your directory.
   *
   * ### CLI
   * ```console
   * Usage
   *   $ savile resize <imagesDir> [options]
   *
   * Options
   *   -h, --help    Displays this message
   *
   * Examples
   *   $ savile resize ./src/statics/images
   * ```
   */
  async resize() {
    const images = await this.selectImages();
    const width = await this.promptResizeWidth();
    return this.confirmAndRun(images, [{ kind: 'resize', width }]);
  }

  /**
   * Optimise images in your directory.
   *
   * ### CLI
   * ```console
   * Usage
   *   $ savile optimise <imagesDir> [options]
   *
   * Options
   *   -h, --help    Displays this message
   *
   * Examples
   *   $ savile optimise ./src/statics/images
   * ```
   */
  async optimise() {
    const images = await this.selectImages();
    const quality = await this.promptOptimiseQuality();
    return this.confirmAndRun(images, [{ kind: 'optimise', quality }]);
  }

  /**
   * Reformat images in your directory.
   *
   * ### CLI
   * ```console
   * Usage
   *   $ savile resize <imagesDir> [options]
   *
   * Options
   *   -h, --help    Displays this message
   *
   * Examples
   *   $ savile row ./src/statics/images
   * ```
   */
  async reformat() {
    const images = await this.selectImages();
    const format = await this.promptReformatFormat();
    return this.confirmAndRun(images, [{ kind: 'reformat', format }]);
  }

  /**
   * Convert JPEGs files in your directory to progressive images,
   */
  async progressivise() {
    const images = await this.selectImages();
    return this.confirmAndRun(images, [{ kind: 'progressive' }]);
  }

  /**
   * Resize, optimise, reformat and/or make progressive images in your
   * directory — select the images once, then choose one or more
   * operations to run across them in a single pass.
   *
   * ### CLI
   * ```console
   * Usage
   *   $ savile row <imagesDir> [options]
   *
   * Options
   *   -h, --help    Displays this message
   *
   * Examples
   *   $ savile row ./src/statics/images
   * ```
   */
  async row() {
    await this.logImageFileSize();
    const images = await this.selectImages();
    const operations = await this.chooseOperations(images);
    return this.confirmAndRun(images, operations);
  }
}
