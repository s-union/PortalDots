<script setup lang="ts">
import privacyPolicyMarkdown from '../../../resources/md/privacy_policy.md?raw'
import PageLayout from '@/components/layouts/PageLayout.vue'
import PageMarkdownContent from '@/features/pages/components/PageMarkdownContent.vue'
</script>

<template>
  <PageLayout>
    <section class="pb-2 pt-4">
      <div class="rounded-[0.45rem] bg-surface shadow-lv1">
        <div class="px-6 py-[1.2rem] text-base leading-[1.7] text-body max-[1000px]:px-4">
          <h2 class="mb-4 text-[1.333rem] font-semibold leading-[1.4] text-body">プライバシーポリシー</h2>
          <PageMarkdownContent
            :source="privacyPolicyMarkdown"
            class="[&_h1]:mb-4 [&_h1]:text-[1.333rem] [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_li]:mb-1 [&_p]:mb-3"
          />
        </div>
      </div>
    </section>
  </PageLayout>
</template>
