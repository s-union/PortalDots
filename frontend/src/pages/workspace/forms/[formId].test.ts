import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import { useSessionStore } from "@/features/session/store";
import FormDetailPage from "./[formId].vue";

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

describe("FormDetailPage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("renders Laravel-like question fields and saves an answer", async () => {
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
                { path: "/workspace/forms", component: { template: "<div>forms</div>" } },
                { path: "/workspace/forms/:formId", component: FormDetailPage },
            ],
        });
        await router.push("/workspace/forms/form-circle-a-1");
        await router.isReady();

        let savedDetails: Record<string, string | string[]> = {};
        let savedUploads = [
            {
                id: "upload-1",
                questionId: "question-upload",
                filename: "layout.pdf",
                mimeType: "application/pdf",
                sizeBytes: 128,
                createdAt: "2026-03-05T10:10:00Z",
            },
        ];

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
                    return jsonResponse({
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
                }

                if (url.endsWith("/forms/form-circle-a-1") && method === "GET") {
                    return jsonResponse({
                        id: "form-circle-a-1",
                        name: "搬入確認フォーム",
                        description: "搬入予定時刻と責任者情報を提出してください。",
                        openAt: "2026-03-01T00:00:00Z",
                        closeAt: "2026-03-20T23:59:59Z",
                        maxAnswers: 2,
                        isPublic: true,
                        isOpen: true,
                        questions: [
                            {
                                id: "question-text",
                                name: "搬入責任者",
                                description: "当日の責任者氏名",
                                type: "text",
                                isRequired: true,
                                numberMin: null,
                                numberMax: null,
                                allowedTypes: "",
                                options: [],
                                priority: 1,
                                createdAt: "2026-03-01T00:00:00Z",
                                updatedAt: "2026-03-01T00:00:00Z",
                            },
                            {
                                id: "question-checkbox",
                                name: "必要設備",
                                description: "必要なものを選択",
                                type: "checkbox",
                                isRequired: false,
                                numberMin: null,
                                numberMax: null,
                                allowedTypes: "",
                                options: ["机", "椅子"],
                                priority: 2,
                                createdAt: "2026-03-01T00:00:00Z",
                                updatedAt: "2026-03-01T00:00:00Z",
                            },
                            {
                                id: "question-upload",
                                name: "レイアウト図",
                                description: "PDF を提出してください",
                                type: "upload",
                                isRequired: false,
                                numberMin: null,
                                numberMax: null,
                                allowedTypes: "pdf",
                                options: [],
                                priority: 3,
                                createdAt: "2026-03-01T00:00:00Z",
                                updatedAt: "2026-03-01T00:00:00Z",
                            },
                        ],
                    });
                }

                if (url.endsWith("/forms/form-circle-a-1/answers") && method === "GET") {
                    const hasAnswer =
                        Object.keys(savedDetails).length > 0 || savedUploads.length > 0;
                    return jsonResponse({
                        answers: hasAnswer
                            ? [
                                  {
                                      id: "answer-1",
                                      body: "搬入責任者: 山田\n必要設備: 机",
                                      updatedAt: "2026-03-05T10:00:00Z",
                                      details: {
                                          "question-text":
                                              typeof savedDetails["question-text"] === "string"
                                                  ? [savedDetails["question-text"]]
                                                  : [],
                                          "question-checkbox": Array.isArray(
                                              savedDetails["question-checkbox"],
                                          )
                                              ? savedDetails["question-checkbox"]
                                              : [],
                                      },
                                      uploads: savedUploads,
                                  },
                              ]
                            : [],
                    });
                }

                if (url.endsWith("/forms/form-circle-a-1/answers/answer-1") && method === "GET") {
                    const hasAnswer =
                        Object.keys(savedDetails).length > 0 || savedUploads.length > 0;
                    return jsonResponse({
                        answer: hasAnswer
                            ? {
                                  id: "answer-1",
                                  body: "搬入責任者: 山田\n必要設備: 机",
                                  updatedAt: "2026-03-05T10:00:00Z",
                                  details: {
                                      "question-text":
                                          typeof savedDetails["question-text"] === "string"
                                              ? [savedDetails["question-text"]]
                                              : [],
                                      "question-checkbox": Array.isArray(
                                          savedDetails["question-checkbox"],
                                      )
                                          ? savedDetails["question-checkbox"]
                                          : [],
                                  },
                                  uploads: savedUploads,
                              }
                            : null,
                    });
                }

                if (url.endsWith("/forms/form-circle-a-1/answer") && method === "GET") {
                    const hasAnswer =
                        Object.keys(savedDetails).length > 0 || savedUploads.length > 0;
                    return jsonResponse({
                        answer: hasAnswer
                            ? {
                                  id: "answer-1",
                                  body: "搬入責任者: 山田\n必要設備: 机",
                                  updatedAt: "2026-03-05T10:00:00Z",
                                  details: {
                                      "question-text":
                                          typeof savedDetails["question-text"] === "string"
                                              ? [savedDetails["question-text"]]
                                              : [],
                                      "question-checkbox": Array.isArray(
                                          savedDetails["question-checkbox"],
                                      )
                                          ? savedDetails["question-checkbox"]
                                          : [],
                                  },
                                  uploads: savedUploads,
                              }
                            : null,
                    });
                }

                if (url.endsWith("/forms/form-circle-a-1/answer") && method === "PUT") {
                    const parsedBody = await parseRequestBody(input, init?.body);
                    savedDetails = parsedBody.details ?? {};
                    return jsonResponse({
                        answer: {
                            id: "answer-1",
                            body: "搬入責任者: 山田\n必要設備: 机",
                            updatedAt: "2026-03-05T10:00:00Z",
                            details: {
                                "question-text":
                                    typeof savedDetails["question-text"] === "string"
                                        ? [savedDetails["question-text"]]
                                        : [],
                                "question-checkbox": Array.isArray(
                                    savedDetails["question-checkbox"],
                                )
                                    ? savedDetails["question-checkbox"]
                                    : [],
                            },
                            uploads: savedUploads,
                        },
                    });
                }

                if (url.endsWith("/forms/form-circle-a-1/answers/answer-1") && method === "PUT") {
                    const parsedBody = await parseRequestBody(input, init?.body);
                    savedDetails = parsedBody.details ?? {};
                    return jsonResponse({
                        answer: {
                            id: "answer-1",
                            body: "搬入責任者: 山田\n必要設備: 机",
                            updatedAt: "2026-03-05T10:00:00Z",
                            details: {
                                "question-text":
                                    typeof savedDetails["question-text"] === "string"
                                        ? [savedDetails["question-text"]]
                                        : [],
                                "question-checkbox": Array.isArray(
                                    savedDetails["question-checkbox"],
                                )
                                    ? savedDetails["question-checkbox"]
                                    : [],
                            },
                            uploads: savedUploads,
                        },
                    });
                }

                if (url.endsWith("/forms/form-circle-a-1/answer/uploads") && method === "POST") {
                    return jsonResponse(savedUploads[0], 201);
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(FormDetailPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        expect(wrapper.text()).toContain("搬入確認フォーム");
        expect(wrapper.text()).toContain("搬入責任者");
        expect(wrapper.text()).toContain("必要設備");
        expect(wrapper.text()).toContain("レイアウト図");
        expect(wrapper.text()).toContain("1企画あたり 2 件まで回答できます。");
        expect(
            wrapper
                .get(
                    'a[href="/circles/select?redirect=%2Fworkspace%2Fforms%2Fform-circle-a-1%3Fanswer%3Danswer-1"]',
                )
                .text(),
        ).toContain("企画を変更");

        const inputs = wrapper.findAll('input[type="text"]');
        const textInput = inputs[1];
        if (!textInput) {
            throw new Error("Question text input was not rendered");
        }
        await textInput.setValue("山田");

        const checkbox = wrapper.find('input[type="checkbox"]');
        await checkbox.setValue(true);

        const buttons = wrapper.findAll('button[type="button"]');
        const saveButton = buttons[buttons.length - 1];
        if (!saveButton) {
            throw new Error("Save button was not rendered");
        }
        await saveButton.trigger("click");
        await flushPromises();

        expect(wrapper.text()).toContain("回答の最終更新日時 : 2026-03-05T10:00:00Z");
        expect(savedDetails["question-text"]).toBe("山田");
        expect(savedDetails["question-checkbox"]).toEqual(["机"]);
        expect(wrapper.text()).toContain("layout.pdf");
    });

    it("renders validation errors returned by the answer API", async () => {
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
                { path: "/workspace/forms", component: { template: "<div>forms</div>" } },
                { path: "/workspace/forms/:formId", component: FormDetailPage },
            ],
        });
        await router.push("/workspace/forms/form-circle-a-1");
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
                    return jsonResponse({
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
                }

                if (url.endsWith("/forms/form-circle-a-1") && method === "GET") {
                    return jsonResponse({
                        id: "form-circle-a-1",
                        name: "搬入確認フォーム",
                        description: "搬入予定時刻と責任者情報を提出してください。",
                        openAt: "2026-03-01T00:00:00Z",
                        closeAt: "2026-03-20T23:59:59Z",
                        maxAnswers: 1,
                        isPublic: true,
                        isOpen: true,
                        questions: [
                            {
                                id: "question-text",
                                name: "搬入責任者",
                                description: "当日の責任者氏名",
                                type: "text",
                                isRequired: true,
                                numberMin: null,
                                numberMax: null,
                                allowedTypes: "",
                                options: [],
                                priority: 1,
                                createdAt: "2026-03-01T00:00:00Z",
                                updatedAt: "2026-03-01T00:00:00Z",
                            },
                        ],
                    });
                }

                if (url.endsWith("/forms/form-circle-a-1/answers") && method === "GET") {
                    return jsonResponse({ answers: [] });
                }

                if (url.endsWith("/forms/form-circle-a-1/answer") && method === "GET") {
                    return jsonResponse({ answer: null });
                }

                if (url.endsWith("/forms/form-circle-a-1/answer") && method === "PUT") {
                    return jsonResponse(
                        {
                            message: "validation_error",
                            errors: {
                                "details.question-text": ["この設問は必須です"],
                            },
                        },
                        422,
                    );
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(FormDetailPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        const buttons = wrapper.findAll('button[type="button"]');
        const saveButton = buttons[buttons.length - 1];
        if (!saveButton) {
            throw new Error("Save button was not rendered");
        }
        await saveButton.trigger("click");
        await flushPromises();

        expect(wrapper.text()).toContain("この設問は必須です");
    });

    it("selects the latest answer automatically when multiple answers exist", async () => {
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
                { path: "/workspace/forms", component: { template: "<div>forms</div>" } },
                { path: "/workspace/forms/:formId", component: FormDetailPage },
            ],
        });
        await router.push("/workspace/forms/form-circle-a-1");
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

                if (url.endsWith("/forms/form-circle-a-1") && method === "GET") {
                    return jsonResponse({
                        id: "form-circle-a-1",
                        name: "搬入確認フォーム",
                        description: "搬入予定時刻と責任者情報を提出してください。",
                        openAt: "2026-03-01T00:00:00Z",
                        closeAt: "2026-03-20T23:59:59Z",
                        maxAnswers: 2,
                        isPublic: true,
                        isOpen: true,
                        hasAnswer: true,
                        questions: [
                            {
                                id: "question-text",
                                name: "搬入責任者",
                                description: "当日の責任者氏名",
                                type: "text",
                                isRequired: true,
                                numberMin: null,
                                numberMax: null,
                                allowedTypes: "",
                                options: [],
                                priority: 1,
                                createdAt: "2026-03-01T00:00:00Z",
                                updatedAt: "2026-03-01T00:00:00Z",
                            },
                        ],
                    });
                }

                if (url.endsWith("/forms/form-circle-a-1/answers") && method === "GET") {
                    return jsonResponse({
                        answers: [
                            {
                                id: "answer-2",
                                body: "新しい回答",
                                updatedAt: "2026-03-06T10:00:00Z",
                                details: { "question-text": ["佐藤"] },
                                uploads: [],
                            },
                            {
                                id: "answer-1",
                                body: "古い回答",
                                updatedAt: "2026-03-05T10:00:00Z",
                                details: { "question-text": ["山田"] },
                                uploads: [],
                            },
                        ],
                    });
                }

                if (url.endsWith("/forms/form-circle-a-1/answers/answer-2") && method === "GET") {
                    return jsonResponse({
                        answer: {
                            id: "answer-2",
                            body: "新しい回答",
                            updatedAt: "2026-03-06T10:00:00Z",
                            details: { "question-text": ["佐藤"] },
                            uploads: [],
                        },
                    });
                }

                if (url.endsWith("/session/bootstrap") && method === "GET") {
                    return jsonResponse({
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
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(FormDetailPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();
        await flushPromises();

        expect(router.currentRoute.value.query.answer).toBe("answer-2");
        expect(wrapper.text()).toContain("回答の最終更新日時 : 2026-03-06T10:00:00Z");
        const secondTextInput = wrapper.findAll('input[type="text"]')[1];
        expect(secondTextInput).toBeDefined();
        if (!secondTextInput) {
            throw new Error("2番目のテキスト入力が見つかりません");
        }
        expect((secondTextInput.element as HTMLInputElement).value).toBe("佐藤");
    });
});

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

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
        return {};
    }

    const parsed = JSON.parse(body) as unknown;
    if (!isRecord(parsed)) {
        return {};
    }

    return {
        body: typeof parsed.body === "string" ? parsed.body : undefined,
        details: parseDetails(parsed.details),
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseDetails(value: unknown): Record<string, string | string[]> | undefined {
    if (!isRecord(value)) {
        return undefined;
    }

    const details: Record<string, string | string[]> = {};
    for (const [key, detailValue] of Object.entries(value)) {
        if (typeof detailValue === "string") {
            details[key] = detailValue;
            continue;
        }
        if (Array.isArray(detailValue) && detailValue.every((item) => typeof item === "string")) {
            details[key] = [...detailValue];
            continue;
        }
        return undefined;
    }

    return details;
}
