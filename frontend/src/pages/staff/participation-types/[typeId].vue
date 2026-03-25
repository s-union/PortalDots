<script setup lang="ts">
definePage({
  path: '/staff/participation-types/:typeId',
  redirect: (to) => to.path.replace('/staff/participation-types/', '/staff/circles/participation_types/')
})
</script>
