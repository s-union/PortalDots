import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createRouter, createMemoryHistory } from "vue-router";
import { useSessionStore } from "@/features/session/store";
import CircleCreatePage from "./new.vue";

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

function buildFetchMock(options: { createShouldSucceed?: boolean } = {}) {
    const { createShouldSucceed = true } = options;

    return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        await Promise.resolve();
        const url =
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method ?? "GET";

        if (url.endsWith("/participation-types") && method === "GET") {
            return new Response(
                JSON.stringify([
                    {
                        id: "pt-exhibit",
                        name: "展示",
                        description: "展示企画です",
                        usersCountMin: 1,
                        usersCountMax: 4,
                        tags: [],
                        form: {
                            id: "form-pt-exhibit",
                            name: "参加登録",
                            description: "",
                            openAt: "2026-01-01T00:00:00Z",
                            closeAt: "2026-12-31T23:59:59Z",
                            isPublic: true,
                            isOpen: true,
                            maxAnswers: 1,
                            answerableTags: [],
                            confirmationMessage: "",
                        },
                    },
                    {
                        id: "pt-food",
                        name: "模擬店",
                        description: "模擬店企画です",
                        usersCountMin: 2,
                        usersCountMax: 6,
                        tags: [],
                        form: {
                            id: "form-pt-food",
                            name: "参加登録",
                            description: "",
                            openAt: "2026-01-01T00:00:00Z",
                            closeAt: "2026-12-31T23:59:59Z",
                            isPublic: true,
                            isOpen: true,
                            maxAnswers: 1,
                            answerableTags: [],
                            confirmationMessage: "",
                        },
                    },
                ]),
                { status: 200, headers: { "Content-Type": "application/json" } },
            );
        }

        if (url.endsWith("/circles") && method === "POST") {
            if (!createShouldSucceed) {
                return new Response(
                    JSON.stringify({ message: "Validation failed", errors: { name: ["必須"] } }),
                    { status: 422, headers: { "Content-Type": "application/json" } },
                );
            }
            return new Response(
                JSON.stringify({
                    id: "new-circle",
                    name: "テスト企画",
                    nameYomi: "てすときかく",
                    groupName: "テスト大学",
                    groupNameYomi: "てすとだいがく",
                    participationTypeId: "pt-exhibit",
                    participationTypeName: "展示",
                    notes: "",
                    invitationToken: "token-abc",
                    submittedAt: null,
                }),
                { status: 201, headers: { "Content-Type": "application/json" } },
            );
        }

        if (url.endsWith("/session/bootstrap") && method === "GET") {
            return new Response(
                JSON.stringify({
                    csrfToken: "csrf-token",
                    currentCircle: { id: "new-circle", name: "テスト企画" },
                    featureFlags: [],
                    roles: ["participant"],
                    user: { id: "demo-user", displayName: "Demo User" },
                }),
                { status: 200, headers: { "Content-Type": "application/json" } },
            );
        }

        throw new Error(`Unexpected request: ${method} ${url}`);
    });
}

describe("CircleCreatePage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("renders the create form with participation types", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        const sessionStore = useSessionStore();
        sessionStore.hydrate({
            csrfToken: "csrf-token",
            currentCircle: null,
            featureFlags: [],
            roles: ["participant"],
            user: { id: "demo-user", displayName: "Demo User" },
        });

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/workspace", component: { template: "<div>workspace</div>" } },
                { path: "/workspace/circles/create", component: CircleCreatePage },
                {
                    path: "/workspace/circles/detail",
                    component: { template: "<div>detail</div>" },
                },
            ],
        });
        await router.push("/workspace/circles/create");
        await router.isReady();

        const fetchMock = buildFetchMock();
        vi.stubGlobal("fetch", fetchMock);

        const wrapper = mount(CircleCreatePage, {
            global: { plugins: [pinia, router, createQueryPlugin()] },
        });
        await flushPromises();

        expect(wrapper.text()).toContain("企画を新規作成");
        expect(wrapper.text()).toContain("展示");
        expect(wrapper.text()).toContain("模擬店");
        expect(wrapper.text()).toContain("企画を作成する");

        const requestedUrls = fetchMock.mock.calls.map(([input]) =>
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url,
        );
        expect(requestedUrls).toContain("http://127.0.0.1:8081/v1/participation-types");
        expect(requestedUrls).not.toContain("http://127.0.0.1:8081/v1/staff/participation-types");
    });

    it("navigates to detail page after successful creation", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        const sessionStore = useSessionStore();
        sessionStore.hydrate({
            csrfToken: "csrf-token",
            currentCircle: null,
            featureFlags: [],
            roles: ["participant"],
            user: { id: "demo-user", displayName: "Demo User" },
        });

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/workspace", component: { template: "<div>workspace</div>" } },
                { path: "/workspace/circles/create", component: CircleCreatePage },
                {
                    path: "/workspace/circles/detail",
                    component: { template: "<div>detail</div>" },
                },
            ],
        });
        await router.push("/workspace/circles/create");
        await router.isReady();

        vi.stubGlobal("fetch", buildFetchMock());

        const wrapper = mount(CircleCreatePage, {
            global: { plugins: [pinia, router, createQueryPlugin()] },
        });
        await flushPromises();

        await wrapper.get('input[type="text"]').setValue("テスト企画");
        await wrapper.get('button[type="button"]').trigger("click");
        await flushPromises();

        expect(router.currentRoute.value.path).toBe("/workspace/circles/detail");
    });

    it("shows error message when creation fails", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        const sessionStore = useSessionStore();
        sessionStore.hydrate({
            csrfToken: "csrf-token",
            currentCircle: null,
            featureFlags: [],
            roles: ["participant"],
            user: { id: "demo-user", displayName: "Demo User" },
        });

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/workspace/circles/create", component: CircleCreatePage },
                {
                    path: "/workspace/circles/detail",
                    component: { template: "<div>detail</div>" },
                },
            ],
        });
        await router.push("/workspace/circles/create");
        await router.isReady();

        vi.stubGlobal("fetch", buildFetchMock({ createShouldSucceed: false }));

        const wrapper = mount(CircleCreatePage, {
            global: { plugins: [pinia, router, createQueryPlugin()] },
        });
        await flushPromises();

        await wrapper.get('button[type="button"]').trigger("click");
        await flushPromises();

        expect(wrapper.text()).toContain("企画の作成に失敗しました");
        expect(router.currentRoute.value.path).toBe("/workspace/circles/create");
    });
});
