import { computed, ref, type MaybeRefOrGetter, toValue } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { z } from "zod";
import { buildApiUrl, createJsonHeaders, $api } from "@/lib/api/client";
import {
    formQuestionSchema,
    parseWithSchema,
    staffFormDetailSchema,
    staffFormPreviewSchema,
    staffFormSummarySchema,
} from "@/lib/api/schema";
import { extractValidationMessage, parseValidationError } from "@/lib/api/validation";
import { useSessionStore } from "@/features/session/store";

export type StaffFormSummary = z.infer<typeof staffFormSummarySchema>;
export type StaffFormDetail = z.infer<typeof staffFormDetailSchema>;
export type StaffFormPreview = z.infer<typeof staffFormPreviewSchema>;
export type StaffFormUpload = NonNullable<StaffFormDetail["answer"]>["uploads"][number];
export type StaffFormQuestion = z.infer<typeof formQuestionSchema>;

export const allowedQuestionTypes = [
    "heading",
    "text",
    "textarea",
    "number",
    "radio",
    "select",
    "checkbox",
    "upload",
] as const;

type CreateStaffFormPayload = {
    name: string;
    description: string;
    openAt: string;
    closeAt: string;
    maxAnswers: number;
    answerableTags: string[];
    confirmationMessage: string;
    isPublic: boolean;
};

type CreateStaffFormQuestionPayload = {
    type: string;
};

type UpdateStaffFormQuestionPayload = {
    id: string;
    name: string;
    description: string;
    type: string;
    isRequired: boolean;
    numberMin: null | number;
    numberMax: null | number;
    allowedTypes: string;
    options: string[];
    priority: number;
};

export async function fetchStaffForms() {
    return $api.queryData(
        "get",
        "/staff/forms",
        {
            headers: createJsonHeaders(),
        },
        parseStaffForms,
        {
            errorMessage: "Failed to fetch staff forms",
        },
    );
}

export async function fetchStaffForm(formId: string) {
    return $api.queryData(
        "get",
        "/staff/forms/{formID}",
        {
            headers: createJsonHeaders(),
            params: {
                path: {
                    formID: formId,
                },
            },
        },
        parseStaffFormDetail,
        {
            errorMessage: "Failed to fetch staff form",
        },
    );
}

export async function fetchStaffFormPreview(formId: string) {
    return $api.queryData(
        "get",
        "/staff/forms/{formID}/preview",
        {
            headers: createJsonHeaders(),
            params: {
                path: {
                    formID: formId,
                },
            },
        },
        parseStaffFormPreview,
        {
            errorMessage: "Failed to fetch staff form preview",
        },
    );
}

export async function createStaffForm(payload: CreateStaffFormPayload, csrfToken: string) {
    return $api.mutationData(
        "post",
        "/staff/forms",
        {
            headers: createJsonHeaders(csrfToken),
            body: payload,
        },
        parseStaffFormSummary,
        {
            errorMessage: "Failed to create staff form",
            errorParsers: {
                422: (error) => parseValidationError(error, "staff form"),
            },
        },
    );
}

export async function updateStaffForm(
    formId: string,
    payload: CreateStaffFormPayload,
    csrfToken: string,
) {
    return $api.mutationData(
        "put",
        "/staff/forms/{formID}",
        {
            headers: createJsonHeaders(csrfToken),
            params: {
                path: {
                    formID: formId,
                },
            },
            body: payload,
        },
        parseStaffFormSummary,
        {
            errorMessage: "Failed to update staff form",
            errorParsers: {
                422: (error) => parseValidationError(error, "staff form"),
            },
        },
    );
}

export async function createStaffFormQuestion(
    formId: string,
    payload: CreateStaffFormQuestionPayload,
    csrfToken: string,
) {
    return $api.mutationData(
        "post",
        "/staff/forms/{formID}/questions",
        {
            headers: createJsonHeaders(csrfToken),
            params: {
                path: {
                    formID: formId,
                },
            },
            body: payload,
        },
        parseStaffFormQuestion,
        {
            errorMessage: "Failed to create staff form question",
            errorParsers: {
                422: (error) => parseValidationError(error, "staff form question"),
            },
        },
    );
}

export async function updateStaffFormQuestion(
    formId: string,
    payload: UpdateStaffFormQuestionPayload,
    csrfToken: string,
) {
    return $api.mutationData(
        "put",
        "/staff/forms/{formID}/questions/{questionID}",
        {
            headers: createJsonHeaders(csrfToken),
            params: {
                path: {
                    formID: formId,
                    questionID: payload.id,
                },
            },
            body: {
                name: payload.name,
                description: payload.description,
                type: payload.type,
                isRequired: payload.isRequired,
                numberMin: payload.numberMin,
                numberMax: payload.numberMax,
                allowedTypes: payload.allowedTypes,
                options: payload.options,
                priority: payload.priority,
            },
        },
        parseStaffFormQuestion,
        {
            errorMessage: "Failed to update staff form question",
            errorParsers: {
                422: (error) => parseValidationError(error, "staff form question"),
            },
        },
    );
}

