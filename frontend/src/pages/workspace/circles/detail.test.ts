import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createRouter, createMemoryHistory } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import CircleDetailPage from "./detail.vue";

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

const circleDetailFixture = {
    id: "circle-a",
    name: "テスト企画A",
    nameYomi: "てすときかくえー",
    groupName: "テスト大学",
    groupNameYomi: "てすとだいがく",
    participationTypeId: "pt-exhibit",
    participationTypeName: "展示",
    notes: "備考テキスト",
    invitationToken: "token-abc",
    submittedAt: null,
};

function buildFetchMock(
    overrides: {
        detail?: object;
        updateShouldSucceed?: boolean;
        deleteShouldSucceed?: boolean;
        submitShouldSucceed?: boolean;
    } = {},
) {
    const { updateShouldSucceed = true, deleteShouldSucceed = true } = overrides;
    const detail = overrides.detail ?? circleDetailFixture;

    return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        await Promise.resolve();
        const url =
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method ?? "GET";

        if (url.endsWith("/circles/current/detail") && method === "GET") {
            return new Response(JSON.stringify(detail), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        if (url.endsWith("/circles/current/detail") && method === "PUT") {
            if (!updateShouldSucceed) {
                return new Response(JSON.stringify({ message: "Validation failed", errors: {} }), {
                    status: 422,
                    headers: { "Content-Type": "application/json" },
                });
            }
            return new Response(JSON.stringify({ ...detail, name: "更新後企画A" }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        if (url.endsWith("/circles/current") && method === "DELETE") {
            if (!deleteShouldSucceed) {
                return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 });
            }
            return new Response(null, { status: 204 });
        }

        if (url.endsWith("/circles/current/submit") && method === "POST") {
            return new Response(
                JSON.stringify({ ...detail, submittedAt: "2026-03-15T00:00:00Z" }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        if (url.endsWith("/session/bootstrap") && method === "GET") {
            return new Response(
                JSON.stringify({
                    csrfToken: "csrf-token",
                    currentCircle: null,
                    featureFlags: [],
                    roles: ["participant"],
                    user: { id: "demo-user", displayName: "Demo User" },
                }),
                { status: 200, headers: { "Content-Type": "application/json" } },
            );
        }

        throw new Error(`Unexpected request: ${method} ${url}`);
    });
}

describe("CircleDetailPage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    function setupTest() {
        const pinia = createPinia();
        setActivePinia(pinia);
        const sessionStore = useSessionStore();
        sessionStore.hydrate({
            csrfToken: "csrf-token",
            currentCircle: { id: "circle-a", name: "テスト企画A" },
            featureFlags: [],
            roles: ["participant"],
            user: { id: "demo-user", displayName: "Demo User" },
        });

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/workspace", component: { template: "<div>workspace</div>" } },
                { path: "/workspace/circles/detail", component: CircleDetailPage },
                {
                    path: "/workspace/circles/members",
                    component: { template: "<div>members</div>" },
                },
            ],
        });

        return { pinia, router };
    }

    it("renders circle detail data", async () => {
        const { pinia, router } = setupTest();
        await router.push("/workspace/circles/detail");
        await router.isReady();

        vi.stubGlobal("fetch", buildFetchMock());

        const wrapper = mount(CircleDetailPage, {
            global: { plugins: [pinia, router, createQueryPlugin()] },
        });
        await flushPromises();

        // 参加種別名と提出状態はテキストとして表示される
        expect(wrapper.text()).toContain("展示");
        expect(wrapper.text()).toContain("未提出");
        // 企画名・団体名はinput valueにセットされる
        const inputs = wrapper.findAll('input[type="text"]');
        expect(inputs[0].element.value).toBe("テスト企画A");
        expect(inputs[2].element.value).toBe("テスト大学");
    });

    it("shows submitted status when submittedAt is set", async () => {
        const { pinia, router } = setupTest();
        await router.push("/workspace/circles/detail");
        await router.isReady();

        vi.stubGlobal(
            "fetch",
            buildFetchMock({
                detail: { ...circleDetailFixture, submittedAt: "2026-03-10T00:00:00Z" },
            }),
        );

        const wrapper = mount(CircleDetailPage, {
            global: { plugins: [pinia, router, createQueryPlugin()] },
        });
        await flushPromises();

        expect(wrapper.text()).toContain("提出済み");
        // 提出ボタンは表示されないはず
        const submitButton = wrapper
            .findAll('button[type="button"]')
            .find((b) => b.text().includes("参加登録を提出"));
        expect(submitButton).toBeUndefined();
    });

    it("saves circle information successfully", async () => {
        const { pinia, router } = setupTest();
        await router.push("/workspace/circles/detail");
        await router.isReady();

        vi.stubGlobal("fetch", buildFetchMock());

        const wrapper = mount(CircleDetailPage, {
            global: { plugins: [pinia, router, createQueryPlugin()] },
        });
        await flushPromises();

        const saveButton = wrapper
            .findAll('button[type="button"]')
            .find((b) => b.text().includes("変更を保存"));
        if (!saveButton) throw new Error("save button not found");
        await saveButton.trigger("click");
        await flushPromises();

        expect(wrapper.text()).toContain("企画情報を更新しました");
    });

    it("shows error when save fails", async () => {
        const { pinia, router } = setupTest();
        await router.push("/workspace/circles/detail");
        await router.isReady();

        vi.stubGlobal("fetch", buildFetchMock({ updateShouldSucceed: false }));

        const wrapper = mount(CircleDetailPage, {
            global: { plugins: [pinia, router, createQueryPlugin()] },
        });
        await flushPromises();

        const saveButton = wrapper
            .findAll('button[type="button"]')
            .find((b) => b.text().includes("変更を保存"));
        if (!saveButton) throw new Error("save button not found");
        await saveButton.trigger("click");
        await flushPromises();

        expect(wrapper.text()).toContain("企画情報の更新に失敗しました");
    });

    it("deletes circle and navigates to workspace", async () => {
        const { pinia, router } = setupTest();
        await router.push("/workspace/circles/detail");
        await router.isReady();

        vi.stubGlobal(
            "confirm",
            vi.fn(() => true),
        );
        vi.stubGlobal("fetch", buildFetchMock());

        const wrapper = mount(CircleDetailPage, {
            global: { plugins: [pinia, router, createQueryPlugin()] },
        });
        await flushPromises();

        const deleteButton = wrapper
            .findAll('button[type="button"]')
            .find((b) => b.text().includes("企画を削除"));
        if (!deleteButton) throw new Error("delete button not found");
        await deleteButton.trigger("click");
        await flushPromises();

        expect(router.currentRoute.value.path).toBe("/workspace");
    });

    it("does not delete when user cancels confirmation", async () => {
        const { pinia, router } = setupTest();
        await router.push("/workspace/circles/detail");
        await router.isReady();

        vi.stubGlobal(
            "confirm",
            vi.fn(() => false),
        );
        vi.stubGlobal("fetch", buildFetchMock());

        const wrapper = mount(CircleDetailPage, {
            global: { plugins: [pinia, router, createQueryPlugin()] },
        });
        await flushPromises();

        const deleteButton = wrapper
            .findAll('button[type="button"]')
            .find((b) => b.text().includes("企画を削除"));
        if (!deleteButton) throw new Error("delete button not found");
        await deleteButton.trigger("click");
        await flushPromises();

        expect(router.currentRoute.value.path).toBe("/workspace/circles/detail");
    });
});
