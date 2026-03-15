<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import BackLink from "@/components/ui/BackLink.vue";
import SettingsRow from "@/components/ui/SettingsRow.vue";
import SettingsSection from "@/components/ui/SettingsSection.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import { useAuthorizedStaffContext } from "@/features/staff/hooks/useAuthorizedStaffContext";
import {
  createEditableLoginIds,
  createEditableRoles,
  extractStaffUserValidationMessage,
  formatStaffUserLoginIds,
  manageableRoles,
  normalizeSelectedRoles,
  parseStaffUserLoginIds,
  useDeleteStaffUserMutation,
  useStaffUserDetailQuery,
  useUpdateStaffUserMutation,
  useUpdateStaffUserRolesMutation,
  useVerifyStaffUserMutation,
} from "@/features/staff/users/api";

const route = useRoute();
const router = useRouter();
const userId = computed(() => String(route.params.userId ?? ""));
const { enabled } = useAuthorizedStaffContext({ capability: "users.edit" });
const userQuery = useStaffUserDetailQuery(userId, enabled);
const updateUserMutation = useUpdateStaffUserMutation();
const updateRolesMutation = useUpdateStaffUserRolesMutation();
const verifyUserMutation = useVerifyStaffUserMutation(userId);
const deleteUserMutation = useDeleteStaffUserMutation(userId);
const editableRoles = createEditableRoles([]);
const loginIdsText = createEditableLoginIds([]);
const displayName = ref("");
const errorMessage = ref("");
const successMessage = ref("");

watch(
  () => userQuery.data.value,
  (user) => {
    if (!user) {
      return;
    }

    displayName.value = user.displayName;
    loginIdsText.value = formatStaffUserLoginIds(user.loginIds);
    editableRoles.value = [...user.roles];
  },
  { immediate: true },
);

async function handleSaveUser() {
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const updatedUser = await updateUserMutation.mutateAsync({
      userId: userId.value,
      displayName: displayName.value,
      loginIds: parseStaffUserLoginIds(loginIdsText.value),
    });
    displayName.value = updatedUser.displayName;
    loginIdsText.value = formatStaffUserLoginIds(updatedUser.loginIds);
    successMessage.value = "ユーザー情報を更新しました。";
  } catch (error) {
    errorMessage.value = extractStaffUserValidationMessage(error);
  }
}

async function handleSaveRoles() {
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const updatedUser = await updateRolesMutation.mutateAsync({
      userId: userId.value,
      roles: normalizeSelectedRoles(editableRoles.value),
    });
    editableRoles.value = [...updatedUser.roles];
    successMessage.value = "ロールを更新しました。";
  } catch (error) {
    errorMessage.value = extractStaffUserValidationMessage(error);
  }
}

async function handleVerifyUser() {
  errorMessage.value = "";
  successMessage.value = "";

  try {
    await verifyUserMutation.mutateAsync();
    successMessage.value = "本人確認を完了しました。";
  } catch (error) {
    errorMessage.value = extractStaffUserValidationMessage(error);
  }
}

async function handleDeleteUser() {
  if (typeof window !== "undefined" && !window.confirm("このユーザーを削除しますか？")) {
    return;
  }

  errorMessage.value = "";
  successMessage.value = "";

  try {
    await deleteUserMutation.mutateAsync();
    await router.push("/staff/users");
  } catch (error) {
    errorMessage.value = extractStaffUserValidationMessage(error);
  }
}

function isRoleChecked(role: string) {
  return editableRoles.value.includes(role);
}

function toggleRole(role: string, checked: boolean) {
  if (checked) {
    if (!editableRoles.value.includes(role)) {
      editableRoles.value = [...editableRoles.value, role];
    }
    return;
  }

  editableRoles.value = editableRoles.value.filter((currentRole) => currentRole !== role);
}

function handleRoleChange(event: Event, role: string) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  toggleRole(role, target.checked);
}
</script>

