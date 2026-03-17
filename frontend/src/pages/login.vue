<script setup lang="ts">
definePage({
  meta: {
    publicOnly: true,
  },
});

import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import { extractFirstErrorMessage, useLoginMutation } from "@/features/auth/api";

const router = useRouter();
const loginMutation = useLoginMutation();
const isSubmitting = computed(() => loginMutation.isPending.value);

const form = reactive({
  loginId: "",
  password: "",
  remember: false,
});

const errorMessage = ref("");

function fillExampleCredentials() {
  form.loginId = "example@portaldots.com";
  form.password = "password";
}

async function handleSubmit() {
  errorMessage.value = "";

  try {
    await loginMutation.mutateAsync({
      loginId: form.loginId,
      password: form.password,
      remember: form.remember,
    });
    await router.replace("/");
  } catch (error) {
    errorMessage.value = extractFirstErrorMessage(error);
  }
}
</script>

<template>
  <section class="mx-auto max-w-2xl py-8">
    <SurfaceCard tag="div">
      <div class="border-b border-border px-8 py-8 text-center">
        <h2 class="text-3xl font-semibold tracking-tight text-body">ログイン</h2>
      </div>

      <div class="px-8 py-8">
        <form class="grid gap-5" @submit.prevent="handleSubmit">
          <p
            v-if="errorMessage"
            class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger"
          >
            {{ errorMessage }}
          </p>

          <label class="grid gap-2 text-sm text-muted">
            <span class="sr-only">学籍番号または連絡先メールアドレス</span>
            <input
              v-model="form.loginId"
              autocomplete="username"
              name="loginId"
              required
              type="text"
              placeholder="学籍番号または連絡先メールアドレス"
            />
          </label>

          <label class="grid gap-2 text-sm text-muted">
            <span class="sr-only">パスワード</span>
            <input
              v-model="form.password"
              autocomplete="current-password"
              name="password"
              required
              type="password"
              placeholder="パスワード"
            />
          </label>

          <label class="flex items-center gap-3 text-sm text-body">
            <input v-model="form.remember" name="remember" type="checkbox" />
            ログインしたままにする
          </label>

          <p class="text-sm">
            <a class="text-primary" href="/password/reset">パスワードをお忘れの場合はこちら</a>
          </p>

          <button
            class="rounded bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isSubmitting"
            type="submit"
          >
            <strong>{{ isSubmitting ? "ログイン中..." : "ログイン" }}</strong>
          </button>

          <button
            class="rounded border border-border bg-surface px-4 py-3 text-sm text-body transition hover:bg-surface-light"
            type="button"
            @click="fillExampleCredentials"
          >
            開発用アカウントを入力
          </button>
        </form>

        <p class="mt-6 text-sm leading-7 text-muted">
          開発環境では <strong>example@portaldots.com</strong> /
          <strong>password</strong> でログインできます。<br />
          なお、認証フロー内のメール送信は現在モックです。実メールが無くても検証を進められます。
        </p>
      </div>
    </SurfaceCard>
  </section>
</template>
