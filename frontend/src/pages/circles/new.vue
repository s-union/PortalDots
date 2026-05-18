<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true
  }
})

import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AnswerQuestionFields from '@/components/forms/AnswerQuestionFields.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import CircleRegistrationSteps from '@/features/circles/components/CircleRegistrationSteps.vue'
import { useCreateCircleMutation, useParticipationTypeRegistrationFormQuery } from '@/features/circles/queries'
import { useParticipationTypesQuery } from '@/features/participation-types/api'
import { useFormAnswerEditorDraft } from '@/features/forms/answers'
import { useSessionStore } from '@/features/session/store'
import { extractValidationMessage } from '@/lib/api/validation'
import { useFormValidation, circleRegistrationFormSchema, buildFormAnswerSchema } from '@/lib/form-validation'
import BaseButton from '@/components/ui/BaseButton.vue'
import FormError from '@/components/ui/FormError.vue'
import ActionsFooter from '@/components/ui/ActionsFooter.vue'
import FormField from '@/components/ui/FormField.vue'
import { routeString } from '@/lib/routeQuery'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const createMutation = useCreateCircleMutation()
const canCreateCircleRegistration = computed(() => sessionStore.user?.canCreateCircleRegistration !== false)
const participationTypesQuery = useParticipationTypesQuery(canCreateCircleRegistration)

const form = reactive({
  name: '',
  nameYomi: '',
  groupName: '',
  groupNameYomi: '',
  participationTypeId: '',
  notes: ''
})

const { getFieldError, validateAll, markTouched } = useFormValidation({
  schema: circleRegistrationFormSchema,
  form: computed(() => form)
})

const errorMessage = ref('')
const requestedParticipationTypeId = computed(() => {
  const legacyValue = routeString(route.query.participation_type)
  if (legacyValue !== '') {
    return legacyValue
  }

  return routeString(route.query.participationTypeId)
})
const selectedParticipationType = computed(
  () => participationTypesQuery.data.value?.find((item) => item.id === form.participationTypeId) ?? null
)
const registrationFormQuery = useParticipationTypeRegistrationFormQuery(computed(() => form.participationTypeId))
const leaderDisplayName = computed(() => sessionStore.user?.displayName ?? '')
const registrationFormDescription = computed(() => registrationFormQuery.data.value?.formDescription.trim() ?? '')
const questions = computed(() => registrationFormQuery.data.value?.questions ?? [])
const draft = useFormAnswerEditorDraft(
  computed(() => null),
  questions
)
const answerSchema = computed(() => buildFormAnswerSchema(questions.value))
const {
  getFieldError: getAnswerFieldError,
  validateAll: validateAnswerFields,
  markTouched: markAnswerTouched
} = useFormValidation({ schema: answerSchema, form: draft })

const canChangeGroupName = computed(() => registrationFormQuery.data.value?.canChangeGroupName ?? true)
const requiresMemberStep = computed(() => {
  if (selectedParticipationType.value) {
    return selectedParticipationType.value.usersCountMax > 1
  }

  const registration = registrationFormQuery.data.value
  if (!registration) {
    return false
  }

  return registration.usersCountMax > 1
})

watch(
  [requestedParticipationTypeId, () => participationTypesQuery.data.value],
  ([requestedId, participationTypes]) => {
    if (form.participationTypeId !== '' || !requestedId) {
      return
    }

    if (!(participationTypes ?? []).some((participationType) => participationType.id === requestedId)) {
      return
    }

    form.participationTypeId = requestedId
  },
  { immediate: true }
)

watch(
  () => registrationFormQuery.data.value,
  (registration) => {
    if (!registration) {
      return
    }
    if (!form.groupName || !canChangeGroupName.value) {
      form.groupName = registration.groupName
    }
    if (!form.groupNameYomi || !canChangeGroupName.value) {
      form.groupNameYomi = registration.groupNameYomi
    }
  },
  { immediate: true }
)

