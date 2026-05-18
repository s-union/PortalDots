<script setup lang="ts">
import { cn } from '@/lib/ui/cn'
import { buttonVariants, surfaceVariants } from '@/lib/ui/variants'

const { primaryLabel, showDanger, showSuccess } = defineProps<{
  primaryLabel?: string
  showDanger?: boolean
  showSuccess?: boolean
}>()
</script>

<template>
  <div class="bg-base p-8 text-body">
    <!-- Buttons -->
    <section class="mb-8">
      <h2 class="mb-4 text-xl font-semibold">ボタン (.btn)</h2>
      <p class="mb-4 text-sm text-muted">
        cva で共通化: rounded / whitespace-nowrap / line-height 1.15 / transition を variants に集約
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <button :class="buttonVariants({ variant: 'primary', size: 'lg', weight: 'bold' })">
          {{ primaryLabel ?? 'プライマリ (.is-primary)' }}
        </button>
        <button :class="buttonVariants({ variant: 'secondary', size: 'lg' })">セカンダリ (.is-secondary)</button>
        <button v-if="showDanger" :class="buttonVariants({ variant: 'danger', size: 'lg', weight: 'bold' })">
          デンジャー (.is-danger)
        </button>
        <button v-if="showSuccess" :class="buttonVariants({ variant: 'success', size: 'lg', weight: 'bold' })">
          サクセス (.is-success)
        </button>
        <button
          :class="cn(buttonVariants({ variant: 'primary', size: 'lg', weight: 'bold' }), 'pointer-events-none')"
          disabled
        >
          無効 (disabled)
        </button>
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button :class="buttonVariants({ variant: 'primaryInverse', size: 'lg' })">
          プライマリ逆 (.is-primary-inverse)
        </button>
        <button :class="buttonVariants({ variant: 'transparent', size: 'lg' })">透過 (.is-transparent)</button>
        <button :class="buttonVariants({ variant: 'primary', size: 'wide', weight: 'bold' })">幅広 (.is-wide)</button>
        <button :class="buttonVariants({ variant: 'primary', size: 'sm', weight: 'bold' })">小 (.is-sm)</button>
      </div>
    </section>

    <!-- Cards -->
    <section class="mb-8">
      <h2 class="mb-4 text-xl font-semibold">カード</h2>
      <div class="grid gap-4 min-[1001px]:grid-cols-2">
        <div :class="cn(surfaceVariants(), 'p-6')">
          <h3 class="text-lg font-semibold">通常カード (shadow-lv1)</h3>
          <p class="mt-2 text-muted">bg-surface + border-border + shadow-lv1。</p>
        </div>
        <div :class="cn(surfaceVariants({ shadow: 'lv2' }), 'p-6')">
          <h3 class="text-lg font-semibold">カード (shadow-lv2)</h3>
          <p class="mt-2 text-muted">影がやや強め。ドロワーやモーダルに使用。</p>
        </div>
        <div class="rounded border border-primary bg-primary-light p-6">
          <h3 class="text-lg font-semibold text-primary">プライマリカード</h3>
          <p class="mt-2 text-muted">border-primary + bg-primary-light。ハイライト表示用。</p>
        </div>
        <div class="rounded border border-danger bg-danger-light p-6">
          <h3 class="text-lg font-semibold text-danger">エラーカード</h3>
          <p class="mt-2 text-muted">border-danger + bg-danger-light。エラー表示用。</p>
        </div>
      </div>
    </section>

    <!-- Form Controls -->
    <section class="mb-8">
      <h2 class="mb-4 text-xl font-semibold">フォームコントロール (.form-control)</h2>
      <p class="mb-4 text-sm text-muted">
        base layer で自動適用: padding 0.5rem 1rem / font-size 1.067rem (16px, iOS zoom防止) / line-height 1.6 /
        caret-color primary / border-radius 0.45rem
      </p>
      <div class="grid gap-4" style="max-width: 400px">
        <label class="block">
          <span class="mb-[0.2rem] block font-semibold" style="font-weight: var(--font-weight-bold)"
            >ラベル (font-weight: 600)</span
          >
          <input placeholder="テキスト入力" type="text" />
        </label>
        <label class="block">
          <span class="mb-[0.2rem] block font-semibold" style="font-weight: var(--font-weight-bold)">セレクト</span>
          <select>
            <option>選択肢1</option>
            <option>選択肢2</option>
            <option>選択肢3</option>
          </select>
        </label>
        <label class="block">
          <span class="mb-[0.2rem] block font-semibold" style="font-weight: var(--font-weight-bold)"
            >テキストエリア</span
          >
          <textarea placeholder="複数行テキスト" rows="3"></textarea>
        </label>
        <label class="block">
          <span class="mb-[0.2rem] block font-semibold" style="font-weight: var(--font-weight-bold)"
            >エラー状態 (.is-invalid)</span
          >
          <input class="!border-danger !caret-danger" type="text" value="不正な値" />
          <p class="mt-[0.2rem] text-sm text-danger">この項目は必須です。</p>
        </label>
        <label class="block">
          <span class="mb-[0.2rem] block font-semibold" style="font-weight: var(--font-weight-bold)"
            >無効状態 (disabled)</span
          >
          <input disabled type="text" value="変更不可" />
        </label>
      </div>
    </section>

    <!-- Alerts -->
    <section class="mb-8">
      <h2 class="mb-4 text-xl font-semibold">アラート / フィードバック</h2>
      <div class="grid gap-3" style="max-width: 600px">
        <div class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
          エラーがあります。以下をご確認ください。
        </div>
        <div class="rounded border border-success bg-success-light px-4 py-3 text-sm text-success">
          保存が完了しました。
        </div>
        <div class="rounded border border-primary bg-primary-light px-4 py-3 text-sm text-primary">
          お知らせ: 新しい機能が追加されました。
        </div>
        <div class="rounded border border-border bg-muted-light px-4 py-3 text-sm text-muted">
          補足情報がここに表示されます。
        </div>
      </div>
    </section>

    <!-- Typography -->
    <section class="mb-8">
      <h2 class="mb-4 text-xl font-semibold">タイポグラフィ</h2>
      <p class="mb-4 text-sm text-muted">base: 15px / line-height 1.7 / font-family: Segoe UI, Meiryo, system-ui...</p>
      <div :class="cn(surfaceVariants(), 'p-6')">
        <p style="font-size: 1.6rem; font-weight: var(--font-weight-bold)">$font-size-xl (1.6rem = 24px) — 見出し大</p>
        <p class="mt-2" style="font-size: 1.333rem; font-weight: var(--font-weight-bold)">
          $font-size-lg (1.333rem = 20px) — 見出し
        </p>
        <p class="mt-2">通常テキスト (15px) — 本文</p>
        <p class="mt-2" style="font-size: 0.933rem">$font-size (0.933rem = 14px) — 補足</p>
        <hr />
        <p class="text-primary">text-primary — プライマリカラー</p>
        <p class="text-danger">text-danger — エラーカラー</p>
        <p class="text-success">text-success — 成功カラー</p>
        <p class="text-muted">text-muted — ミュートカラー</p>
        <p class="text-muted-2">text-muted-2 — ミュート薄め</p>
        <p class="text-muted-3">text-muted-3 — ミュート最薄</p>
      </div>
    </section>

    <!-- Badges -->
    <section class="mb-8">
      <h2 class="mb-4 text-xl font-semibold">バッジ</h2>
      <div class="flex flex-wrap gap-3">
        <span class="rounded-full bg-primary-light px-3 py-1 text-xs text-primary">プライマリ</span>
        <span class="rounded-full bg-danger-light px-3 py-1 text-xs text-danger">デンジャー</span>
        <span class="rounded-full bg-success-light px-3 py-1 text-xs text-success">サクセス</span>
        <span class="rounded-full bg-muted-light px-3 py-1 text-xs text-muted">ミュート</span>
      </div>
    </section>

    <!-- Drawer Nav Mock -->
    <section class="mb-8">
      <h2 class="mb-4 text-xl font-semibold">ドロワーナビゲーション (サンプル)</h2>
      <p class="mb-4 text-sm text-muted">
        width: 320px / bg-surface / border-right / active link: border-right 4px primary
      </p>
      <div :class="cn(surfaceVariants(), 'border-r')" style="width: 320px">
        <div
          class="border-b border-border p-6"
          style="font-weight: var(--font-weight-bold); padding-top: calc(5rem + 1.5rem)"
        >
          PortalDots
        </div>
        <nav class="py-2">
          <a class="relative block py-3 pr-6 pl-6 text-primary" href="#" style="font-weight: var(--font-weight-bold)">
            <span class="absolute top-2 right-0 bottom-2 w-1 rounded-l bg-primary"></span>
            ホーム
          </a>
          <a class="block px-6 py-3 text-body no-underline transition hover:bg-surface-light" href="#"> お知らせ </a>
          <a class="block px-6 py-3 text-body no-underline transition hover:bg-surface-light" href="#"> 配布資料 </a>
          <a class="block px-6 py-3 text-body no-underline transition hover:bg-surface-light" href="#"> 申請 </a>
          <a class="block px-6 py-3 text-body no-underline transition hover:bg-surface-light" href="#">
            お問い合わせ
          </a>
        </nav>
        <div class="border-t border-border p-6">
          <p class="mb-4 text-center" style="font-weight: var(--font-weight-bold)">山田太郎としてログイン中</p>
          <button :class="buttonVariants({ variant: 'secondary', size: 'lg', fullWidth: true })">ログアウト</button>
        </div>
      </div>
    </section>

    <!-- List View -->
    <section>
      <h2 class="mb-4 text-xl font-semibold">リストビュー</h2>
      <div :class="surfaceVariants()">
        <div class="border-b border-border px-6 py-4">
          <div class="flex items-center justify-between">
            <h3 style="font-weight: var(--font-weight-bold)">第1回 実行委員会ミーティング</h3>
            <span class="rounded-full bg-success-light px-3 py-1 text-xs text-success">受理</span>
          </div>
          <p class="mt-1 text-sm text-muted">2026-03-10 に公開</p>
        </div>
        <div class="border-b border-border px-6 py-4">
          <div class="flex items-center justify-between">
            <h3 style="font-weight: var(--font-weight-bold)">企画参加申込書</h3>
            <span class="rounded-full bg-primary-light px-3 py-1 text-xs text-primary">受付中</span>
          </div>
          <p class="mt-1 text-sm text-muted">締切: 2026-04-01</p>
        </div>
        <div class="px-6 py-4">
          <div class="flex items-center justify-between">
            <h3 style="font-weight: var(--font-weight-bold)">会場マップ (PDF)</h3>
            <span class="rounded-full bg-muted-light px-3 py-1 text-xs text-muted">配布中</span>
          </div>
          <p class="mt-1 text-sm text-muted">2026-03-01 に追加</p>
        </div>
      </div>
    </section>
  </div>
</template>
