import { describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import App from "./App.vue";

function createQueryPlugin() {
    return [
        VueQueryPlugin,
        {
            queryClient: new QueryClient({
                defaultOptions: {
                    queries: { retry: false },
                },
            }),
        },
    ];
}

describe("App", () => {
    it("shows support and privacy links in the drawer footer", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/", component: { template: "<div>home</div>" } },
                { path: "/login", component: { template: "<div>login</div>" } },
                { path: "/support", component: { template: "<div>support</div>" } },
                { path: "/privacy_policy", component: { template: "<div>privacy</div>" } },
            ],
        });
        await router.push("/");
        await router.isReady();

        const originalMatchMedia = window.matchMedia;
        Object.defineProperty(window, "matchMedia", {
            configurable: true,
            writable: true,
            value: () => ({
                matches: false,
                media: "(max-width: 1000px)",
                onchange: null,
                addEventListener() {},
                removeEventListener() {},
                addListener() {},
                removeListener() {},
                dispatchEvent() {
                    return true;
                },
            }),
        });

        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url =
                typeof input === "string"
                    ? input
                    : input instanceof URL
                      ? input.toString()
                      : input.url;
            const method = init?.method ?? "GET";

            if (url.endsWith("/session/bootstrap") && method === "GET") {
                return new Response(
                    JSON.stringify({
                        csrfToken: "csrf-token",
                        currentCircle: null,
                        featureFlags: [],
                        roles: [],
                        user: null,
                    }),
                    {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    },
                );
            }

            throw new Error(`Unexpected request: ${method} ${url}`);
        }) as typeof fetch;

        try {
            const wrapper = mount(App, {
                global: {
                    plugins: [pinia, router, createQueryPlugin()],
                },
            });
            await flushPromises();

            expect(wrapper.get('a[href="https://www.portaldots.com"]').text()).toContain(
                "PortalDots",
            );
            expect(wrapper.get('a[href="/support"]').text()).toContain("推奨動作環境");
            expect(wrapper.get('a[href="/privacy_policy"]').text()).toContain(
                "プライバシーポリシー",
            );
        } finally {
            Object.defineProperty(window, "matchMedia", {
                configurable: true,
                writable: true,
                value: originalMatchMedia,
            });
            globalThis.fetch = originalFetch;
        }
    });

    it("shows public footer links in main content on small screens", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/", component: { template: "<div>home</div>" } },
                { path: "/login", component: { template: "<div>login</div>" } },
                { path: "/support", component: { template: "<div>support</div>" } },
                { path: "/privacy_policy", component: { template: "<div>privacy</div>" } },
            ],
        });
        await router.push("/");
        await router.isReady();

        const originalMatchMedia = window.matchMedia;
        const originalInnerWidth = window.innerWidth;
        Object.defineProperty(window, "innerWidth", {
            configurable: true,
            value: 900,
        });
        Object.defineProperty(window, "matchMedia", {
            configurable: true,
            writable: true,
            value: () => ({
                matches: true,
                media: "(max-width: 1000px)",
                onchange: null,
                addEventListener() {},
                removeEventListener() {},
                addListener() {},
                removeListener() {},
                dispatchEvent() {
                    return true;
                },
            }),
        });

        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url =
                typeof input === "string"
                    ? input
                    : input instanceof URL
                      ? input.toString()
                      : input.url;
            const method = init?.method ?? "GET";

            if (url.endsWith("/session/bootstrap") && method === "GET") {
                return new Response(
                    JSON.stringify({
                        csrfToken: "csrf-token",
                        currentCircle: null,
                        featureFlags: [],
                        roles: [],
                        user: null,
                    }),
                    {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    },
                );
            }

            throw new Error(`Unexpected request: ${method} ${url}`);
        }) as typeof fetch;

        try {
            const wrapper = mount(App, {
                global: {
                    plugins: [pinia, router, createQueryPlugin()],
                },
            });
            await flushPromises();

            expect(wrapper.get('main a[href="/support"]').text()).toContain("推奨動作環境");
            expect(wrapper.get('main a[href="/privacy_policy"]').text()).toContain(
                "プライバシーポリシー",
            );
        } finally {
            Object.defineProperty(window, "innerWidth", {
                configurable: true,
                value: originalInnerWidth,
            });
            Object.defineProperty(window, "matchMedia", {
                configurable: true,
                writable: true,
                value: originalMatchMedia,
            });
            globalThis.fetch = originalFetch;
        }
    });
});
