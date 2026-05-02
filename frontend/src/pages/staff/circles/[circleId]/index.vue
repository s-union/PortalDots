<script setup lang="ts">
definePage({
  path: '/staff/circles/:circleId',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'circles.edit'
  }
})

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import FormField from '@/components/ui/FormField.vue'
import FormInput from '@/components/ui/FormInput.vue'
import InfoBox from '@/components/ui/InfoBox.vue'
import MarkdownEditorField from '@/components/ui/MarkdownEditorField.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { canAccessCircleMail } from '@/features/staff/access/capabilities'
import { useAuthorizedStaffContext } from '@/features/staff/hooks/useAuthorizedStaffContext'
import {
  extractStaffCircleMemberValidationMessage,
  extractStaffCircleValidationMessage,
  useAddStaffCircleMemberMutation,
  useDeleteStaffCircleMemberMutation,
  useDeleteStaffCircleMutation,
  useStaffCircleDetailQuery,
  useStaffCircleMembersQuery,
  useUpdateStaffCircleMutation
} from '@/features/staff/circles/api'
import { useStaffParticipationTypesQuery } from '@/features/staff/participation-types/api'
import { useStaffPlacesQuery } from '@/features/staff/masters/places'
import { buildStaffCircleTabs } from '@/lib/ui/tabStrip'

const route = useRoute('/staff/circles/[circleId]/')
const router = useRouter()
const circleId = computed(() => String(route.params.circleId ?? ''))
const { enabled, sessionStore } = useAuthorizedStaffContext({ capability: 'circles.edit' })
const circleQuery = useStaffCircleDetailQuery(circleId, enabled)
const participationTypesQuery = useStaffParticipationTypesQuery(enabled)
const placesQuery = useStaffPlacesQuery(enabled)
const membersQuery = useStaffCircleMembersQuery(circleId, enabled)
const updateCircleMutation = useUpdateStaffCircleMutation()
const deleteCircleMutation = useDeleteStaffCircleMutation(circleId)
const addMemberMutation = useAddStaffCircleMemberMutation(circleId)
const deleteMemberMutation = useDeleteStaffCircleMemberMutation(circleId)
const form = ref({
  name: '',
  nameYomi: '',
  groupName: '',
  groupNameYomi: '',
  participationTypeId: '',
  notes: '',
  status: 'pending' as 'pending' | 'approved' | 'rejected',
  statusReason: '',
  placeIds: [] as string[]
})
const errorMessage = ref('')
const successMessage = ref('')
const memberLoginId = ref('')
const memberErrorMessage = ref('')

const participationTypeEditorRoute = computed(() => {
  const participationTypeId = circleQuery.data.value?.participationTypeId
  if (!participationTypeId) {
    return '/staff/circles/participation_types'
  }
  return `/staff/circles/participation_types/${encodeURIComponent(participationTypeId)}`
})

const memberCount = computed(() => membersQuery.data.value?.length ?? 0)
const circleTabs = computed(() =>
  buildStaffCircleTabs(circleId.value, 'edit', {
    canEdit: true,
    canSendEmails: canAccessCircleMail(sessionStore.roles, sessionStore.permissions)
  })
)

watch(
  () => [circleQuery.data.value, placesQuery.data.value] as const,
  ([circle, places]) => {
    if (!circle) {
      return
    }
    form.value = {
      name: circle.name,
      nameYomi: circle.nameYomi,
      groupName: circle.groupName,
      groupNameYomi: circle.groupNameYomi,
      participationTypeId: circle.participationTypeId,
      notes: circle.notes,
      status: circle.status as 'pending' | 'approved' | 'rejected',
      statusReason: circle.statusReason,
      placeIds: places ? places.filter((p) => circle.places.includes(p.name)).map((p) => p.id) : []
    }
  },
  { immediate: true }
)

async function handleSaveCircle() {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await updateCircleMutation.mutateAsync({
      circleId: circleId.value,
      name: form.value.name,
      nameYomi: form.value.nameYomi,
      groupName: form.value.groupName,
      groupNameYomi: form.value.groupNameYomi,
      participationTypeId: form.value.participationTypeId,
      notes: form.value.notes,
      status: form.value.status,
      statusReason: form.value.statusReason,
      placeIds: form.value.placeIds
    })
    successMessage.value = '企画を更新しました。'
  } catch (error) {
    errorMessage.value = extractStaffCircleValidationMessage(error)
  }
}

