import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import StaffPlacesPage from "./places.vue";

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

describe("StaffPlacesPage", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("lists, creates, updates, and deletes places", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        const sessionStore = useSessionStore();
        sessionStore.hydrate({
            csrfToken: "csrf-token",
            currentCircle: { id: "circle-b", name: "デモ企画B" },
            featureFlags: [],
            roles: ["admin"],
            user: { id: "staff-user", displayName: "Staff User" },
        });

        const places = [
            { id: "place-1", name: "1号館", type: 1, notes: "屋内" },
            { id: "place-2", name: "中庭", type: 2, notes: "屋外" },
        ];

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/staff", component: { template: "<div>staff</div>" } },
                { path: "/staff/places", component: StaffPlacesPage },
            ],
        });
        await router.push("/staff/places");
        await router.isReady();

        const confirmMock = vi.fn(() => true);
        vi.spyOn(window, "confirm").mockImplementation(confirmMock);

        vi.stubGlobal(
            "fetch",
            vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
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
                if (pathname.endsWith("/staff/places") && method === "GET") {
                    return new Response(JSON.stringify(places), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                if (pathname.endsWith("/staff/places") && method === "POST") {
                    places.push({ id: "place-3", name: "体育館", type: 3, notes: "特殊" });
                    return new Response(JSON.stringify(places[2]), {
                        status: 201,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                if (pathname.endsWith("/staff/places/place-1") && method === "PUT") {
                    places[0] = { id: "place-1", name: "更新後 1号館", type: 1, notes: "更新" };
                    return new Response(JSON.stringify(places[0]), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                if (pathname.endsWith("/staff/places/place-2") && method === "DELETE") {
                    places.splice(1, 1);
                    return new Response(null, { status: 204 });
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(StaffPlacesPage, {
            global: { plugins: [pinia, router, createQueryPlugin()] },
        });
        await flushPromises();

        expect(wrapper.get('a[href$="/v1/staff/places/export"]').text()).toContain(
            "CSVで出力(場所別企画一覧)",
        );
        expect(wrapper.text()).toContain("1号館");

        const createInputs = wrapper.findAll("input[name]");
        await createInputs[0].setValue("体育館");
        await createInputs[1].setValue("特殊");
        await wrapper.get("form").trigger("submit");
        await flushPromises();
        expect(wrapper.text()).toContain("体育館");

        const textInputs = wrapper.findAll('input[type="text"]');
        await textInputs[2].setValue("更新後 1号館");
        const buttons = wrapper.findAll('button[type="button"]');
        await buttons[0].trigger("click");
        await flushPromises();
        expect(wrapper.text()).toContain("更新後 1号館");

        await buttons[3].trigger("click");
        await flushPromises();
        expect(confirmMock).toHaveBeenCalledWith(
            expect.stringContaining("場所「中庭」を削除しますか？"),
        );
        expect(confirmMock).toHaveBeenCalledWith(
            expect.stringContaining("企画自体は削除されません"),
        );
        expect(wrapper.text()).not.toContain("中庭");
    });

    it("does not delete when place deletion is cancelled", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        const sessionStore = useSessionStore();
        sessionStore.hydrate({
            csrfToken: "csrf-token",
            currentCircle: { id: "circle-b", name: "デモ企画B" },
            featureFlags: [],
            roles: ["admin"],
            user: { id: "staff-user", displayName: "Staff User" },
        });

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/staff", component: { template: "<div>staff</div>" } },
                { path: "/staff/places", component: StaffPlacesPage },
            ],
        });
        await router.push("/staff/places");
        await router.isReady();

        const confirmMock = vi.fn(() => false);
        vi.spyOn(window, "confirm").mockImplementation(confirmMock);

        const deleteRequests: string[] = [];
        vi.stubGlobal(
            "fetch",
            vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
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
                if (pathname.endsWith("/staff/places") && method === "GET") {
                    return new Response(
                        JSON.stringify([
                            { id: "place-1", name: "1号館", type: 1, notes: "屋内" },
                            { id: "place-2", name: "中庭", type: 2, notes: "屋外" },
                        ]),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }
                if (pathname.endsWith("/staff/places/place-2") && method === "DELETE") {
                    deleteRequests.push(url);
                    return new Response(null, { status: 204 });
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(StaffPlacesPage, {
            global: { plugins: [pinia, router, createQueryPlugin()] },
        });
        await flushPromises();

        const buttons = wrapper.findAll('button[type="button"]');
        await buttons[3].trigger("click");
        await flushPromises();

        expect(confirmMock).toHaveBeenCalledWith(
            expect.stringContaining("場所「中庭」を削除しますか？"),
        );
        expect(deleteRequests).toHaveLength(0);
        expect(wrapper.text()).toContain("中庭");
    });
});
