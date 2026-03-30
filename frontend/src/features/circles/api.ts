import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { createJsonHeaders, $api } from '@/lib/api/client'
import {
  parseWithSchema,
  addCircleMemberInputSchema,
  selectableCircleSchema,
  circleDetailSchema,
  circleMemberSchema
} from '@/lib/api/schema'
import { extractValidationMessage } from '@/lib/api/validation'
import type { FormQuestion } from '@/features/forms/api'
import type { FormAnswer, FormAnswerDraft } from '@/features/forms/answers'
import { fetchSessionBootstrap } from '@/features/session/api'
import { useSessionStore } from '@/features/session/store'

export interface SelectableCircle {
  id: string
  name: string
  groupName: string
  participationTypeName: string
}

export interface CircleDetail {
  id: string
  name: string
  nameYomi: string
  groupName: string
  groupNameYomi: string
  participationTypeId: string
  participationTypeName: string
  formId: string
  notes: string
  leaderDisplayName: string
  canChangeGroupName: boolean
  isLeader: boolean
  lastUpdatedAt: string
  usersCountMin: number
  usersCountMax: number
  memberCount: number
  canSubmit: boolean
  formDescription: string
  confirmationMessage: string
  questions: FormQuestion[]
  answer: FormAnswer | null
  invitationToken: string
  submittedAt: string | null
  status: 'pending' | 'approved' | 'rejected'
}

export interface CircleMember {
  userId: string
  displayName: string
  isLeader: boolean
}

export interface AddCircleMemberInput {
  loginId: string
}

export interface CreateCircleInput {
  name: string
  nameYomi: string
  groupName: string
  groupNameYomi: string
  participationTypeId: string
  notes: string
  details: FormAnswerDraft
}

export interface UpdateCircleInput {
  name: string
  nameYomi: string
  groupName: string
  groupNameYomi: string
  notes: string
  details: FormAnswerDraft
}

export interface SubmitCircleInput {
  lastUpdatedAt: string
}

export async function fetchSelectableCircles() {
  return $api.queryData(
    'get',
    '/circles',
    {
      headers: createJsonHeaders()
    },
    parseSelectableCircles,
    {
      errorMessage: 'Failed to fetch circles'
    }
  )
}

export async function fetchParticipationTypeRegistrationForm(participationTypeId: string) {
  return $api.queryData(
    'get',
    '/participation-types/{typeID}/registration-form',
    {
      headers: createJsonHeaders(),
      params: {
        path: {
          typeID: participationTypeId
        }
      }
    },
    parseCircleDetail,
    {
      errorMessage: '参加登録フォームの取得に失敗しました'
    }
  )
}

export async function selectCurrentCircle(circleId: string, csrfToken: string) {
  await $api.noContentMutation(
    'put',
    '/circles/current',
    {
      headers: createJsonHeaders(csrfToken),
      body: { circleId }
    },
    {
      errorMessage: 'Failed to set current circle'
    }
  )
}

export function useSelectableCirclesQuery() {
  const sessionStore = useSessionStore()

  return $api.useQueryData(
    'get',
    '/circles',
    {
      headers: createJsonHeaders()
    },
    parseSelectableCircles,
    {
      queryKey: ['circles', 'selectable'],
      enabled: computed(() => sessionStore.isAuthenticated),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch circles'
    }
  )
}

export function useSelectCurrentCircleMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (circleId: string) =>
      $api.noContentMutation(
        'put',
        '/circles/current',
        {
          headers: createJsonHeaders(sessionStore.csrfToken),
          body: { circleId }
        },
        {
          errorMessage: 'Failed to set current circle'
        }
      ),
    onSuccess: async () => {
      const session = await fetchSessionBootstrap()
      sessionStore.hydrate(session)
      queryClient.setQueryData(['session', 'bootstrap'], session)
    }
  })
}

export function useCreateCircleMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (input: CreateCircleInput) =>
      $api.queryData(
        'post',
        '/circles',
        {
          headers: createJsonHeaders(sessionStore.csrfToken),
          body: {
            name: input.name,
            nameYomi: input.nameYomi,
            groupName: input.groupName,
            groupNameYomi: input.groupNameYomi,
            participationTypeId: input.participationTypeId,
            notes: input.notes,
            details: input.details
          }
        },
        parseCircleDetail,
        { errorMessage: '企画の作成に失敗しました' }
      ),
    onSuccess: async () => {
      const session = await fetchSessionBootstrap()
      sessionStore.hydrate(session)
      queryClient.setQueryData(['session', 'bootstrap'], session)
      await queryClient.invalidateQueries({ queryKey: ['circles'] })
    }
  })
}

export function useCurrentCircleDetailQuery() {
  const sessionStore = useSessionStore()

  return useQuery({
    queryKey: ['circles', 'current', 'detail'],
    queryFn: () =>
      $api.queryData('get', '/circles/current/detail', { headers: createJsonHeaders() }, parseCircleDetail, {
        errorMessage: '企画情報の取得に失敗しました'
      }),
    enabled: computed(() => sessionStore.isAuthenticated && sessionStore.currentCircle !== null),
    retry: false
  })
}

