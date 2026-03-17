<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
  },
});

import { ref } from "vue";
import BackLink from "@/components/ui/BackLink.vue";
import SettingsRow from "@/components/ui/SettingsRow.vue";
import SettingsSection from "@/components/ui/SettingsSection.vue";
import TabStrip from "@/components/ui/TabStrip.vue";
import { useUserSettingsPage } from "@/features/session/settings";

const {
  tabs,
  sessionStore,
  updateProfileMutation,
  workspaceBackLink,
  extractProfileValidationMessage,
} = useUserSettingsPage("general");

const displayName = ref(sessionStore.user?.displayName ?? "");
const errorMessage = ref("");
const successMessage = ref("");

async function handleSaveProfile() {
  errorMessage.value = "";
  successMessage.value = "";

  try {
    await updateProfileMutation.mutateAsync({ displayName: displayName.value });
    displayName.value = sessionStore.user?.displayName ?? displayName.value;
    successMessage.value = "表示名を更新しました。";
  } catch (error) {
    errorMessage.value = extractProfileValidationMessage(error);
  }
}
</script>

<template>
  <section class="space-y-6">
    <BackLink :to="workspaceBackLink"> ワークスペースへ戻る </BackLink>

    <TabStrip :tabs="tabs" />

    <SettingsSection title="一般設定">
      <SettingsRow>
        <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <p class="text-sm font-semibold text-body">表示名</p>
          <div class="grid gap-2">
            <input v-model="displayName" name="displayName" type="text" />
            <p class="text-xs text-muted">session bootstrap に表示する名前を更新します。</p>
          </div>
        </div>
      </SettingsRow>
      <SettingsRow>
        <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <p class="text-sm font-semibold text-body">ユーザー ID</p>
          <p class="text-sm text-body">{{ sessionStore.user?.id ?? "-" }}</p>
        </div>
      </SettingsRow>
      <SettingsRow>
        <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <p class="text-sm font-semibold text-body">現在の企画</p>
          <p class="text-sm text-body">{{ sessionStore.currentCircle?.name ?? "企画未選択" }}</p>
        </div>
      </SettingsRow>
      <template #footer>
        <div class="space-y-4">
          <p
            v-if="successMessage"
            class="rounded border border-success bg-success-light px-4 py-3 text-sm text-success"
          >
            {{ successMessage }}
          </p>
          <p
            v-if="errorMessage"
            class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger"
          >
            {{ errorMessage }}
          </p>
          <div class="flex justify-center pt-2">
            <button
              class="min-w-40 rounded bg-primary px-6 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="updateProfileMutation.isPending.value"
              type="button"
              @click="handleSaveProfile"
            >
              {{ updateProfileMutation.isPending.value ? "保存中..." : "保存" }}
            </button>
          </div>
        </div>
      </template>
    </SettingsSection>
  </section>
</template>
