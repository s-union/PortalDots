import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import VueRouter from 'vue-router/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = String(env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:8080').trim()

  return {
    plugins: [VueRouter(), vue(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
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