<template>
  <section class="space-y-6">
    <BackLink to="/staff/users"> ユーザー管理へ戻る </BackLink>

    <div
      v-if="userQuery.isPending.value"
      class="rounded border border-border bg-surface p-6 text-muted shadow-lv1"
    >
      読み込み中...
    </div>

    <article v-else-if="userQuery.data.value" class="space-y-6">
      <SurfaceCard tag="header">
        <p class="text-sm text-primary">User Detail</p>
        <h2 class="mt-3 text-3xl font-semibold text-body">ユーザーを編集</h2>
        <div class="mt-3 text-sm text-muted">ユーザーID : {{ userQuery.data.value.id }}</div>
        <div class="mt-3">
          <span
            class="rounded-full px-3 py-1 text-xs"
            :class="
              userQuery.data.value.isVerified
                ? 'bg-success-light text-success'
                : 'bg-surface-light text-muted-2'
            "
          >
            {{ userQuery.data.value.isVerified ? "本人確認済み" : "本人確認未完了" }}
          </span>
        </div>
      </SurfaceCard>

      <form class="space-y-6" @submit.prevent="handleSaveUser">
        <SettingsSection title="一般設定">
          <SettingsRow>
            <div class="grid gap-4">
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">表示名</span>
                <input v-model="displayName" name="displayName" type="text" />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">ログイン ID</span>
                <textarea
                  v-model="loginIdsText"
                  class="min-h-28"
                  name="loginIds"
                  placeholder="1 行に 1 つ、またはカンマ区切りで入力"
                />
                <span class="text-xs text-muted">
                  メールアドレスと学籍番号など、利用するログイン ID を複数登録できます。
                </span>
              </label>
            </div>
          </SettingsRow>
          <template #footer>
            <button
              class="rounded bg-primary px-8 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="updateUserMutation.isPending.value"
              type="submit"
            >
              {{ updateUserMutation.isPending.value ? "保存中..." : "ユーザー情報を保存" }}
            </button>
          </template>
        </SettingsSection>
      </form>

      <form @submit.prevent="handleSaveRoles">
        <SettingsSection title="ユーザー種別">
          <SettingsRow>
            <div class="grid gap-3">
              <label
                v-for="role in manageableRoles"
                :key="role"
                class="flex items-start gap-3 rounded border border-border px-4 py-4 text-sm text-body"
              >
                <input
                  :checked="isRoleChecked(role)"
                  :name="role"
                  class="mt-1"
                  type="checkbox"
                  @change="handleRoleChange($event, role)"
                />
                <span class="grid gap-1">
                  <span class="font-medium">{{ role }}</span>
                  <span class="text-xs leading-6 text-muted">
                    {{
                      role === "admin"
                        ? "スタッフモードを含む全機能を利用できます。"
                        : "このロールに紐づく staff 機能を利用できます。"
                    }}
                  </span>
                </span>
              </label>
            </div>

            <div
              class="mt-4 rounded border border-border bg-surface-light px-4 py-4 text-sm text-muted"
            >
              user_manager または admin を持つユーザーだけがこの画面を操作できます。
            </div>
          </SettingsRow>
          <template #footer>
            <button
              class="rounded bg-primary px-8 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="updateRolesMutation.isPending.value"
              type="submit"
            >
              {{ updateRolesMutation.isPending.value ? "更新中..." : "ロールを保存" }}
            </button>
          </template>
        </SettingsSection>
      </form>

      <SettingsSection title="本人確認と削除">
        <SettingsRow>
          <div class="flex flex-wrap gap-3">
            <button
              class="rounded border border-success px-5 py-3 font-semibold text-success transition hover:bg-success-light disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="userQuery.data.value.isVerified || verifyUserMutation.isPending.value"
              type="button"
              @click="handleVerifyUser"
            >
              {{ verifyUserMutation.isPending.value ? "処理中..." : "本人確認を完了する" }}
            </button>
            <button
              class="rounded border border-danger px-5 py-3 font-semibold text-danger transition hover:bg-danger-light disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="deleteUserMutation.isPending.value"
              type="button"
              @click="handleDeleteUser"
            >
              {{ deleteUserMutation.isPending.value ? "削除中..." : "ユーザーを削除" }}
            </button>
          </div>
        </SettingsRow>
      </SettingsSection>

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
    </article>

    <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">
      ユーザーを取得できませんでした。
    </div>
  </section>
</template>
