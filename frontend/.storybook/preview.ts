import { type Preview, setup } from '@storybook/vue3-vite'
import { createPinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { createRouter, createMemoryHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { initialize, mswLoader } from 'msw-storybook-addon'
import { shallowRef } from 'vue'
import { defaultHandlers } from '../src/mocks/handlers'
import { useSessionStore, type SessionBootstrap } from '../src/features/session/store'
import '../src/styles/app.css'

initialize({}, defaultHandlers)

const pinia = createPinia()
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 0 }
  }
})
const router = createRouter({
  history: createMemoryHistory(),
  routes
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getStoryRoutePath(parameters: Record<string, unknown>) {
  const route = parameters.route
  if (!isRecord(route) || typeof route.path !== 'string') {
    return '/'
  }

  return route.path
}

function isSessionBootstrap(bootstrap: unknown): bootstrap is SessionBootstrap {
  if (!isRecord(bootstrap)) {
    return false
  }

  if (
    typeof bootstrap.csrfToken !== 'string' ||
    !Array.isArray(bootstrap.featureFlags) ||
    !Array.isArray(bootstrap.roles) ||
    (bootstrap.permissions !== undefined && !Array.isArray(bootstrap.permissions)) ||
    (bootstrap.currentCircle !== null && !isRecord(bootstrap.currentCircle)) ||
    (bootstrap.user !== null && !isRecord(bootstrap.user))
  ) {
    return false
  }

  return true
}

function getStorySession(parameters: Record<string, unknown>) {
  const session = parameters.session
  if (!isRecord(session) || !isSessionBootstrap(session.bootstrap)) {
    return undefined
  }

  return session.bootstrap
}

setup((app) => {
  app.use(pinia)
  app.use(router)
  app.use(VueQueryPlugin, { queryClient })
})

const preview: Preview = {
  decorators: [
    (renderStory, context) => {
      const routePath = getStoryRoutePath(context.parameters)
      const session = getStorySession(context.parameters)
      const StoryComponent = renderStory()

      return {
        components: { StoryComponent },
        setup() {
          const isReady = shallowRef(false)
          const sessionStore = useSessionStore()

          if (session) {
            sessionStore.hydrate(session)
          } else {
            sessionStore.reset()
          }

          void router
            .replace(routePath)
            .then(() => router.isReady())
            .finally(() => {
              isReady.value = true
            })

          return { isReady }
        },
        template: '<StoryComponent v-if="isReady" />'
      }
    }
  ],
  loaders: [mswLoader],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    layout: 'padded'
  }
}

export default preview
