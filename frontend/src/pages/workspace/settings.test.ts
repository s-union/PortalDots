import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import { useSessionStore } from "@/features/session/store";
import UserSettingsPage from "./settings.vue";

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

describe("UserSettingsPage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        document.cookie = "ui_theme=; Path=/; Max-Age=0; SameSite=Lax";
        document.documentElement.classList.remove("theme-system", "theme-light", "theme-dark");
    });

    it("updates the display name and password", async () => {
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
                canDeleteAccount: false,
            },
        });

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/workspace", component: { template: "<div>workspace</div>" } },
                { path: "/workspace/settings", component: UserSettingsPage },
            ],
        });
        await router.push("/workspace/settings");
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

                if (url.endsWith("/session/profile") && method === "PUT") {
                    return jsonResponse({
                        id: "demo-user",
                        displayName: "Updated Demo User",
                    });
                }

                if (url.endsWith("/session/password") && method === "PUT") {
                    return new Response(null, { status: 204 });
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
                            displayName: "Updated Demo User",
                            canDeleteAccount: false,
                        },
                    });
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(UserSettingsPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        await wrapper.get('input[name="displayName"]').setValue("Updated Demo User");
        await wrapper.find('button[type="button"]').trigger("click");
        await flushPromises();

        expect(wrapper.text()).toContain("表示名を更新しました。");
        expect(sessionStore.user?.displayName).toBe("Updated Demo User");

        await wrapper.get('input[name="currentPassword"]').setValue("password");
        await wrapper.get('input[name="newPassword"]').setValue("new-password");
        await wrapper.get('input[name="confirmPassword"]').setValue("new-password");
        await wrapper.findAll('button[type="button"]')[1]?.trigger("click");
        await flushPromises();

        expect(wrapper.text()).toContain("パスワードを更新しました。");
    });

    it("updates theme preference immediately and stores it in cookie", async () => {
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
                canDeleteAccount: true,
            },
        });

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/workspace", component: { template: "<div>workspace</div>" } },
                { path: "/workspace/settings", component: UserSettingsPage },
            ],
        });
        await router.push("/workspace/settings");
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
                            canDeleteAccount: false,
                        },
                    });
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(UserSettingsPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        await wrapper.get('input[type="radio"][value="dark"]').setValue();

        expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
        expect(document.cookie).toContain("ui_theme=dark");
    });

    it("deletes the account and redirects to home when allowed", async () => {
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
                canDeleteAccount: true,
            },
        });

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/", component: { template: "<div>home</div>" } },
                { path: "/workspace", component: { template: "<div>workspace</div>" } },
                { path: "/workspace/settings", component: UserSettingsPage },
            ],
        });
        await router.push("/workspace/settings");
        await router.isReady();

        vi.stubGlobal(
            "confirm",
            vi.fn(() => true),
        );
        const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            await Promise.resolve();
            const url =
                typeof input === "string"
                    ? input
                    : input instanceof URL
                      ? input.toString()
                      : input.url;
            const method = init?.method ?? "GET";

            if (url.endsWith("/session/account") && method === "DELETE") {
                return new Response(null, { status: 204 });
            }

            throw new Error(`Unexpected request: ${method} ${url}`);
        });
        vi.stubGlobal("fetch", fetchMock);

        const wrapper = mount(UserSettingsPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        const deleteButton = wrapper
            .findAll('button[type="button"]')
            .find((button) => button.text().includes("アカウントを削除"));
        if (!deleteButton) throw new Error("delete account button not found");
        await deleteButton.trigger("click");
        await flushPromises();

        const deleteCall = fetchMock.mock.calls.find((call) => {
            const [input, init] = call;
            const url =
                typeof input === "string"
                    ? input
                    : input instanceof URL
                      ? input.toString()
                      : input.url;
            return url.includes("/session/account") && init?.method === "DELETE";
        });

        expect(deleteCall).toBeDefined();
        expect(sessionStore.isAuthenticated).toBe(false);
        expect(router.currentRoute.value.path).toBe("/");
    });

    it("disables delete account while a circle is selected", async () => {
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
                canDeleteAccount: false,
            },
        });

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/workspace", component: { template: "<div>workspace</div>" } },
                { path: "/workspace/settings", component: UserSettingsPage },
            ],
        });
        await router.push("/workspace/settings");
        await router.isReady();

        vi.stubGlobal("fetch", vi.fn());

        const wrapper = mount(UserSettingsPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        const deleteButton = wrapper
            .findAll('button[type="button"]')
            .find((button) => button.text().includes("アカウントを削除"));
        if (!deleteButton) throw new Error("delete account button not found");

        expect(deleteButton.attributes("disabled")).toBeDefined();
        expect(wrapper.text()).toContain("企画を離れるまでアカウント削除はできません。");
    });

    it("disables delete account when the server denies deletion", async () => {
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
                canDeleteAccount: false,
            },
        });

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/workspace", component: { template: "<div>workspace</div>" } },
                { path: "/workspace/settings", component: UserSettingsPage },
            ],
        });
        await router.push("/workspace/settings");
        await router.isReady();

        vi.stubGlobal("fetch", vi.fn());

        const wrapper = mount(UserSettingsPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        const deleteButton = wrapper
            .findAll('button[type="button"]')
            .find((button) => button.text().includes("アカウントを削除"));
        if (!deleteButton) throw new Error("delete account button not found");

        expect(deleteButton.attributes("disabled")).toBeDefined();
        expect(wrapper.text()).toContain(
            "企画所属または権限状態のため、現在はアカウント削除できません。",
        );
    });
});

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
