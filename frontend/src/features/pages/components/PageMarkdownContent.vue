<script setup lang="ts">
import { computed } from 'vue'
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

const { source, headingScale = 'embedded' } = defineProps<{
  source: string
  headingScale?: 'embedded' | 'page'
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
} satisfies SanitizeSchema

const renderedHtml = computed(() => {
  if (source.trim() === '') {
    return ''
  }

  const html = String(
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeSanitize, sanitizeSchema)
      .use(rehypeStringify)
      .processSync(source)
  )

  // Task list checkbox に aria-label を追加
  return html.replace(/<input type="checkbox"([^>]*)>/g, '<input type="checkbox" aria-label="タスク"$1>')
})
</script>

<template>
  <div class="page-markdown text-base text-body" :data-heading-scale="headingScale" v-html="renderedHtml" />
</template>

<style scoped>
/* Colors and block structure mirror packages/email/src/templates/markdown-notice.tsx.
   Heading sizes intentionally use context-specific app scales to preserve the
   hierarchy of the surrounding page or embedded card. */
.page-markdown {
  line-height: 1.7;
}

.page-markdown:deep(*) {
  word-break: break-word;
}

.page-markdown:deep(p),
.page-markdown:deep(ul),
.page-markdown:deep(ol),
.page-markdown:deep(pre),
.page-markdown:deep(table) {
  margin-top: 0;
  margin-bottom: 1rem;
}

.page-markdown:deep(h1),
.page-markdown:deep(h2),
.page-markdown:deep(h3),
.page-markdown:deep(h4),
.page-markdown:deep(h5),
.page-markdown:deep(h6) {
  margin-top: 0;
  font-weight: 700;
  color: var(--color-body);
}

/* Embedded content stays below surrounding card and form headings. */
.page-markdown:deep(h1) {
  font-size: 1.25rem;
  line-height: 1.4;
  margin-bottom: 1rem;
}

.page-markdown:deep(h2) {
  font-size: 1.125rem;
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.page-markdown:deep(h3),
.page-markdown:deep(h4),
.page-markdown:deep(h5),
.page-markdown:deep(h6) {
  font-size: 1rem;
  line-height: 1.6;
}

.page-markdown:deep(h3) {
  margin-bottom: 0.75rem;
}

.page-markdown:deep(h4),
.page-markdown:deep(h5),
.page-markdown:deep(h6) {
  margin-bottom: 0.5rem;
}

/* Standalone notice pages retain the larger, descending heading scale. */
.page-markdown[data-heading-scale='page']:deep(h1) {
  font-size: 1.75rem;
  line-height: 1.3;
}

.page-markdown[data-heading-scale='page']:deep(h2) {
  font-size: 1.5rem;
  line-height: 1.35;
}

.page-markdown[data-heading-scale='page']:deep(h3) {
  font-size: 1.25rem;
  line-height: 1.4;
}

.page-markdown[data-heading-scale='page']:deep(h4) {
  font-size: 1.125rem;
  line-height: 1.5;
}

.page-markdown:deep(ul),
.page-markdown:deep(ol) {
  padding-left: 1.5rem;
}

.page-markdown:deep(ul) {
  list-style: disc;
}

.page-markdown:deep(ol) {
  list-style: decimal;
}

.page-markdown:deep(ul ul) {
  list-style: circle;
}

.page-markdown:deep(ol ol) {
  list-style: lower-alpha;
}

.page-markdown:deep(li) {
  margin-bottom: 0.25rem;
}

.page-markdown:deep(input[type='checkbox']) {
  margin-right: 0.5rem;
}

.page-markdown:deep(a) {
  color: var(--color-primary);
  text-decoration: underline;
}

.page-markdown:deep(blockquote) {
  margin: 1rem;
  padding: 1rem 0.5rem 0;
  border-left: 4px dotted var(--color-border);
  color: var(--color-body);
}

.page-markdown:deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  border-radius: 0.25rem;
  background: var(--color-form-control);
  padding: 0.125rem 0.25rem;
}

.page-markdown:deep(pre) {
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  border-radius: 0.375rem;
  background: var(--color-form-control);
  padding: 0.75rem;
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
  padding: 0.5rem;
  vertical-align: top;
}

.page-markdown:deep(th) {
  background: var(--color-form-control);
  text-align: left;
}

.page-markdown:deep(img) {
  display: block;
  max-width: 100%;
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
