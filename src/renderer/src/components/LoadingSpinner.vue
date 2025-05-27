<template>
  <div class="loading-spinner">
    <v-progress-circular
      indeterminate
      color="primary"
      size="50"
    />
  </div>
</template>

<script setup>
// 这个组件只做一个居中的加载指示器
</script>

<style scoped>
.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
</style>
