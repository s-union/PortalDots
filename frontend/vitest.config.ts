import { configDefaults, defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import VueRouter from "vue-router/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
    plugins: [VueRouter(), vue()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    test: {
        environment: "jsdom",
        globals: true,
        exclude: [...configDefaults.exclude, "tests/e2e/**"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.{ts,vue}"],
            exclude: [
                "src/test/**",
                "src/**/*.test.ts",
                "src/lib/api/schema.ts",
                "src/app/router/**",
            ],
        },
    },
});
