import type { StorybookConfig } from '@storybook/vue3-vite'
import { mergeConfig } from 'vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: '@storybook/vue3-vite',
  viteFinal: async (viteConfig) =>
    mergeConfig(viteConfig, {
      build: {
        chunkSizeWarningLimit: 3000
      }
    })
}
export default config
