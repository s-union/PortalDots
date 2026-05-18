<script setup lang="ts">
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import { buttonVariants } from '@/lib/ui/variants'

const {
  title,
  description,
  sectionTitle,
  successMessage,
  errorMessage,
  isSaving,
  isDeleting,
  hasEntity,
  createLabel,
  saveLabel
} = defineProps<{
  title: string
  description: string
  sectionTitle: string
  successMessage: string | null
  errorMessage: string | null
  isSaving: boolean
  isDeleting: boolean
  hasEntity: boolean
  createLabel: string
  saveLabel: string
}>()

const emit = defineEmits<{
  save: []
  delete: []
}>()
</script>

<template>
  <div class="space-y-6 p-6">
    <header class="space-y-3">
      <h2 class="text-2xl font-semibold text-body">{{ title }}</h2>
      <div class="text-sm text-muted">{{ description }}</div>
    </header>

    <form class="space-y-6" @submit.prevent="emit('save')">
      <SettingsSection :title="sectionTitle">
        <SettingsRow>
          <slot />
        </SettingsRow>

        <template #footer>
          <div class="space-y-4">
            <AlertMessage v-if="successMessage" tone="success">{{ successMessage }}</AlertMessage>
            <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>
            <div class="flex justify-between gap-3">
              <button
                v-if="hasEntity"
                :class="buttonVariants({ variant: 'dangerOutline', size: 'lg', weight: 'bold' })"
                :disabled="isDeleting"
                type="button"
                @click="emit('delete')"
              >
                {{ isDeleting ? '削除中...' : '削除' }}
              </button>
              <div class="ml-auto">
                <button
                  :class="buttonVariants({ variant: 'primary', size: 'lg', weight: 'bold' })"
                  :disabled="isSaving"
                  type="submit"
                >
                  {{ isSaving ? '保存中...' : hasEntity ? saveLabel : createLabel }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </SettingsSection>
    </form>
  </div>
</template>
