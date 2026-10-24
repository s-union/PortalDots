<script setup lang="ts">
definePage({
  path: '/workspace/contact',
  meta: {
    requiresAuth: true
  }
})

import PageLayout from '@/components/layouts/PageLayout.vue'
import ContactForm from '@/features/contact/components/ContactForm.vue'
</script>

<template>
  <PageLayout spacious>
    <ContactForm />
  </PageLayout>
</template>
