<script setup lang="ts">
import { nextTick, ref, useTemplateRef } from 'vue'
import PageMarkdownContent from '@/features/pages/components/PageMarkdownContent.vue'
import { cn } from '@/lib/ui/cn'
import { buttonVariants, formControlVariants } from '@/lib/ui/variants'

const model = defineModel<string>({ required: true })

const {
  disabled = false,
  guideHref = '/staff/markdown-guide',
  minHeightClass = 'min-h-32',
  name,
  placeholder = ''
} = defineProps<{
  disabled?: boolean
  guideHref?: string
  minHeightClass?: string
  name: string
  placeholder?: string
}>()

const previewVisible = ref(false)
const textareaRef = useTemplateRef<HTMLTextAreaElement>('textarea')

function focusTextarea() {
  textareaRef.value?.focus()
}

async function updateSelection(start: number, end: number) {
  await nextTick()
  textareaRef.value?.focus()
  textareaRef.value?.setSelectionRange(start, end)
}

function selectedRange() {
  const textarea = textareaRef.value
  if (!textarea) {
    return { start: model.value.length, end: model.value.length, selectedText: '' }
  }

  const start = textarea.selectionStart ?? 0
  const end = textarea.selectionEnd ?? start
  return {
    start,
    end,
    selectedText: model.value.slice(start, end)
  }
}

function replaceSelection(replacement: string, selectionStart: number, selectionEnd: number) {
  const { start, end } = selectedRange()
  model.value = `${model.value.slice(0, start)}${replacement}${model.value.slice(end)}`
  void updateSelection(selectionStart, selectionEnd)
}

function wrapSelection(prefix: string, suffix: string, fallback: string) {
  const { start, end, selectedText } = selectedRange()
  const content = selectedText || fallback
  const replacement = `${prefix}${content}${suffix}`
  const cursorStart = start + prefix.length
  const cursorEnd = cursorStart + content.length
  replaceSelection(replacement, cursorStart, cursorEnd)
}

function prefixLines(prefix: string) {
  const { start, end, selectedText } = selectedRange()
  const content = selectedText || '項目'
  const replacement = content
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n')
  replaceSelection(replacement, start, start + replacement.length)
}

function insertTable() {
  const { start } = selectedRange()
  const replacement = '| 列1 | 列2 |\n| --- | --- |\n| 内容1 | 内容2 |'
  model.value = `${model.value.slice(0, start)}${replacement}${model.value.slice(start)}`
  void updateSelection(start, start + replacement.length)
}

function togglePreview() {
  previewVisible.value = !previewVisible.value
}

interface ToolbarAction {
  key: string
  label: string
  action: () => void
}

const toolbarActions: ToolbarAction[] = [
  { key: 'title', label: '見出し', action: () => prefixLines('# ') },
  { key: 'bold', label: '太字', action: () => wrapSelection('**', '**', '太字') },
  { key: 'italic', label: '斜体', action: () => wrapSelection('*', '*', '強調') },
  { key: 'strike', label: '取消', action: () => wrapSelection('~~', '~~', '取り消し') },
  { key: 'quote', label: '引用', action: () => prefixLines('> ') },
  { key: 'ul', label: '箇条書き', action: () => prefixLines('- ') },
  { key: 'ol', label: '番号', action: () => prefixLines('1. ') },
  { key: 'link', label: 'リンク', action: () => wrapSelection('[', '](https://example.com)', 'リンク文字列') },
  { key: 'table', label: '表', action: insertTable }
]
</script>

<template>
  <div class="rounded border border-border bg-surface-light">
    <div class="flex flex-wrap items-center gap-2 border-b border-border px-3 py-3">
      <button
        v-for="action in toolbarActions"
        :key="action.key"
        :class="buttonVariants({ variant: 'secondary', size: 'sm', weight: 'semibold' })"
        :disabled="disabled"
        type="button"
        @click="(action.action(), focusTextarea())"
      >
        {{ action.label }}
      </button>
      <button
        :class="buttonVariants({ variant: previewVisible ? 'primary' : 'secondary', size: 'sm', weight: 'semibold' })"
        type="button"
        @click="togglePreview"
      >
        {{ previewVisible ? 'プレビューを閉じる' : 'プレビュー' }}
      </button>
      <a
        class="ml-auto text-xs text-primary underline-offset-2 hover:underline"
        :href="guideHref"
        rel="noopener noreferrer"
        target="_blank"
      >
        Markdown ガイド
      </a>
    </div>

    <div class="grid gap-4 px-3 py-3">
      <textarea
        ref="textarea"
        v-model="model"
        :aria-label="name"
        :class="cn(formControlVariants(), minHeightClass)"
        :disabled="disabled"
        :name="name"
        :placeholder="placeholder"
      />

      <div v-if="previewVisible" class="rounded border border-border bg-surface px-4 py-4">
        <p class="mb-3 text-xs font-semibold text-muted">プレビュー</p>
        <PageMarkdownContent :source="model" />
      </div>
    </div>
  </div>
</template>
