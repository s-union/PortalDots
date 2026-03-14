import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import StaffFormDetailPage from "./StaffFormDetailPage.vue";

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

describe("StaffFormDetailPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders and edits staff form questions", async () => {
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
        { path: "/staff/forms", component: { template: "<div>forms</div>" } },
        { path: "/staff/forms/:formId", component: StaffFormDetailPage },
        { path: "/staff/forms/:formId/answers", component: { template: "<div>answers</div>" } },
        { path: "/staff/forms/:formId/preview", component: { template: "<div>preview</div>" } },
      ],
    });
    await router.push("/staff/forms/form-circle-b-1");
    await router.isReady();

    let updatedName = "展示チェックフォーム";
    let updatedMaxAnswers = 2;
    let updatedTags = ["展示"];
    let updatedConfirmationMessage = "回答ありがとうございました。";
    let updatedRequestBody: Record<string, unknown> | null = null;
    let questions = [
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
        priority: 1,
        createdAt: "2026-03-05T10:00:00Z",
        updatedAt: "2026-03-05T10:00:00Z",
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        await Promise.resolve();
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method ?? "GET";

        if (url.endsWith("/staff/status") && method === "GET") {
          return new Response(JSON.stringify({ allowed: true, authorized: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/staff/forms/form-circle-b-1") && method === "GET") {
          return new Response(
            JSON.stringify({
              id: "form-circle-b-1",
              name: updatedName,
              description: "展示レイアウトと機材使用申請を提出してください。",
              openAt: "2026-03-02T00:00:00Z",
              closeAt: "2026-03-22T23:59:59Z",
              maxAnswers: updatedMaxAnswers,
              answerableTags: updatedTags,
              confirmationMessage: updatedConfirmationMessage,
              isPublic: true,
              isOpen: true,
              questions,
              answer: {
                id: "answer-1",
                body: "展示位置は正面入口側を希望します。",
                updatedAt: "2026-03-05T10:00:00Z",
                details: {
                  "question-1": ["山田太郎"],
                },
                uploads: [
                  {
                    id: "upload-1",
                    questionId: "",
                    filename: "layout.pdf",
                    mimeType: "application/pdf",
                    sizeBytes: 128,
                    createdAt: "2026-03-05T10:10:00Z",
                  },
                ],
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        if (url.endsWith("/staff/forms/form-circle-b-1") && method === "PUT") {
          updatedRequestBody = await parseRequestBody(input, init?.body);
          updatedName = "更新後フォーム";
          updatedMaxAnswers = 3;
          updatedTags = ["展示", "必須"];
          updatedConfirmationMessage = "送信が完了しました。";
          return new Response(
            JSON.stringify({
              id: "form-circle-b-1",
              name: updatedName,
              openAt: "2026-03-02T00:00:00Z",
              closeAt: "2026-03-22T23:59:59Z",
              maxAnswers: updatedMaxAnswers,
              isPublic: true,
              isOpen: true,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        if (url.endsWith("/staff/forms/form-circle-b-1/questions") && method === "POST") {
          questions = [
            ...questions,
            {
              id: "question-2",
              name: "",
              description: "",
              type: "radio",
              isRequired: false,
              numberMin: null,
              numberMax: null,
              allowedTypes: "",
              options: [],
              priority: 2,
              createdAt: "2026-03-06T10:00:00Z",
              updatedAt: "2026-03-06T10:00:00Z",
            },
          ];
          return new Response(JSON.stringify(questions[1]), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/staff/forms/form-circle-b-1/questions/question-2") && method === "PUT") {
          questions[1] = {
            ...questions[1],
            name: "参加日",
            description: "参加日を選択してください",
            options: ["1日目", "2日目"],
            isRequired: true,
          };
          return new Response(JSON.stringify(questions[1]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        throw new Error(`Unexpected request: ${method} ${url}`);
      }),
    );

    const wrapper = mount(StaffFormDetailPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()],
      },
    });
    await flushPromises();

    expect(wrapper.text()).toContain("展示チェックフォーム");
    expect(wrapper.text()).toContain("山田太郎");
    expect(wrapper.text()).toContain("last updated: 2026-03-05T10:00:00Z");
    expect(wrapper.text()).toContain("layout.pdf");
    expect(wrapper.text()).toContain("責任者名");

    await wrapper.get('input[name="name"]').setValue("更新後フォーム");
    await wrapper.get('input[name="maxAnswers"]').setValue("3");
    await wrapper.get('textarea[name="answerableTags"]').setValue("展示\n必須");
    await wrapper.get('textarea[name="confirmationMessage"]').setValue("送信が完了しました。");
    const saveFormButton = wrapper
      .findAll('button[type="button"]')
      .find((button) => button.text().includes("変更を保存"));
    if (!saveFormButton) {
      throw new Error("save form button not found");
    }
    await saveFormButton.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("更新後フォーム");
    expect(updatedRequestBody).toMatchObject({
      maxAnswers: 3,
      answerableTags: ["展示", "必須"],
      confirmationMessage: "送信が完了しました。",
    });

    await wrapper.get("select").setValue("radio");
    await wrapper.findAll('button[type="button"]')[1].trigger("click");
    await flushPromises();
    await flushPromises();

    const questionArticles = wrapper.findAll("article");
    const latestQuestion = questionArticles[questionArticles.length - 1];
    await latestQuestion.findAll('input[type="text"]')[0].setValue("参加日");
    await latestQuestion.findAll("textarea")[0].setValue("参加日を選択してください");
    await latestQuestion.findAll("textarea")[1].setValue("1日目\n2日目");
    await latestQuestion.find('input[type="checkbox"]').setValue(true);
    await latestQuestion.findAll('button[type="button"]')[2].trigger("click");
    await flushPromises();
    await flushPromises();

    expect(wrapper.text()).toContain("参加日");
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
