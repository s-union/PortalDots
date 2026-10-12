<script setup lang="ts">
import TabbedSettingsPage from '@/components/layouts/TabbedSettingsPage.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { SchemaFormFields } from '@/features/forms/schema-form'
import { passwordChangeFormSchema } from '@/lib/form-validation'
import { useUserSettingsPasswordTab } from '@/features/session/composables/useUserSettingsPasswordTab'

const { form, errorMessage, successMessage, savePassword, tabs, updatePasswordMutation } = useUserSettingsPasswordTab()
</script>

<template>
  <TabbedSettingsPage :tabs="tabs">
    <form novalidate :aria-busy="form.isSubmitting" @submit="savePassword">
      <SettingsSection title="パスワード変更" :title-outside="true">
        <SettingsRow>
          <div class="grid gap-4">
            <SchemaFormFields
              :of="form"
              :schema="passwordChangeFormSchema"
              :disabled="updatePasswordMutation.isPending.value"
            >
              <template #after:currentPassword>
                <p class="text-base leading-6 text-muted">
                  <a href="/password/reset" class="text-primary underline">パスワードをお忘れの場合はこちら</a>
                </p>
              </template>
            </SchemaFormFields>
          </div>
        </SettingsRow>
        <template #footer>
          <div class="space-y-4">
            <AlertMessage v-if="successMessage" tone="success">{{ successMessage }}</AlertMessage>
            <AlertMessage v-if="errorMessage" tone="danger">{{ errorMessage }}</AlertMessage>
            <div class="flex justify-center pt-2">
              <BaseButton variant="primary" size="wide" weight="bold" :disabled="form.isSubmitting" type="submit">
                {{ form.isSubmitting ? '保存中...' : '保存' }}
              </BaseButton>
            </div>
          </div>
        </template>
      </SettingsSection>
    </form>
  </TabbedSettingsPage>
</template>
