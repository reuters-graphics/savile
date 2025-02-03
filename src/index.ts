import { glob } from 'glob';
import { Image } from './image';
import {
  spinner,
  select,
  isCancel,
  cancel,
  confirm,
  note,
  text,
  log,
} from '@clack/prompts';
import * as path from 'path';
import colour from 'picocolors';
import { sleep, spinLoop } from './utils';
import micromatch from 'micromatch';
import dedent from 'dedent';

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
      validate: (value: string) => {
        if (value.length === 0) return 'A query is required';
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

  private async resizeByMaxWidth() {
    const value = await text({
      message: "What's the max pixel width you want to resize your images to?",
      placeholder: '1200',
      validate: (value: string) => {
        if (value.length === 0) return 'A value is required';
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

    const width = parseInt(value);
    const imagesToResize = this.matchImagesByWidth(width);

    const log = imagesToResize
      .map((i) => `- ${i.relPath} ${colour.dim(`(${i.stats!.width}px)`)}`)
      .join('\n');

    note(log, `Images > ${width}px`);

    const confirmed = await confirm({
      message: `Found ${imagesToResize.length} images. Resize them now?`,
    });

    if (isCancel(confirmed) || !confirmed) {
      cancel('Exiting Savile');
      process.exit(0);
    }

    const loop = spinLoop('Resizing images');

    await loop(imagesToResize, async (image) => {
      image.resize(width);
      await image.overwriteImg();
    });

    return imagesToResize;
  }

  private async resizeByQuery() {
    const imagesToResize = await this.queryImages();

    const log = imagesToResize
      .map((i) => `- ${i.relPath} ${colour.dim(`(${i.stats!.width}px)`)}`)
      .join('\n');

    note(log, `Found ${imagesToResize.length} images`);

    const value = await text({
      message: "What's the max pixel width you want to resize your images to?",
      placeholder: '1200',
      validate: (value: string) => {
        if (value.length === 0) return 'A value is required';
        const width = parseInt(value);
        if (isNaN(width)) return 'Value must be a number';
        if (width <= 0) return 'Width must be greater than 0';
      },
    });

    if (isCancel(value)) {
      cancel('Exiting Savile');
      process.exit(0);
    }

    const width = parseInt(value);

    const confirmed = await confirm({
      message: `OK, we'll resize these ${imagesToResize.length} images to ${width}px width. Proceed?`,
    });

    if (isCancel(confirmed) || !confirmed) {
      cancel('Exiting Savile');
      process.exit(0);
    }

    const loop = spinLoop('Resizing images');
    await loop(imagesToResize, async (image) => {
      image.resize(width);
      await image.overwriteImg();
    });

    return imagesToResize;
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
    await this.logImageWidth();

    const mode = await select({
      message: 'How do you want to resize your images?',
      options: [
        {
          value: 'max',
          label: 'Set a max width for all images and resize any above that max',
        },
        {
          value: 'query',
          label: 'Query for specific images and resize them',
        },
      ],
    });

    if (isCancel(mode)) {
      cancel('Exiting Savile');
      process.exit(0);
    }

    if (mode === 'max') return this.resizeByMaxWidth();
    if (mode === 'query') return this.resizeByQuery();
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
    const imagesToOptimise = await this.queryImages();

    const log = imagesToOptimise
      .map((i) => `- ${i.relPath} ${colour.dim(`(${i.stats!.size}KB)`)}`)
      .join('\n');

    note(log, `Found ${imagesToOptimise.length} images`);

    const value = await text({
      message:
        'What quality level should we optimise your images to, (lowest) 0 - 100 (highest)?',
      placeholder: '85',
      validate: (value: string) => {
        if (value.length === 0) return 'A value is required';
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

    const quality = parseInt(value);

    const confirmed = await confirm({
      message: `OK, we'll optimise these ${imagesToOptimise.length} images to ${quality}% quality. Proceed?`,
    });

    if (isCancel(confirmed) || !confirmed) {
      cancel('Exiting Savile');
      process.exit(0);
    }

    const loop = spinLoop('Optimising images');
    await loop(imagesToOptimise, async (image) => {
      image.optimise(quality);
      await image.overwriteImg();
    });

    return imagesToOptimise;
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
    const imagesToReformat = await this.queryImages();

    const log = imagesToReformat.map((i) => `- ${i.relPath}`).join('\n');
    note(log, `Found ${imagesToReformat.length} images`);

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

    const confirmed = await confirm({
      message: `OK, we'll reformat these ${imagesToReformat.length} images to .${format} images. Proceed?`,
    });

    if (isCancel(confirmed) || !confirmed) {
      cancel('Exiting Savile');
      process.exit(0);
    }

    const loop = spinLoop('Reformatting images');
    await loop(imagesToReformat, async (image) => {
      image.reformat(format);
      await image.overwriteImg();
    });

    return imagesToReformat;
  }

  private async progresiviseAll() {
    const imagesToProgressivise = this.matchImagesByQuery('*.{jpg,jpeg}');

    if (imagesToProgressivise.length === 0) {
      log.info('No JPEG images found.');
      return;
    }

    const imgLog = imagesToProgressivise
      .map((i) => `- ${i.relPath} ${colour.dim(`(${i.stats!.size}KB)`)}`)
      .join('\n');

    note(imgLog, `JPEG images`);

    const confirmed = await confirm({
      message: `Found ${imagesToProgressivise.length} JPEG images. Make them progressive now?`,
    });

    if (isCancel(confirmed) || !confirmed) {
      cancel('Exiting Savile');
      process.exit(0);
    }

    const loop = spinLoop('Making progressive JPEGs');

    await loop(imagesToProgressivise, async (image) => {
      image.makeProgressive();
      await image.overwriteImg();
    });

    return imagesToProgressivise;
  }

  private async progresiviseByQuery(): Promise<Image[]> {
    const imagesToProgressivise = (await this.queryImages()).filter((i) =>
      micromatch.isMatch(path.basename(i.path), '*.{jpg,jpeg}', {
        nocase: true,
      })
    );

    if (imagesToProgressivise.length === 0) {
      log.info('No JPEGs found with your query. Try again?');
      return this.progresiviseByQuery();
    }

    const imgLog = imagesToProgressivise
      .map((i) => `- ${i.relPath} ${colour.dim(`(${i.stats!.size}KB)`)}`)
      .join('\n');

    note(imgLog, `JPEG images`);

    const confirmed = await confirm({
      message: `Found ${imagesToProgressivise.length} JPEG images. Make them progressive now?`,
    });

    if (isCancel(confirmed) || !confirmed) {
      cancel('Exiting Savile');
      process.exit(0);
    }

    const loop = spinLoop('Making progressive JPEGs');

    await loop(imagesToProgressivise, async (image) => {
      image.makeProgressive();
      await image.overwriteImg();
    });

    return imagesToProgressivise;
  }

  /**
   * Convert JPEGs files in your directory to progressive images,
   */
  async progressivise() {
    const mode = await select({
      message: 'How do you want to select which JPEGs to make progressive',
      options: [
        {
          value: 'all',
          label: 'Make all my JPEGs progressive',
        },
        {
          value: 'query',
          label: 'Query for specific JPEGS',
        },
      ],
    });

    if (isCancel(mode)) {
      cancel('Exiting Savile');
      process.exit(0);
    }

    if (mode === 'all') return this.progresiviseAll();
    if (mode === 'query') return this.progresiviseByQuery();
  }

  /**
   * Resize, optimise or reformat images in your directory.
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
    this.logImageFileSize();

    const choice = await select({
      message: 'What would you like to do?',
      options: [
        {
          value: 'resize',
          label: 'Resize some images',
        },
        {
          value: 'optimise',
          label: 'Optimise some images',
        },
        {
          value: 'reformat',
          label: 'Reformat some images',
        },
        {
          value: 'progressive',
          label: 'Convert JPEGs to progressive images',
        },
      ],
    });

    if (isCancel(choice)) {
      cancel('Exiting Savile');
      process.exit(0);
    }

    if (choice === 'resize') return this.resize();
    if (choice === 'optimise') return this.optimise();
    if (choice === 'reformat') return this.reformat();
    if (choice === 'progressive') return this.progressivise();
  }
}
