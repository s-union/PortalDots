<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: "circles.edit",
  },
});

import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import BackLink from "@/components/ui/BackLink.vue";
import SettingsRow from "@/components/ui/SettingsRow.vue";
import SettingsSection from "@/components/ui/SettingsSection.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import { useAuthorizedStaffContext } from "@/features/staff/hooks/useAuthorizedStaffContext";
import {
  extractStaffCircleMailValidationMessage,
  extractStaffCircleValidationMessage,
  useDeleteStaffCircleMutation,
  useSendStaffCircleMailMutation,
  useStaffCircleDetailQuery,
  useStaffCircleMailForm,
  useStaffCircleMailFormQuery,
  useUpdateStaffCircleMutation,
} from "@/features/staff/circles/api";
import { useStaffParticipationTypesQuery } from "@/features/staff/participation-types/api";

const route = useRoute("/staff/circles/[circleId]");
const router = useRouter();
const circleId = computed(() => String(route.params.circleId ?? ""));
const { enabled } = useAuthorizedStaffContext({ capability: "circles.edit" });
const circleQuery = useStaffCircleDetailQuery(circleId, enabled);
const participationTypesQuery = useStaffParticipationTypesQuery(enabled);
const mailFormQuery = useStaffCircleMailFormQuery(circleId, enabled);
const updateCircleMutation = useUpdateStaffCircleMutation();
const deleteCircleMutation = useDeleteStaffCircleMutation(circleId);
const sendCircleMailMutation = useSendStaffCircleMailMutation(circleId);
const form = ref({
  name: "",
  groupName: "",
  participationTypeId: "",
});
const mailForm = useStaffCircleMailForm();
const errorMessage = ref("");
const successMessage = ref("");
const mailErrorMessage = ref("");
const mailSuccessMessage = ref("");

const participationTypeEditorRoute = computed(() => {
  const participationTypeId = circleQuery.data.value?.participationTypeId;
  if (!participationTypeId) {
    return "/staff/participation-types";
  }
  return `/staff/participation-types/${encodeURIComponent(participationTypeId)}`;
});

const mailRecipientCount = computed(() => mailFormQuery.data.value?.recipients.length ?? 0);
const canSendMail = computed(
  () => mailRecipientCount.value > 0 && !sendCircleMailMutation.isPending.value,
);

watch(
  () => circleQuery.data.value,
  (circle) => {
    if (!circle) {
      return;
    }
    form.value = {
      name: circle.name,
      groupName: circle.groupName,
      participationTypeId: circle.participationTypeId,
    };
  },
  { immediate: true },
);

async function handleSaveCircle() {
  errorMessage.value = "";
  successMessage.value = "";

  try {
    await updateCircleMutation.mutateAsync({
      circleId: circleId.value,
      name: form.value.name,
      groupName: form.value.groupName,
      participationTypeId: form.value.participationTypeId,
    });
    successMessage.value = "企画を更新しました。";
  } catch (error) {
    errorMessage.value = extractStaffCircleValidationMessage(error);
  }
}

async function handleDeleteCircle() {
  if (typeof window !== "undefined" && !window.confirm("この企画を削除しますか？")) {
    return;
  }

  errorMessage.value = "";
  successMessage.value = "";

  try {
    await deleteCircleMutation.mutateAsync();
    await router.push("/staff/circles");
  } catch (error) {
    errorMessage.value = extractStaffCircleValidationMessage(error);
  }
}

async function handleSendMail() {
  mailErrorMessage.value = "";
  mailSuccessMessage.value = "";

  try {
    await sendCircleMailMutation.mutateAsync({
      recipient: mailForm.value.recipient,
      subject: mailForm.value.subject,
      body: mailForm.value.body,
    });
    mailForm.value = {
      recipient: mailForm.value.recipient,
      subject: "",
      body: "",
    };
    mailSuccessMessage.value = "企画所属者向けメールをキューに追加しました。";
  } catch (error) {
    mailErrorMessage.value = extractStaffCircleMailValidationMessage(error);
  }
}
</script>

