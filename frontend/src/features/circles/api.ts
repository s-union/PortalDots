import { createJsonHeaders, $api } from '@/lib/api/client'
import {
  parseWithSchema,
  parseArrayWithSchema,
  selectableCircleSchema,
  circleDetailSchema,
  circleMemberSchema
} from '@/lib/api/schema'
import type { FormQuestion } from '@/features/forms/api'
import type { FormAnswer, FormAnswerDraft } from '@/features/forms/answers'

export interface SelectableCircle {
  id: string
  name: string
  groupName: string
  participationTypeName: string
  submittedAt?: string | null
  status?: 'pending' | 'approved' | 'rejected'
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
  statusReason?: string
  formCloseAt?: string
  places?: string[]
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

export async function fetchCircleByInvitationToken(token: string): Promise<CircleDetail> {
  return $api.queryData('get', '/circles/join/{token}', { params: { path: { token } } }, parseCircleDetail, {
    errorMessage: '招待情報の取得に失敗しました'
  })
}

export function parseSelectableCircles(value: unknown): SelectableCircle[] {
  return parseArrayWithSchema(selectableCircleSchema, value, 'circles')
}

export function parseCircleDetail(value: unknown): CircleDetail {
  return parseWithSchema(circleDetailSchema, value, 'circle detail')
}

export function parseCircleMembers(value: unknown): CircleMember[] {
  return parseArrayWithSchema(circleMemberSchema, value, 'circle members')
}
