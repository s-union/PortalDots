import { computed, ref, type MaybeRefOrGetter, toValue } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { createJsonHeaders, $api } from '@/lib/api/client'
import { buildStaffListRequestParams, type StaffListQueryParamsInput } from '@/lib/staffListQuery'
import { extractValidationMessage } from '@/lib/api/validation'
import { useSessionStore } from '@/features/session/store'
import {
  parseStaffForms,
  parseStaffFormDetail,
  parseStaffFormPreview,
  createStaffForm,
  updateStaffForm,
  createStaffFormQuestion,
  updateStaffFormQuestion,
  deleteStaffFormQuestion,
  reorderStaffFormQuestions,
  copyStaffForm,
  deleteStaffForm,
  type CreateStaffFormPayload,
  type CreateStaffFormQuestionPayload,
  type UpdateStaffFormQuestionPayload
} from './api'
import { createDefaultStaffFormPayload } from './utils'

export function useStaffFormsQuery(enabled: MaybeRefOrGetter<boolean>, params?: StaffListQueryParamsInput) {
  return $api.useQueryData(
    'get',
    '/staff/forms',
    () => ({
      headers: createJsonHeaders(),
      ...buildStaffListRequestParams(params)
    }),
    parseStaffForms,
    {
      queryKey: computed(() => ['staff', 'forms', toValue(params)]),
      enabled: computed(() => toValue(enabled)),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch staff forms'
    }
  )
}

export function useStaffFormDetailQuery(formId: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    'get',
    '/staff/forms/{formID}',
    () => ({
      headers: createJsonHeaders(),
      params: {
        path: {
          formID: toValue(formId)
        }
      }
    }),
    parseStaffFormDetail,
    {
      queryKey: computed(() => ['staff', 'forms', 'detail', toValue(formId)]),
      enabled: computed(() => toValue(enabled) && toValue(formId).trim().length > 0),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch staff form'
    }
  )
}

export function useStaffFormPreviewQuery(formId: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    'get',
    '/staff/forms/{formID}/preview',
    () => ({
      headers: createJsonHeaders(),
      params: {
        path: {
          formID: toValue(formId)
        }
      }
    }),
    parseStaffFormPreview,
    {
      queryKey: computed(() => ['staff', 'forms', 'preview', toValue(formId)]),
      enabled: computed(() => toValue(enabled) && toValue(formId).trim().length > 0),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch staff form preview'
    }
  )
}

export function useCreateStaffFormMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: CreateStaffFormPayload) => createStaffForm(payload, sessionStore.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['staff', 'forms']
      })
    }
  })
}

export function useUpdateStaffFormMutation(formId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: CreateStaffFormPayload) =>
      updateStaffForm(toValue(formId), payload, sessionStore.csrfToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['staff', 'forms']
        }),
        queryClient.invalidateQueries({
          queryKey: ['staff', 'forms', 'detail', toValue(formId)]
        }),
        queryClient.invalidateQueries({
          queryKey: ['staff', 'forms', 'preview', toValue(formId)]
        })
      ])
    }
  })
}

export function useCreateStaffFormQuestionMutation(formId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: CreateStaffFormQuestionPayload) =>
      createStaffFormQuestion(toValue(formId), payload, sessionStore.csrfToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['staff', 'forms', 'detail', toValue(formId)]
        }),
        queryClient.invalidateQueries({
          queryKey: ['staff', 'forms', 'preview', toValue(formId)]
        })
      ])
    }
  })
}

export function useUpdateStaffFormQuestionMutation(formId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: UpdateStaffFormQuestionPayload) =>
      updateStaffFormQuestion(toValue(formId), payload, sessionStore.csrfToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['staff', 'forms', 'detail', toValue(formId)]
        }),
        queryClient.invalidateQueries({
          queryKey: ['staff', 'forms', 'preview', toValue(formId)]
        })
      ])
    }
  })
}

export function useDeleteStaffFormQuestionMutation(formId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (questionId: string) =>
      deleteStaffFormQuestion(toValue(formId), questionId, sessionStore.csrfToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['staff', 'forms', 'detail', toValue(formId)]
        }),
        queryClient.invalidateQueries({
          queryKey: ['staff', 'forms', 'preview', toValue(formId)]
        })
      ])
    }
  })
}

export function useReorderStaffFormQuestionsMutation(formId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (questionIds: string[]) =>
      reorderStaffFormQuestions(toValue(formId), questionIds, sessionStore.csrfToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['staff', 'forms', 'detail', toValue(formId)]
        }),
        queryClient.invalidateQueries({
          queryKey: ['staff', 'forms', 'preview', toValue(formId)]
        })
      ])
    }
  })
}

export function useCopyStaffFormMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (formId: string) => copyStaffForm(formId, sessionStore.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['staff', 'forms']
      })
    }
  })
}

export function useDeleteStaffFormMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (formId: string) => deleteStaffForm(formId, sessionStore.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['staff', 'forms']
      })
    }
  })
}

export function useStaffFormForm() {
  return ref<CreateStaffFormPayload>(createDefaultStaffFormPayload())
}

export function extractStaffFormValidationMessage(error: unknown) {
  return extractValidationMessage(error, 'フォームの作成に失敗しました。')
}
