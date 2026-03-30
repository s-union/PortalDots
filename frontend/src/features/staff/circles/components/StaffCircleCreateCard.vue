<script setup lang="ts">
import DataCard from '@/components/layouts/DataCard.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import { cn } from '@/lib/ui/cn'
import { buttonVariants } from '@/lib/ui/variants'
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
          <label class="grid gap-2 text-sm text-body">
            <span class="font-medium">企画名</span>
            <input
              v-model="form.name"
              class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
              name="name"
              type="text"
            />
          </label>
          <label class="grid gap-2 text-sm text-body">
            <span class="font-medium">企画名(よみ) <span class="text-danger">*</span></span>
            <input
              v-model="form.nameYomi"
              class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
              name="nameYomi"
              required
              type="text"
            />
          </label>
          <label class="grid gap-2 text-sm text-body">
            <span class="font-medium">企画を出店する団体の名称</span>
            <input
              v-model="form.groupName"
              class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
              name="groupName"
              type="text"
            />
          </label>
          <label class="grid gap-2 text-sm text-body">
            <span class="font-medium">企画を出店する団体の名称(よみ) <span class="text-danger">*</span></span>
            <input
              v-model="form.groupNameYomi"
              class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
              name="groupNameYomi"
              required
              type="text"
            />
          </label>
          <label class="grid gap-2 text-sm text-body">
            <span class="font-medium">参加種別</span>
            <select
              v-model="form.participationTypeId"
              class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
              name="participationTypeId"
            >
              <option value="">参加種別を選択してください</option>
              <option
                v-for="participationType in participationTypes"
                :key="participationType.id"
                :value="participationType.id"
              >
                {{ participationType.name }}
              </option>
            </select>
          </label>
          <label class="grid gap-2 text-sm text-body">
            <span class="font-medium">スタッフ用メモ</span>
            <textarea
              v-model="form.notes"
              class="min-h-24 rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
              name="notes"
            />
          </label>
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
          <label v-if="form.status === 'rejected'" class="grid gap-2 text-sm text-body">
            <span class="font-medium">不受理理由</span>
            <textarea
              v-model="form.statusReason"
              class="min-h-16 rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
              name="statusReason"
            />
          </label>
          <div class="grid gap-2 text-sm text-body">
            <span class="font-medium">使用場所</span>
            <select
              v-model="form.placeIds"
              class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
              name="placeIds"
              multiple
            >
              <option v-for="place in places" :key="place.id" :value="place.id">
                {{ place.name }}
              </option>
            </select>
            <p class="text-xs text-muted">Ctrl/Cmd を押しながらクリックで複数選択できます</p>
          </div>

          <AlertMessage v-if="errorMessage" tone="danger">
            {{ errorMessage }}
          </AlertMessage>
        </div>
        <div class="border-t border-border px-6 py-5">
          <button
            :class="cn(buttonVariants({ variant: 'primary', size: 'wide', weight: 'bold' }))"
            :disabled="isPending"
            type="submit"
          >
            {{ isPending ? '作成中...' : '保存' }}
          </button>
        </div>
      </form>
    </DataCard>
  </div>
</template>
