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
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import {
  extractPasswordValidationMessage,
  useUpdatePasswordMutation,
} from "@/features/session/password";
import {
  extractProfileValidationMessage,
  useUpdateProfileMutation,
} from "@/features/session/profile";
import { useSessionStore } from "@/features/session/store";

const sessionStore = useSessionStore();
const updateProfileMutation = useUpdateProfileMutation();
const updatePasswordMutation = useUpdatePasswordMutation();
const displayName = ref(sessionStore.user?.displayName ?? "");
const errorMessage = ref("");
const successMessage = ref("");
const passwordForm = ref({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});
const passwordErrorMessage = ref("");
const passwordSuccessMessage = ref("");

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

async function handleSavePassword() {
  passwordErrorMessage.value = "";
  passwordSuccessMessage.value = "";

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordErrorMessage.value = "確認用パスワードが一致しません。";
    return;
  }

  try {
    await updatePasswordMutation.mutateAsync({
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword,
    });
    passwordForm.value = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };
    passwordSuccessMessage.value = "パスワードを更新しました。";
  } catch (error) {
    passwordErrorMessage.value = extractPasswordValidationMessage(error);
  }
}
</script>

<template>
  <section class="space-y-6">
    <BackLink to="/workspace"> ワークスペースへ戻る </BackLink>

    <SurfaceCard tag="header">
      <p class="text-sm text-primary">User Settings</p>
      <h2 class="mt-3 text-3xl font-semibold text-body">ユーザー設定</h2>
      <p class="mt-3 text-sm leading-7 text-muted">
        一般利用者向けの設定導線を復元しています。認証情報の変更 UI
        は未移行のため、まずは現在の利用コンテキストを確認できる形にしています。
      </p>
    </SurfaceCard>

    <SettingsSection title="アカウント">
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
          <p class="text-sm font-semibold text-body">ロール</p>
          <p class="text-sm text-body">{{ sessionStore.roles.join(", ") || "なし" }}</p>
        </div>
      </SettingsRow>
    </SettingsSection>

    <SettingsSection title="利用中の設定">
      <SettingsRow>
        <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <p class="text-sm font-semibold text-body">現在の企画</p>
          <p class="text-sm text-body">{{ sessionStore.currentCircle?.name ?? "企画未選択" }}</p>
        </div>
      </SettingsRow>
      <SettingsRow>
        <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <p class="text-sm font-semibold text-body">補足</p>
          <p class="text-sm leading-7 text-muted">
            通知設定は未移行ですが、現時点では表示名とパスワードの更新、利用中のアカウント/企画コンテキスト確認を行えます。
          </p>
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
          <div class="flex justify-end">
            <button
              class="rounded bg-primary px-6 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="updateProfileMutation.isPending.value"
              type="button"
              @click="handleSaveProfile"
            >
              {{ updateProfileMutation.isPending.value ? "保存中..." : "変更を保存" }}
            </button>
          </div>
        </div>
      </template>
    </SettingsSection>

    <SettingsSection title="パスワード変更">
      <SettingsRow>
        <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <div class="space-y-1">
            <p class="text-sm font-semibold text-body">認証情報</p>
            <p class="text-xs leading-6 text-muted">
              現在のパスワードを確認した上で、新しいパスワードへ更新します。
            </p>
          </div>
          <div class="grid gap-4">
            <label class="grid gap-2 text-sm text-body">
              <span>現在のパスワード</span>
              <input
                v-model="passwordForm.currentPassword"
                name="currentPassword"
                type="password"
              />
            </label>
            <label class="grid gap-2 text-sm text-body">
              <span>新しいパスワード</span>
              <input v-model="passwordForm.newPassword" name="newPassword" type="password" />
            </label>
            <label class="grid gap-2 text-sm text-body">
              <span>確認用パスワード</span>
              <input
                v-model="passwordForm.confirmPassword"
                name="confirmPassword"
                type="password"
              />
            </label>
          </div>
        </div>
      </SettingsRow>
      <template #footer>
        <div class="space-y-4">
          <p
            v-if="passwordSuccessMessage"
            class="rounded border border-success bg-success-light px-4 py-3 text-sm text-success"
          >
            {{ passwordSuccessMessage }}
          </p>
          <p
            v-if="passwordErrorMessage"
            class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger"
          >
            {{ passwordErrorMessage }}
          </p>
          <div class="flex justify-end">
            <button
              class="rounded bg-primary px-6 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="updatePasswordMutation.isPending.value"
              type="button"
              @click="handleSavePassword"
            >
              {{ updatePasswordMutation.isPending.value ? "更新中..." : "パスワードを更新" }}
            </button>
          </div>
        </div>
      </template>
    </SettingsSection>
  </section>
</template>
