import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createRouter, createMemoryHistory } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import PagesIndexPage from "./index.vue";

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

function createPagesRouter() {
    return createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: "/workspace", component: { template: "<div>workspace</div>" } },
            { path: "/workspace/pages", component: PagesIndexPage },
            { path: "/workspace/pages/:pageId", component: { template: "<div>detail</div>" } },
        ],
    });
}

describe("PagesIndexPage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("renders pages for the current circle", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        const sessionStore = useSessionStore();
        sessionStore.hydrate({
            csrfToken: "csrf-token",
            currentCircle: {
                id: "circle-b",
                name: "デモ企画B",
            },
            featureFlags: [],
            roles: ["participant"],
            user: {
                id: "demo-user",
                displayName: "Demo User",
            },
        });

        const router = createPagesRouter();
        await router.push("/workspace/pages");
        await router.isReady();

        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
                await Promise.resolve();
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
                            currentCircle: {
                                id: "circle-b",
                                name: "デモ企画B",
                            },
                            featureFlags: [],
                            roles: ["participant"],
                            user: {
                                id: "demo-user",
                                displayName: "Demo User",
                            },
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                if (url.endsWith("/pages") && method === "GET") {
                    return new Response(
                        JSON.stringify([
                            {
                                id: "page-circle-b-1",
                                title: "展示レイアウト更新",
                                publishedAt: "2026-03-03T09:00:00Z",
                            },
                        ]),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(PagesIndexPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        expect(wrapper.text()).toContain("展示レイアウト更新");
        expect(wrapper.text()).toContain("デモ企画B");
    });

    it("searches pages with the query string", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        const sessionStore = useSessionStore();
        sessionStore.hydrate({
            csrfToken: "csrf-token",
            currentCircle: {
                id: "circle-b",
                name: "デモ企画B",
            },
            featureFlags: [],
            roles: ["participant"],
            user: {
                id: "demo-user",
                displayName: "Demo User",
            },
        });

        const router = createPagesRouter();
        await router.push("/workspace/pages");
        await router.isReady();

        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
                await Promise.resolve();
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
                            currentCircle: {
                                id: "circle-b",
                                name: "デモ企画B",
                            },
                            featureFlags: [],
                            roles: ["participant"],
                            user: {
                                id: "demo-user",
                                displayName: "Demo User",
                            },
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                if (
                    url.includes("/pages?query=%E3%83%AC%E3%82%A4%E3%82%A2%E3%82%A6%E3%83%88") &&
                    method === "GET"
                ) {
                    return new Response(
                        JSON.stringify([
                            {
                                id: "page-circle-b-1",
                                title: "展示レイアウト更新",
                                publishedAt: "2026-03-03T09:00:00Z",
                            },
                        ]),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                if (url.endsWith("/pages") && method === "GET") {
                    return new Response(JSON.stringify([]), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(PagesIndexPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        await wrapper.get('input[name="query"]').setValue("レイアウト");
        await wrapper.get("form").trigger("submit.prevent");
        await flushPromises();

        expect(router.currentRoute.value.query.query).toBe("レイアウト");
        expect(wrapper.text()).toContain("展示レイアウト更新");
    });
});
