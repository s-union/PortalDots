<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
  },
});

import { ref } from "vue";
import BackLink from "@/components/ui/BackLink.vue";
import SettingsSection from "@/components/ui/SettingsSection.vue";
import TabStrip from "@/components/ui/TabStrip.vue";
import { useUserSettingsPage } from "@/features/session/settings";

const {
  tabs,
  canDeleteAccount,
  deleteAccountBlockedReason,
  deleteAccountMutation,
  deleteAccount,
  workspaceBackLink,
} = useUserSettingsPage("delete");

const deleteAccountErrorMessage = ref("");

async function handleDeleteAccount() {
  deleteAccountErrorMessage.value = (await deleteAccount()) ?? "";
}
</script>

<template>
  <section class="space-y-6">
    <BackLink :to="workspaceBackLink"> ワークスペースへ戻る </BackLink>

    <TabStrip :tabs="tabs" />

    <SettingsSection title="アカウント削除">
      <div class="px-6 py-8 text-center">
        <div class="mx-auto max-w-2xl space-y-4 text-sm leading-7 text-body">
          <p>{{ deleteAccountBlockedReason }}</p>
          <p
            v-if="deleteAccountErrorMessage"
            class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger"
          >
            {{ deleteAccountErrorMessage }}
          </p>
          <div class="pt-2">
            <button
              class="rounded border border-danger px-6 py-3 text-sm font-bold text-danger transition hover:bg-danger-light disabled:cursor-not-allowed disabled:border-border disabled:text-muted"
              :disabled="!canDeleteAccount || deleteAccountMutation.isPending.value"
              type="button"
              @click="handleDeleteAccount"
            >
              {{ deleteAccountMutation.isPending.value ? "削除中..." : "アカウントを削除" }}
            </button>
          </div>
        </div>
      </div>
    </SettingsSection>
  </section>
</template>
