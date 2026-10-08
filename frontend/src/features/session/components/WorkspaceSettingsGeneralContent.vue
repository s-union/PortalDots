<script setup lang="ts">
import { computed } from 'vue'
import TabbedSettingsPage from '@/components/layouts/TabbedSettingsPage.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import FormischField from '@/components/forms/FormischField.vue'
import { usePublicConfigQuery } from '@/features/public-home/api'
import { useUserSettingsGeneralTab } from '@/features/session/composables/useUserSettingsGeneralTab'
import { useSessionStore } from '@/features/session/store'

const publicConfigQuery = usePublicConfigQuery()
const sessionStore = useSessionStore()
const isInCircle = computed(() => sessionStore.currentCircle !== null)
const { form, saveProfile, errorMessage, successMessage, studentId, univemail, tabs } = useUserSettingsGeneralTab()
const fields = [
  { name: 'name', label: '名前', type: 'text', autocomplete: 'name', placeholder: '姓 名' },
  { name: 'nameYomi', label: '名前(よみ)', type: 'text', autocomplete: 'off', placeholder: 'せい めい' },
  { name: 'contactEmail', label: '連絡先メールアドレス', type: 'email', autocomplete: 'email', placeholder: '' },
  { name: 'phoneNumber', label: '連絡先電話番号', type: 'tel', autocomplete: 'tel', placeholder: '' }
] as const
</script>

<template>
  <TabbedSettingsPage :tabs="tabs">
    <form novalidate :aria-busy="form.isSubmitting" @submit="saveProfile">
      <SettingsSection title="一般設定" :title-outside="true">
        <SettingsRow>
          <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:items-center md:gap-x-6">
            <label for="settings-student-id" class="font-semibold">{{
              publicConfigQuery.data.value?.portalStudentIdName ?? '学生番号'
            }}</label>
            <input
              id="settings-student-id"
              :value="studentId"
              aria-label="学生番号"
              name="studentId"
              readonly
              type="text"
            />
          </div>
        </SettingsRow>
        <SettingsRow>
          <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:items-center md:gap-x-6">
            <label for="settings-univemail" class="font-semibold">{{
              publicConfigQuery.data.value?.portalUnivemailName ?? '学生用メールアドレス'
            }}</label>
            <input
              id="settings-univemail"
              :value="univemail"
              :aria-label="publicConfigQuery.data.value?.portalUnivemailName ?? '学生用メールアドレス'"
              name="univemail"
              readonly
              type="email"
            />
          </div>
        </SettingsRow>
        <SettingsRow v-for="config in fields" :key="config.name">
          <FormischField
            v-slot="{ field, control }"
            :of="form"
            :path="[config.name]"
            :label="config.label"
            label-class="mb-0 font-semibold"
            class="md:grid-cols-[14rem_minmax(0,1fr)] md:items-center md:gap-x-6 [&>span]:md:col-start-2 [&>p]:md:col-start-2"
            :helper="isInCircle ? '企画に所属しているため修正できません。' : undefined"
            :data-testid="config.name === 'name' ? 'settings-name-row' : undefined"
          >
            <input
              v-bind="control"
              v-model="field.input"
              class="md:col-start-2"
              :aria-label="config.label"
              :disabled="isInCircle"
              :type="config.type"
              :autocomplete="config.autocomplete"
              :placeholder="config.placeholder"
            />
          </FormischField>
        </SettingsRow>
        <SettingsRow>
          <div class="grid gap-2 md:items-center" data-testid="settings-auth-row">
            <FormischField
              v-slot="{ field, control }"
              :of="form"
              :path="['currentPassword']"
              label="認証情報"
              label-class="font-semibold"
              class="md:grid-cols-[14rem_minmax(0,1fr)] md:items-center md:gap-x-6 [&>p]:md:col-start-2"
              required
            >
              <input
                v-bind="control"
                v-model="field.input"
                class="md:col-start-2"
                aria-label="現在のパスワード"
                type="password"
                autocomplete="current-password"
                required
              />
            </FormischField>
            <a href="/password/reset" class="text-primary underline">パスワードをお忘れの場合はこちら</a>
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
