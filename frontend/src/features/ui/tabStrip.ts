import type { RouteLocationRaw } from "vue-router";

export type TabStripTone = "primary" | "muted" | "danger";

export type TabStripItem = {
    label: string;
    active?: boolean;
    href?: string;
    to?: RouteLocationRaw;
    badge?: string;
    badgeTone?: TabStripTone;
};

export type UserSettingsTab = "general" | "appearance" | "password" | "delete";

export function buildHomeModeTabs(isStaffPage: boolean): TabStripItem[] {
    return [
        { label: "一般モード", to: "/", active: !isStaffPage },
        { label: "スタッフモード", to: "/staff", active: isStaffPage },
    ];
}

export function buildUserSettingsTabs(activeTab: UserSettingsTab): TabStripItem[] {
    return [
        { label: "一般", to: "/workspace/settings", active: activeTab === "general" },
        { label: "外観", to: "/workspace/settings/appearance", active: activeTab === "appearance" },
        {
            label: "パスワード変更",
            to: "/workspace/settings/password",
            active: activeTab === "password",
        },
        {
            label: "アカウント削除",
            to: "/workspace/settings/delete",
            active: activeTab === "delete",
        },
    ];
}

export function buildStaffParticipationTypeTabs(
    typeId: string,
    activeHash: string,
    form?: { isPublic: boolean; isOpen: boolean },
): TabStripItem[] {
    const currentHash = activeHash || "#participation-type-section";
    const formBadge =
        form === undefined
            ? undefined
            : !form.isPublic
              ? { badge: "非公開", badgeTone: "muted" as const }
              : !form.isOpen
                ? { badge: "受付期間外", badgeTone: "muted" as const }
                : { badge: "受付期間内", badgeTone: "primary" as const };

    return [
        {
            label: "企画一覧",
            to: {
                path: `/staff/participation-types/${encodeURIComponent(typeId)}`,
                hash: "#circles-section",
            },
            active: currentHash === "#circles-section",
        },
        {
            label: "参加種別を編集",
            to: {
                path: `/staff/participation-types/${encodeURIComponent(typeId)}`,
                hash: "#participation-type-section",
            },
            active: currentHash === "#participation-type-section",
        },
        {
            label: "参加登録フォームの設定",
            to: {
                path: `/staff/participation-types/${encodeURIComponent(typeId)}`,
                hash: "#form-settings-section",
            },
            active: currentHash === "#form-settings-section",
            ...formBadge,
        },
    ];
}

export function buildStaffFormTabs(
    formId: string,
    activeTab: "answers" | "editor" | "settings",
): TabStripItem[] {
    const basePath = `/staff/forms/${encodeURIComponent(formId)}`;

    return [
        {
            label: "回答",
            to: `/staff/forms/${encodeURIComponent(formId)}/answers`,
            active: activeTab === "answers",
        },
        {
            label: "エディター",
            to: { path: basePath, hash: "#editor-panel" },
            active: activeTab === "editor",
        },
        {
            label: "設定",
            to: { path: basePath, hash: "#settings-panel" },
            active: activeTab === "settings",
        },
    ];
}
