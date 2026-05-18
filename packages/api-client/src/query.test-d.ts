import { computed } from "vue";
import { expectTypeOf } from "vitest";
import { createApiClient } from "./client";
import { createQueryClient } from "./query";

const fetchClient = createApiClient({
    baseUrl: "https://example.com/v1",
});

const $api = createQueryClient(fetchClient);

const pagesPromise = $api.query(
    "get",
    "/pages",
    {
        headers: {
            "Content-Type": "application/json",
        },
    },
    {
        errorMessage: "Failed to fetch pages",
    },
);

const pageTitlePromise = $api.queryData(
    "get",
    "/pages/{pageID}",
    {
        headers: {
            "Content-Type": "application/json",
        },
        params: {
            path: {
                pageID: "page-1",
            },
        },
    },
    (page: { title: string }) => page.title,
);

const pagesQuery = $api.useQuery(
    "get",
    "/pages",
    {
        headers: {
            "Content-Type": "application/json",
        },
    },
    {
        queryKey: computed(() => ["pages"]),
        enabled: computed(() => true),
    },
);

const pageDetailQuery = $api.useQueryData(
    "get",
    "/pages/{pageID}",
    {
        headers: {
            "Content-Type": "application/json",
        },
        params: {
            path: {
                pageID: "page-1",
            },
        },
    },
    (page: { title: string }) => page.title,
    {
        queryKey: computed(() => ["pages", "detail", "page-1"]),
    },
);

const loginMutation = $api.useNoContentMutation("post", "/auth/login");

const verifyMutation = $api.useMutationData(
    "patch",
    "/staff/users/{userID}/verify",
    (user: { displayName: string }) => user.displayName,
);

expectTypeOf(pagesPromise).toMatchTypeOf<Promise<unknown>>();
expectTypeOf(pageTitlePromise).toEqualTypeOf<Promise<string>>();
expectTypeOf(pagesQuery.data.value).toMatchTypeOf<unknown>();
expectTypeOf(pageDetailQuery.data.value).toEqualTypeOf<string | undefined>();
expectTypeOf(loginMutation.mutateAsync).returns.toMatchTypeOf<Promise<void>>();
expectTypeOf(verifyMutation.mutateAsync).returns.toMatchTypeOf<Promise<string>>();
