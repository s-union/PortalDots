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
  'Auth/Email Verification': '/email/verify',
  'Auth/Email Verification Code Input': '/email/verify/:type/:userId',
  'Auth/Email Address Change Verification': '/email/verify/account/:type/:userId',
  'Auth/Email Verification Complete': '/email/verify/completed',
  'Auth/Login': '/login',
  'Auth/Password Reset': '/password/reset',
  'Auth/Password Reset Confirmation': '/password/reset/:userId',
  'Auth/Register': '/register',
  'Circle Registration/Join from Invitation Link': '/circles/join/:token',
  'Circle Registration/Create New': '/circles/new',
  'Circle Registration/Select Participating Circle': '/circles/select',
  'Common/404': '/404',
  'Common/Privacy Policy': '/privacy_policy',
  'Common/Support': '/support',
  'Common/Top Page': '/',
  'Public Mode/Public Announcement Detail': '/public/pages/:pageId',
  'Public Mode/Public Announcements List': '/public/pages',
  'Public Mode/Public Document Detail': '/public/documents/:documentId',
  'Public Mode/Public Documents List': '/public/documents',
  'Staff Mode/About Staff Mode': '/staff/about',
  'Staff Mode/Activity Logs': '/staff/activity-logs',
  'Staff Mode/Circle Management/All Records': '/staff/circles/all',
  'Staff Mode/Circle Management/Create': '/staff/circles/create',
  'Staff Mode/Circle Management/Details': '/staff/circles/:circleId',
  'Staff Mode/Circle Management/Send Email': '/staff/circles/:circleId/email',
  'Staff Mode/Circle Management': '/staff/circles',
  'Staff Mode/Contact Categories': '/staff/contact-categories',
  'Staff Mode/CSV Export': '/staff/exports',
  'Staff Mode/Document Management/Create': '/staff/documents/create',
  'Staff Mode/Document Management/Edit': '/staff/documents/:documentId/edit',
  'Staff Mode/Document Management': '/staff/documents',
  'Staff Mode/Form Management/Create Answer': '/staff/forms/:formId/answers/create',
  'Staff Mode/Form Management/Create New': '/staff/forms/create',
  'Staff Mode/Form Management/Detail': '/staff/forms/:formId',
  'Staff Mode/Form Management/Edit Answer': '/staff/forms/:formId/answers/:answerId/edit',
  'Staff Mode/Form Management/Editor': '/staff/forms/:formId/editor',
  'Staff Mode/Form Management/Preview': '/staff/forms/:formId/preview',
  'Staff Mode/Form Management/Settings': '/staff/forms/:formId/edit',
  'Staff Mode/Form Management': '/staff/forms',
  'Staff Mode/Form Management/Answer List': '/staff/forms/:formId/answers',
  'Staff Mode/Form Management/Upload List': '/staff/forms/:formId/answers/uploads',
  'Staff Mode/Form Management/Unanswered List': '/staff/forms/:formId/not-answered',
  'Staff Mode/Home': '/staff',
  'Staff Mode/Mail List': '/staff/mails',
  'Staff Mode/Markdown Guide': '/staff/markdown-guide',
  'Staff Mode/Notice Management/Create New': '/staff/pages/create',
  'Staff Mode/Notice Management/Edit': '/staff/pages/:pageId',
  'Staff Mode/Notice Management': '/staff/pages',
  'Staff Mode/Participation Type Management': '/staff/circles/participation_types',
  'Staff Mode/Participation Type Management/Circle List': '/staff/circles/participation_types/:typeId',
  'Staff Mode/Participation Type Management/Form Settings': '/staff/circles/participation_types/:typeId/form/edit',
  'Staff Mode/Participation Type Management/Settings': '/staff/circles/participation_types/:typeId/edit',
  'Staff Mode/Permission Settings/Detail': '/staff/permissions/:userId',
  'Staff Mode/Permission Settings': '/staff/permissions',
  'Staff Mode/Place Management': '/staff/places',
  'Staff Mode/Send Mail': '/staff/mail',
  'Staff Mode/Staff Verification': '/staff/verify',
  'Staff Mode/Tag Management': '/staff/tags',
  'Staff Mode/User Management/Detail': '/staff/users/:userId',
  'Staff Mode/User Management': '/staff/users',
  'Staff Mode/General Settings/PortalDots Settings': '/staff/settings/portal',
  'Staff Mode/General Settings': '/staff/settings',
  'Staff Mode/Bulk Send': '/staff/send_emails',
  'Workspace/Circles/Confirm': '/workspace/circles/confirm',
  'Workspace/Circles/Detail': '/workspace/circles/detail',
  'Workspace/Circles/Done': '/workspace/circles/done',
  'Workspace/Circles/Members': '/workspace/circles/members',
  'Workspace/Contact': '/workspace/contact',
  'Workspace/Documents': '/workspace/documents',
  'Workspace/Forms/Detail': '/workspace/forms/:formId',
  'Workspace/Forms': '/workspace/forms',
  'Workspace/Home': '/workspace',
  'Workspace/Pages/Detail': '/workspace/pages/:pageId',
  'Workspace/Pages': '/workspace/pages',
  'Workspace/Settings/Appearance': '/workspace/settings/appearance',
  'Workspace/Settings/Delete Account': '/workspace/settings/delete',
  'Workspace/Settings/Password': '/workspace/settings/password',
  'Workspace/Settings': '/workspace/settings'
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
  return (
    title.startsWith('Pages/') ||
    title.startsWith('Auth/') ||
    title.startsWith('Circle Registration/') ||
    title.startsWith('Common/') ||
    title.startsWith('Public Mode/') ||
    title.startsWith('Staff Mode/') ||
    title.startsWith('Workspace/')
  )
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
