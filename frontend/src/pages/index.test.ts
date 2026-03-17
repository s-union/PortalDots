import { ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { mount, flushPromises } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createRouter, createMemoryHistory } from "vue-router";
import { useSessionStore } from "@/features/session/store";

const homeApiMocks = vi.hoisted(() => ({
    usePublicHomeQuery: vi.fn(),
    usePagesQuery: vi.fn(),
    useDocumentsPageQuery: vi.fn(),
    useFormsQuery: vi.fn(),
    useSelectableCirclesQuery: vi.fn(),
    useSelectCurrentCircleMutation: vi.fn(),
    useCurrentCircleDetailQuery: vi.fn(),
    useParticipationTypesQuery: vi.fn(),
}));

vi.mock("@/features/public-home/api", () => ({
    usePublicHomeQuery: homeApiMocks.usePublicHomeQuery,
}));

vi.mock("@/features/pages/api", () => ({
    usePagesQuery: homeApiMocks.usePagesQuery,
}));

vi.mock("@/features/documents/api", () => ({
    useDocumentsPageQuery: homeApiMocks.useDocumentsPageQuery,
}));

vi.mock("@/features/forms/api", () => ({
    useFormsQuery: homeApiMocks.useFormsQuery,
}));

vi.mock("@/features/circles/api", () => ({
    useSelectableCirclesQuery: homeApiMocks.useSelectableCirclesQuery,
    useSelectCurrentCircleMutation: homeApiMocks.useSelectCurrentCircleMutation,
    useCurrentCircleDetailQuery: homeApiMocks.useCurrentCircleDetailQuery,
}));

vi.mock("@/features/participation-types/api", () => ({
    useParticipationTypesQuery: homeApiMocks.useParticipationTypesQuery,
}));

import HomePage from "./index.vue";

function createTestRouter() {
    return createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: "/", component: HomePage },
            { path: "/login", component: { template: "<div>login</div>" } },
            { path: "/register", component: { template: "<div>register</div>" } },
            { path: "/public/pages", component: { template: "<div>public pages</div>" } },
            { path: "/public/pages/:pageId", component: { template: "<div>public page</div>" } },
            { path: "/public/documents", component: { template: "<div>public documents</div>" } },
            {
                path: "/public/documents/:documentId",
                component: { template: "<div>public document</div>" },
            },
            { path: "/workspace", component: { template: "<div>workspace</div>" } },
            { path: "/workspace/pages/:pageId", component: { template: "<div>page</div>" } },
            {
                path: "/workspace/documents/:documentId",
                component: { template: "<div>document</div>" },
            },
            { path: "/workspace/forms/:formId", component: { template: "<div>form</div>" } },
        ],
    });
}

function createQueryPlugin() {
    return [
        VueQueryPlugin,
        {
            queryClient: new QueryClient({
                defaultOptions: {
                    queries: { retry: false },
                },
            }),
        },
    ];
}

