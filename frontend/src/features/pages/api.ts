import { computed, type MaybeRefOrGetter, toValue } from "vue";
import { createJsonHeaders, $api } from "@/lib/api/client";
import { pageDetailSchema, pageSummarySchema, parseWithSchema } from "@/lib/api/schema";
import { useSessionStore } from "@/features/session/store";

export type PageSummary = {
    id: string;
    title: string;
    publishedAt: string;
};

export type PageDetail = PageSummary & {
    body: string;
    documents: PageDocument[];
};

export type PageDocument = {
    id: string;
    name: string;
    description: string;
    isImportant: boolean;
    extension: string;
    sizeBytes: number;
    updatedAt: string;
    downloadUrl: string;
};

export async function fetchPages(query = "") {
    const normalizedQuery = query.trim();

    return $api.queryData(
        "get",
        "/pages",
        {
            headers: createJsonHeaders(),
            params: {
                query: normalizedQuery === "" ? {} : { query: normalizedQuery },
            },
        },
        parsePages,
        {
            errorMessage: "Failed to fetch pages",
        },
    );
}

export async function fetchPage(pageId: string) {
    return $api.queryData(
        "get",
        "/pages/{pageID}",
        {
            headers: createJsonHeaders(),
            params: {
                path: {
                    pageID: pageId,
                },
            },
        },
        parsePageDetail,
        {
            errorMessage: "Failed to fetch page",
        },
    );
}

export function usePagesQuery(query: MaybeRefOrGetter<string>) {
    const sessionStore = useSessionStore();

    return $api.useQueryData(
        "get",
        "/pages",
        () => {
            const normalizedQuery = toValue(query).trim();

            return {
                headers: createJsonHeaders(),
                params: {
                    query: normalizedQuery === "" ? {} : { query: normalizedQuery },
                },
            };
        },
        parsePages,
        {
            queryKey: computed(() => [
                "pages",
                sessionStore.currentCircle?.id ?? "none",
                toValue(query),
            ]),
            enabled: computed(
                () => sessionStore.isAuthenticated && sessionStore.currentCircle !== null,
            ),
            retry: false,
        },
        {
            errorMessage: "Failed to fetch pages",
        },
    );
}

export function usePageDetailQuery(pageId: MaybeRefOrGetter<string>) {
    const sessionStore = useSessionStore();

    return $api.useQueryData(
        "get",
        "/pages/{pageID}",
        () => ({
            headers: createJsonHeaders(),
            params: {
                path: {
                    pageID: toValue(pageId),
                },
            },
        }),
        parsePageDetail,
        {
            queryKey: computed(() => [
                "pages",
                "detail",
                toValue(pageId),
                sessionStore.currentCircle?.id ?? "none",
            ]),
            enabled: computed(
                () =>
                    sessionStore.isAuthenticated &&
                    sessionStore.currentCircle !== null &&
                    toValue(pageId).trim().length > 0,
            ),
            retry: false,
        },
        {
            errorMessage: "Failed to fetch page",
        },
    );
}

function parsePages(value: unknown): PageSummary[] {
    return parseWithSchema(pageSummarySchema.array(), value, "pages");
}

function parsePageDetail(value: unknown): PageDetail {
    return parseWithSchema(pageDetailSchema, value, "page detail");
}
