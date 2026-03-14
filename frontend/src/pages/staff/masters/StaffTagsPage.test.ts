import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import StaffTagsPage from "./StaffTagsPage.vue";

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

describe("StaffTagsPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists, creates, updates, and deletes tags", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const sessionStore = useSessionStore();
    sessionStore.hydrate({
      csrfToken: "csrf-token",
      currentCircle: { id: "circle-b", name: "デモ企画B" },
      featureFlags: [],
      roles: ["admin"],
      user: { id: "staff-user", displayName: "Staff User" },
    });

    const tags = [
      { id: "tag-1", name: "飲食" },
      { id: "tag-2", name: "展示" },
    ];

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/staff", component: { template: "<div>staff</div>" } },
        { path: "/staff/tags", component: StaffTagsPage },
      ],
    });
    await router.push("/staff/tags");
    await router.isReady();

    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method ?? "GET";

        if (url.endsWith("/staff/status") && method === "GET") {
          return new Response(JSON.stringify({ allowed: true, authorized: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.endsWith("/staff/tags") && method === "GET") {
          return new Response(JSON.stringify(tags), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.endsWith("/staff/tags") && method === "POST") {
          tags.push({ id: "tag-3", name: "新規タグ" });
          return new Response(JSON.stringify(tags[2]), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.endsWith("/staff/tags/tag-1") && method === "PUT") {
          tags[0] = { id: "tag-1", name: "更新タグ" };
          return new Response(JSON.stringify(tags[0]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.endsWith("/staff/tags/tag-2") && method === "DELETE") {
          tags.splice(1, 1);
          return new Response(null, { status: 204 });
        }

        throw new Error(`Unexpected request: ${method} ${url}`);
      }),
    );

    const wrapper = mount(StaffTagsPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] },
    });
    await flushPromises();

    expect(wrapper.text()).toContain("飲食");

    await wrapper.get('input[name="name"]').setValue("新規タグ");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("新規タグ");

    const textInputs = wrapper.findAll('input[type="text"]');
    await textInputs[1].setValue("更新タグ");
    const buttons = wrapper.findAll('button[type="button"]');
    await buttons[0].trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("更新タグ");

    await buttons[3].trigger("click");
    await flushPromises();
    expect(wrapper.text()).not.toContain("展示");
  });
});
