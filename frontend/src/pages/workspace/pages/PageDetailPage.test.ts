import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createRouter, createMemoryHistory } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import PageDetailPage from "./PageDetailPage.vue";

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

describe("PageDetailPage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("renders the selected page detail", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        const sessionStore = useSessionStore();
        sessionStore.hydrate({
            csrfToken: "csrf-token",
            currentCircle: {
                id: "circle-a",
                name: "デモ企画A",
            },
            featureFlags: [],
            roles: ["participant"],
            user: {
                id: "demo-user",
                displayName: "Demo User",
            },
        });

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/workspace/pages", component: { template: "<div>pages</div>" } },
                { path: "/workspace/pages/:pageId", component: PageDetailPage },
                {
                    path: "/workspace/documents/:documentId",
                    component: { template: "<div>document</div>" },
                },
            ],
        });
        await router.push("/workspace/pages/page-circle-a-1");
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
                                id: "circle-a",
                                name: "デモ企画A",
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

                if (url.endsWith("/pages/page-circle-a-1") && method === "GET") {
                    return new Response(
                        JSON.stringify({
                            id: "page-circle-a-1",
                            title: "搬入時間のお知らせ",
                            body: "Aブロックの搬入は 9:00 から開始します。",
                            publishedAt: "2026-03-01T09:00:00Z",
                            documents: [
                                {
                                    id: "document-circle-a-1",
                                    name: "搬入手順書",
                                    description: "Aブロック向けの搬入手順です。",
                                    isImportant: true,
                                    extension: "TXT",
                                    sizeBytes: 1024,
                                    updatedAt: "2026-03-02T09:00:00Z",
                                    downloadUrl: "/v1/documents/document-circle-a-1",
                                },
                            ],
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(PageDetailPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        expect(wrapper.text()).toContain("搬入時間のお知らせ");
        expect(wrapper.text()).toContain("Aブロックの搬入は 9:00 から開始します。");
        expect(wrapper.text()).toContain("搬入手順書");
    });
});
