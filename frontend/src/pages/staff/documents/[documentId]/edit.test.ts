import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import StaffDashboardPage from "../../index.vue";
import StaffDocumentDetailPage from "./edit.vue";
import StaffDocumentsIndexPage from "../index.vue";
import StaffVerifyPage from "../../verify.vue";

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

describe("StaffDocumentDetailPage", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    function expectInputValue(
        wrapper: ReturnType<typeof mount>,
        selector: string,
        expected: string,
    ) {
        const element = wrapper.get(selector).element;
        if (!(element instanceof HTMLInputElement)) {
            throw new Error(`Expected HTMLInputElement for ${selector}`);
        }
        expect(element.value).toBe(expected);
    }

    function expectTextareaValue(
        wrapper: ReturnType<typeof mount>,
        selector: string,
        expected: string,
    ) {
        const element = wrapper.get(selector).element;
        if (!(element instanceof HTMLTextAreaElement)) {
            throw new Error(`Expected HTMLTextAreaElement for ${selector}`);
        }
        expect(element.value).toBe(expected);
    }

    it("updates and deletes a staff document", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        const sessionStore = useSessionStore();
        sessionStore.hydrate({
            csrfToken: "csrf-token",
            currentCircle: {
                id: "circle-b",
                name: "デモ企画B",
            },
            featureFlags: [],
            roles: ["admin"],
            user: {
                id: "staff-user",
                displayName: "Staff User",
            },
        });

        let deleted = false;
        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/login", component: { template: "<div>login</div>" } },
                { path: "/", component: { template: "<div>home</div>" } },
                { path: "/circles/select", component: { template: "<div>circles</div>" } },
                { path: "/staff", component: StaffDashboardPage },
                { path: "/staff/verify", component: StaffVerifyPage },
                { path: "/staff/documents", component: StaffDocumentsIndexPage },
                { path: "/staff/documents/:documentId/edit", component: StaffDocumentDetailPage },
            ],
        });
        await router.push("/staff/documents/document-circle-b-1/edit");
        await router.isReady();

        const confirmMock = vi.fn(() => true);
        vi.spyOn(window, "confirm").mockImplementation(confirmMock);
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
                await Promise.resolve();
                const url =
                    typeof input === "string"
                        ? input
                        : input instanceof URL
                          ? input.toString()
                          : input.url;
                const method = (
                    init?.method ?? (input instanceof Request ? input.method : "GET")
                ).toUpperCase();

                const pathname = new URL(url, "http://localhost").pathname;

                if (pathname.endsWith("/staff/status") && method === "GET") {
                    return new Response(JSON.stringify({ allowed: true, authorized: true }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                if (
                    pathname.endsWith("/staff/documents/document-circle-b-1/edit") &&
                    method === "GET"
                ) {
                    return new Response(
                        JSON.stringify({
                            id: "document-circle-b-1",
                            name: "展示ガイド",
                            description: "Bブロック向けの展示ガイドです。",
                            notes: "展示班の責任者に共有済みです。",
                            isImportant: true,
                            filename: "b-exhibition-guide.txt",
                            extension: "TXT",
                            mimeType: "text/plain",
                            sizeBytes: 1024,
                            isPublic: true,
                            createdAt: "2026-03-03T09:00:00Z",
                            updatedAt: "2026-03-05T09:00:00Z",
                            downloadUrl: "/v1/staff/documents/document-circle-b-1",
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                if (pathname.endsWith("/staff/documents/document-circle-b-1") && method === "PUT") {
                    return new Response(
                        JSON.stringify({
                            id: "document-circle-b-1",
                            name: "展示ガイド改訂版",
                            description: "更新版です。",
                            notes: "旧版は破棄してください。",
                            isImportant: false,
                            filename: "b-exhibition-guide.txt",
                            extension: "TXT",
                            mimeType: "text/plain",
                            sizeBytes: 1024,
                            isPublic: false,
                            createdAt: "2026-03-03T09:00:00Z",
                            updatedAt: "2026-03-06T09:00:00Z",
                            downloadUrl: "/v1/staff/documents/document-circle-b-1",
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                if (
                    pathname.endsWith("/staff/documents/document-circle-b-1") &&
                    method === "DELETE"
                ) {
                    deleted = true;
                    return new Response(null, { status: 204 });
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(StaffDocumentDetailPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();
        await flushPromises();

        expectInputValue(wrapper, 'input[name="name"]', "展示ガイド");
        expectTextareaValue(wrapper, 'textarea[name="notes"]', "展示班の責任者に共有済みです。");

        await wrapper.get('input[name="name"]').setValue("展示ガイド改訂版");
        await wrapper.get('textarea[name="description"]').setValue("更新版です。");
        await wrapper.get('textarea[name="notes"]').setValue("旧版は破棄してください。");
        await wrapper.get('input[name="isImportant"]').setValue(false);
        await wrapper.get('input[name="isPublic"]').setValue(false);
        await wrapper.get("form").trigger("submit");
        await flushPromises();
        await flushPromises();

        expect(wrapper.text()).toContain("配布資料を更新しました。");

        await wrapper.get('button[type="button"]').trigger("click");
        await flushPromises();

        expect(confirmMock).toHaveBeenCalledWith("配布資料「展示ガイド」を削除しますか？");
        expect(deleted).toBe(true);
        expect(router.currentRoute.value.fullPath).toBe("/staff/documents");
    });

    it("does not delete a staff document when confirmation is cancelled", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        const sessionStore = useSessionStore();
        sessionStore.hydrate({
            csrfToken: "csrf-token",
            currentCircle: {
                id: "circle-b",
                name: "デモ企画B",
            },
            featureFlags: [],
            roles: ["admin"],
            user: {
                id: "staff-user",
                displayName: "Staff User",
            },
        });

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/login", component: { template: "<div>login</div>" } },
                { path: "/", component: { template: "<div>home</div>" } },
                { path: "/circles/select", component: { template: "<div>circles</div>" } },
                { path: "/staff", component: StaffDashboardPage },
                { path: "/staff/verify", component: StaffVerifyPage },
                { path: "/staff/documents", component: StaffDocumentsIndexPage },
                { path: "/staff/documents/:documentId/edit", component: StaffDocumentDetailPage },
            ],
        });
        await router.push("/staff/documents/document-circle-b-1/edit");
        await router.isReady();

        const confirmMock = vi.fn(() => false);
        vi.spyOn(window, "confirm").mockImplementation(confirmMock);
        let deleted = false;

        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
                await Promise.resolve();
                const url =
                    typeof input === "string"
                        ? input
                        : input instanceof URL
                          ? input.toString()
                          : input.url;
                const method = (
                    init?.method ?? (input instanceof Request ? input.method : "GET")
                ).toUpperCase();

                const pathname = new URL(url, "http://localhost").pathname;

                if (pathname.endsWith("/staff/status") && method === "GET") {
                    return new Response(JSON.stringify({ allowed: true, authorized: true }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                if (
                    pathname.endsWith("/staff/documents/document-circle-b-1/edit") &&
                    method === "GET"
                ) {
                    return new Response(
                        JSON.stringify({
                            id: "document-circle-b-1",
                            name: "展示ガイド",
                            description: "Bブロック向けの展示ガイドです。",
                            notes: "展示班の責任者に共有済みです。",
                            isImportant: true,
                            filename: "b-exhibition-guide.txt",
                            extension: "TXT",
                            mimeType: "text/plain",
                            sizeBytes: 1024,
                            isPublic: true,
                            createdAt: "2026-03-03T09:00:00Z",
                            updatedAt: "2026-03-05T09:00:00Z",
                            downloadUrl: "/v1/staff/documents/document-circle-b-1",
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                if (
                    pathname.endsWith("/staff/documents/document-circle-b-1") &&
                    method === "DELETE"
                ) {
                    deleted = true;
                    return new Response(null, { status: 204 });
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(StaffDocumentDetailPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();
        await flushPromises();

        await wrapper.get('button[type="button"]').trigger("click");
        await flushPromises();

        expect(confirmMock).toHaveBeenCalledWith("配布資料「展示ガイド」を削除しますか？");
        expect(deleted).toBe(false);
        expect(router.currentRoute.value.fullPath).toBe(
            "/staff/documents/document-circle-b-1/edit",
        );
    });
});
