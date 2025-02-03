import { getConfig } from '@reuters-graphics/yaks-rollup';
import typescript from '@rollup/plugin-typescript';
import externals from 'rollup-plugin-node-externals';
import json from '@rollup/plugin-json';

const plugins = [json(), externals({ deps: true }), typescript()];

const output = {
  dir: 'dist',
  format: 'es',
  sourcemap: true,
  paths: { '@reuters-graphics/savile': './index.js' },
};

export default [
  getConfig({ input: 'src/index.ts', output, plugins }),
  getConfig({
    input: 'src/cli.ts',
    output: { ...output, banner: '#!/usr/bin/env node' },
    plugins,
    external: ['sade', '@reuters-graphics/savile'],
  }),
];
