import type { PartialValues } from '@formisch/vue'
import type * as v from 'valibot'
import type { SyncedFormSchema } from './server-synced-form-fields'

export interface SubmissionRequest {
  readonly context: object
  readonly key: string | null
  readonly event?: SubmitEvent
}
export interface ActiveSubmission<T extends SyncedFormSchema> {
  readonly status: 'validating' | 'saving'
  readonly request: SubmissionRequest
  readonly input: PartialValues<v.InferInput<T>>
  readonly schema: T
}
type State<T extends SyncedFormSchema> =
  | { readonly status: 'idle' | 'failed' | 'disposed' }
  | ActiveSubmission<T>
  | { readonly status: 'queued'; readonly active?: ActiveSubmission<T>; readonly request: SubmissionRequest }
type Action<T extends SyncedFormSchema> =
  | { type: 'start'; active: ActiveSubmission<T> }
  | { type: 'queue'; request: SubmissionRequest }
  | { type: 'saving' | 'idle' | 'failed' | 'dispose' }

export function createSubmissionState<T extends SyncedFormSchema>() {
  let state: State<T> = { status: 'idle' }
  function active() {
    return state.status === 'queued'
      ? state.active
      : state.status === 'validating' || state.status === 'saving'
        ? state
        : undefined
  }
  // Current             Action          Next
  // idle/failed/queued   start           validating (queued without an active request)
  // any live             queue           queued (retains its active phase or waits while paused)
  // validating/queued    saving          saving/queued
  // active/queued        idle            idle (caller drains the latest queued request)
  // active/queued        failed          failed (no automatic retry)
  // any                  dispose         disposed (terminal)
  function transition(action: Action<T>) {
    if (state.status === 'disposed') return
    switch (action.type) {
      case 'start':
        state = action.active
        break
      case 'queue':
        state = { status: 'queued', active: active(), request: action.request }
        break
      case 'saving': {
        const current = active()
        if (!current) return
        const next: ActiveSubmission<T> = { ...current, status: 'saving' }
        state = state.status === 'queued' ? { ...state, active: next } : next
        break
      }
      case 'dispose':
        state = { status: 'disposed' }
        break
      case 'idle':
      case 'failed':
        state = { status: action.type }
        break
      default:
        return action satisfies never
    }
  }
  return {
    get current() {
      return state
    },
    get active() {
      return active()
    },
    transition
  }
}
