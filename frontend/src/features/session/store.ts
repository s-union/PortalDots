import { defineStore } from "pinia";

export type SessionBootstrap = {
    csrfToken: string;
    currentCircle: null | {
        id: string;
        name: string;
    };
    featureFlags: string[];
    roles: string[];
    permissions?: string[];
    user: null | {
        id: string;
        displayName: string;
    };
};

const emptySession: SessionBootstrap = {
    csrfToken: "",
    currentCircle: null,
    featureFlags: [],
    roles: [],
    permissions: [],
    user: null,
};

export const useSessionStore = defineStore("session", {
    state: () => ({ ...emptySession }),
    getters: {
        isAuthenticated: (state) => state.user !== null,
    },
    actions: {
        hydrate(payload: SessionBootstrap) {
            this.csrfToken = payload.csrfToken;
            this.currentCircle = payload.currentCircle;
            this.featureFlags = payload.featureFlags;
            this.roles = payload.roles;
            this.permissions = payload.permissions ?? [];
            this.user = payload.user;
        },
        reset() {
            this.hydrate(emptySession);
        },
    },
});
