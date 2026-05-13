<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/settings',
  meta: staffPageMeta()
})

import ListItemLink from '@/components/ui/ListItemLink.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { useSessionStore } from '@/features/session/store'

const sessionStore = useSessionStore()

const settingLinks = [
  {
    to: '/staff/contact-categories',
    label: 'お問い合わせ受付設定',
    description: '問い合わせカテゴリと送信先メールを管理します。'
  },
  {
    to: '/staff/tags',
    label: '企画タグ管理',
    description: '申請条件や企画分類で使うタグを管理します。'
  },
  {
    to: '/staff/places',
    label: '場所情報管理',
    description: '使用場所や会場情報のマスタを管理します。'
  },
  {
    to: '/staff/exports',
    label: 'CSV / ZIP 出力',
    description: 'CSV・ZIP などのデータ出力を管理します。'
  },
  {
    to: '/staff/markdown-guide',
    label: 'Markdown ガイド',
    description: '本文入力でよく使う Markdown 記法を確認します。'
  }
]
</script>

<template>
  <PageLayout>
    <ListPanel
      title="PortalDots の設定"
      :description="sessionStore.currentCircle?.name ?? '企画未選択'"
      overflow-hidden
    >
      <div class="divide-y divide-border">
        <ListItemLink v-for="link in settingLinks" :key="link.to" :to="link.to">
          <template #title>{{ link.label }}</template>
          {{ link.description }}
        </ListItemLink>
      </div>
    </ListPanel>
  </PageLayout>
</template>
