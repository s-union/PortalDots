<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
  },
});

import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import BackLink from "@/components/ui/BackLink.vue";
import SettingsRow from "@/components/ui/SettingsRow.vue";
import SettingsSection from "@/components/ui/SettingsSection.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import { useCreateCircleMutation } from "@/features/circles/api";
import { useParticipationTypesQuery } from "@/features/participation-types/api";

const route = useRoute();
const router = useRouter();
const createMutation = useCreateCircleMutation();
const participationTypesQuery = useParticipationTypesQuery(true);

const form = ref({
  name: "",
  nameYomi: "",
  groupName: "",
  groupNameYomi: "",
  participationTypeId: "",
  notes: "",
});

const errorMessage = ref("");
const requestedParticipationTypeId = computed(() => {
  const legacyValue = route.query.participation_type;
  if (typeof legacyValue === "string") {
    return legacyValue;
  }

  const migratedValue = route.query.participationTypeId;
  return typeof migratedValue === "string" ? migratedValue : "";
});

watch(
  [requestedParticipationTypeId, () => participationTypesQuery.data.value],
  ([requestedId, participationTypes]) => {
    if (form.value.participationTypeId !== "") {
      return;
    }

    if (!requestedId) {
      return;
    }

    if (
      !(participationTypes ?? []).some((participationType) => participationType.id === requestedId)
    ) {
      return;
    }

    form.value.participationTypeId = requestedId;
  },
  { immediate: true },
);

async function handleSubmit() {
  errorMessage.value = "";

  try {
    await createMutation.mutateAsync(form.value);
    await router.push("/workspace/circles/detail");
  } catch {
    errorMessage.value = "企画の作成に失敗しました。入力内容をご確認ください。";
  }
}
</script>

<template>
  <section class="space-y-6">
    <BackLink to="/workspace"> ワークスペースへ戻る </BackLink>

    <SurfaceCard tag="header">
      <p class="text-sm text-primary">Create Circle</p>
      <h2 class="mt-3 text-3xl font-semibold text-body">企画を新規作成</h2>
      <p class="mt-3 text-sm leading-7 text-muted">
        新しい企画を作成します。あなたが企画のリーダーになります。
      </p>
      <p v-if="requestedParticipationTypeId" class="mt-2 text-sm text-muted">
        legacy 導線から受け取った参加種別をもとに、該当する項目があればあらかじめ選択しています。
      </p>
    </SurfaceCard>

    <SettingsSection title="企画情報">
      <SettingsRow>
        <div class="grid gap-4">
          <label class="grid gap-2 text-sm text-body">
            <span class="font-semibold">企画名 <span class="text-danger">*</span></span>
            <input v-model="form.name" type="text" placeholder="例: ○○サークル" />
          </label>
          <label class="grid gap-2 text-sm text-body">
            <span class="font-semibold">企画名（よみ）</span>
            <input v-model="form.nameYomi" type="text" placeholder="ひらがなで入力" />
          </label>
          <label class="grid gap-2 text-sm text-body">
            <span class="font-semibold">団体名 <span class="text-danger">*</span></span>
            <input v-model="form.groupName" type="text" placeholder="例: ○○大学○○学部" />
          </label>
          <label class="grid gap-2 text-sm text-body">
            <span class="font-semibold">団体名（よみ）</span>
            <input v-model="form.groupNameYomi" type="text" placeholder="ひらがなで入力" />
          </label>
        </div>
      </SettingsRow>

      <SettingsRow>
        <div class="grid gap-2 text-sm text-body">
          <span class="font-semibold">参加種別 <span class="text-danger">*</span></span>
          <div v-if="participationTypesQuery.isPending.value" class="text-muted">読み込み中...</div>
          <div v-else class="grid gap-2">
            <label
              v-for="pt in participationTypesQuery.data.value"
              :key="pt.id"
              class="flex items-start gap-3 rounded border border-border p-4 cursor-pointer hover:bg-form-control"
            >
              <input
                v-model="form.participationTypeId"
                type="radio"
                :value="pt.id"
                class="mt-0.5"
              />
              <div>
                <p class="font-semibold text-body">{{ pt.name }}</p>
                <p class="mt-1 text-xs text-muted">{{ pt.description }}</p>
                <p class="mt-1 text-xs text-muted">
                  メンバー数: {{ pt.usersCountMin }}〜{{ pt.usersCountMax }}人
                </p>
              </div>
            </label>
          </div>
        </div>
      </SettingsRow>

      <SettingsRow>
        <label class="grid gap-2 text-sm text-body">
          <span class="font-semibold">備考</span>
          <textarea v-model="form.notes" rows="3" placeholder="任意のメモ" />
        </label>
      </SettingsRow>

      <template #footer>
        <div class="space-y-4">
          <p
            v-if="errorMessage"
            class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger"
          >
            {{ errorMessage }}
          </p>
          <div class="flex justify-end">
            <button
              class="rounded bg-primary px-6 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="createMutation.isPending.value"
              type="button"
              @click="handleSubmit"
            >
              {{ createMutation.isPending.value ? "作成中..." : "企画を作成する" }}
            </button>
          </div>
        </div>
      </template>
    </SettingsSection>
  </section>
</template>
