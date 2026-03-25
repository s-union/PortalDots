<script setup lang="ts">
definePage({
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
import BackLink from '@/components/ui/BackLink.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { useAuthorizedStaffContext } from '@/features/staff/hooks/useAuthorizedStaffContext'
import {
  extractStaffCircleMailValidationMessage,
  extractStaffCircleValidationMessage,
  useDeleteStaffCircleMutation,
  useSendStaffCircleMailMutation,
  useStaffCircleDetailQuery,
  useStaffCircleMailForm,
  useStaffCircleMailFormQuery,
  useUpdateStaffCircleMutation
} from '@/features/staff/circles/api'
import { useStaffParticipationTypesQuery } from '@/features/staff/participation-types/api'
import { useStaffPlacesQuery } from '@/features/staff/masters/places'

const route = useRoute('/staff/circles/[circleId]')
const router = useRouter()
const circleId = computed(() => String(route.params.circleId ?? ''))
const { enabled } = useAuthorizedStaffContext({ capability: 'circles.edit' })
const circleQuery = useStaffCircleDetailQuery(circleId, enabled)
const participationTypesQuery = useStaffParticipationTypesQuery(enabled)
const placesQuery = useStaffPlacesQuery(enabled)
const mailFormQuery = useStaffCircleMailFormQuery(circleId, enabled)
const updateCircleMutation = useUpdateStaffCircleMutation()
const deleteCircleMutation = useDeleteStaffCircleMutation(circleId)
const sendCircleMailMutation = useSendStaffCircleMailMutation(circleId)
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
const mailForm = useStaffCircleMailForm()
const errorMessage = ref('')
const successMessage = ref('')
const mailErrorMessage = ref('')
const mailSuccessMessage = ref('')

const participationTypeEditorRoute = computed(() => {
  const participationTypeId = circleQuery.data.value?.participationTypeId
  if (!participationTypeId) {
    return '/staff/circles/participation_types'
  }
  return `/staff/circles/participation_types/${encodeURIComponent(participationTypeId)}`
})

const mailRecipientCount = computed(() => mailFormQuery.data.value?.recipients.length ?? 0)
const canSendMail = computed(() => mailRecipientCount.value > 0 && !sendCircleMailMutation.isPending.value)

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

async function handleSendMail() {
  mailErrorMessage.value = ''
  mailSuccessMessage.value = ''

  try {
    await sendCircleMailMutation.mutateAsync({
      recipient: mailForm.value.recipient,
      subject: mailForm.value.subject,
      body: mailForm.value.body
    })
    mailForm.value = {
      recipient: mailForm.value.recipient,
      subject: '',
      body: ''
    }
    mailSuccessMessage.value = '企画所属者向けモックメールをキューに追加しました。実メールは送信していません。'
  } catch (error) {
    mailErrorMessage.value = extractStaffCircleMailValidationMessage(error)
  }
}
</script>

<template>
  <PageLayout>
    <BackLink to="/staff/circles"> 企画管理へ戻る </BackLink>

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
              <div class="rounded border border-border bg-surface-light px-4 py-4 text-sm text-muted">
                参加種別の詳細設定や参加登録フォーム編集は参加種別管理画面から行います。
                <RouterLink :to="participationTypeEditorRoute" class="ml-2 text-primary underline">
                  参加種別を開く
                </RouterLink>
              </div>
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">企画名</span>
                <input v-model="form.name" name="name" type="text" />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">企画名(よみ)</span>
                <input v-model="form.nameYomi" name="nameYomi" type="text" />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">企画を出店する団体の名称</span>
                <input v-model="form.groupName" name="groupName" type="text" />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">企画を出店する団体の名称(よみ)</span>
                <input v-model="form.groupNameYomi" name="groupNameYomi" type="text" />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">参加種別</span>
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
                <span class="text-xs text-muted-2"> 既存企画の参加種別は変更できません。 </span>
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">スタッフ用メモ</span>
                <span class="text-xs text-muted">ここに入力された内容はスタッフのみ閲覧できます。</span>
                <textarea v-model="form.notes" class="min-h-24" name="notes" />
              </label>
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
              <label v-if="form.status === 'rejected'" class="grid gap-2 text-sm text-body">
                <span class="font-medium">不受理理由</span>
                <textarea v-model="form.statusReason" class="min-h-16" name="statusReason" />
              </label>
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

      <SettingsSection title="企画所属者向けメール送信">
        <SettingsRow>
          <div
            v-if="mailFormQuery.isPending.value"
            class="rounded border border-border bg-surface-light px-4 py-3 text-sm text-muted"
          >
            宛先情報を読み込み中...
          </div>

          <div v-else class="grid gap-4">
            <p class="text-sm text-muted">送信対象: {{ mailRecipientCount }} 名</p>

            <p
              v-if="mailRecipientCount === 0"
              class="rounded border border-border bg-surface-light px-4 py-3 text-sm text-muted"
            >
              宛先となる企画所属者がいないため、メールは送信できません。
            </p>

            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">宛先</span>
              <select v-model="mailForm.recipient" name="recipient">
                <option value="all">所属者全員</option>
                <option value="leader">責任者のみ</option>
              </select>
            </label>

            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">件名</span>
              <input v-model="mailForm.subject" name="subject" type="text" />
            </label>

            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">本文</span>
              <textarea v-model="mailForm.body" class="min-h-40" name="body" />
            </label>

            <div class="rounded border border-border bg-surface-light px-4 py-4 text-sm leading-7 text-muted">
              <p>この送信はモックです。登録内容はキューで確認できますが、外部メール送信は行いません。</p>
              <p>本文は Markdown 記法をそのまま記入できます。</p>
              <p class="mt-2">現在はスタッフ用控えを送らず、本体送信のみを先行実装しています。</p>
              <p class="mt-2">
                宛先候補:
                {{
                  (mailFormQuery.data.value?.recipients ?? []).map((recipient) => recipient.displayName).join(' / ') ||
                  'なし'
                }}
              </p>
            </div>
          </div>
        </SettingsRow>
        <template #footer>
          <button
            class="rounded bg-primary px-8 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!canSendMail"
            type="button"
            @click="handleSendMail"
          >
            {{ sendCircleMailMutation.isPending.value ? '登録中...' : 'モックメールをキューに追加' }}
          </button>
        </template>
      </SettingsSection>

      <AlertMessage v-if="successMessage" tone="success">{{ successMessage }}</AlertMessage>
      <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>
      <AlertMessage v-if="mailSuccessMessage" tone="success">{{ mailSuccessMessage }}</AlertMessage>
      <AlertMessage v-if="mailErrorMessage">{{ mailErrorMessage }}</AlertMessage>
    </div>

    <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">企画を取得できませんでした。</div>
  </PageLayout>
</template>