async function handleDeleteCircle() {
  if (typeof window !== 'undefined' && !window.confirm('この企画を削除しますか？')) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''

  try {
    await deleteCircleMutation.mutateAsync()
    await router.push('/staff/circles')
  } catch (error) {
    errorMessage.value = extractStaffCircleValidationMessage(error)
  }
}

async function handleAddMember() {
  memberErrorMessage.value = ''

  try {
    await addMemberMutation.mutateAsync(memberLoginId.value.trim())
    memberLoginId.value = ''
  } catch (error) {
    memberErrorMessage.value = extractStaffCircleMemberValidationMessage(error)
  }
}

async function handleDeleteMember(userId: string, displayName: string) {
  if (typeof window !== 'undefined' && !window.confirm(`${displayName} を企画所属者から削除しますか？`)) {
    return
  }

  memberErrorMessage.value = ''

  try {
    await deleteMemberMutation.mutateAsync(userId)
  } catch (error) {
    memberErrorMessage.value = extractStaffCircleMemberValidationMessage(error)
  }
}
</script>

<template>
  <TabStrip :tabs="circleTabs" />
  <PageLayout>
    <div v-if="circleQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <div v-else-if="circleQuery.data.value" class="space-y-6">
      <form class="space-y-6" @submit.prevent="handleSaveCircle">
        <SurfaceCard tag="header">
          <p class="text-sm text-primary">Circle Detail</p>
          <h2 class="mt-3 text-3xl font-semibold text-body">企画を編集</h2>
          <div class="mt-3 text-sm text-muted">企画ID : {{ circleQuery.data.value.id }}</div>
          <div class="mt-1 text-sm text-muted">{{ circleQuery.data.value.name }}</div>
        </SurfaceCard>

        <SettingsSection title="企画基本情報">
          <SettingsRow>
            <div class="grid gap-4">
              <InfoBox class="text-muted">
                参加種別の詳細設定や参加登録フォーム編集は参加種別管理画面から行います。
                <RouterLink :to="participationTypeEditorRoute" class="ml-2 text-primary underline">
                  参加種別を開く
                </RouterLink>
              </InfoBox>
              <FormField label="企画名" label-class="font-medium">
                <FormInput v-model="form.name" name="name" type="text" />
              </FormField>
              <FormField label="企画名(よみ)" required label-class="font-medium">
                <FormInput v-model="form.nameYomi" name="nameYomi" required type="text" />
              </FormField>
              <FormField label="企画を出店する団体の名称" label-class="font-medium">
                <FormInput v-model="form.groupName" name="groupName" type="text" />
              </FormField>
              <FormField label="企画を出店する団体の名称(よみ)" required label-class="font-medium">
                <FormInput v-model="form.groupNameYomi" name="groupNameYomi" required type="text" />
              </FormField>
              <FormField label="参加種別" helper="既存企画の参加種別は変更できません。" label-class="font-medium">
                <select v-model="form.participationTypeId" disabled name="participationTypeId">
                  <option value="">参加種別を選択してください</option>
                  <option
                    v-for="participationType in participationTypesQuery.data.value ?? []"
                    :key="participationType.id"
                    :value="participationType.id"
                  >
                    {{ participationType.name }}
                  </option>
                </select>
              </FormField>
              <FormField
                label="スタッフ用メモ"
                helper="ここに入力された内容はスタッフのみ閲覧できます。"
                label-class="font-medium"
              >
                <textarea v-model="form.notes" class="min-h-24" name="notes" />
              </FormField>
              <div class="grid gap-2 text-sm text-body">
                <span class="font-medium">登録受理状況</span>
                <div class="flex gap-4">
                  <label class="flex items-center gap-2">
                    <input v-model="form.status" type="radio" name="status" value="pending" />
                    審査中
                  </label>
                  <label class="flex items-center gap-2">
                    <input v-model="form.status" type="radio" name="status" value="approved" />
                    受理
                  </label>
                  <label class="flex items-center gap-2">
                    <input v-model="form.status" type="radio" name="status" value="rejected" />
                    不受理
                  </label>
                </div>
              </div>
              <FormField v-if="form.status === 'rejected'" label="不受理理由" label-class="font-medium">
                <MarkdownEditorField v-model="form.statusReason" min-height-class="min-h-16" name="statusReason" />
              </FormField>
              <div class="grid gap-2 text-sm text-body">
                <span class="font-medium">使用場所</span>
                <select v-model="form.placeIds" name="placeIds" multiple>
                  <option v-for="place in placesQuery.data.value ?? []" :key="place.id" :value="place.id">
                    {{ place.name }}
                  </option>
                </select>
                <span class="text-xs text-muted">Ctrl/Cmd を押しながらクリックで複数選択できます</span>
              </div>
            </div>
          </SettingsRow>
          <template #footer>
            <div class="flex flex-wrap justify-end gap-3">
              <button
                class="rounded border border-danger px-5 py-3 font-semibold text-danger transition hover:bg-danger-light disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="deleteCircleMutation.isPending.value"
                type="button"
                @click="handleDeleteCircle"
              >
                {{ deleteCircleMutation.isPending.value ? '削除中...' : '削除' }}
              </button>
              <button
                class="rounded bg-primary px-8 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="updateCircleMutation.isPending.value"
                type="submit"
              >
                {{ updateCircleMutation.isPending.value ? '更新中...' : '保存' }}
              </button>
            </div>
          </template>
        </SettingsSection>
      </form>

      <SettingsSection title="企画所属者">
        <SettingsRow>
          <div class="grid gap-5">
            <p class="text-sm text-muted">責任者を含む所属者は {{ memberCount }} 名です。</p>

            <InfoBox v-if="membersQuery.isPending.value" class="text-muted"> 所属者を読み込み中... </InfoBox>

            <InfoBox v-else-if="(membersQuery.data.value?.length ?? 0) === 0" class="text-muted">
              所属者はいません。
            </InfoBox>

            <div v-else class="divide-y divide-border rounded border border-border">
              <div
                v-for="member in membersQuery.data.value"
                :key="member.userId"
                class="flex flex-wrap items-start justify-between gap-3 px-4 py-4"
              >
                <div class="grid gap-1">
                  <div class="flex items-center gap-2">
                    <p class="font-medium text-body">{{ member.displayName }}</p>
                    <span
                      class="inline-flex rounded-full px-2 py-1 text-[11px]"
                      :class="member.isLeader ? 'bg-primary-light text-primary' : 'bg-surface-light text-muted-2'"
                    >
                      {{ member.isLeader ? '責任者' : 'メンバー' }}
                    </span>
                  </div>
                  <p class="text-xs text-muted">
                    {{ member.loginIds.join(' / ') || 'ログイン ID なし' }}
                  </p>
                </div>

                <button
                  v-if="!member.isLeader"
                  class="rounded border border-danger px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger-light disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="deleteMemberMutation.isPending.value"
                  type="button"
                  @click="handleDeleteMember(member.userId, member.displayName)"
                >
                  {{ deleteMemberMutation.isPending.value ? '削除中...' : '削除' }}
                </button>
              </div>
            </div>

            <form class="grid gap-3" @submit.prevent="handleAddMember">
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">ユーザーを追加</span>
                <span class="text-xs text-muted">学籍番号または連絡先メールアドレスを入力して所属させます。</span>
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    v-model="memberLoginId"
                    name="memberLoginId"
                    type="text"
                    class="flex-1"
                    placeholder="24a0000 / user@example.com"
                  />
                  <button
                    class="rounded bg-primary px-5 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="addMemberMutation.isPending.value"
                    type="submit"
                  >
                    {{ addMemberMutation.isPending.value ? '追加中...' : '所属者を追加' }}
                  </button>
                </div>
              </label>
            </form>
          </div>
        </SettingsRow>
        <template v-if="memberErrorMessage" #footer>
          <AlertMessage tone="danger">
            {{ memberErrorMessage }}
          </AlertMessage>
        </template>
      </SettingsSection>

      <AlertMessage v-if="successMessage" tone="success">{{ successMessage }}</AlertMessage>
      <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>
    </div>

    <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">企画を取得できませんでした。</div>
  </PageLayout>
</template>
