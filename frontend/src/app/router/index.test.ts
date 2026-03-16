import { afterEach, describe, expect, it, vi } from "vitest";
import { setActivePinia } from "pinia";
import { pinia } from "@/app/providers/pinia";
import { queryClient } from "@/app/providers/queryClient";
import { router } from "./index";

describe("app router guards", () => {
    afterEach(async () => {
        vi.unstubAllGlobals();
        queryClient.clear();
        setActivePinia(pinia);
        await router.replace("/");
    });

    it("redirects unauthenticated workspace access to login", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn((input: RequestInfo | URL) => {
                const url =
                    typeof input === "string"
                        ? input
                        : input instanceof URL
                          ? input.toString()
                          : input.url;
                if (url.endsWith("/session/bootstrap")) {
                    return new Response(
                        JSON.stringify({
                            csrfToken: "",
                            currentCircle: null,
                            featureFlags: [],
                            roles: [],
                            user: null,
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                if (url.endsWith("/staff/status")) {
                    return new Response(
                        JSON.stringify({
                            allowed: true,
                            authorized: true,
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                throw new Error(`Unexpected request: ${url}`);
            }),
        );

        await router.push("/workspace");
        await router.isReady();

        expect(router.currentRoute.value.fullPath).toBe("/login");
    });

    it("redirects authenticated workspace access without circle to circle selector", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn((input: RequestInfo | URL) => {
                const url =
                    typeof input === "string"
                        ? input
                        : input instanceof URL
                          ? input.toString()
                          : input.url;
                if (url.endsWith("/session/bootstrap")) {
                    return new Response(
                        JSON.stringify({
                            csrfToken: "csrf-token",
                            currentCircle: null,
                            featureFlags: [],
                            roles: ["participant"],
                            user: {
                                id: "demo-user",
                                displayName: "Demo User",
                            },
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                if (url.endsWith("/staff/status")) {
                    return new Response(
                        JSON.stringify({
                            allowed: true,
                            authorized: true,
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                throw new Error(`Unexpected request: ${url}`);
            }),
        );

        await router.push("/workspace");

        expect(router.currentRoute.value.fullPath).toBe("/circles/select?redirect=/workspace");
    });

    it("redirects authenticated register access to home via public-only guard", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn((input: RequestInfo | URL) => {
                const url =
                    typeof input === "string"
                        ? input
                        : input instanceof URL
                          ? input.toString()
                          : input.url;
                if (url.endsWith("/session/bootstrap")) {
                    return new Response(
                        JSON.stringify({
                            csrfToken: "csrf-token",
                            currentCircle: null,
                            featureFlags: [],
                            roles: ["participant"],
                            user: {
                                id: "demo-user",
                                displayName: "Demo User",
                            },
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                if (url.endsWith("/staff/status")) {
                    return new Response(
                        JSON.stringify({
                            allowed: true,
                            authorized: true,
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                throw new Error(`Unexpected request: ${url}`);
            }),
        );

        await router.push("/register");
        await router.isReady();

        expect(router.currentRoute.value.fullPath).toBe("/");
    });

    it("redirects unauthenticated email verify access to login", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn((input: RequestInfo | URL) => {
                const url =
                    typeof input === "string"
                        ? input
                        : input instanceof URL
                          ? input.toString()
                          : input.url;
                if (url.endsWith("/session/bootstrap")) {
                    return new Response(
                        JSON.stringify({
                            csrfToken: "",
                            currentCircle: null,
                            featureFlags: [],
                            roles: [],
                            user: null,
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                if (url.endsWith("/staff/status")) {
                    return new Response(
                        JSON.stringify({
                            allowed: true,
                            authorized: true,
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                throw new Error(`Unexpected request: ${url}`);
            }),
        );

        await router.push("/email/verify");
        await router.isReady();

        expect(router.currentRoute.value.fullPath).toBe("/login");
    });

    it("redirects staff dashboard access to staff verify when not yet authorized", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn((input: RequestInfo | URL) => {
                const url =
                    typeof input === "string"
                        ? input
                        : input instanceof URL
                          ? input.toString()
                          : input.url;

                if (url.endsWith("/session/bootstrap")) {
                    return new Response(
                        JSON.stringify({
                            csrfToken: "csrf-token",
                            currentCircle: {
                                id: "circle-a",
                                name: "デモ企画A",
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

                if (url.endsWith("/staff/status")) {
                    return new Response(
                        JSON.stringify({
                            allowed: true,
                            authorized: false,
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                throw new Error(`Unexpected request: ${url}`);
            }),
        );

        await router.push("/staff");

        expect(router.currentRoute.value.fullPath).toBe("/staff/verify");
    });

    it("redirects non-admin staff activity log access to staff top", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn((input: RequestInfo | URL) => {
                const url =
                    typeof input === "string"
                        ? input
                        : input instanceof URL
                          ? input.toString()
                          : input.url;

                if (url.endsWith("/session/bootstrap")) {
                    return new Response(
                        JSON.stringify({
                            csrfToken: "csrf-token",
                            currentCircle: {
                                id: "circle-a",
                                name: "デモ企画A",
                            },
                            featureFlags: [],
                            roles: ["circle_manager"],
                            user: {
                                id: "circle-user",
                                displayName: "Circle User",
                            },
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                if (url.endsWith("/staff/status")) {
                    return new Response(
                        JSON.stringify({
                            allowed: true,
                            authorized: true,
                        }),
                        {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        },
                    );
                }

                throw new Error(`Unexpected request: ${url}`);
            }),
        );

        await router.push("/staff/activity-logs");

        expect(router.currentRoute.value.fullPath).toBe("/staff");
    });

    it("resolves unknown routes to the not-found page", async () => {
        await router.push("/definitely-missing");

        const matchedRoutes = router.currentRoute.value.matched;
        expect(matchedRoutes[matchedRoutes.length - 1]?.path).toBe("/:all(.*)");
    });
});