async function handleSubmit() {
  if (!canCreateCircleRegistration.value) {
    errorMessage.value = 'このアカウントでは新しい企画を登録できません。'
    return
  }

  // Validate all fields before submitting
  if (!validateAll()) {
    return
  }
  if (!validateAnswerFields()) {
    return
  }

  errorMessage.value = ''

  try {
    await createMutation.mutateAsync({
      name: form.name,
      nameYomi: form.nameYomi,
      groupName: form.groupName,
      groupNameYomi: form.groupNameYomi,
      participationTypeId: form.participationTypeId,
      notes: form.notes,
      details: draft.value
    })
    await router.push(requiresMemberStep.value ? '/workspace/circles/members' : '/workspace/circles/confirm')
  } catch (error) {
    errorMessage.value = extractValidationMessage(error, '企画の作成に失敗しました。入力内容をご確認ください。')
  }
}
</script>

<template>
  <PageLayout spacious>
    <SurfaceCard>
      <SurfaceCardBand borderless>
        <CircleRegistrationSteps :current-step="1" :requires-member-step="requiresMemberStep" />
        <h1 class="mt-3 text-2xl font-semibold text-body">企画参加登録</h1>
        <p class="mt-2 text-sm text-muted">参加登録する企画の情報を入力してください。</p>
        <p v-if="requestedParticipationTypeId" class="mt-2 text-sm text-muted">
          URL パラメータで指定された参加種別を自動選択しています。
        </p>
      </SurfaceCardBand>
    </SurfaceCard>

    <AlertMessage v-if="!canCreateCircleRegistration" tone="danger">
      このアカウントでは新しい企画を登録できません。所属中の企画を選択して作業してください。
    </AlertMessage>

    <SettingsSection v-if="canCreateCircleRegistration && registrationFormDescription" title="必ずお読みください">
      <div class="px-6 py-6 whitespace-pre-wrap text-sm leading-7 text-body">
        {{ registrationFormDescription }}
      </div>
    </SettingsSection>

    <SettingsSection v-if="canCreateCircleRegistration" title="企画情報を入力">
      <SettingsRow>
        <div class="grid gap-4">
          <AlertMessage v-if="selectedParticipationType && selectedParticipationType.usersCountMax > 1" tone="info">
            企画情報の入力は、企画責任者の方が行ってください。企画責任者以外の方は、企画責任者の方の指示に従ってください。
          </AlertMessage>

          <AlertMessage v-if="selectedParticipationType && !canChangeGroupName" tone="danger">
            すでに団体責任者として他の企画参加登録を提出しているため、「企画を出店する団体の名称」ならびに「企画を出店する団体の名称(よみ)」は自動入力されており、変更できません。
          </AlertMessage>

          <FormField label="企画責任者" label-class="font-semibold">
            <input :value="leaderDisplayName" name="leaderDisplayName" readonly type="text" />
          </FormField>

          <FormField
            label="参加種別"
            label-class="font-semibold"
            :error="getFieldError('participationTypeId')"
            required
          >
            <select
              v-model="form.participationTypeId"
              name="participationTypeId"
              :class="{ 'border-danger': getFieldError('participationTypeId') }"
              @blur="markTouched('participationTypeId')"
              @change="markTouched('participationTypeId')"
            >
              <option value="">選択してください</option>
              <option v-for="pt in participationTypesQuery.data.value ?? []" :key="pt.id" :value="pt.id">
                {{ pt.name }} ({{ pt.usersCountMin }}〜{{ pt.usersCountMax }}人)
              </option>
            </select>
          </FormField>

          <div
            v-if="selectedParticipationType"
            class="rounded border border-border bg-form-control px-4 py-3 text-sm text-body"
          >
            <p class="font-semibold">{{ selectedParticipationType.name }}</p>
            <p class="mt-1 text-muted">{{ selectedParticipationType.description }}</p>
          </div>

          <FormField label="企画名" label-class="font-semibold" :error="getFieldError('name')" required>
            <input
              v-model="form.name"
              name="name"
              type="text"
              placeholder="例: ○○サークル展示"
              :class="{ 'border-danger': getFieldError('name') }"
              @blur="markTouched('name')"
              @input="markTouched('name')"
            />
          </FormField>

          <FormField label="企画名（よみ）" label-class="font-semibold" :error="getFieldError('nameYomi')" required>
            <input
              v-model="form.nameYomi"
              name="nameYomi"
              required
              type="text"
              placeholder="ひらがなで入力"
              :class="{ 'border-danger': getFieldError('nameYomi') }"
              @blur="markTouched('nameYomi')"
              @input="markTouched('nameYomi')"
            />
          </FormField>

          <FormField
            label="企画を出店する団体の名称"
            label-class="font-semibold"
            :error="getFieldError('groupName')"
            required
          >
            <input
              v-model="form.groupName"
              :disabled="!canChangeGroupName"
              name="groupName"
              type="text"
              placeholder="例: ○○サークル"
              :class="{ 'border-danger': getFieldError('groupName') && canChangeGroupName }"
              @blur="markTouched('groupName')"
              @input="markTouched('groupName')"
            />
          </FormField>

          <FormField
            label="企画を出店する団体の名称（よみ）"
            label-class="font-semibold"
            :error="getFieldError('groupNameYomi') && canChangeGroupName"
            required
          >
            <input
              v-model="form.groupNameYomi"
              :disabled="!canChangeGroupName"
              name="groupNameYomi"
              required
              type="text"
              placeholder="ひらがなで入力"
              :class="{ 'border-danger': getFieldError('groupNameYomi') && canChangeGroupName }"
              @blur="markTouched('groupNameYomi')"
              @input="markTouched('groupNameYomi')"
            />
          </FormField>

          <p v-if="!canChangeGroupName" class="text-sm text-muted">
            既に登録済みの企画があるため、団体名は既存企画から引き継がれます。
          </p>

          <FormField label="備考" label-class="font-semibold">
            <textarea v-model="form.notes" name="notes" rows="3" placeholder="任意のメモ" />
          </FormField>
        </div>
      </SettingsRow>

      <SettingsRow>
        <div v-if="form.participationTypeId === ''" class="text-sm text-muted">先に参加種別を選択してください。</div>

        <div v-else-if="registrationFormQuery.isPending.value" class="text-sm text-muted">フォームを読み込み中...</div>

        <div v-else-if="registrationFormQuery.data.value" class="grid gap-0">
          <template v-for="(question, index) in questions" :key="question.id">
            <div
              v-if="question.type === 'heading'"
              class="px-6 py-5"
              :class="index < questions.length - 1 ? 'border-b border-border' : ''"
            >
              <h3 class="text-lg font-semibold text-body">{{ question.name }}</h3>
              <p v-if="question.description" class="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted">
                {{ question.description }}
              </p>
            </div>

            <div v-else class="px-6 py-5" :class="index < questions.length - 1 ? 'border-b border-border' : ''">
              <div class="grid gap-3">
                <div>
                  <p class="text-sm font-semibold text-body">
                    {{ question.name }}
                    <span v-if="question.isRequired" class="ml-2 text-xs font-semibold text-danger">必須</span>
                  </p>
                  <p v-if="question.description" class="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted">
                    {{ question.description }}
                  </p>
                </div>

                <div
                  v-if="question.type === 'upload'"
                  class="rounded border border-border bg-form-control px-4 py-3 text-sm text-muted"
                >
                  添付ファイルは企画作成後の編集画面でアップロードできます。
                </div>

                <template v-else>
                  <div @focusout.capture="markAnswerTouched(question.id)">
                    <AnswerQuestionFields
                      :answer="null"
                      :draft="draft"
                      :question="question"
                      :disabled="createMutation.isPending.value"
                      :upload-button-label="'ファイルを追加'"
                      :download-href="() => ''"
                    />
                  </div>
                  <FormError v-if="getAnswerFieldError(question.id)" :message="getAnswerFieldError(question.id)" />
                </template>
              </div>
            </div>
          </template>
        </div>
      </SettingsRow>

      <template #footer>
        <div class="space-y-4">
          <AlertMessage v-if="errorMessage" tone="danger">
            {{ errorMessage }}
          </AlertMessage>
          <ActionsFooter align="end">
            <BaseButton
              variant="primary"
              size="wide"
              weight="bold"
              :disabled="createMutation.isPending.value || form.participationTypeId === ''"
              type="button"
              @click="handleSubmit"
            >
              {{ createMutation.isPending.value ? '保存中...' : requiresMemberStep ? '保存して次へ' : '確認画面へ' }}
            </BaseButton>
          </ActionsFooter>
        </div>
      </template>
    </SettingsSection>
  </PageLayout>
</template>
