import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import { useSessionStore } from "@/features/session/store";
import CircleJoinPage from "./[token].vue";

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

describe("CircleJoinPage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    function setupSession() {
        const pinia = createPinia();
        setActivePinia(pinia);
        const sessionStore = useSessionStore();
        sessionStore.hydrate({
            csrfToken: "csrf-token",
            currentCircle: null,
            featureFlags: [],
            roles: ["participant"],
            user: { id: "demo-user", displayName: "Demo User" },
        });

        return { pinia, sessionStore };
    }

    async function mountAt(path = "/circles/join/invite-token") {
        const { pinia } = setupSession();
        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/", component: { template: "<div>home</div>" } },
                { path: "/login", component: { template: "<div>login</div>" } },
                { path: "/circles/select", component: { template: "<div>select</div>" } },
                { path: "/workspace/circles/detail", component: { template: "<div>detail</div>" } },
                { path: "/circles/join/:token", component: CircleJoinPage },
            ],
        });
        await router.push(path);
        await router.isReady();

        const wrapper = mount(CircleJoinPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });

        await flushPromises();
        return { wrapper, router };
    }

    it("joins a circle and redirects to workspace detail", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
                const url =
                    typeof input === "string"
                        ? input
                        : input instanceof URL
                          ? input.toString()
                          : input.url;
                const method = init?.method ?? "GET";

                if (url.endsWith("/circles/join/invite-token") && method === "POST") {
                    return new Response(
                        JSON.stringify({
                            id: "circle-a",
                            name: "テスト企画A",
                            nameYomi: "てすときかくえー",
                            groupName: "テスト大学",
                            groupNameYomi: "てすとだいがく",
                            participationTypeId: "pt-exhibit",
                            participationTypeName: "展示",
                            notes: "",
                            invitationToken: "invite-token",
                            submittedAt: null,
                        }),
                        { status: 200, headers: { "Content-Type": "application/json" } },
                    );
                }

                if (url.endsWith("/session/bootstrap") && method === "GET") {
                    return new Response(
                        JSON.stringify({
                            csrfToken: "csrf-token",
                            currentCircle: { id: "circle-a", name: "テスト企画A" },
                            featureFlags: [],
                            roles: ["participant"],
                            user: { id: "demo-user", displayName: "Demo User" },
                        }),
                        { status: 200, headers: { "Content-Type": "application/json" } },
                    );
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const { wrapper, router } = await mountAt();
        await wrapper.get('button[type="button"]').trigger("click");
        await flushPromises();

        expect(router.currentRoute.value.path).toBe("/workspace/circles/detail");
    });

    it("shows a message when the invitation token is invalid", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(
                async () =>
                    new Response(JSON.stringify({ message: "invalid_token" }), {
                        status: 404,
                        headers: { "Content-Type": "application/json" },
                    }),
            ),
        );

        const { wrapper } = await mountAt();
        await wrapper.get('button[type="button"]').trigger("click");
        await flushPromises();

        expect(wrapper.text()).toContain("招待 URL が無効か、すでに利用できません");
    });

    it("redirects already-member users to circle selector", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(
                async () =>
                    new Response(JSON.stringify({ message: "already_member" }), {
                        status: 409,
                        headers: { "Content-Type": "application/json" },
                    }),
            ),
        );

        const { wrapper, router } = await mountAt();
        await wrapper.get('button[type="button"]').trigger("click");
        await flushPromises();

        expect(router.currentRoute.value.path).toBe("/circles/select");
    });
});
