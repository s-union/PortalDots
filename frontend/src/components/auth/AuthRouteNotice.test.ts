import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import AuthRouteNotice from "./AuthRouteNotice.vue";

async function mountNotice() {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: "/", component: { template: "<div>home</div>" } },
            { path: "/login", component: { template: "<div>login</div>" } },
            { path: "/workspace/settings", component: { template: "<div>settings</div>" } },
        ],
    });

    await router.push("/");
    await router.isReady();

    return mount(AuthRouteNotice, {
        props: {
            title: "認証導線テスト",
            lead: "lead text",
            body: "body text",
            notes: ["note 1", "note 2"],
            actions: [
                { label: "ログイン画面へ", to: "/login", variant: "primary" },
                { label: "設定へ", to: "/workspace/settings" },
            ],
        },
        global: {
            plugins: [router],
        },
    });
}

describe("AuthRouteNotice", () => {
    it("renders notes and action links", async () => {
        const wrapper = await mountNotice();

        expect(wrapper.text()).toContain("認証導線テスト");
        expect(wrapper.text()).toContain("lead text");
        expect(wrapper.text()).toContain("body text");
        expect(wrapper.text()).toContain("note 1");
        expect(wrapper.get('a[href="/login"]').text()).toContain("ログイン画面へ");
        expect(wrapper.get('a[href="/workspace/settings"]').text()).toContain("設定へ");
    });
});
