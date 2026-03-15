import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import {
    formatDateTimeLocalValue,
    parseDateTimeLocalValue,
} from "@/features/staff/participation-types/api";
import StaffParticipationTypeDetailPage from "./StaffParticipationTypeDetailPage.vue";

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

describe("StaffParticipationTypeDetailPage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("updates form settings, links to form editor, and deletes a participation type", async () => {
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

        vi.stubGlobal(
            "confirm",
            vi.fn(() => true),
        );

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/staff/participation-types", component: { template: "<div>types</div>" } },
                {
                    path: "/staff/participation-types/:typeId",
                    component: StaffParticipationTypeDetailPage,
                },
                { path: "/staff/forms/:formId", component: { template: "<div>form detail</div>" } },
            ],
        });
        await router.push("/staff/participation-types/participation-type-food");
        await router.isReady();

        let updatedRequestBody = "";

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
                const method = init?.method ?? "GET";

                if (url.endsWith("/staff/status") && method === "GET") {
                    return jsonResponse({ allowed: true, authorized: true });
                }

                if (
                    url.endsWith("/staff/participation-types/participation-type-food") &&
                    method === "GET"
                ) {
                    return jsonResponse({
                        id: "participation-type-food",
                        name: "模擬店",
                        description: "模擬店の参加種別です。",
                        usersCountMin: 1,
                        usersCountMax: 4,
                        tags: ["模擬店"],
                        form: {
                            id: "form-participation-food",
                            name: "企画参加登録",
                            description: "参加登録を提出してください。",
                            openAt: "2026-03-01T00:00:00Z",
                            closeAt: "2026-03-31T23:59:59Z",
                            isPublic: true,
                            isOpen: true,
                            maxAnswers: 1,
                            answerableTags: [],
                            confirmationMessage: "ありがとうございました。",
                        },
                    });
                }

                if (
                    url.endsWith("/staff/participation-types/participation-type-food") &&
                    method === "PUT"
                ) {
                    if (input instanceof Request) {
                        updatedRequestBody = await input.clone().text();
                    } else if (typeof init?.body === "string") {
                        updatedRequestBody = init.body;
                    }

                    return jsonResponse({
                        id: "participation-type-food",
                        name: "更新後模擬店",
                        description: "更新後説明",
                        usersCountMin: 1,
                        usersCountMax: 5,
                        tags: ["模擬店", "屋外"],
                        form: {
                            id: "form-participation-food",
                            name: "企画参加登録",
                            description: "更新後フォーム説明",
                            openAt: "2026-03-01T00:00:00Z",
                            closeAt: "2026-03-31T23:59:59Z",
                            isPublic: true,
                            isOpen: true,
                            maxAnswers: 1,
                            answerableTags: [],
                            confirmationMessage: "送信完了",
                        },
                    });
                }

                if (
                    url.endsWith("/staff/participation-types/participation-type-food") &&
                    method === "DELETE"
                ) {
                    return new Response(null, { status: 204 });
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(StaffParticipationTypeDetailPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        expect(wrapper.text()).toContain("模擬店");
        expect(wrapper.text()).toContain("参加登録フォームを編集");
        expect(wrapper.text()).toContain("企画参加登録のカスタムフォーム");
        expect(wrapper.text()).toContain("Markdown 記法をそのまま利用できます。");
        expect(wrapper.get('a[href="/staff/forms/form-participation-food"]').text()).toContain(
            "参加登録フォームを編集",
        );
        expect(wrapper.get('input[name="openAt"]').element).toHaveProperty(
            "value",
            formatDateTimeLocalValue("2026-03-01T00:00:00Z"),
        );

        await wrapper.get('input[name="name"]').setValue("更新後模擬店");
        await wrapper.get('textarea[name="tags"]').setValue("模擬店\n屋外");
        await wrapper.get('input[name="openAt"]').setValue("2026-03-02T09:30");
        await wrapper.get('input[name="closeAt"]').setValue("2026-03-31T18:45");
        await wrapper.get('button[type="submit"]').trigger("submit");
        await flushPromises();

        expect(updatedRequestBody).toContain("更新後模擬店");
        expect(updatedRequestBody).toContain("屋外");
        expect(updatedRequestBody).toContain(parseDateTimeLocalValue("2026-03-02T09:30"));
        expect(updatedRequestBody).toContain(parseDateTimeLocalValue("2026-03-31T18:45"));
        expect(wrapper.text()).toContain("参加種別を更新しました。");

        const deleteButton = wrapper
            .findAll('button[type="button"]')
            .find((button) => button.text().includes("参加種別を削除"));
        if (!deleteButton) {
            throw new Error("delete button not found");
        }
        await deleteButton.trigger("click");
        await flushPromises();

        expect(router.currentRoute.value.path).toBe("/staff/participation-types");
    });
});

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
