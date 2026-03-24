<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'portalSettings.manage'
  }
})

import { computed, ref, watch } from 'vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import BackLink from '@/components/ui/BackLink.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { useAuthorizedStaffContext } from '@/features/staff/hooks/useAuthorizedStaffContext'
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

const localPartOptions = [
  { value: 'student_id', label: 'student_id' },
  { value: 'user_id', label: 'user_id' }
]

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
    <BackLink to="/staff/settings"> PortalDots の設定へ戻る </BackLink>

    <div v-if="settingsQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <form v-else class="space-y-6" @submit.prevent="handleSave">
      <SurfaceCard tag="header">
        <p class="text-sm text-primary">Portal Settings</p>
        <h2 class="mt-3 text-3xl font-semibold text-body">Portal 設定</h2>
        <p class="mt-3 text-sm leading-7 text-muted">
          legacy `/admin/portal` で管理していたポータル全体の表示名・連絡先・URL・基本配色をここで更新します。
        </p>
      </SurfaceCard>

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
            <label class="flex items-center gap-3 text-sm text-body">
              <input v-model="form.appForceHttps" name="appForceHttps" type="checkbox" />
              https 接続を強制する
            </label>
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="連絡先と学校情報">
        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-2">
            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">実行委員会名</span>
              <input v-model="form.portalAdminName" name="portalAdminName" type="text" />
            </label>
            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">連絡先メールアドレス</span>
              <input v-model="form.portalContactEmail" name="portalContactEmail" type="email" />
            </label>
            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">学籍番号の呼び方</span>
              <input v-model="form.portalStudentIdName" name="portalStudentIdName" type="text" />
            </label>
            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">学校メールの呼び方</span>
              <input v-model="form.portalUnivemailName" name="portalUnivemailName" type="text" />
            </label>
            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">学校メールのローカルパート種別</span>
              <select v-model="form.portalUnivemailLocalPart" name="portalUnivemailLocalPart">
                <option v-for="option in localPartOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">学校メールのドメイン</span>
              <input v-model="form.portalUnivemailDomainPart" name="portalUnivemailDomainPart" type="text" />
            </label>
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="アクセントカラー">
        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem] md:items-start">
            <div class="grid gap-4 md:grid-cols-3">
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">H</span>
                <input v-model.number="form.portalPrimaryColorH" name="portalPrimaryColorH" type="number" />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">S</span>
                <input v-model.number="form.portalPrimaryColorS" name="portalPrimaryColorS" type="number" />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">L</span>
                <input v-model.number="form.portalPrimaryColorL" name="portalPrimaryColorL" type="number" />
              </label>
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
            <div class="flex justify-end">
              <button
                class="rounded bg-primary px-6 py-3 font-bold text-white transition hover:bg-primary-hover disabled:opacity-60"
                :disabled="updateMutation.isPending.value"
                type="submit"
              >
                {{ updateMutation.isPending.value ? '保存中...' : '変更を保存' }}
              </button>
            </div>
          </div>
        </template>
      </SettingsSection>
    </form>
  </PageLayout>
</template>
