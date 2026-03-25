export interface DrawerNavLink {
  to: string
  label: string
  iconClass: string
  active: boolean
  hidden?: boolean
  adminOnly?: boolean
}

export interface MobileTabLink {
  to: string
  label: string
  iconClass: string
  active: boolean
  hidden?: boolean
  showNotifier?: boolean
}

export interface AppStatusBadge {
  label: string
  variant: 'primary' | 'danger'
}

export interface AppModeSwitchTarget {
  to: string
  label: string
}
