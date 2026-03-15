import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createRouter, createMemoryHistory } from "vue-router";
import WorkspacePage from "./index.vue";
import { useSessionStore } from "@/features/session/store";

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

describe("WorkspacePage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("shows the current circle details when one is selected", async () => {
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
                { path: "/workspace", component: WorkspacePage },
                { path: "/workspace/pages", component: { template: "<div>pages</div>" } },
                { path: "/workspace/documents", component: { template: "<div>documents</div>" } },
                { path: "/workspace/forms", component: { template: "<div>forms</div>" } },
                { path: "/workspace/contact", component: { template: "<div>contact</div>" } },
                { path: "/workspace/settings", component: { template: "<div>settings</div>" } },
                { path: "/circles/select", component: { template: "<div>circle selector</div>" } },
            ],
        });
        await router.push("/workspace");
        await router.isReady();

        const wrapper = mount(WorkspacePage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        expect(router.currentRoute.value.path).toBe("/workspace");
        expect(wrapper.text()).toContain("デモ企画A");
        expect(wrapper.text()).toContain("お問い合わせ");
        expect(wrapper.text()).toContain("ユーザー設定");
    });
});
