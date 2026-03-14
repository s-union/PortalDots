<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import ListPanel from "@/components/ui/ListPanel.vue";
import {
  useSelectableCirclesQuery,
  useSelectCurrentCircleMutation,
} from "@/features/circles/api";
import { useSessionStore } from "@/features/session/store";

const router = useRouter();
const sessionStore = useSessionStore();
const circlesQuery = useSelectableCirclesQuery();
const selectCircleMutation = useSelectCurrentCircleMutation();

const isSelecting = computed(() => selectCircleMutation.isPending.value);

async function handleSelectCircle(circleId: string) {
  await selectCircleMutation.mutateAsync(circleId);
  await router.push("/workspace");
}
</script>

<template>
  <section class="space-y-6">
    <ListPanel
      title="作業対象の企画を選択します。"
      description="legacy の circle selector と同じく、以後の画面はここで選んだ企画コンテキストで動きます。"
    >
      <div v-if="circlesQuery.isPending.value" class="px-6 py-6 text-sm text-muted">
        読み込み中...
      </div>

      <div v-else class="divide-y divide-border">
        <button
          v-for="circle in circlesQuery.data.value"
          :key="circle.id"
          class="w-full px-6 py-5 text-left transition hover:bg-form-control disabled:opacity-50"
          :class="
            sessionStore.currentCircle?.id === circle.id
              ? 'bg-primary-light'
              : ''
          "
          :disabled="isSelecting"
          type="button"
          @click="handleSelectCircle(circle.id)"
        >
          <p class="text-base font-semibold text-body">{{ circle.name }}</p>
          <p class="mt-2 text-sm text-muted">
            {{ circle.groupName }} / {{ circle.participationTypeName }}
          </p>
        </button>
      </div>
    </ListPanel>
  </section>
</template>
