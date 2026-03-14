<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import {
  extractStaffVerifyError,
  useConfirmStaffVerificationMutation,
  useRequestStaffVerificationMutation,
  useStaffStatusQuery,
} from "@/features/staff/status/api";
import { useSessionStore } from "@/features/session/store";

const router = useRouter();
const sessionStore = useSessionStore();
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated));
const requestMutation = useRequestStaffVerificationMutation();
const confirmMutation = useConfirmStaffVerificationMutation();
const form = reactive({
  verifyCode: "",
});
const infoMessage = ref("");
const errorMessage = ref("");

async function handleRequestCode() {
  infoMessage.value = "";
  errorMessage.value = "";

  try {
    const result = await requestMutation.mutateAsync();
    infoMessage.value = `${result.message} モック認証コード: ${result.verifyCode}`;
  } catch {
    errorMessage.value = "認証コードの送信に失敗しました。";
  }
}

async function handleConfirm() {
  infoMessage.value = "";
  errorMessage.value = "";

  try {
    await confirmMutation.mutateAsync(form.verifyCode);
    await router.push("/staff");
  } catch (error) {
    errorMessage.value = extractStaffVerifyError(error);
  }
}
</script>

<template>
  <section class="mx-auto max-w-3xl space-y-6">
    <header class="text-center">
      <p class="text-sm text-primary">Staff Verify</p>
      <h2 class="mt-3 text-3xl font-semibold text-body">スタッフ認証</h2>
    </header>

    <SurfaceCard tag="div">
      <div class="border-b border-border px-6 py-5">
        <h3 class="text-lg font-semibold text-body">認証コードを入力してください</h3>
        <p class="mt-2 text-sm leading-7 text-muted">
          あなたの連絡先メールアドレス宛に認証メールが送信された想定で、認証コードを確認します。
          旧実装の staff verify と同様に、コード確認後に staff session を有効化します。
        </p>
        <p class="mt-2 text-sm leading-7 text-muted">
          現在はメール送信をモックしています。実メールは送られません。
        </p>
      </div>

      <div class="border-b border-border px-6 py-5">
        <button
          class="rounded bg-primary px-5 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="requestMutation.isPending.value"
          type="button"
          @click="handleRequestCode"
        >
          {{ requestMutation.isPending.value ? "送信中..." : "認証コードを送信" }}
        </button>
      </div>

      <form class="px-6 py-5" @submit.prevent="handleConfirm">
        <label class="grid gap-2 text-sm text-body">
          <span class="font-medium">認証コード</span>
          <input
            v-model="form.verifyCode"
            class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
            name="verifyCode"
            type="text"
          />
        </label>

        <p
          v-if="infoMessage"
          class="mt-4 rounded border border-success bg-success-light px-4 py-3 text-sm text-success"
        >
          {{ infoMessage }}
        </p>

        <p
          v-if="errorMessage"
          class="mt-4 rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger"
        >
          {{ errorMessage }}
        </p>

        <div class="pt-6 text-center">
          <button
            class="rounded bg-primary px-10 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="confirmMutation.isPending.value"
            type="submit"
          >
            {{ confirmMutation.isPending.value ? "認証中..." : "ログイン" }}
          </button>
        </div>
      </form>
    </SurfaceCard>
  </section>
</template>
