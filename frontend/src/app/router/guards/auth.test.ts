import { describe, expect, it } from "vitest";
import { buildCircleSelectorLocation } from "@/app/router/circleSelectorRedirect";
import { authGuard } from "./auth";

function createRoute(path: string, meta: Record<string, unknown> = {}) {
    return {
        path,
        fullPath: path,
        meta,
    } as never;
}

function createSessionStore(options: {
    isAuthenticated: boolean;
    currentCircle: null | { id: string; name: string };
}) {
    return {
        isAuthenticated: options.isAuthenticated,
        currentCircle: options.currentCircle,
    } as never;
}

describe("authGuard", () => {
    it("redirects unauthenticated protected route to login", () => {
        const route = createRoute("/workspace/pages", { requiresAuth: true });
        const sessionStore = createSessionStore({
            isAuthenticated: false,
            currentCircle: null,
        });

        expect(authGuard(route, sessionStore)).toBe("/login");
    });

    it("redirects authenticated circle-required route without circle", () => {
        const route = createRoute("/workspace/forms", {
            requiresAuth: true,
            requiresCircle: true,
        });
        const sessionStore = createSessionStore({
            isAuthenticated: true,
            currentCircle: null,
        });

        expect(authGuard(route, sessionStore)).toEqual(
            buildCircleSelectorLocation("/workspace/forms"),
        );
    });

    it("rewrites authenticated /workspace to home", () => {
        const route = createRoute("/workspace", {
            requiresAuth: true,
            requiresCircle: true,
        });
        const sessionStore = createSessionStore({
            isAuthenticated: true,
            currentCircle: null,
        });

        expect(authGuard(route, sessionStore)).toBe("/");
    });
});
