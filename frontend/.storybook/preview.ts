import { type Preview, setup } from '@storybook/vue3-vite'
import { createPinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { createRouter, createMemoryHistory } from 'vue-router'
import { initialize, mswLoader } from 'msw-storybook-addon'
import { defaultHandlers } from '../src/mocks/handlers'
import '../src/styles/app.css'

initialize({}, defaultHandlers)

setup((app) => {
  const pinia = createPinia()
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 }
    }
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }]
  })

  app.use(pinia)
  app.use(router)
  app.use(VueQueryPlugin, { queryClient })
})

const preview: Preview = {
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
