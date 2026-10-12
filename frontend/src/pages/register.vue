<script setup lang="ts">
definePage({
  meta: {
    publicOnly: true,
    noDrawer: true,
    noFooter: true,
    noBottomTabs: true
  }
})

import { computed, ref } from 'vue'
import { handleSubmit, useForm } from '@formisch/vue'
import AuthPageLayout from '@/components/layouts/AuthPageLayout.vue'
import { extractFirstErrorMessage, useStartRegistrationMutation } from '@/features/auth/api'
import { usePublicConfigQuery } from '@/features/public-home/api'
import { SchemaFormFields, type FieldOverrides } from '@/features/forms/schema-form'
import { registrationStartFormSchema } from '@/lib/form-validation'
import ErrorState from '@/components/ui/ErrorState.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'

const registerMutation = useStartRegistrationMutation()
const publicConfigQuery = usePublicConfigQuery()
const appName = computed(() => publicConfigQuery.data.value?.appName ?? 'PortalDots')
const studentIdLabel = computed(() => publicConfigQuery.data.value?.portalStudentIdName ?? '学籍番号')
const univemailLabel = computed(() => publicConfigQuery.data.value?.portalUnivemailName ?? '大学メールアドレス')
const univemailDomainPart = computed(() => publicConfigQuery.data.value?.portalUnivemailDomainPart ?? 'example.ac.jp')

// `univemailLocalPart`'s label/suffix are placeholder text in the schema; override both here with
// the deployment's actual university email name and domain.
const overrides = computed<FieldOverrides<typeof registrationStartFormSchema.entries>>(() => ({
  univemailLocalPart: { label: univemailLabel.value, suffix: `@${univemailDomainPart.value}` }
}))

const form = useForm({
  schema: registrationStartFormSchema,
  initialInput: { univemailLocalPart: '' },
  validate: 'input',
  revalidate: 'input'
})

const successMessage = ref('')
const errorMessage = ref('')
const submit = handleSubmit(form, async (input) => {
  try {
    const result = await registerMutation.mutateAsync({
      univemailLocalPart: input.univemailLocalPart.trim()
    })
    successMessage.value = result.message
  } catch (error) {
    errorMessage.value = extractFirstErrorMessage(error)
  }
})

function handleSubmitEvent(event: SubmitEvent) {
  event.preventDefault()
  if (form.isSubmitting) return
  successMessage.value = ''
  errorMessage.value = ''
  return submit()
}
</script>

<template>
  <AuthPageLayout width="md">
    <SurfaceCard tag="section">
      <SurfaceCardBand>
        <h1 class="text-[1.333rem] font-semibold leading-[1.4] text-body">ユーザー登録</h1>
      </SurfaceCardBand>

      <form novalidate class="space-y-5 px-6 py-6 text-base leading-7 text-body" @submit="handleSubmitEvent">
        <p>{{ appName }} に登録する大学メールアドレスを入力してください。</p>
        <p>認証URLを送信後、名前や連絡先、パスワードの設定へ進みます。</p>

        <p v-if="successMessage" class="rounded border border-success bg-success-light px-4 py-3 text-success">
          {{ successMessage }}
        </p>
        <ErrorState v-if="errorMessage" :message="errorMessage" />

        <SchemaFormFields :of="form" :schema="registrationStartFormSchema" :overrides="overrides">
          <template #after:univemailLocalPart>
            <p class="text-xs text-muted">
              {{ studentIdLabel }} は入力したメールアドレスの @ より前の部分として扱われます。
            </p>
          </template>
        </SchemaFormFields>

        <div class="pt-2 text-center">
          <button
            class="inline-flex rounded border border-primary bg-primary px-8 py-3 text-base font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
            :disabled="form.isSubmitting"
            type="submit"
          >
            {{ form.isSubmitting ? '送信中...' : '認証URLを送信' }}
          </button>
        </div>
      </form>
    </SurfaceCard>
  </AuthPageLayout>
</template>
