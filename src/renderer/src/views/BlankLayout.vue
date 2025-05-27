<!-- src/layouts/BlankLayout.vue -->
<template>
  <!-- 只有 router-view，没有任何壳子 -->
  <router-view />
</template>
<script setup>
// 纯粹占位，不需要任何逻辑
</script>
<style scoped>
/* 如果需要，让页面撑满整个窗口 */
:host { display: block; height: 100vh; margin: 0; }
</style>
