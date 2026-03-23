<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresCircle: true
  }
})

import ListItemLink from '@/components/ui/ListItemLink.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import { useSessionStore } from '@/features/session/store'
import { cn } from '@/lib/ui/cn'
import { buttonVariants } from '@/lib/ui/variants'

const sessionStore = useSessionStore()

const quickLinks = [
  {
    to: '/workspace/circles/detail',
    label: '企画情報を管理',
    description: '企画名・団体名の編集や参加登録の提出を行います。'
  },
  {
    to: '/workspace/circles/members',
    label: 'メンバーを管理',
    description: '招待リンクの確認やメンバーの管理を行います。'
  },
  {
    to: '/workspace/pages',
    label: 'お知らせを見る',
    description: '公開されているお知らせを確認します。'
  },
  {
    to: '/workspace/documents',
    label: '配布資料を見る',
    description: '配布資料を一覧で確認します。'
  },
  {
    to: '/workspace/forms',
    label: '申請を見る',
    description: '提出可能な申請フォームを確認します。'
  },
  {
    to: '/workspace/contact',
    label: 'お問い合わせ',
    description: '問い合わせ前提情報と窓口案内を確認します。'
  },
  {
    to: '/workspace/settings',
    label: 'ユーザー設定',
    description: 'ログイン中のアカウント情報を確認します。'
  }
]
</script>

<template>
  <section class="space-y-6">
    <SurfaceCard tag="header">
      <p class="text-sm text-primary">現在の企画</p>
      <h2 class="mt-2 text-2xl font-semibold text-body">
        {{ sessionStore.currentCircle?.name ?? '企画未選択' }}
      </h2>
      <div class="mt-4 flex flex-wrap gap-3">
        <RouterLink :class="cn(buttonVariants({ variant: 'primary', size: 'md' }))" to="/circles/select">
          企画を切り替える
        </RouterLink>
        <RouterLink :class="cn(buttonVariants({ variant: 'secondary', size: 'md' }))" to="/circles/new">
          新しい企画を作成
        </RouterLink>
      </div>
    </SurfaceCard>

    <ListPanel title="利用できる機能" overflow-hidden>
      <div class="divide-y divide-border">
        <ListItemLink v-for="link in quickLinks" :key="link.to" :to="link.to">
          <template #title>{{ link.label }}</template>
          {{ link.description }}
        </ListItemLink>
      </div>
    </ListPanel>
  </section>
</template>
