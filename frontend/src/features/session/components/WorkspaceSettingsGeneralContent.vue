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
  contactEmail,
  currentPassword,
  errorMessage,
  forgotPasswordHref,
  name,
  nameYomi,
  phoneNumber,
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
            <input :value="studentId" name="studentId" readonly type="text" />
          </div>
        </div>
      </SettingsRow>
      <SettingsRow>
        <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <p class="text-sm font-semibold text-body">
            {{ publicConfigQuery.data.value?.portalUnivemailName ?? '学生用メールアドレス' }}
          </p>
          <div class="grid gap-2">
            <input :value="univemail" name="univemail" readonly type="text" />
          </div>
        </div>
      </SettingsRow>
      <SettingsRow>
        <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <p class="text-sm font-semibold text-body">名前</p>
          <div class="grid gap-2">
            <input v-model="name" name="name" type="text" />
          </div>
        </div>
      </SettingsRow>
      <SettingsRow>
        <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <p class="text-sm font-semibold text-body">名前(よみ)</p>
          <div class="grid gap-2">
            <input v-model="nameYomi" name="nameYomi" type="text" />
          </div>
        </div>
      </SettingsRow>
      <SettingsRow>
        <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <p class="text-sm font-semibold text-body">連絡先メールアドレス</p>
          <div class="grid gap-2">
            <input v-model="contactEmail" name="contactEmail" type="email" />
          </div>
        </div>
      </SettingsRow>
      <SettingsRow>
        <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <p class="text-sm font-semibold text-body">連絡先電話番号</p>
          <div class="grid gap-2">
            <input v-model="phoneNumber" name="phoneNumber" type="tel" />
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
            <input v-model="currentPassword" name="currentPassword" type="password" />
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
