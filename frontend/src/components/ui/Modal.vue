<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, useSlots, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    closeOnBackdrop?: boolean
  }>(),
  {
    closeOnBackdrop: true
  }
)

const open = defineModel<boolean>('open', { default: false })

const slots = useSlots()
const dialogEl = ref<HTMLDialogElement | null>(null)
const titleId = useId()
const bodyId = useId()

const hasHeader = computed(() => props.title !== undefined || slots.header !== undefined)

let previouslyFocused: HTMLElement | null = null

// Scroll lock is shared across every open Modal so stacked dialogs restore
// scrolling only after the last one closes.
let scrollLockCount = 0

function lockScroll() {
  scrollLockCount += 1
  if (scrollLockCount === 1) {
    document.documentElement.style.overflow = 'hidden'
  }
}

function unlockScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1)
  if (scrollLockCount === 0) {
    document.documentElement.style.overflow = ''
  }
}

function captureFocusedElement() {
  previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
}

// Native <dialog> modal dialogs already trap focus; this only moves focus into
// the dialog on open so the fallback works in test environments too.
function focusInsideDialog() {
  const dialog = dialogEl.value
  if (!dialog) {
    return
  }
  const focusable = dialog.querySelector<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )
  if (focusable) {
    focusable.focus()
  } else {
    dialog.focus()
  }
}

function restoreFocus() {
  previouslyFocused?.focus()
  previouslyFocused = null
}

watch(
  open,
  async (isOpen) => {
    if (isOpen) {
      captureFocusedElement()
      await nextTick()
      const dialog = dialogEl.value
      if (dialog && !dialog.open) {
        dialog.showModal()
      }
      lockScroll()
      focusInsideDialog()
    } else {
      const dialog = dialogEl.value
      if (dialog && dialog.open) {
        dialog.close()
      }
      unlockScroll()
      restoreFocus()
    }
  },
  { immediate: true }
)

function handleNativeClose() {
  open.value = false
}

function handleBackdropClick(event: MouseEvent) {
  if (!props.closeOnBackdrop) {
    return
  }
  // Clicking the backdrop targets the <dialog> element itself; clicks on the
  // panel hit a descendant.
  if (event.target !== dialogEl.value) {
    return
  }
  open.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    open.value = false
  }
}

onBeforeUnmount(() => {
  const dialog = dialogEl.value
  if (dialog?.open) {
    dialog.close()
  }
  unlockScroll()
})
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialogEl"
      tabindex="-1"
      class="m-auto w-[min(90vw,32rem)] rounded-lg border-0 bg-surface p-0 text-body shadow-lv4"
      :aria-labelledby="hasHeader ? titleId : undefined"
      :aria-describedby="slots.default ? bodyId : undefined"
      @click="handleBackdropClick"
      @keydown="handleKeydown"
      @close="handleNativeClose"
    >
      <div class="max-h-[min(70vh,70dvh)] overflow-y-auto">
        <header v-if="hasHeader" :id="titleId" class="border-b border-border px-6 py-4">
          <slot name="header">
            <h2 class="text-lg font-semibold text-body">{{ title }}</h2>
          </slot>
        </header>
        <div :id="bodyId" class="px-6 py-4">
          <slot />
        </div>
        <footer v-if="slots.footer" class="flex justify-end gap-2 border-t border-border px-6 py-4">
          <slot name="footer" />
        </footer>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
dialog::backdrop {
  background: var(--color-drawer-backdrop);
}

dialog[open] {
  animation: modal-enter 0.18s ease-out;
}

dialog[open]::backdrop {
  animation: modal-backdrop-enter 0.18s ease-out;
}

@keyframes modal-enter {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
}

@keyframes modal-backdrop-enter {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  dialog[open] {
    animation: none;
  }

  dialog[open]::backdrop {
    animation: none;
  }
}
</style>
