import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import { useSessionStore } from "@/features/session/store";
import StaffFormUploadsPage from "./uploads.vue";

describe("StaffFormUploadsPage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("shows upload summary and zip download link", async () => {
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
                {
                    path: "/staff/forms/:formId/answers",
                    component: { template: "<div>answers</div>" },
                },
                { path: "/staff/forms/:formId/answers/uploads", component: StaffFormUploadsPage },
            ],
        });
        await router.push("/staff/forms/form-circle-b-1/answers/uploads");
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

                if (url.endsWith("/staff/status") && method === "GET") {
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
                            answers: [
                                {
                                    id: "answer-1",
                                    circle: {
                                        id: "circle-a",
                                        name: "デモ企画A",
                                        groupName: "Aブロック",
                                        participationTypeName: "模擬店",
                                    },
                                    body: "前回回答",
                                    createdAt: "2026-03-13T10:00:00Z",
                                    updatedAt: "2026-03-13T12:00:00Z",
                                    uploadCount: 2,
                                },
                                {
                                    id: "answer-2",
                                    circle: {
                                        id: "circle-b",
                                        name: "デモ企画B",
                                        groupName: "Bブロック",
                                        participationTypeName: "展示",
                                    },
                                    body: "追加回答",
                                    createdAt: "2026-03-14T10:00:00Z",
                                    updatedAt: "2026-03-14T12:00:00Z",
                                    uploadCount: 1,
                                },
                            ],
                            circles: [],
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

        const wrapper = mount(StaffFormUploadsPage, {
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

        expect(wrapper.text()).toContain("アップロードファイルの一括ダウンロード");
        expect(wrapper.text()).toContain("展示チェックフォーム");
        expect(wrapper.text()).toContain("アップロード件数:");
        expect(wrapper.text()).toContain("3 件");
        expect(
            wrapper
                .get(
                    'a[href="http://127.0.0.1:8081/v1/staff/forms/form-circle-b-1/answers/uploads.zip"]',
                )
                .text(),
        ).toContain("ダウンロードする (ZIP)");
    });
});