<template>
  <section class="space-y-6">
    <BackLink to="/staff/circles"> 企画管理へ戻る </BackLink>

    <div
      v-if="circleQuery.isPending.value"
      class="rounded border border-border bg-surface p-6 text-muted shadow-lv1"
    >
      読み込み中...
    </div>

    <div v-else-if="circleQuery.data.value" class="space-y-6">
      <form class="space-y-6" @submit.prevent="handleSaveCircle">
        <SurfaceCard tag="header">
          <p class="text-sm text-primary">Circle Detail</p>
          <h2 class="mt-3 text-3xl font-semibold text-body">企画を編集</h2>
          <div class="mt-3 text-sm text-muted">企画ID : {{ circleQuery.data.value.id }}</div>
          <div class="mt-1 text-sm text-muted">{{ circleQuery.data.value.name }}</div>
        </SurfaceCard>

        <SettingsSection title="企画基本情報">
          <SettingsRow>
            <div class="grid gap-4">
              <div
                class="rounded border border-border bg-surface-light px-4 py-4 text-sm text-muted"
              >
                参加種別の詳細設定や参加登録フォーム編集は参加種別管理画面から行います。
                <RouterLink :to="participationTypeEditorRoute" class="ml-2 text-primary underline">
                  参加種別を開く
                </RouterLink>
              </div>
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">企画名</span>
                <input v-model="form.name" name="name" type="text" />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">企画グループ名</span>
                <input v-model="form.groupName" name="groupName" type="text" />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">参加種別</span>
                <select v-model="form.participationTypeId" disabled name="participationTypeId">
                  <option value="">参加種別を選択してください</option>
                  <option
                    v-for="participationType in participationTypesQuery.data.value ?? []"
                    :key="participationType.id"
                    :value="participationType.id"
                  >
                    {{ participationType.name }}
                  </option>
                </select>
                <span class="text-xs text-muted-2">
                  既存企画の参加種別変更は Laravel 版に合わせて無効化しています。
                </span>
              </label>
            </div>
          </SettingsRow>
          <template #footer>
            <div class="flex flex-wrap justify-end gap-3">
              <button
                class="rounded border border-danger px-5 py-3 font-semibold text-danger transition hover:bg-danger-light disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="deleteCircleMutation.isPending.value"
                type="button"
                @click="handleDeleteCircle"
              >
                {{ deleteCircleMutation.isPending.value ? "削除中..." : "削除" }}
              </button>
              <button
                class="rounded bg-primary px-8 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="updateCircleMutation.isPending.value"
                type="submit"
              >
                {{ updateCircleMutation.isPending.value ? "更新中..." : "保存" }}
              </button>
            </div>
          </template>
        </SettingsSection>
      </form>

      <SettingsSection title="企画所属者向けメール送信">
        <SettingsRow>
          <div
            v-if="mailFormQuery.isPending.value"
            class="rounded border border-border bg-surface-light px-4 py-3 text-sm text-muted"
          >
            宛先情報を読み込み中...
          </div>

          <div v-else class="grid gap-4">
            <p class="text-sm text-muted">送信対象: {{ mailRecipientCount }} 名</p>

            <p
              v-if="mailRecipientCount === 0"
              class="rounded border border-border bg-surface-light px-4 py-3 text-sm text-muted"
            >
              宛先となる企画所属者がいないため、メールは送信できません。
            </p>

            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">宛先</span>
              <select v-model="mailForm.recipient" name="recipient">
                <option value="all">所属者全員</option>
                <option value="leader">責任者のみ</option>
              </select>
            </label>

            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">件名</span>
              <input v-model="mailForm.subject" name="subject" type="text" />
            </label>

            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">本文</span>
              <textarea v-model="mailForm.body" class="min-h-40" name="body" />
            </label>

            <div
              class="rounded border border-border bg-surface-light px-4 py-4 text-sm leading-7 text-muted"
            >
              <p>本文は Markdown 記法をそのまま記入できます。</p>
              <p class="mt-2">現在はスタッフ用控えを送らず、本体送信のみを先行実装しています。</p>
              <p class="mt-2">
                宛先候補:
                {{
                  (mailFormQuery.data.value?.recipients ?? [])
                    .map((recipient) => recipient.displayName)
                    .join(" / ") || "なし"
                }}
              </p>
            </div>
          </div>
        </SettingsRow>
        <template #footer>
          <button
            class="rounded bg-primary px-8 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!canSendMail"
            type="button"
            @click="handleSendMail"
          >
            {{ sendCircleMailMutation.isPending.value ? "登録中..." : "メールをキューに追加" }}
          </button>
        </template>
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
      <p
        v-if="mailSuccessMessage"
        class="rounded border border-success bg-success-light px-4 py-3 text-sm text-success"
      >
        {{ mailSuccessMessage }}
      </p>
      <p
        v-if="mailErrorMessage"
        class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger"
      >
        {{ mailErrorMessage }}
      </p>
    </div>

    <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">
      企画を取得できませんでした。
    </div>
  </section>
</template>
