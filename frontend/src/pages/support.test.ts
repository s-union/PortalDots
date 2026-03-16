import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import SupportPage from "./support.vue";

describe("SupportPage", () => {
    it("shows recommended browser guidance", async () => {
        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/", component: { template: "<div>home</div>" } },
                { path: "/support", component: SupportPage },
            ],
        });
        await router.push("/support");
        await router.isReady();

        const wrapper = mount(SupportPage, {
            global: {
                plugins: [router],
            },
        });

        expect(wrapper.text()).toContain("ブラウザ環境について");
        expect(wrapper.text()).toContain("Microsoft Edge 最新版");
        expect(wrapper.text()).toContain("PortalDots は以下の環境での利用を推奨しています。");
        expect(wrapper.get('a[href="/"]').text()).toContain("ホームへ戻る");
    });
});
