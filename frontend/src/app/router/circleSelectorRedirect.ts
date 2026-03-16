import type { RouteLocationRaw } from "vue-router";

const CIRCLE_SELECTOR_PATH = "/circles/select";
const DEFAULT_CIRCLE_SELECTOR_DESTINATION = "/workspace";

export function sanitizeCircleSelectorRedirect(input: string | null | undefined): string | null {
    if (typeof input !== "string") {
        return null;
    }

    const normalized = `/${input.replace(/\n/g, "").replace(/^\/+/, "")}`;

    if (
        normalized === "/" ||
        normalized.startsWith(`${CIRCLE_SELECTOR_PATH}?`) ||
        normalized === CIRCLE_SELECTOR_PATH
    ) {
        return null;
    }

    return normalized;
}

export function buildCircleSelectorLocation(redirectTo?: string): RouteLocationRaw {
    const redirect = sanitizeCircleSelectorRedirect(redirectTo);

    if (redirect === null) {
        return CIRCLE_SELECTOR_PATH;
    }

    return {
        path: CIRCLE_SELECTOR_PATH,
        query: { redirect },
    };
}

export function resolveCircleSelectorDestination(redirectTo?: string): string {
    return sanitizeCircleSelectorRedirect(redirectTo) ?? DEFAULT_CIRCLE_SELECTOR_DESTINATION;
}
