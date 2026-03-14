import createClient, { type ClientOptions } from "openapi-fetch";
import type { paths } from "./generated/schema";

export type ApiErrorParsers = Partial<Record<number, (error: unknown) => unknown>>;

export type ApiResult<TData> = {
    data?: TData;
    error?: unknown;
    response: Response;
};

export function createApiClient(options: ClientOptions = {}) {
    return createClient<paths>(options);
}

export type ApiClient = ReturnType<typeof createApiClient>;

export function expectApiData<TData>(
    result: ApiResult<TData>,
    message: string,
    errorParsers?: ApiErrorParsers,
) {
    if (!result.response.ok || result.data === undefined) {
        const error = new Error(message);
        (error as Error & { cause?: unknown }).cause = resolveApiError(result, errorParsers);
        throw error;
    }

    return result.data;
}

export function expectApiNoContent(
    result: ApiResult<unknown>,
    message: string,
    errorParsers?: ApiErrorParsers,
) {
    if (!result.response.ok) {
        const error = new Error(message);
        (error as Error & { cause?: unknown }).cause = resolveApiError(result, errorParsers);
        throw error;
    }
}

function resolveApiError<TData>(result: ApiResult<TData>, errorParsers?: ApiErrorParsers) {
    const parser = errorParsers?.[result.response.status];
    if (!parser) {
        return result.error;
    }

    return parser(result.error);
}
