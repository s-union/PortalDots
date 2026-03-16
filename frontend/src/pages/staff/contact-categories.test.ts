import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import StaffContactCategoriesPage from "./contact-categories.vue";

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

describe("StaffContactCategoriesPage", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("lists, creates, updates, and deletes contact categories", async () => {
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

        const categories = [
            { id: "category-1", name: "総合", email: "general@example.com" },
            { id: "category-2", name: "安全", email: "safety@example.com" },
        ];

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/staff", component: { template: "<div>staff</div>" } },
                { path: "/staff/contact-categories", component: StaffContactCategoriesPage },
            ],
        });
        await router.push("/staff/contact-categories");
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
                const method = init?.method ?? "GET";

                if (url.endsWith("/staff/status") && method === "GET") {
                    return new Response(JSON.stringify({ allowed: true, authorized: true }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                if (url.endsWith("/staff/contact-categories") && method === "GET") {
                    return new Response(JSON.stringify(categories), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                if (url.endsWith("/staff/contact-categories") && method === "POST") {
                    categories.push({ id: "category-3", name: "新規", email: "new@example.com" });
                    return new Response(JSON.stringify(categories[2]), {
                        status: 201,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                if (url.endsWith("/staff/contact-categories/category-1") && method === "PUT") {
                    categories[0] = {
                        id: "category-1",
                        name: "更新総合",
                        email: "updated@example.com",
                    };
                    return new Response(JSON.stringify(categories[0]), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                if (url.endsWith("/staff/contact-categories/category-2") && method === "DELETE") {
                    categories.splice(1, 1);
                    return new Response(null, { status: 204 });
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(StaffContactCategoriesPage, {
            global: { plugins: [pinia, router, createQueryPlugin()] },
        });
        await flushPromises();

        expect(wrapper.text()).toContain("総合");

        const createInputs = wrapper.findAll("input[name]");
        await createInputs[0].setValue("新規");
        await createInputs[1].setValue("new@example.com");
        await wrapper.get("form").trigger("submit");
        await flushPromises();
        expect(wrapper.text()).toContain("new@example.com");

        const emailInputs = wrapper.findAll('input[type="email"]');
        await emailInputs[1].setValue("updated@example.com");
        const textInputs = wrapper.findAll('input[type="text"]');
        await textInputs[1].setValue("更新総合");
        const buttons = wrapper.findAll('button[type="button"]');
        await buttons[0].trigger("click");
        await flushPromises();
        expect(wrapper.text()).toContain("更新総合");

        await buttons[3].trigger("click");
        await flushPromises();
        expect(confirmMock).toHaveBeenCalledWith("安全(safety@example.com)を削除しますか？");
        expect(wrapper.text()).not.toContain("安全");
    });

    it("does not delete contact categories when confirmation is cancelled", async () => {
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
                { path: "/staff/contact-categories", component: StaffContactCategoriesPage },
            ],
        });
        await router.push("/staff/contact-categories");
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
                const method = init?.method ?? "GET";

                if (url.endsWith("/staff/status") && method === "GET") {
                    return new Response(JSON.stringify({ allowed: true, authorized: true }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                if (url.endsWith("/staff/contact-categories") && method === "GET") {
                    return new Response(
                        JSON.stringify([
                            { id: "category-1", name: "総合", email: "general@example.com" },
                            { id: "category-2", name: "安全", email: "safety@example.com" },
                        ]),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }
                if (url.endsWith("/staff/contact-categories/category-2") && method === "DELETE") {
                    deleteRequests.push(url);
                    return new Response(null, { status: 204 });
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(StaffContactCategoriesPage, {
            global: { plugins: [pinia, router, createQueryPlugin()] },
        });
        await flushPromises();

        const buttons = wrapper.findAll('button[type="button"]');
        await buttons[3].trigger("click");
        await flushPromises();

        expect(confirmMock).toHaveBeenCalledWith("安全(safety@example.com)を削除しますか？");
        expect(deleteRequests).toHaveLength(0);
        expect(wrapper.text()).toContain("安全");
    });
});
