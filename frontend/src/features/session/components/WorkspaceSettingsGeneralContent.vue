<script setup lang="ts">
import TabbedSettingsPage from '@/components/layouts/TabbedSettingsPage.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import { cn } from '@/lib/ui/cn'
import { buttonVariants } from '@/lib/ui/variants'
import { usePublicConfigQuery } from '@/features/public-home/api'
import { useUserSettingsGeneralTab } from '@/features/session/composables/useUserSettingsGeneralTab'

const publicConfigQuery = usePublicConfigQuery()
const {
  errorMessage,
  forgotPasswordHref,
  form,
  getFieldError,
  markTouched,
  saveProfile,
  studentId,
  successMessage,
  tabs,
  univemail,
  updateProfileMutation
} = useUserSettingsGeneralTab()
</script>

<template>
  <TabbedSettingsPage :tabs="tabs">
    <SettingsSection title="一般設定" :title-outside="true">
      <SettingsRow>
        <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <p class="text-sm font-semibold text-body">
            {{ publicConfigQuery.data.value?.portalStudentIdName ?? '学生番号' }}
          </p>
          <div class="grid gap-2">
            <input :value="studentId" aria-label="学生番号" name="studentId" readonly type="text" />
          </div>
        </div>
      </SettingsRow>
      <SettingsRow>
        <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <p class="text-sm font-semibold text-body">
            {{ publicConfigQuery.data.value?.portalUnivemailName ?? '学生用メールアドレス' }}
          </p>
          <div class="grid gap-2">
            <input
              :value="univemail"
              :aria-label="publicConfigQuery.data.value?.portalUnivemailName ?? '学生用メールアドレス'"
              name="univemail"
              readonly
              type="text"
            />
          </div>
        </div>
      </SettingsRow>
      <SettingsRow>
        <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <p class="text-sm font-semibold text-body">名前</p>
          <div class="grid gap-2">
            <input
              v-model="form.name"
              aria-label="名前"
              name="name"
              placeholder="姓 名"
              type="text"
              :class="{ 'border-danger': getFieldError('name') }"
              @blur="markTouched('name')"
              @input="markTouched('name')"
            />
            <p v-if="getFieldError('name')" class="text-xs text-danger">{{ getFieldError('name') }}</p>
          </div>
        </div>
      </SettingsRow>
      <SettingsRow>
        <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <p class="text-sm font-semibold text-body">名前(よみ)</p>
          <div class="grid gap-2">
            <input
              v-model="form.nameYomi"
              aria-label="名前(よみ)"
              name="nameYomi"
              placeholder="せい めい"
              type="text"
              :class="{ 'border-danger': getFieldError('nameYomi') }"
              @blur="markTouched('nameYomi')"
              @input="markTouched('nameYomi')"
            />
            <p v-if="getFieldError('nameYomi')" class="text-xs text-danger">{{ getFieldError('nameYomi') }}</p>
          </div>
        </div>
      </SettingsRow>
      <SettingsRow>
        <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <p class="text-sm font-semibold text-body">連絡先メールアドレス</p>
          <div class="grid gap-2">
            <input
              v-model="form.contactEmail"
              aria-label="連絡先メールアドレス"
              name="contactEmail"
              type="email"
              :class="{ 'border-danger': getFieldError('contactEmail') }"
              @blur="markTouched('contactEmail')"
              @input="markTouched('contactEmail')"
            />
            <p v-if="getFieldError('contactEmail')" class="text-xs text-danger">
              {{ getFieldError('contactEmail') }}
            </p>
          </div>
        </div>
      </SettingsRow>
      <SettingsRow>
        <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <p class="text-sm font-semibold text-body">連絡先電話番号</p>
          <div class="grid gap-2">
            <input
              v-model="form.phoneNumber"
              aria-label="連絡先電話番号"
              name="phoneNumber"
              type="tel"
              :class="{ 'border-danger': getFieldError('phoneNumber') }"
              @blur="markTouched('phoneNumber')"
              @input="markTouched('phoneNumber')"
            />
            <p v-if="getFieldError('phoneNumber')" class="text-xs text-danger">
              {{ getFieldError('phoneNumber') }}
            </p>
          </div>
        </div>
      </SettingsRow>
      <SettingsRow>
        <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <div class="space-y-1">
            <p class="text-sm font-semibold text-body">認証情報</p>
            <p class="text-xs leading-6 text-muted">
              <a :href="forgotPasswordHref" class="text-primary underline">パスワードをお忘れの場合はこちら</a>
            </p>
          </div>
          <div class="grid gap-2">
            <input
              v-model="form.currentPassword"
              aria-label="現在のパスワード"
              name="currentPassword"
              type="password"
              :class="{ 'border-danger': getFieldError('currentPassword') }"
              @blur="markTouched('currentPassword')"
              @input="markTouched('currentPassword')"
            />
            <p v-if="getFieldError('currentPassword')" class="text-xs text-danger">
              {{ getFieldError('currentPassword') }}
            </p>
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
              :disabled="updateProfileMutation.isPending.value"
              type="button"
              @click="saveProfile"
            >
              {{ updateProfileMutation.isPending.value ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </template>
    </SettingsSection>
  </TabbedSettingsPage>
</template>
