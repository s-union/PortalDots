<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const {
  isOpen = false,
  title = '',
  popUpUrl
} = defineProps<{
  isOpen?: boolean
  title?: string
  popUpUrl?: string
}>()

const emit = defineEmits<{
  clickClose: []
}>()

const windowWidth = ref(typeof window === 'undefined' ? 1920 : window.innerWidth)
const isMobile = computed(() => windowWidth.value <= 860)

function handleClose() {
  emit('clickClose')
}

function handleWindowResize() {
  if (typeof window === 'undefined') {
    return
  }
  windowWidth.value = window.innerWidth
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen) {
    handleClose()
  }
}

onMounted(() => {
  if (typeof window === 'undefined') {
    return
  }

  window.addEventListener('resize', handleWindowResize)
  window.addEventListener('keydown', handleKeyDown)
})

watch(
  () => [isOpen, isMobile.value] as const,
  ([open, mobile]) => {
    if (typeof document === 'undefined') {
      return
    }

    if (open && mobile) {
      document.body.style.overflow = 'hidden'
      return
    }

    document.body.style.overflow = ''
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleWindowResize)
    window.removeEventListener('keydown', handleKeyDown)
  }
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen">
      <div
        class="fixed inset-0 z-[9984] hidden bg-drawer-backdrop opacity-100 max-[860px]:block"
        aria-hidden="true"
        @click="handleClose"
      />
      <aside
        class="fixed inset-y-0 right-0 z-[9985] flex w-[min(640px,max(400px,40vw))] flex-col bg-surface shadow-lv4 max-[860px]:left-0 max-[860px]:w-full"
      >
        <header class="flex h-16 shrink-0 items-center border-b border-border pl-6 pr-2">
          <div class="mr-auto text-[1.1rem] font-semibold text-body">
            <slot name="title">{{ title }}</slot>
          </div>
          <a
            v-if="popUpUrl"
            :href="popUpUrl"
            class="inline-flex h-10 w-10 items-center justify-center rounded-[0.45rem] text-muted transition hover:bg-primary-light hover:text-primary"
            rel="noopener noreferrer"
            target="_blank"
            title="新しいタブで開く"
          >
            <i class="fas fa-external-link-alt" aria-hidden="true" />
          </a>
          <button
            class="inline-flex h-10 w-10 items-center justify-center rounded-[0.45rem] text-muted transition hover:bg-primary-light hover:text-primary"
            title="閉じる"
            type="button"
            @click="handleClose"
          >
            <i class="fas fa-times" aria-hidden="true" />
          </button>
        </header>
        <div class="relative flex-1 overflow-auto overflow-x-hidden p-0">
          <slot />
        </div>
      </aside>
    </div>
  </Teleport>
</template>
