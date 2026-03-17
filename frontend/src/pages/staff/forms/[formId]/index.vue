<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    requiresCircle: true,
    staffCapability: "forms.edit",
  },
});

import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import BackLink from "@/components/ui/BackLink.vue";
import QuestionEditorCard from "@/components/ui/QuestionEditorCard.vue";
import SettingsRow from "@/components/ui/SettingsRow.vue";
import SettingsSection from "@/components/ui/SettingsSection.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import SurfaceHeader from "@/components/ui/SurfaceHeader.vue";
import TabStrip from "@/components/ui/TabStrip.vue";
import StaffFormAnswerPreviewSection from "@/features/staff/forms/components/StaffFormAnswerPreviewSection.vue";
import { useStaffStatusQuery } from "@/features/staff/status/api";
import {
  allowedQuestionTypes,
  buildCopyStaffFormConfirmMessage,
  buildDeleteStaffFormConfirmMessage,
  useCopyStaffFormMutation,
  useDeleteStaffFormMutation,
  extractStaffFormValidationMessage,
  formatStaffFormTags,
  parseStaffFormTags,
  useCreateStaffFormQuestionMutation,
  useDeleteStaffFormQuestionMutation,
  useReorderStaffFormQuestionsMutation,
  useStaffFormDetailQuery,
  useUpdateStaffFormQuestionMutation,
  useUpdateStaffFormMutation,
  type StaffFormQuestion,
} from "@/features/staff/forms/api";
import { useSessionStore } from "@/features/session/store";
import { buildStaffFormTabs } from "@/features/ui/tabStrip";

const route = useRoute("/staff/forms/[formId]/");
const router = useRouter();
const sessionStore = useSessionStore();
const formId = computed(() => String(route.params.formId ?? ""));
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated));
const formQuery = useStaffFormDetailQuery(
  formId,
  computed(
    () => staffStatusQuery.data.value?.authorized === true && sessionStore.currentCircle !== null,
  ),
);
const updateFormMutation = useUpdateStaffFormMutation(formId);
const createQuestionMutation = useCreateStaffFormQuestionMutation(formId);
const updateQuestionMutation = useUpdateStaffFormQuestionMutation(formId);
const deleteQuestionMutation = useDeleteStaffFormQuestionMutation(formId);
const reorderQuestionMutation = useReorderStaffFormQuestionsMutation(formId);
const copyFormMutation = useCopyStaffFormMutation();
const deleteFormMutation = useDeleteStaffFormMutation();
const errorMessage = ref("");
const questionErrorMessage = ref("");
const newQuestionType = ref<(typeof allowedQuestionTypes)[number]>("text");
const questionEdits = ref<Record<string, StaffFormQuestion>>({});
const editForm = ref({
  name: "",
  description: "",
  openAt: "",
  closeAt: "",
  maxAnswers: 1,
  answerableTags: [] as string[],
  confirmationMessage: "",
  isPublic: true,
});

const activeTabHref = computed(() => route.hash || "#settings-panel");
const staffFormTabs = computed(() => {
  if (activeTabHref.value === "#answer-panel") {
    return buildStaffFormTabs(formId.value, "answers");
  }
  if (activeTabHref.value === "#editor-panel") {
    return buildStaffFormTabs(formId.value, "editor");
  }
  return buildStaffFormTabs(formId.value, "settings");
});
const editableQuestions = computed(() =>
  (formQuery.data.value?.questions ?? [])
    .map((question) => ({
      question,
      edit: questionEdits.value[question.id],
    }))
    .filter(
      (
        value,
      ): value is {
        question: StaffFormQuestion;
        edit: StaffFormQuestion;
      } => value.edit !== undefined,
    ),
);
const isParticipationForm = computed(() => formQuery.data.value?.isParticipationForm ?? false);

