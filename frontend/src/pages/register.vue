<script setup lang="ts">
definePage({
  meta: {
    publicOnly: true,
    noDrawer: true,
    noFooter: true,
    noBottomTabs: true
  }
})

import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useRegisterMutation, extractFirstErrorMessage } from '@/features/auth/api'
import { usePublicConfigQuery } from '@/features/public-home/api'

const router = useRouter()
const registerMutation = useRegisterMutation()
const publicConfigQuery = usePublicConfigQuery()
const isSubmitting = computed(() => registerMutation.isPending.value)
const canSubmit = computed(
  () => !isSubmitting.value && (publicConfigQuery.data.value?.portalUnivemailDomainPart?.trim().length ?? 0) > 0
)

const form = reactive({
  studentId: '',
  univemailLocalPart: '',
  name: '',
  nameYomi: '',
  contactEmail: '',
  phoneNumber: '',
  password: '',
  passwordConfirmation: ''
})

const errorMessage = ref('')

async function handleSubmit() {
  errorMessage.value = ''

  try {
    await registerMutation.mutateAsync({
      studentId: form.studentId,
      univemailLocalPart: form.univemailLocalPart,
      univemailDomainPart: publicConfigQuery.data.value?.portalUnivemailDomainPart ?? '',
      name: form.name,
      nameYomi: form.nameYomi,
      contactEmail: form.contactEmail,
      phoneNumber: form.phoneNumber,
      password: form.password,
      passwordConfirmation: form.passwordConfirmation
    })
    await router.replace('/email/verify')
  } catch (error) {
    errorMessage.value = extractFirstErrorMessage(error)
  }
}
</script>

<template>
  <section class="bg-surface px-6 py-10">
    <div class="mx-auto w-full max-w-[760px] space-y-6">
      <header class="space-y-2 text-center">
        <h1 class="text-[2rem] font-semibold text-body">ユーザー登録</h1>
        <p class="text-sm text-muted">登録後はログインした状態でメール認証へ進みます。</p>
      </header>

      <form class="space-y-6 rounded border border-border bg-surface p-6 shadow-lv1" @submit.prevent="handleSubmit">
        <p v-if="errorMessage" class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
          {{ errorMessage }}
        </p>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-2 text-sm text-body">
            <span class="font-semibold">{{ publicConfigQuery.data.value?.portalStudentIdName ?? '学籍番号' }}</span>
            <input v-model="form.studentId" autocomplete="username" name="studentId" required type="text" />
          </label>

          <label class="grid gap-2 text-sm text-body">
            <span class="font-semibold">{{
              publicConfigQuery.data.value?.portalUnivemailName ?? '大学メールアドレス'
            }}</span>
            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <input v-model="form.univemailLocalPart" name="univemailLocalPart" required type="text" />
              <span class="text-sm text-muted">
                @{{ publicConfigQuery.data.value?.portalUnivemailDomainPart ?? 'example.ac.jp' }}
              </span>
            </div>
          </label>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-2 text-sm text-body">
            <span class="font-semibold">名前</span>
            <input v-model="form.name" autocomplete="name" name="name" placeholder="姓 名" required type="text" />
          </label>

          <label class="grid gap-2 text-sm text-body">
            <span class="font-semibold">名前(よみ)</span>
            <input v-model="form.nameYomi" name="nameYomi" placeholder="せい めい" required type="text" />
          </label>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-2 text-sm text-body">
            <span class="font-semibold">連絡先メールアドレス</span>
            <input v-model="form.contactEmail" autocomplete="email" name="contactEmail" required type="email" />
          </label>

          <label class="grid gap-2 text-sm text-body">
            <span class="font-semibold">連絡先電話番号</span>
            <input v-model="form.phoneNumber" autocomplete="tel" name="phoneNumber" required type="tel" />
          </label>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-2 text-sm text-body">
            <span class="font-semibold">パスワード</span>
            <input
              v-model="form.password"
              autocomplete="new-password"
              name="password"
              placeholder="8文字以上"
              required
              type="password"
            />
          </label>

          <label class="grid gap-2 text-sm text-body">
            <span class="font-semibold">パスワード(確認)</span>
            <input
              v-model="form.passwordConfirmation"
              autocomplete="new-password"
              name="passwordConfirmation"
              required
              type="password"
            />
          </label>
        </div>

        <div class="space-y-3">
          <button
            class="w-full rounded border border-primary bg-primary px-4 py-3 text-sm text-white transition hover:bg-primary-hover"
            :disabled="!canSubmit"
            type="submit"
          >
            <strong>{{ isSubmitting ? '登録中...' : 'ユーザー登録' }}</strong>
          </button>

          <RouterLink
            class="block w-full rounded border border-border bg-surface px-4 py-3 text-center text-sm text-body transition hover:bg-surface-light hover:no-underline"
            to="/login"
          >
            ログイン画面へ
          </RouterLink>
        </div>
      </form>
    </div>
  </section>
</template>
