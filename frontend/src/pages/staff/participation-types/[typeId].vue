<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'circles.participationTypes'
  }
})

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import BackLink from '@/components/ui/BackLink.vue'
import PaginationFooter from '@/components/ui/PaginationFooter.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import { useAuthorizedStaffContext } from '@/features/staff/hooks/useAuthorizedStaffContext'
import { cn } from '@/lib/ui/cn'
import { buttonVariants } from '@/lib/ui/variants'
import {
  buildStaffParticipationTypeCirclesExportUrl,
  buildDeleteStaffParticipationTypeConfirmMessage,
  extractStaffParticipationTypeValidationMessage,
  formatDateTimeLocalValue,
  formatParticipationTypeTags,
  parseDateTimeLocalValue,
  parseParticipationTypeTags,
  useDeleteStaffParticipationTypeMutation,
  useStaffParticipationTypeCirclesQuery,
  useStaffParticipationTypeDetailQuery,
  useUpdateStaffParticipationTypeMutation
} from '@/features/staff/participation-types/api'
import { buildStaffParticipationTypeTabs } from '@/features/ui/tabStrip'

const route = useRoute('/staff/participation-types/[typeId]')
const router = useRouter()
const typeId = computed(() => String(route.params.typeId ?? ''))
const { enabled } = useAuthorizedStaffContext({ capability: 'circles.participationTypes' })
const detailQuery = useStaffParticipationTypeDetailQuery(typeId, enabled)
const circlesPage = ref(1)
const circlesPageSize = 10
const circlesQuery = useStaffParticipationTypeCirclesQuery(typeId, enabled, circlesPage, circlesPageSize)
const updateMutation = useUpdateStaffParticipationTypeMutation(typeId)
const deleteMutation = useDeleteStaffParticipationTypeMutation(typeId)
const form = ref({
  name: '',
  description: '',
  usersCountMin: 1,
  usersCountMax: 1,
  tags: [] as string[],
  formDescription: '',
  formConfirmationMessage: '',
  openAt: '',
  closeAt: '',
  isPublic: true
})
const errorMessage = ref('')
const successMessage = ref('')

const settingsRoute = computed(() => `/staff/participation-types/${encodeURIComponent(typeId.value)}`)
const circlesExportUrl = computed(() => buildStaffParticipationTypeCirclesExportUrl(typeId.value))

const formEditorRoute = computed(() => {
  const current = detailQuery.data.value
  if (!current) {
    return settingsRoute.value
  }
  return `/staff/forms/${encodeURIComponent(current.form.id)}`
})
const participationTypeTabs = computed(() =>
  buildStaffParticipationTypeTabs(typeId.value, route.hash, detailQuery.data.value?.form)
)

watch(
  () => detailQuery.data.value,
  (value) => {
    if (!value) {
      return
    }
    form.value = {
      name: value.name,
      description: value.description,
      usersCountMin: value.usersCountMin,
      usersCountMax: value.usersCountMax,
      tags: [...value.tags],
      formDescription: value.form.description,
      formConfirmationMessage: value.form.confirmationMessage,
      openAt: formatDateTimeLocalValue(value.form.openAt),
      closeAt: formatDateTimeLocalValue(value.form.closeAt),
      isPublic: value.form.isPublic
    }
  },
  { immediate: true }
)

function handleTagsInput(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLTextAreaElement)) {
    return
  }
  form.value.tags = parseParticipationTypeTags(target.value)
}

async function handleSave() {
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await updateMutation.mutateAsync({
      ...form.value,
      openAt: parseDateTimeLocalValue(form.value.openAt),
      closeAt: parseDateTimeLocalValue(form.value.closeAt)
    })
    successMessage.value = '参加種別を更新しました。'
  } catch (error) {
    errorMessage.value = extractStaffParticipationTypeValidationMessage(error)
  }
}

async function handleDelete() {
  if (typeof window !== 'undefined' && !window.confirm(buildDeleteStaffParticipationTypeConfirmMessage())) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''
  try {
    await deleteMutation.mutateAsync()
    await router.push('/staff/participation-types')
  } catch (error) {
    errorMessage.value = extractStaffParticipationTypeValidationMessage(error)
  }
}

function moveCirclesPage(nextPage: number) {
  circlesPage.value = nextPage
}
</script>

