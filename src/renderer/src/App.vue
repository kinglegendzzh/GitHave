<template>
  <div id="app" class="app-container">
    <component :is="layoutComponent" />
    <!-- 全局剪切板仓库导入组件 -->
    <ClipboardRepoImporter />
  </div>
</template>

<script>
import MainLayout from './components/MainLayout.vue'
import BlankLayout from './views/BlankLayout.vue'
import IDE from './views3/IDE.vue'
import ClipboardRepoImporter from './components/ClipboardRepoImporter.vue'

export default {
  name: 'App',
  components: {
    MainLayout,
    BlankLayout,
    IDE,
    ClipboardRepoImporter
  },
  computed: {
    layoutComponent() {
      console.log('this.$route.meta.standalone', this.$route.path)
      // 如果路由 meta.standalone 为 true，则使用 BlankLayout
      return this.$route.meta.standalone ? BlankLayout : MainLayout
    }
  },
  mounted() {
    if (this.checkFirstInstall()) {
      return
    }
    this.initializeApp()
  },
  methods: {
    checkFirstInstall() {
      // 检查是否是初次安装
      const onboardingCompleted = localStorage.getItem('onboarding_completed')
      
      // 如果存在初次安装标识且未完成引导，则跳转到新手引导页面
      if (!onboardingCompleted) {
        this.$router.push('/onboarding')
        return true
      }
      return false
    },
    
    async initializeApp() {
      console.log('[App.vue] initializeApp')
      try {
        // 调用 checkAppHealth 检测 app 进程健康状态
        const health = await window.electron.checkAppHealth()
        console.log('[App.vue] app-health', health)
        // 如果状态不是“已启动”或正在清理，则启动服务
        if (health.state !== '已启动' && health.state !== '正在清理端口并重启核心服务') {
          const sysCfg = await window.electron.sysConfig()
          console.log('[App.vue] sysConfig', sysCfg)
          const configPath = sysCfg.configPath
          if (configPath) {
            const result = await window.electron.startApp(configPath)
            console.log('[App.vue] startApp result', result)
          } else {
            console.error('[App.vue] 未获取到配置文件路径，无法启动 app')
          }
        }
      } catch (error) {
        console.error('[App.vue] initializeApp error:', error)
      }
      try {
        // 调用 checkAppHealth 检测 app 进程健康状态
        const health = await window.electron.checkFmHttpHealth()
        console.log('[App.vue] app-health', health)
        // 如果状态不是“已启动”或正在清理，则启动服务
        if (health.state !== '已启动' && health.state !== '正在清理端口并重启索引') {
          const fmCfg = await window.electron.fmConfig()
          console.log('[App.vue] fmConfig', fmCfg)
          const configPath = fmCfg.configPath

          if (configPath) {
            const result = await window.electron.startFmHttp(configPath)
            console.log('[App.vue] startFm result', result)
          } else {
            console.error('[App.vue] 未获取到配置文件路径，无法启动 fm')
          }
        }
      } catch (error) {
        console.error('[App.vue] initializeApp error:', error)
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
