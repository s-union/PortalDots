import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import StaffCircleDetailPage from "./[circleId].vue";

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

describe("StaffCircleDetailPage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("renders, updates, and queues circle mail", async () => {
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
                { path: "/staff/circles", component: { template: "<div>circles</div>" } },
                { path: "/staff/circles/:circleId", component: StaffCircleDetailPage },
                {
                    path: "/staff/participation-types/:typeId",
                    component: { template: "<div>type</div>" },
                },
            ],
        });
        await router.push("/staff/circles/circle-b");
        await router.isReady();

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

                if (pathname.endsWith("/staff/participation-types") && method === "GET") {
                    return new Response(
                        JSON.stringify([
                            {
                                id: "participation-type-food",
                                name: "模擬店",
                                description: "",
                                usersCountMin: 1,
                                usersCountMax: 4,
                                tags: ["模擬店"],
                                form: {
                                    id: "form-participation-food",
                                    name: "企画参加登録",
                                    description: "",
                                    openAt: "2025-01-10T00:00:00Z",
                                    closeAt: "2025-02-10T00:00:00Z",
                                    isPublic: true,
                                    isOpen: false,
                                    maxAnswers: 1,
                                    answerableTags: [],
                                    confirmationMessage: "",
                                },
                            },
                            {
                                id: "participation-type-exhibit",
                                name: "展示",
                                description: "",
                                usersCountMin: 1,
                                usersCountMax: 4,
                                tags: ["展示"],
                                form: {
                                    id: "form-participation-exhibit",
                                    name: "企画参加登録",
                                    description: "",
                                    openAt: "2025-01-10T00:00:00Z",
                                    closeAt: "2025-02-10T00:00:00Z",
                                    isPublic: true,
                                    isOpen: false,
                                    maxAnswers: 1,
                                    answerableTags: [],
                                    confirmationMessage: "",
                                },
                            },
                        ]),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                if (pathname.endsWith("/staff/circles/circle-b") && method === "GET") {
                    return new Response(
                        JSON.stringify({
                            id: "circle-b",
                            name: "デモ企画B",
                            groupName: "Bブロック",
                            participationTypeId: "participation-type-exhibit",
                            participationTypeName: "展示",
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                if (pathname.endsWith("/staff/circles/circle-b/email") && method === "GET") {
                    return new Response(
                        JSON.stringify({
                            circle: {
                                id: "circle-b",
                                name: "デモ企画B",
                                groupName: "Bブロック",
                                participationTypeId: "participation-type-exhibit",
                                participationTypeName: "展示",
                            },
                            recipients: [
                                {
                                    id: "user-1",
                                    displayName: "責任者A",
                                    loginIds: ["leader@example.com"],
                                },
                                {
                                    id: "user-2",
                                    displayName: "構成員B",
                                    loginIds: ["member@example.com"],
                                },
                            ],
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                if (pathname.endsWith("/staff/circles/circle-b") && method === "PUT") {
                    return new Response(
                        JSON.stringify({
                            id: "circle-b",
                            name: "更新後の企画B",
                            groupName: "更新後Bブロック",
                            participationTypeId: "participation-type-food",
                            participationTypeName: "模擬店",
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                if (pathname.endsWith("/staff/circles/circle-b/email") && method === "POST") {
                    return new Response("{}", {
                        status: 201,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                if (pathname.endsWith("/session/bootstrap") && method === "GET") {
                    return new Response(
                        JSON.stringify({
                            csrfToken: "csrf-token",
                            currentCircle: {
                                id: "circle-b",
                                name: "更新後の企画B",
                            },
                            featureFlags: [],
                            roles: ["admin"],
                            user: {
                                id: "staff-user",
                                displayName: "Staff User",
                            },
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(StaffCircleDetailPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        expect(wrapper.text()).toContain("デモ企画B");
        expect(wrapper.text()).toContain("参加種別を開く");

        await wrapper.get('input[name="name"]').setValue("更新後の企画B");
        await wrapper.get('input[name="groupName"]').setValue("更新後Bブロック");
        await wrapper.get('button[type="submit"]').trigger("submit");
        await flushPromises();

        expect(wrapper.text()).toContain("企画を更新しました。");
        expect(wrapper.text()).toContain("既存企画の参加種別は変更できません。");

        await wrapper.get('select[name="recipient"]').setValue("leader");
        await wrapper.get('input[name="subject"]').setValue("搬入のご案内");
        await wrapper.get('textarea[name="body"]').setValue("9:00 に集合してください。");
        await wrapper.findAll('button[type="button"]')[1]?.trigger("click");
        await flushPromises();

        expect(wrapper.text()).toContain(
            "企画所属者向けモックメールをキューに追加しました。実メールは送信していません。",
        );
        expect(wrapper.text()).toContain("送信対象: 2 名");
        expect(wrapper.text()).toContain("責任者A / 構成員B");
        expect(wrapper.text()).toContain("Markdown 記法");
        expect(wrapper.text()).toContain(
            "この送信はモックです。登録内容はキューで確認できますが、外部メール送信は行いません。",
        );
    });

    it("disables mail submission when there are no recipients", async () => {
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
                { path: "/staff/circles", component: { template: "<div>circles</div>" } },
                { path: "/staff/circles/:circleId", component: StaffCircleDetailPage },
                {
                    path: "/staff/participation-types/:typeId",
                    component: { template: "<div>type</div>" },
                },
            ],
        });
        await router.push("/staff/circles/circle-b");
        await router.isReady();

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

                if (pathname.endsWith("/staff/participation-types") && method === "GET") {
                    return new Response(JSON.stringify([]), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                if (pathname.endsWith("/staff/circles/circle-b") && method === "GET") {
                    return new Response(
                        JSON.stringify({
                            id: "circle-b",
                            name: "デモ企画B",
                            groupName: "Bブロック",
                            participationTypeId: "participation-type-exhibit",
                            participationTypeName: "展示",
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                if (pathname.endsWith("/staff/circles/circle-b/email") && method === "GET") {
                    return new Response(
                        JSON.stringify({
                            circle: {
                                id: "circle-b",
                                name: "デモ企画B",
                                groupName: "Bブロック",
                                participationTypeId: "participation-type-exhibit",
                                participationTypeName: "展示",
                            },
                            recipients: [],
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                throw new Error(`Unexpected request: ${method} ${url}`);
            }),
        );

        const wrapper = mount(StaffCircleDetailPage, {
            global: {
                plugins: [pinia, router, createQueryPlugin()],
            },
        });
        await flushPromises();

        expect(wrapper.text()).toContain(
            "宛先となる企画所属者がいないため、メールは送信できません。",
        );
        const buttons = wrapper.findAll('button[type="button"]');
        const mailButton = buttons.find((button) =>
            button.text().includes("モックメールをキューに追加"),
        );
        if (!mailButton) {
            throw new Error("mail button not found");
        }
        expect(mailButton.attributes("disabled")).toBeDefined();
    });
});
