<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true
  }
})

import BackLink from '@/components/ui/BackLink.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
</script>

<template>
  <section class="space-y-6">
    <BackLink to="/staff"> Staff top へ戻る </BackLink>

    <SurfaceCard tag="header">
      <p class="text-sm text-primary">About PortalDots</p>
      <h2 class="mt-3 text-3xl font-semibold text-body">PortalDots について</h2>
      <p class="mt-3 text-sm leading-7 text-muted">
        PortalDots は、学園祭実行委員会と参加企画担当者のコミュニケーションを支援するための Web
        システムです。お知らせ配信、資料共有、各種申請受付をオンラインでまとめて扱えます。
      </p>
    </SurfaceCard>

    <SurfaceCard>
      <SurfaceHeader>
        <template #title>できること</template>
      </SurfaceHeader>

      <div class="grid gap-4 px-6 py-5 md:grid-cols-3">
        <article class="rounded border border-border bg-surface-light px-5 py-4">
          <h3 class="text-base font-semibold text-body">お知らせ共有</h3>
          <p class="mt-2 text-sm leading-7 text-muted">
            企画担当者向けの案内をまとめて掲載し、必要に応じてメール導線とも連携できます。
          </p>
        </article>
        <article class="rounded border border-border bg-surface-light px-5 py-4">
          <h3 class="text-base font-semibold text-body">資料配布</h3>
          <p class="mt-2 text-sm leading-7 text-muted">
            企画運営に必要な資料やガイドラインを一覧で共有し、更新状況も追いやすくします。
          </p>
        </article>
        <article class="rounded border border-border bg-surface-light px-5 py-4">
          <h3 class="text-base font-semibold text-body">申請管理</h3>
          <p class="mt-2 text-sm leading-7 text-muted">
            参加登録や個別申請をオンラインで受け付け、回答確認や出力作業を staff 画面で進められます。
          </p>
        </article>
      </div>
    </SurfaceCard>

    <SurfaceCard>
      <SurfaceHeader>
        <template #title>外部リンク</template>
      </SurfaceHeader>

      <div class="px-6 py-5">
        <a
          class="inline-flex rounded bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-hover"
          href="https://www.portaldots.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          PortalDots 公式ウェブサイト
        </a>
      </div>
    </SurfaceCard>
  </section>
</template>
