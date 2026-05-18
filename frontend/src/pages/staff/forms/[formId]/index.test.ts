import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

describe('RedirectStaffFormDetailPage', () => {
  it('redirects /staff/forms/:formId to /staff/forms/:formId/edit', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/staff/forms/:formId',
          redirect: (to) => `${to.path}/edit`
        },
        { path: '/staff/forms/:formId/edit', component: { template: '<div>form settings</div>' } }
      ]
    })

    await router.push('/staff/forms/form-circle-b-1')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/staff/forms/form-circle-b-1/edit')
  })
})