export async function deleteStaffFormQuestion(
    formId: string,
    questionId: string,
    csrfToken: string,
) {
    await $api.noContentMutation(
        "delete",
        "/staff/forms/{formID}/questions/{questionID}",
        {
            headers: createJsonHeaders(csrfToken),
            params: {
                path: {
                    formID: formId,
                    questionID: questionId,
                },
            },
        },
        {
            errorMessage: "Failed to delete staff form question",
        },
    );
}

export async function reorderStaffFormQuestions(
    formId: string,
    questionIds: string[],
    csrfToken: string,
) {
    await $api.noContentMutation(
        "put",
        "/staff/forms/{formID}/questions/order",
        {
            headers: createJsonHeaders(csrfToken),
            params: {
                path: {
                    formID: formId,
                },
            },
            body: {
                questionIds,
            },
        },
        {
            errorMessage: "Failed to reorder staff form questions",
        },
    );
}

export async function copyStaffForm(formId: string, csrfToken: string) {
    return $api.mutationData(
        "post",
        "/staff/forms/{formID}/copy",
        {
            headers: createJsonHeaders(csrfToken),
            params: {
                path: {
                    formID: formId,
                },
            },
        },
        parseStaffFormSummary,
        {
            errorMessage: "Failed to copy staff form",
        },
    );
}

export async function deleteStaffForm(formId: string, csrfToken: string) {
    await $api.noContentMutation(
        "delete",
        "/staff/forms/{formID}",
        {
            headers: createJsonHeaders(csrfToken),
            params: {
                path: {
                    formID: formId,
                },
            },
        },
        {
            errorMessage: "Failed to delete staff form",
        },
    );
}

export function useStaffFormsQuery(enabled: MaybeRefOrGetter<boolean>) {
    return $api.useQueryData(
        "get",
        "/staff/forms",
        {
            headers: createJsonHeaders(),
        },
        parseStaffForms,
        {
            queryKey: ["staff", "forms"],
            enabled: computed(() => toValue(enabled)),
            retry: false,
        },
        {
            errorMessage: "Failed to fetch staff forms",
        },
    );
}

export function useStaffFormDetailQuery(
    formId: MaybeRefOrGetter<string>,
    enabled: MaybeRefOrGetter<boolean>,
) {
    return $api.useQueryData(
        "get",
        "/staff/forms/{formID}",
        () => ({
            headers: createJsonHeaders(),
            params: {
                path: {
                    formID: toValue(formId),
                },
            },
        }),
        parseStaffFormDetail,
        {
            queryKey: computed(() => ["staff", "forms", "detail", toValue(formId)]),
            enabled: computed(() => toValue(enabled) && toValue(formId).trim().length > 0),
            retry: false,
        },
        {
            errorMessage: "Failed to fetch staff form",
        },
    );
}

export function useStaffFormPreviewQuery(
    formId: MaybeRefOrGetter<string>,
    enabled: MaybeRefOrGetter<boolean>,
) {
    return $api.useQueryData(
        "get",
        "/staff/forms/{formID}/preview",
        () => ({
            headers: createJsonHeaders(),
            params: {
                path: {
                    formID: toValue(formId),
                },
            },
        }),
        parseStaffFormPreview,
        {
            queryKey: computed(() => ["staff", "forms", "preview", toValue(formId)]),
            enabled: computed(() => toValue(enabled) && toValue(formId).trim().length > 0),
            retry: false,
        },
        {
            errorMessage: "Failed to fetch staff form preview",
        },
    );
}

export function useCreateStaffFormMutation() {
    const queryClient = useQueryClient();
    const sessionStore = useSessionStore();

    return useMutation({
        mutationFn: async (payload: CreateStaffFormPayload) =>
            createStaffForm(payload, sessionStore.csrfToken),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["staff", "forms"],
            });
        },
    });
}

export function useUpdateStaffFormMutation(formId: MaybeRefOrGetter<string>) {
    const queryClient = useQueryClient();
    const sessionStore = useSessionStore();

    return useMutation({
        mutationFn: async (payload: CreateStaffFormPayload) =>
            updateStaffForm(toValue(formId), payload, sessionStore.csrfToken),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ["staff", "forms"],
                }),
                queryClient.invalidateQueries({
                    queryKey: ["staff", "forms", "detail", toValue(formId)],
                }),
            ]);
        },
    });
}

export function useCreateStaffFormQuestionMutation(formId: MaybeRefOrGetter<string>) {
    const queryClient = useQueryClient();
    const sessionStore = useSessionStore();

    return useMutation({
        mutationFn: async (payload: CreateStaffFormQuestionPayload) =>
            createStaffFormQuestion(toValue(formId), payload, sessionStore.csrfToken),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["staff", "forms", "detail", toValue(formId)],
            });
        },
    });
}

