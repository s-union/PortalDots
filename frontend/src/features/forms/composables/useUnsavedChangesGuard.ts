import { onUnmounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

export const UNSAVED_CHANGES_CONFIRM_MESSAGE = '入力内容が保存されていません。このページを離れますか？'

export interface UnsavedChangesGuardControls {
  clear: () => void
  confirmBeforeSwitching: (dirty?: MaybeRefOrGetter<boolean>) => boolean
}

/**
 * Warns the user before leaving a page that still has unsaved input.
 *
 * While `isDirty` is truthy a native `beforeunload` confirmation is armed for
 * tab-close / back-button navigations and an `onBeforeRouteLeave` guard asks
 * for confirmation before in-app navigation away. Both are removed as soon as
 * the state becomes clean or the component unmounts.
 *
 * `clear()` suppresses the guard for the current dirty state, so call it right
 * before a post-submit redirect the guard must not block. The guard re-arms
 * itself as soon as `isDirty` turns dirty again.
 *
 * Same-page context switches that rebuild the form from a different source
 * (e.g. switching the selected answer via a route query) also discard unsaved
 * input. Call `confirmBeforeSwitching()` before performing such a switch; it
 * returns whether the switch may proceed and asks via `window.confirm` when
 * the guard is active. Pass a narrower `dirty` condition when only part of the
 * page's input is at risk (e.g. a draft that a different question set would
 * rebuild).
 *
 * The in-app confirmation currently uses `window.confirm`; follow-up
 * https://github.com/s-union/PortalDots/pull/495 moves it to `useConfirm()`.
 */
export function useUnsavedChangesGuard(
  isDirty: MaybeRefOrGetter<boolean>,
  message: string = UNSAVED_CHANGES_CONFIRM_MESSAGE
): UnsavedChangesGuardControls {
  const isCleared = ref(false)

  function isGuardActive() {
    return !isCleared.value && toValue(isDirty)
  }

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (!isGuardActive()) {
      return
    }
    event.preventDefault()
    event.returnValue = ''
  }

  const stopWatching = watch(
    () => toValue(isDirty),
    (dirty, wasDirty) => {
      // A fresh round of edits (false -> true) re-arms the guard even after a
      // previous clear(), so pages that stay mounted after a save keep
      // protecting the user on later edits.
      if (dirty && !wasDirty) {
        isCleared.value = false
      }
      if (dirty && !isCleared.value) {
        window.addEventListener('beforeunload', handleBeforeUnload)
      } else {
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
    },
    { immediate: true }
  )

  onBeforeRouteLeave(() => {
    if (!isGuardActive()) {
      return true
    }
    return window.confirm(message)
  })

  function clear() {
    isCleared.value = true
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }

  function confirmBeforeSwitching(dirty: MaybeRefOrGetter<boolean> = isDirty): boolean {
    if (isCleared.value || !toValue(dirty)) {
      return true
    }
    return window.confirm(message)
  }

  onUnmounted(() => {
    stopWatching()
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })

  return { clear, confirmBeforeSwitching }
}
