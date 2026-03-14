import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import { useSessionStore } from "@/features/session/store";
import ContactPage from "./ContactPage.vue";

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

describe("ContactPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists categories and submits a contact message", async () => {
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
        { path: "/workspace", component: { template: "<div>workspace</div>" } },
        { path: "/workspace/contact", component: ContactPage },
      ],
    });
    await router.push("/workspace/contact");
    await router.isReady();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        await Promise.resolve();
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method ?? "GET";

        if (url.endsWith("/contact-categories") && method === "GET") {
          return jsonResponse([
            { id: "contact-general", name: "総合窓口" },
            { id: "contact-safety", name: "安全管理" },
          ]);
        }

        if (url.endsWith("/contact") && method === "GET") {
          return jsonResponse([
            {
              id: "mail-job-0",
              categoryId: "contact-safety",
              categoryName: "安全管理",
              subject: "前回のお問い合わせ",
              status: "queued",
              createdAt: "2026-03-12T10:00:00Z",
            },
          ]);
        }

        if (url.endsWith("/contact") && method === "POST") {
          return jsonResponse(
            {
              id: "mail-job-1",
              categoryId: "contact-general",
              categoryName: "総合窓口",
              subject: "搬入時間について",
              status: "queued",
              createdAt: "2026-03-13T10:00:00Z",
            },
            201,
          );
        }

        throw new Error(`Unexpected request: ${method} ${url}`);
      }),
    );

    const wrapper = mount(ContactPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()],
      },
    });
    await flushPromises();

    await wrapper.get('select[name="categoryId"]').setValue("contact-general");
    await wrapper.get('input[name="subject"]').setValue("搬入時間について");
    await wrapper.get('textarea[name="body"]').setValue("9時前の搬入可否を確認したいです。");
    await wrapper.get("form").trigger("submit.prevent");
    await flushPromises();

    expect(wrapper.text()).toContain("前回のお問い合わせ");
    expect(wrapper.text()).toContain("「総合窓口」へお問い合わせを送信しました。");
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
