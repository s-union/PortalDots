import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffFormAnswersIndexPage from './index.vue'
import { mockSessionBootstrapStaff } from '@/mocks/data'
import { staffFormStoryAnswersIndex } from '../../story-fixtures'

const meta = {
  title: 'Pages/Staff/Forms/Answers',
  component: StaffFormAnswersIndexPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: {
      path: '/staff/forms/form-circle-b-1/answers'
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/forms/:formID/answers', () => HttpResponse.json(staffFormStoryAnswersIndex)),
        http.delete('/v1/staff/forms/:formID/answers/:answerID', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof StaffFormAnswersIndexPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/forms/:formID/answers', () =>
          HttpResponse.json({
            ...staffFormStoryAnswersIndex,
            answers: [],
            notAnsweredCircles: staffFormStoryAnswersIndex.circles
          })
        )
      ]
    }
  }
}
