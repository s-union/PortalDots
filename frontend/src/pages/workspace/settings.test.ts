import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import { useSessionStore } from "@/features/session/store";
import UserSettingsPage from "./settings.vue";
import UserSettingsAppearancePage from "./settings/appearance.vue";
import UserSettingsPasswordPage from "./settings/password.vue";
import UserSettingsDeletePage from "./settings/delete.vue";

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
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        document.cookie = "ui_theme=; Path=/; Max-Age=0; SameSite=Lax";
        document.documentElement.classList.remove("theme-system", "theme-light", "theme-dark");
    });

    it("updates the display name", async () => {
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
                { path: "/workspace/settings/appearance", component: UserSettingsAppearancePage },
                { path: "/workspace/settings/password", component: UserSettingsPasswordPage },
                { path: "/workspace/settings/delete", component: UserSettingsDeletePage },
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
                const method = (
                    init?.method ?? (input instanceof Request ? input.method : "GET")
                ).toUpperCase();

                if (url.includes("/session/profile") && method === "PUT") {
                    return jsonResponse({
                        id: "demo-user",
                        displayName: "Updated Demo User",
                    });
                }

                if (url.includes("/session/bootstrap") && method === "GET") {
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
    });

    it("updates the password", async () => {
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
                { path: "/workspace/settings/appearance", component: UserSettingsAppearancePage },
                { path: "/workspace/settings/password", component: UserSettingsPasswordPage },
                { path: "/workspace/settings/delete", component: UserSettingsDeletePage },
            ],
        });
        await router.push("/workspace/settings/password");
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
                const method = (
                    init?.method ?? (input instanceof Request ? input.method : "GET")
                ).toUpperCase();

                if (url.includes("/session/password") && method === "PUT") {
                    return new Response(null, { status: 204 });
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(UserSettingsPasswordPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        await wrapper.get('input[name="currentPassword"]').setValue("password");
        await wrapper.get('input[name="newPassword"]').setValue("new-password");
        await wrapper.get('input[name="confirmPassword"]').setValue("new-password");
        await wrapper.find('button[type="button"]').trigger("click");
        await flushPromises();

        expect(wrapper.text()).toContain("パスワードを更新しました。");
    });

    it("renders links to the split settings pages", async () => {
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
                { path: "/workspace", component: { template: "<div>workspace</div>" } },
                { path: "/workspace/settings", component: UserSettingsPage },
                { path: "/workspace/settings/appearance", component: UserSettingsAppearancePage },
                { path: "/workspace/settings/password", component: UserSettingsPasswordPage },
                { path: "/workspace/settings/delete", component: UserSettingsDeletePage },
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

        const tabLinks = wrapper.findAllComponents({ name: "RouterLink" });
        expect(tabLinks.some((link) => link.props("to") === "/workspace/settings/appearance")).toBe(
            true,
        );
        expect(tabLinks.some((link) => link.props("to") === "/workspace/settings/password")).toBe(
            true,
        );
        expect(tabLinks.some((link) => link.props("to") === "/workspace/settings/delete")).toBe(
            true,
        );
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
                { path: "/workspace/settings/appearance", component: UserSettingsAppearancePage },
                { path: "/workspace/settings/password", component: UserSettingsPasswordPage },
                { path: "/workspace/settings/delete", component: UserSettingsDeletePage },
            ],
        });
        await router.push("/workspace/settings/appearance");
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
                const method = (
                    init?.method ?? (input instanceof Request ? input.method : "GET")
                ).toUpperCase();

                if (url.includes("/session/bootstrap") && method === "GET") {
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

        const wrapper = mount(UserSettingsAppearancePage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        await wrapper.get('input[type="radio"][value="dark"]').setValue();

        expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
        expect(document.cookie).toContain("ui_theme=dark");
    });

    it("renders only the appearance tab for guests", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/", component: { template: "<div>home</div>" } },
                { path: "/workspace/settings/appearance", component: UserSettingsAppearancePage },
                { path: "/workspace/settings", component: UserSettingsPage },
                { path: "/workspace/settings/password", component: UserSettingsPasswordPage },
                { path: "/workspace/settings/delete", component: UserSettingsDeletePage },
            ],
        });
        await router.push("/workspace/settings/appearance");
        await router.isReady();

        vi.stubGlobal("fetch", vi.fn());

        const wrapper = mount(UserSettingsAppearancePage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        const tabLinks = wrapper.findAllComponents({ name: "RouterLink" });
        expect(tabLinks.some((link) => link.props("to") === "/workspace/settings/appearance")).toBe(
            true,
        );
        expect(tabLinks.some((link) => link.props("to") === "/workspace/settings")).toBe(false);
        expect(tabLinks.some((link) => link.props("to") === "/workspace/settings/password")).toBe(
            false,
        );
        expect(wrapper.text()).toContain("ワークスペースへ戻る");
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
                { path: "/workspace/settings/appearance", component: UserSettingsAppearancePage },
                { path: "/workspace/settings/password", component: UserSettingsPasswordPage },
                { path: "/workspace/settings/delete", component: UserSettingsDeletePage },
            ],
        });
        await router.push("/workspace/settings/delete");
        await router.isReady();

        const confirmMock = vi.spyOn(window, "confirm").mockImplementation(() => true);
        const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            await Promise.resolve();
            const url =
                typeof input === "string"
                    ? input
                    : input instanceof URL
                      ? input.toString()
                      : input.url;
            const method = (
                init?.method ?? (input instanceof Request ? input.method : "GET")
            ).toUpperCase();

            if (url.includes("/session/account") && method === "DELETE") {
                return new Response(null, { status: 204 });
            }

            throw new Error(`Unexpected request: ${method} ${url}`);
        });
        vi.stubGlobal("fetch", fetchMock);

        const wrapper = mount(UserSettingsDeletePage, {
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
            const method = (
                init?.method ?? (input instanceof Request ? input.method : "GET")
            ).toUpperCase();
            return url.includes("/session/account") && method === "DELETE";
        });

        expect(confirmMock).toHaveBeenCalledWith("本当にアカウントを削除しますか？");
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
                { path: "/workspace/settings/appearance", component: UserSettingsAppearancePage },
                { path: "/workspace/settings/password", component: UserSettingsPasswordPage },
                { path: "/workspace/settings/delete", component: UserSettingsDeletePage },
            ],
        });
        await router.push("/workspace/settings/delete");
        await router.isReady();

        vi.stubGlobal("fetch", vi.fn());

        const wrapper = mount(UserSettingsDeletePage, {
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
            "企画に所属しているか、参加登録の途中のため、アカウント削除はできません。",
        );
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
                { path: "/workspace/settings/appearance", component: UserSettingsAppearancePage },
                { path: "/workspace/settings/password", component: UserSettingsPasswordPage },
                { path: "/workspace/settings/delete", component: UserSettingsDeletePage },
            ],
        });
        await router.push("/workspace/settings/delete");
        await router.isReady();

        vi.stubGlobal("fetch", vi.fn());

        const wrapper = mount(UserSettingsDeletePage, {
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

    it("shows the backend validation message when account deletion fails", async () => {
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
                { path: "/workspace/settings/appearance", component: UserSettingsAppearancePage },
                { path: "/workspace/settings/password", component: UserSettingsPasswordPage },
                { path: "/workspace/settings/delete", component: UserSettingsDeletePage },
            ],
        });
        await router.push("/workspace/settings/delete");
        await router.isReady();

        const confirmMock = vi.spyOn(window, "confirm").mockImplementation(() => true);
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
                const method = (
                    init?.method ?? (input instanceof Request ? input.method : "GET")
                ).toUpperCase();

                if (url.includes("/session/account") && method === "DELETE") {
                    return jsonResponse(
                        {
                            message: "validation_error",
                            errors: {
                                user: ["企画に所属しているため、アカウント削除はできません"],
                            },
                        },
                        422,
                    );
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(UserSettingsDeletePage, {
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

        expect(confirmMock).toHaveBeenCalledWith("本当にアカウントを削除しますか？");
        expect(wrapper.text()).toContain("企画に所属しているため、アカウント削除はできません");
        expect(sessionStore.isAuthenticated).toBe(true);
        expect(router.currentRoute.value.path).toBe("/workspace/settings/delete");
    });
});

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
