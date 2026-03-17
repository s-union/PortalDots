import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import PrivacyPolicyPage from "./privacy_policy.vue";

describe("PrivacyPolicyPage", () => {
    it("renders the privacy policy content", async () => {
        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/", component: { template: "<div>home</div>" } },
                { path: "/privacy_policy", component: PrivacyPolicyPage },
            ],
        });
        await router.push("/privacy_policy");
        await router.isReady();

        const wrapper = mount(PrivacyPolicyPage, {
            global: {
                plugins: [router],
            },
        });

        expect(wrapper.text()).toContain("プライバシーポリシー");
        expect(wrapper.text()).toContain("第５条　Cookieについて");
        expect(wrapper.text()).toContain("Googleアナリティクス");
    });
});
