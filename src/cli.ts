import sade from 'sade';
import { intro, outro, log } from '@clack/prompts';
import { name, version } from '../package.json';
import updateNotifier from 'update-notifier';
import { Savile } from '.';

updateNotifier({ pkg: { name, version } }).notify();

const prog = sade('savile');

prog.version(version);

prog
  .command('row <imagesDir>')
  .describe('Resize, reformat or optimise images in a directoy.')
  .example('row ./src/statics/images')
  .action(async (imagesDir: string) => {
    intro(`savile`);
    log.info('Tailors your images for the perfect web fit.');
    const savile = new Savile(imagesDir);
    await savile.findImages();
    await savile.row();
    outro('Well done. Suited and booted.');
  });

prog
  .command('resize <imagesDir>')
  .describe('Resize images in a directoy.')
  .example('resize ./src/statics/images')
  .action(async (imagesDir: string) => {
    intro(`savile`);
    log.info('Tailors your images for the perfect web fit.');
    const savile = new Savile(imagesDir);
    await savile.findImages();
    await savile.resize();
    outro('Well done. Suited and booted.');
  });

prog
  .command('optimise <imagesDir>')
  .describe('Optimise images in a directoy.')
  .example('optimise ./src/statics/images')
  .action(async (imagesDir: string) => {
    intro(`savile`);
    log.info('Tailors your images for the perfect web fit.');
    const savile = new Savile(imagesDir);
    await savile.findImages();
    await savile.optimise();
    outro('Well done. Suited and booted.');
  });

prog
  .command('reformat <imagesDir>')
  .describe('Reformat images in a directoy.')
  .example('reformat ./src/statics/images')
  .action(async (imagesDir: string) => {
    intro(`savile`);
    log.info('Tailors your images for the perfect web fit.');
    const savile = new Savile(imagesDir);
    await savile.findImages();
    await savile.reformat();
    outro('Well done. Suited and booted.');
  });

prog.parse(process.argv);
