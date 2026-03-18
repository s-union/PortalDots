import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import StaffMailsPage from "./mails.vue";

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

describe("StaffMailsPage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("lists and creates staff mails for the current circle", async () => {
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

        let created = false;
        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/staff", component: { template: "<div>staff</div>" } },
                { path: "/staff/mails", component: StaffMailsPage },
            ],
        });
        await router.push("/staff/mails");
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

                const pathname = new URL(url, "http://localhost").pathname;

                if (pathname.endsWith("/staff/status") && method === "GET") {
                    return new Response(JSON.stringify({ allowed: true, authorized: true }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                if (pathname.endsWith("/staff/mails") && method === "GET") {
                    return new Response(
                        JSON.stringify(
                            created
                                ? [
                                      {
                                          id: "mail-job-1",
                                          subject: "搬入のご案内",
                                          body: "9:00 に集合してください。",
                                          recipients: ["demo@example.com", "sub@example.com"],
                                          status: "queued",
                                          createdAt: "2026-03-12T00:00:00Z",
                                          deliveredAt: "",
                                      },
                                  ]
                                : [],
                        ),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                if (pathname.endsWith("/staff/mails") && method === "POST") {
                    created = true;
                    return new Response(
                        JSON.stringify({
                            id: "mail-job-1",
                            subject: "搬入のご案内",
                            body: "9:00 に集合してください。",
                            recipients: ["demo@example.com", "sub@example.com"],
                            status: "queued",
                            createdAt: "2026-03-12T00:00:00Z",
                            deliveredAt: "",
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

        const wrapper = mount(StaffMailsPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        expect(wrapper.text()).toContain("モックメールキューはまだありません。");

        await wrapper.get('input[name="subject"]').setValue("搬入のご案内");
        await wrapper.get('textarea[name="body"]').setValue("9:00 に集合してください。");
        await wrapper
            .get('textarea[name="recipients"]')
            .setValue("demo@example.com, sub@example.com");
        await wrapper.get('button[type="submit"]').trigger("submit");
        await flushPromises();

        expect(wrapper.text()).toContain("搬入のご案内");
        expect(wrapper.text()).toContain("demo@example.com, sub@example.com");
        expect(wrapper.text()).toContain("この画面で登録したメールはすべてモック扱いです。");
        expect(wrapper.text()).toContain("モック待機中");
    });
});
