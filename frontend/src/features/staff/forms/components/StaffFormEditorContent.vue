<script setup lang="ts">
import PageLayout from '@/components/layouts/PageLayout.vue'
import LoadingState from '@/components/ui/LoadingState.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import { buttonVariants } from '@/lib/ui/variants'
import FormEditorSidebar from '@/components/staff/forms/editor/FormEditorSidebar.vue'
import FormQuestionPreviewItem from '@/components/staff/forms/editor/FormQuestionPreviewItem.vue'
import { useStaffFormEditorPage } from '@/features/staff/forms/composables/useStaffFormEditorPage'

const { formId } = defineProps<{
  formId: string
}>()

const emit = defineEmits<{
  navigateToSettings: []
}>()

const {
  addQuestion,
  clearDragState,
  deleteQuestion,
  dragOverQuestion,
  draggingQuestionId,
  dropQuestion,
  dropTargetQuestionId,
  editableQuestions,
  formQuery,
  isParticipationForm,
  isPublic,
  isSaving,
  moveQuestion,
  navigateToSettings,
  openQuestionId,
  previewUrl,
  saveQuestion,
  setPrivate,
  setPublic,
  staffFormTabs,
  startQuestionDrag,
  statusMessage,
  statusToneClass,
  toggleQuestion,
  updateFormMutation,
  updateQuestionEdit
} = useStaffFormEditorPage(() => formId, {
  navigateToSettings: () => emit('navigateToSettings')
})
</script>

<template>
  <PageLayout fullWidth class="space-y-0 pb-6 max-[1000px]:px-0">
    <LoadingState v-if="formQuery.isPending.value" class="mx-6 mt-6 max-[1000px]:mx-4" />

    <template v-else-if="formQuery.data.value">
      <TabStrip :tabs="staffFormTabs" />

      <div
        class="fixed bottom-0 left-0 right-0 z-[9975] border-t border-danger bg-danger-light px-6 py-3 text-center text-sm text-danger shadow-lv1 min-[1001px]:hidden"
      >
        フォームエディターは、パソコンのみ対応しています。
      </div>

      <div class="overflow-hidden border-y border-border bg-surface shadow-lv1">
        <div class="grid min-h-[calc(100vh-14rem)] lg:grid-cols-[minmax(0,1fr)_300px]">
          <section class="min-w-0 bg-surface-light">
            <header
              class="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-surface-2 px-6 max-[1000px]:px-4"
            >
              <div class="w-40 shrink-0 text-sm font-medium text-body">フォームエディター</div>
              <div class="min-h-5 flex-1 text-center text-sm" :class="statusToneClass">
                {{ statusMessage }}
              </div>
              <div v-if="!isParticipationForm" class="flex shrink-0 items-center gap-3 max-[1000px]:gap-2">
                <a :href="previewUrl" target="_blank" class="text-sm text-primary hover:underline">プレビュー</a>
                <span
                  class="rounded px-2 py-0.5 text-xs font-bold text-white"
                  :class="isPublic ? 'bg-primary' : 'bg-danger'"
                >
                  {{ isPublic ? '公開' : '非公開' }}
                </span>
                <button
                  :class="buttonVariants({ variant: isPublic ? 'danger' : 'primary', size: 'md', weight: 'semibold' })"
                  :disabled="updateFormMutation.isPending.value"
                  type="button"
                  @click="isPublic ? setPrivate() : setPublic()"
                >
                  {{ isPublic ? '非公開にする' : '公開する' }}
                </button>
              </div>
            </header>

            <div class="px-6 py-12 max-[1000px]:px-4 max-[1000px]:py-8">
              <div class="mx-auto w-full max-w-[960px] bg-surface shadow-lv1">
                <div
                  class="cursor-pointer border-b border-border px-6 py-6 transition-colors hover:bg-surface-light"
                  title="「設定」タブでフォームのタイトルと説明を編集できます"
                  @click="navigateToSettings"
                >
                  <h1 class="text-2xl font-bold text-body">
                    {{ formQuery.data.value.name || '(無題のフォーム)' }}
                  </h1>
                  <p
                    v-if="formQuery.data.value.description"
                    class="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted"
                  >
                    {{ formQuery.data.value.description }}
                  </p>
                  <p class="mt-3 text-xs text-muted-2">※ タイトルと説明を変更するには「設定」タブへ</p>
                </div>

                <EmptyState
                  v-if="editableQuestions.length === 0"
                  icon="pen"
                  title="右側の[設問を追加]から設問を追加しましょう"
                  description="このフォームには設問が1つもありません。"
                  class="rounded-none border-0 shadow-none"
                />

                <div v-else>
                  <FormQuestionPreviewItem
                    v-for="{ question, edit } in editableQuestions"
                    :key="question.id"
                    :question="question"
                    :edit="edit"
                    :is-open="openQuestionId === question.id"
                    :draggable="!isSaving"
                    :is-dragging="draggingQuestionId === question.id"
                    :is-drop-target="dropTargetQuestionId === question.id"
                    @toggle="toggleQuestion(question.id)"
                    @save="saveQuestion(question.id)"
                    @delete="deleteQuestion(question.id)"
                    @drag-start="startQuestionDrag(question.id)"
                    @drag-end="clearDragState()"
                    @drag-over="dragOverQuestion(question.id)"
                    @drop="dropQuestion(question.id)"
                    @update:edit="(value) => updateQuestionEdit(question.id, value)"
                  >
                    <template #move-actions>
                      <button
                        :class="buttonVariants({ variant: 'secondary', size: 'xs' })"
                        type="button"
                        @click="moveQuestion(question.id, -1)"
                      >
                        ↑ 上へ
                      </button>
                      <button
                        :class="buttonVariants({ variant: 'secondary', size: 'xs' })"
                        type="button"
                        @click="moveQuestion(question.id, 1)"
                      >
                        ↓ 下へ
                      </button>
                    </template>
                  </FormQuestionPreviewItem>
                </div>
              </div>
            </div>
          </section>

          <div class="border-t border-border lg:border-l lg:border-t-0">
            <div class="lg:sticky lg:top-16 lg:h-[calc(100vh-9rem)]">
              <FormEditorSidebar class="h-full" @add-question="addQuestion" />
            </div>
          </div>
        </div>
      </div>
    </template>

    <ErrorState v-else message="フォームを取得できませんでした。" class="mx-6 mt-6 max-[1000px]:mx-4" />
  </PageLayout>
</template>
