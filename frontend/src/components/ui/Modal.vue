<script lang="ts">
// Scroll lock is shared across every open Modal so stacked dialogs restore
// scrolling only after the last one closes. Declared at module scope because a
// `<script setup>` top-level binding is per-instance.
let scrollLockCount = 0
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, useSlots, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    ariaLabel?: string
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

// A dialog must always carry an accessible name. Prefer the header text, then
// an explicit aria-label, then the body text as a last resort so a nameless
// dialog is impossible.
const ariaLabelledby = computed(() => {
  if (hasHeader.value) {
    return titleId
  }
  return props.ariaLabel ? undefined : bodyId
})

const ariaLabel = computed(() => (hasHeader.value ? undefined : props.ariaLabel))

const ariaDescribedby = computed(() => {
  if (!slots.default || ariaLabelledby.value === bodyId) {
    return undefined
  }
  return bodyId
})

let previouslyFocused: HTMLElement | null = null

// Whether this instance is holding a scroll lock. Guards the shared counter so
// a never-opened instance cannot decrement a lock held by a stacked dialog.
let isScrollLocked = false

function lockScroll() {
  if (isScrollLocked) {
    return
  }
  isScrollLocked = true
  scrollLockCount += 1
  if (scrollLockCount === 1) {
    document.documentElement.style.overflow = 'hidden'
  }
}

function unlockScroll() {
  if (!isScrollLocked) {
    return
  }
  isScrollLocked = false
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
  async (isOpen, _previous, onCleanup) => {
    // Mark the pending open as stale if the watcher re-runs (e.g. the model
    // flips back to false) or the component unmounts while we wait for the DOM
    // flush, so a stale callback cannot showModal() or lock the scroll.
    let stale = false
    onCleanup(() => {
      stale = true
    })

    if (isOpen) {
      captureFocusedElement()
      await nextTick()
      // Re-validate after the flush: the model may have flipped back to false,
      // the dialog may have been disposed, or the DOM may have been detached.
      if (stale || !open.value) {
        return
      }
      const dialog = dialogEl.value
      if (!dialog || !dialog.isConnected) {
        return
      }
      if (!dialog.open) {
        dialog.showModal()
      }
      lockScroll()
      focusInsideDialog()
    } else {
      const dialog = dialogEl.value
      if (dialog?.open) {
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
  restoreFocus()
})
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialogEl"
      tabindex="-1"
      class="m-auto flex max-h-[min(70vh,70dvh)] w-[min(90vw,32rem)] flex-col rounded-lg border-0 bg-surface p-0 text-body shadow-lv4"
      :aria-labelledby="ariaLabelledby"
      :aria-label="ariaLabel"
      :aria-describedby="ariaDescribedby"
      @click="handleBackdropClick"
      @keydown="handleKeydown"
      @close="handleNativeClose"
    >
      <header v-if="hasHeader" :id="titleId" class="shrink-0 border-b border-border px-6 py-4">
        <slot name="header">
          <h2 class="text-lg font-semibold text-body">{{ title }}</h2>
        </slot>
      </header>
      <div :id="bodyId" class="min-h-0 grow overflow-y-auto overscroll-contain px-6 py-4">
        <slot />
      </div>
      <footer v-if="slots.footer" class="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">
        <slot name="footer" />
      </footer>
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
