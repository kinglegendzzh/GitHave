<template>
  <v-app>
    <!-- 侧边抽屉 -->
    <v-navigation-drawer
      v-model="drawer"
      app
      :rail="false"
      :dark="isDark"
      :color="isDark ? 'black' : 'white'"
      style="padding-top: 20px"
      width="250"
      class="drag-region"
    >
      <v-list dense>
        <v-list-item class="drag-region">
          <template #prepend>
            <v-avatar>
              <v-img :src="bannerSrc"></v-img>
            </v-avatar>
          </template>
          <v-list-item-title
            :class="{ 'text-white': isDark, 'text-black': !isDark }"
            style="font-size: 1rem; user-select: none; pointer-events: none"
          >
            <span v-if="!isDark">
              <v-img style="width: 110px; height: auto" :src="titleSrc"></v-img>
            </span>
            <span v-else>
              <v-img style="width: 110px; height: auto" :src="titleNSrc"></v-img>
            </span>
          </v-list-item-title>
        </v-list-item>

        <v-divider></v-divider>

        <!-- 遍历导航项 -->
        <template v-for="(item, index) in navItems" :key="item.title">
          <v-list-item
            v-if="!item.children"
            class="no-drag-region"
            :prepend-icon="item.icon"
            :title="item.title"
            :class="{ 'text-white': isDark, 'text-black': !isDark }"
            size="medium"
            active-class="active-link"
            @click="handleNav(item)"
          ></v-list-item>

          <!-- 有子菜单时，使用 v-list-group -->
          <v-list-group
            v-if="item.children"
            :id="`group-${item.title}-${index}`"
            :key="`${item.title}-group-${index}`"
            class="no-drag-region"
            :prepend-icon="item.icon"
            @update:value="updateGroupState(item, $event)"
          >
            <template #activator="{ props }">
              <v-list-item
                class="no-drag-region"
                v-bind="props"
                :title="item.title"
                :class="{ 'text-white': isDark, 'text-black': !isDark }"
              ></v-list-item>
            </template>
            <!-- 遍历子菜单 -->
            <v-list-item
              v-for="(child, i) in item.children"
              :key="`${item.title}-${i}`"
              class="no-drag-region"
              :prepend-icon="child.icon"
              :title="child.title"
              :class="{ 'text-white': isDark, 'text-black': !isDark }"
              size="medium"
              active-class="active-link"
              @click="handleNav(child)"
            ></v-list-item>
          </v-list-group>
        </template>
      </v-list>
    </v-navigation-drawer>

    <!-- 顶部工具栏 -->
    <v-app-bar app :dark="isDark" class="drag-region">
      <v-tooltip class="no-drag-region" bottom>
        <template #activator="{ props }">
          <v-btn class="no-drag-region" icon v-bind="props" @click="drawer = !drawer">
            <v-icon>mdi-menu</v-icon>
          </v-btn>
        </template>
        <span>切换侧边栏</span>
      </v-tooltip>
      <v-tooltip class="no-drag-region" bottom>
        <template #activator="{ props }">
          <v-btn icon class="no-drag-region" v-bind="props" @click="goBack">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
        </template>
        <span>返回上一步</span>
      </v-tooltip>
      <v-tooltip class="no-drag-region" bottom>
        <template #activator="{ props }">
          <v-btn icon class="no-drag-region" v-bind="props" @click="goNext">
            <v-icon>mdi-arrow-right</v-icon>
          </v-btn>
        </template>
        <span>下一步</span>
      </v-tooltip>

      <v-toolbar-title style="user-select: none; pointer-events: none">
        {{ currentTitle }}
      </v-toolbar-title>

      <!-- 健康状态显示 -->
      <v-chip :color="healthChipColor" text-color="white" small class="ml-4" style="font-weight: bold;">
        <v-icon left small>
          {{ healthChipIcon }}
        </v-icon>
        环境状态
      </v-chip>

      <v-chip :color="chipColor" text-color="white" small class="ml-4" style="font-weight: bold">
        <v-icon left small>
          {{ chipIcon }}
        </v-icon>
        核心
      </v-chip>

      <v-chip :color="fmHttpChipColor" text-color="white" small class="ml-4" style="font-weight: bold">
        <v-icon left small>
          {{ fmHttpChipIcon }}
        </v-icon>
        索引
      </v-chip>

      <v-spacer></v-spacer>
      <v-switch v-model="isDark" class="ml-4 no-drag-region" hide-details @change="toggleTheme">
        <template #append>
          <v-icon v-if="isDark" class="no-drag-region" :style="{ color: 'white' }">
            mdi-moon-waning-crescent
          </v-icon>
          <v-icon v-else class="no-drag-region" :style="{ color: '#FFD700' }">
            mdi-white-balance-sunny
          </v-icon>
        </template>
      </v-switch>
      <v-tooltip class="no-drag-region" bottom>
        <template #activator="{ props }">
          <!-- 重载当前页面按钮 -->
          <v-btn icon class="ml-4 no-drag-region" v-bind="props" @click="reloadPage">
            <v-icon>mdi-refresh</v-icon>
          </v-btn>
        </template>
        <span>刷新</span>
      </v-tooltip>
      <!-- 切换核心服务状态的按钮 -->
      <v-tooltip class="no-drag-region" bottom>
        <template #activator="{ props }">
          <v-btn
            icon
            class="ml-4 no-drag-region"
            v-bind="props"
            :disabled="
          isTogglingApp ||
          appHealthState === '正在清理端口并重启核心服务' ||
          appHealthState === '正在重启'
        "
            @click="toggleAppService"
          >
            <v-icon>mdi-laptop</v-icon>
          </v-btn>
        </template>
        <span>{{ toggleAppTip }}</span>
      </v-tooltip>

      <!-- 切换 AI 索引服务状态的按钮 -->
      <v-tooltip class="no-drag-region" bottom>
        <template #activator="{ props }">
          <v-btn
            icon
            class="ml-4 no-drag-region"
            v-bind="props"
            :disabled="
          isTogglingFm ||
          fmHttpHealthState === '正在清理端口并重启AI索引' ||
          fmHttpHealthState === '正在重启'
        "
            @click="toggleFmHttpService"
          >
            <v-icon>mdi-flash</v-icon>
          </v-btn>
        </template>
        <span>{{ fmHttpToggleTip }}</span>
      </v-tooltip>
      <v-tooltip class="no-drag-region" bottom>
        <template #activator="{ props }">
          <v-btn icon class="ml-4 no-drag-region" v-bind="props" @click="toggleCompactMode">
            <v-icon v-if="isCompactMode">mdi-magnify-plus</v-icon>
            <v-icon v-else>mdi-magnify-minus</v-icon>
          </v-btn>
        </template>
        <span>{{ isCompactMode ? '切换到标准模式' : '切换到紧凑模式' }}</span>
      </v-tooltip>
    </v-app-bar>
    <!-- 主体区域：直接使用 router-view -->
    <v-main>
      <RouterView v-slot="{ Component }">
        <Suspense>
          <keep-alive
            :exclude="[
              'MemoryCard',
              'AgentConfig',
              'ModelConfig',
              'GitResearch',
              // 'CommitHistory',
              'IDE',
            ]"
          >
            <component :is="Component" />
          </keep-alive>
        </Suspense>
      </RouterView>
      <v-snackbar
        v-model="showConfigSnackbar"
        :timeout="-1"
        top
        right
        color="red"
        elevation="2"
        @click="goToConfig"
      >
        环境状态不可用，点我跳转到配置了解详情
      </v-snackbar>
    </v-main>
  </v-app>
