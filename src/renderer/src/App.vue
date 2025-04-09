<template>
  <v-app>
    <div id="app" class="app-container">
      <!-- 左侧导航栏 -->
      <MainLayout/>
    </div>
  </v-app>
</template>

<script>
import MainLayout from "./components/MainLayout.vue";

export default {
  name: 'App',
  components: {
    MainLayout,
  }
}
</script>

<style scoped>
.app-container {
}

.sidebar {
  width: 220px;
  background-color: #202123; /* 类似ChatGPT的暗色 */
  color: #fff;
  padding: 10px;
}

.main-content {
  flex: 1;
  overflow-y: auto;
}
</style>
