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
  studentId: string
  univemail: string
  lastName: string
  lastNameReading: string
  firstName: string
  firstNameReading: string
  contactEmail: string
  phoneNumber: string
}

type SessionBootstrapPayload = Omit<SessionBootstrap, 'user'> & {
  user:
    | null
    | (Omit<
        SessionUser,
        | 'canDeleteAccount'
        | 'canCreateCircleRegistration'
        | 'studentId'
        | 'univemail'
        | 'lastName'
        | 'lastNameReading'
        | 'firstName'
        | 'firstNameReading'
        | 'contactEmail'
        | 'phoneNumber'
      > & {
        canDeleteAccount?: boolean
        canCreateCircleRegistration?: boolean
        studentId?: string
        univemail?: string
        lastName?: string
        lastNameReading?: string
        firstName?: string
        firstNameReading?: string
        contactEmail?: string
        phoneNumber?: string
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
            canCreateCircleRegistration: payload.user.canCreateCircleRegistration ?? true,
            studentId: payload.user.studentId ?? '',
            univemail: payload.user.univemail ?? '',
            lastName: payload.user.lastName ?? '',
            lastNameReading: payload.user.lastNameReading ?? '',
            firstName: payload.user.firstName ?? '',
            firstNameReading: payload.user.firstNameReading ?? '',
            contactEmail: payload.user.contactEmail ?? '',
            phoneNumber: payload.user.phoneNumber ?? ''
          }
        : null
    },
    reset() {
      this.hydrate(emptySession)
    }
  }
})
