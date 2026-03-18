import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createRouter, createMemoryHistory } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import FormsIndexPage from "./index.vue";

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

describe("FormsIndexPage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    function stubFetchWithForms() {
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
                const method = (
                    init?.method ?? (input instanceof Request ? input.method : "GET")
                ).toUpperCase();

                const pathname = new URL(url, "http://localhost").pathname;

                if (pathname.endsWith("/session/bootstrap") && method === "GET") {
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

                if (pathname.endsWith("/forms") && method === "GET") {
                    return new Response(
                        JSON.stringify([
                            {
                                id: "form-circle-b-1",
                                name: "展示チェックフォーム",
                                description: "展示レイアウトと機材使用申請を提出してください。",
                                openAt: "2026-03-02T00:00:00Z",
                                closeAt: "2026-03-22T23:59:59Z",
                                maxAnswers: 2,
                                isPublic: true,
                                isOpen: true,
                                hasAnswer: false,
                            },
                            {
                                id: "form-circle-b-2",
                                name: "備品返却報告",
                                description: "使用した備品の返却状況を報告してください。",
                                openAt: "2026-02-01T00:00:00Z",
                                closeAt: "2026-02-20T23:59:59Z",
                                maxAnswers: 1,
                                isPublic: false,
                                isOpen: false,
                                hasAnswer: true,
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
    }

    it("renders forms for the current circle", async () => {
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
                { path: "/workspace/forms", component: FormsIndexPage },
                { path: "/workspace/forms/:formId", component: { template: "<div>detail</div>" } },
            ],
        });
        await router.push("/workspace/forms");
        await router.isReady();

        stubFetchWithForms();

        const wrapper = mount(FormsIndexPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        expect(wrapper.text()).toContain("展示チェックフォーム");
        expect(wrapper.text()).toContain("デモ企画B");
        expect(wrapper.text()).toContain("1企画あたり 2 件まで");
        expect(wrapper.text()).not.toContain("備品返却報告");
    });

    it("shows closed forms when status=closed", async () => {
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
                { path: "/workspace/forms", component: FormsIndexPage },
                { path: "/workspace/forms/:formId", component: { template: "<div>detail</div>" } },
            ],
        });
        await router.push("/workspace/forms?status=closed");
        await router.isReady();
        stubFetchWithForms();

        const wrapper = mount(FormsIndexPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        expect(wrapper.text()).toContain("備品返却報告");
        expect(wrapper.text()).not.toContain("展示チェックフォーム");
    });

    it("updates query and visible forms when switching tabs", async () => {
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
                { path: "/workspace/forms", component: FormsIndexPage },
                { path: "/workspace/forms/:formId", component: { template: "<div>detail</div>" } },
            ],
        });
        await router.push("/workspace/forms");
        await router.isReady();
        stubFetchWithForms();

        const wrapper = mount(FormsIndexPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        await wrapper.get("button:nth-of-type(2)").trigger("click");
        await flushPromises();

        expect(router.currentRoute.value.query.status).toBe("closed");
        expect(wrapper.text()).toContain("備品返却報告");
        expect(wrapper.text()).not.toContain("展示チェックフォーム");

        await wrapper.get("button:nth-of-type(3)").trigger("click");
        await flushPromises();

        expect(router.currentRoute.value.query.status).toBe("all");
        expect(wrapper.text()).toContain("備品返却報告");
        expect(wrapper.text()).toContain("展示チェックフォーム");
    });
});
