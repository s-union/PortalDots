import { computed, type MaybeRefOrGetter, toValue } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { createJsonHeaders, $api } from "@/lib/api/client";
import { parseWithSchema, staffContactCategorySchema } from "@/lib/api/schema";
import { extractValidationMessage, parseValidationError } from "@/lib/api/validation";
import { useSessionStore } from "@/features/session/store";

export type StaffContactCategory = {
  id: string;
  name: string;
  email: string;
};

export async function fetchStaffContactCategories() {
  return $api.queryData(
    "get",
    "/staff/contact-categories",
    {
      headers: createJsonHeaders(),
    },
    parseStaffContactCategories,
    {
      errorMessage: "Failed to fetch contact categories",
    },
  );
}

export async function createStaffContactCategory(
  payload: Omit<StaffContactCategory, "id">,
  csrfToken: string,
) {
  return $api.mutationData(
    "post",
    "/staff/contact-categories",
    {
      headers: createJsonHeaders(csrfToken),
      body: payload,
    },
    parseStaffContactCategory,
    {
      errorMessage: "Failed to create contact category",
      errorParsers: {
        422: (error) => parseValidationError(error, "staff contact category"),
      },
    },
  );
}

export async function updateStaffContactCategory(payload: StaffContactCategory, csrfToken: string) {
  return $api.mutationData(
    "put",
    "/staff/contact-categories/{categoryID}",
    {
      headers: createJsonHeaders(csrfToken),
      params: { path: { categoryID: payload.id } },
      body: {
        name: payload.name,
        email: payload.email,
      },
    },
    parseStaffContactCategory,
    {
      errorMessage: "Failed to update contact category",
      errorParsers: {
        422: (error) => parseValidationError(error, "staff contact category"),
      },
    },
  );
}

export async function deleteStaffContactCategory(categoryId: string, csrfToken: string) {
  await $api.noContentMutation(
    "delete",
    "/staff/contact-categories/{categoryID}",
    {
      headers: createJsonHeaders(csrfToken),
      params: { path: { categoryID: categoryId } },
    },
    {
      errorMessage: "Failed to delete contact category",
    },
  );
}

export function useStaffContactCategoriesQuery(enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    "get",
    "/staff/contact-categories",
    {
      headers: createJsonHeaders(),
    },
    parseStaffContactCategories,
    {
      queryKey: ["staff", "contact-categories"],
      enabled: computed(() => toValue(enabled)),
      retry: false,
    },
    {
      errorMessage: "Failed to fetch contact categories",
    },
  );
}

export function useCreateStaffContactCategoryMutation() {
  const queryClient = useQueryClient();
  const sessionStore = useSessionStore();
  return useMutation({
    mutationFn: async (payload: Omit<StaffContactCategory, "id">) =>
      createStaffContactCategory(payload, sessionStore.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["staff", "contact-categories"] });
    },
  });
}

export function useUpdateStaffContactCategoryMutation() {
  const queryClient = useQueryClient();
  const sessionStore = useSessionStore();
  return useMutation({
    mutationFn: async (payload: StaffContactCategory) =>
      updateStaffContactCategory(payload, sessionStore.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["staff", "contact-categories"] });
    },
  });
}

export function useDeleteStaffContactCategoryMutation() {
  const queryClient = useQueryClient();
  const sessionStore = useSessionStore();
  return useMutation({
    mutationFn: async (categoryId: string) =>
      deleteStaffContactCategory(categoryId, sessionStore.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["staff", "contact-categories"] });
    },
  });
}

export function extractStaffContactCategoryValidationMessage(error: unknown) {
  return extractValidationMessage(error, "問い合わせカテゴリの保存に失敗しました。");
}

function parseStaffContactCategories(value: unknown): StaffContactCategory[] {
  return parseWithSchema(staffContactCategorySchema.array(), value, "staff contact categories");
}

function parseStaffContactCategory(value: unknown): StaffContactCategory {
  return parseWithSchema(staffContactCategorySchema, value, "staff contact category");
}
