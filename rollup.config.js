import { getConfig } from '@reuters-graphics/yaks-rollup';

const output = {
  dir: 'dist',
  format: 'es',
  sourcemap: true,
};

export default [
  getConfig({ input: 'src/index.ts', output }),
  getConfig({
    input: 'src/cli.ts',
    output: { ...output, banner: '#!/usr/bin/env node' },
    external: ['sade', '@reuters-graphics/savile'],
  }),
];
