import type { ClientPathsWithMethod, MaybeOptionalInit, MethodResponse } from "openapi-fetch";
import {
    useMutation as useTanstackMutation,
    useQuery as useTanstackQuery,
    type QueryKey,
    type UseMutationOptions,
    type UseMutationReturnType,
    type UseQueryOptions,
    type UseQueryReturnType,
} from "@tanstack/vue-query";
import type { ApiClient, ApiErrorParsers, ApiResult } from "./client";
import { expectApiData, expectApiNoContent } from "./client";
import type { paths } from "./generated/schema";

type HttpMethod = "get" | "put" | "post" | "delete" | "patch" | "head" | "options" | "trace";
type MutationMethod = Exclude<HttpMethod, "get">;

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

type QueryOptions<TQueryFnData, TError, TData> = Omit<
    UnwrapReactiveObject<UseQueryOptions<TQueryFnData, TError, TData, TQueryFnData, QueryKey>>,
    "queryFn" | "queryKey" | "select"
> & {
    queryKey?: UnwrapReactiveObject<
        UseQueryOptions<TQueryFnData, TError, TData, TQueryFnData, QueryKey>
    >["queryKey"];
};

type MutationOptions<TData, TError, TVariables, TOnMutateResult> = Omit<
    Exclude<
        UseMutationOptions<TData, TError, TVariables, TOnMutateResult>,
        (...args: never[]) => unknown
    >,
    "mutationFn"
>;

type RequestOptions = {
    errorMessage?: string;
    errorParsers?: ApiErrorParsers;
};

export type QueryClientHelpers = {
    query<TMethod extends HttpMethod, TPath extends PathWithMethod<TMethod>>(
        method: TMethod,
        path: TPath,
        init: RequestInitFor<TMethod, TPath>,
        options?: RequestOptions,
    ): Promise<ResponseDataFor<TMethod, TPath>>;
    queryData<TMethod extends HttpMethod, TPath extends PathWithMethod<TMethod>, TData>(
        method: TMethod,
        path: TPath,
        init: RequestInitFor<TMethod, TPath>,
        select: SelectData<ResponseDataFor<TMethod, TPath>, TData>,
        options?: RequestOptions,
    ): Promise<TData>;
    useQuery<TMethod extends HttpMethod, TPath extends PathWithMethod<TMethod>, TError = Error>(
        method: TMethod,
        path: TPath,
        init: QueryInit<RequestInitFor<TMethod, TPath>>,
        queryOptions?: QueryOptions<
            ResponseDataFor<TMethod, TPath>,
            TError,
            ResponseDataFor<TMethod, TPath>
        >,
        options?: RequestOptions,
    ): UseQueryReturnType<ResponseDataFor<TMethod, TPath>, TError>;
    useQueryData<
        TMethod extends HttpMethod,
        TPath extends PathWithMethod<TMethod>,
        TData,
        TError = Error,
    >(
        method: TMethod,
        path: TPath,
        init: QueryInit<RequestInitFor<TMethod, TPath>>,
        select: SelectData<ResponseDataFor<TMethod, TPath>, TData>,
        queryOptions?: QueryOptions<ResponseDataFor<TMethod, TPath>, TError, TData>,
        options?: RequestOptions,
    ): UseQueryReturnType<TData, TError>;
    mutation<TMethod extends MutationMethod, TPath extends PathWithMethod<TMethod>>(
        method: TMethod,
        path: TPath,
        init: RequestInitFor<TMethod, TPath>,
        options?: RequestOptions,
    ): Promise<ResponseDataFor<TMethod, TPath>>;
    mutationData<TMethod extends MutationMethod, TPath extends PathWithMethod<TMethod>, TData>(
        method: TMethod,
        path: TPath,
        init: RequestInitFor<TMethod, TPath>,
        select: SelectData<ResponseDataFor<TMethod, TPath>, TData>,
        options?: RequestOptions,
    ): Promise<TData>;
    noContentMutation<TMethod extends MutationMethod, TPath extends PathWithMethod<TMethod>>(
        method: TMethod,
        path: TPath,
        init: RequestInitFor<TMethod, TPath>,
        options?: RequestOptions,
    ): Promise<void>;
    useMutation<
        TMethod extends MutationMethod,
        TPath extends PathWithMethod<TMethod>,
        TError = Error,
        TOnMutateResult = unknown,
    >(
        method: TMethod,
        path: TPath,
        mutationOptions?: MutationOptions<
            ResponseDataFor<TMethod, TPath>,
            TError,
            RequestInitFor<TMethod, TPath>,
            TOnMutateResult
        >,
        options?: RequestOptions,
    ): UseMutationReturnType<
        ResponseDataFor<TMethod, TPath>,
        TError,
        RequestInitFor<TMethod, TPath>,
        TOnMutateResult
    >;
    useMutationData<
        TMethod extends MutationMethod,
        TPath extends PathWithMethod<TMethod>,
        TData,
        TError = Error,
        TOnMutateResult = unknown,
    >(
        method: TMethod,
        path: TPath,
        select: SelectData<ResponseDataFor<TMethod, TPath>, TData>,
        mutationOptions?: MutationOptions<
            TData,
            TError,
            RequestInitFor<TMethod, TPath>,
            TOnMutateResult
        >,
        options?: RequestOptions,
    ): UseMutationReturnType<TData, TError, RequestInitFor<TMethod, TPath>, TOnMutateResult>;
    useNoContentMutation<
        TMethod extends MutationMethod,
        TPath extends PathWithMethod<TMethod>,
        TError = Error,
        TOnMutateResult = unknown,
    >(
        method: TMethod,
        path: TPath,
        mutationOptions?: MutationOptions<
            void,
            TError,
            RequestInitFor<TMethod, TPath>,
            TOnMutateResult
        >,
        options?: RequestOptions,
    ): UseMutationReturnType<void, TError, RequestInitFor<TMethod, TPath>, TOnMutateResult>;
};

