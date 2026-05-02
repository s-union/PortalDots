<script setup lang="ts">
import TabbedSettingsPage from '@/components/layouts/TabbedSettingsPage.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import { cn } from '@/lib/ui/cn'
import { buttonVariants } from '@/lib/ui/variants'
import { useUserSettingsPasswordTab } from '@/features/session/composables/useUserSettingsPasswordTab'
import FormError from '@/components/ui/FormError.vue'
import FormField from '@/components/ui/FormField.vue'

const {
  errorMessage,
  fieldErrors,
  forgotPasswordHref,
  getFieldError,
  markTouched,
  passwordForm,
  savePassword,
  successMessage,
  tabs,
  updatePasswordMutation
} = useUserSettingsPasswordTab()
</script>

<template>
  <TabbedSettingsPage :tabs="tabs">
    <SettingsSection title="パスワード変更" :title-outside="true">
      <SettingsRow>
        <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <div class="space-y-1">
            <p class="text-sm font-semibold text-body">認証情報</p>
            <p class="text-xs leading-6 text-muted">
              <a :href="forgotPasswordHref" class="text-primary underline">パスワードをお忘れの場合はこちら</a>
            </p>
          </div>
          <div class="grid gap-4">
            <div class="grid gap-2">
              <FormField label="現在のパスワード">
                <input
                  v-model="passwordForm.currentPassword"
                  name="currentPassword"
                  type="password"
                  :class="{ 'border-danger': getFieldError('currentPassword') }"
                  @blur="markTouched('currentPassword')"
                  @input="markTouched('currentPassword')"
                />
              </FormField>
              <FormError v-if="getFieldError('currentPassword')" :message="getFieldError('currentPassword')" />
            </div>
            <div class="grid gap-2">
              <FormField label="新しいパスワード">
                <input
                  v-model="passwordForm.newPassword"
                  name="newPassword"
                  placeholder="8文字以上（英字・数字を含む）"
                  type="password"
                  :class="{ 'border-danger': getFieldError('newPassword') }"
                  @blur="markTouched('newPassword')"
                  @input="markTouched('newPassword')"
                />
              </FormField>
              <FormError v-if="getFieldError('newPassword')" :message="getFieldError('newPassword')" />
            </div>
            <div class="grid gap-2">
              <FormField label="新しいパスワード(確認)">
                <input
                  v-model="passwordForm.confirmPassword"
                  name="confirmPassword"
                  type="password"
                  :class="{ 'border-danger': getFieldError('confirmPassword') }"
                  @blur="markTouched('confirmPassword')"
                  @input="markTouched('confirmPassword')"
                />
              </FormField>
              <FormError v-if="getFieldError('confirmPassword')" :message="getFieldError('confirmPassword')" />
            </div>
          </div>
        </div>
      </SettingsRow>
      <template #footer>
        <div class="space-y-4">
          <AlertMessage v-if="successMessage" tone="success">
            {{ successMessage }}
          </AlertMessage>
          <AlertMessage v-if="errorMessage" tone="danger">
            {{ errorMessage }}
          </AlertMessage>
          <div class="flex justify-center pt-2">
            <button
              :class="cn(buttonVariants({ variant: 'primary', size: 'lg', weight: 'bold' }), 'min-w-40')"
              :disabled="updatePasswordMutation.isPending.value"
              type="button"
              @click="savePassword"
            >
              {{ updatePasswordMutation.isPending.value ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </template>
    </SettingsSection>
  </TabbedSettingsPage>
</template>
