import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

export default defineConfig({
  outDir: './dist',
  srcDir: './docs',
  site: 'https://savile.vercel.app/',
  trailingSlash: 'always',
  output: 'server',
  adapter: vercel(),
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  integrations: [
    react(),
    starlight({
      title: 'Savile',
      logo: {
        light: './docs/assets/logo-light.svg',
        dark: './docs/assets/logo-dark.svg',
        replacesTitle: true,
      },
      customCss: ['./docs/styles/custom.css'],
      favicon:
        'https://graphics.thomsonreuters.com/style-assets/images/logos/favicon/favicon.ico',
      social: {
        github: 'https://github.com/reuters-graphics/savile/',
      },
    }),
  ],
  vite: {
    ssr: {
      noExternal: ['nanoid'],
    },
  },
});
