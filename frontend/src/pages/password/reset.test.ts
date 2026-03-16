import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import PasswordResetPage from "./reset.vue";

async function mountAtPasswordReset() {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: "/", component: { template: "<div>home</div>" } },
            { path: "/login", component: { template: "<div>login</div>" } },
            { path: "/password/reset", component: PasswordResetPage },
        ],
    });

    await router.push("/password/reset");
    await router.isReady();

    return mount(PasswordResetPage, {
        global: {
            plugins: [router],
        },
    });
}

describe("PasswordResetPage", () => {
    it("shows reset guidance without email flow", async () => {
        const wrapper = await mountAtPasswordReset();

        expect(wrapper.text()).toContain("パスワード再設定");
        expect(wrapper.text()).toContain("旧 Laravel URL は移植せず");
        expect(wrapper.text()).toContain("本番メール送信は行いません");
        expect(wrapper.get('a[href="/login"]').text()).toContain("ログイン画面へ");
    });
});
