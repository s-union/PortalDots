<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true
  }
})

import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'

const guideSections = [
  {
    title: '見出し',
    example: '# これは大きい見出し(h1)です\n## これは見出し(h2)です\n### これは見出し(h3)です'
  },
  {
    title: '箇条書き',
    example: '* 箇条書き1\n* 箇条書き2\n  * 箇条書き2-1\n  * 箇条書き2-2\n* 箇条書き3'
  },
  {
    title: '番号付きリスト',
    example: '1. 最初の項目\n1. 次の項目\n  1. 子項目a\n  1. 子項目b\n1. 最後の項目'
  },
  {
    title: '強調',
    example: '**ここ**が太字になります\n~~ここ~~に取り消し線を引きます'
  },
  {
    title: 'リンクと引用',
    example:
      '[ここをクリック](https://www.google.com)するとGoogleにアクセスします\n\n> 一人ひとりの『想い』をつなぎ、学園祭を最高に楽しくする'
  },
  {
    title: '表',
    example: '| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| John | Doe | Male |\n| Mary | Smith | Female |'
  }
] as const
</script>

<template>
  <PageLayout>
    <SurfaceCard tag="header">
      <p class="text-sm text-primary">Markdown Guide</p>
      <h2 class="mt-3 text-3xl font-semibold text-body">Markdown ガイド</h2>
      <p class="mt-3 text-sm leading-7 text-muted">
        staff 画面の本文入力でよく使う記法をまとめた、legacy `/staff/markdown-guide` の migrated 版です。
      </p>
    </SurfaceCard>

    <SurfaceCard>
      <SurfaceHeader>
        <template #title>よく使う記法</template>
        <template #description>
          お知らせ本文や案内文では Markdown をそのまま利用できます。必要最小限の早見表だけをここで確認できます。
        </template>
      </SurfaceHeader>

      <div class="grid gap-4 px-6 py-5">
        <article
          v-for="section in guideSections"
          :key="section.title"
          class="rounded border border-border bg-surface-light px-5 py-4"
        >
          <h3 class="text-base font-semibold text-body">{{ section.title }}</h3>
          <pre
            class="mt-3 overflow-x-auto whitespace-pre-wrap rounded bg-background px-4 py-3 text-sm leading-7 text-body"
          ><code>{{ section.example }}</code></pre>
        </article>
      </div>
    </SurfaceCard>
  </PageLayout>
</template>
