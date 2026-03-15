<script setup lang="ts">
import { ref, computed } from "vue";
import BackLink from "@/components/ui/BackLink.vue";
import SettingsRow from "@/components/ui/SettingsRow.vue";
import SettingsSection from "@/components/ui/SettingsSection.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import {
  useCurrentCircleDetailQuery,
  useCircleMembersQuery,
  useRemoveMemberMutation,
  useRegenerateInvitationTokenMutation,
} from "@/features/circles/api";
import { buildApiUrl } from "@/lib/api/client";
import { useSessionStore } from "@/features/session/store";

const sessionStore = useSessionStore();
const detailQuery = useCurrentCircleDetailQuery();
const membersQuery = useCircleMembersQuery();
const removeMutation = useRemoveMemberMutation();
const regenerateMutation = useRegenerateInvitationTokenMutation();

const copySuccess = ref(false);
const errorMessage = ref("");

const currentUserId = computed(() => sessionStore.user?.id ?? "");

const invitationUrl = computed(() => {
  const token = detailQuery.data.value?.invitationToken;
  if (!token) return "";
  const base = buildApiUrl("/").replace(/\/v1\/$/, "");
  return `${window.location.origin}/circles/join/${token}`;
});

const isCurrentUserLeader = computed(() => {
  return (
    membersQuery.data.value?.some((m) => m.userId === currentUserId.value && m.isLeader) ?? false
  );
});

async function handleCopyUrl() {
  if (!invitationUrl.value) return;
  await navigator.clipboard.writeText(invitationUrl.value);
  copySuccess.value = true;
  setTimeout(() => {
    copySuccess.value = false;
  }, 2000);
}

async function handleRegenerate() {
  if (!confirm("招待URLを再生成します。現在の招待URLは無効になります。よろしいですか？")) return;
  errorMessage.value = "";

  try {
    await regenerateMutation.mutateAsync();
  } catch {
    errorMessage.value = "招待トークンの再生成に失敗しました。";
  }
}

async function handleRemoveMember(userId: string, displayName: string) {
  if (!confirm(`${displayName} をメンバーから削除しますか？`)) return;
  errorMessage.value = "";

  try {
    await removeMutation.mutateAsync(userId);
  } catch {
    errorMessage.value = "メンバーの削除に失敗しました。";
  }
}
</script>

<template>
  <section class="space-y-6">
    <BackLink to="/workspace/circles/detail"> 企画情報へ戻る </BackLink>

    <SurfaceCard tag="header">
      <p class="text-sm text-primary">Circle Members</p>
      <h2 class="mt-3 text-3xl font-semibold text-body">メンバー管理</h2>
      <p class="mt-3 text-sm leading-7 text-muted">招待リンクの確認やメンバーの管理を行います。</p>
    </SurfaceCard>

    <!-- 招待 URL -->
    <SettingsSection title="招待リンク">
      <SettingsRow>
        <div class="grid gap-3">
          <p class="text-sm text-muted">このリンクを共有することで、メンバーを招待できます。</p>
          <div v-if="detailQuery.isPending.value" class="text-sm text-muted">読み込み中...</div>
          <div v-else class="flex items-center gap-2">
            <input :value="invitationUrl" type="text" readonly class="flex-1 font-mono text-xs" />
            <button
              class="shrink-0 rounded border border-primary px-3 py-2 text-sm font-bold text-primary transition hover:bg-primary-light"
              type="button"
              @click="handleCopyUrl"
            >
              {{ copySuccess ? "コピー完了!" : "コピー" }}
            </button>
          </div>
        </div>
      </SettingsRow>

      <template v-if="isCurrentUserLeader" #footer>
        <div class="flex justify-end">
          <button
            class="rounded border border-border px-4 py-2 text-sm text-muted transition hover:bg-form-control disabled:opacity-60"
            :disabled="regenerateMutation.isPending.value"
            type="button"
            @click="handleRegenerate"
          >
            {{ regenerateMutation.isPending.value ? "再生成中..." : "招待URLを再生成" }}
          </button>
        </div>
      </template>
    </SettingsSection>

    <!-- メンバー一覧 -->
    <SettingsSection title="メンバー一覧">
      <div v-if="membersQuery.isPending.value" class="px-6 py-6 text-sm text-muted">
        読み込み中...
      </div>

      <div v-else-if="membersQuery.data.value?.length === 0" class="px-6 py-6 text-sm text-muted">
        メンバーがいません。
      </div>

      <div v-else class="divide-y divide-border">
        <div
          v-for="member in membersQuery.data.value"
          :key="member.userId"
          class="flex items-center justify-between px-6 py-4"
        >
          <div>
            <p class="font-semibold text-body">{{ member.displayName }}</p>
            <p class="mt-1 text-xs text-muted">
              {{ member.isLeader ? "リーダー" : "メンバー" }}
            </p>
          </div>
          <button
            v-if="!member.isLeader && (isCurrentUserLeader || member.userId === currentUserId)"
            class="rounded border border-danger px-3 py-2 text-xs font-bold text-danger transition hover:bg-danger-light disabled:opacity-60"
            :disabled="removeMutation.isPending.value"
            type="button"
            @click="handleRemoveMember(member.userId, member.displayName)"
          >
            削除
          </button>
        </div>
      </div>

      <template v-if="errorMessage" #footer>
        <p class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
          {{ errorMessage }}
        </p>
      </template>
    </SettingsSection>
  </section>
</template>
