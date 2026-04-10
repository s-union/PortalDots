<script setup lang="ts">
definePage({
  path: '/staff/permissions/:userId',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'permissions.read'
  }
})

import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import {
  extractStaffPermissionsValidationMessage,
  groupPermissionDefinitions,
  normalizeSelectedPermissions,
  useStaffPermissionDetailQuery,
  useUpdateStaffPermissionsMutation
} from '@/features/staff/permissions/api'
import { useSessionStore } from '@/features/session/store'

const route = useRoute('/staff/permissions/[userId]')
const sessionStore = useSessionStore()
const userId = computed(() => String(route.params.userId ?? ''))
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const detailQuery = useStaffPermissionDetailQuery(
  userId,
  computed(() => staffStatusQuery.data.value?.authorized === true)
)
const updatePermissionsMutation = useUpdateStaffPermissionsMutation()
const selectedPermissions = ref<string[]>([])
const errorMessage = ref('')
const successMessage = ref('')

watch(
  () => detailQuery.data.value?.assignedPermissionNames,
  (assignedPermissionNames) => {
    selectedPermissions.value = assignedPermissionNames ? [...assignedPermissionNames] : []
  },
  { immediate: true }
)

const groupedDefinitions = computed(() => groupPermissionDefinitions(detailQuery.data.value?.definedPermissions ?? []))

async function handleSavePermissions() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!detailQuery.data.value) {
    return
  }

  try {
    const updated = await updatePermissionsMutation.mutateAsync({
      userId: userId.value,
      permissions: normalizeSelectedPermissions(selectedPermissions.value, detailQuery.data.value.definedPermissions)
    })
    selectedPermissions.value = [...updated.assignedPermissionNames]
    successMessage.value = 'スタッフ権限を更新しました。'
  } catch (error) {
    errorMessage.value = extractStaffPermissionsValidationMessage(error)
  }
}

function togglePermission(permissionName: string, checked: boolean) {
  if (checked) {
    if (!selectedPermissions.value.includes(permissionName)) {
      selectedPermissions.value = [...selectedPermissions.value, permissionName]
    }
    return
  }

  selectedPermissions.value = selectedPermissions.value.filter(
    (currentPermission) => currentPermission !== permissionName
  )
}

function handlePermissionChange(event: Event, permissionName: string) {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }

  togglePermission(permissionName, target.checked)
}
</script>

<template>
  <PageLayout>
    <div v-if="detailQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <article v-else-if="detailQuery.data.value" class="space-y-6">
      <div class="space-y-1 px-1">
        <h1 class="text-2xl font-semibold text-body">スタッフ権限を編集</h1>
        <p class="text-sm text-muted">
          {{ detailQuery.data.value.user.displayName }} / {{ detailQuery.data.value.user.loginIds.join(', ') }}
        </p>
      </div>

      <SettingsSection title="対象ユーザー">
        <SettingsRow>
          <p class="text-sm font-medium text-body">保持ロール</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="role in detailQuery.data.value.user.roles"
              :key="role"
              class="rounded-full bg-surface-light px-3 py-1 text-xs text-muted"
            >
              {{ role }}
            </span>
          </div>
        </SettingsRow>
        <SettingsRow v-if="!detailQuery.data.value.user.isEditable">
          <div class="rounded border border-border bg-surface-light px-4 py-4 text-sm text-muted">
            自分自身、または admin ロールを持つユーザーに対しては permission を変更できません。
          </div>
        </SettingsRow>
      </SettingsSection>

      <form @submit.prevent="handleSavePermissions">
        <SettingsSection title="スタッフ権限">
          <SettingsRow>
            <div class="space-y-6">
              <section v-for="group in groupedDefinitions" :key="group.group" class="space-y-3">
                <h3 class="text-sm font-semibold text-body">{{ group.group }}</h3>
                <label
                  v-for="permission in group.items"
                  :key="permission.name"
                  class="flex gap-3 rounded border border-border px-4 py-4 text-sm text-body"
                >
                  <input
                    :checked="selectedPermissions.includes(permission.name)"
                    :disabled="!detailQuery.data.value.user.isEditable"
                    class="mt-1"
                    type="checkbox"
                    @change="handlePermissionChange($event, permission.name)"
                  />
                  <span class="grid gap-1">
                    <span class="font-medium">{{ permission.shortName }}</span>
                    <span class="text-xs text-muted">{{ permission.displayName }}</span>
                    <span class="text-xs leading-6 text-muted">{{ permission.description }}</span>
                  </span>
                </label>
              </section>
            </div>

            <AlertMessage v-if="successMessage" tone="success" class="mt-4">{{ successMessage }}</AlertMessage>
            <AlertMessage v-if="errorMessage" class="mt-4">{{ errorMessage }}</AlertMessage>
          </SettingsRow>
          <template #footer>
            <button
              class="rounded bg-primary px-8 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="updatePermissionsMutation.isPending.value || !detailQuery.data.value.user.isEditable"
              type="submit"
            >
              {{ updatePermissionsMutation.isPending.value ? '更新中...' : '保存' }}
            </button>
          </template>
        </SettingsSection>
      </form>
    </article>

    <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">
      権限詳細を取得できませんでした。
    </div>
  </PageLayout>
</template>
