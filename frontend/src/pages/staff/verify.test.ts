import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import StaffDashboardPage from "./index.vue";
import StaffVerifyPage from "./verify.vue";

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

describe("StaffVerifyPage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("requests a verification code and confirms staff authorization", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        const sessionStore = useSessionStore();
        sessionStore.hydrate({
            csrfToken: "csrf-token",
            currentCircle: null,
            featureFlags: [],
            roles: ["admin"],
            user: {
                id: "staff-user",
                displayName: "Staff User",
            },
        });

        let staffAuthorized = false;
        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/login", component: { template: "<div>login</div>" } },
                { path: "/", component: { template: "<div>home</div>" } },
                { path: "/staff/verify", component: StaffVerifyPage },
                { path: "/staff", component: StaffDashboardPage },
                { path: "/staff/pages", component: { template: "<div>staff pages</div>" } },
            ],
        });
        await router.push("/staff/verify");
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
                    return new Response(
                        JSON.stringify({
                            csrfToken: "csrf-token",
                            currentCircle: null,
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
                            authorized: staffAuthorized,
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                if (url.endsWith("/staff/verify/request") && method === "POST") {
                    return new Response(
                        JSON.stringify({
                            deliveryMode: "mock",
                            message:
                                "モック中: メールは送信していません。画面に表示された認証コードを入力してください。",
                            verifyCode: "123456",
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                if (url.endsWith("/staff/verify/confirm") && method === "POST") {
                    staffAuthorized = true;
                    return new Response(null, { status: 204 });
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(StaffVerifyPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        await wrapper.get('button[type="button"]').trigger("click");
        await flushPromises();
        expect(wrapper.text()).toContain("現在はメール送信をモックしています。");
        expect(wrapper.text()).toContain("モック認証コード: 123456");

        await wrapper.get('input[name="verifyCode"]').setValue("123456");
        await wrapper.get('button[type="submit"]').trigger("submit");
        await flushPromises();

        expect(router.currentRoute.value.fullPath).toBe("/staff");
    });
});
