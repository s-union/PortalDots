import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { useSessionStore } from "@/features/session/store";
import StaffExportsPage from "./StaffExportsPage.vue";

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

describe("StaffExportsPage", () => {
    it("shows current circle export links", async () => {
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
                { path: "/staff/exports", component: StaffExportsPage },
                { path: "/staff", component: { template: "<div>staff</div>" } },
            ],
        });
        await router.push("/staff/exports");
        await router.isReady();

        const wrapper = mount(StaffExportsPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });

        expect(wrapper.text()).toContain("デモ企画B");
        expect(wrapper.text()).toContain("CSV をダウンロード");
        expect(wrapper.text()).toContain("ZIP をダウンロード");
        const summaryLink = wrapper.get(
            'a[href="http://127.0.0.1:8081/v1/staff/exports/summary.csv"]',
        );
        expect(summaryLink.attributes("href")).toBe(
            "http://127.0.0.1:8081/v1/staff/exports/summary.csv",
        );
    });
});
