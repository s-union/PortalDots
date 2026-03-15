<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
  },
});

import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import BackLink from "@/components/ui/BackLink.vue";
import SettingsRow from "@/components/ui/SettingsRow.vue";
import SettingsSection from "@/components/ui/SettingsSection.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import {
  extractDeleteAccountValidationMessage,
  useDeleteOwnAccountMutation,
} from "@/features/session/deleteAccount";
import {
  extractPasswordValidationMessage,
  useUpdatePasswordMutation,
} from "@/features/session/password";
import {
  extractProfileValidationMessage,
  useUpdateProfileMutation,
} from "@/features/session/profile";
import { useSessionStore } from "@/features/session/store";
import { hasStaffAccess } from "@/features/staff/access/capabilities";
import { useUiThemePreference, type UiTheme } from "@/features/session/theme";

const router = useRouter();
const sessionStore = useSessionStore();
const updateProfileMutation = useUpdateProfileMutation();
const updatePasswordMutation = useUpdatePasswordMutation();
const deleteAccountMutation = useDeleteOwnAccountMutation();
const { theme, setTheme } = useUiThemePreference();
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
const deleteAccountErrorMessage = ref("");

const hasPrivilegedRole = computed(() =>
  hasStaffAccess(sessionStore.roles, sessionStore.permissions),
);
const belongsToCircle = computed(() => sessionStore.currentCircle !== null);
const canDeleteAccountFromServer = computed(() => sessionStore.user?.canDeleteAccount === true);
const canDeleteAccount = computed(() => canDeleteAccountFromServer.value);
const deleteAccountBlockedReason = computed(() => {
  if (canDeleteAccountFromServer.value) {
    return "アカウントを削除すると、このブラウザー上の利用履歴や設定も利用できなくなります。";
  }
  if (hasPrivilegedRole.value) {
    return "管理者ユーザー・スタッフ相当の権限を持つため、アカウント削除はできません。";
  }
  if (belongsToCircle.value) {
    return "企画に所属しているため、企画を離れるまでアカウント削除はできません。";
  }
  return "企画所属または権限状態のため、現在はアカウント削除できません。";
});

const themeOptions: Array<{
  value: UiTheme;
  label: string;
  description: string;
}> = [
  {
    value: "system",
    label: "自動",
    description: "端末のライト / ダーク設定に合わせます。",
  },
  {
    value: "light",
    label: "ライトテーマ",
    description: "常に明るい配色で表示します。",
  },
  {
    value: "dark",
    label: "ダークテーマ",
    description: "常に暗い配色で表示します。",
  },
];

const selectedTheme = computed<UiTheme>({
  get: () => theme.value,
  set: (value) => setTheme(value),
});

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

async function handleDeleteAccount() {
  if (!canDeleteAccount.value) {
    return;
  }
  if (typeof window !== "undefined" && !window.confirm("本当にアカウントを削除しますか？")) {
    return;
  }

  deleteAccountErrorMessage.value = "";

  try {
    await deleteAccountMutation.mutateAsync();
    await router.replace("/");
  } catch (error) {
    deleteAccountErrorMessage.value = extractDeleteAccountValidationMessage(error);
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
        一般利用者向けの設定導線を復元しています。表示名、外観、パスワード変更をこの画面から扱えます。
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
            通知設定や一般情報の詳細編集は今後の移植対象ですが、現時点でも主要な利用者設定はここから変更できます。
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

    <SettingsSection title="外観">
      <SettingsRow>
        <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <div class="space-y-1">
            <p class="text-sm font-semibold text-body">テーマ</p>
            <p class="text-xs leading-6 text-muted">
              設定はこのブラウザーの cookie に保存され、次回アクセス時にも引き継がれます。
            </p>
          </div>
          <div class="grid gap-3">
            <label
              v-for="option in themeOptions"
              :key="option.value"
              class="flex items-start gap-3 rounded border px-4 py-3 transition"
              :class="
                selectedTheme === option.value
                  ? 'border-primary bg-primary-light'
                  : 'border-border bg-surface'
              "
            >
              <input v-model="selectedTheme" name="theme" type="radio" :value="option.value" />
              <span class="grid gap-1">
                <span class="text-sm font-semibold text-body">{{ option.label }}</span>
                <span class="text-xs leading-6 text-muted">{{ option.description }}</span>
              </span>
            </label>
          </div>
        </div>
      </SettingsRow>
      <template #footer>
        <p class="text-sm leading-7 text-muted">
          保存ボタンは不要です。選択した時点で即座に反映されます。
        </p>
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

    <SettingsSection title="アカウント削除">
      <SettingsRow>
        <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <div class="space-y-1">
            <p class="text-sm font-semibold text-body">削除条件</p>
            <p class="text-xs leading-6 text-muted">
              legacy の制約に合わせ、権限保有中または企画所属中は削除できません。
            </p>
          </div>
          <div class="space-y-3">
            <p class="text-sm leading-7 text-muted">
              {{ deleteAccountBlockedReason }}
            </p>
            <p
              v-if="deleteAccountErrorMessage"
              class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger"
            >
              {{ deleteAccountErrorMessage }}
            </p>
            <div class="flex justify-end">
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
      </SettingsRow>
    </SettingsSection>
  </section>
</template>
