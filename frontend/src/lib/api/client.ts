import {
    createApiClient,
    createQueryClient,
    expectApiData,
    expectApiNoContent,
} from "@portaldots/api-client";

export const apiBaseUrl = String(
    import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8081/v1",
).replace(/\/$/, "");

const fetchWithCredentials: typeof fetch = async (input, init) => {
    return globalThis.fetch(input, {
        ...init,
        credentials: "include",
    });
};

export const apiClient = createApiClient({
    baseUrl: apiBaseUrl,
    fetch: fetchWithCredentials,
});

export const $api = createQueryClient(apiClient);

export function buildApiUrl(path: string) {
    const normalizedPath = path.replace(/^\//, "");
    if (/^https?:\/\//.test(apiBaseUrl)) {
        return new URL(normalizedPath, `${apiBaseUrl}/`).toString();
    }
    if (typeof window !== "undefined") {
        return new URL(
            normalizedPath,
            new URL(`${apiBaseUrl}/`, window.location.origin),
        ).toString();
    }
    return `${apiBaseUrl}/${normalizedPath}`;
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
