import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import StaffDashboardPage from "../dashboard/StaffDashboardPage.vue";
import StaffPagesIndexPage from "./StaffPagesIndexPage.vue";
import StaffVerifyPage from "../verify/StaffVerifyPage.vue";

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

describe("StaffPagesIndexPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists and creates staff pages for the current circle", async () => {
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

    let createdTitle = "";
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/login", component: { template: "<div>login</div>" } },
        { path: "/", component: { template: "<div>home</div>" } },
        { path: "/circles/select", component: { template: "<div>circles</div>" } },
        { path: "/staff", component: StaffDashboardPage },
        { path: "/staff/verify", component: StaffVerifyPage },
        { path: "/staff/pages", component: StaffPagesIndexPage },
        { path: "/staff/pages/:pageId", component: { template: "<div>detail</div>" } },
      ],
    });
    await router.push("/staff/pages");
    await router.isReady();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        await Promise.resolve();
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method ?? "GET";

        if (url.endsWith("/session/bootstrap") && method === "GET") {
          return new Response(
            JSON.stringify({
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
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        if (url.endsWith("/staff/status") && method === "GET") {
          return new Response(
            JSON.stringify({
              allowed: true,
              authorized: true,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        if (url.endsWith("/staff/tags") && method === "GET") {
          return new Response(
            JSON.stringify([
              { id: "tag-exhibition", name: "展示" },
              { id: "tag-stage", name: "ステージ" },
            ]),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        if (url.endsWith("/staff/documents") && method === "GET") {
          return new Response(
            JSON.stringify([
              {
                id: "document-circle-b-1",
                name: "展示ガイド",
                description: "Bブロック向けの展示ガイドです。",
                notes: "",
                isImportant: true,
                filename: "b-exhibition-guide.txt",
                extension: "TXT",
                mimeType: "text/plain; charset=utf-8",
                sizeBytes: 1024,
                isPublic: true,
                createdAt: "2026-03-03T09:00:00Z",
                updatedAt: "2026-03-05T09:00:00Z",
                downloadUrl: "/v1/documents/document-circle-b-1",
              },
            ]),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        if (url.includes("/staff/pages?query=%E6%96%B0%E7%9D%80") && method === "GET") {
          return new Response(
            JSON.stringify([
              {
                id: "page-generated-1",
                title: createdTitle,
                publishedAt: "2026-03-12T00:00:00Z",
                isPinned: true,
                isPublic: true,
              },
            ]),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        if (url.endsWith("/staff/pages") && method === "GET") {
          const pages =
            createdTitle === ""
              ? [
                  {
                    id: "page-circle-b-private",
                    title: "非公開メモ",
                    publishedAt: "2026-03-04T09:00:00Z",
                    isPinned: false,
                    isPublic: false,
                  },
                ]
              : [
                  {
                    id: "page-generated-1",
                    title: createdTitle,
                    publishedAt: "2026-03-12T00:00:00Z",
                    isPinned: true,
                    isPublic: true,
                  },
                  {
                    id: "page-circle-b-private",
                    title: "非公開メモ",
                    publishedAt: "2026-03-04T09:00:00Z",
                    isPinned: false,
                    isPublic: false,
                  },
                ];

          return new Response(JSON.stringify(pages), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/staff/pages") && method === "POST") {
          createdTitle = "新着スタッフ連絡";
          return new Response(
            JSON.stringify({
              id: "page-generated-1",
              title: createdTitle,
              publishedAt: "2026-03-12T00:00:00Z",
              isPinned: true,
              isPublic: true,
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

    const wrapper = mount(StaffPagesIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()],
      },
    });
    await flushPromises();

    expect(wrapper.text()).toContain("非公開メモ");

    await wrapper.get('input[name="title"]').setValue("新着スタッフ連絡");
    await wrapper.get('textarea[name="body"]').setValue("設営順を更新しました。");
    await wrapper.get('textarea[name="notes"]').setValue("スタッフ向けメモ");
    await wrapper.get('input[name="isPinned"]').setValue(true);
    const forms = wrapper.findAll("form");
    if (forms.length < 2) {
      throw new Error("missing forms");
    }
    await forms[1].trigger("submit");
    await flushPromises();

    await wrapper.get('input[name="query"]').setValue("新着");
    await forms[0].trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("新着スタッフ連絡");
    expect(wrapper.text()).toContain("はい");
  });
});