export function useUpdateStaffFormQuestionMutation(formId: MaybeRefOrGetter<string>) {
    const queryClient = useQueryClient();
    const sessionStore = useSessionStore();

    return useMutation({
        mutationFn: async (payload: UpdateStaffFormQuestionPayload) =>
            updateStaffFormQuestion(toValue(formId), payload, sessionStore.csrfToken),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["staff", "forms", "detail", toValue(formId)],
            });
        },
    });
}

export function useDeleteStaffFormQuestionMutation(formId: MaybeRefOrGetter<string>) {
    const queryClient = useQueryClient();
    const sessionStore = useSessionStore();

    return useMutation({
        mutationFn: async (questionId: string) =>
            deleteStaffFormQuestion(toValue(formId), questionId, sessionStore.csrfToken),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["staff", "forms", "detail", toValue(formId)],
            });
        },
    });
}

export function useReorderStaffFormQuestionsMutation(formId: MaybeRefOrGetter<string>) {
    const queryClient = useQueryClient();
    const sessionStore = useSessionStore();

    return useMutation({
        mutationFn: async (questionIds: string[]) =>
            reorderStaffFormQuestions(toValue(formId), questionIds, sessionStore.csrfToken),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["staff", "forms", "detail", toValue(formId)],
            });
        },
    });
}

export function useCopyStaffFormMutation() {
    const queryClient = useQueryClient();
    const sessionStore = useSessionStore();

    return useMutation({
        mutationFn: async (formId: string) => copyStaffForm(formId, sessionStore.csrfToken),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["staff", "forms"],
            });
        },
    });
}

export function useDeleteStaffFormMutation() {
    const queryClient = useQueryClient();
    const sessionStore = useSessionStore();

    return useMutation({
        mutationFn: async (formId: string) => deleteStaffForm(formId, sessionStore.csrfToken),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["staff", "forms"],
            });
        },
    });
}

export function useStaffFormForm() {
    return ref<CreateStaffFormPayload>(createDefaultStaffFormPayload());
}

export function extractStaffFormValidationMessage(error: unknown) {
    return extractValidationMessage(error, "フォームの作成に失敗しました。");
}

function parseStaffForms(value: unknown): StaffFormSummary[] {
    return parseWithSchema(staffFormSummarySchema.array(), value, "staff forms");
}

export function createDefaultStaffFormPayload(): CreateStaffFormPayload {
    const openAt = new Date();
    openAt.setUTCMinutes(0, 0, 0);
    openAt.setUTCHours(openAt.getUTCHours() + 1);

    const closeAt = new Date(openAt);
    closeAt.setUTCDate(closeAt.getUTCDate() + 14);
    closeAt.setUTCHours(23, 59, 59, 0);

    return {
        name: "",
        description: "",
        openAt: openAt.toISOString(),
        closeAt: closeAt.toISOString(),
        maxAnswers: 1,
        answerableTags: [],
        confirmationMessage: "",
        isPublic: true,
    };
}

export function parseStaffFormTags(value: string) {
    return [
        ...new Set(
            value
                .split(/[\n,]+/)
                .map((item) => item.trim())
                .filter((item) => item.length > 0),
        ),
    ];
}

export function formatStaffFormTags(tags: string[]) {
    return tags.join("\n");
}

export function buildCopyStaffFormConfirmMessage(formName: string) {
    return `フォーム「${formName}」を複製しますか？\n\n• 設問は全て複製されます\n• 「${formName}のコピー」という名前のフォームが作成されます\n• 「${formName}のコピー」は非公開です。後から必要に応じて設定を変更してください`;
}

export function buildDeleteStaffFormConfirmMessage(formName: string) {
    return `フォーム「${formName}」を削除しますか？\n\n• 設問、回答は全て削除されます`;
}

function parseStaffFormSummary(value: unknown): StaffFormSummary {
    return parseWithSchema(staffFormSummarySchema, value, "staff form");
}

function parseStaffFormDetail(value: unknown): StaffFormDetail {
    return parseWithSchema(staffFormDetailSchema, value, "staff form detail");
}

function parseStaffFormPreview(value: unknown): StaffFormPreview {
    return parseWithSchema(staffFormPreviewSchema, value, "staff form preview");
}

function parseStaffFormQuestion(value: unknown): StaffFormQuestion {
    return parseWithSchema(formQuestionSchema, value, "staff form question");
}

export function buildStaffFormUploadDownloadUrl(formId: string, uploadId: string) {
    return buildApiUrl(
        `/staff/forms/${encodeURIComponent(formId)}/uploads/${encodeURIComponent(uploadId)}/file`,
    );
}

export function buildStaffFormsExportUrl() {
    return buildApiUrl("/staff/forms/export");
}
