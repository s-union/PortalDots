import { computed, ref, type MaybeRefOrGetter, toValue } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { buildApiUrl, createJsonHeaders, $api } from "@/lib/api/client";
import { parseWithSchema, staffUserSchema } from "@/lib/api/schema";
import { parsePaginatedResult, type PaginatedResult } from "@/lib/api/pagination";
import { extractValidationMessage, parseValidationError } from "@/lib/api/validation";
import { fetchSessionBootstrap } from "@/features/session/api";
import { useSessionStore } from "@/features/session/store";

export const manageableRoles = [
    "participant",
    "content_manager",
    "forms_manager",
    "circle_manager",
    "user_manager",
    "admin",
] as const;

export type StaffUser = {
    id: string;
    displayName: string;
    loginIds: string[];
    roles: string[];
    isVerified: boolean;
};

export type UpdateStaffUserPayload = {
    userId: string;
    displayName: string;
    loginIds: string[];
};

type UpdateStaffUserRolesPayload = {
    userId: string;
    roles: string[];
};

type StaffUsersPagination = {
    page: number;
    pageSize: number;
};

export async function fetchStaffUsers(pagination: StaffUsersPagination) {
    return $api.queryData(
        "get",
        "/staff/users",
        {
            headers: createJsonHeaders(),
            params: {
                query: {
                    page: pagination.page,
                    pageSize: pagination.pageSize,
                },
            },
        },
        (value) => parsePaginatedResult(value, parseStaffUser, "staff users"),
        {
            errorMessage: "Failed to fetch staff users",
        },
    );
}

export async function fetchStaffUser(userId: string) {
    return $api.queryData(
        "get",
        "/staff/users/{userID}",
        {
            headers: createJsonHeaders(),
            params: {
                path: {
                    userID: userId,
                },
            },
        },
        parseStaffUser,
        {
            errorMessage: "Failed to fetch staff user",
        },
    );
}

export async function updateStaffUser(payload: UpdateStaffUserPayload, csrfToken: string) {
    return $api.mutationData(
        "put",
        "/staff/users/{userID}",
        {
            headers: createJsonHeaders(csrfToken),
            params: {
                path: {
                    userID: payload.userId,
                },
            },
            body: {
                displayName: payload.displayName,
                loginIds: payload.loginIds,
            },
        },
        parseStaffUser,
        {
            errorMessage: "Failed to update staff user",
            errorParsers: {
                422: (error) => parseValidationError(error, "staff user"),
            },
        },
    );
}

export async function updateStaffUserRoles(
    payload: UpdateStaffUserRolesPayload,
    csrfToken: string,
) {
    return $api.mutationData(
        "put",
        "/staff/users/{userID}/roles",
        {
            headers: createJsonHeaders(csrfToken),
            params: {
                path: {
                    userID: payload.userId,
                },
            },
            body: {
                roles: payload.roles,
            },
        },
        parseStaffUser,
        {
            errorMessage: "Failed to update staff user roles",
            errorParsers: {
                422: (error) => parseValidationError(error, "staff user"),
            },
        },
    );
}

export async function verifyStaffUser(userId: string, csrfToken: string) {
    return $api.mutationData(
        "patch",
        "/staff/users/{userID}/verify",
        {
            headers: createJsonHeaders(csrfToken),
            params: {
                path: {
                    userID: userId,
                },
            },
        },
        parseStaffUser,
        {
            errorMessage: "Failed to verify staff user",
            errorParsers: {
                422: (error) => parseValidationError(error, "staff user"),
            },
        },
    );
}

export async function deleteStaffUser(userId: string, csrfToken: string) {
    await $api.noContentMutation(
        "delete",
        "/staff/users/{userID}",
        {
            headers: createJsonHeaders(csrfToken),
            params: {
                path: {
                    userID: userId,
                },
            },
        },
        {
            errorMessage: "Failed to delete staff user",
            errorParsers: {
                422: (error) => parseValidationError(error, "staff user"),
            },
        },
    );
}

export function useStaffUsersQuery(
    enabled: MaybeRefOrGetter<boolean>,
    pagination: MaybeRefOrGetter<StaffUsersPagination>,
) {
    return $api.useQueryData(
        "get",
        "/staff/users",
        () => ({
            headers: createJsonHeaders(),
            params: {
                query: {
                    page: toValue(pagination).page,
                    pageSize: toValue(pagination).pageSize,
                },
            },
        }),
        (value) => parsePaginatedResult(value, parseStaffUser, "staff users"),
        {
            queryKey: computed(() => ["staff", "users", toValue(pagination)]),
            enabled: computed(() => toValue(enabled)),
            retry: false,
        },
        {
            errorMessage: "Failed to fetch staff users",
        },
    );
}

