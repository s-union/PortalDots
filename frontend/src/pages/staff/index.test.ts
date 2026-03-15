import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import StaffDashboardPage from "./index.vue";

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

describe("StaffDashboardPage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("shows staff management entry points", async () => {
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
                { path: "/staff", component: StaffDashboardPage },
                { path: "/staff/circles", component: { template: "<div>staff circles</div>" } },
                {
                    path: "/staff/participation-types",
                    component: { template: "<div>participation types</div>" },
                },
                {
                    path: "/staff/activity-logs",
                    component: { template: "<div>activity logs</div>" },
                },
                { path: "/staff/pages", component: { template: "<div>staff pages</div>" } },
                { path: "/staff/documents", component: { template: "<div>staff documents</div>" } },
                { path: "/staff/tags", component: { template: "<div>staff tags</div>" } },
                { path: "/staff/places", component: { template: "<div>staff places</div>" } },
                {
                    path: "/staff/contact-categories",
                    component: { template: "<div>staff contact categories</div>" },
                },
                { path: "/staff/forms", component: { template: "<div>staff forms</div>" } },
                { path: "/staff/settings", component: { template: "<div>staff settings</div>" } },
                {
                    path: "/staff/permissions",
                    component: { template: "<div>staff permissions</div>" },
                },
                { path: "/staff/users", component: { template: "<div>staff users</div>" } },
                { path: "/staff/exports", component: { template: "<div>exports</div>" } },
                { path: "/staff/mails", component: { template: "<div>mails</div>" } },
                { path: "/circles/select", component: { template: "<div>circle selector</div>" } },
                { path: "/workspace", component: { template: "<div>workspace</div>" } },
            ],
        });
        await router.push("/staff");
        await router.isReady();

        const wrapper = mount(StaffDashboardPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });

        expect(wrapper.text()).toContain("スタッフ作業エリア");
        expect(wrapper.text()).toContain("お知らせ管理へ");
        expect(wrapper.text()).toContain("配布資料管理へ");
        expect(wrapper.text()).toContain("タグ管理へ");
        expect(wrapper.text()).toContain("場所管理へ");
        expect(wrapper.text()).toContain("問い合わせカテゴリ管理へ");
        expect(wrapper.text()).toContain("企画管理へ");
        expect(wrapper.text()).toContain("参加種別管理へ");
        expect(wrapper.text()).toContain("フォーム管理へ");
        expect(wrapper.text()).toContain("PortalDots 設定へ");
        expect(wrapper.text()).toContain("権限設定へ");
        expect(wrapper.text()).toContain("ユーザー管理へ");
        expect(wrapper.text()).toContain("CSV / ZIP 出力へ");
        expect(wrapper.text()).toContain("活動ログへ");
        expect(wrapper.text()).toContain("メールキューへ");
    });
});
