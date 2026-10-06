<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true
  }
})

import { computed, ref, watch } from 'vue'
import { Field, isDirty, reset, setInput, type FormStore } from '@formisch/vue'
import { useRoute, useRouter } from 'vue-router'
import CircleRegistrationForm from '@/features/circles/components/CircleRegistrationForm.vue'
import CircleBasicInfoFields from '@/features/circles/components/CircleBasicInfoFields.vue'
import SchemaAnswerFields from '@/components/forms/SchemaAnswerFields.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import CircleRegistrationSteps from '@/features/circles/components/CircleRegistrationSteps.vue'
import { useCreateCircleMutation, useParticipationTypeRegistrationFormQuery } from '@/features/circles/queries'
import { useParticipationTypesQuery } from '@/features/participation-types/api'
import type { CircleDetail } from '@/features/circles/api'
import type {
  CircleRegistrationFormOutput,
  CircleRegistrationFormSchema
} from '@/features/circles/circle-registration-form'
import { answerFormInputToDraft, type AnswerFormSchema } from '@/features/forms/answer-form-schema'
import { useUnsavedChangesGuard } from '@/features/forms/composables/useUnsavedChangesGuard'
import { useSessionStore } from '@/features/session/store'
import { extractValidationMessage } from '@/lib/api/validation'
import BaseButton from '@/components/ui/BaseButton.vue'
import ActionsFooter from '@/components/ui/ActionsFooter.vue'
import FormField from '@/components/ui/FormField.vue'
import { routeString } from '@/lib/routeQuery'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const createMutation = useCreateCircleMutation()
const canCreateCircleRegistration = computed(() => sessionStore.user?.canCreateCircleRegistration !== false)
const participationTypesQuery = useParticipationTypesQuery(canCreateCircleRegistration)

// Query context and URL defaults; editable values and baselines belong to Formisch.
const participationTypeId = ref('')
const defaultParticipationTypeId = ref('')
const formDirty = ref(false)

const errorMessage = ref('')
const requestedParticipationTypeId = computed(() => {
  const legacyValue = routeString(route.query.participation_type)
  if (legacyValue !== '') {
    return legacyValue
  }

  return routeString(route.query.participationTypeId)
})
const selectedParticipationType = computed(
  () => participationTypesQuery.data.value?.find((item) => item.id === participationTypeId.value) ?? null
)
const registrationFormQuery = useParticipationTypeRegistrationFormQuery(participationTypeId)
const leaderDisplayName = computed(() => sessionStore.user?.displayName ?? '')
const registrationFormDescription = computed(() => registrationFormQuery.data.value?.formDescription.trim() ?? '')
const { clear: clearUnsavedChangesGuard, confirmBeforeSwitching } = useUnsavedChangesGuard(formDirty)

// Changing the participation type swaps the question set and rebuilds the
// draft, discarding any answers typed under the current set. Only that draft
// is at risk (basic info is kept), so the switch confirms on the draft alone.
function handleParticipationTypeChange(event: Event, form: FormStore<CircleRegistrationFormSchema>) {
  if (!(event.target instanceof HTMLSelectElement)) return
  const nextId = event.target.value
  if (form.isSubmitting) {
    event.target.value = participationTypeId.value
    return
  }
  if (nextId === participationTypeId.value) {
    return
  }
  if (!confirmBeforeSwitching(() => isDirty(form, { path: ['text'] }) || isDirty(form, { path: ['choices'] }))) {
    event.target.value = participationTypeId.value
    return
  }
  // Clear the old answers before the schema remount, including reused question IDs.
  reset(form, { path: ['text'] })
  reset(form, { path: ['choices'] })
  setInput(form, { path: ['basic', 'participationTypeId'], input: nextId })
  participationTypeId.value = nextId
}

const canChangeGroupName = computed(() => registrationFormQuery.data.value?.canChangeGroupName ?? true)
const basicInfoDetail = computed(() => ({
  leaderDisplayName: leaderDisplayName.value,
  canChangeGroupName: canChangeGroupName.value,
  groupName: registrationFormQuery.data.value?.groupName ?? '',
  groupNameYomi: registrationFormQuery.data.value?.groupNameYomi ?? ''
}))
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
    if (participationTypeId.value !== '' || !requestedId) {
      return
    }

    if (!(participationTypes ?? []).some((participationType) => participationType.id === requestedId)) {
      return
    }

    participationTypeId.value = requestedId
    defaultParticipationTypeId.value = requestedId
  },
  { immediate: true }
)

async function handleSubmit(
  input: CircleRegistrationFormOutput,
  answers: AnswerFormSchema
): Promise<CircleDetail | null> {
  if (!canCreateCircleRegistration.value) {
    errorMessage.value = 'このアカウントでは新しい企画を登録できません。'
    return null
  }

  errorMessage.value = ''
  const nextStepPath = requiresMemberStep.value ? '/workspace/circles/members' : '/workspace/circles/confirm'

  try {
    const created = await createMutation.mutateAsync({
      ...input.basic,
      notes: input.basic.notes ?? '',
      details: answerFormInputToDraft(answers, input)
    })
    clearUnsavedChangesGuard()
    await router.push(nextStepPath)
    return created
  } catch (error) {
    errorMessage.value = extractValidationMessage(error, '企画の作成に失敗しました。入力内容をご確認ください。')
    return null
  }
}
</script>

