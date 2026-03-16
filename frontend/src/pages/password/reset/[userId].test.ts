import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import PasswordResetSignedPage from "./[userId].vue";

async function mountAtSignedReset() {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: "/login", component: { template: "<div>login</div>" } },
            { path: "/password/reset", component: { template: "<div>reset</div>" } },
            { path: "/password/reset/:userId", component: PasswordResetSignedPage },
        ],
    });

    await router.push("/password/reset/user-123");
    await router.isReady();

    return mount(PasswordResetSignedPage, {
        global: {
            plugins: [router],
        },
    });
}

describe("PasswordResetSignedPage", () => {
    it("shows signed reset link guidance", async () => {
        const wrapper = await mountAtSignedReset();

        expect(wrapper.text()).toContain("署名付きパスワード再設定リンクです");
        expect(wrapper.text()).toContain("この旧 Laravel URL は利用せず");
        expect(wrapper.text()).toContain("署名付きメール経由の旧フローは移植していません");
        expect(wrapper.get('a[href="/password/reset"]').text()).toContain("再設定方法の案内を見る");
    });
});