describe("HomePage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it("shows a login call-to-action when unauthenticated", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        homeApiMocks.useSelectableCirclesQuery.mockReturnValue({ data: ref([]) });
        homeApiMocks.useSelectCurrentCircleMutation.mockReturnValue({
            mutateAsync: vi.fn(),
            isPending: ref(false),
        });
        homeApiMocks.useCurrentCircleDetailQuery.mockReturnValue({ data: ref(null) });
        homeApiMocks.usePagesQuery.mockReturnValue({ data: ref([]), isPending: ref(false) });
        homeApiMocks.useDocumentsPageQuery.mockReturnValue({
            data: ref({ items: [], page: 1, pageSize: 3, total: 0 }),
            isPending: ref(false),
        });
        homeApiMocks.useFormsQuery.mockReturnValue({ data: ref([]), isPending: ref(false) });
        homeApiMocks.useParticipationTypesQuery.mockReturnValue({ data: ref([]) });
        homeApiMocks.usePublicHomeQuery.mockReturnValue({
            data: ref({
                appName: "門点祭ウェブシステム",
                portalDescription: "PortalDots デモサイトです。",
                portalAdminName: "PortalDots 実行委員会",
                portalContactEmail: "support@portaldots.com",
                loginMethods: [
                    {
                        roleLabel: "一般ユーザー",
                        loginId: "demo-circle",
                        password: "demo-circle",
                    },
                ],
                pinnedPages: [
                    {
                        id: "pinned-1",
                        title: "PortalDots デモサイトへようこそ！",
                        body: "デモサイトでは PortalDots のほぼ全機能をお試し利用することができます。",
                        publishedAt: "2022-03-27T15:05:00Z",
                        isLimited: false,
                        documents: [
                            {
                                id: "document-pinned-1",
                                name: "デモサイトへのログイン方法",
                                description: "",
                                isImportant: false,
                                extension: "PNG",
                                sizeBytes: 97320,
                                updatedAt: "2022-03-27T15:05:00Z",
                                downloadUrl: "/v1/public/documents/document-pinned-1",
                            },
                        ],
                    },
                ],
                participationTypes: [
                    {
                        id: "pt-1",
                        name: "模擬店",
                        description: "模擬店向け参加登録",
                        usersCountMin: 1,
                        usersCountMax: 5,
                        tags: ["模擬店"],
                        form: {
                            id: "form-pt-1",
                            name: "参加登録フォーム",
                            description: "参加登録受付中です。",
                            openAt: "2026-03-01T00:00:00Z",
                            closeAt: "2026-03-31T23:59:59Z",
                            isPublic: true,
                            isOpen: true,
                            maxAnswers: 1,
                            answerableTags: [],
                            confirmationMessage: "完了",
                        },
                    },
                ],
                pages: [
                    {
                        id: "page-1",
                        title: "お知らせサンプルです。",
                        summary: "このような形でお知らせを掲載できます。",
                        publishedAt: "2026-03-05T10:00:00Z",
                        isLimited: false,
                    },
                ],
                documents: [
                    {
                        id: "document-1",
                        name: "デモサイトへのログイン方法",
                        description: "配布資料PDFのサンプルです。",
                        isImportant: true,
                        isNew: true,
                        extension: "PNG",
                        sizeBytes: 97320,
                        updatedAt: "2026-03-02T09:00:00Z",
                        downloadUrl: "/v1/public/documents/document-1",
                    },
                ],
            }),
            isPending: ref(false),
        });

        const router = createTestRouter();
        await router.push("/");
        await router.isReady();

        const wrapper = mount(HomePage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });

        await flushPromises();

        await vi.waitFor(() => {
            expect(wrapper.text()).toContain("門点祭ウェブシステム");
            expect(wrapper.text()).toContain("PortalDots デモサイト");
            expect(wrapper.text()).toContain("ログイン方法");
            expect(wrapper.text()).toContain("PortalDots デモサイトへようこそ！");
            expect(wrapper.text()).toContain("demo-circle");
            expect(wrapper.text()).toContain("support@portaldots.com");
            expect(wrapper.text()).toContain("配布資料PDFのサンプルです。");
            expect(wrapper.get('a[href="/public/pages"]').text()).toContain("他のお知らせを見る");
            expect(wrapper.get('a[href="/public/documents"]').text()).toContain(
                "他の配布資料を見る",
            );
        });
    });

    it("allows the authenticated user to switch the current circle", async () => {
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

        homeApiMocks.usePublicHomeQuery.mockReturnValue({ data: ref(null), isPending: ref(false) });
        homeApiMocks.usePagesQuery.mockReturnValue({
            data: ref([
                {
                    id: "page-1",
                    title: "搬入時間のお知らせ",
                    publishedAt: "2026-03-05T10:00:00Z",
                },
            ]),
            isPending: ref(false),
        });
        homeApiMocks.useDocumentsPageQuery.mockReturnValue({
            data: ref({
                items: [
                    {
                        id: "document-1",
                        name: "搬入手順書",
                        description: "Aブロック向けの搬入手順です。",
                        isImportant: true,
                        isNew: true,
                        extension: "TXT",
                        sizeBytes: 1024,
                        updatedAt: "2026-03-02T09:00:00Z",
                        downloadUrl: "/v1/documents/document-1",
                    },
                ],
                page: 1,
                pageSize: 3,
                total: 1,
            }),
            isPending: ref(false),
        });
        homeApiMocks.useFormsQuery.mockReturnValue({
            data: ref([
                {
                    id: "form-1",
                    name: "搬入確認フォーム",
                    description: "搬入予定時刻と責任者情報を提出してください。",
                    openAt: "2026-03-01T00:00:00Z",
                    closeAt: "2026-03-20T23:59:59Z",
                    maxAnswers: 2,
                    isPublic: true,
                    isOpen: true,
                    hasAnswer: false,
                },
            ]),
            isPending: ref(false),
        });
        homeApiMocks.useSelectableCirclesQuery.mockReturnValue({
            data: ref([
                {
                    id: "circle-a",
                    name: "デモ企画A",
                    groupName: "Aブロック",
                    participationTypeName: "模擬店",
                },
                {
                    id: "circle-b",
                    name: "デモ企画B",
                    groupName: "Bブロック",
                    participationTypeName: "展示",
                },
            ]),
        });
        homeApiMocks.useCurrentCircleDetailQuery.mockReturnValue({ data: ref(null) });
        homeApiMocks.useParticipationTypesQuery.mockReturnValue({ data: ref([]) });
        homeApiMocks.useSelectCurrentCircleMutation.mockReturnValue({
            mutateAsync: vi.fn(async () => {
                sessionStore.currentCircle = {
                    id: "circle-b",
                    name: "デモ企画B",
                };
            }),
            isPending: ref(false),
        });

        const router = createTestRouter();
        await router.push("/");
        await router.isReady();

        const wrapper = mount(HomePage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        await vi.waitFor(() => {
            expect(wrapper.text()).toContain("次に作業する企画を選択してください。");
        });

        await wrapper.get('button[type="button"]:last-of-type').trigger("click");
        await flushPromises();

        await vi.waitFor(() => {
            expect(sessionStore.currentCircle?.name).toBe("デモ企画B");
            expect(wrapper.text()).toContain("搬入時間のお知らせ");
            expect(wrapper.text()).toContain("搬入手順書");
            expect(wrapper.text()).toContain("TXTファイル");
            expect(wrapper.text()).toContain("NEW");
            expect(wrapper.text()).toContain("搬入確認フォーム");
            expect(wrapper.text()).toContain("1企画あたり 2 件まで");
            expect(wrapper.get('a[href="/"]').text()).toContain("ワークスペースへ");
        });
    });
});
