<script setup lang="ts">
import { computed } from 'vue'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

const props = defineProps<{
  source: string
}>()

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'section', 'sup', 'sub', 'input'],
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), 'id', 'data-footnote-ref', 'data-footnote-backref', 'aria-describedby'],
    div: [...(defaultSchema.attributes?.div ?? []), ['className', 'contains-task-list']],
    li: [...(defaultSchema.attributes?.li ?? []), ['className', 'task-list-item']],
    ol: [...(defaultSchema.attributes?.ol ?? []), ['className', 'contains-task-list']],
    section: [...(defaultSchema.attributes?.section ?? []), 'data-footnotes', ['className', 'footnotes']],
    input: [['type', 'checkbox'], 'checked', 'disabled'],
    sup: [...(defaultSchema.attributes?.sup ?? []), 'id'],
    th: [...(defaultSchema.attributes?.th ?? []), 'align'],
    td: [...(defaultSchema.attributes?.td ?? []), 'align']
  }
} as const

const renderedHtml = computed(() => {
  if (props.source.trim() === '') {
    return ''
  }

  return String(
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeSanitize, sanitizeSchema as never)
      .use(rehypeStringify)
      .processSync(props.source)
  )
})
</script>

<template>
  <div class="page-markdown text-sm leading-8 text-body" v-html="renderedHtml" />
</template>

<style scoped>
.page-markdown:deep(*) {
  word-break: break-word;
}

.page-markdown:deep(p),
.page-markdown:deep(ul),
.page-markdown:deep(ol),
.page-markdown:deep(blockquote),
.page-markdown:deep(pre),
.page-markdown:deep(table) {
  margin-top: 0;
  margin-bottom: 1rem;
}

.page-markdown:deep(h1),
.page-markdown:deep(h2),
.page-markdown:deep(h3),
.page-markdown:deep(h4) {
  margin-top: 1.75rem;
  margin-bottom: 0.75rem;
  font-weight: 700;
  line-height: 1.5;
}

.page-markdown:deep(h1) {
  font-size: 1.5rem;
}

.page-markdown:deep(h2) {
  font-size: 1.25rem;
}

.page-markdown:deep(h3) {
  font-size: 1.125rem;
}

.page-markdown:deep(ul),
.page-markdown:deep(ol) {
  padding-left: 1.5rem;
}

.page-markdown:deep(li + li) {
  margin-top: 0.35rem;
}

.page-markdown:deep(input[type='checkbox']) {
  margin-right: 0.5rem;
}

.page-markdown:deep(blockquote) {
  border-left: 3px solid var(--color-border);
  padding-left: 1rem;
  color: var(--color-muted);
}

.page-markdown:deep(code) {
  border-radius: 0.375rem;
  background: var(--color-form-control);
  padding: 0.125rem 0.375rem;
  font-size: 0.875em;
}

.page-markdown:deep(pre) {
  overflow-x: auto;
  border-radius: 0.75rem;
  background: var(--color-form-control);
  padding: 1rem;
}

.page-markdown:deep(pre code) {
  background: transparent;
  padding: 0;
}

.page-markdown:deep(table) {
  width: 100%;
  border-collapse: collapse;
}

.page-markdown:deep(th),
.page-markdown:deep(td) {
  border: 1px solid var(--color-border);
  padding: 0.625rem 0.75rem;
  text-align: left;
  vertical-align: top;
}

.page-markdown:deep(th) {
  background: var(--color-form-control);
}

.page-markdown:deep(hr) {
  margin: 1.5rem 0;
  border: none;
  border-top: 1px solid var(--color-border);
}

.page-markdown:deep(.footnotes) {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}
</style>
