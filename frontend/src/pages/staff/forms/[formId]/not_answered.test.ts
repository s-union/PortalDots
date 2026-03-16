import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import { useSessionStore } from "@/features/session/store";
import StaffFormNotAnsweredPage from "./not_answered.vue";

describe("StaffFormNotAnsweredPage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("shows not answered circles and links to circle detail", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        const sessionStore = useSessionStore();
        sessionStore.hydrate({
            csrfToken: "csrf-token",
            currentCircle: { id: "circle-b", name: "デモ企画B" },
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
                { path: "/staff/forms/:formId/not_answered", component: StaffFormNotAnsweredPage },
                {
                    path: "/staff/forms/:formId/answers",
                    component: { template: "<div>answers</div>" },
                },
                { path: "/staff/circles/:circleId", component: { template: "<div>circle</div>" } },
            ],
        });
        await router.push("/staff/forms/form-circle-b-1/not_answered");
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
                            circles: [],
                            notAnsweredCircles: [
                                {
                                    id: "circle-a",
                                    name: "デモ企画A",
                                    groupName: "Aブロック",
                                    participationTypeName: "模擬店",
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

        const wrapper = mount(StaffFormNotAnsweredPage, {
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

        expect(wrapper.text()).toContain("未回答企画一覧");
        expect(wrapper.text()).toContain("展示チェックフォーム");

        const links = wrapper.findAll("a");
        expect(links[1]?.text()).toContain("企画ID: circle-a");

        await links[1]?.trigger("click");
        await flushPromises();

        expect(router.currentRoute.value.path).toBe("/staff/circles/circle-a");
    });
});
