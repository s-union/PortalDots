<script setup lang="ts">
import { computed } from 'vue'
import TabbedSettingsPage from '@/components/layouts/TabbedSettingsPage.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { SchemaFormFields, type FieldOverrides } from '@/features/forms/schema-form'
import { usePublicConfigQuery } from '@/features/public-home/api'
import { useUserSettingsGeneralTab } from '@/features/session/composables/useUserSettingsGeneralTab'
import { useSessionStore } from '@/features/session/store'
import { profileUpdateFormSchema } from '@/lib/form-validation'

const publicConfigQuery = usePublicConfigQuery()
const sessionStore = useSessionStore()
const isInCircle = computed(() => sessionStore.currentCircle !== null)
const { form, saveProfile, errorMessage, successMessage, studentId, univemail, tabs } = useUserSettingsGeneralTab()

// Profile fields are locked while the user belongs to a circle: their info must stay consistent
// with the circle's own registration data.
const overrides = computed<FieldOverrides<typeof profileUpdateFormSchema.entries>>(() => {
  if (!isInCircle.value) return {}
  const lockedByCircle = { disabled: true, helper: '企画に所属しているため修正できません。' }
  return { name: lockedByCircle, nameYomi: lockedByCircle, contactEmail: lockedByCircle, phoneNumber: lockedByCircle }
})

// studentId/univemail's display labels come from the deployment's public config, falling back to
// the schema's own static labels until the query loads.
const displayLabels = computed(() => {
  const labels: Record<string, string> = {}
  if (publicConfigQuery.data.value?.portalStudentIdName) {
    labels.studentId = publicConfigQuery.data.value.portalStudentIdName
  }
  if (publicConfigQuery.data.value?.portalUnivemailName) {
    labels.univemail = publicConfigQuery.data.value.portalUnivemailName
  }
  return labels
})
</script>

<template>
  <TabbedSettingsPage :tabs="tabs">
    <form novalidate :aria-busy="form.isSubmitting" @submit="saveProfile">
      <SettingsSection title="一般設定" :title-outside="true">
        <SchemaFormFields
          required-label=""
          :of="form"
          :schema="profileUpdateFormSchema"
          variant="settings"
          :overrides="overrides"
          :display-values="{ studentId, univemail }"
          :display-labels="displayLabels"
        >
          <template #caption:currentPassword>
            <p class="text-base leading-6 text-muted">
              <a href="/password/reset" class="text-primary underline">パスワードをお忘れの場合はこちら</a>
            </p>
          </template>
        </SchemaFormFields>
        <template #footer>
          <div class="space-y-4">
            <AlertMessage v-if="successMessage" tone="success">{{ successMessage }}</AlertMessage>
            <AlertMessage v-if="errorMessage" tone="danger">{{ errorMessage }}</AlertMessage>
            <div class="flex justify-center pt-2">
              <BaseButton
                variant="primary"
                size="lg"
                class="min-w-40"
                weight="bold"
                :disabled="form.isSubmitting"
                type="submit"
              >
                {{ form.isSubmitting ? '保存中...' : '保存' }}
              </BaseButton>
            </div>
          </div>
        </template>
      </SettingsSection>
    </form>
  </TabbedSettingsPage>
</template>
