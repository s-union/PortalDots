import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createRouter, createMemoryHistory } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import CircleMembersPage from "./members.vue";

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
    notes: "",
    invitationToken: "invite-token-xyz",
    submittedAt: null,
};

const membersFixture = [
    { userId: "leader-user", displayName: "リーダーさん", isLeader: true },
    { userId: "member-user", displayName: "メンバーさん", isLeader: false },
];

function buildFetchMock(
    options: {
        members?: object[];
        removeShouldSucceed?: boolean;
    } = {},
) {
    const { members = membersFixture, removeShouldSucceed = true } = options;

    return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        await Promise.resolve();
        const url =
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method ?? "GET";

        if (url.endsWith("/circles/current/detail") && method === "GET") {
            return new Response(JSON.stringify(circleDetailFixture), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        if (url.endsWith("/circles/current/members") && method === "GET") {
            return new Response(JSON.stringify(members), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        if (url.includes("/circles/current/members/") && method === "DELETE") {
            if (!removeShouldSucceed) {
                return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 });
            }
            return new Response(null, { status: 204 });
        }

        throw new Error(`Unexpected request: ${method} ${url}`);
    });
}

describe("CircleMembersPage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    function setupTest(userId = "leader-user") {
        const pinia = createPinia();
        setActivePinia(pinia);
        const sessionStore = useSessionStore();
        sessionStore.hydrate({
            csrfToken: "csrf-token",
            currentCircle: { id: "circle-a", name: "テスト企画A" },
            featureFlags: [],
            roles: ["participant"],
            user: { id: userId, displayName: "Demo User" },
        });

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                {
                    path: "/workspace/circles/detail",
                    component: { template: "<div>detail</div>" },
                },
                { path: "/workspace/circles/members", component: CircleMembersPage },
            ],
        });

        return { pinia, router };
    }

    it("renders member list", async () => {
        const { pinia, router } = setupTest();
        await router.push("/workspace/circles/members");
        await router.isReady();

        vi.stubGlobal("fetch", buildFetchMock());

        const wrapper = mount(CircleMembersPage, {
            global: { plugins: [pinia, router, createQueryPlugin()] },
        });
        await flushPromises();

        expect(wrapper.text()).toContain("リーダーさん");
        expect(wrapper.text()).toContain("メンバーさん");
        expect(wrapper.text()).toContain("リーダー");
        expect(wrapper.text()).toContain("メンバー");
    });

    it("shows empty state when no members", async () => {
        const { pinia, router } = setupTest();
        await router.push("/workspace/circles/members");
        await router.isReady();

        vi.stubGlobal("fetch", buildFetchMock({ members: [] }));

        const wrapper = mount(CircleMembersPage, {
            global: { plugins: [pinia, router, createQueryPlugin()] },
        });
        await flushPromises();

        expect(wrapper.text()).toContain("メンバーがいません");
    });

    it("shows delete button for non-leader members when current user is leader", async () => {
        const { pinia, router } = setupTest("leader-user");
        await router.push("/workspace/circles/members");
        await router.isReady();

        vi.stubGlobal("fetch", buildFetchMock());

        const wrapper = mount(CircleMembersPage, {
            global: { plugins: [pinia, router, createQueryPlugin()] },
        });
        await flushPromises();

        const deleteButtons = wrapper
            .findAll('button[type="button"]')
            .filter((b) => b.text() === "削除");
        // リーダー自身は削除できないので、メンバー分だけ削除ボタンが出る
        expect(deleteButtons).toHaveLength(1);
    });

    it("removes a member after confirmation", async () => {
        const { pinia, router } = setupTest("leader-user");
        await router.push("/workspace/circles/members");
        await router.isReady();

        vi.stubGlobal(
            "confirm",
            vi.fn(() => true),
        );
        vi.stubGlobal("fetch", buildFetchMock());

        const wrapper = mount(CircleMembersPage, {
            global: { plugins: [pinia, router, createQueryPlugin()] },
        });
        await flushPromises();

        const deleteButton = wrapper
            .findAll('button[type="button"]')
            .find((b) => b.text() === "削除");
        if (!deleteButton) throw new Error("delete button not found");
        await deleteButton.trigger("click");
        await flushPromises();

        // エラーが表示されないことを確認
        expect(wrapper.text()).not.toContain("メンバーの削除に失敗しました");
    });

    it("shows error when member removal fails", async () => {
        const { pinia, router } = setupTest("leader-user");
        await router.push("/workspace/circles/members");
        await router.isReady();

        vi.stubGlobal(
            "confirm",
            vi.fn(() => true),
        );
        vi.stubGlobal("fetch", buildFetchMock({ removeShouldSucceed: false }));

        const wrapper = mount(CircleMembersPage, {
            global: { plugins: [pinia, router, createQueryPlugin()] },
        });
        await flushPromises();

        const deleteButton = wrapper
            .findAll('button[type="button"]')
            .find((b) => b.text() === "削除");
        if (!deleteButton) throw new Error("delete button not found");
        await deleteButton.trigger("click");
        await flushPromises();

        expect(wrapper.text()).toContain("メンバーの削除に失敗しました");
    });
});
