import type { ClientPathsWithMethod, MaybeOptionalInit, MethodResponse } from "openapi-fetch";
import {
    useQuery as useTanstackQuery,
    type QueryKey,
    type UseQueryOptions,
    type UseQueryReturnType,
} from "@tanstack/vue-query";
import type { ApiClient, ApiErrorParsers } from "./client";
import { expectApiData } from "./client";
import type { paths } from "./generated/schema";

type HttpMethod = "get" | "put" | "post" | "delete" | "patch" | "head" | "options" | "trace";

type PathWithMethod<TMethod extends HttpMethod> = ClientPathsWithMethod<ApiClient, TMethod>;

type RequestInitFor<
    TMethod extends HttpMethod,
    TPath extends PathWithMethod<TMethod>,
> = MaybeOptionalInit<paths[TPath], TMethod>;

type ResponseDataFor<
    TMethod extends HttpMethod,
    TPath extends PathWithMethod<TMethod>,
> = MethodResponse<ApiClient, TMethod, TPath, RequestInitFor<TMethod, TPath>>;

type SelectData<TSource, TData> = (value: TSource) => TData;
type QueryInit<TInit> = TInit | (() => TInit);

type UnwrapReactiveObject<T> = T extends { readonly value: infer U } ? U : T;

type SuspenseQueryOptions<TQueryFnData, TError, TData> = Omit<
    UnwrapReactiveObject<UseQueryOptions<TQueryFnData, TError, TData, TQueryFnData, QueryKey>>,
    "queryFn" | "queryKey" | "select"
> & {
    queryKey?: UnwrapReactiveObject<
        UseQueryOptions<TQueryFnData, TError, TData, TQueryFnData, QueryKey>
    >["queryKey"];
};

type RequestOptions = {
    errorMessage?: string;
    errorParsers?: ApiErrorParsers;
};

export type SuspenseQueryClientHelpers = {
    useSuspenseQuery<TMethod extends HttpMethod, TPath extends PathWithMethod<TMethod>, TError = Error>(
        method: TMethod,
        path: TPath,
        init: QueryInit<RequestInitFor<TMethod, TPath>>,
        queryOptions?: SuspenseQueryOptions<
            ResponseDataFor<TMethod, TPath>,
            TError,
            ResponseDataFor<TMethod, TPath>
        >,
        options?: RequestOptions,
    ): UseQueryReturnType<ResponseDataFor<TMethod, TPath>, TError>;
    useSuspenseQueryData<
        TMethod extends HttpMethod,
        TPath extends PathWithMethod<TMethod>,
        TData,
        TError = Error,
    >(
        method: TMethod,
        path: TPath,
        init: QueryInit<RequestInitFor<TMethod, TPath>>,
        select: SelectData<ResponseDataFor<TMethod, TPath>, TData>,
        queryOptions?: SuspenseQueryOptions<ResponseDataFor<TMethod, TPath>, TError, TData>,
        options?: RequestOptions,
    ): UseQueryReturnType<TData, TError>;
};

/**
 * Creates suspense-capable query helpers for Vue's Suspense integration.
 * Callers should await `query.suspense()` inside async setup.
 */
export function createSuspenseQueryClient(client: ApiClient): SuspenseQueryClientHelpers {
    function useSuspenseQuery<
        TMethod extends HttpMethod,
        TPath extends PathWithMethod<TMethod>,
        TError = Error,
    >(
        method: TMethod,
        path: TPath,
        init: QueryInit<RequestInitFor<TMethod, TPath>>,
        queryOptions?: SuspenseQueryOptions<
            ResponseDataFor<TMethod, TPath>,
            TError,
            ResponseDataFor<TMethod, TPath>
        >,
        options?: RequestOptions,
    ): UseQueryReturnType<ResponseDataFor<TMethod, TPath>, TError> {
        const { queryKey, ...restQueryOptions } = queryOptions ?? {};

        const query = useTanstackQuery<
            ResponseDataFor<TMethod, TPath>,
            TError,
            ResponseDataFor<TMethod, TPath>,
            QueryKey
        >({
            ...restQueryOptions,
            queryKey: queryKey ?? [method, path, resolveQueryInit(init)],
            queryFn: async () => requestData(client, method, path, resolveQueryInit(init), options),
        });

        return query;
    }

    function useSuspenseQueryData<
        TMethod extends HttpMethod,
        TPath extends PathWithMethod<TMethod>,
        TData,
        TError = Error,
    >(
        method: TMethod,
        path: TPath,
        init: QueryInit<RequestInitFor<TMethod, TPath>>,
        select: SelectData<ResponseDataFor<TMethod, TPath>, TData>,
        queryOptions?: SuspenseQueryOptions<ResponseDataFor<TMethod, TPath>, TError, TData>,
        options?: RequestOptions,
    ): UseQueryReturnType<TData, TError> {
        const { queryKey, ...restQueryOptions } = queryOptions ?? {};

        const query = useTanstackQuery<ResponseDataFor<TMethod, TPath>, TError, TData, QueryKey>({
            ...restQueryOptions,
            queryKey: queryKey ?? [method, path, resolveQueryInit(init)],
            queryFn: async () => requestData(client, method, path, resolveQueryInit(init), options),
            select,
        });

        return query;
    }

    return {
        useSuspenseQuery,
        useSuspenseQueryData,
    };
}

async function requestData<TMethod extends HttpMethod, TPath extends PathWithMethod<TMethod>>(
    client: ApiClient,
    method: TMethod,
    path: TPath,
    init: RequestInitFor<TMethod, TPath>,
    options?: RequestOptions,
) {
    const result = await callClientMethod(client, method, path, init);
    return expectApiData(
        result,
        options?.errorMessage ?? buildErrorMessage(method, path),
        options?.errorParsers,
    );
}

function callClientMethod<TMethod extends HttpMethod, TPath extends PathWithMethod<TMethod>>(
    client: ApiClient,
    method: TMethod,
    path: TPath,
    init: RequestInitFor<TMethod, TPath>,
) {
    type ApiResult<T> = { data: T; error?: undefined } | { data?: undefined; error: unknown };
    const request = client.request as (
        method: TMethod,
        path: TPath,
        init: RequestInitFor<TMethod, TPath>,
    ) => Promise<ApiResult<ResponseDataFor<TMethod, TPath>>>;

    return request(method, path, init);
}

function buildErrorMessage(method: HttpMethod, path: string) {
    return `Failed to ${method.toUpperCase()} ${path}`;
}

function resolveQueryInit<TInit>(init: QueryInit<TInit>): TInit {
    if (typeof init === "function") {
        return (init as () => TInit)();
    }

    return init;
}
