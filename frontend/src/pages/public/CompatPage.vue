<script setup lang="ts">
import ListItemLink from "@/components/ui/ListItemLink.vue";
import ListPanel from "@/components/ui/ListPanel.vue";
</script>

<template>
  <section class="space-y-6">
    <ListPanel title="互換性メモ" description="Behavioral parity is tracked outside the UI layer.">
      <div class="divide-y divide-border">
        <ListItemLink>
          <template #title>Guaranteed</template>
          <template #meta>
            Authorization, state transitions, artifacts, and search semantics.
          </template>
        </ListItemLink>
        <ListItemLink>
          <template #title>Ignored</template>
          <template #meta>
            Legacy URLs, Blade DOM structure, and wording-only differences.
          </template>
        </ListItemLink>
        <ListItemLink>
          <template #title>Deferred</template>
          <template #meta> Dual-runtime CI orchestration and golden artifact fixtures. </template>
        </ListItemLink>
      </div>
    </ListPanel>
  </section>
</template>
