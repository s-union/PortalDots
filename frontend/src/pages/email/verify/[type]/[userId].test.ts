import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import EmailVerifyActionPage from "./[userId].vue";

async function mountAtVerifyAction() {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: "/", component: { template: "<div>home</div>" } },
            { path: "/login", component: { template: "<div>login</div>" } },
            { path: "/email/verify/:type/:userId", component: EmailVerifyActionPage },
        ],
    });

    await router.push("/email/verify/email/user-123");
    await router.isReady();

    return mount(EmailVerifyActionPage, {
        global: {
            plugins: [router],
        },
    });
}

describe("EmailVerifyActionPage", () => {
    it("shows signed verification link details", async () => {
        const wrapper = await mountAtVerifyAction();

        expect(wrapper.text()).toContain("署名付きメール認証リンクです");
        expect(wrapper.text()).toContain("認証種別: email");
        expect(wrapper.text()).toContain("対象ユーザー: user-123");
        expect(wrapper.get('a[href="/"]').text()).toContain("ホームへ戻る");
    });
});
