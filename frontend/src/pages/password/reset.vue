<script setup lang="ts">
definePage({
  meta: {
    publicOnly: true,
    noDrawer: true,
    noBottomTabs: true
  }
})

import { computed, reactive, ref } from 'vue'
import NarrowPageLayout from '@/components/layouts/NarrowPageLayout.vue'
import { usePublicConfigQuery } from '@/features/public-home/api'

const form = reactive({
  loginId: ''
})
const noticeMessage = ref('')
const publicConfigQuery = usePublicConfigQuery()
const appName = computed(() => publicConfigQuery.data.value?.appName ?? 'PortalDots')

function handleSubmit() {
  noticeMessage.value = '現在、この画面からのパスワード再設定はまだ利用できません。運営へお問い合わせください。'
}
</script>

<template>
  <NarrowPageLayout class="space-y-6 py-8">
    <section class="rounded border border-border bg-surface shadow-lv1">
      <div class="border-b border-border px-6 py-5">
        <h1 class="text-[1.333rem] font-semibold leading-[1.4] text-body">パスワードの再設定</h1>
      </div>
      <form class="space-y-4 px-6 py-6 text-sm leading-7 text-body" @submit.prevent="handleSubmit">
        <p>{{ appName }}へのログインに使用していた学籍番号または連絡先メールアドレスを入力してください。</p>
        <p>連絡先メールアドレスに対し、パスワード再設定のためのメールを送信します。</p>
        <p v-if="noticeMessage" class="rounded border border-danger bg-danger-light px-4 py-3 text-danger">
          {{ noticeMessage }}
        </p>
        <label class="grid gap-2 font-semibold text-body" for="login-id">
          学籍番号または連絡先メールアドレス
          <input id="login-id" v-model="form.loginId" name="loginId" required type="text" />
        </label>
      </form>
    </section>
    <div class="pt-2 text-center">
      <button
        class="inline-flex rounded border border-primary bg-primary px-8 py-3 text-sm text-white transition hover:bg-primary-hover hover:no-underline"
        type="button"
        @click="handleSubmit"
      >
        再設定のためのメールを送信
      </button>
    </div>
  </NarrowPageLayout>
</template>
