import { ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";

vi.mock("@/lib/api/client", async () => {
    const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");

    return {
        ...actual,
        buildApiUrl: (path: string) => `https://api.test${path}`,
    };
});

const publicHomeApiMocks = vi.hoisted(() => ({
    usePublicDocumentsQuery: vi.fn(),
}));

vi.mock("@/features/public-home/api", () => ({
    usePublicDocumentsQuery: publicHomeApiMocks.usePublicDocumentsQuery,
}));

import PublicDocumentsIndexPage from "./index.vue";

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

describe("PublicDocumentsIndexPage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("renders guest documents", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);

        publicHomeApiMocks.usePublicDocumentsQuery.mockReturnValue({
            data: ref([
                {
                    id: "document-1",
                    name: "サンプル配布資料",
                    description: "資料の説明です。",
                    isImportant: true,
                    isNew: true,
                    extension: "PDF",
                    sizeBytes: 1024,
                    updatedAt: "2026-03-05T10:00:00Z",
                    downloadUrl: "/v1/public/documents/document-1",
                },
            ]),
            isPending: ref(false),
        });

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/public/documents", component: PublicDocumentsIndexPage },
                {
                    path: "/public/documents/:documentId",
                    component: { template: "<div>document</div>" },
                },
            ],
        });
        await router.push("/public/documents");
        await router.isReady();

        const wrapper = mount(PublicDocumentsIndexPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        await vi.waitFor(() => {
            expect(wrapper.text()).toContain("サンプル配布資料");
            expect(wrapper.text()).toContain("PDFファイル");
            expect(wrapper.text()).toContain("NEW");
            expect(
                wrapper.get('a[href="https://api.test/v1/public/documents/document-1"]').exists(),
            ).toBe(true);
        });
    });
});
