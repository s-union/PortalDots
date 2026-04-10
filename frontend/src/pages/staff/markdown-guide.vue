<script setup lang="ts">
definePage({
  path: '/staff/markdown-guide',
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
    <SurfaceCard>
      <SurfaceHeader>
        <template #title>Markdown ガイド</template>
        <template #description> このページでは、Markdown 記法のうち、よく利用されるものを紹介します。 </template>
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
