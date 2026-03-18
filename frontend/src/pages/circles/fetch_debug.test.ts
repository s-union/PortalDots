import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createRouter, createMemoryHistory } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import CircleCreatePage from "./new.vue";

describe("FetchDebug", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("debug fetch call", async () => {
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

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/workspace", component: { template: "<div>workspace</div>" } },
                { path: "/circles/new", component: CircleCreatePage },
            ],
        });
        await router.push("/circles/new");
        await router.isReady();

        const calls: string[] = [];
        const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url =
                typeof input === "string"
                    ? input
                    : input instanceof URL
                      ? input.toString()
                      : (input as Request).url;
            const method = (
                init?.method ?? (input instanceof Request ? (input as Request).method : "GET")
            ).toUpperCase();
            calls.push(`${method} ${url}`);
            return new Response(JSON.stringify([]), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        });
        vi.stubGlobal("fetch", fetchMock);

        const wrapper = mount(CircleCreatePage, {
            global: {
                plugins: [
                    pinia,
                    router,
                    [
                        VueQueryPlugin,
                        {
                            queryClient: new QueryClient({
                                defaultOptions: { queries: { retry: false } },
                            }),
                        },
                    ],
                ],
            },
        });
        await flushPromises();

        expect(fetchMock.mock.calls.length, "fetch should be called at least once").toBeGreaterThan(
            0,
        );
    });
});
