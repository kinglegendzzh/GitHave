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
import { initializeApp } from './utils/app-initializer.js'

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
    initializeApp()
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
    }
  }
}
</script>

<style scoped>
/* 🌟 */
.app-container {
  width: 100% !important;
  height: 100% !important;
  max-width: 100vw !important;
  max-height: 100vh !important;
  display: flex;
  flex-direction: column;
  overflow: hidden !important;
  overflow-x: hidden !important;
  overflow-y: hidden !important;
  position: relative;
}

/* 强制隐藏所有滚动条 */
:deep(*) {
  /* Webkit浏览器 */
  scrollbar-width: none !important; /* Firefox */
  -ms-overflow-style: none !important; /* IE和Edge */
}

:deep(*::-webkit-scrollbar) {
  display: none !important; /* Chrome, Safari, Opera */
  width: 0 !important;
  height: 0 !important;
}

/* 确保根元素不会溢出 */
:deep(html) {
  overflow: hidden !important;
}

:deep(body) {
  overflow: hidden !important;
}

:deep(#app) {
  overflow: hidden !important;
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

/* 全局 Ant Design 按钮夜间模式适配 */
.v-theme--dark .ant-btn,
.v-theme--dark .a-button {
  color: rgba(255, 255, 255, 0.85) !important;
}

.v-theme--dark .ant-btn-dashed,
.v-theme--dark .a-button.ant-btn-dashed,
.v-theme--dark .ant-btn[type="dashed"] {
  background-color: transparent !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
  color: rgba(255, 255, 255, 0.85) !important;
}

.v-theme--dark .ant-btn-dashed:hover,
.v-theme--dark .a-button.ant-btn-dashed:hover,
.v-theme--dark .ant-btn[type="dashed"]:hover {
  background-color: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.5) !important;
  color: rgba(255, 255, 255, 0.95) !important;
}

.v-theme--dark .ant-btn-dashed:focus,
.v-theme--dark .a-button.ant-btn-dashed:focus,
.v-theme--dark .ant-btn[type="dashed"]:focus {
  background-color: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.5) !important;
  color: rgba(255, 255, 255, 0.95) !important;
}

.v-theme--dark .ant-btn-dangerous,
.v-theme--dark .a-button[danger] {
  color: #ff7875 !important;
  border-color: #ff7875 !important;
}

.v-theme--dark .ant-btn-dangerous:hover,
.v-theme--dark .a-button[danger]:hover {
  background-color: rgba(255, 120, 117, 0.1) !important;
  border-color: #ff4d4f !important;
  color: #ff4d4f !important;
}

/* 深度覆盖 - 确保全局样式生效 */
.v-theme--dark :deep(.ant-btn-dashed) {
  background-color: transparent !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
  color: rgba(255, 255, 255, 0.85) !important;
}

.v-theme--dark :deep(.ant-btn-dashed:hover) {
  background-color: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.5) !important;
  color: rgba(255, 255, 255, 0.95) !important;
}

.v-theme--dark :deep(.ant-btn-dashed:focus) {
  background-color: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.5) !important;
  color: rgba(255, 255, 255, 0.95) !important;
}

/* 其他类型按钮的夜间模式适配 */
.v-theme--dark .ant-btn-primary {
  background-color: #1890ff !important;
  border-color: #1890ff !important;
  color: #fff !important;
}

.v-theme--dark .ant-btn-default {
  background-color: rgba(255, 255, 255, 0.04) !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
  color: rgba(255, 255, 255, 0.85) !important;
}

.v-theme--dark .ant-btn-default:hover {
  background-color: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
  color: rgba(255, 255, 255, 0.95) !important;
}

.v-theme--dark .ant-btn-text {
  color: rgba(255, 255, 255, 0.85) !important;
}

.v-theme--dark .ant-btn-text:hover {
  background-color: rgba(255, 255, 255, 0.08) !important;
  color: rgba(255, 255, 255, 0.95) !important;
}

.v-theme--dark .ant-btn-link {
  color: #40a9ff !important;
}

.v-theme--dark .ant-btn-link:hover {
  color: #69c0ff !important;
}
</style>
