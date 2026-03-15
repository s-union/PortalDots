import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { createJsonHeaders, $api } from "@/lib/api/client";
import { extractValidationMessage, parseValidationError } from "@/lib/api/validation";
import { useSessionStore } from "@/features/session/store";

export async function deleteOwnAccount(csrfToken: string) {
    await $api.noContentMutation(
        "delete",
        "/session/account",
        {
            headers: createJsonHeaders(csrfToken),
        },
        {
            errorMessage: "Failed to delete account",
            errorParsers: {
                422: (error) => parseValidationError(error, "delete account"),
            },
        },
    );
}

export function useDeleteOwnAccountMutation() {
    const sessionStore = useSessionStore();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => deleteOwnAccount(sessionStore.csrfToken),
        onSuccess: () => {
            sessionStore.reset();
            queryClient.clear();
        },
    });
}

export function extractDeleteAccountValidationMessage(error: unknown) {
    return extractValidationMessage(error, "アカウントの削除に失敗しました。");
}
