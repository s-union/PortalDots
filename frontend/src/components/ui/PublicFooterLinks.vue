<script setup lang="ts">
withDefaults(
  defineProps<{
    appName?: string;
  }>(),
  {
    appName: undefined,
  },
);
</script>

<template>
  <div class="space-y-2 text-xs text-muted">
    <p>
      <template v-if="appName">{{ appName }} • </template>
      Powered by
      <a
        class="font-semibold text-muted transition hover:text-body hover:underline"
        href="https://www.portaldots.com"
        rel="noopener noreferrer"
        target="_blank"
      >
        PortalDots
      </a>
    </p>
    <div class="flex flex-wrap gap-x-2 gap-y-1">
      <RouterLink
        class="font-semibold text-muted transition hover:text-body hover:underline"
        to="/support"
      >
        推奨動作環境
      </RouterLink>
      <span aria-hidden="true">•</span>
      <RouterLink
        class="font-semibold text-muted transition hover:text-body hover:underline"
        to="/privacy_policy"
      >
        プライバシーポリシー
      </RouterLink>
    </div>
  </div>
</template>
