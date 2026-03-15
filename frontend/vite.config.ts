import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import VueRouter from "vue-router/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
    plugins: [VueRouter(), vue(), tailwindcss()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    server: {
        port: 5174,
    },
});
