import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import StaffFormAnswerDetailPage from "./StaffFormAnswerDetailPage.vue";

describe("StaffFormAnswerDetailPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads and updates a staff answer", async () => {
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
        { path: "/staff/forms/:formId/answers", component: { template: "<div>index</div>" } },
        {
          path: "/staff/forms/:formId/answers/:answerId/edit",
          component: StaffFormAnswerDetailPage,
        },
      ],
    });
    await router.push("/staff/forms/form-circle-b-1/answers/answer-1/edit");
    await router.isReady();

    let updatedBody = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        await Promise.resolve();
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method ?? "GET";

        if (url.endsWith("/staff/status")) {
          return new Response(JSON.stringify({ allowed: true, authorized: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (
          url.endsWith("/staff/forms/form-circle-b-1/answers/answer-1/edit") &&
          method === "GET"
        ) {
          return new Response(
            JSON.stringify({
              form: {
                id: "form-circle-b-1",
                name: "展示チェックフォーム",
                description: "提出してください。",
                openAt: "2026-03-02T00:00:00Z",
                closeAt: "2026-03-22T23:59:59Z",
                maxAnswers: 2,
                isPublic: true,
                isOpen: true,
                answerableTags: ["展示"],
                confirmationMessage: "ありがとうございました。",
                questions: [
                  {
                    id: "question-1",
                    name: "責任者名",
                    description: "",
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
                ],
                answer: null,
              },
              circle: {
                id: "circle-a",
                name: "デモ企画A",
                groupName: "Aブロック",
                participationTypeName: "模擬店",
              },
              answer: {
                id: "answer-1",
                body: "初期本文",
                createdAt: "2026-03-14T02:00:00Z",
                updatedAt: "2026-03-14T02:30:00Z",
                details: {
                  "question-1": ["初期責任者"],
                },
                uploads: [],
              },
              siblingAnswers: [
                {
                  id: "answer-1",
                  circle: {
                    id: "circle-a",
                    name: "デモ企画A",
                    groupName: "Aブロック",
                    participationTypeName: "模擬店",
                  },
                  body: "初期本文",
                  createdAt: "2026-03-14T02:00:00Z",
                  updatedAt: "2026-03-14T02:30:00Z",
                  uploadCount: 0,
                },
              ],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        if (url.endsWith("/staff/forms/form-circle-b-1/answers/answer-1") && method === "PUT") {
          if (input instanceof Request) {
            updatedBody = await input.clone().text();
          } else if (typeof init?.body === "string") {
            updatedBody = init.body;
          } else {
            updatedBody = "";
          }
          return new Response(
            JSON.stringify({
              id: "answer-1",
              body: "更新後本文",
              createdAt: "2026-03-14T02:00:00Z",
              updatedAt: "2026-03-14T03:00:00Z",
              details: {
                "question-1": ["更新後責任者"],
              },
              uploads: [],
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

    const wrapper = mount(StaffFormAnswerDetailPage, {
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
    await wrapper.get('input[type="text"]').setValue("更新後責任者");
    await wrapper.get('button[type="button"]:last-of-type').trigger("click");
    await flushPromises();

    expect(updatedBody).toContain("更新後責任者");
  });
});