<template>
  <section class="space-y-6">
    <BackLink to="/staff/participation-types"> 参加種別管理へ戻る </BackLink>

    <TabStrip v-if="detailQuery.data.value" :tabs="participationTypeTabs" />

    <div v-if="detailQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <form v-else-if="detailQuery.data.value" class="space-y-6" @submit.prevent="handleSave">
      <SurfaceCard tag="header">
        <p class="text-sm text-primary">Participation Type Detail</p>
        <h2 class="mt-3 text-3xl font-semibold text-body">{{ detailQuery.data.value.name }}</h2>
        <div class="mt-3 text-sm text-muted">参加種別ID : {{ detailQuery.data.value.id }}</div>
        <div class="mt-4 flex flex-wrap gap-3">
          <RouterLink
            :to="formEditorRoute"
            class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
          >
            参加登録フォームを編集
          </RouterLink>
          <button
            class="rounded border border-danger px-4 py-2 text-sm text-danger transition hover:bg-danger-light disabled:opacity-60"
            :disabled="deleteMutation.isPending.value"
            type="button"
            @click="handleDelete"
          >
            {{ deleteMutation.isPending.value ? '削除中...' : '参加種別を削除' }}
          </button>
        </div>
      </SurfaceCard>

      <SettingsSection id="participation-type-section" title="参加種別設定">
        <SurfaceHeader>
          <template #title>{{ detailQuery.data.value.name }}</template>
          <template #description>
            一般ユーザー向けの表示名と、この参加種別で作成される企画に付与する条件を管理します。
          </template>
        </SurfaceHeader>

        <SettingsRow>
          <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:items-start md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">参加種別名</p>
              <p class="text-xs text-muted-2">
                一般ユーザーに表示する名称です。模擬店や展示など、参加区分を分かりやすく入力します。
              </p>
            </div>
            <label class="grid gap-2 text-sm text-body">
              <span class="sr-only">参加種別名</span>
              <input v-model="form.name" name="name" type="text" />
            </label>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:items-start md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">説明</p>
              <p class="text-xs text-muted-2">参加登録画面の案内として一般ユーザーに表示します。</p>
            </div>
            <label class="grid gap-2 text-sm text-body">
              <span class="sr-only">説明</span>
              <textarea v-model="form.description" class="min-h-24" name="description" />
            </label>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">必要人数</p>
              <p class="text-xs text-muted-2">
                企画責任者を含む参加登録可能人数の下限と上限です。個人参加のみなら 1 を指定します。
              </p>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <label class="grid gap-2 text-sm text-body">
                <span>最低人数</span>
                <input v-model.number="form.usersCountMin" min="1" name="usersCountMin" type="number" />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span>最大人数</span>
                <input v-model.number="form.usersCountMax" min="1" name="usersCountMax" type="number" />
              </label>
            </div>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">付与タグ</p>
              <p class="text-xs text-muted-2">
                この設定を保存した後に作成される企画へ、自動で追加するタグを改行またはカンマ区切りで入力します。
              </p>
            </div>
            <div class="grid gap-3">
              <label class="grid gap-2 text-sm text-body">
                <span class="sr-only">付与タグ</span>
                <textarea
                  :value="formatParticipationTypeTags(form.tags)"
                  class="min-h-24"
                  name="tags"
                  @input="handleTagsInput"
                />
              </label>
              <p class="text-xs text-muted-2">
                タグ編集権限がなくても、この画面では既存タグを含めた構成をまとめて管理できます。
              </p>
            </div>
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection id="form-settings-section" title="参加登録フォーム設定">
        <SurfaceHeader>
          <template #title>企画参加登録のカスタムフォーム</template>
          <template #description>
            旧 Laravel 画面の form settings に合わせて、公開設定と表示文面をここで管理します。
          </template>
          <template #actions>
            <div class="flex flex-wrap gap-2">
              <RouterLink
                :to="settingsRoute"
                class="rounded border border-border px-3 py-2 text-xs text-body transition hover:bg-surface-light"
              >
                基本設定
              </RouterLink>
              <RouterLink
                :to="formEditorRoute"
                class="rounded border border-primary px-3 py-2 text-xs text-primary transition hover:bg-primary-light"
              >
                フォームエディターを開く
              </RouterLink>
            </div>
          </template>
        </SurfaceHeader>

        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">公開設定</p>
              <p class="text-xs text-muted-2">この設定がオンで、かつ受付期間内のときに参加登録画面を表示します。</p>
            </div>
            <div class="grid gap-4">
              <div class="rounded border border-border bg-surface-light px-4 py-4 text-sm text-muted">
                詳細な設問追加や並び替えは専用エディターで行います。ここでは公開状態と文面を先に整えます。
              </div>
              <label class="flex items-center gap-3 text-sm text-body">
                <input v-model="form.isPublic" name="isPublic" type="checkbox" />
                参加登録画面を公開する
              </label>
            </div>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">受付期間</p>
              <p class="text-xs text-muted-2">Laravel 版と同様に、参加登録画面の表示期間を日時で管理します。</p>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <label class="grid gap-2 text-sm text-body">
                <span>受付開始日時</span>
                <input v-model="form.openAt" name="openAt" type="datetime-local" />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span>受付終了日時</span>
                <input v-model="form.closeAt" name="closeAt" type="datetime-local" />
              </label>
            </div>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">参加登録前に表示する内容</p>
              <p class="text-xs text-muted-2">
                規約や注意事項などを Markdown で入力できます。参加登録ページ冒頭に表示します。
              </p>
            </div>
            <div class="grid gap-2">
              <label class="grid gap-2 text-sm text-body">
                <span class="sr-only">参加登録前に表示する内容</span>
                <textarea v-model="form.formDescription" class="min-h-32" name="formDescription" />
              </label>
              <p class="text-xs text-muted-2">Markdown 記法をそのまま利用できます。</p>
            </div>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">提出後メッセージ</p>
              <p class="text-xs text-muted-2">提出完了後の画面と、自動送信メールに表示するメッセージです。</p>
            </div>
            <div class="grid gap-2">
              <label class="grid gap-2 text-sm text-body">
                <span class="sr-only">提出後メッセージ</span>
                <textarea v-model="form.formConfirmationMessage" class="min-h-32" name="formConfirmationMessage" />
              </label>
              <p class="text-xs text-muted-2">こちらも Markdown 記法を利用できます。</p>
            </div>
          </div>
        </SettingsRow>

        <template #footer>
          <div class="space-y-4">
            <div class="rounded border border-border bg-surface-light px-4 py-4 text-sm text-muted">
              <p>企画参加登録機能について</p>
              <ul class="mt-2 list-disc space-y-2 pl-5">
                <li>企画名や団体名に加えて独自の入力欄を追加できます。</li>
                <li>提出データはスタッフ向け回答一覧や CSV 出力で確認できます。</li>
                <li>副責任者数の要件を参加種別ごとに切り替えられます。</li>
                <li>提出された参加登録はスタッフ確認フローの起点になります。</li>
              </ul>
            </div>
            <AlertMessage v-if="successMessage" tone="success">
              {{ successMessage }}
            </AlertMessage>
            <AlertMessage v-if="errorMessage" tone="danger">
              {{ errorMessage }}
            </AlertMessage>
            <div class="flex justify-end">
              <button
                :class="cn(buttonVariants({ variant: 'primary', size: 'wide', weight: 'bold' }))"
                :disabled="updateMutation.isPending.value"
                type="submit"
              >
                {{ updateMutation.isPending.value ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </template>
      </SettingsSection>

      <SettingsSection id="circles-section" title="この参加種別に紐づく企画">
        <SurfaceHeader>
          <template #title>企画一覧</template>
          <template #description> legacy の参加種別詳細画面にあった所属企画一覧をここで確認できます。 </template>
          <template #actions>
            <a
              :href="circlesExportUrl"
              class="rounded border border-border px-3 py-2 text-xs text-body transition hover:bg-surface-light"
            >
              CSV をダウンロード
            </a>
          </template>
        </SurfaceHeader>

        <div v-if="circlesQuery.isPending.value" class="px-6 py-5 text-sm text-muted">読み込み中...</div>
        <div v-else-if="(circlesQuery.data.value?.items.length ?? 0) === 0" class="px-6 py-5 text-sm text-muted">
          この参加種別に紐づく企画はありません。
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-border text-sm">
            <thead class="bg-surface-light text-left text-muted-2">
              <tr>
                <th class="px-5 py-3 font-medium">企画ID</th>
                <th class="px-5 py-3 font-medium">企画名</th>
                <th class="px-5 py-3 font-medium">企画グループ名</th>
                <th class="px-5 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="circle in circlesQuery.data.value?.items" :key="circle.id">
                <td class="px-5 py-4 text-muted">{{ circle.id }}</td>
                <td class="px-5 py-4 text-body">{{ circle.name }}</td>
                <td class="px-5 py-4 text-muted">{{ circle.groupName }}</td>
                <td class="px-5 py-4 text-right">
                  <RouterLink :to="`/staff/circles/${encodeURIComponent(circle.id)}`" class="text-primary underline">
                    企画を開く
                  </RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <template v-if="circlesQuery.data.value && circlesQuery.data.value.total > 0" #footer>
          <PaginationFooter
            :page="circlesPage"
            :page-size="circlesQuery.data.value.pageSize"
            :total="circlesQuery.data.value.total"
            :bordered="false"
            @update:page="moveCirclesPage"
          />
        </template>
      </SettingsSection>
    </form>

    <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">
      参加種別を取得できませんでした。
    </div>
  </section>
</template>
