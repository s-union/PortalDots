<script setup lang="ts">
import { computed } from 'vue'
import IconActionButton from '@/components/ui/IconActionButton.vue'
import FaIcon from '@/components/ui/FaIcon.vue'
import { buttonVariants } from '@/lib/ui/variants'
import FormField from '@/components/ui/FormField.vue'
import {
  staffFilterOperatorSchema,
  type StaffFilterField,
  type StaffFilterFieldType,
  type StaffFilterMode,
  type StaffFilterOperator,
  type StaffFilterQuery
} from '@/lib/staffFilterSchema'

export type { StaffFilterField, StaffFilterFieldType, StaffFilterMode, StaffFilterOperator, StaffFilterQuery }

const {
  fields,
  queries,
  mode = 'and',
  loading = false
} = defineProps<{
  fields: StaffFilterField[]
  queries: StaffFilterQuery[]
  mode?: StaffFilterMode
  loading?: boolean
}>()

const emit = defineEmits<{
  add: [keyName: string]
  remove: [queryId: number]
  updateQuery: [queryId: number, patch: Partial<Omit<StaffFilterQuery, 'id'>>]
  updateMode: [mode: StaffFilterMode]
  apply: []
  clear: []
}>()

const fieldMap = computed(() => {
  const map = new Map<string, StaffFilterField>()
  for (const field of fields) {
    map.set(field.key, field)
  }
  return map
})

const availableFields = computed(() => {
  const used = new Set(queries.map((query) => query.keyName))
  return fields.filter((field) => !used.has(field.key))
})

function resolveLabel(keyName: string) {
  return fieldMap.value.get(keyName)?.label ?? keyName
}

function resolveType(keyName: string): StaffFilterFieldType {
  return fieldMap.value.get(keyName)?.type ?? 'string'
}

function operatorOptions(keyName: string): StaffFilterOperator[] {
  const type = resolveType(keyName)
  if (type === 'bool') {
    return ['=', '!=']
  }
  return ['like', 'not like', '=', '!=']
}

function normalizedBoolValue(value: string) {
  if (value === '1' || value.toLowerCase() === 'true') {
    return 'true'
  }
  return 'false'
}

function onAddField(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) {
    return
  }

  const keyName = target.value
  if (keyName === '') {
    return
  }
  emit('add', keyName)
  target.value = ''
}

function handleOperatorChange(event: Event, query: StaffFilterQuery) {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) {
    return
  }

  const operator = staffFilterOperatorSchema.safeParse(target.value)
  if (!operator.success) {
    return
  }

  emit('updateQuery', query.id, {
    operator: operator.data
  })
}

function handleBoolValueChange(event: Event, query: StaffFilterQuery) {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) {
    return
  }

  emit('updateQuery', query.id, {
    value: target.value
  })
}

function handleTextValueChange(event: Event, query: StaffFilterQuery) {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }

  emit('updateQuery', query.id, {
    value: target.value
  })
}
</script>

<template>
  <div class="space-y-6 p-6">
    <section class="space-y-3">
      <h2 class="text-base font-semibold text-body">絞り込み条件</h2>

      <div
        v-if="queries.length === 0"
        class="rounded border border-dashed border-border bg-surface-light p-4 text-sm text-muted"
      >
        条件が未設定です。「条件を追加」で絞り込み項目を選択してください。
      </div>

      <div v-else class="space-y-3">
        <div v-for="query in queries" :key="query.id" class="rounded border border-border bg-surface p-4">
          <div class="mb-2 flex items-center justify-between gap-2">
            <div class="text-sm font-medium text-body">{{ resolveLabel(query.keyName) }}</div>
            <IconActionButton
              type="button"
              title="条件を削除"
              variant="subtleDanger"
              :disabled="loading"
              @click="emit('remove', query.id)"
            >
              <FaIcon name="times" />
            </IconActionButton>
          </div>

          <div class="grid gap-2 min-[860px]:grid-cols-[10rem_1fr]">
            <select
              class="rounded border border-border bg-surface px-3 py-2 text-sm text-body"
              :value="query.operator"
              :disabled="loading"
              :aria-label="resolveLabel(query.keyName) + 'の条件'"
              @change="(event) => handleOperatorChange(event, query)"
            >
              <option v-for="operator in operatorOptions(query.keyName)" :key="operator" :value="operator">
                {{ operator }}
              </option>
            </select>

            <template v-if="resolveType(query.keyName) === 'bool'">
              <select
                class="rounded border border-border bg-surface px-3 py-2 text-sm text-body"
                :value="normalizedBoolValue(query.value)"
                :disabled="loading"
                :aria-label="resolveLabel(query.keyName) + 'の値'"
                @change="(event) => handleBoolValueChange(event, query)"
              >
                <option value="true">はい</option>
                <option value="false">いいえ</option>
              </select>
            </template>
            <template v-else>
              <input
                class="rounded border border-border bg-surface px-3 py-2 text-sm text-body"
                type="text"
                :value="query.value"
                :disabled="loading"
                :aria-label="resolveLabel(query.keyName) + 'の値'"
                @input="(event) => handleTextValueChange(event, query)"
              />
            </template>
          </div>
        </div>
      </div>
    </section>

    <section class="space-y-3">
      <FormField label="条件を追加" label-class="font-medium">
        <select
          class="rounded border border-border bg-surface px-3 py-2 text-sm text-body"
          :disabled="loading"
          @change="onAddField"
        >
          <option value="">項目を選択してください</option>
          <option v-for="field in availableFields" :key="field.key" :value="field.key">
            {{ field.label }}
          </option>
        </select>
      </FormField>
    </section>

    <section class="space-y-3">
      <div class="text-sm font-medium text-body">条件の結合</div>
      <div class="flex items-center gap-4 text-sm text-body">
        <label class="inline-flex items-center gap-2">
          <input
            type="radio"
            name="filter-mode"
            value="and"
            :checked="mode === 'and'"
            :disabled="loading"
            @change="emit('updateMode', 'and')"
          />
          すべてに一致 (AND)
        </label>
        <label class="inline-flex items-center gap-2">
          <input
            type="radio"
            name="filter-mode"
            value="or"
            :checked="mode === 'or'"
            :disabled="loading"
            @change="emit('updateMode', 'or')"
          />
          いずれかに一致 (OR)
        </label>
      </div>
    </section>

    <section class="flex items-center gap-3">
      <button
        :class="buttonVariants({ variant: 'primary', size: 'md', weight: 'semibold' })"
        type="button"
        :disabled="loading"
        @click="emit('apply')"
      >
        適用
      </button>
      <button
        :class="buttonVariants({ variant: 'secondary', size: 'md' })"
        type="button"
        :disabled="loading || queries.length === 0"
        @click="emit('clear')"
      >
        絞り込みを解除
      </button>
    </section>
  </div>
</template>
