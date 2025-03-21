import { node } from '@reuters-graphics/yaks-eslint';

/**
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  { files: ['src/**/*.{js,ts}'] },
  ...node,
  { ignores: ['docs/**/*', 'dist/**/*'] },
];
