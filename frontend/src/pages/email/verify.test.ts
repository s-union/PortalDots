import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import { useSessionStore } from "@/features/session/store";
import EmailVerifyPage from "./verify.vue";

async function mountAtVerify() {
    const pinia = createPinia();
    setActivePinia(pinia);
    const sessionStore = useSessionStore();
    sessionStore.hydrate({
        csrfToken: "csrf-token",
        currentCircle: null,
        featureFlags: [],
        roles: ["participant"],
        user: {
            id: "demo-user",
            displayName: "Demo User",
        },
    });

    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: "/", component: { template: "<div>home</div>" } },
            { path: "/workspace/settings", component: { template: "<div>settings</div>" } },
            { path: "/email/verify", component: EmailVerifyPage },
        ],
    });

    await router.push("/email/verify");
    await router.isReady();

    return mount(EmailVerifyPage, {
        global: {
            plugins: [pinia, router],
        },
    });
}

describe("EmailVerifyPage", () => {
    it("shows logged-in verification guidance", async () => {
        const wrapper = await mountAtVerify();

        expect(wrapper.text()).toContain("メール認証");
        expect(wrapper.text()).toContain("Demo User として確認しています。");
        expect(wrapper.text()).toContain("旧 Laravel URL は移植せず");
        expect(wrapper.get('a[href="/workspace/settings"]').text()).toContain("ユーザー設定へ");
    });
});
