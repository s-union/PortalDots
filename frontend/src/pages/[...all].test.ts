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

    it("guides the legacy register route to migrated auth guidance", async () => {
        const wrapper = await mountAt("/register");
        const primaryLink = wrapper.get('a[href="/login"]');

        expect(wrapper.text()).toContain("認証導線は移行中です");
        expect(wrapper.text()).toContain("まだ新規ユーザー登録フォームを提供していません");
        expect(primaryLink.text()).toContain("ログイン画面へ戻る");
    });

    it("guides the legacy password reset route to migrated auth guidance", async () => {
        const wrapper = await mountAt("/password/reset");
        const primaryLink = wrapper.get('a[href="/login"]');

        expect(wrapper.text()).toContain("パスワード再設定は移行中です");
        expect(wrapper.text()).toContain(
            "現在の migrated stack ではメール送信付きの再設定開始フローをまだ提供していません",
        );
        expect(primaryLink.text()).toContain("ログイン画面へ戻る");
    });

    it("guides the legacy signed password reset route to reset instructions", async () => {
        const wrapper = await mountAt("/password/reset/user-123");
        const primaryLink = wrapper.get('a[href="/password/reset"]');

        expect(wrapper.text()).toContain("legacy の署名付きパスワード再設定リンク");
        expect(wrapper.text()).toContain("ワークスペースの設定画面からパスワードを変更できます");
        expect(primaryLink.text()).toContain("再設定方法の案内を見る");
    });

    it("guides the legacy user settings route to workspace settings", async () => {
        const wrapper = await mountAt("/user/password");
        const primaryLink = wrapper.get('a[href="/workspace/settings"]');

        expect(wrapper.text()).toContain("ユーザー設定の導線が移動しました");
        expect(wrapper.text()).toContain("ワークスペースのユーザー設定では");
        expect(primaryLink.text()).toContain("ユーザー設定へ");
    });

    it("guides the legacy selector route to the migrated circle selector", async () => {
        const wrapper = await mountAt("/selector");
        const primaryLink = wrapper.get('a[href="/circles/select"]');

        expect(wrapper.text()).toContain("企画セレクターの導線が移動しました");
        expect(wrapper.text()).toContain("企画選択画面へ統合されています");
        expect(primaryLink.text()).toContain("企画選択画面へ");
    });

    it("preserves legacy selector redirect_to when linking to migrated selector", async () => {
        const wrapper = await mountAt(
            "/selector?redirect_to=%2Fworkspace%2Fforms%2Fform-1%3Fanswer%3Danswer-1",
        );
        const primaryLink = wrapper.get(
            'a[href="/circles/select?redirect=/workspace/forms/form-1?answer=answer-1"]',
        );

        expect(wrapper.text()).toContain(
            "/workspace/forms/form-1?answer=answer-1 へ戻って作業を続けられます",
        );
        expect(primaryLink.text()).toContain("企画選択画面へ");
    });

    it("guides the legacy logout route to login", async () => {
        const wrapper = await mountAt("/logout");
        const primaryLink = wrapper.get('a[href="/login"]');

        expect(wrapper.text()).toContain("ログアウト導線が変わりました");
        expect(wrapper.text()).toContain("旧 `/logout` の GET 導線は廃止し");
        expect(primaryLink.text()).toContain("ログイン画面へ");
    });

    it("guides the legacy contacts route to workspace contact", async () => {
        const wrapper = await mountAt("/contacts");
        const primaryLink = wrapper.get('a[href="/workspace/contact"]');

        expect(wrapper.text()).toContain("お問い合わせ導線が移動しました");
        expect(wrapper.text()).toContain("ワークスペース配下のお問い合わせ画面へ移動しています");
        expect(primaryLink.text()).toContain("お問い合わせ画面へ");
    });

    it("guides the legacy circle create route to migrated circle creation", async () => {
        const wrapper = await mountAt("/circles/create");
        const primaryLink = wrapper.get('a[href="/circles/new"]');

        expect(wrapper.text()).toContain("企画作成の導線が移動しました");
        expect(wrapper.text()).toContain("新しい企画作成画面へ置き換えています");
        expect(primaryLink.text()).toContain("企画作成画面へ");
    });

    it("preserves legacy participation_type when guiding circle create", async () => {
        const wrapper = await mountAt("/circles/create?participation_type=pt-food");
        const primaryLink = wrapper.get('a[href="/circles/new?participation_type=pt-food"]');

        expect(wrapper.text()).toContain("legacy で指定されていた参加種別 pt-food を引き継ぎます");
        expect(primaryLink.text()).toContain("企画作成画面へ");
    });

    it("guides the legacy email verification notice route", async () => {
        const wrapper = await mountAt("/email/verify");
        const primaryLink = wrapper.get('a[href="/login"]');

        expect(wrapper.text()).toContain("メール認証導線は移行中です");
        expect(wrapper.text()).toContain("確認メール再送と認証状況の確認");
        expect(primaryLink.text()).toContain("ログイン画面へ");
    });

    it("guides the legacy email verification completed route", async () => {
        const wrapper = await mountAt("/email/verify/completed");
        const primaryLink = wrapper.get('a[href="/login"]');

        expect(wrapper.text()).toContain("legacy のメール認証完了画面");
        expect(wrapper.text()).toContain("ログイン導線を優先します");
        expect(primaryLink.text()).toContain("ログイン画面へ");
    });

    it("guides the legacy signed email verification route", async () => {
        const wrapper = await mountAt("/email/verify/email/user-123");
        const primaryLink = wrapper.get('a[href="/"]');

        expect(wrapper.text()).toContain("legacy の署名付きメール認証リンク");
        expect(wrapper.text()).toContain("認証種別: email / 対象ユーザー: user-123");
        expect(primaryLink.text()).toContain("ホームへ戻る");
    });

    it("guides the legacy circle detail route to workspace circle detail", async () => {
        const wrapper = await mountAt("/circles/circle-a");
        const primaryLink = wrapper.get('a[href="/workspace/circles/detail"]');

        expect(wrapper.text()).toContain("企画情報の導線が移動しました");
        expect(wrapper.text()).toContain("legacy の企画 ID: circle-a");
        expect(primaryLink.text()).toContain("企画情報画面へ");
    });

    it.each([
        "/circles/circle-a/edit",
        "/circles/circle-a/confirm",
        "/circles/circle-a/done",
        "/circles/circle-a/delete",
    ])("guides the legacy circle action route %s to workspace circle detail", async (path) => {
        const wrapper = await mountAt(path);
        const primaryLink = wrapper.get('a[href="/workspace/circles/detail"]');

        expect(wrapper.text()).toContain("企画情報の導線が移動しました");
        expect(wrapper.text()).toContain("legacy の企画 ID: circle-a");
        expect(primaryLink.text()).toContain("企画情報画面へ");
    });

    it("guides the legacy circle auth route to workspace circle detail", async () => {
        const wrapper = await mountAt("/circles/circle-a/auth");
        const primaryLink = wrapper.get('a[href="/workspace/circles/detail"]');

        expect(wrapper.text()).toContain(
            "旧 `/circles/:circle/auth` は、legacy では企画ごとの認証画面でした",
        );
        expect(wrapper.text()).toContain(
            "legacy の企画 ID: circle-a を含む認証付きブックマークです",
        );
        expect(primaryLink.text()).toContain("企画情報画面へ");
    });

    it("guides the legacy circle members route to workspace members", async () => {
        const wrapper = await mountAt("/circles/circle-a/users");
        const primaryLink = wrapper.get('a[href="/workspace/circles/members"]');

        expect(wrapper.text()).toContain("メンバー管理の導線が移動しました");
        expect(wrapper.text()).toContain("legacy の企画 ID: circle-a");
        expect(primaryLink.text()).toContain("メンバー管理画面へ");
    });

    it("guides the legacy circle invite route to migrated invite acceptance", async () => {
        const wrapper = await mountAt("/circles/circle-a/users/invite/invite-token");
        const primaryLink = wrapper.get('a[href="/circles/join/invite-token"]');

        expect(wrapper.text()).toContain("招待受け入れの導線が移動しました");
        expect(wrapper.text()).toContain("legacy の企画 ID: circle-a / 招待トークン: invite-token");
        expect(primaryLink.text()).toContain("招待受け入れ画面へ");
    });

    it("keeps the generic 404 for unrelated routes", async () => {
        const wrapper = await mountAt("/definitely-missing");

        expect(wrapper.text()).toContain("ページが見つかりません");
        expect(wrapper.text()).not.toContain("Legacy Route");
    });
});
