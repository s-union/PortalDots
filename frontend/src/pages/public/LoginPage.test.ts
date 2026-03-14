import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createRouter, createMemoryHistory } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import LoginPage from "./LoginPage.vue";

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div>home</div>" } },
      { path: "/login", component: LoginPage },
    ],
  });
}

describe("LoginPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits credentials and hydrates the session", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createTestRouter();
    await router.push("/login");
    await router.isReady();

    let loginRequestBody = "";
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method ?? "GET";

      if (url.endsWith("/auth/login") && method === "POST") {
        if (typeof init?.body === "string") {
          loginRequestBody = init.body;
        } else if (input instanceof Request) {
          loginRequestBody = await input.clone().text();
        }

        return new Response(null, { status: 204 });
      }

      if (url.endsWith("/session/bootstrap") && method === "GET") {
        return new Response(
          JSON.stringify({
            csrfToken: "csrf-token",
            currentCircle: null,
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

      throw new Error(`Unexpected request: ${method} ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const wrapper = mount(LoginPage, {
      global: {
        plugins: [
          pinia,
          router,
          [
            VueQueryPlugin,
            {
              queryClient: new QueryClient({
                defaultOptions: {
                  queries: { retry: false },
                },
              }),
            },
          ],
        ],
      },
    });

    await wrapper.get('input[name="loginId"]').setValue("demo@example.com");
    await wrapper.get('input[name="password"]').setValue("password");
    await wrapper.get('input[name="remember"]').setValue(true);
    await wrapper.get("form").trigger("submit.prevent");
    await flushPromises();

    const sessionStore = useSessionStore();
    await vi.waitFor(() => {
      expect(sessionStore.user?.displayName).toBe("Demo User");
    });
    expect(router.currentRoute.value.path).toBe("/");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(loginRequestBody)).toMatchObject({
      loginId: "demo@example.com",
      password: "password",
      remember: true,
    });
  });

  it("shows the API error message when authentication fails", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createTestRouter();
    await router.push("/login");
    await router.isReady();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        await Promise.resolve();
        return new Response(
          JSON.stringify({
            message: "authentication_failed",
            errors: {
              loginId: ["ログイン情報が正しくありません"],
            },
          }),
          {
            status: 422,
            headers: { "Content-Type": "application/json" },
          },
        );
      }),
    );

    const wrapper = mount(LoginPage, {
      global: {
        plugins: [
          pinia,
          router,
          [
            VueQueryPlugin,
            {
              queryClient: new QueryClient({
                defaultOptions: {
                  queries: { retry: false },
                },
              }),
            },
          ],
        ],
      },
    });

    await wrapper.get('input[name="loginId"]').setValue("wrong@example.com");
    await wrapper.get('input[name="password"]').setValue("wrong");
    await wrapper.get("form").trigger("submit.prevent");
    await flushPromises();

    expect(wrapper.text()).toContain("ログイン情報が正しくありません");
    expect(router.currentRoute.value.path).toBe("/login");
  });
});
