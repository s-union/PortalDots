import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import StaffUsersIndexPage from "./index.vue";

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

describe("StaffUsersIndexPage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("lists staff-manageable users", async () => {
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
                { path: "/staff", component: { template: "<div>staff</div>" } },
                { path: "/staff/users", component: StaffUsersIndexPage },
                { path: "/staff/users/:userId", component: { template: "<div>detail</div>" } },
            ],
        });
        await router.push("/staff/users");
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

                if (url.endsWith("/staff/status") && method === "GET") {
                    return new Response(JSON.stringify({ allowed: true, authorized: true }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                if (url.includes("/staff/users") && method === "GET") {
                    return new Response(
                        JSON.stringify({
                            items: [
                                {
                                    id: "staff-user",
                                    displayName: "Staff User",
                                    loginIds: ["staff@example.com"],
                                    roles: ["admin"],
                                    isVerified: true,
                                },
                                {
                                    id: "demo-user",
                                    displayName: "Demo User",
                                    loginIds: ["demo@example.com", "24a0000"],
                                    roles: ["participant"],
                                    isVerified: false,
                                },
                            ],
                            page: 1,
                            pageSize: 10,
                            total: 2,
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

        const wrapper = mount(StaffUsersIndexPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        expect(wrapper.text()).toContain("Staff User");
        expect(wrapper.text()).toContain("Demo User");
        expect(wrapper.text()).toContain("staff@example.com");
        expect(wrapper.text()).toContain("participant");
        expect(wrapper.text()).toContain("確認済み");
        expect(wrapper.text()).toContain("未確認");
        expect(
            wrapper.get('a[href="http://127.0.0.1:8081/v1/staff/users/export"]').text(),
        ).toContain("CSVで出力");
    });
});
