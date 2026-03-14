import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createRouter, createMemoryHistory } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import CircleSelectorPage from "./CircleSelectorPage.vue";
import WorkspacePage from "../WorkspacePage.vue";

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

describe("CircleSelectorPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("selects a circle and navigates to the workspace", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const sessionStore = useSessionStore();
    sessionStore.hydrate({
      csrfToken: "csrf-token",
      currentCircle: null,
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
        { path: "/circles/select", component: CircleSelectorPage },
        { path: "/workspace", component: WorkspacePage },
      ],
    });
    await router.push("/circles/select");
    await router.isReady();

    let selected = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      await Promise.resolve();
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method ?? "GET";

      if (url.endsWith("/session/bootstrap") && method === "GET") {
        return new Response(
          JSON.stringify({
            csrfToken: "csrf-token",
            currentCircle: selected
              ? {
                  id: "circle-b",
                  name: "デモ企画B",
                }
              : null,
            featureFlags: [],
            roles: ["participant"],
            user: {
              id: "demo-user",
              displayName: "Demo User",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url.endsWith("/circles") && method === "GET") {
        return new Response(
          JSON.stringify([
            {
              id: "circle-a",
              name: "デモ企画A",
              groupName: "Aブロック",
              participationTypeName: "模擬店",
            },
            {
              id: "circle-b",
              name: "デモ企画B",
              groupName: "Bブロック",
              participationTypeName: "展示",
            },
          ]),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url.endsWith("/circles/current") && method === "PUT") {
        selected = true;
        return new Response(null, { status: 204 });
      }

      throw new Error(`Unexpected request: ${method} ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const wrapper = mount(CircleSelectorPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()],
      },
    });
    await flushPromises();

    await wrapper.get('button[type="button"]:last-of-type').trigger("click");
    await flushPromises();

    expect(sessionStore.currentCircle?.name).toBe("デモ企画B");
    expect(router.currentRoute.value.path).toBe("/workspace");
  });
});