export function useParticipationTypeRegistrationFormQuery(participationTypeId: MaybeRefOrGetter<string>) {
  const sessionStore = useSessionStore()

  return $api.useQueryData(
    'get',
    '/participation-types/{typeID}/registration-form',
    () => ({
      headers: createJsonHeaders(),
      params: {
        path: {
          typeID: toValue(participationTypeId)
        }
      }
    }),
    parseCircleDetail,
    {
      queryKey: computed(() => ['participation-types', 'registration-form', toValue(participationTypeId)]),
      enabled: computed(() => sessionStore.isAuthenticated && toValue(participationTypeId).trim().length > 0),
      retry: false
    },
    {
      errorMessage: '参加登録フォームの取得に失敗しました'
    }
  )
}

export function useUpdateCircleMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (input: UpdateCircleInput) =>
      $api.queryData(
        'put',
        '/circles/current/detail',
        {
          headers: createJsonHeaders(sessionStore.csrfToken),
          body: {
            ...input,
            details: input.details
          }
        },
        parseCircleDetail,
        { errorMessage: '企画情報の更新に失敗しました' }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['circles', 'current', 'detail'] })
    }
  })
}

export function useDeleteCircleMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async () =>
      $api.noContentMutation(
        'delete',
        '/circles/current',
        { headers: createJsonHeaders(sessionStore.csrfToken) },
        { errorMessage: '企画の削除に失敗しました' }
      ),
    onSuccess: async () => {
      const session = await fetchSessionBootstrap()
      sessionStore.hydrate(session)
      queryClient.setQueryData(['session', 'bootstrap'], session)
      await queryClient.invalidateQueries({ queryKey: ['circles'] })
    }
  })
}

export function useSubmitCircleMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (input: SubmitCircleInput) =>
      $api.queryData(
        'post',
        '/circles/current/submit',
        {
          headers: createJsonHeaders(sessionStore.csrfToken),
          body: input
        },
        parseCircleDetail,
        { errorMessage: '参加登録の提出に失敗しました' }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['circles', 'current', 'detail'] })
    }
  })
}

export function useCircleMembersQuery() {
  const sessionStore = useSessionStore()

  return useQuery({
    queryKey: ['circles', 'current', 'members'],
    queryFn: () =>
      $api.queryData('get', '/circles/current/members', { headers: createJsonHeaders() }, parseCircleMembers, {
        errorMessage: 'メンバー一覧の取得に失敗しました'
      }),
    enabled: computed(() => sessionStore.isAuthenticated && sessionStore.currentCircle !== null),
    retry: false
  })
}

export function useRemoveMemberMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (userId: string) =>
      $api.noContentMutation(
        'delete',
        '/circles/current/members/{userID}',
        {
          headers: createJsonHeaders(sessionStore.csrfToken),
          params: { path: { userID: userId } }
        },
        { errorMessage: 'メンバーの削除に失敗しました' }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['circles', 'current', 'members'] })
    }
  })
}

export function useAddCircleMemberMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (input: AddCircleMemberInput) => {
      const parsed = addCircleMemberInputSchema.parse(input)
      await $api.noContentMutation(
        'post',
        '/circles/current/members',
        {
          headers: createJsonHeaders(sessionStore.csrfToken),
          body: parsed
        },
        { errorMessage: 'メンバーの追加に失敗しました' }
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['circles', 'current', 'members'] })
    }
  })
}

export function useRegenerateInvitationTokenMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async () =>
      $api.queryData(
        'post',
        '/circles/current/invitation-token/regenerate',
        { headers: createJsonHeaders(sessionStore.csrfToken) },
        parseCircleDetail,
        { errorMessage: '招待トークンの再生成に失敗しました' }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['circles', 'current', 'detail'] })
    }
  })
}

export function useJoinCircleMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (token: string) =>
      $api.queryData(
        'post',
        '/circles/join/{token}',
        {
          headers: createJsonHeaders(sessionStore.csrfToken),
          params: { path: { token } }
        },
        parseCircleDetail,
        { errorMessage: '企画への参加に失敗しました' }
      ),
    onSuccess: async () => {
      const session = await fetchSessionBootstrap()
      sessionStore.hydrate(session)
      queryClient.setQueryData(['session', 'bootstrap'], session)
      await queryClient.invalidateQueries({ queryKey: ['circles'] })
    }
  })
}

export function extractAddCircleMemberValidationMessage(error: unknown) {
  return extractValidationMessage(error, 'メンバーの追加に失敗しました。')
}

function parseSelectableCircles(value: unknown): SelectableCircle[] {
  return parseWithSchema(selectableCircleSchema.array(), value, 'circles')
}

function parseCircleDetail(value: unknown): CircleDetail {
  return parseWithSchema(circleDetailSchema, value, 'circle detail')
}

function parseCircleMembers(value: unknown): CircleMember[] {
  return parseWithSchema(circleMemberSchema.array(), value, 'circle members')
}
