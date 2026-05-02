import type { RouteLocationRaw } from 'vue-router'

export type TabStripTone = 'primary' | 'muted' | 'danger'

export interface TabStripItem {
  label: string
  active?: boolean
  href?: string
  to?: RouteLocationRaw
  badge?: string
  badgeTone?: TabStripTone
}

export type UserSettingsTab = 'general' | 'appearance' | 'password' | 'delete'

export function buildHomeModeTabs(isStaffPage: boolean): TabStripItem[] {
  return [
    { label: '一般モード', to: '/', active: !isStaffPage },
    { label: 'スタッフモード', to: '/staff', active: isStaffPage }
  ]
}

export function buildUserSettingsTabs(activeTab: UserSettingsTab, isAuthenticated: boolean): TabStripItem[] {
  if (!isAuthenticated) {
    return [
      {
        label: '外観',
        to: '/workspace/settings/appearance',
        active: activeTab === 'appearance'
      }
    ]
  }

  return [
    { label: '一般', to: '/workspace/settings', active: activeTab === 'general' },
    { label: '外観', to: '/workspace/settings/appearance', active: activeTab === 'appearance' },
    {
      label: 'パスワード変更',
      to: '/workspace/settings/password',
      active: activeTab === 'password'
    },
    {
      label: 'アカウント削除',
      to: '/workspace/settings/delete',
      active: activeTab === 'delete'
    }
  ]
}

export type StaffParticipationTypeTab = 'circles' | 'edit' | 'form'
export type StaffCircleTab = 'edit' | 'mail'

export function buildStaffCircleTabs(
  circleId: string,
  activeTab: StaffCircleTab,
  options?: { canEdit?: boolean; canSendEmails?: boolean }
): TabStripItem[] {
  const encodedCircleId = encodeURIComponent(circleId)
  const tabs: TabStripItem[] = []

  if (options?.canEdit !== false) {
    tabs.push({
      label: '企画情報',
      to: `/staff/circles/${encodedCircleId}`,
      active: activeTab === 'edit'
    })
  }

  if (options?.canSendEmails !== false) {
    tabs.push({
      label: 'メール送信',
      to: `/staff/circles/${encodedCircleId}/email`,
      active: activeTab === 'mail'
    })
  }

  return tabs
}

export function buildStaffParticipationTypeTabs(
  typeId: string,
  activeTab: StaffParticipationTypeTab,
  form?: { isPublic: boolean; isOpen: boolean }
): TabStripItem[] {
  const basePath = `/staff/circles/participation_types/${encodeURIComponent(typeId)}`
  const formBadge =
    form === undefined
      ? undefined
      : !form.isPublic
        ? { badge: '非公開', badgeTone: 'muted' as const }
        : !form.isOpen
          ? { badge: '受付期間外', badgeTone: 'muted' as const }
          : { badge: '受付期間内', badgeTone: 'primary' as const }

  return [
    {
      label: '企画一覧',
      to: basePath,
      active: activeTab === 'circles'
    },
    {
      label: '参加種別を編集',
      to: `${basePath}/edit`,
      active: activeTab === 'edit'
    },
    {
      label: '参加登録フォームの設定',
      to: `${basePath}/form/edit`,
      active: activeTab === 'form',
      ...formBadge
    }
  ]
}

export function buildStaffFormTabs(formId: string, activeTab: 'answers' | 'editor' | 'edit'): TabStripItem[] {
  const basePath = `/staff/forms/${encodeURIComponent(formId)}`

  return [
    {
      label: '回答',
      to: `/staff/forms/${encodeURIComponent(formId)}/answers`,
      active: activeTab === 'answers'
    },
    {
      label: 'エディター',
      to: `${basePath}/editor`,
      active: activeTab === 'editor'
    },
    {
      label: '設定',
      to: `${basePath}/edit`,
      active: activeTab === 'edit'
    }
  ]
}
