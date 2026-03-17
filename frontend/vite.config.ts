import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import VueRouter from "vue-router/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");

    return {
        plugins: [VueRouter(), vue(), tailwindcss()],
        resolve: {
            alias: {
                "@": fileURLToPath(new URL("./src", import.meta.url)),
            },
        },
        server: {
            port: 5174,
            proxy: env.VITE_API_PROXY_TARGET
                ? {
                      "/v1": {
                          target: env.VITE_API_PROXY_TARGET,
                          changeOrigin: true,
                      },
                  }
                : undefined,
        },
    };
});
