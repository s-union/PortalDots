import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import StaffFormAnswersIndexPage from "./StaffFormAnswersIndexPage.vue";

describe("StaffFormAnswersIndexPage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("lists answers and links to the Laravel-like create/upload flows", async () => {
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
            roles: ["admin"],
            user: {
                id: "staff-user",
                displayName: "Staff User",
            },
        });

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/staff/forms/:formId/answers", component: StaffFormAnswersIndexPage },
                {
                    path: "/staff/forms/:formId/answers/create",
                    component: { template: "<div>create</div>" },
                },
                {
                    path: "/staff/forms/:formId/answers/uploads",
                    component: { template: "<div>uploads</div>" },
                },
                {
                    path: "/staff/forms/:formId/answers/:answerId/edit",
                    component: { template: "<div>edit</div>" },
                },
                { path: "/staff/forms/:formId", component: { template: "<div>form</div>" } },
            ],
        });
        await router.push("/staff/forms/form-circle-b-1/answers");
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

                if (url.endsWith("/staff/status")) {
                    return new Response(JSON.stringify({ allowed: true, authorized: true }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                if (url.endsWith("/staff/forms/form-circle-b-1/answers") && method === "GET") {
                    return new Response(
                        JSON.stringify({
                            form: {
                                id: "form-circle-b-1",
                                name: "展示チェックフォーム",
                                openAt: "2026-03-02T00:00:00Z",
                                closeAt: "2026-03-22T23:59:59Z",
                                maxAnswers: 2,
                                isPublic: true,
                                isOpen: true,
                            },
                            answers: [],
                            circles: [
                                {
                                    id: "circle-a",
                                    name: "デモ企画A",
                                    groupName: "Aブロック",
                                    participationTypeName: "模擬店",
                                },
                            ],
                            notAnsweredCircles: [],
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

        const wrapper = mount(StaffFormAnswersIndexPage, {
            global: {
                plugins: [
                    pinia,
                    router,
                    [
                        VueQueryPlugin,
                        {
                            queryClient: new QueryClient({
                                defaultOptions: { queries: { retry: false } },
                            }),
                        },
                    ],
                ],
            },
        });

        await flushPromises();
        const links = wrapper.findAll("a").map((link) => link.text());
        expect(links).toContain("新規回答");
        expect(links).toContain("添付管理");
        expect(wrapper.text()).toContain("未回答の企画はありません。");
    });
});
