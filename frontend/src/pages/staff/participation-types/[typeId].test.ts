import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

describe('RedirectParticipationTypePage', () => {
  it('redirects legacy /staff/participation-types/:typeId to /staff/circles/participation_types/:typeId', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/staff/participation-types/:typeId',
          redirect: (to) => to.path.replace('/staff/participation-types/', '/staff/circles/participation_types/')
        },
        { path: '/staff/circles/participation_types/:typeId', component: { template: '<div>type circles</div>' } }
      ]
    })

    await router.push('/staff/participation-types/participation-type-food')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/staff/circles/participation_types/participation-type-food')
  })
})