</template>

<script>
import _ from 'lodash'
import bannerSrc from '../assets/banner.svg'
import titleSrc from '../assets/title.svg'
import titleNSrc from '../assets/title-night.svg'
import { RouterView } from 'vue-router'
import { fmHealthCheck, appHealthCheck, faissHealthCheck } from '../service/api'

export default {
  name: 'MainLayout',
  components: {
    RouterView
  },
  data() {
    return {
      isTogglingApp: false,  // 核心服务按钮防连点
      isTogglingFm: false,   // 索引服务按钮防连点
      isCompactMode: true, // 紧凑模式开关
      // 健康状态枚举：支持 "正在重启"、"已关闭"、"已启动"
      toggleAppTip: '强制关闭核心服务',
      appHealthState: '正在重启',
      fmHttpHealthState: '正在重启',
      fmHttpToggleTip: '强制关闭索引服务',
      bannerSrc,
      titleSrc,
      titleNSrc,
      drawer: true,
      navItems: [
        { title: '快速开始', to: '/start', icon: 'mdi-home' },
        { title: 'IDE (研究预览版)', to: '/ide', icon: 'mdi-code-greater-than', standalone: true },
        { title: '枢纽', to: '/report', icon: 'mdi-microsoft-word' },
        {
          title: '应用中心',
          icon: 'mdi-robot',
          expanded: false,
          children: [
            { title: '深度搜索', to: '/search', icon: 'mdi-book-search' },
            // { title: '代码记忆', to: '/memory', icon: 'mdi-brain' },
            { title: '空间透镜', to: '/space', icon: 'mdi-telescope' },
            { title: '代码视窗', to: '/finder', icon: 'mdi-code-block-tags' },
            { title: '提交审查', to: '/commits/history', icon: 'mdi-github' },
            { title: '推送机器人', to: '/sender', icon: 'mdi-send' },
          ]
        },
        {
          title: '仓库管理',
          icon: 'mdi-source-repository',
          expanded: false,
          children: [
            { title: '仓库身份证', to: '/repo', icon: 'mdi-github' },
            { title: '仓库索引', to: '/scan', icon: 'mdi-credit-card-scan' },
          ]
        },
        {
          title: '配置中心',
          icon: 'mdi-cogs',
          expanded: false,
          children: [
            { title: '模型配置', to: '/model', icon: 'mdi-cards-playing-club-multiple-outline' },
            { title: '智能体配置', to: '/agent', icon: 'mdi-robot-happy-outline' }
          ]
        },
        {
          title: '社区',
          icon: 'mdi-hammer-sickle',
          expanded: false,
          children: [
            { title: '核心技术报告', to: '/', icon: 'mdi-atom' },
            { title: '代码维基', to: '/', icon: 'mdi-wikipedia' },
            { title: '仓库周刊', to: '/', icon: 'mdi-newspaper' },
            { title: '公共配置镜像', to: '/', icon: 'mdi-mirror-rectangle' },
            { title: '公共索引镜像', to: '/', icon: 'mdi-flash' },
          ]
        }
      ],
      isDark: false,
      healthInterval: null,
      // —— 环境检测状态 ——
      ollamaInstalled: false,
      ollamaRunning: false,
      ollamaPid: null,
      pythonInstalled: false,
      pandocInstalled: false,
      gitInstalled: false,
      attemptedStart: false,
      healthState: 'ing',
      showConfigSnackbar: false,  // 控制提示气泡显示
    }
  },
  computed: {
    fmHttpChipColor() {
      if (this.fmHttpHealthState === '正在重启') return 'orange'
      if (this.fmHttpHealthState === '正在清理端口并重启AI索引') return 'grey'
      else if (this.fmHttpHealthState === '已启动') return 'purple'
      else if (this.fmHttpHealthState === '已关闭') return 'grey'
      else return 'grey'
    },
    fmHttpChipIcon() {
      if (this.fmHttpHealthState === '正在重启') return 'mdi-progress-clock'
      if (this.fmHttpHealthState === '正在清理端口并重启AI索引') return 'mdi-progress-clock'
      else if (this.fmHttpHealthState === '已启动') return 'mdi-flash'
      else if (this.fmHttpHealthState === '已关闭') return 'mdi-close-circle'
      else return 'mdi-help-circle'
    },
    currentTitle() {
      return this.$route.meta.title || 'GitHave'
    },
    chipColor() {
      if (this.appHealthState === '正在重启') return 'orange'
      if (this.appHealthState === '正在清理端口并重启核心服务') return 'grey'
      else if (this.appHealthState === '已启动') return 'purple'
      else if (this.appHealthState === '已关闭') return 'grey'
      else return 'grey'
    },
    chipIcon() {
      if (this.appHealthState === '正在重启') return 'mdi-progress-clock'
      if (this.appHealthState === '正在清理端口并重启核心服务') return 'mdi-progress-clock'
      else if (this.appHealthState === '已启动') return 'mdi-check-circle'
      else if (this.appHealthState === '已关闭') return 'mdi-close-circle'
      else return 'mdi-help-circle'
    },
    healthChipColor() {
      if (this.healthState === 'ing') return 'orange'
      else if (this.healthState === 'yes') return 'green'
      else if (this.healthState === 'no') return 'red'
      else return 'grey'
    },
    healthChipIcon() {
      if (this.healthState === 'ing') return 'mdi-progress-clock'
      else if (this.healthState === 'yes') return 'mdi-check-circle'
      else if (this.healthState === 'no') return 'mdi-close-circle'
      else return 'mdi-help-circle'
    }
  },
  async created() {
    this.detectSystemTheme()
    this.changeTip(this.appHealthState)
    console.log('初始 appHealthState:', this.appHealthState)
    // 定时器每 3 秒轮询检测各服务健康状态
    this.healthInterval = setInterval(async () => {
      // —— App 服务健康检测 ——
      try {
        const result = await window.electron.checkAppHealth()
        if (result && result.state) {
          // 二次调用 HTTP 接口，检查状态码
          try {
            const resp = await appHealthCheck()
            if (resp.status === 200) {
              this.appHealthState = '已启动'
            } else {
              this.appHealthState = '正在重启'
            }
          } catch (err) {
            console.error('App HTTP 接口检查失败：', err)
            this.appHealthState = '正在重启'
          }
        } else {
          this.appHealthState = '已关闭'
        }
      } catch (err) {
        console.error('检测 app 健康状态失败：', err)
        this.appHealthState = '已关闭'
      }
      this.changeTip(this.appHealthState)

      // —— FM HTTP 服务健康检测 ——
      try {
        const result = await window.electron.checkFmHttpHealth()
        if (result && result.state) {
          try {
            const resp = await fmHealthCheck()
            const faiss_resp = await faissHealthCheck()
            if (resp.status === 200 && faiss_resp.status === 200) {
              this.fmHttpHealthState = '已启动'
            } else {
              this.fmHttpHealthState = '正在重启'
            }
          } catch (err) {
            console.error('FM HTTP 接口检查失败：', err)
            this.fmHttpHealthState = '正在重启'
          }
        } else {
          this.fmHttpHealthState = '已关闭'
        }
      } catch (err) {
        console.error('检测 fm_http 健康状态失败：', err)
        this.fmHttpHealthState = '已关闭'
      }
      this.changeFmHttpTip(this.fmHttpHealthState)

      // —— 本地环境依赖检查 ——
      const python = await this.checkPython()
      const pandoc = await this.checkPandoc()
      const git = await this.checkGit()
      this.healthState = (python && pandoc && git) ? 'yes' : 'no'
    }, 3000)
  },
  beforeUnmount() {
    if (this.healthInterval) {
      clearInterval(this.healthInterval)
    }
  },
  methods: {
    goBack () {
      window.history.back();
    },
    goNext () {
      window.history.forward();
    },
    // 新增：跳转到配置页
    goToConfig() {
      this.showConfigSnackbar = false
      this.$router.push('/model')
    },
    async checkOllama() {
      try {
        const { installed, running, pid } = await window.electron.checkOllamaIPC()
        this.ollamaInstalled = installed
        this.ollamaRunning = running
        this.ollamaPid = pid || null
        return installed && running
      } catch {
        this.ollamaInstalled = false
        this.ollamaRunning = false
        this.ollamaPid = null
        return false
      }
    },
    async checkPython() {
      try {
        const { success, version } = await window.electron.checkPythonIPC();

        if (!success) {
          this.pythonInstalled = false;
          return false;
        }

        // 使用正则表达式提取版本号
        const versionMatch = version.match(/^Python (\d+)\.(\d+)\.(\d+)$/);
        if (!versionMatch) {
          this.pythonInstalled = false;
          return false;
        }

        // 提取主版本号、次版本号、修订号
        const [ , major, minor, patch ] = versionMatch.map(Number);

        // 目标版本号
        const targetVersion = { major: 3, minor: 9, patch: 0 };

        // 比较版本号
        if (
          major > targetVersion.major ||
          (major === targetVersion.major && minor > targetVersion.minor) ||
          (major === targetVersion.major && minor === targetVersion.minor && patch > targetVersion.patch)
        ) {
          return true; // 如果当前版本大于目标版本
        }

        return false; // 如果当前版本小于或等于目标版本
      } catch {
        this.pythonInstalled = false;
        return false;
      }
    },
    async checkPandoc() {
      try {
        const { installed, version } = await window.electron.checkPandocIPC()
        this.gitInstalled = installed
        return installed
      } catch {
        this.gitInstalled = false
        return false
      }
    },
    async checkGit() {
      try {
        const { installed, version } = await window.electron.checkGitIPC()
        this.pandocInstalled = installed
        return installed
      } catch {
        this.pandocInstalled = false
        return false
      }
    },
    changeFmHttpTip(state) {
      switch (state) {
        case '正在重启':
          this.fmHttpToggleTip = '正在重启'
          break
        case '已关闭':
          this.fmHttpToggleTip = '启动索引服务'
          break
        case '已启动':
          this.fmHttpToggleTip = '强制关闭索引服务'
          break
        default:
          this.fmHttpToggleTip = '操作索引服务'
      }
    },

    async toggleFmHttpService() {
      if (this.isTogglingFm) return;
      this.isTogglingFm = true;
      // 3 秒后恢复按钮可用
      setTimeout(() => { this.isTogglingFm = false }, 3000);

      try {
        const fmConfigResp = await window.electron.fmConfig();
        if (this.fmHttpHealthState === '已关闭') {
          const startResult = await window.electron.startFmHttp(fmConfigResp.configPath);
          if (startResult.started) {
            this.fmHttpHealthState = '已启动';
          }
        } else if (this.fmHttpHealthState === '已启动') {
          const stopResult = await window.electron.stopFmHttp();
          if (stopResult.stopped) {
            this.fmHttpHealthState = '已关闭';
          }
        }
      } catch (error) {
        console.error('切换 fm_http 服务状态失败：', error);
      }
    },
    async handleNav(item) {
      // 如果点击的是 IDE 路由
      if (item.to === '/ide') {
        // 构造要打开的完整 URL
        const url = `${window.location.origin}/#${item.to}`
        // 调用主进程打开新窗口
        await window.electron.openNewWindowIDE(url)
        return
      }
      // 其他路由，使用 Vue Router 正常跳转
      this.$router.push(item.to)
    },
    async toggleCompactMode() {
      const factor = this.isCompactMode ? 1 : 0.875 // true→还原，false→紧凑
      await window.electron.setZoomFactor(factor)
      this.isCompactMode = !this.isCompactMode
      localStorage.setItem('isCompactMode', this.isCompactMode)
    },
    changeTip(state) {
      switch (state) {
        case '正在重启':
          this.toggleAppTip = '正在重启'
          break
        case '正在清理端口并重启核心服务':
        case '正在清理端口并重启AI索引':
        case '已关闭':
          this.toggleAppTip = '启动核心服务'
          break
        case '已启动':
          this.toggleAppTip = '强制关闭核心服务'
          break
        default:
          this.toggleAppTip = '操作核心服务'
      }
    },

    reloadPage() {
      location.reload()
    },
    async toggleAppService() {
      if (this.isTogglingApp) return;
      this.isTogglingApp = true;
      // 3 秒后恢复按钮可用
      setTimeout(() => { this.isTogglingApp = false }, 2000);

      try {
        const sysConfigResp = await window.electron.sysConfig();
        if (this.appHealthState === '已关闭' || this.appHealthState === '未启动') {
          const startResult = await window.electron.startApp(sysConfigResp.configPath);
          if (startResult.started) {
            this.appHealthState = '已启动';
          }
        } else if (this.appHealthState === '已启动') {
          const stopResult = await window.electron.stopApp();
          if (stopResult.stopped) {
            this.appHealthState = '已关闭';
          }
        }
      } catch (error) {
        console.error('切换 app 服务状态失败：', error);
      }
    },
    toggleTheme() {
      this.$vuetify.theme.global.name = this.isDark ? 'dark' : 'light'
      localStorage.setItem('isDark', this.isDark)
    },
    detectSystemTheme() {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
      this.isDark = isDarkMode
      this.$vuetify.theme.global.name = isDarkMode ? 'dark' : 'light'
      localStorage.setItem('isDark', this.isDark)
    },
    updateGroupState(item, state) {
      console.log('更新组状态：', item, state)
      item.expanded = state
    },
    saveNavState: _.debounce(function () {
      const navState = this.navItems
        .filter((item) => item.children)
        .reduce((acc, item) => {
          acc[item.title] = item.expanded
          return acc
        }, {})
      localStorage.setItem('navState', JSON.stringify(navState))
    }, 300)
  },
  watch: {
    navItems: {
      handler: 'saveNavState',
      deep: true
    },
    // 监听 healthState，一旦变为 'no' 就弹出气泡
    healthState(newVal) {
      if (newVal === 'no') {
        this.showConfigSnackbar = true
      }
    }
  },
  async mounted() {
    const storedTheme = localStorage.getItem('isDark')
    if (storedTheme !== null) {
      this.isDark = storedTheme === 'true'
      this.$vuetify.theme.global.name = this.isDark ? 'dark' : 'light'
    } else {
      this.detectSystemTheme()
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      this.detectSystemTheme()
    })

    const storedNavState = localStorage.getItem('navState')
    if (storedNavState) {
      const navState = JSON.parse(storedNavState)
      this.navItems.forEach((item) => {
        if (item.children && Object.prototype.hasOwnProperty.call(navState, item.title)) {
          item.expanded = navState[item.title]
        }
      })
    }

    const storedCompact = localStorage.getItem('isCompactMode')
    if (storedCompact !== null) {
      this.isCompactMode = storedCompact === 'true'
      await window.electron.setZoomFactor(this.isCompactMode ? 0.8 : 1)
    }
  }
}
</script>

<style scoped>
.drag-region {
  -webkit-app-region: drag;
  .no-drag-region,
  v-tooltip,
  v-switch,
  v-btn {
    -webkit-app-region: no-drag;
  }
}

.v-list-group__items .v-list-item {
  padding-left: 32px !important;
}

.active-link {
  background-color: rgba(var(--v-theme-primary), 0.12);
}

:deep(.v-navigation-drawer .v-list-item-title) {
  font-size: 0.8rem !important;
}
:deep(.v-main) {
  :deep(.v-container) {
    height: calc(100vh - 50px);
    overflow-y: auto;
  }
}
</style>