export function useStaffUserDetailQuery(
    userId: MaybeRefOrGetter<string>,
    enabled: MaybeRefOrGetter<boolean>,
) {
    return $api.useQueryData(
        "get",
        "/staff/users/{userID}",
        () => ({
            headers: createJsonHeaders(),
            params: {
                path: {
                    userID: toValue(userId),
                },
            },
        }),
        parseStaffUser,
        {
            queryKey: computed(() => ["staff", "users", "detail", toValue(userId)]),
            enabled: computed(() => toValue(enabled) && toValue(userId).trim().length > 0),
            retry: false,
        },
        {
            errorMessage: "Failed to fetch staff user",
        },
    );
}

export function useUpdateStaffUserMutation() {
    const queryClient = useQueryClient();
    const sessionStore = useSessionStore();

    return useMutation({
        mutationFn: async (payload: UpdateStaffUserPayload) =>
            updateStaffUser(payload, sessionStore.csrfToken),
        onSuccess: async (updatedUser) => {
            await hydrateUserRelatedQueries(queryClient, sessionStore, updatedUser.id);
        },
    });
}

export function useUpdateStaffUserRolesMutation() {
    const queryClient = useQueryClient();
    const sessionStore = useSessionStore();

    return useMutation({
        mutationFn: async (payload: UpdateStaffUserRolesPayload) =>
            updateStaffUserRoles(payload, sessionStore.csrfToken),
        onSuccess: async (updatedUser) => {
            await hydrateUserRelatedQueries(queryClient, sessionStore, updatedUser.id);
        },
    });
}

export function useVerifyStaffUserMutation(userId: MaybeRefOrGetter<string>) {
    const queryClient = useQueryClient();
    const sessionStore = useSessionStore();

    return useMutation({
        mutationFn: async () => verifyStaffUser(toValue(userId), sessionStore.csrfToken),
        onSuccess: async (updatedUser) => {
            await hydrateUserRelatedQueries(queryClient, sessionStore, updatedUser.id);
        },
    });
}

export function useDeleteStaffUserMutation(userId: MaybeRefOrGetter<string>) {
    const queryClient = useQueryClient();
    const sessionStore = useSessionStore();

    return useMutation({
        mutationFn: async () => deleteStaffUser(toValue(userId), sessionStore.csrfToken),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["staff", "users"] }),
                queryClient.invalidateQueries({
                    queryKey: ["staff", "users", "detail", toValue(userId)],
                }),
                queryClient.invalidateQueries({ queryKey: ["session", "bootstrap"] }),
                queryClient.invalidateQueries({ queryKey: ["staff", "status"] }),
            ]);
        },
    });
}

export function createEditableRoles(initialRoles: string[]) {
    return ref<string[]>([...initialRoles]);
}

export function createEditableLoginIds(initialLoginIds: string[]) {
    return ref(formatStaffUserLoginIds(initialLoginIds));
}

export function normalizeSelectedRoles(roles: string[]) {
    return manageableRoles.filter((role) => roles.includes(role));
}

export function parseStaffUserLoginIds(value: string) {
    return [
        ...new Set(
            value
                .split(/[,\n]+/)
                .map((item) => item.trim())
                .filter(Boolean),
        ),
    ];
}

export function formatStaffUserLoginIds(loginIds: string[]) {
    return loginIds.join("\n");
}

export function buildStaffUsersExportUrl() {
    return buildApiUrl("/staff/users/export");
}

export function extractStaffUserValidationMessage(error: unknown) {
    return extractValidationMessage(error, "ユーザー操作に失敗しました。");
}

async function hydrateUserRelatedQueries(
    queryClient: ReturnType<typeof useQueryClient>,
    sessionStore: ReturnType<typeof useSessionStore>,
    userId: string,
) {
    await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["staff", "users"] }),
        queryClient.invalidateQueries({ queryKey: ["staff", "users", "detail", userId] }),
        queryClient.invalidateQueries({ queryKey: ["session", "bootstrap"] }),
        queryClient.invalidateQueries({ queryKey: ["staff", "status"] }),
    ]);

    const session = await fetchSessionBootstrap();
    sessionStore.hydrate(session);
    queryClient.setQueryData(["session", "bootstrap"], session);
}

function parseStaffUser(value: unknown): StaffUser {
    return parseWithSchema(staffUserSchema, value, "staff user");
}

export type StaffUserPage = PaginatedResult<StaffUser>;
