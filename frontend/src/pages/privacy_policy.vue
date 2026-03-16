<script setup lang="ts">
import BackLink from "@/components/ui/BackLink.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import privacyPolicyMarkdown from "../../../resources/md/privacy_policy.md?raw";
</script>

<template>
  <section class="space-y-6">
    <BackLink to="/"> ホームへ戻る </BackLink>

    <SurfaceCard>
      <div class="border-b border-border px-6 py-5">
        <p class="text-sm text-primary">Privacy Policy</p>
        <h2 class="mt-2 text-2xl font-semibold text-body">プライバシーポリシー</h2>
      </div>
      <div class="px-6 py-6">
        <p class="whitespace-pre-wrap text-sm leading-7 text-body">{{ privacyPolicyMarkdown }}</p>
      </div>
    </SurfaceCard>
  </section>
</template>
