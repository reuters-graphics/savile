import dedent from 'dedent';

export const getVirtualFs = async () => {
  return {
    'package.json': {
      file: {
        contents: JSON.stringify({
          type: 'module',
          dependencies: {
            '@reuters-graphics/savile': 'latest',
          },
        }),
      },
    },
    'index.js': {
      file: {
        contents: dedent`import { Savile, intro, outro } from '@reuters-graphics/savile';

        intro('Savile');

        const savile = new Savile('./src/images');
        await savile.findImages();
        await savile.row();

        outro('Well done. Suited and booted.');
        `,
      },
    },
  };
};
