<script setup lang="ts">
defineProps<{
  hasError?: boolean;
  errorText?: string;
}>();
</script>

<template>
  <div class="min-h-screen bg-base text-body">
    <!-- Navbar mock -->
    <header
      class="border-b border-border bg-surface"
      style="height: 5rem; display: flex; align-items: center; padding: 0 1.5rem;"
    >
      <span style="font-weight: var(--font-weight-bold);">PortalDots</span>
    </header>

    <div class="flex">
      <!-- Drawer mock -->
      <aside
        class="hidden border-r border-border bg-surface lg:block"
        style="width: 320px; min-height: calc(100vh - 5rem);"
      >
        <nav class="py-2">
          <a
            class="block px-6 py-3 text-body no-underline transition hover:bg-surface-light"
            href="#"
            >ホーム</a
          >
          <a
            class="block px-6 py-3 text-body no-underline transition hover:bg-surface-light"
            href="#"
            >お知らせ</a
          >
        </nav>
        <div class="mt-auto border-t border-border p-6">
          <a
            class="btn-base block w-full border border-primary bg-primary font-bold text-center text-white no-underline hover:bg-primary-hover"
            href="#"
          >
            ログイン
          </a>
        </div>
      </aside>

      <!-- Content -->
      <main class="flex-1 p-6">
        <section
          class="mx-auto rounded border border-border bg-surface p-8 shadow-lv1"
          style="max-width: 400px;"
        >
          <h2 class="text-xl" style="font-weight: var(--font-weight-bold);">ログイン</h2>
          <p class="mt-3 text-sm text-muted">
            学籍番号または連絡先メールアドレスでログインします。
          </p>

          <form class="mt-6 grid gap-4">
            <div>
              <label class="mb-[0.2rem] block" style="font-weight: var(--font-weight-bold);"
                >学籍番号またはメールアドレス</label
              >
              <input placeholder="例: 2024T001" type="text" />
            </div>

            <div>
              <label class="mb-[0.2rem] block" style="font-weight: var(--font-weight-bold);"
                >パスワード</label
              >
              <input placeholder="パスワードを入力" type="password" />
            </div>

            <p
              v-if="hasError"
              class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger"
            >
              {{ errorText ?? "学籍番号またはパスワードが正しくありません。" }}
            </p>

            <button
              class="btn-base border border-primary bg-primary font-bold text-white hover:bg-primary-hover"
              type="button"
            >
              ログイン
            </button>
          </form>
        </section>
      </main>
    </div>
  </div>
</template>
