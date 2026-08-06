<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import FaIcon from '@/components/ui/FaIcon.vue'
import { toUserId } from '@/lib/api/schema'
import { fetchStaffUser, useStaffUsersQuery, type StaffUser } from '@/features/staff/users/api'

const {
  modelValue,
  disabled = false,
  name = 'staffUserSearch',
  placeholder = 'スタッフを検索して追加',
  emptyMessage = 'スタッフは未選択です。',
  id,
  ariaInvalid,
  ariaDescribedBy
} = defineProps<{
  modelValue: string[]
  disabled?: boolean
  name?: string
  placeholder?: string
  emptyMessage?: string
  id?: string
  ariaInvalid?: boolean
  ariaDescribedBy?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [string[]]
}>()

const searchQuery = ref('')
const selectedUsers = ref<StaffUser[]>([])

const usersQuery = useStaffUsersQuery(
  computed(() => !disabled),
  computed(() => ({
    page: 1,
    pageSize: 20,
    query: searchQuery.value.trim()
  }))
)

const selectedUserIDs = computed(() => new Set(modelValue))

const suggestions = computed(() =>
  (usersQuery.data.value?.items ?? []).filter((user) => !selectedUserIDs.value.has(user.id))
)

watch(
  () => modelValue,
  async (userIDs) => {
    const existing = new Map<string, StaffUser>(selectedUsers.value.map((user) => [user.id, user]))
    const next: StaffUser[] = []
    for (const userID of userIDs) {
      const cached = existing.get(userID)
      next.push(cached ?? (await loadUser(userID)))
    }
    selectedUsers.value = next
  },
  { immediate: true }
)

async function loadUser(userID: string): Promise<StaffUser> {
  try {
    return await fetchStaffUser(userID)
  } catch {
    return {
      id: toUserId(userID),
      lastName: '',
      lastNameReading: '',
      firstName: '',
      firstNameReading: '',
      displayName: userID,
      loginIds: [],
      contactEmail: '',
      univemail: '',
      phoneNumber: '',
      roles: [],
      isVerified: false,
      isEmailVerified: false,
      createdAt: '',
      updatedAt: ''
    }
  }
}

function updateSelectedUsers(nextIDs: string[]) {
  emit('update:modelValue', nextIDs)
}

function addUser(user: StaffUser) {
  if (disabled || selectedUserIDs.value.has(user.id)) {
    return
  }

  selectedUsers.value = [...selectedUsers.value.filter((selected) => selected.id !== user.id), user]
  updateSelectedUsers([...modelValue, user.id])
  searchQuery.value = ''
}

function removeUser(userID: string) {
  if (disabled) {
    return
  }

  updateSelectedUsers(modelValue.filter((id) => id !== userID))
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter') {
    return
  }

  event.preventDefault()

  const exactMatch = suggestions.value.find(
    (user) => user.displayName.toLowerCase() === searchQuery.value.trim().toLowerCase()
  )
  if (exactMatch) {
    addUser(exactMatch)
    return
  }

  if (suggestions.value.length > 0) {
    addUser(suggestions.value[0])
  }
}
</script>

<template>
  <div class="grid gap-3">
    <div v-if="selectedUsers.length > 0" class="flex flex-wrap gap-2">
      <span
        v-for="user in selectedUsers"
        :key="user.id"
        class="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary-light px-3 py-1 text-sm text-primary"
      >
        <span>{{ user.displayName }}</span>
        <button
          class="inline-flex h-5 w-5 items-center justify-center rounded-full text-primary/70 transition hover:bg-primary/15 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="disabled"
          type="button"
          :title="`${user.displayName} を外す`"
          @click="removeUser(user.id)"
        >
          <FaIcon name="times" class-name="text-[10px]" />
        </button>
      </span>
    </div>
    <p v-else class="text-base text-muted">{{ emptyMessage }}</p>

    <label class="grid gap-2 text-base text-body">
      <input
        :id="id"
        v-model="searchQuery"
        :aria-describedby="ariaDescribedBy"
        :aria-invalid="ariaInvalid"
        :disabled="disabled"
        :name="name"
        :placeholder="placeholder"
        autocomplete="off"
        class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
        type="text"
        @keydown="handleKeydown"
      />
    </label>

    <div v-if="suggestions.length > 0" class="rounded border border-border bg-surface-light p-3">
      <p class="text-xs font-medium text-muted-2">候補</p>
      <div class="mt-2 grid gap-2">
        <button
          v-for="user in suggestions"
          :key="user.id"
          class="flex items-center justify-between gap-3 rounded border border-border bg-surface px-3 py-2 text-left text-base text-body transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="disabled"
          type="button"
          @click="addUser(user)"
        >
          <span>{{ user.displayName }}</span>
          <span class="truncate text-xs text-muted-2">
            {{ user.contactEmail || user.loginIds.join(', ') }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
