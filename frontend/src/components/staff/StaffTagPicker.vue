<script setup lang="ts">
import { computed, ref } from 'vue'
import FaIcon from '@/components/ui/FaIcon.vue'

const {
  modelValue,
  availableTags,
  disabled = false,
  name = 'tagSearch',
  placeholder = 'タグ名を入力して追加',
  emptyMessage = 'タグは未選択です。',
  allowCustom = true
} = defineProps<{
  modelValue: string[]
  availableTags: string[]
  disabled?: boolean
  name?: string
  placeholder?: string
  emptyMessage?: string
  allowCustom?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [string[]]
}>()

const searchQuery = ref('')

const normalizedAvailableTags = computed(() =>
  [...new Set(availableTags.map((tag) => tag.trim()).filter((tag) => tag.length > 0))].sort((left, right) =>
    left.localeCompare(right, 'ja')
  )
)

const normalizedSelectedTags = computed(() => new Set(modelValue.map((tag) => tag.trim().toLowerCase())))

const suggestedTags = computed(() => {
  const normalizedQuery = searchQuery.value.trim().toLowerCase()
  const candidates = normalizedAvailableTags.value.filter((tag) => !normalizedSelectedTags.value.has(tag.toLowerCase()))

  if (normalizedQuery.length === 0) {
    return candidates.slice(0, 8)
  }

  return candidates
    .filter((tag) => tag.toLowerCase().includes(normalizedQuery))
    .sort((left, right) => {
      const leftStarts = left.toLowerCase().startsWith(normalizedQuery)
      const rightStarts = right.toLowerCase().startsWith(normalizedQuery)
      if (leftStarts !== rightStarts) {
        return leftStarts ? -1 : 1
      }
      return left.localeCompare(right, 'ja')
    })
    .slice(0, 8)
})

const customCandidate = computed(() => {
  if (!allowCustom) {
    return null
  }

  const candidate = searchQuery.value.trim()
  if (candidate.length === 0) {
    return null
  }

  const normalizedCandidate = candidate.toLowerCase()
  if (normalizedSelectedTags.value.has(normalizedCandidate)) {
    return null
  }

  const exactTag = normalizedAvailableTags.value.find((tag) => tag.toLowerCase() === normalizedCandidate)
  if (exactTag) {
    return null
  }

  return candidate
})

function updateTags(nextTags: string[]) {
  emit('update:modelValue', [...new Set(nextTags.map((tag) => tag.trim()).filter((tag) => tag.length > 0))])
}

function addTag(tag: string) {
  if (disabled) {
    return
  }

  updateTags([...modelValue, tag])
  searchQuery.value = ''
}

function removeTag(tag: string) {
  if (disabled) {
    return
  }

  updateTags(modelValue.filter((currentTag) => currentTag !== tag))
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter') {
    return
  }

  event.preventDefault()

  const exactMatch = normalizedAvailableTags.value.find(
    (tag) => tag.toLowerCase() === searchQuery.value.trim().toLowerCase()
  )
  if (exactMatch) {
    addTag(exactMatch)
    return
  }

  if (customCandidate.value) {
    addTag(customCandidate.value)
  }
}
</script>

<template>
  <div class="grid gap-3">
    <div v-if="modelValue.length > 0" class="flex flex-wrap gap-2">
      <span
        v-for="tag in modelValue"
        :key="tag"
        class="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary-light px-3 py-1 text-sm text-primary"
      >
        <span>{{ tag }}</span>
        <button
          class="inline-flex h-5 w-5 items-center justify-center rounded-full text-primary/70 transition hover:bg-primary/15 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="disabled"
          type="button"
          :title="`${tag} を外す`"
          @click="removeTag(tag)"
        >
          <FaIcon name="times" class-name="text-[10px]" />
        </button>
      </span>
    </div>
    <p v-else class="text-sm text-muted">{{ emptyMessage }}</p>

    <label class="grid gap-2 text-sm text-body">
      <input
        v-model="searchQuery"
        :disabled="disabled"
        :name="name"
        :placeholder="placeholder"
        autocomplete="off"
        class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
        type="text"
        @keydown="handleKeydown"
      />
    </label>

    <div v-if="suggestedTags.length > 0 || customCandidate" class="rounded border border-border bg-surface-light p-3">
      <p class="text-xs font-medium text-muted-2">候補</p>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="tag in suggestedTags"
          :key="tag"
          class="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-body transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="disabled"
          type="button"
          @click="addTag(tag)"
        >
          {{ tag }}
        </button>
        <button
          v-if="customCandidate"
          class="inline-flex items-center rounded-full border border-dashed border-primary/40 bg-primary-light px-3 py-1.5 text-sm text-primary transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="disabled"
          type="button"
          @click="addTag(customCandidate)"
        >
          「{{ customCandidate }}」を追加
        </button>
      </div>
    </div>
  </div>
</template>
