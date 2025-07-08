import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import path from 'path';

const config: StorybookConfig = {
  stories: ['../client/src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-vitest',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      server: {
        host: '0.0.0.0',
        cors: true,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        hmr: {
          clientPort: 443,
        }
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '../client/src'),
          '@shared': path.resolve(__dirname, '../shared'),
          '@assets': path.resolve(__dirname, '../attached_assets'),
        },
      },
      css: {
        postcss: {
          plugins: [
            require('tailwindcss'),
            require('autoprefixer'),
          ],
        },
      },
    });
  },
};

export default config;