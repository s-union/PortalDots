import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { createJsonHeaders, $api } from "@/lib/api/client";
import { extractValidationMessage, parseValidationError } from "@/lib/api/validation";
import { fetchSessionBootstrap } from "@/features/session/api";
import { useSessionStore } from "@/features/session/store";

type LoginPayload = {
    loginId: string;
    password: string;
    remember?: boolean;
};

export async function login(payload: LoginPayload) {
    await $api.noContentMutation(
        "post",
        "/auth/login",
        {
            headers: createJsonHeaders(),
            body: payload,
        },
        {
            errorMessage: "Failed to login",
            errorParsers: {
                422: (error) => parseValidationError(error, "auth"),
            },
        },
    );
}

export async function logout(csrfToken: string) {
    await $api.noContentMutation(
        "post",
        "/auth/logout",
        {
            headers: createJsonHeaders(csrfToken),
        },
        {
            errorMessage: "Failed to logout",
        },
    );
}

export function useLoginMutation() {
    const queryClient = useQueryClient();
    const sessionStore = useSessionStore();

    return useMutation({
        mutationFn: async (payload: LoginPayload) =>
            $api.noContentMutation(
                "post",
                "/auth/login",
                {
                    headers: createJsonHeaders(),
                    body: payload,
                },
                {
                    errorMessage: "Failed to login",
                    errorParsers: {
                        422: (error) => parseValidationError(error, "auth"),
                    },
                },
            ),
        onSuccess: async () => {
            const session = await fetchSessionBootstrap();
            sessionStore.hydrate(session);
            queryClient.setQueryData(["session", "bootstrap"], session);
        },
    });
}

export function useLogoutMutation() {
    const sessionStore = useSessionStore();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () =>
            $api.noContentMutation(
                "post",
                "/auth/logout",
                {
                    headers: createJsonHeaders(sessionStore.csrfToken),
                },
                {
                    errorMessage: "Failed to logout",
                },
            ),
        onSuccess: () => {
            sessionStore.reset();
            queryClient.clear();
        },
    });
}

export function extractFirstErrorMessage(error: unknown) {
    return extractValidationMessage(error, "ログインに失敗しました。");
}