<template>
  <PageLayout spacious>
    <CircleRegistrationForm
      v-model:dirty="formDirty"
      :participation-type-id="participationTypeId"
      :default-participation-type-id="defaultParticipationTypeId"
      :registration="registrationFormQuery.data.value ?? null"
      :disabled="
        !canCreateCircleRegistration ||
        (participationTypeId !== '' && (registrationFormQuery.isPending.value || !registrationFormQuery.data.value))
      "
      :save-circle="handleSubmit"
      class="space-y-6"
      v-slot="{ schema, form: circleForm }"
    >
      <SurfaceCard>
        <SurfaceCardBand borderless>
          <CircleRegistrationSteps :current-step="1" :requires-member-step="requiresMemberStep" />
          <h1 class="mt-3 text-2xl font-semibold text-body">企画参加登録</h1>
          <p class="mt-2 text-base text-muted">参加登録する企画の情報を入力してください。</p>
          <p v-if="requestedParticipationTypeId" class="mt-2 text-base text-muted">
            URL パラメータで指定された参加種別を自動選択しています。
          </p>
        </SurfaceCardBand>
      </SurfaceCard>

      <AlertMessage v-if="!canCreateCircleRegistration" tone="danger">
        このアカウントでは新しい企画を登録できません。所属中の企画を選択して作業してください。
      </AlertMessage>

      <SettingsSection v-if="canCreateCircleRegistration && registrationFormDescription" title="必ずお読みください">
        <div class="px-6 py-6 whitespace-pre-wrap text-base leading-7 text-body">
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

            <Field :of="circleForm" :path="['basic', 'participationTypeId']" v-slot="field">
              <FormField
                label="参加種別"
                label-class="font-semibold"
                id="circle-participationTypeId"
                :error="field.errors?.[0]"
                required
              >
                <select
                  v-bind="field.props"
                  :value="field.input"
                  id="circle-participationTypeId"
                  name="participationTypeId"
                  :disabled="circleForm.isSubmitting"
                  :class="{ 'border-danger': field.errors }"
                  :aria-invalid="!!field.errors"
                  :aria-describedby="field.errors ? 'circle-participationTypeId-error' : undefined"
                  @change="handleParticipationTypeChange($event, circleForm)"
                >
                  <option value="">選択してください</option>
                  <option v-for="pt in participationTypesQuery.data.value ?? []" :key="pt.id" :value="pt.id">
                    {{ pt.name }} ({{ pt.usersCountMin }}〜{{ pt.usersCountMax }}人)
                  </option>
                </select>
              </FormField>
            </Field>

            <div
              v-if="selectedParticipationType"
              class="rounded border border-border bg-form-control px-4 py-3 text-base text-body"
            >
              <p class="font-semibold">{{ selectedParticipationType.name }}</p>
              <p class="mt-1 text-muted">{{ selectedParticipationType.description }}</p>
            </div>

            <CircleBasicInfoFields
              :form="circleForm"
              :detail="basicInfoDetail"
              :disabled="false"
              :show-leader="false"
              name-placeholder="例: ○○サークル展示"
              notes-placeholder="任意のメモ"
            >
              <template #group-name-help> 既に登録済みの企画があるため、団体名は既存企画から引き継がれます。 </template>
            </CircleBasicInfoFields>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div v-if="participationTypeId === ''" class="text-base text-muted">先に参加種別を選択してください。</div>

          <div v-else-if="registrationFormQuery.isPending.value" class="text-base text-muted">
            フォームを読み込み中...
          </div>

          <SchemaAnswerFields
            v-else-if="registrationFormQuery.data.value"
            :schema="schema"
            :form="circleForm"
            :answer="null"
            :disabled="circleForm.isSubmitting"
            :selected-files="{}"
            :upload-pending="false"
            :upload-error-messages="{}"
            :download-href="() => ''"
          >
            <template #upload>
              <div class="rounded border border-border bg-form-control px-4 py-3 text-base text-muted">
                添付ファイルは企画作成後の編集画面でアップロードできます。
              </div>
            </template>
          </SchemaAnswerFields>
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
                :disabled="
                  circleForm.isSubmitting ||
                  participationTypeId === '' ||
                  registrationFormQuery.isPending.value ||
                  !registrationFormQuery.data.value
                "
                type="submit"
              >
                {{ circleForm.isSubmitting ? '保存中...' : requiresMemberStep ? '保存して次へ' : '確認画面へ' }}
              </BaseButton>
            </ActionsFooter>
          </div>
        </template>
      </SettingsSection>
    </CircleRegistrationForm>
  </PageLayout>
</template>
