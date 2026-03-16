import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import StaffSettingsPage from "./settings.vue";

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

describe("StaffSettingsPage", () => {
    it("shows staff settings hub links including static helper pages", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        const sessionStore = useSessionStore();
        sessionStore.hydrate({
            csrfToken: "csrf-token",
            currentCircle: { id: "circle-b", name: "デモ企画B" },
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
                { path: "/staff/settings", component: StaffSettingsPage },
                {
                    path: "/staff/contact-categories",
                    component: { template: "<div>contacts</div>" },
                },
                { path: "/staff/tags", component: { template: "<div>tags</div>" } },
                { path: "/staff/places", component: { template: "<div>places</div>" } },
                { path: "/staff/settings/portal", component: { template: "<div>portal</div>" } },
                { path: "/staff/exports", component: { template: "<div>exports</div>" } },
                { path: "/staff/about", component: { template: "<div>about</div>" } },
                { path: "/staff/markdown-guide", component: { template: "<div>markdown</div>" } },
            ],
        });
        await router.push("/staff/settings");
        await router.isReady();

        const wrapper = mount(StaffSettingsPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });

        expect(wrapper.text()).toContain("PortalDots の設定");
        expect(wrapper.text()).toContain("デモ企画B");
        expect(wrapper.text()).toContain("Portal 設定");
        expect(wrapper.text()).toContain("PortalDots について");
        expect(wrapper.text()).toContain("Markdown ガイド");
    });
});