watch(
  () => formQuery.data.value,
  (value) => {
    if (!value) {
      return;
    }

    editForm.value = {
      name: value.name,
      description: value.description,
      openAt: value.openAt,
      closeAt: value.closeAt,
      maxAnswers: value.maxAnswers,
      answerableTags: [...value.answerableTags],
      confirmationMessage: value.confirmationMessage,
      isPublic: value.isPublic,
    };
    questionEdits.value = Object.fromEntries(
      value.questions.map((question) => [
        question.id,
        { ...question, options: [...question.options] },
      ]),
    );
  },
  { immediate: true },
);

async function handleSaveForm() {
  errorMessage.value = "";

  try {
    await updateFormMutation.mutateAsync({
      name: editForm.value.name,
      description: editForm.value.description,
      openAt: editForm.value.openAt,
      closeAt: editForm.value.closeAt,
      maxAnswers: editForm.value.maxAnswers,
      answerableTags: editForm.value.answerableTags,
      confirmationMessage: editForm.value.confirmationMessage,
      isPublic: editForm.value.isPublic,
    });
  } catch (error) {
    errorMessage.value = extractStaffFormValidationMessage(error);
  }
}

async function handleAddQuestion() {
  questionErrorMessage.value = "";

  try {
    await createQuestionMutation.mutateAsync({
      type: newQuestionType.value,
    });
  } catch (error) {
    questionErrorMessage.value = extractStaffFormValidationMessage(error);
  }
}

async function handleSaveQuestion(questionId: string) {
  questionErrorMessage.value = "";

  try {
    const question = questionEdits.value[questionId];
    if (!question) {
      return;
    }
    await updateQuestionMutation.mutateAsync({
      id: question.id,
      name: question.name,
      description: question.description,
      type: question.type,
      isRequired: question.isRequired,
      numberMin: question.numberMin,
      numberMax: question.numberMax,
      allowedTypes: question.allowedTypes,
      options: question.options,
      priority: question.priority,
    });
  } catch (error) {
    questionErrorMessage.value = extractStaffFormValidationMessage(error);
  }
}

async function handleDeleteQuestion(questionId: string) {
  questionErrorMessage.value = "";

  try {
    await deleteQuestionMutation.mutateAsync(questionId);
  } catch (error) {
    questionErrorMessage.value = extractStaffFormValidationMessage(error);
  }
}

async function handleMoveQuestion(questionId: string, direction: -1 | 1) {
  if (!formQuery.data.value) {
    return;
  }

  const orderedIds = formQuery.data.value.questions.map((question) => question.id);
  const currentIndex = orderedIds.indexOf(questionId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedIds.length) {
    return;
  }

  const [currentId] = orderedIds.splice(currentIndex, 1);
  orderedIds.splice(nextIndex, 0, currentId);

  try {
    await reorderQuestionMutation.mutateAsync(orderedIds);
  } catch (error) {
    questionErrorMessage.value = extractStaffFormValidationMessage(error);
  }
}

function updateQuestionOptions(questionId: string, rawValue: string) {
  const question = questionEdits.value[questionId];
  if (!question) {
    return;
  }
  question.options = rawValue
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function optionsText(question: StaffFormQuestion) {
  return question.options.join("\n");
}

function updateQuestionNumber(questionId: string, field: "numberMin" | "numberMax", event: Event) {
  const target = event.target;
  const question = questionEdits.value[questionId];
  if (!(target instanceof HTMLInputElement) || !question) {
    return;
  }

  question[field] = target.value === "" ? null : Number(target.value);
}

function handleQuestionOptionsInput(questionId: string, event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLTextAreaElement)) {
    return;
  }

  updateQuestionOptions(questionId, target.value);
}

function handleAnswerableTagsInput(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLTextAreaElement)) {
    return;
  }

  editForm.value.answerableTags = parseStaffFormTags(target.value);
}

function handleMaxAnswersInput(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  editForm.value.maxAnswers = target.value === "" ? 1 : Math.max(1, Number(target.value));
}

async function handleCopyForm() {
  errorMessage.value = "";
  const currentFormName = formQuery.data.value?.name ?? "このフォーム";
  if (
    typeof window !== "undefined" &&
    !window.confirm(buildCopyStaffFormConfirmMessage(currentFormName))
  ) {
    return;
  }

  try {
    const copied = await copyFormMutation.mutateAsync(formId.value);
    await router.push(`/staff/forms/${encodeURIComponent(copied.id)}`);
  } catch (error) {
    errorMessage.value = extractStaffFormValidationMessage(error);
  }
}

