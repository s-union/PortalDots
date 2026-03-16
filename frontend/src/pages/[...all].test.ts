import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createRouter, createMemoryHistory } from "vue-router";
import NotFoundPage from "./[...all].vue";

async function mountAt(path: string) {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: "/", component: { template: "<div>home</div>" } },
            { path: "/workspace/pages", component: { template: "<div>pages</div>" } },
            { path: "/workspace/pages/:pageId", component: { template: "<div>page</div>" } },
            { path: "/workspace/documents", component: { template: "<div>documents</div>" } },
            { path: "/:all(.*)", component: NotFoundPage },
        ],
    });

    await router.push(path);
    await router.isReady();

    return mount(NotFoundPage, {
        global: {
            plugins: [router],
        },
    });
}

describe("NotFoundPage", () => {
    it("shows the support page guidance on the legacy support route", async () => {
        const wrapper = await mountAt("/support");

        expect(wrapper.text()).toContain("ブラウザ環境について");
        expect(wrapper.text()).toContain("Microsoft Edge 最新版");
    });

    it("shows the privacy policy markdown on the legacy privacy route", async () => {
        const wrapper = await mountAt("/privacy_policy");

        expect(wrapper.text()).toContain("プライバシーポリシー");
        expect(wrapper.text()).toContain("第５条　Cookieについて");
    });

    it("guides legacy page detail URLs to the workspace page detail", async () => {
        const wrapper = await mountAt("/pages/page-circle-a-1");
        const pageLink = wrapper.get('a[href="/workspace/pages/page-circle-a-1"]');

        expect(wrapper.text()).toContain("お知らせの導線が移動しました");
        expect(pageLink.text()).toContain("このお知らせを開く");
    });

    it("guides legacy document detail URLs to the API download route", async () => {
        const wrapper = await mountAt("/documents/document-circle-a-1");
        const downloadLink = wrapper.get(
            'a[href="http://127.0.0.1:8081/v1/documents/document-circle-a-1"]',
        );

        expect(wrapper.text()).toContain("配布資料の導線が移動しました");
        expect(downloadLink.text()).toContain("この資料を直接開く");
    });

    it("keeps the generic 404 for unrelated routes", async () => {
        const wrapper = await mountAt("/definitely-missing");

        expect(wrapper.text()).toContain("ページが見つかりません");
        expect(wrapper.text()).not.toContain("Legacy Route");
    });
});
