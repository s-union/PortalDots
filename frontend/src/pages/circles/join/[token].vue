<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import BackLink from "@/components/ui/BackLink.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import { useJoinCircleMutation } from "@/features/circles/api";
import { useSessionStore } from "@/features/session/store";

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const joinMutation = useJoinCircleMutation();

const errorMessage = ref("");

const invitationToken = computed(() => {
  const token = Reflect.get(route.params, "token");
  return typeof token === "string" ? token : "";
});
const isAuthenticated = computed(() => sessionStore.isAuthenticated);

async function handleAcceptInvite() {
  errorMessage.value = "";

  if (invitationToken.value === "") {
    errorMessage.value = "招待 URL が不正です。最新の招待リンクを確認してください。";
    return;
  }

  try {
    await joinMutation.mutateAsync(invitationToken.value);
    await router.push("/workspace/circles/detail");
  } catch (error) {
    const apiMessage = extractApiMessage(error);

    if (apiMessage === "already_member") {
      await router.push("/circles/select");
      return;
    }

    if (apiMessage === "invalid_token") {
      errorMessage.value =
        "招待 URL が無効か、すでに利用できません。最新の招待リンクを共有してもらってください。";
      return;
    }

    errorMessage.value = "招待の受け入れに失敗しました。時間をおいて再度お試しください。";
  }
}

function extractApiMessage(error: unknown) {
  if (!(error instanceof Error) || !("cause" in error)) {
    return null;
  }

  const cause = error.cause;
  if (!cause || typeof cause !== "object" || !("message" in cause)) {
    return null;
  }

  return typeof cause.message === "string" ? cause.message : null;
}
</script>

<template>
  <section class="space-y-6">
    <BackLink to="/"> ホームへ戻る </BackLink>

    <SurfaceCard tag="header">
      <p class="text-sm text-primary">Circle Invitation</p>
      <h2 class="mt-3 text-3xl font-semibold text-body">企画招待を受け入れる</h2>
      <p class="mt-3 text-sm leading-7 text-muted">
        招待リンクから、このアカウントを企画メンバーとして追加します。
      </p>
    </SurfaceCard>

    <SurfaceCard>
      <div class="space-y-4 px-6 py-6 text-sm leading-7 text-body">
        <p>
          このページでは、招待トークン
          <code>{{ invitationToken }}</code> を使って参加中の企画へ加わります。
        </p>
        <p v-if="isAuthenticated">
          現在は <strong>{{ sessionStore.user?.displayName ?? "ログイン中ユーザー" }}</strong>
          として受け入れます。受け入れ後は企画情報画面へ移動します。
        </p>
        <p v-else>
          招待を受け入れるには先にログインが必要です。ログイン後にこの URL
          をもう一度開いてください。
        </p>

        <p
          v-if="errorMessage"
          class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger"
        >
          {{ errorMessage }}
        </p>

        <div class="flex flex-wrap gap-3">
          <button
            v-if="isAuthenticated"
            class="rounded bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="joinMutation.isPending.value"
            type="button"
            @click="handleAcceptInvite"
          >
            {{ joinMutation.isPending.value ? "受け入れ中..." : "招待を受け入れる" }}
          </button>
          <RouterLink
            v-else
            to="/login"
            class="inline-flex rounded bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary-hover"
          >
            ログインして続ける
          </RouterLink>
          <RouterLink
            to="/circles/select"
            class="inline-flex rounded border border-border px-4 py-3 font-semibold text-body transition hover:bg-surface-light"
          >
            企画選択へ
          </RouterLink>
        </div>
      </div>
    </SurfaceCard>
  </section>
</template>
