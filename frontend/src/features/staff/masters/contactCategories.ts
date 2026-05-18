import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { createJsonHeaders, $api } from '@/lib/api/client'
import { parseWithSchema, parseArrayWithSchema, staffContactCategorySchema } from '@/lib/api/schema'
import { parseValidationError } from '@/lib/api/validation'
import { useStaffMasterMutation } from './shared'

export interface StaffContactCategory {
  id: string
  name: string
  email: string
}

export async function fetchStaffContactCategories() {
  return $api.queryData(
    'get',
    '/staff/contact-categories',
    {
      headers: createJsonHeaders()
    },
    parseStaffContactCategories,
    {
      errorMessage: 'Failed to fetch contact categories'
    }
  )
}

export async function createStaffContactCategory(payload: Omit<StaffContactCategory, 'id'>, csrfToken: string) {
  return $api.mutationData(
    'post',
    '/staff/contact-categories',
    {
      headers: createJsonHeaders(csrfToken),
      body: payload
    },
    parseStaffContactCategory,
    {
      errorMessage: 'Failed to create contact category',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff contact category')
      }
    }
  )
}

export async function updateStaffContactCategory(payload: StaffContactCategory, csrfToken: string) {
  return $api.mutationData(
    'put',
    '/staff/contact-categories/{categoryID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: { path: { categoryID: payload.id } },
      body: {
        name: payload.name,
        email: payload.email
      }
    },
    parseStaffContactCategory,
    {
      errorMessage: 'Failed to update contact category',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff contact category')
      }
    }
  )
}

export async function deleteStaffContactCategory(categoryId: string, csrfToken: string) {
  await $api.noContentMutation(
    'delete',
    '/staff/contact-categories/{categoryID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: { path: { categoryID: categoryId } }
    },
    {
      errorMessage: 'Failed to delete contact category'
    }
  )
}

export function useStaffContactCategoriesQuery(enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    'get',
    '/staff/contact-categories',
    {
      headers: createJsonHeaders()
    },
    parseStaffContactCategories,
    {
      queryKey: ['staff', 'contact-categories'],
      enabled: computed(() => toValue(enabled)),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch contact categories'
    }
  )
}

export const useCreateStaffContactCategoryMutation = () =>
  useStaffMasterMutation(
    (payload: Omit<StaffContactCategory, 'id'>, csrfToken: string) => createStaffContactCategory(payload, csrfToken),
    ['staff', 'contact-categories']
  )

export const useUpdateStaffContactCategoryMutation = () =>
  useStaffMasterMutation(
    (payload: StaffContactCategory, csrfToken: string) => updateStaffContactCategory(payload, csrfToken),
    ['staff', 'contact-categories']
  )

export const useDeleteStaffContactCategoryMutation = () =>
  useStaffMasterMutation(
    (categoryId: string, csrfToken: string) => deleteStaffContactCategory(categoryId, csrfToken),
    ['staff', 'contact-categories']
  )

export function buildDeleteStaffContactCategoryConfirmMessage(category: StaffContactCategory) {
  return `${category.name}(${category.email})を削除しますか？`
}

function parseStaffContactCategories(value: unknown): StaffContactCategory[] {
  return parseArrayWithSchema(staffContactCategorySchema, value, 'staff contact categories')
}

function parseStaffContactCategory(value: unknown): StaffContactCategory {
  return parseWithSchema(staffContactCategorySchema, value, 'staff contact category')
}
