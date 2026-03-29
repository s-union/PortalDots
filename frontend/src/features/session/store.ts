import { defineStore } from 'pinia'

export interface SessionBootstrap {
  csrfToken: string
  currentCircle: null | {
    id: string
    name: string
  }
  featureFlags: string[]
  roles: string[]
  permissions?: string[]
  user: null | SessionUser
}

export interface SessionUser {
  id: string
  displayName: string
  canDeleteAccount: boolean
  canCreateCircleRegistration: boolean
}

type SessionBootstrapPayload = Omit<SessionBootstrap, 'user'> & {
  user:
    | null
    | (Omit<SessionUser, 'canDeleteAccount' | 'canCreateCircleRegistration'> & {
        canDeleteAccount?: boolean
        canCreateCircleRegistration?: boolean
      })
}

const emptySession: SessionBootstrap = {
  csrfToken: '',
  currentCircle: null,
  featureFlags: [],
  roles: [],
  permissions: [],
  user: null
}

export const useSessionStore = defineStore('session', {
  state: () => ({ ...emptySession }),
  getters: {
    isAuthenticated: (state) => state.user !== null
  },
  actions: {
    hydrate(payload: SessionBootstrapPayload) {
      this.csrfToken = payload.csrfToken
      this.currentCircle = payload.currentCircle
      this.featureFlags = payload.featureFlags
      this.roles = payload.roles
      this.permissions = payload.permissions ?? []
      this.user = payload.user
        ? {
            ...payload.user,
            canDeleteAccount: payload.user.canDeleteAccount ?? false,
            canCreateCircleRegistration: payload.user.canCreateCircleRegistration ?? true
          }
        : null
    },
    reset() {
      this.hydrate(emptySession)
    }
  }
})
