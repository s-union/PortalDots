import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffContactCategoriesPage from './contact-categories.vue'
import { mockSessionBootstrapStaff, mockContactCategory } from '@/mocks/data'

const meta = {
  title: 'Pages/Staff/Contact Categories',
  component: StaffContactCategoriesPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/contact-categories', () => HttpResponse.json([mockContactCategory]))
      ]
    }
  }
} satisfies Meta<typeof StaffContactCategoriesPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/contact-categories', () => HttpResponse.json([]))
      ]
    }
  }
}
