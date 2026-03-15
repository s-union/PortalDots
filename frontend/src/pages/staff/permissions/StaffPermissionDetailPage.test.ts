import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import StaffPermissionDetailPage from "./StaffPermissionDetailPage.vue";

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

describe("StaffPermissionDetailPage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("renders and updates staff permissions", async () => {
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
            roles: ["admin"],
            permissions: ["staff.permissions"],
            user: {
                id: "staff-user",
                displayName: "Staff User",
            },
        });

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/staff/permissions", component: { template: "<div>permissions</div>" } },
                { path: "/staff/permissions/:userId", component: StaffPermissionDetailPage },
            ],
        });
        await router.push("/staff/permissions/content-user");
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
                const method = init?.method ?? "GET";

                if (url.endsWith("/staff/status") && method === "GET") {
                    return jsonResponse({ allowed: true, authorized: true });
                }

                if (url.endsWith("/staff/permissions/content-user") && method === "GET") {
                    return jsonResponse(buildPermissionDetail("staff.pages.read"));
                }

                if (url.endsWith("/staff/permissions/content-user") && method === "PUT") {
                    return jsonResponse(buildPermissionDetail("staff.forms.read"));
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(StaffPermissionDetailPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        expect(wrapper.text()).toContain("Content User");
        await wrapper.get('input[type="checkbox"]').setValue(true);
        await wrapper.get('button[type="submit"]').trigger("submit");
        await flushPromises();

        expect(wrapper.text()).toContain("スタッフ権限を更新しました。");
    });
});

function buildPermissionDetail(permissionName: string) {
    return {
        user: {
            id: "content-user",
            displayName: "Content User",
            loginIds: ["content@example.com"],
            roles: ["content_manager"],
            permissions: [
                {
                    name: permissionName,
                    group: "お知らせ管理",
                    displayName: "スタッフモード › お知らせ管理 › 閲覧と編集",
                    shortName: "お知らせ(編集)",
                    description: "pages",
                },
            ],
            isEditable: true,
        },
        definedPermissions: [
            {
                name: "staff.forms.read",
                group: "申請管理",
                displayName: "スタッフモード › 申請管理 › フォームの閲覧",
                shortName: "申請(フォームの閲覧)",
                description: "forms",
            },
        ],
        assignedPermissionNames: [permissionName],
    };
}

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
