<script setup lang="ts">
definePage({
  path: '/staff/settings/portal',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'portalSettings.manage'
  }
})

import { computed, ref, watch } from 'vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { useAuthorizedStaffContext } from '@/features/staff/hooks/useAuthorizedStaffContext'
import LoadingState from '@/components/ui/LoadingState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ActionsFooter from '@/components/ui/ActionsFooter.vue'
import FormField from '@/components/ui/FormField.vue'
import CheckboxField from '@/components/ui/CheckboxField.vue'
import {
  extractStaffPortalSettingsValidationMessage,
  useStaffPortalSettingsQuery,
  useUpdateStaffPortalSettingsMutation,
  type StaffPortalSettings
} from '@/features/staff/admin/portalSettings'

const { enabled } = useAuthorizedStaffContext({ capability: 'portalSettings.manage' })
const settingsQuery = useStaffPortalSettingsQuery(enabled)
const updateMutation = useUpdateStaffPortalSettingsMutation()
const errorMessage = ref('')
const successMessage = ref('')
const form = ref<StaffPortalSettings>({
  appName: '',
  portalDescription: '',
  appUrl: '',
  appForceHttps: false,
  portalAdminName: '',
  portalContactEmail: '',
  portalUnivemailLocalPart: 'student_id',
  portalUnivemailDomainPart: '',
  portalStudentIdName: '',
  portalUnivemailName: '',
  portalPrimaryColorH: 190,
  portalPrimaryColorS: 80,
  portalPrimaryColorL: 45
})

const localPartOptions = [{ value: 'student_id', label: 'student_id' }]

const previewStyle = computed(() => ({
  backgroundColor: `hsl(${form.value.portalPrimaryColorH} ${form.value.portalPrimaryColorS}% ${form.value.portalPrimaryColorL}%)`
}))

watch(
  () => settingsQuery.data.value,
  (value) => {
    if (!value) {
      return
    }
    form.value = { ...value }
  },
  { immediate: true }
)

async function handleSave() {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const updated = await updateMutation.mutateAsync({ ...form.value })
    form.value = { ...updated }
    successMessage.value = 'Portal 設定を保存しました。'
  } catch (error) {
    errorMessage.value = extractStaffPortalSettingsValidationMessage(error)
  }
}
</script>

<template>
  <PageLayout>
    <LoadingState v-if="settingsQuery.isPending.value" />

    <form v-else class="space-y-6" @submit.prevent="handleSave">
      <p class="text-sm font-semibold text-body">Portal 設定</p>

      <SettingsSection title="基本情報">
        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <p class="text-sm font-semibold text-body">ポータル名</p>
            <input v-model="form.appName" name="appName" type="text" />
          </div>
        </SettingsRow>
        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <p class="text-sm font-semibold text-body">説明</p>
            <textarea v-model="form.portalDescription" class="min-h-24" name="portalDescription" />
          </div>
        </SettingsRow>
        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <p class="text-sm font-semibold text-body">ポータル URL</p>
            <input v-model="form.appUrl" name="appUrl" type="url" />
          </div>
        </SettingsRow>
        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <p class="text-sm font-semibold text-body">HTTPS 強制</p>
            <CheckboxField v-model="form.appForceHttps" label="https 接続を強制する" />
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="連絡先と学校情報">
        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-2">
            <FormField label="実行委員会名" label-class="font-medium">
              <input v-model="form.portalAdminName" name="portalAdminName" type="text" />
            </FormField>
            <FormField label="連絡先メールアドレス" label-class="font-medium">
              <input v-model="form.portalContactEmail" name="portalContactEmail" type="email" />
            </FormField>
            <FormField label="学籍番号の呼び方" label-class="font-medium">
              <input v-model="form.portalStudentIdName" name="portalStudentIdName" type="text" />
            </FormField>
            <FormField label="学校メールの呼び方" label-class="font-medium">
              <input v-model="form.portalUnivemailName" name="portalUnivemailName" type="text" />
            </FormField>
            <FormField label="学校メールのローカルパート種別" label-class="font-medium">
              <select v-model="form.portalUnivemailLocalPart" name="portalUnivemailLocalPart">
                <option v-for="option in localPartOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </FormField>
            <FormField label="学校メールのドメイン" label-class="font-medium">
              <input v-model="form.portalUnivemailDomainPart" name="portalUnivemailDomainPart" type="text" />
            </FormField>
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="アクセントカラー">
        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem] md:items-start">
            <div class="grid gap-4 md:grid-cols-3">
              <FormField label="H" label-class="font-medium">
                <input v-model.number="form.portalPrimaryColorH" name="portalPrimaryColorH" type="number" />
              </FormField>
              <FormField label="S" label-class="font-medium">
                <input v-model.number="form.portalPrimaryColorS" name="portalPrimaryColorS" type="number" />
              </FormField>
              <FormField label="L" label-class="font-medium">
                <input v-model.number="form.portalPrimaryColorL" name="portalPrimaryColorL" type="number" />
              </FormField>
            </div>
            <div class="rounded border border-border bg-surface-light p-4">
              <p class="text-xs text-muted">プレビュー</p>
              <div class="mt-3 h-16 rounded" :style="previewStyle" />
            </div>
          </div>
        </SettingsRow>
        <template #footer>
          <div class="space-y-4">
            <AlertMessage v-if="successMessage" tone="success">{{ successMessage }}</AlertMessage>
            <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>
            <ActionsFooter align="end">
              <BaseButton
                variant="primary"
                size="wide"
                weight="bold"
                type="submit"
                :disabled="updateMutation.isPending.value"
              >
                {{ updateMutation.isPending.value ? '保存中...' : '変更を保存' }}
              </BaseButton>
            </ActionsFooter>
          </div>
        </template>
      </SettingsSection>
    </form>
  </PageLayout>
</template>
