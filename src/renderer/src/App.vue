<template>
  <div id="app" class="app-container">
    <MainLayout></MainLayout>
  </div>
</template>

<script>
import MainLayout from './components/MainLayout.vue'

export default {
  name: 'App',
  components: {
    MainLayout,
  },
  mounted() {
    this.initializeApp();
  },
  methods: {
    async initializeApp() {
      try {
        // 调用 checkAppHealth 检测 app 进程健康状态
        const health = await window.electron.checkAppHealth();
        console.log('[App.vue] app-health', health);
        // 如果状态不是“已启动”，则调用 sysConfig 和 startApp
        if (health.state !== '已启动' && health.state !== '正在清理端口并重启核心服务') {
          // 获取系统配置，通常包含 config.yaml 的路径
          const sysCfg = await window.electron.sysConfig();
          console.log('[App.vue] sysConfig', sysCfg);
          // 需要传入的配置文件路径
          const configPath = sysCfg.configPath;
          if (configPath) {
            // 调用 startApp 启动 app 进程
            const result = await window.electron.startApp(configPath);
            console.log('[App.vue] startApp result', result);
          } else {
            console.error('[App.vue] 未获取到配置文件路径，无法启动 app');
          }
        }
      } catch (error) {
        console.error('[App.vue] initializeApp error:', error);
      }
    }
  }
}
</script>

<style scoped>
.app-container {
  /* 此处可放置通用样式 */
}

/* 默认浅色模式 */
.sidebar {
  width: 220px;
  background-color: #f0f0f0; /* 浅色背景 */
  color: #000;
  padding: 10px;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  background-color: #fff;
  color: #000;
}

/* 深色模式下的样式，基于系统设置 */
@media (prefers-color-scheme: dark) {
  .sidebar {
    background-color: #202123;
    color: #fff;
  }
  .main-content {
    background-color: #18191a;
    color: #fff;
  }
}
</style>
