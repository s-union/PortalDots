import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createRouter, createMemoryHistory } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import DocumentsIndexPage from "./DocumentsIndexPage.vue";

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

describe("DocumentsIndexPage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("renders documents for the current circle", async () => {
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

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/workspace", component: { template: "<div>workspace</div>" } },
                { path: "/workspace/documents", component: DocumentsIndexPage },
                {
                    path: "/workspace/documents/:documentId",
                    component: { template: "<div>detail</div>" },
                },
            ],
        });
        await router.push("/workspace/documents");
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

                if (url.includes("/documents?page=1&pageSize=10") && method === "GET") {
                    return new Response(
                        JSON.stringify({
                            items: [
                                {
                                    id: "document-circle-b-1",
                                    name: "展示ガイド",
                                    description: "Bブロック向けの展示ガイドです。",
                                    isImportant: true,
                                    isNew: true,
                                    extension: "PDF",
                                    sizeBytes: 2048,
                                    updatedAt: "2026-03-05T09:00:00Z",
                                    downloadUrl: "/v1/documents/document-circle-b-1",
                                },
                            ],
                            page: 1,
                            pageSize: 10,
                            total: 1,
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

        const wrapper = mount(DocumentsIndexPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        expect(wrapper.text()).toContain("展示ガイド");
        expect(wrapper.text()).toContain("デモ企画B");
        expect(wrapper.text()).toContain("PDFファイル");
        expect(wrapper.text()).toContain("NEW");
    });
});
