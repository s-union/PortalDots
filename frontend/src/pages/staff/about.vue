<script setup lang="ts">
definePage({
  path: '/staff/about',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    noDrawer: true,
    noBottomTabs: true
  }
})

import NarrowPageLayout from '@/components/layouts/NarrowPageLayout.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import FaIcon from '@/components/ui/FaIcon.vue'
</script>

<template>
  <NarrowPageLayout class="space-y-6 py-8">
    <header>
      <h2 class="text-3xl font-semibold text-body">PortalDotsについて</h2>
    </header>

    <SurfaceCard>
      <div class="space-y-5 px-6 py-6">
        <div class="space-y-3">
          <div class="flex items-start justify-between gap-4 max-sm:flex-col">
            <div>
              <h1 class="text-4xl font-semibold tracking-tight text-body">PortalDots</h1>
              <p class="mt-2 text-sm text-muted">バージョン 5.0.0</p>
            </div>
            <div
              class="inline-flex items-center rounded border border-primary/20 bg-primary-light px-3 py-2 text-sm font-medium text-primary"
            >
              <span aria-hidden="true">i</span>
              <span class="ml-2">バージョン 5.0.2 にアップデートできます。</span>
            </div>
          </div>
          <p class="text-sm leading-7 text-muted">
            PortalDots(ポータルドット)は、学園祭実行委員会と参加企画担当者との間のコミュニケーションを支援するウェブシステムです。お知らせメールの一斉送信や各種申請の受付をオンラインで簡単に行うことができます。
          </p>
          <BaseButton
            href="https://www.portaldots.com"
            variant="primary"
            size="lg"
            weight="bold"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center"
          >
            <FaIcon name="external-link-alt" fixed-width />
            <span>PortalDots 公式ウェブサイト</span>
            <span class="ml-2" aria-hidden="true">↗</span>
          </BaseButton>
        </div>
      </div>
    </SurfaceCard>

    <SurfaceCard>
      <div class="space-y-4 px-6 py-5">
        <h2 class="text-2xl font-semibold text-body">アップデート</h2>
        <p class="text-sm leading-7 text-muted">
          PortalDots を最新バージョンにアップデートできます。PortalDots 管理者ユーザーは、このページで PortalDots
          のアップデート方法を確認できます。
        </p>
        <p class="text-sm leading-7 text-body">アップデートは管理者ユーザーが行います。</p>
        <p class="text-sm leading-7 text-muted">
          詳細については、このシステムを管理している担当者へお問い合わせください。
        </p>
      </div>
    </SurfaceCard>

    <SurfaceCard>
      <div class="space-y-5 px-6 py-5">
        <h2 class="text-2xl font-semibold text-body">バージョン 5.0.2 の詳細</h2>
        <section>
          <h2 class="text-2xl font-semibold text-body">リリースノート</h2>
          <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-body">
            <li>
              <a
                class="text-primary underline"
                href="https://github.com/PortalDots/PortalDots/compare/v5.0.1...v5.0.2"
                rel="noopener noreferrer"
                target="_blank"
              >
                前バージョンからのコミットログ
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h3 class="text-lg font-semibold text-body">改良</h3>
          <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-body">
            <li>PortalDots で利用している各種ライブラリを更新しました。</li>
          </ul>
        </section>

        <section>
          <h3 class="text-lg font-semibold text-body">不具合解消</h3>
          <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-body">
            <li>
              <strong>インストーラー</strong> 「メール配信の設定」において、設定を保存できない問題を修正しました。
            </li>
          </ul>
        </section>
      </div>
    </SurfaceCard>
  </NarrowPageLayout>
</template>
