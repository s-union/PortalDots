import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import { useSessionStore } from "@/features/session/store";
import UserSettingsPage from "./UserSettingsPage.vue";

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
});

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
