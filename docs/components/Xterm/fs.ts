import dedent from 'dedent';

export const getVirtualFs = async () => {
  return {
    'package.json': {
      file: {
        contents: JSON.stringify({
          type: 'module',
          dependencies: {
            "@reuters-graphics/savile": "latest",
            "@clack/prompts": "latest",
            "picocolors": "latest"
          }
        }),
      },
    },
    'index.js': {
      file: {
        contents: dedent`import { Savile } from '@reuters-graphics/savile';
        import { intro, outro } from '@clack/prompts';
        import color from 'picocolors';

        // Temporary...
        process.stdout.write(color.gray('┌') + '  ' + color.bgCyan(' Savile '));
        console.log('');

        const savile = new Savile('./src/images');
        await savile.findImages();
        await savile.row();

        // Temporary...
        outro('Well done. Suited and booted.');
        `,
      },
    },
  };
}