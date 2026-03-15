import { computed, type MaybeRefOrGetter, toValue } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { createJsonHeaders, $api } from "@/lib/api/client";
import { parseWithSchema, staffTagSchema } from "@/lib/api/schema";
import { extractValidationMessage, parseValidationError } from "@/lib/api/validation";
import { useSessionStore } from "@/features/session/store";

export type StaffTag = {
    id: string;
    name: string;
};

export async function fetchStaffTags() {
    return $api.queryData(
        "get",
        "/staff/tags",
        {
            headers: createJsonHeaders(),
        },
        parseStaffTags,
        {
            errorMessage: "Failed to fetch staff tags",
        },
    );
}

export async function createStaffTag(name: string, csrfToken: string) {
    return $api.mutationData(
        "post",
        "/staff/tags",
        {
            headers: createJsonHeaders(csrfToken),
            body: { name },
        },
        parseStaffTag,
        {
            errorMessage: "Failed to create staff tag",
            errorParsers: {
                422: (error) => parseValidationError(error, "staff tag"),
            },
        },
    );
}

export async function updateStaffTag(tagId: string, name: string, csrfToken: string) {
    return $api.mutationData(
        "put",
        "/staff/tags/{tagID}",
        {
            headers: createJsonHeaders(csrfToken),
            params: { path: { tagID: tagId } },
            body: { name },
        },
        parseStaffTag,
        {
            errorMessage: "Failed to update staff tag",
            errorParsers: {
                422: (error) => parseValidationError(error, "staff tag"),
            },
        },
    );
}

export async function deleteStaffTag(tagId: string, csrfToken: string) {
    await $api.noContentMutation(
        "delete",
        "/staff/tags/{tagID}",
        {
            headers: createJsonHeaders(csrfToken),
            params: { path: { tagID: tagId } },
        },
        {
            errorMessage: "Failed to delete staff tag",
        },
    );
}

export function useStaffTagsQuery(enabled: MaybeRefOrGetter<boolean>) {
    return $api.useQueryData(
        "get",
        "/staff/tags",
        {
            headers: createJsonHeaders(),
        },
        parseStaffTags,
        {
            queryKey: ["staff", "tags"],
            enabled: computed(() => toValue(enabled)),
            retry: false,
        },
        {
            errorMessage: "Failed to fetch staff tags",
        },
    );
}

export function useCreateStaffTagMutation() {
    const queryClient = useQueryClient();
    const sessionStore = useSessionStore();
    return useMutation({
        mutationFn: async (name: string) => createStaffTag(name, sessionStore.csrfToken),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["staff", "tags"] });
        },
    });
}

export function useUpdateStaffTagMutation() {
    const queryClient = useQueryClient();
    const sessionStore = useSessionStore();
    return useMutation({
        mutationFn: async (payload: StaffTag) =>
            updateStaffTag(payload.id, payload.name, sessionStore.csrfToken),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["staff", "tags"] });
        },
    });
}

export function useDeleteStaffTagMutation() {
    const queryClient = useQueryClient();
    const sessionStore = useSessionStore();
    return useMutation({
        mutationFn: async (tagId: string) => deleteStaffTag(tagId, sessionStore.csrfToken),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["staff", "tags"] });
        },
    });
}

export function extractStaffTagValidationMessage(error: unknown) {
    return extractValidationMessage(error, "タグの保存に失敗しました。");
}

function parseStaffTags(value: unknown): StaffTag[] {
    return parseWithSchema(staffTagSchema.array(), value, "staff tags");
}

function parseStaffTag(value: unknown): StaffTag {
    return parseWithSchema(staffTagSchema, value, "staff tag");
}
