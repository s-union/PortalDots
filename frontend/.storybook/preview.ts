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
  'Pages/Auth/Email Verification': '/email/verify',
  'Pages/Auth/Email Verification Code Input': '/email/verify/:type/:userId',
  'Pages/Auth/Email Address Change Verification': '/email/verify/account/:type/:userId',
  'Pages/Auth/Email Verification Complete': '/email/verify/completed',
  'Pages/Auth/Login': '/login',
  'Pages/Auth/Password Reset': '/password/reset',
  'Pages/Auth/Password Reset Confirmation': '/password/reset/:userId',
  'Pages/Auth/Register': '/register',
  'Pages/Circle Registration/Join from Invitation Link': '/circles/join/:token',
  'Pages/Circle Registration/Create New': '/circles/new',
  'Pages/Circle Registration/Select Participating Circle': '/circles/select',
  'Pages/Common/404': '/404',
  'Pages/Common/Privacy Policy': '/privacy_policy',
  'Pages/Common/Support': '/support',
  'Pages/Common/Top Page': '/',
  'Pages/Public/Announcements/Detail': '/public/pages/:pageId',
  'Pages/Public/Announcements/List': '/public/pages',
  'Pages/Public/Documents/Detail': '/public/documents/:documentId',
  'Pages/Public/Documents/List': '/public/documents',
  'Pages/Staff/About': '/staff/about',
  'Pages/Staff/Activity Logs': '/staff/activity-logs',
  'Pages/Staff/Circles/All Records': '/staff/circles/all',
  'Pages/Staff/Circles/Create New': '/staff/circles/create',
  'Pages/Staff/Circles/Details': '/staff/circles/:circleId',
  'Pages/Staff/Circles/Send Email': '/staff/circles/:circleId/email',
  'Pages/Staff/Circles': '/staff/circles',
  'Pages/Staff/Contact Categories': '/staff/contact-categories',
  'Pages/Staff/CSV Export': '/staff/exports',
  'Pages/Staff/Documents/Create New': '/staff/documents/create',
  'Pages/Staff/Documents/Edit': '/staff/documents/:documentId/edit',
  'Pages/Staff/Documents': '/staff/documents',
  'Pages/Staff/Forms/Create Answer': '/staff/forms/:formId/answers/create',
  'Pages/Staff/Forms/Create New': '/staff/forms/create',
  'Pages/Staff/Forms/Detail': '/staff/forms/:formId',
  'Pages/Staff/Forms/Edit Answer': '/staff/forms/:formId/answers/:answerId/edit',
  'Pages/Staff/Forms/Editor': '/staff/forms/:formId/editor',
  'Pages/Staff/Forms/Preview': '/staff/forms/:formId/preview',
  'Pages/Staff/Forms/Settings': '/staff/forms/:formId/edit',
  'Pages/Staff/Forms': '/staff/forms',
  'Pages/Staff/Forms/Answer List': '/staff/forms/:formId/answers',
  'Pages/Staff/Forms/Upload List': '/staff/forms/:formId/answers/uploads',
  'Pages/Staff/Forms/Not Answered List': '/staff/forms/:formId/not-answered',
  'Pages/Staff/Home': '/staff',
  'Pages/Staff/Mails': '/staff/mails',
  'Pages/Staff/Markdown Guide': '/staff/markdown-guide',
  'Pages/Staff/Notices/Create New': '/staff/pages/create',
  'Pages/Staff/Notices/Edit': '/staff/pages/:pageId',
  'Pages/Staff/Notices': '/staff/pages',
  'Pages/Staff/Participation Types': '/staff/circles/participation_types',
  'Pages/Staff/Participation Types/Circle List': '/staff/circles/participation_types/:typeId',
  'Pages/Staff/Participation Types/Form Settings': '/staff/circles/participation_types/:typeId/form/edit',
  'Pages/Staff/Participation Types/Redirect (Detail)': '/staff/participation-types/:typeId',
  'Pages/Staff/Participation Types/Redirect (List)': '/staff/participation-types',
  'Pages/Staff/Participation Types/Settings': '/staff/circles/participation_types/:typeId/edit',
  'Pages/Staff/Permissions/Detail': '/staff/permissions/:userId',
  'Pages/Staff/Permissions': '/staff/permissions',
  'Pages/Staff/Places': '/staff/places',
  'Pages/Staff/Send Mail': '/staff/mail',
  'Pages/Staff/Verification': '/staff/verify',
  'Pages/Staff/Tags': '/staff/tags',
  'Pages/Staff/Users/Detail': '/staff/users/:userId',
  'Pages/Staff/Users': '/staff/users',
  'Pages/Staff/Settings/PortalDots Settings': '/staff/settings/portal',
  'Pages/Staff/Settings': '/staff/settings',
  'Pages/Staff/Mass Email': '/staff/send_emails',
  'Pages/Workspace/Circles/Confirm': '/workspace/circles/confirm',
  'Pages/Workspace/Circles/Detail': '/workspace/circles/detail',
  'Pages/Workspace/Circles/Done': '/workspace/circles/done',
  'Pages/Workspace/Circles/Members': '/workspace/circles/members',
  'Pages/Workspace/Contact': '/workspace/contact',
  'Pages/Workspace/Documents': '/workspace/documents',
  'Pages/Workspace/Forms/Detail': '/workspace/forms/:formId',
  'Pages/Workspace/Forms': '/workspace/forms',
  'Pages/Workspace/Home': '/workspace',
  'Pages/Workspace/Pages/Detail': '/workspace/pages/:pageId',
  'Pages/Workspace/Pages': '/workspace/pages',
  'Pages/Workspace/Settings/Appearance': '/workspace/settings/appearance',
  'Pages/Workspace/Settings/Delete Account': '/workspace/settings/delete',
  'Pages/Workspace/Settings/Change Password': '/workspace/settings/password',
  'Pages/Workspace/Settings': '/workspace/settings'
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
    a11y: {
      test: 'error'
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