async function handleDeleteForm() {
  errorMessage.value = "";
  const currentFormName = formQuery.data.value?.name ?? "このフォーム";
  if (
    typeof window !== "undefined" &&
    !window.confirm(buildDeleteStaffFormConfirmMessage(currentFormName))
  ) {
    return;
  }

  try {
    await deleteFormMutation.mutateAsync(formId.value);
    await router.push("/staff/forms");
  } catch (error) {
    errorMessage.value = extractStaffFormValidationMessage(error);
  }
}
</script>

<template>
  <section class="space-y-6">
    <BackLink to="/staff/forms"> フォーム管理へ戻る </BackLink>

    <div
      v-if="formQuery.isPending.value"
      class="rounded border border-border bg-surface p-6 text-muted shadow-lv1"
    >
      読み込み中...
    </div>

    <article v-else-if="formQuery.data.value" class="space-y-6">
      <TabStrip :tabs="staffFormTabs" />

      <SurfaceCard id="settings-panel" tag="header">
        <p class="text-sm text-primary">Form Detail</p>
        <h2 class="mt-3 text-3xl font-semibold text-body">設定</h2>
        <div class="mt-3 text-sm text-muted">フォームID : {{ formQuery.data.value.id }}</div>
        <p v-if="isParticipationForm" class="mt-3 text-sm text-muted">
          このフォームは参加登録フォームです。基本設定は参加種別画面で管理し、ここでは設問編集のみ行えます。
        </p>
      </SurfaceCard>

      <SettingsSection title="フォーム設定">
        <SurfaceHeader>
          <template #title>{{ formQuery.data.value.name }}</template>
          <template #description>
            受付期間 : {{ formQuery.data.value.openAt }} 〜 {{ formQuery.data.value.closeAt }}
          </template>
          <template #actions>
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div class="flex gap-2 text-xs">
                <span
                  class="rounded-full px-3 py-1"
                  :class="
                    formQuery.data.value.isPublic
                      ? 'bg-success-light text-success'
                      : 'bg-danger-light text-danger'
                  "
                >
                  {{ formQuery.data.value.isPublic ? "public" : "private" }}
                </span>
                <span
                  class="rounded-full px-3 py-1"
                  :class="
                    formQuery.data.value.isOpen
                      ? 'bg-primary-light text-primary'
                      : 'bg-muted-light text-muted'
                  "
                >
                  {{ formQuery.data.value.isOpen ? "open" : "closed" }}
                </span>
              </div>
              <div class="flex flex-wrap gap-2">
                <RouterLink
                  :to="`/staff/forms/${formId}/preview`"
                  class="rounded border border-border px-3 py-2 text-xs text-body transition hover:bg-surface-light"
                >
                  プレビュー
                </RouterLink>
                <button
                  v-if="!isParticipationForm"
                  class="rounded border border-border px-3 py-2 text-xs text-body transition hover:bg-surface-light"
                  type="button"
                  @click="handleCopyForm"
                >
                  複製
                </button>
                <button
                  v-if="!isParticipationForm"
                  class="rounded border border-danger px-3 py-2 text-xs text-danger transition hover:bg-danger-light"
                  type="button"
                  @click="handleDeleteForm"
                >
                  削除
                </button>
              </div>
            </div>
          </template>
        </SurfaceHeader>

        <SettingsRow>
          <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:items-start md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">フォーム名</p>
              <p class="text-xs text-muted-2">
                一覧と回答画面で表示する名称です。旧画面と同じく必須項目です。
              </p>
            </div>
            <label class="grid gap-2 text-sm text-body">
              <span class="sr-only">フォーム名</span>
              <input
                v-model="editForm.name"
                :disabled="isParticipationForm"
                class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                name="name"
                type="text"
              />
            </label>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:items-start md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">フォームの説明</p>
              <p class="text-xs text-muted-2">フォームの説明を入力します。</p>
            </div>
            <label class="grid gap-2 text-sm text-body">
              <span class="sr-only">説明</span>
              <textarea
                v-model="editForm.description"
                :disabled="isParticipationForm"
                class="min-h-32 rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                name="description"
              />
            </label>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">受付期間</p>
              <p class="text-xs text-muted-2">
                受付開始日時と受付終了日時を RFC3339 形式で入力します。
              </p>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <label class="grid gap-2 text-sm text-body">
                <span>開始日時</span>
                <input
                  v-model="editForm.openAt"
                  :disabled="isParticipationForm"
                  class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                  name="openAt"
                  type="text"
                />
              </label>

              <label class="grid gap-2 text-sm text-body">
                <span>締切日時</span>
                <input
                  v-model="editForm.closeAt"
                  :disabled="isParticipationForm"
                  class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                  name="closeAt"
                  type="text"
                />
              </label>
            </div>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">公開設定</p>
              <p class="text-xs text-muted-2">
                受付期間外では、公開中でもユーザーは回答や編集を行えません。
              </p>
            </div>
            <div class="flex flex-wrap gap-4">
              <label class="flex items-center gap-3 text-sm text-body">
                <input
                  v-model="editForm.isPublic"
                  :disabled="isParticipationForm"
                  name="isPublic"
                  type="checkbox"
                />
                公開する
              </label>
            </div>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">回答条件</p>
              <p class="text-xs text-muted-2">回答数上限と回答可能タグを設定します。</p>
            </div>
            <div class="grid gap-4">
              <label class="grid gap-2 text-sm text-body">
                <span>最大回答数</span>
                <input
                  :value="editForm.maxAnswers"
                  :disabled="isParticipationForm"
                  class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                  min="1"
                  name="maxAnswers"
                  type="number"
                  @input="handleMaxAnswersInput"
                />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span>回答可能タグ</span>
                <textarea
                  :disabled="isParticipationForm"
                  class="min-h-24 rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                  name="answerableTags"
                  :value="formatStaffFormTags(editForm.answerableTags)"
                  @input="handleAnswerableTagsInput"
                />
              </label>
            </div>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">回答完了メッセージ</p>
              <p class="text-xs text-muted-2">
                提出後に表示する補足文言です。未設定なら既定メッセージを使います。
              </p>
            </div>
            <label class="grid gap-2 text-sm text-body">
              <span class="sr-only">回答完了メッセージ</span>
              <textarea
                v-model="editForm.confirmationMessage"
                :disabled="isParticipationForm"
                class="min-h-24 rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                name="confirmationMessage"
              />
            </label>
          </div>
        </SettingsRow>

        <template #footer>
          <div class="space-y-4">
            <p
              v-if="isParticipationForm"
              class="rounded border border-border bg-surface-light px-4 py-3 text-sm text-muted"
            >
              参加登録フォームの公開設定・受付期間・人数条件は参加種別画面から変更してください。
            </p>
            <p
              v-if="errorMessage"
              class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger"
            >
              {{ errorMessage }}
            </p>
            <div class="flex justify-end">
              <button
                class="rounded bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="isParticipationForm || updateFormMutation.isPending.value"
                type="button"
                @click="handleSaveForm"
              >
                {{
                  isParticipationForm
                    ? "参加種別画面で編集"
                    : updateFormMutation.isPending.value
                      ? "保存中..."
                      : "変更を保存"
                }}
              </button>
            </div>
          </div>
        </template>
      </SettingsSection>

      <section
        id="editor-panel"
        class="rounded border border-border bg-surface shadow-lv1 scroll-mt-24"
      >
        <div class="border-b border-border px-6 py-4">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 class="text-lg font-medium text-body">設問エディタ</h3>
              <p class="mt-2 text-sm text-muted-2">
                設問の追加、編集、削除、並び替えをここで行います。
              </p>
            </div>
            <div class="flex flex-wrap gap-3">
              <select
                v-model="newQuestionType"
                class="rounded border border-border bg-form-control px-4 py-3 text-sm text-body outline-none transition focus:border-primary focus:focus-ring-primary"
              >
                <option
                  v-for="questionType in allowedQuestionTypes"
                  :key="questionType"
                  :value="questionType"
                >
                  {{ questionType }}
                </option>
              </select>
              <button
                class="rounded bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary-hover"
                type="button"
                @click="handleAddQuestion"
              >
                設問を追加
              </button>
            </div>
          </div>
        </div>

        <p
          v-if="questionErrorMessage"
          class="mx-6 mt-4 rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger"
        >
          {{ questionErrorMessage }}
        </p>

        <div
          v-if="formQuery.data.value.questions.length === 0"
          class="mx-6 my-5 rounded border border-border bg-surface-light p-4 text-sm text-muted-2"
        >
          設問はまだありません。
        </div>

        <div v-else class="grid gap-4 px-6 py-5">
          <QuestionEditorCard
            v-for="{ question, edit } in editableQuestions"
            :key="question.id"
            :meta="`#${question.priority} / ${question.type}`"
            :title="edit.name || '(無題の設問)'"
          >
            <template #actions>
              <button
                class="rounded border border-border px-3 py-2 text-xs text-body transition hover:bg-surface-light"
                type="button"
                @click="handleMoveQuestion(question.id, -1)"
              >
                上へ
              </button>
              <button
                class="rounded border border-border px-3 py-2 text-xs text-body transition hover:bg-surface-light"
                type="button"
                @click="handleMoveQuestion(question.id, 1)"
              >
                下へ
              </button>
              <button
                class="rounded border border-primary px-3 py-2 text-xs text-primary transition hover:bg-primary-light"
                type="button"
                @click="handleSaveQuestion(question.id)"
              >
                保存
              </button>
              <button
                class="rounded border border-danger px-3 py-2 text-xs text-danger transition hover:bg-danger-light"
                type="button"
                @click="handleDeleteQuestion(question.id)"
              >
                削除
              </button>
            </template>
            <div class="grid gap-4 md:grid-cols-2">
              <label class="grid gap-2 text-sm text-body">
                <span>設問名</span>
                <input
                  v-model="edit.name"
                  class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                  type="text"
                />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span>設問タイプ</span>
                <select
                  v-model="edit.type"
                  class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                >
                  <option
                    v-for="questionType in allowedQuestionTypes"
                    :key="questionType"
                    :value="questionType"
                  >
                    {{ questionType }}
                  </option>
                </select>
              </label>
            </div>

            <label class="grid gap-2 text-sm text-body">
              <span>説明</span>
              <textarea
                v-model="edit.description"
                class="min-h-24 rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
              />
            </label>

            <div class="grid gap-4 md:grid-cols-2">
              <label class="grid gap-2 text-sm text-body">
                <span>数値最小値</span>
                <input
                  :value="edit.numberMin ?? ''"
                  class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                  type="number"
                  @input="updateQuestionNumber(question.id, 'numberMin', $event)"
                />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span>数値最大値</span>
                <input
                  :value="edit.numberMax ?? ''"
                  class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                  type="number"
                  @input="updateQuestionNumber(question.id, 'numberMax', $event)"
                />
              </label>
            </div>

            <label class="grid gap-2 text-sm text-body">
              <span>upload 許可拡張子</span>
              <input
                v-model="edit.allowedTypes"
                class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                type="text"
              />
            </label>

            <label class="grid gap-2 text-sm text-body">
              <span>選択肢</span>
              <textarea
                :value="optionsText(edit)"
                class="min-h-24 rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                @input="handleQuestionOptionsInput(question.id, $event)"
              />
            </label>

            <label class="flex items-center gap-3 text-sm text-body">
              <input v-model="edit.isRequired" type="checkbox" />
              必須にする
            </label>
          </QuestionEditorCard>
        </div>
      </section>

      <StaffFormAnswerPreviewSection
        id="answer-panel"
        :form="formQuery.data.value"
        :form-id="formId"
        :is-participation-form="isParticipationForm"
      />
    </article>

    <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">
      フォームを取得できませんでした。
    </div>
  </section>
</template>
