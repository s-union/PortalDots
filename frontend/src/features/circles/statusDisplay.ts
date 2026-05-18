import { formatDateTime } from '@/lib/format/datetime'
import type { CircleDetail, SelectableCircle } from '@/features/circles/api'

export interface CircleStatusItem {
  id: string
  to: string
  title: string
  titleClass: string
  description: string
  deadline: string
  participationTypeName: string
}

export function buildCircleSelectorPath(circleId: string) {
  return `/circles/select?redirect=${encodeURIComponent('/')}&circle=${encodeURIComponent(circleId)}`
}

export function buildSelectedCircleStatusItem(detail: CircleDetail): CircleStatusItem {
  const deadline = detail.formCloseAt ? `${formatDateTime(detail.formCloseAt)} までに提出してください` : ''

  if (detail.submittedAt === null) {
    if (detail.isLeader && detail.canSubmit) {
      return {
        id: detail.id,
        to: '/workspace/circles/confirm',
        title: `📮 ここをクリックして「${detail.name}」の参加登録を提出しましょう！`,
        titleClass: 'text-primary',
        description:
          '学園祭係(副責任者)の招待が完了しました。ここをクリックして登録内容に不備がないかどうかを確認し、参加登録を提出しましょう。',
        deadline,
        participationTypeName: detail.participationTypeName
      }
    }

    if (detail.isLeader) {
      return {
        id: detail.id,
        to: '/workspace/circles/members',
        title: `📩 ここをクリックして「${detail.name}」の学園祭係(副責任者)を招待しましょう！`,
        titleClass: 'text-primary',
        description: '参加登録を提出するには、ここをクリックして学園祭係(副責任者)を招待しましょう。',
        deadline,
        participationTypeName: detail.participationTypeName
      }
    }

    return {
      id: detail.id,
      to: '/workspace/circles/detail',
      title: `📄 ここをクリックすると「${detail.name}」の参加登録の内容を確認できます`,
      titleClass: '',
      description: 'この企画の提出操作は責任者のみが行えます。',
      deadline,
      participationTypeName: detail.participationTypeName
    }
  }

  if (detail.status === 'approved') {
    return {
      id: detail.id,
      to: '/workspace/circles/detail',
      title: `🎉 「${detail.name}」の参加登録は受理されました`,
      titleClass: '',
      description: '',
      deadline: '',
      participationTypeName: detail.participationTypeName
    }
  }

  if (detail.status === 'rejected') {
    return {
      id: detail.id,
      to: '/workspace/circles/detail',
      title: `⚠️ 「${detail.name}」の参加登録は受理されませんでした`,
      titleClass: 'text-danger',
      description: '詳細はこちら',
      deadline: '',
      participationTypeName: detail.participationTypeName
    }
  }

  return {
    id: detail.id,
    to: '/workspace/circles/detail',
    title: `💭 「${detail.name}」の参加登録の内容を確認中です`,
    titleClass: '',
    description: detail.confirmationMessage || '確認が完了するまでしばらくお待ちください。',
    deadline: '',
    participationTypeName: detail.participationTypeName
  }
}

export function buildSelectableCircleStatusItem(circle: SelectableCircle): CircleStatusItem {
  const status = circle.status ?? 'pending'
  const isSubmitted = circle.submittedAt !== null && circle.submittedAt !== undefined

  if (!isSubmitted) {
    return {
      id: circle.id,
      to: buildCircleSelectorPath(circle.id),
      title: `📄 「${circle.name}」の参加登録は未提出です`,
      titleClass: 'text-primary',
      description: 'この企画に切り替えて参加登録の状況を確認できます。',
      deadline: '',
      participationTypeName: circle.participationTypeName
    }
  }

  if (status === 'approved') {
    return {
      id: circle.id,
      to: buildCircleSelectorPath(circle.id),
      title: `🎉 「${circle.name}」の参加登録は受理されました`,
      titleClass: '',
      description: 'この企画に切り替えて詳細を確認できます。',
      deadline: '',
      participationTypeName: circle.participationTypeName
    }
  }

  if (status === 'rejected') {
    return {
      id: circle.id,
      to: buildCircleSelectorPath(circle.id),
      title: `⚠️ 「${circle.name}」の参加登録は受理されませんでした`,
      titleClass: 'text-danger',
      description: 'この企画に切り替えて差し戻し内容を確認できます。',
      deadline: '',
      participationTypeName: circle.participationTypeName
    }
  }

  return {
    id: circle.id,
    to: buildCircleSelectorPath(circle.id),
    title: `💭 「${circle.name}」の参加登録の内容を確認中です`,
    titleClass: '',
    description: 'この企画に切り替えて進行状況を確認できます。',
    deadline: '',
    participationTypeName: circle.participationTypeName
  }
}
