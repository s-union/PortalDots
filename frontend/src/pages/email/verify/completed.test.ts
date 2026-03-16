import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import { useSessionStore } from "@/features/session/store";
import EmailVerifyCompletedPage from "./completed.vue";

async function mountAtCompleted() {
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
            { path: "/workspace", component: { template: "<div>workspace</div>" } },
            { path: "/email/verify/completed", component: EmailVerifyCompletedPage },
        ],
    });

    await router.push("/email/verify/completed");
    await router.isReady();

    return mount(EmailVerifyCompletedPage, {
        global: {
            plugins: [pinia, router],
        },
    });
}

describe("EmailVerifyCompletedPage", () => {
    it("shows the migrated completion guidance", async () => {
        const wrapper = await mountAtCompleted();

        expect(wrapper.text()).toContain("メール認証の完了案内");
        expect(wrapper.text()).toContain("表示専用の完了画面に依存しない導線");
        expect(wrapper.get('a[href="/"]').text()).toContain("ホームへ戻る");
    });
});