export function createQueryClient(client: ApiClient): QueryClientHelpers {
    function query<TMethod extends HttpMethod, TPath extends PathWithMethod<TMethod>>(
        method: TMethod,
        path: TPath,
        init: RequestInitFor<TMethod, TPath>,
        options?: RequestOptions,
    ) {
        return requestData(client, method, path, init, options);
    }

    function queryData<TMethod extends HttpMethod, TPath extends PathWithMethod<TMethod>, TData>(
        method: TMethod,
        path: TPath,
        init: RequestInitFor<TMethod, TPath>,
        select: SelectData<ResponseDataFor<TMethod, TPath>, TData>,
        options?: RequestOptions,
    ) {
        return requestData(client, method, path, init, options).then(select);
    }

    function useQuery<
        TMethod extends HttpMethod,
        TPath extends PathWithMethod<TMethod>,
        TError = Error,
    >(
        method: TMethod,
        path: TPath,
        init: QueryInit<RequestInitFor<TMethod, TPath>>,
        queryOptions?: QueryOptions<
            ResponseDataFor<TMethod, TPath>,
            TError,
            ResponseDataFor<TMethod, TPath>
        >,
        options?: RequestOptions,
    ): UseQueryReturnType<ResponseDataFor<TMethod, TPath>, TError> {
        const { queryKey, ...restQueryOptions } = queryOptions ?? {};

        return useTanstackQuery<
            ResponseDataFor<TMethod, TPath>,
            TError,
            ResponseDataFor<TMethod, TPath>,
            QueryKey
        >({
            ...restQueryOptions,
            queryKey: queryKey ?? [method, path, resolveQueryInit(init)],
            queryFn: async () => requestData(client, method, path, resolveQueryInit(init), options),
        });
    }

    function useQueryData<
        TMethod extends HttpMethod,
        TPath extends PathWithMethod<TMethod>,
        TData,
        TError = Error,
    >(
        method: TMethod,
        path: TPath,
        init: QueryInit<RequestInitFor<TMethod, TPath>>,
        select: SelectData<ResponseDataFor<TMethod, TPath>, TData>,
        queryOptions?: QueryOptions<ResponseDataFor<TMethod, TPath>, TError, TData>,
        options?: RequestOptions,
    ): UseQueryReturnType<TData, TError> {
        const { queryKey, ...restQueryOptions } = queryOptions ?? {};

        return useTanstackQuery<ResponseDataFor<TMethod, TPath>, TError, TData, QueryKey>({
            ...restQueryOptions,
            queryKey: queryKey ?? [method, path, resolveQueryInit(init)],
            queryFn: async () => requestData(client, method, path, resolveQueryInit(init), options),
            select,
        });
    }

    function mutation<TMethod extends MutationMethod, TPath extends PathWithMethod<TMethod>>(
        method: TMethod,
        path: TPath,
        init: RequestInitFor<TMethod, TPath>,
        options?: RequestOptions,
    ) {
        return requestData(client, method, path, init, options);
    }

    function mutationData<
        TMethod extends MutationMethod,
        TPath extends PathWithMethod<TMethod>,
        TData,
    >(
        method: TMethod,
        path: TPath,
        init: RequestInitFor<TMethod, TPath>,
        select: SelectData<ResponseDataFor<TMethod, TPath>, TData>,
        options?: RequestOptions,
    ) {
        return requestData(client, method, path, init, options).then(select);
    }

    function noContentMutation<
        TMethod extends MutationMethod,
        TPath extends PathWithMethod<TMethod>,
    >(
        method: TMethod,
        path: TPath,
        init: RequestInitFor<TMethod, TPath>,
        options?: RequestOptions,
    ) {
        return requestNoContent(client, method, path, init, options);
    }

    function useMutation<
        TMethod extends MutationMethod,
        TPath extends PathWithMethod<TMethod>,
        TError = Error,
        TOnMutateResult = unknown,
    >(
        method: TMethod,
        path: TPath,
        mutationOptions?: MutationOptions<
            ResponseDataFor<TMethod, TPath>,
            TError,
            RequestInitFor<TMethod, TPath>,
            TOnMutateResult
        >,
        options?: RequestOptions,
    ): UseMutationReturnType<
        ResponseDataFor<TMethod, TPath>,
        TError,
        RequestInitFor<TMethod, TPath>,
        TOnMutateResult
    > {
        return useTanstackMutation<
            ResponseDataFor<TMethod, TPath>,
            TError,
            RequestInitFor<TMethod, TPath>,
            TOnMutateResult
        >({
            ...mutationOptions,
            mutationFn: async (init) => requestData(client, method, path, init, options),
        });
    }

    function useMutationData<
        TMethod extends MutationMethod,
        TPath extends PathWithMethod<TMethod>,
        TData,
        TError = Error,
        TOnMutateResult = unknown,
    >(
        method: TMethod,
        path: TPath,
        select: SelectData<ResponseDataFor<TMethod, TPath>, TData>,
        mutationOptions?: MutationOptions<
            TData,
            TError,
            RequestInitFor<TMethod, TPath>,
            TOnMutateResult
        >,
        options?: RequestOptions,
    ): UseMutationReturnType<TData, TError, RequestInitFor<TMethod, TPath>, TOnMutateResult> {
        return useTanstackMutation<TData, TError, RequestInitFor<TMethod, TPath>, TOnMutateResult>({
            ...mutationOptions,
            mutationFn: async (init) => {
                const data = await requestData(client, method, path, init, options);
                return select(data);
            },
        });
    }

    function useNoContentMutation<
        TMethod extends MutationMethod,
        TPath extends PathWithMethod<TMethod>,
        TError = Error,
        TOnMutateResult = unknown,
    >(
        method: TMethod,
        path: TPath,
        mutationOptions?: MutationOptions<
            void,
            TError,
            RequestInitFor<TMethod, TPath>,
            TOnMutateResult
        >,
        options?: RequestOptions,
    ): UseMutationReturnType<void, TError, RequestInitFor<TMethod, TPath>, TOnMutateResult> {
        return useTanstackMutation<void, TError, RequestInitFor<TMethod, TPath>, TOnMutateResult>({
            ...mutationOptions,
            mutationFn: async (init) => {
                await requestNoContent(client, method, path, init, options);
            },
        });
    }

    return {
        query,
        queryData,
        useQuery,
        useQueryData,
        mutation,
        mutationData,
        noContentMutation,
        useMutation,
        useMutationData,
        useNoContentMutation,
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

async function requestNoContent<
    TMethod extends MutationMethod,
    TPath extends PathWithMethod<TMethod>,
>(
    client: ApiClient,
    method: TMethod,
    path: TPath,
    init: RequestInitFor<TMethod, TPath>,
    options?: RequestOptions,
) {
    const result = await callClientMethod(client, method, path, init);
    expectApiNoContent(
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
