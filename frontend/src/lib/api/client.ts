import {
    createApiClient,
    createQueryClient,
    expectApiData,
    expectApiNoContent,
} from "@portaldots/api-client";

export const apiBaseUrl = String(
    import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8081/v1",
).replace(/\/$/, "");

function resolveApiClientBaseUrl(baseUrl: string) {
    if (/^https?:\/\//.test(baseUrl)) {
        return baseUrl;
    }

    const normalizedPath = baseUrl.startsWith("/") ? baseUrl : `/${baseUrl}`;
    const origin =
        typeof globalThis.location?.origin === "string" &&
        globalThis.location.origin !== "" &&
        globalThis.location.origin !== "null"
            ? globalThis.location.origin
            : "http://localhost";

    return new URL(normalizedPath, `${origin}/`).toString().replace(/\/$/, "");
}

function resolvePublicApiOrigin(baseUrl: string) {
    if (/^https?:\/\//.test(baseUrl)) {
        return new URL(baseUrl).origin;
    }

    const configuredProxyTarget = import.meta.env.VITE_API_PROXY_TARGET;
    if (typeof configuredProxyTarget === "string" && /^https?:\/\//.test(configuredProxyTarget)) {
        return configuredProxyTarget.replace(/\/$/, "");
    }

    if (
        typeof globalThis.location?.origin === "string" &&
        globalThis.location.origin !== "" &&
        globalThis.location.origin !== "null"
    ) {
        return globalThis.location.origin;
    }

    return "http://127.0.0.1:8081";
}

const apiClientBaseUrl = resolveApiClientBaseUrl(apiBaseUrl);
const publicApiOrigin = resolvePublicApiOrigin(apiBaseUrl);

const fetchWithCredentials: typeof fetch = async (input, init) => {
    return globalThis.fetch(input, {
        ...init,
        credentials: "include",
    });
};

export const apiClient = createApiClient({
    baseUrl: apiClientBaseUrl,
    fetch: fetchWithCredentials,
});

export const $api = createQueryClient(apiClient);

export function buildApiUrl(path: string) {
    const normalizedPath = path.replace(/^\//, "");
    if (/^https?:\/\//.test(apiBaseUrl)) {
        return new URL(normalizedPath, `${apiBaseUrl}/`).toString();
    }

    const normalizedBasePath = apiBaseUrl.startsWith("/") ? apiBaseUrl : `/${apiBaseUrl}`;
    return new URL(normalizedPath, `${publicApiOrigin}${normalizedBasePath}/`).toString();
}

export function encodePathSegment(segment: string) {
    return encodeURIComponent(segment);
}

export function createJsonHeaders(csrfToken?: string) {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (csrfToken && csrfToken.trim() !== "") {
        headers["X-CSRF-Token"] = csrfToken;
    }
    return headers;
}

export async function postMultipart(path: string, formData: FormData, csrfToken?: string) {
    const headers = new Headers();
    if (csrfToken && csrfToken.trim() !== "") {
        headers.set("X-CSRF-Token", csrfToken);
    }

    return fetchWithCredentials(buildApiUrl(path), {
        method: "POST",
        headers,
        body: formData,
    });
}

export async function putMultipart(path: string, formData: FormData, csrfToken?: string) {
    const headers = new Headers();
    if (csrfToken && csrfToken.trim() !== "") {
        headers.set("X-CSRF-Token", csrfToken);
    }

    return fetchWithCredentials(buildApiUrl(path), {
        method: "PUT",
        headers,
        body: formData,
    });
}

export { expectApiData, expectApiNoContent };
