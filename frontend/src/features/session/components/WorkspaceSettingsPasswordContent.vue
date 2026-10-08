<script setup lang="ts">
import TabbedSettingsPage from '@/components/layouts/TabbedSettingsPage.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import FormischField from '@/components/forms/FormischField.vue'
import { useUserSettingsPasswordTab } from '@/features/session/composables/useUserSettingsPasswordTab'

const { form, errorMessage, successMessage, savePassword, tabs, updatePasswordMutation } = useUserSettingsPasswordTab()
</script>

<template>
  <TabbedSettingsPage :tabs="tabs">
    <form novalidate :aria-busy="form.isSubmitting" @submit="savePassword">
      <SettingsSection title="パスワード変更" :title-outside="true">
        <SettingsRow>
          <div class="grid gap-4">
            <FormischField
              v-slot="{ field, control }"
              :of="form"
              :path="['currentPassword']"
              label="現在のパスワード"
              required
            >
              <input
                v-bind="control"
                v-model="field.input"
                type="password"
                autocomplete="current-password"
                :disabled="updatePasswordMutation.isPending.value"
                required
              />
            </FormischField>
            <p class="text-base leading-6 text-muted">
              <a href="/password/reset" class="text-primary underline">パスワードをお忘れの場合はこちら</a>
            </p>
            <FormischField
              v-slot="{ field, control }"
              :of="form"
              :path="['newPassword']"
              label="新しいパスワード"
              required
            >
              <input
                v-bind="control"
                v-model="field.input"
                type="password"
                autocomplete="new-password"
                placeholder="8文字以上（英字・数字を含む）"
                :disabled="updatePasswordMutation.isPending.value"
                required
              />
            </FormischField>
            <FormischField
              v-slot="{ field, control }"
              :of="form"
              :path="['confirmPassword']"
              label="新しいパスワード(確認)"
              required
            >
              <input
                v-bind="control"
                v-model="field.input"
                type="password"
                autocomplete="new-password"
                :disabled="updatePasswordMutation.isPending.value"
                required
              />
            </FormischField>
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
