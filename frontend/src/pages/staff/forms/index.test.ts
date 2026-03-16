import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import StaffFormsIndexPage from "./index.vue";

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

describe("StaffFormsIndexPage", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("lists and creates staff forms for the current circle", async () => {
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

        let created = false;
        let createdRequestBody: Record<string, unknown> | null = null;
        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/staff", component: { template: "<div>staff</div>" } },
                { path: "/staff/forms", component: StaffFormsIndexPage },
                { path: "/staff/forms/:formId", component: { template: "<div>detail</div>" } },
            ],
        });
        await router.push("/staff/forms");
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

                if (url.endsWith("/staff/forms") && method === "GET") {
                    return new Response(
                        JSON.stringify(
                            created
                                ? [
                                      {
                                          id: "form-generated-1",
                                          name: "追加ヒアリング",
                                          openAt: "2026-03-15T09:00:00Z",
                                          closeAt: "2026-03-30T18:00:00Z",
                                          maxAnswers: 3,
                                          isPublic: true,
                                          isOpen: true,
                                      },
                                      {
                                          id: "form-circle-b-1",
                                          name: "展示チェックフォーム",
                                          openAt: "2026-03-02T00:00:00Z",
                                          closeAt: "2026-03-22T23:59:59Z",
                                          maxAnswers: 2,
                                          isPublic: true,
                                          isOpen: true,
                                      },
                                  ]
                                : [
                                      {
                                          id: "form-circle-b-1",
                                          name: "展示チェックフォーム",
                                          openAt: "2026-03-02T00:00:00Z",
                                          closeAt: "2026-03-22T23:59:59Z",
                                          maxAnswers: 2,
                                          isPublic: true,
                                          isOpen: true,
                                      },
                                      {
                                          id: "form-circle-b-closed",
                                          name: "締切済みフォーム",
                                          openAt: "2026-02-01T00:00:00Z",
                                          closeAt: "2026-02-10T23:59:59Z",
                                          maxAnswers: 1,
                                          isPublic: true,
                                          isOpen: false,
                                      },
                                  ],
                        ),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                if (url.endsWith("/staff/forms") && method === "POST") {
                    created = true;
                    const request = await parseRequestBody(input, init?.body);
                    createdRequestBody = request;
                    return new Response(
                        JSON.stringify({
                            id: "form-generated-1",
                            name: "追加ヒアリング",
                            openAt: "2026-03-15T09:00:00Z",
                            closeAt: "2026-03-30T18:00:00Z",
                            maxAnswers: 3,
                            isPublic: true,
                            isOpen: true,
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

        const wrapper = mount(StaffFormsIndexPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        expect(wrapper.text()).toContain("展示チェックフォーム");
        expect(wrapper.text()).toContain("締切済みフォーム");

        await wrapper.get('input[name="name"]').setValue("追加ヒアリング");
        await wrapper
            .get('textarea[name="description"]')
            .setValue("当日の搬入担当者を確認します。");
        await wrapper.get('input[name="maxAnswers"]').setValue("3");
        await wrapper.get('textarea[name="answerableTags"]').setValue("展示\n必須");
        await wrapper
            .get('textarea[name="confirmationMessage"]')
            .setValue("回答ありがとうございました。");
        await wrapper.get('button[type="submit"]').trigger("submit");
        await flushPromises();

        expect(wrapper.text()).toContain("追加ヒアリング");
        expect(createdRequestBody).toMatchObject({
            maxAnswers: 3,
            answerableTags: ["展示", "必須"],
            confirmationMessage: "回答ありがとうございました。",
        });
    });

    it("confirms before copying and deleting a staff form", async () => {
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

        const deleteRequests: string[] = [];
        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/staff", component: { template: "<div>staff</div>" } },
                { path: "/staff/forms", component: StaffFormsIndexPage },
                { path: "/staff/forms/:formId", component: { template: "<div>detail</div>" } },
            ],
        });
        await router.push("/staff/forms");
        await router.isReady();

        const confirmMock = vi
            .fn<(message?: string) => boolean>()
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true)
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true);
        vi.spyOn(window, "confirm").mockImplementation(confirmMock);

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

                if (url.endsWith("/staff/forms") && method === "GET") {
                    return new Response(
                        JSON.stringify([
                            {
                                id: "form-circle-b-1",
                                name: "展示チェックフォーム",
                                openAt: "2026-03-02T00:00:00Z",
                                closeAt: "2026-03-22T23:59:59Z",
                                maxAnswers: 2,
                                isPublic: true,
                                isOpen: true,
                            },
                        ]),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                if (url.endsWith("/staff/forms/form-circle-b-1/copy") && method === "POST") {
                    return new Response(
                        JSON.stringify({
                            id: "form-circle-b-copy",
                            name: "展示チェックフォームのコピー",
                            openAt: "2026-03-02T00:00:00Z",
                            closeAt: "2026-03-22T23:59:59Z",
                            maxAnswers: 2,
                            isPublic: false,
                            isOpen: false,
                        }),
                        {
                            status: 201,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                if (url.endsWith("/staff/forms/form-circle-b-1") && method === "DELETE") {
                    deleteRequests.push(url);
                    return new Response(null, { status: 204 });
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(StaffFormsIndexPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        const buttons = wrapper.findAll('button[type="button"]');
        await buttons[0].trigger("click");
        await flushPromises();
        expect(confirmMock).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining("フォーム「展示チェックフォーム」を複製しますか？"),
        );
        expect(confirmMock).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining("フォームが作成されます"),
        );
        expect(router.currentRoute.value.fullPath).toBe("/staff/forms");

        await buttons[0].trigger("click");
        await flushPromises();
        expect(confirmMock).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining("非公開です。後から必要に応じて設定を変更してください"),
        );
        expect(router.currentRoute.value.fullPath).toBe("/staff/forms/form-circle-b-copy");

        await router.push("/staff/forms");
        await flushPromises();

        const refreshedButtons = wrapper.findAll('button[type="button"]');
        await refreshedButtons[1].trigger("click");
        await flushPromises();
        expect(confirmMock).toHaveBeenNthCalledWith(
            3,
            expect.stringContaining("フォーム「展示チェックフォーム」を削除しますか？"),
        );
        expect(deleteRequests).toHaveLength(0);

        await refreshedButtons[1].trigger("click");
        await flushPromises();
        expect(confirmMock).toHaveBeenNthCalledWith(
            4,
            expect.stringContaining("設問、回答は全て削除されます"),
        );
        expect(deleteRequests).toHaveLength(1);
    });
});

async function parseRequestBody(
    input: RequestInfo | URL,
    body:
        | null
        | string
        | ArrayBuffer
        | Blob
        | FormData
        | URLSearchParams
        | ReadableStream<Uint8Array<ArrayBufferLike>>
        | undefined,
) {
    if (typeof body !== "string") {
        if (typeof Request !== "undefined" && input instanceof Request) {
            body = await input.clone().text();
        }
    }

    if (typeof body !== "string") {
        throw new Error("Request body was not a string");
    }

    const parsed: unknown = JSON.parse(body);
    if (!isRecord(parsed)) {
        throw new Error("Request body was not an object");
    }

    return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
