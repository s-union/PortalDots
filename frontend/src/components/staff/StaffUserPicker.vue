<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import FaIcon from '@/components/ui/FaIcon.vue'
import { toUserId } from '@/lib/api/schema'
import {
  fetchStaffFormRecipientCandidate,
  useStaffFormRecipientCandidatesQuery,
  type StaffFormRecipientCandidate
} from '@/features/staff/forms/api'

const {
  modelValue,
  disabled = false,
  name = 'staffUserSearch',
  placeholder = 'スタッフを検索して追加',
  emptyMessage = 'スタッフは未選択です。',
  id,
  ariaInvalid,
  ariaDescribedBy,
  initialSearchQuery = ''
} = defineProps<{
  modelValue: string[]
  disabled?: boolean
  name?: string
  placeholder?: string
  emptyMessage?: string
  id?: string
  ariaInvalid?: boolean
  ariaDescribedBy?: string
  initialSearchQuery?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [string[]]
}>()

const searchQuery = ref(initialSearchQuery)
const selectedUsers = ref<StaffFormRecipientCandidate[]>([])

const usersQuery = useStaffFormRecipientCandidatesQuery(
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
  (userIDs, _oldValue, onInvalidate) => {
    let cancelled = false
    onInvalidate(() => {
      cancelled = true
    })

    void (async () => {
      const existing = new Map<string, StaffFormRecipientCandidate>(selectedUsers.value.map((user) => [user.id, user]))
      const results = await Promise.all(userIDs.map((userID) => existing.get(userID) ?? loadUser(userID)))
      if (!cancelled) {
        selectedUsers.value = results
      }
    })()
  },
  { immediate: true }
)

async function loadUser(userID: string): Promise<StaffFormRecipientCandidate> {
  try {
    return await fetchStaffFormRecipientCandidate(userID)
  } catch {
    return {
      id: toUserId(userID),
      displayName: userID,
      loginIds: [],
      contactEmail: ''
    }
  }
}

function updateSelectedUsers(nextIDs: string[]) {
  emit('update:modelValue', nextIDs)
}

function addUser(user: StaffFormRecipientCandidate) {
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
          :aria-label="`${user.displayName} を外す`"
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

    <div class="grid gap-2">
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
    </div>

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
