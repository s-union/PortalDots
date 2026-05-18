<script setup lang="ts">
import DataCard from '@/components/layouts/DataCard.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import FormInput from '@/components/ui/FormInput.vue'
import FormTextarea from '@/components/ui/FormTextarea.vue'
import FormSelect from '@/components/ui/FormSelect.vue'
import MarkdownEditorField from '@/components/ui/MarkdownEditorField.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import FormField from '@/components/ui/FormField.vue'
import type { MutateStaffCirclePayload } from '@/features/staff/circles/api'

export interface StaffCircleCreateCardProps {
  participationTypes: { id: string; name: string }[]
  places: { id: string; name: string }[]
  errorMessage: string
  isPending: boolean
}

const { participationTypes, places, errorMessage, isPending } = defineProps<StaffCircleCreateCardProps>()
const emit = defineEmits<{
  submit: []
}>()

const form = defineModel<MutateStaffCirclePayload>('form', { required: true })

function handleSubmit() {
  emit('submit')
}
</script>

<template>
  <div id="create-circle-card">
    <DataCard title="企画を新規作成">
      <form @submit.prevent="handleSubmit">
        <div class="grid gap-4 px-6 py-5">
          <FormField label="企画名" label-class="font-medium">
            <FormInput v-model="form.name" name="name" type="text" />
          </FormField>
          <FormField label="企画名(よみ)" label-class="font-medium">
            <FormInput v-model="form.nameYomi" name="nameYomi" required type="text" />
          </FormField>
          <FormField label="企画を出店する団体の名称" label-class="font-medium">
            <FormInput v-model="form.groupName" name="groupName" type="text" />
          </FormField>
          <FormField label="企画を出店する団体の名称(よみ)" label-class="font-medium">
            <FormInput v-model="form.groupNameYomi" name="groupNameYomi" required type="text" />
          </FormField>
          <FormField label="参加種別" label-class="font-medium">
            <FormSelect v-model="form.participationTypeId" name="participationTypeId">
              <option value="">参加種別を選択してください</option>
              <option
                v-for="participationType in participationTypes"
                :key="participationType.id"
                :value="participationType.id"
              >
                {{ participationType.name }}
              </option>
            </FormSelect>
          </FormField>
          <FormField label="スタッフ用メモ" label-class="font-medium">
            <FormTextarea v-model="form.notes" name="notes" class="min-h-24" />
          </FormField>
          <div class="grid gap-2 text-sm text-body">
            <span class="font-medium">登録受理状況</span>
            <div class="flex gap-4">
              <label class="flex items-center gap-2">
                <input v-model="form.status" type="radio" name="status" value="pending" />
                審査中
              </label>
              <label class="flex items-center gap-2">
                <input v-model="form.status" type="radio" name="status" value="approved" />
                受理
              </label>
              <label class="flex items-center gap-2">
                <input v-model="form.status" type="radio" name="status" value="rejected" />
                不受理
              </label>
            </div>
          </div>
          <FormField v-if="form.status === 'rejected'" label="不受理理由" label-class="font-medium">
            <MarkdownEditorField v-model="form.statusReason" min-height-class="min-h-16" name="statusReason" />
          </FormField>
          <FormField label="使用場所" label-class="font-medium">
            <select
              v-model="form.placeIds"
              class="min-h-24 rounded border bg-form-control px-4 py-3 text-sm text-body outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/30"
              name="placeIds"
              multiple
            >
              <option v-for="place in places" :key="place.id" :value="place.id">
                {{ place.name }}
              </option>
            </select>
          </FormField>
        </div>

        <AlertMessage v-if="errorMessage" class="mx-6 mb-5">{{ errorMessage }}</AlertMessage>

        <div class="flex justify-end gap-3 px-6 py-4">
          <BaseButton variant="primary" size="wide" weight="bold" type="submit" :disabled="isPending">
            {{ isPending ? '作成中...' : '作成' }}
          </BaseButton>
        </div>
      </form>
    </DataCard>
  </div>
</template>
