import { afterEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { mount, flushPromises } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createRouter, createMemoryHistory } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import HomePage from "./index.vue";

function createTestRouter() {
    return createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: "/", component: HomePage },
            { path: "/login", component: { template: "<div>login</div>" } },
            { path: "/workspace", component: { template: "<div>workspace</div>" } },
            { path: "/workspace/pages/:pageId", component: { template: "<div>page</div>" } },
            {
                path: "/workspace/documents/:documentId",
                component: { template: "<div>document</div>" },
            },
            { path: "/workspace/forms/:formId", component: { template: "<div>form</div>" } },
        ],
    });
}

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

describe("HomePage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("shows a login call-to-action when unauthenticated", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        const router = createTestRouter();
        await router.push("/");
        await router.isReady();

        const wrapper = mount(HomePage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });

        expect(wrapper.text()).toContain("認証から縦切りで移行を進めます。");
        expect(wrapper.text()).toContain("ログイン画面へ");
    });

    it("allows the authenticated user to switch the current circle", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        const sessionStore = useSessionStore();
        sessionStore.hydrate({
            csrfToken: "csrf-token",
            currentCircle: null,
            featureFlags: [],
            roles: ["participant"],
            user: {
                id: "demo-user",
                displayName: "Demo User",
            },
        });

        const router = createTestRouter();
        await router.push("/");
        await router.isReady();

        const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            await Promise.resolve();
            const url =
                typeof input === "string"
                    ? input
                    : input instanceof URL
                      ? input.toString()
                      : input.url;
            const method = init?.method ?? "GET";

            if (url.endsWith("/circles") && method === "GET") {
                return new Response(
                    JSON.stringify([
                        {
                            id: "circle-a",
                            name: "デモ企画A",
                            groupName: "Aブロック",
                            participationTypeName: "模擬店",
                        },
                        {
                            id: "circle-b",
                            name: "デモ企画B",
                            groupName: "Bブロック",
                            participationTypeName: "展示",
                        },
                    ]),
                    {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    },
                );
            }

            if (url.endsWith("/circles/current") && method === "PUT") {
                return new Response(null, { status: 204 });
            }

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
                            id: "page-1",
                            title: "搬入時間のお知らせ",
                            publishedAt: "2026-03-05T10:00:00Z",
                        },
                    ]),
                    {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    },
                );
            }

            if (url.includes("/documents?page=1&pageSize=3") && method === "GET") {
                return new Response(
                    JSON.stringify({
                        items: [
                            {
                                id: "document-1",
                                name: "搬入手順書",
                                description: "Aブロック向けの搬入手順です。",
                                isImportant: true,
                                isNew: true,
                                extension: "TXT",
                                sizeBytes: 1024,
                                updatedAt: "2026-03-02T09:00:00Z",
                                downloadUrl: "/v1/documents/document-1",
                            },
                        ],
                        page: 1,
                        pageSize: 3,
                        total: 1,
                    }),
                    {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    },
                );
            }

            if (url.endsWith("/forms") && method === "GET") {
                return new Response(
                    JSON.stringify([
                        {
                            id: "form-1",
                            name: "搬入確認フォーム",
                            description: "搬入予定時刻と責任者情報を提出してください。",
                            openAt: "2026-03-01T00:00:00Z",
                            closeAt: "2026-03-20T23:59:59Z",
                            maxAnswers: 2,
                            isPublic: true,
                            isOpen: true,
                            hasAnswer: false,
                        },
                    ]),
                    {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    },
                );
            }

            throw new Error(`Unexpected request: ${method} ${url}`);
        });
        vi.stubGlobal("fetch", fetchMock);

        const wrapper = mount(HomePage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        expect(wrapper.text()).toContain("次に作業する企画を選択してください。");

        await wrapper.get('button[type="button"]:last-of-type').trigger("click");
        await flushPromises();

        expect(sessionStore.currentCircle?.name).toBe("デモ企画B");
        expect(wrapper.text()).toContain("Current circle: デモ企画B");
        expect(wrapper.text()).toContain("搬入時間のお知らせ");
        expect(wrapper.text()).toContain("搬入手順書");
        expect(wrapper.text()).toContain("TXTファイル");
        expect(wrapper.text()).toContain("NEW");
        expect(wrapper.text()).toContain("搬入確認フォーム");
        expect(wrapper.text()).toContain("1企画あたり 2 件まで");
    });
});
