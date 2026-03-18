import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import StaffFormAnswerCreatePage from "./create.vue";

describe("StaffFormAnswerCreatePage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("creates a new answer for the selected circle", async () => {
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
                {
                    path: "/staff/forms/:formId/answers",
                    component: { template: "<div>index</div>" },
                },
                {
                    path: "/staff/forms/:formId/answers/create",
                    component: StaffFormAnswerCreatePage,
                },
                {
                    path: "/staff/forms/:formId/answers/:answerId/edit",
                    component: { template: "<div>edit</div>" },
                },
            ],
        });
        await router.push("/staff/forms/form-circle-b-1/answers/create?circle=circle-a");
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
                const method = (
                    init?.method ?? (input instanceof Request ? input.method : "GET")
                ).toUpperCase();

                const pathname = new URL(url, "http://localhost").pathname;

                if (pathname.endsWith("/staff/status")) {
                    return new Response(JSON.stringify({ allowed: true, authorized: true }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                if (pathname.endsWith("/staff/forms/form-circle-b-1/answers") && method === "GET") {
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
                            answers: [
                                {
                                    id: "answer-old",
                                    circle: {
                                        id: "circle-a",
                                        name: "デモ企画A",
                                        groupName: "Aブロック",
                                        participationTypeName: "模擬店",
                                    },
                                    body: "前回回答",
                                    createdAt: "2026-03-13T10:00:00Z",
                                    updatedAt: "2026-03-13T12:00:00Z",
                                    uploadCount: 1,
                                },
                            ],
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

                if (
                    pathname.endsWith("/staff/forms/form-circle-b-1/answers") &&
                    method === "POST"
                ) {
                    return new Response(
                        JSON.stringify({
                            answer: {
                                id: "answer-created",
                                circle: {
                                    id: "circle-a",
                                    name: "デモ企画A",
                                    groupName: "Aブロック",
                                    participationTypeName: "模擬店",
                                },
                                body: "",
                                createdAt: "2026-03-14T02:00:00Z",
                                updatedAt: "2026-03-14T02:00:00Z",
                                uploadCount: 0,
                            },
                        }),
                        {
                            status: 201,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(StaffFormAnswerCreatePage, {
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
        expect(wrapper.text()).toContain("前回回答");
        await wrapper.get("button").trigger("click");
        await flushPromises();

        expect(router.currentRoute.value.fullPath).toBe(
            "/staff/forms/form-circle-b-1/answers/answer-created/edit",
        );
    });
});
