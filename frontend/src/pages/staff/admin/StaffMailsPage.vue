<script setup lang="ts">
import { computed, ref } from "vue";
import { useStaffStatusQuery } from "@/features/staff/status/api";
import {
  extractStaffMailValidationMessage,
  normalizeRecipientList,
  useCreateStaffMailMutation,
  useStaffMailForm,
  useStaffMailsQuery,
} from "@/features/staff/admin/mails";
import { useSessionStore } from "@/features/session/store";

const sessionStore = useSessionStore();
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated));
const mailsQuery = useStaffMailsQuery(
  computed(
    () =>
      staffStatusQuery.data.value?.authorized === true &&
      sessionStore.currentCircle !== null,
  ),
);
const createMailMutation = useCreateStaffMailMutation();
const form = useStaffMailForm();
const errorMessage = ref("");

async function handleCreateMail() {
  errorMessage.value = "";

  try {
    await createMailMutation.mutateAsync({
      subject: form.value.subject,
      body: form.value.body,
      recipients: normalizeRecipientList(form.value.recipientsText),
    });
    form.value = {
      subject: "",
      body: "",
      recipientsText: "",
    };
  } catch (error) {
    errorMessage.value = extractStaffMailValidationMessage(error);
  }
}
</script>

<template>
  <section class="space-y-6">
    <header class="flex items-end justify-between gap-4">
      <div>
        <p class="text-sm text-primary">Staff Mail Queue</p>
        <h2 class="mt-3 text-3xl font-semibold text-body">メールキュー</h2>
        <p class="mt-3 text-sm leading-7 text-muted">
          {{ sessionStore.currentCircle?.name ?? "企画未選択" }} 向けのメールを queue に積みます。
        </p>
      </div>
      <RouterLink
        class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
        to="/staff"
      >
        Staff top へ戻る
      </RouterLink>
    </header>

    <section class="space-y-6">
      <section class="rounded border border-border bg-surface shadow-lv1">
        <div class="border-b border-border px-6 py-4">
          <h3 class="text-lg font-semibold text-body">
            メールの一斉送信機能を利用するにはサーバー側の設定が必要です
          </h3>
        </div>
        <div class="px-6 py-5 text-sm leading-7 text-muted">
          <p>
            現在は queue 登録までを移植しています。worker
            と送信基盤を後続で差し替える前提で、ここでは staff mail queue
            の操作だけを再現しています。
          </p>
          <p class="mt-3">
            {{ sessionStore.currentCircle?.name ?? "企画未選択" }} 向けのメールを queue に積みます。
          </p>
        </div>
      </section>

      <form
        class="rounded border border-border bg-surface shadow-lv1"
        @submit.prevent="handleCreateMail"
      >
        <div class="border-b border-border px-6 py-4">
          <h3 class="text-lg font-semibold text-body">メール配信設定</h3>
        </div>
        <div class="grid gap-4 px-6 py-5">
          <label class="grid gap-2 text-sm text-body">
            <span class="font-medium">件名</span>
            <input
              v-model="form.subject"
              class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
              name="subject"
              type="text"
            />
          </label>

          <label class="grid gap-2 text-sm text-body">
            <span class="font-medium">本文</span>
            <textarea
              v-model="form.body"
              class="min-h-40 rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
              name="body"
            />
          </label>

          <label class="grid gap-2 text-sm text-body">
            <span class="font-medium">宛先</span>
            <textarea
              v-model="form.recipientsText"
              class="min-h-28 rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
              name="recipients"
              placeholder="demo@example.com, sub@example.com"
            />
          </label>

          <p
            v-if="errorMessage"
            class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger"
          >
            {{ errorMessage }}
          </p>
        </div>
        <div class="border-t border-border px-6 py-5">
          <button
            class="rounded bg-primary px-8 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="createMailMutation.isPending.value"
            type="submit"
          >
            {{ createMailMutation.isPending.value ? "登録中..." : "メールを queue に追加" }}
          </button>
        </div>
      </form>

      <section class="rounded border border-border bg-surface shadow-lv1">
        <div class="border-b border-border px-6 py-4">
          <h3 class="text-lg font-semibold text-body">メールキュー</h3>
        </div>

        <div v-if="mailsQuery.isPending.value" class="px-6 py-5 text-sm text-muted">
          読み込み中...
        </div>

        <div
          v-else-if="(mailsQuery.data.value?.length ?? 0) === 0"
          class="px-6 py-5 text-sm text-muted"
        >
          メールキューはまだありません。
        </div>

        <div v-else class="divide-y divide-border">
          <article v-for="mail in mailsQuery.data.value" :key="mail.id" class="px-6 py-5">
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-lg font-medium text-body">{{ mail.subject }}</h3>
              <span
                class="rounded-full px-3 py-1 text-xs"
                :class="
                  mail.status === 'sent'
                    ? 'bg-success-light text-success'
                    : 'bg-primary-light text-primary'
                "
              >
                {{ mail.status === "sent" ? "送信済み" : "待機中" }}
              </span>
            </div>
            <p class="mt-3 whitespace-pre-wrap text-sm leading-7 text-body">{{ mail.body }}</p>
            <p class="mt-4 text-sm text-muted-2">recipients: {{ mail.recipients.join(", ") }}</p>
            <p class="mt-2 text-xs text-muted-2">
              created: {{ mail.createdAt }}
              <template v-if="mail.deliveredAt"> / delivered: {{ mail.deliveredAt }}</template>
            </p>
          </article>
        </div>
      </section>
    </section>
  </section>
</template>
