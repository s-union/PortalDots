import { type Preview, setup } from '@storybook/vue3-vite'
import { INITIAL_VIEWPORTS } from 'storybook/viewport'
import { createPinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { createRouter, createMemoryHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { initialize, mswLoader } from 'msw-storybook-addon'
import { onBeforeUnmount, shallowRef } from 'vue'
import App from '../src/app/App.vue'
import { defaultHandlers } from '../src/mocks/handlers'
import { useSessionStore, type SessionBootstrap } from '../src/features/session/store'
import { initializeFontAwesome } from '../src/lib/icons/fontawesome'
import '../src/styles/app.css'

initializeFontAwesome()

function isStorybookInternalRequest(request: Request) {
  const url = new URL(request.url)

  if (url.pathname.startsWith('/src/') || url.pathname.startsWith('/node_modules/')) {
    return true
  }

  return [
    '/@fs/',
    '/@id/',
    '/@vite/',
    '/sb-',
    '/storybook-static/',
    '/vite-inject-mocker-entry.js',
    '/mockServiceWorker.js'
  ].some((prefix) => url.pathname.startsWith(prefix))
}

initialize(
  {
    onUnhandledRequest(request, print) {
      if (isStorybookInternalRequest(request)) {
        return
      }

      print.warning()
    }
  },
  defaultHandlers
)

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

const pageStoryRoutePaths: Record<string, string> = {
  'Pages/Circles/New': '/circles/new',
  'Pages/Circles/Select': '/circles/select',
  'Pages/Email/Verify': '/email/verify',
  'Pages/Email/Verify/Completed': '/email/verify/completed',
  'Pages/Index': '/',
  'Pages/Login': '/login',
  'Pages/NotFound': '/storybook/not-found',
  'Pages/Password/Reset': '/password/reset',
  'Pages/PrivacyPolicy': '/privacy_policy',
  'Pages/Public/Documents/Index': '/public/documents',
  'Pages/Public/Pages/Detail': '/public/pages/page-1',
  'Pages/Public/Pages/Index': '/public/pages',
  'Pages/Register': '/register',
  'Pages/Staff/About': '/staff/about',
  'Pages/Staff/ActivityLogs': '/staff/activity-logs',
  'Pages/Staff/Circles/All': '/staff/circles/all',
  'Pages/Staff/Circles/Create': '/staff/circles/create',
  'Pages/Staff/Circles/Index': '/staff/circles',
  'Pages/Staff/Documents/Index': '/staff/documents',
  'Pages/Staff/Exports': '/staff/exports',
  'Pages/Staff/Forms/Index': '/staff/forms',
  'Pages/Staff/Index': '/staff',
  'Pages/Staff/MarkdownGuide': '/staff/markdown-guide',
  'Pages/Staff/Pages/Index': '/staff/pages',
  'Pages/Staff/Permissions/Index': '/staff/permissions',
  'Pages/Staff/Places': '/staff/places',
  'Pages/Staff/Settings': '/staff/settings',
  'Pages/Staff/Tags': '/staff/tags',
  'Pages/Staff/Users/Index': '/staff/users',
  'Pages/Staff/Verify': '/staff/verify',
  'Pages/Support': '/support',
  'Pages/Workspace/Circles/Confirm': '/workspace/circles/confirm',
  'Pages/Workspace/Circles/Detail': '/workspace/circles/detail',
  'Pages/Workspace/Circles/Members': '/workspace/circles/members',
  'Pages/Workspace/Contact': '/workspace/contact',
  'Pages/Workspace/Documents/Index': '/workspace/documents',
  'Pages/Workspace/Forms/Detail': '/workspace/forms/form-1',
  'Pages/Workspace/Forms/Index': '/workspace/forms',
  'Pages/Workspace/Index': '/workspace',
  'Pages/Workspace/Pages/Index': '/workspace/pages',
  'Pages/Workspace/Settings/Index': '/workspace/settings'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getStoryRoutePath(parameters: Record<string, unknown>, title: string) {
  const route = parameters.route
  if (!isRecord(route) || typeof route.path !== 'string') {
    return pageStoryRoutePaths[title] ?? '/'
  }

  return route.path
}

function shouldRenderAppShell(title: string) {
  return title.startsWith('Pages/')
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
      const renderWithAppShell = shouldRenderAppShell(context.title)
      const routePath = getStoryRoutePath(context.parameters, context.title)
      const session = getStorySession(context.parameters)
      const StoryComponent = renderStory()

      return {
        components: { App, StoryComponent },
        setup() {
          const isReady = shallowRef(false)
          let isMounted = true
          const sessionStore = useSessionStore()

          queryClient.clear()

          if (session) {
            sessionStore.hydrate(session)
          } else {
            sessionStore.reset()
          }

          void router
            .replace(routePath)
            .then(() => router.isReady())
            .finally(() => {
              if (isMounted) {
                isReady.value = true
              }
            })

          onBeforeUnmount(() => {
            isMounted = false
          })

          return { isReady, renderWithAppShell, storyKey: context.id }
        },
        template: `
          <div v-if="isReady" :key="storyKey">
            <App v-if="renderWithAppShell" />
            <StoryComponent v-else />
          </div>
        `
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
    layout: 'padded',
    viewport: {
      options: {
        mobileSmall: {
          name: 'Mobile S',
          styles: {
            width: '360px',
            height: '640px'
          },
          type: 'mobile'
        },
        mobile: {
          name: 'Mobile',
          styles: {
            width: '390px',
            height: '844px'
          },
          type: 'mobile'
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px'
          },
          type: 'tablet'
        },
        laptop: {
          name: 'Laptop',
          styles: {
            width: '1024px',
            height: '768px'
          },
          type: 'desktop'
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1440px',
            height: '900px'
          },
          type: 'desktop'
        },
        ...INITIAL_VIEWPORTS
      }
    }
  }
}

export default preview
