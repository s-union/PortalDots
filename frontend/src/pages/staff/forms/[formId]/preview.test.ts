import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import { useSessionStore } from "@/features/session/store";
import StaffFormPreviewPage from "./preview.vue";

describe("StaffFormPreviewPage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("renders the staff form preview with representative question types", async () => {
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
                { path: "/staff/forms/:formId", component: { template: "<div>form</div>" } },
                { path: "/staff/forms/:formId/preview", component: StaffFormPreviewPage },
            ],
        });
        await router.push("/staff/forms/form-circle-b-1/preview");
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

                if (pathname.endsWith("/staff/status") && method === "GET") {
                    return new Response(JSON.stringify({ allowed: true, authorized: true }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                if (pathname.endsWith("/staff/forms/form-circle-b-1/preview") && method === "GET") {
                    return new Response(
                        JSON.stringify({
                            id: "form-circle-b-1",
                            name: "展示チェックフォーム",
                            description: "展示レイアウトと機材使用申請を提出してください。",
                            openAt: "2026-03-02T00:00:00Z",
                            closeAt: "2026-03-22T23:59:59Z",
                            maxAnswers: 2,
                            isPublic: true,
                            isOpen: true,
                            isParticipationForm: false,
                            questions: [
                                {
                                    id: "heading-1",
                                    name: "基本情報",
                                    description: "最初に確認事項を読んでください。",
                                    type: "heading",
                                    isRequired: false,
                                    numberMin: null,
                                    numberMax: null,
                                    allowedTypes: "",
                                    options: [],
                                    priority: 1,
                                    createdAt: "2026-03-01T00:00:00Z",
                                    updatedAt: "2026-03-01T00:00:00Z",
                                },
                                {
                                    id: "question-1",
                                    name: "責任者名",
                                    description: "当日の責任者を入力してください",
                                    type: "text",
                                    isRequired: true,
                                    numberMin: null,
                                    numberMax: null,
                                    allowedTypes: "",
                                    options: [],
                                    priority: 2,
                                    createdAt: "2026-03-01T00:00:00Z",
                                    updatedAt: "2026-03-01T00:00:00Z",
                                },
                                {
                                    id: "question-2",
                                    name: "参加日",
                                    description: "参加日を選んでください",
                                    type: "radio",
                                    isRequired: true,
                                    numberMin: null,
                                    numberMax: null,
                                    allowedTypes: "",
                                    options: ["1日目", "2日目"],
                                    priority: 3,
                                    createdAt: "2026-03-01T00:00:00Z",
                                    updatedAt: "2026-03-01T00:00:00Z",
                                },
                                {
                                    id: "question-3",
                                    name: "配置図",
                                    description: "PDF を提出してください",
                                    type: "upload",
                                    isRequired: false,
                                    numberMin: null,
                                    numberMax: null,
                                    allowedTypes: "application/pdf",
                                    options: [],
                                    priority: 4,
                                    createdAt: "2026-03-01T00:00:00Z",
                                    updatedAt: "2026-03-01T00:00:00Z",
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

        const wrapper = mount(StaffFormPreviewPage, {
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

        expect(wrapper.text()).toContain("展示チェックフォーム");
        expect(wrapper.text()).toContain("基本情報");
        expect(wrapper.text()).toContain("責任者名");
        expect(wrapper.text()).toContain("1日目");
        expect(wrapper.text()).toContain("ファイル選択欄が表示されます。");
    });
});
