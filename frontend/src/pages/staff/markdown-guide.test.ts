import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import StaffMarkdownGuidePage from "./markdown-guide.vue";

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

describe("StaffMarkdownGuidePage", () => {
    it("shows common markdown examples", async () => {
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

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/staff", component: { template: "<div>staff</div>" } },
                { path: "/staff/markdown-guide", component: StaffMarkdownGuidePage },
            ],
        });
        await router.push("/staff/markdown-guide");
        await router.isReady();

        const wrapper = mount(StaffMarkdownGuidePage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });

        expect(wrapper.text()).toContain("Markdown ガイド");
        expect(wrapper.text()).toContain("見出し");
        expect(wrapper.text()).toContain("箇条書き");
        expect(wrapper.text()).toContain("[ここをクリック](https://www.google.com)");
    });
});
