import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import StaffPortalSettingsPage from './portal.vue'
import { mockSessionBootstrapStaff, mockPublicConfig } from '@/mocks/data'

const meta = {
  title: 'Pages/Staff/Settings/PortalDots Settings',
  component: StaffPortalSettingsPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: { path: '/staff/settings/portal' },
    session: {
      bootstrap: mockSessionBootstrapStaff
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/public/config', () => HttpResponse.json(mockPublicConfig)),
        http.get('/v1/staff/portal-settings', () =>
          HttpResponse.json({
            appName: 'PortalDots',
            portalDescription: 'テスト大学 学園祭実行委員会のポータルシステムです。',
            appUrl: 'https://example.com',
            appForceHttps: true,
            portalAdminName: 'テスト大学 学園祭実行委員会',
            portalContactEmail: 'contact@example.com',
            portalUnivemailLocalPart: 'student_id',
            portalUnivemailDomainPart: 'example.ac.jp',
            portalStudentIdName: '学籍番号',
            portalUnivemailName: '大学メール',
            portalPrimaryColorH: 190,
            portalPrimaryColorS: 80,
            portalPrimaryColorL: 45
          })
        ),
        http.put('/v1/staff/portal-settings', () =>
          HttpResponse.json({
            appName: 'PortalDots',
            portalDescription: 'テスト大学 学園祭実行委員会のポータルシステムです。',
            appUrl: 'https://example.com',
            appForceHttps: true,
            portalAdminName: 'テスト大学 学園祭実行委員会',
            portalContactEmail: 'contact@example.com',
            portalUnivemailLocalPart: 'student_id',
            portalUnivemailDomainPart: 'example.ac.jp',
            portalStudentIdName: '学籍番号',
            portalUnivemailName: '大学メール',
            portalPrimaryColorH: 190,
            portalPrimaryColorS: 80,
            portalPrimaryColorL: 45
          })
        )
      ]
    }
  }
} satisfies Meta<typeof StaffPortalSettingsPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
