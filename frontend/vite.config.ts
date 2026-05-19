import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import VueRouter from 'vue-router/vite'
import { fileURLToPath, URL } from 'node:url'

function vendorChunk(id: string): string | undefined {
  const isMarkdownDependency =
    id.includes('/node_modules/remark-') ||
    id.includes('/node_modules/rehype-') ||
    id.includes('/node_modules/unified/') ||
    id.includes('/node_modules/mdast-') ||
    id.includes('/node_modules/hast-') ||
    id.includes('/node_modules/micromark') ||
    id.includes('/node_modules/trim-lines/') ||
    id.includes('/node_modules/unist-') ||
    id.includes('/node_modules/vfile')

  const isVueDependency =
    id.includes('/node_modules/vue/') ||
    id.includes('/node_modules/vue-router/') ||
    id.includes('/node_modules/pinia/') ||
    id.includes('/node_modules/@vue/')

  return !id.includes('/node_modules/')
    ? undefined
    : id.includes('/node_modules/@fortawesome/')
      ? 'vendor-fontawesome'
      : isMarkdownDependency
        ? 'vendor-markdown'
        : isVueDependency
          ? 'vendor-vue'
          : id.includes('/node_modules/@tanstack/')
            ? 'vendor-query'
            : id.includes('/node_modules/zod/')
              ? 'vendor-validation'
              : undefined
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, `${process.cwd()}/..`, '')
  const apiProxyTarget = (env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:8080').trim()

  return {
    envDir: '../',
    plugins: [VueRouter(), vue(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: vendorChunk
        }
      }
    },
    server: {
      port: 5173,
      allowedHosts: true,
      proxy: apiProxyTarget
        ? {
            '/v1': {
              target: apiProxyTarget,
              changeOrigin: true
            }
          }
        : undefined
    }
  }
})
