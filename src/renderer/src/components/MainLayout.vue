<template>
  <v-app>
    <!-- 侧边抽屉 -->
    <v-navigation-drawer
      v-model="drawer"
      app
      :rail="isRailMode"
      :dark="isDark"
      :color="isDark ? 'black' : 'white'"
      style="padding-top: 20px"
      width="250"
      class="drag-region"
    >
      <v-list dense>
        <v-list-item class="no-drag-region" @click="toggleDrawer">
          <v-tooltip activator="parent" location="end">
            {{ isRailMode ? '点我展开' : '点我折叠' }}
          </v-tooltip>
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
            :active="$route.path === item.to"
            :disabled="item.disabled"
            @click="handleNav(item)"
          >
            <v-tooltip activator="parent" location="end">
              {{ item.title }}
            </v-tooltip>
          </v-list-item>

          <!-- 有子菜单时的处理 -->
          <template v-if="item.children">
            <!-- rail模式下使用悬浮菜单 -->
            <v-menu
              v-if="isRailMode"
              :key="`${item.title}-menu-${index}`"
              :close-on-content-click="false"
              location="end"
              offset="10"
              :disabled="item.disabled"
            >
              <template #activator="{ props }">
                <v-list-item
                  class="no-drag-region"
                  v-bind="props"
                  :prepend-icon="item.icon"
                  :title="''"
                  :class="{ 'text-white': isDark, 'text-black': !isDark }"
                  size="medium"
                  active-class="active-link"
                  :active="isParentMenuActive(item)"
                  :disabled="item.disabled"
                >
                  <v-tooltip activator="parent" location="end">
                    {{ item.title }}
                  </v-tooltip>
                </v-list-item>
              </template>
              <v-list
                :bg-color="isDark ? 'black' : 'white'"
                :class="{ 'text-white': isDark, 'text-black': !isDark }"
                density="compact"
              >
                <v-list-item
                  v-for="(child, i) in item.children"
                  :key="`${item.title}-${i}`"
                  :prepend-icon="child.icon"
                  :title="child.title"
                  :class="{ 'text-white': isDark, 'text-black': !isDark }"
                  size="small"
                  active-class="active-link"
                  :active="$route.path === child.to"
                  :disabled="child.disabled"
                  @click="handleNav(child)"
                ></v-list-item>
              </v-list>
            </v-menu>
            <!-- 非rail模式下使用原来的v-list-group -->
            <v-list-group
              v-else
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
                :active="$route.path === child.to"
                :disabled="child.disabled"
                @click="handleNav(child)"
              ></v-list-item>
            </v-list-group>
          </template>
        </template>
      </v-list>
    </v-navigation-drawer>

    <!-- 顶部工具栏 -->
    <v-app-bar app :dark="isDark" class="drag-region pt-0">
      <v-tooltip class="no-drag-region" bottom>
        <template #activator="{ props }">
          <v-btn icon size="small" class="no-drag-region ml-10" v-bind="props" @click="goBack">
            <v-icon size="small">mdi-arrow-left</v-icon>
          </v-btn>
        </template>
        <span>返回上一步</span>
      </v-tooltip>
      <v-tooltip class="no-drag-region" bottom>
        <template #activator="{ props }">
          <v-btn icon size="small" class="no-drag-region" v-bind="props" @click="goNext">
            <v-icon size="small">mdi-arrow-right</v-icon>
          </v-btn>
        </template>
        <span>下一步</span>
      </v-tooltip>

      <v-toolbar-title style="user-select: none; pointer-events: none">
        {{ currentTitle }}
      </v-toolbar-title>

      <!-- 健康状态显示 -->
      <v-chip :color="healthChipColor" text-color="white" size="small" class="ml-1 text-caption">
        <template v-if="healthState === 'ing'">
          <v-progress-circular indeterminate size="12" width="1"></v-progress-circular>
        </template>
        <template v-else>
          <v-icon left size="small">
            {{ healthChipIcon }}
          </v-icon>
        </template>
        环境状态
      </v-chip>

      <v-chip :color="chipColor" text-color="white" size="small" class="ml-1 text-caption">
        <v-icon left>
          {{ chipIcon }}
        </v-icon>
        核心
      </v-chip>

      <v-chip :color="fmHttpChipColor" text-color="white" size="small" class="ml-1 text-caption">
        <v-icon left>
          {{ fmHttpChipIcon }}
        </v-icon>
        索引
      </v-chip>

      <v-spacer></v-spacer>
      <v-switch
        v-model="isDark"
        class="ml-1 no-drag-region compact-switch"
        hide-details
        @change="toggleTheme"
      >
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
          <v-btn icon class="ml-1 no-drag-region compact-btn" v-bind="props" @click="reloadPage">
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
            class="ml-1 no-drag-region compact-btn"
            v-bind="props"
            :disabled="isTogglingApp"
            @click="coreDialog = true"
          >
            <v-icon>mdi-laptop</v-icon>
          </v-btn>
        </template>
        <span>核心服务</span>
      </v-tooltip>

      <!-- 切换 AI 索引服务状态的按钮 -->
      <v-tooltip class="no-drag-region" bottom>
        <template #activator="{ props }">
          <v-btn
            icon
            class="ml-1 no-drag-region compact-btn"
            v-bind="props"
            :disabled="isTogglingFm"
            @click="fmDialog = true"
          >
            <v-icon>mdi-flash</v-icon>
          </v-btn>
        </template>
        <span>索引服务</span>
      </v-tooltip>

      <!-- 重启所有服务按钮 -->
      <v-tooltip class="no-drag-region" bottom>
        <template #activator="{ props }">
          <v-btn
            icon
            class="ml-1 no-drag-region compact-btn"
            v-bind="props"
            :disabled="isRestarting"
            color="warning"
            @click="handleRestartService('both')"
          >
            <v-icon>mdi-restart</v-icon>
          </v-btn>
        </template>
        <span>重启所有服务</span>
      </v-tooltip>
      <v-tooltip class="no-drag-region" bottom>
        <template #activator="{ props }">
          <v-btn
            icon
            class="ml-1 no-drag-region compact-btn"
            v-bind="props"
            @click="toggleCompactMode"
          >
            <v-icon v-if="isCompactMode">mdi-magnify-plus</v-icon>
            <v-icon v-else>mdi-magnify-minus</v-icon>
          </v-btn>
        </template>
        <span>{{ isCompactMode ? '切换到标准显示' : '切换到紧凑显示' }}</span>
      </v-tooltip>
    </v-app-bar>
    <!-- 主体区域：条件渲染 router-view 或加载状态 -->
    <v-main>
      <!-- 服务未准备就绪时显示加载状态 -->
      <div v-if="!servicesReady && !isStandalonePage" class="loading-container">
        <div class="loading-content">
          <v-progress-circular
            indeterminate
            size="64"
            color="primary"
            class="mb-4"
          ></v-progress-circular>
          <h3 class="text-h6 mb-2">正在启动服务...</h3>
          <p class="text-body-2 text-medium-emphasis mb-4">请等待核心服务和索引服务启动完成</p>

          <!-- 服务状态显示 -->
          <div class="service-status">
            <div class="status-item">
              <v-icon :color="appHealthState === '已启动' ? 'success' : 'warning'" class="mr-2">
                {{ appHealthState === '已启动' ? 'mdi-check-circle' : 'mdi-progress-clock' }}
              </v-icon>
              <span>核心服务: {{ appHealthState }}</span>
            </div>
            <div class="status-item">
              <v-icon :color="fmHttpHealthState === '已启动' ? 'success' : 'warning'" class="mr-2">
                {{ fmHttpHealthState === '已启动' ? 'mdi-check-circle' : 'mdi-progress-clock' }}
              </v-icon>
              <span>索引服务: {{ fmHttpHealthState }}</span>
            </div>
            <div class="status-item">
              <v-icon :color="healthState === 'yes' ? 'success' : 'warning'" class="mr-2">
                {{ healthState === 'yes' ? 'mdi-check-circle' : 'mdi-progress-clock' }}
              </v-icon>
              <span>环境检测: {{ healthState === 'yes' ? '通过' : '检测中' }}</span>
            </div>
          </div>

          <!-- 骨架屏 -->
          <div class="skeleton-container mt-6">
            <v-skeleton-loader type="card" class="mb-4"></v-skeleton-loader>
            <v-skeleton-loader type="list-item-two-line" class="mb-2"></v-skeleton-loader>
            <v-skeleton-loader type="list-item-two-line" class="mb-2"></v-skeleton-loader>
          </div>
        </div>
      </div>

      <!-- 服务准备就绪或独立页面时显示正常内容 -->
      <RouterView v-else v-slot="{ Component }">
        <Suspense>
          <keep-alive
            :exclude="[
              'MemoryCard',
              'AgentConfig',
              'ModelConfig',
              // 'GitResearch',
              // 'CommitHistory',
              'IDE'
            ]"
          >
            <component :is="Component" />
          </keep-alive>
        </Suspense>
      </RouterView>
      <v-snackbar
        v-model="showConfigSnackbar"
        :timeout="15000"
        top
        right
        color="red"
        elevation="2"
        @click="goToConfig"
      >
        环境状态不可用，需要进行初始化安装，点我跳转到配置中心了解详情
      </v-snackbar>
    </v-main>
    <!-- 核心服务操作对话框 -->
    <v-dialog v-model="coreDialog" max-width="500" persistent>
      <v-card class="elevation-8">
        <v-card-title class="d-flex align-center pa-4 bg-primary">
          <v-icon color="white" class="mr-2" size="small">mdi-laptop</v-icon>
          <span class="text-subtitle-1 text-white font-weight-medium">核心服务管理</span>
        </v-card-title>

        <v-card-text class="pa-4">
          <div class="mb-3">
            <v-chip
              :color="chipColor"
              :prepend-icon="chipIcon"
              variant="flat"
              size="small"
              class="mb-2"
            >
              {{ appHealthState }}
            </v-chip>
          </div>

          <v-alert type="info" variant="tonal" class="mb-3 text-caption" density="compact">
            核心服务负责处理主要的业务逻辑和API请求。
          </v-alert>

          <div class="d-flex flex-column gap-2">
            <v-btn
              color="success"
              variant="outlined"
              size="small"
              :disabled="isTogglingApp || appHealthState === '已启动'"
              :loading="isTogglingApp && appHealthState !== '已启动'"
              prepend-icon="mdi-play"
              block
              class="text-caption"
              @click="handleAppService('start')"
            >
              启动核心服务
            </v-btn>

            <v-btn
              color="error"
              variant="outlined"
              size="small"
              :disabled="isTogglingApp || appHealthState === '已关闭'"
              :loading="isTogglingApp && appHealthState !== '已关闭'"
              prepend-icon="mdi-stop"
              block
              class="text-caption"
              @click="handleAppService('stop')"
            >
              停止核心服务
            </v-btn>

            <v-btn
              color="warning"
              variant="outlined"
              size="small"
              :disabled="isRestarting"
              prepend-icon="mdi-restart"
              block
              class="text-caption"
              @click="handleRestartService('core')"
            >
              重启核心服务
            </v-btn>
          </div>
        </v-card-text>

        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            size="small"
            class="text-caption"
            :disabled="isTogglingApp"
            @click="coreDialog = false"
          >
            关闭
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 索引服务操作对话框 -->
    <v-dialog v-model="fmDialog" max-width="500" persistent>
      <v-card class="elevation-8">
        <v-card-title class="d-flex align-center pa-4 bg-purple">
          <v-icon color="white" class="mr-2" size="small">mdi-flash</v-icon>
          <span class="text-subtitle-1 text-white font-weight-medium">索引服务管理</span>
        </v-card-title>

        <v-card-text class="pa-4">
          <div class="mb-3">
            <v-chip
              :color="fmHttpChipColor"
              :prepend-icon="fmHttpChipIcon"
              variant="flat"
              size="small"
              class="mb-2"
            >
              {{ fmHttpHealthState }}
            </v-chip>
          </div>

          <v-alert type="info" variant="tonal" class="mb-3 text-caption" density="compact">
            索引服务负责AI智能搜索和代码分析功能。
          </v-alert>

          <div class="d-flex flex-column gap-2">
            <v-btn
              color="success"
              variant="outlined"
              size="small"
              :disabled="isTogglingFm || fmHttpHealthState === '已启动'"
              :loading="isTogglingFm && fmHttpHealthState !== '已启动'"
              prepend-icon="mdi-play"
              block
              class="text-caption"
              @click="handleFmService('start')"
            >
              启动索引服务
            </v-btn>

            <v-btn
              color="error"
              variant="outlined"
              size="small"
              :disabled="isTogglingFm || fmHttpHealthState === '已关闭'"
              :loading="isTogglingFm && fmHttpHealthState !== '已关闭'"
              prepend-icon="mdi-stop"
              block
              class="text-caption"
              @click="handleFmService('stop')"
            >
              停止索引服务
            </v-btn>

            <v-btn
              color="warning"
              variant="outlined"
              size="small"
              :disabled="isRestarting"
              prepend-icon="mdi-restart"
              block
              class="text-caption"
              @click="handleRestartService('fm')"
            >
              重启索引服务
            </v-btn>
          </div>
        </v-card-text>

        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            size="small"
            class="text-caption"
            :disabled="isTogglingFm"
            @click="fmDialog = false"
          >
            关闭
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 重启服务进度对话框 -->
    <v-dialog v-model="showRestartDialog" persistent max-width="500">
      <v-card class="elevation-12">
        <v-card-title class="d-flex align-center pa-4 bg-warning">
          <v-icon color="white" class="mr-2" size="small">mdi-restart</v-icon>
          <span class="text-subtitle-1 text-white font-weight-medium">
            {{ getRestartTitle() }}
          </span>
        </v-card-title>

        <v-card-text class="pa-4">
          <div class="mb-3 text-caption">
            {{ getRestartDescription() }}
          </div>

          <v-list class="bg-transparent">
            <v-list-item v-for="step in restartProgress" :key="step.step" class="px-0 py-2">
              <template #prepend>
                <v-icon v-if="step.status === 'pending'" color="grey" size="small" class="mr-2">
                  mdi-circle-outline
                </v-icon>
                <v-progress-circular
                  v-else-if="step.status === 'running'"
                  indeterminate
                  color="warning"
                  size="16"
                  width="2"
                  class="mr-2"
                ></v-progress-circular>
                <v-icon
                  v-else-if="step.status === 'completed'"
                  color="success"
                  size="small"
                  class="mr-2"
                >
                  mdi-check-circle
                </v-icon>
                <v-icon v-else-if="step.status === 'error'" color="error" size="small" class="mr-2">
                  mdi-close-circle
                </v-icon>
              </template>

              <v-list-item-title
                :class="{
                  'text-grey': step.status === 'pending',
                  'text-warning': step.status === 'running',
                  'text-success': step.status === 'completed',
                  'text-error': step.status === 'error'
                }"
                class="text-caption"
              >
                {{ step.step }}. {{ step.text }}
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>

        <v-card-actions v-if="!isRestarting" class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            class="text-caption"
            @click="showRestartDialog = false"
          >
            关闭
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
      isTogglingApp: false, // 核心服务按钮防连点
      isTogglingFm: false, // 索引服务按钮防连点
      isCompactMode: true, // 紧凑模式开关
      isRailMode: true, // 侧边栏rail模式开关
      // 健康状态枚举：支持 "正在重启"、"已关闭"、"已启动"
      toggleAppTip: '强制关闭核心服务',
      appHealthState: '正在重启',
      fmHttpHealthState: '正在重启',
      fmHttpToggleTip: '强制关闭索引服务',
      bannerSrc,
      titleSrc,
      titleNSrc,
      drawer: true,
      // 重启服务相关
      isRestarting: false, // 是否正在重启服务
      showRestartDialog: false, // 显示重启进度对话框
      restartType: '', // 重启类型：'core'、'fm'、'both'
      restartProgress: [
        { step: 1, text: '停止服务', status: 'pending' },
        { step: 2, text: '冷却等待', status: 'pending' },
        { step: 3, text: '启动服务', status: 'pending' },
        { step: 4, text: '状态检测', status: 'pending' },
        { step: 5, text: '完成', status: 'pending' }
      ],
      navItems: [
        { title: '快速开始', to: '/start', icon: 'mdi-home' },
        { title: '深度搜索', to: '/search', icon: 'mdi-book-search' },
        { title: '文件枢纽', to: '/report', icon: 'mdi-microsoft-word' },
        // { title: '代码记忆', to: '/memory', icon: 'mdi-brain' },
        { title: '空间透镜', to: '/space', icon: 'mdi-telescope' },
        { title: '提交审查', to: '/commits/history', icon: 'mdi-github' },
        { title: '推送机器人', to: '/sender', icon: 'mdi-robot' },
        { title: '代码视窗', to: '/finder', icon: 'mdi-code-block-tags' },
        {
          title: '仓库管理',
          icon: 'mdi-source-repository',
          expanded: false,
          children: [
            { title: '仓库身份证', to: '/repo', icon: 'mdi-github' },
            { title: '仓库索引', to: '/scan', icon: 'mdi-credit-card-scan' }
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
            { title: '核心技术报告', to: '/', icon: 'mdi-atom', disabled: true },
            { title: '代码维基', to: '/', icon: 'mdi-wikipedia', disabled: true },
            { title: '仓库报刊', to: '/', icon: 'mdi-newspaper', disabled: true },
            { title: '公共配置镜像', to: '/', icon: 'mdi-mirror-rectangle', disabled: true },
            { title: '公共索引镜像', to: '/', icon: 'mdi-flash', disabled: true }
          ]
        },
        { title: 'IDE (研究预览版)', to: '/ide', icon: 'mdi-code-greater-than', standalone: true }
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
      showConfigSnackbar: false, // 控制提示气泡显示
      coreDialog: false,
      fmDialog: false,
      // 导航历史相关
      navigationHistory: [], // 导航历史记录
      currentHistoryIndex: -1, // 当前历史索引
      // 服务准备状态
      servicesReady: false // 核心和索引服务是否都已启动
    }
  },
  computed: {
    fmHttpChipColor() {
      if (this.fmHttpHealthState === '正在重启') return 'orange'
      if (this.fmHttpHealthState === '正在启动') return 'blue'
      if (this.fmHttpHealthState === '正在清理端口并重启AI索引') return 'grey'
      else if (this.fmHttpHealthState === '已启动') return 'purple'
      else if (this.fmHttpHealthState === '已关闭') return 'grey'
      else return 'grey'
    },
    fmHttpChipIcon() {
      if (this.fmHttpHealthState === '正在重启') return 'mdi-progress-clock'
      if (this.fmHttpHealthState === '正在启动') return 'mdi-progress-clock'
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
      if (this.appHealthState === '正在启动') return 'blue'
      if (this.appHealthState === '正在清理端口并重启核心服务') return 'grey'
      else if (this.appHealthState === '已启动') return 'purple'
      else if (this.appHealthState === '已关闭') return 'grey'
      else return 'grey'
    },
    chipIcon() {
      if (this.appHealthState === '正在重启') return 'mdi-progress-clock'
      if (this.appHealthState === '正在启动') return 'mdi-progress-clock'
      if (this.appHealthState === '正在清理端口并重启核心服务') return 'mdi-progress-clock'
      else if (this.appHealthState === '已启动') return 'mdi-check-circle'
      else if (this.appHealthState === '已关闭') return 'mdi-close-circle'
      else return 'mdi-help-circle'
    },
    healthChipColor() {
      if (this.healthState === 'ing') return 'grey'
      else if (this.healthState === 'yes') return 'green'
      else if (this.healthState === 'no') return 'red'
      else return 'grey'
    },
    healthChipIcon() {
      if (this.healthState === 'ing') return 'mdi-progress-clock'
      else if (this.healthState === 'yes') return 'mdi-check-circle'
      else if (this.healthState === 'no') return 'mdi-close-circle'
      else return 'mdi-help-circle'
    },
    // 判断父级菜单是否应该高亮（当前路由匹配其子菜单时）
    isParentMenuActive() {
      return (item) => {
        if (!item.children) return false
        return item.children.some((child) => this.$route.path === child.to)
      }
    },
    // 判断当前页面是否为独立页面（不需要等待服务启动）
    isStandalonePage() {
      return this.$route.meta && this.$route.meta.standalone
    }
  },
  async created() {
    this.detectSystemTheme()
    this.changeTip(this.appHealthState)
    console.log('初始 appHealthState:', this.appHealthState)

    // 立即执行一次服务状态检测
    await this.checkAllServicesStatus()

    // 定时器每 3 秒轮询检测各服务健康状态
    this.healthInterval = setInterval(async () => {
      await this.checkAllServicesStatus()
    }, 3000)
  },
  beforeUnmount() {
    if (this.healthInterval) {
      clearInterval(this.healthInterval)
    }
  },
  methods: {
    loadSidebarState() {
      try {
        const savedState = localStorage.getItem('githave-sidebar-state')
        if (savedState) {
          const state = JSON.parse(savedState)
          this.drawer = state.drawer !== undefined ? state.drawer : true
          this.isRailMode = state.isRailMode !== undefined ? state.isRailMode : false
        }
      } catch (error) {
        console.warn('Failed to load sidebar state from localStorage:', error)
        // 使用默认值
        this.drawer = true
        this.isRailMode = false
      }
    },
    saveSidebarState() {
      try {
        const state = {
          drawer: this.drawer,
          isRailMode: this.isRailMode
        }
        localStorage.setItem('githave-sidebar-state', JSON.stringify(state))
      } catch (error) {
        console.warn('Failed to save sidebar state to localStorage:', error)
      }
    },
    toggleDrawer() {
      if (!this.isRailMode) {
        this.drawer = true
        this.isRailMode = true
      } else {
        // 如果当前是关闭状态，直接展开
        this.drawer = true
        this.isRailMode = false
      }
      // 保存状态到localStorage
      this.saveSidebarState()
    },
    goBack() {
      // 保存当前操作到导航历史
      this.saveCurrentNavigationState('back')
      window.history.back()
    },
    goNext() {
      // 保存当前操作到导航历史
      this.saveCurrentNavigationState('forward')
      window.history.forward()
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
        const { success, version } = await window.electron.checkPythonIPC()

        if (!success) {
          this.pythonInstalled = false
          return false
        }

        // 使用正则表达式提取版本号
        const versionMatch = version.match(/^Python (\d+)\.(\d+)\.(\d+)$/)
        if (!versionMatch) {
          this.pythonInstalled = false
          return false
        }

        // 提取主版本号、次版本号、修订号
        const [, major, minor, patch] = versionMatch.map(Number)

        // 目标版本号
        const targetVersion = { major: 3, minor: 9, patch: 0 }

        // 比较版本号
        if (
          major > targetVersion.major ||
          (major === targetVersion.major && minor > targetVersion.minor) ||
          (major === targetVersion.major &&
            minor === targetVersion.minor &&
            patch > targetVersion.patch)
        ) {
          return true // 如果当前版本大于目标版本
        }

        return false // 如果当前版本小于或等于目标版本
      } catch {
        this.pythonInstalled = false
        return false
      }
    },
    async checkPandoc() {
      try {
        const { installed } = await window.electron.checkPandocIPC()
        this.pandocInstalled = installed
        return installed
      } catch {
        this.pandocInstalled = false
        return false
      }
    },
    async checkGit() {
      try {
        const { installed } = await window.electron.checkGitIPC()
        this.gitInstalled = installed
        return installed
      } catch {
        this.gitInstalled = false
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
      if (this.isTogglingFm) return
      this.isTogglingFm = true
      // 3 秒后恢复按钮可用
      setTimeout(() => {
        this.isTogglingFm = false
      }, 3000)

      try {
        const fmConfigResp = await window.electron.fmConfig()
        if (this.fmHttpHealthState === '已关闭') {
          const startResult = await window.electron.startFmHttp(fmConfigResp.configPath)
          if (startResult.started) {
            this.fmHttpHealthState = '已启动'
          }
        } else if (
          this.fmHttpHealthState === '已启动' ||
          this.fmHttpHealthState === '正在启动' ||
          this.fmHttpHealthState === '正在重启'
        ) {
          const stopResult = await window.electron.stopFmHttp()
          if (stopResult.stopped) {
            this.fmHttpHealthState = '已关闭'
          }
        }
      } catch (error) {
        console.error('切换 fm_http 服务状态失败：', error)
      }
    },
    async handleNav(item) {
      // 如果点击的是 IDE 路由
      if (item.to === '/ide') {
        // 二次确认
        const result = await confirm('是否确认打开 IDE？', '确认', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        if (!result) return
        // IDE 路由不保存到导航历史，因为它会打开新窗口
        // 构造要打开的完整 URL
        const url = `${window.location.origin}/#${item.to}`
        // 调用主进程打开新窗口
        await window.electron.openNewWindowIDE(url)
        return
      }

      // 保存当前导航项到历史记录（排除 standalone 路由）
      if (!item.standalone) {
        this.saveNavigationToHistory(item)
      }

      // 其他路由，使用 Vue Router 正常跳转
      this.$router.push(item.to)
    },
    async toggleCompactMode() {
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
      if (this.isTogglingApp) return
      this.isTogglingApp = true
      // 3 秒后恢复按钮可用
      setTimeout(() => {
        this.isTogglingApp = false
      }, 2000)

      try {
        const sysConfigResp = await window.electron.sysConfig()
        if (this.appHealthState === '已关闭') {
          const startResult = await window.electron.startApp(sysConfigResp.configPath)
          if (startResult.started) {
            this.appHealthState = '已启动'
          }
        } else if (
          this.appHealthState === '已启动' ||
          this.appHealthState === '正在启动' ||
          this.appHealthState === '正在重启'
        ) {
          const stopResult = await window.electron.stopApp()
          if (stopResult.stopped) {
            this.appHealthState = '已关闭'
          }
        }
      } catch (error) {
        console.error('切换 app 服务状态失败：', error)
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
    }, 300),
    async handleAppService(action) {
      if (this.isTogglingApp) return
      this.isTogglingApp = true
      setTimeout(() => {
        this.isTogglingApp = false
      }, 2000)
      try {
        const sysConfigResp = await window.electron.sysConfig()
        if (action === 'start') {
          await window.electron.startApp(sysConfigResp.configPath)
        } else if (action === 'stop') {
          await window.electron.stopApp()
        }
      } catch (error) {
        console.error('核心服务操作失败：', error)
      } finally {
        this.coreDialog = false
      }
    },
    async handleFmService(action) {
      if (this.isTogglingFm) return
      this.isTogglingFm = true
      setTimeout(() => {
        this.isTogglingFm = false
      }, 3000)
      try {
        const fmConfigResp = await window.electron.fmConfig()
        if (action === 'start') {
          await window.electron.startFmHttp(fmConfigResp.configPath)
        } else if (action === 'stop') {
          await window.electron.stopFmHttp()
        }
      } catch (error) {
        console.error('索引服务操作失败：', error)
      } finally {
        this.fmDialog = false
      }
    },

    // 获取重启对话框标题
    getRestartTitle() {
      switch (this.restartType) {
        case 'core':
          return '重启核心服务中'
        case 'fm':
          return '重启索引服务中'
        case 'both':
          return '重启所有服务中'
        default:
          return '重启服务中'
      }
    },

    // 获取重启对话框描述
    getRestartDescription() {
      switch (this.restartType) {
        case 'core':
          return '正在重启核心服务，这将停止当前服务并重新启动，请稍候...'
        case 'fm':
          return '正在重启索引服务，这将停止当前索引服务并重新启动，请稍候...'
        case 'both':
          return '正在重启所有服务，这将停止核心服务和索引服务并重新启动，请稍候...'
        default:
          return '正在重启服务，请稍候...'
      }
    },

    // 处理重启服务
    async handleRestartService(type) {
      if (this.isRestarting) return

      // 二次确认
      if (type === 'both') {
        const confirmed = confirm('您确定要重启所有服务吗？', '确认重启', {
          confirmButtonText: '重启',
          cancelButtonText: '取消'
        })
        if (!confirmed) return
      }

      this.restartType = type
      this.isRestarting = true
      this.showRestartDialog = true

      // 重置进度状态
      this.restartProgress.forEach((step) => {
        step.status = 'pending'
      })

      try {
        // 步骤1: 停止服务
        this.restartProgress[0].status = 'running'
        this.restartProgress[0].text =
          type === 'core' ? '停止核心服务' : type === 'fm' ? '停止索引服务' : '停止所有服务'

        if (type === 'core' || type === 'both') {
          try {
            await window.electron.stopApp()
          } catch (error) {
            console.warn('停止核心服务失败，可能已经停止:', error)
          }
        }

        if (type === 'fm' || type === 'both') {
          try {
            await window.electron.stopFmHttp()
          } catch (error) {
            console.warn('停止索引服务失败，可能已经停止:', error)
          }
        }

        this.restartProgress[0].status = 'completed'
        await new Promise((resolve) => setTimeout(resolve, 500))

        // 步骤2: 冷却等待
        this.restartProgress[1].status = 'running'
        this.restartProgress[1].text = '冷却等待 (3秒)'
        await new Promise((resolve) => setTimeout(resolve, 3000))
        this.restartProgress[1].status = 'completed'
        await new Promise((resolve) => setTimeout(resolve, 500))

        // 步骤3: 启动服务
        this.restartProgress[2].status = 'running'
        this.restartProgress[2].text =
          type === 'core' ? '启动核心服务' : type === 'fm' ? '启动索引服务' : '启动所有服务'

        if (type === 'core' || type === 'both') {
          const sysConfigResp = await window.electron.sysConfig()
          const startAppResult = await window.electron.startApp(sysConfigResp.configPath)
          if (!startAppResult.started) {
            throw new Error('启动核心服务失败')
          }
        }

        if (type === 'fm' || type === 'both') {
          const fmConfigResp = await window.electron.fmConfig()
          const startFmResult = await window.electron.startFmHttp(fmConfigResp.configPath)
          if (!startFmResult.started) {
            throw new Error('启动索引服务失败')
          }
        }

        this.restartProgress[2].status = 'completed'
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // 步骤4: 状态检测
        this.restartProgress[3].status = 'running'
        this.restartProgress[3].text = '检测服务状态'

        // 等待服务稳定
        await new Promise((resolve) => setTimeout(resolve, 2000))

        this.restartProgress[3].status = 'completed'
        await new Promise((resolve) => setTimeout(resolve, 500))

        // 步骤5: 完成
        this.restartProgress[4].status = 'running'
        this.restartProgress[4].text = '重启完成'
        await new Promise((resolve) => setTimeout(resolve, 1000))
        this.restartProgress[4].status = 'completed'

        // 显示成功消息
        this.$store.dispatch('snackbar/showSnackbar', {
          message: `${this.getServiceName(type)}重启完成`,
          color: 'success'
        })
      } catch (error) {
        console.error('重启服务失败:', error)

        // 标记当前步骤为失败
        const currentStepIndex = this.restartProgress.findIndex((step) => step.status === 'running')
        if (currentStepIndex !== -1) {
          this.restartProgress[currentStepIndex].status = 'error'
        }

        this.$store.dispatch('snackbar/showSnackbar', {
          message: `${this.getServiceName(type)}重启失败，请检查服务状态`,
          color: 'error'
        })
      } finally {
        this.isRestarting = false
        // 关闭相关对话框
        this.coreDialog = false
        this.fmDialog = false

        // 3秒后关闭进度对话框
        setTimeout(() => {
          this.showRestartDialog = false
        }, 3000)
      }
    },

    // 获取服务名称
    getServiceName(type) {
      switch (type) {
        case 'core':
          return '核心服务'
        case 'fm':
          return '索引服务'
        case 'both':
          return '所有服务'
        default:
          return '服务'
      }
    },

    // 保存导航项到历史记录
    saveNavigationToHistory(item) {
      try {
        // 检查是否应该保存此导航项
        if (!this.shouldSaveNavigation(item)) {
          return
        }

        const navigationData = {
          title: item.title,
          to: item.to,
          icon: item.icon,
          timestamp: Date.now(),
          type: 'navigation',
          standalone: item.standalone || false
        }

        // 更新导航历史数组
        this.navigationHistory.push(navigationData)

        // 限制历史记录数量，保留最近50条
        if (this.navigationHistory.length > 50) {
          this.navigationHistory = this.navigationHistory.slice(-50)
        }

        this.currentHistoryIndex = this.navigationHistory.length - 1

        // 保存到localStorage
        localStorage.setItem(
          'githave-navigation-history',
          JSON.stringify({
            history: this.navigationHistory,
            currentIndex: this.currentHistoryIndex,
            lastNavigation: navigationData
          })
        )
      } catch (error) {
        console.warn('保存导航历史失败:', error)
      }
    },

    // 判断是否应该保存导航项
    shouldSaveNavigation(item) {
      // 不保存 standalone 路由
      if (item.standalone) {
        return false
      }

      // 不保存特定路由
      const excludeRoutes = ['/ide', '/onboarding']
      if (excludeRoutes.includes(item.to)) {
        return false
      }

      return true
    },

    // 保存当前导航状态（用于返回上一步/下一步）
    saveCurrentNavigationState(action) {
      try {
        const currentRoute = this.$route
        const navigationData = {
          title: currentRoute.meta?.title || '未知页面',
          to: currentRoute.path,
          timestamp: Date.now(),
          type: action // 'back' 或 'forward'
        }

        // 更新导航历史数组
        this.navigationHistory.push(navigationData)

        // 限制历史记录数量
        if (this.navigationHistory.length > 50) {
          this.navigationHistory = this.navigationHistory.slice(-50)
        }

        this.currentHistoryIndex = this.navigationHistory.length - 1

        // 保存到localStorage
        localStorage.setItem(
          'githave-navigation-history',
          JSON.stringify({
            history: this.navigationHistory,
            currentIndex: this.currentHistoryIndex,
            lastNavigation: navigationData
          })
        )
      } catch (error) {
        console.warn('保存导航状态失败:', error)
      }
    },

    // 从localStorage加载导航历史
    loadNavigationHistory() {
      try {
        const savedData = localStorage.getItem('githave-navigation-history')
        if (savedData) {
          const data = JSON.parse(savedData)
          this.navigationHistory = data.history || []
          this.currentHistoryIndex = data.currentIndex || -1
          return data.lastNavigation
        }
      } catch (error) {
        console.warn('加载导航历史失败:', error)
      }
      return null
    },

    // 根据保存的导航历史初始化页面
    initializeFromSavedNavigation() {
      console.log('初始化导航历史', this.$route)
      const lastNavigation = this.loadNavigationHistory()

      // 检查是否应该恢复导航历史
      const shouldRestore = this.shouldRestoreNavigation(lastNavigation)

      if (shouldRestore && lastNavigation && lastNavigation.to && this.$route.path === '/') {
        console.log('从保存的导航历史恢复到:', lastNavigation)
        this.$router.push(lastNavigation.to).catch((err) => {
          console.warn('恢复导航失败:', err)
        })
      }
    },

    // 判断是否应该恢复导航历史
    shouldRestoreNavigation(lastNavigation) {
      if (!lastNavigation || !lastNavigation.to) {
        return false
      }

      // 排除 standalone 路由（如 IDE、onboarding 等）
      const standaloneRoutes = ['/ide', '/onboarding']
      if (standaloneRoutes.includes(lastNavigation.to)) {
        return false
      }

      // 检查路由配置中的 standalone 属性
      const route = this.$router.getRoutes().find((r) => r.path === lastNavigation.to)
      if (route && route.meta && route.meta.standalone) {
        return false
      }

      // 检查当前窗口是否是新打开的 IDE 窗口
      // 通过检查 URL hash 或其他标识来判断
      if (window.location.hash.includes('/ide')) {
        return false
      }

      return true
    },

    // 检查所有服务状态
    async checkAllServicesStatus() {
      // —— App 服务健康检测 ——
      try {
        const result = await window.electron.checkAppHealth()
        if (result && result.state === '已启动') {
          // 二次调用 HTTP 接口，检查状态码
          try {
            const resp = await appHealthCheck()
            if (resp.status === 200) {
              this.appHealthState = '已启动'
            } else {
              this.appHealthState = '正在启动'
            }
          } catch (err) {
            console.error('App HTTP 接口检查失败：', err)
            this.appHealthState = '正在启动'
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
        if (result && result.state === '已启动') {
          try {
            const resp = await fmHealthCheck()
            const faiss_resp = await faissHealthCheck()
            if (resp.status === 200 && faiss_resp.status === 200) {
              this.fmHttpHealthState = '已启动'
            } else {
              this.fmHttpHealthState = '正在启动'
            }
          } catch (err) {
            console.error('FM HTTP 接口检查失败：', err)
            this.fmHttpHealthState = '正在启动'
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
      this.healthState = python && pandoc && git ? 'yes' : 'no'

      // 更新服务准备状态：核心服务和索引服务都已启动才算准备就绪
      this.servicesReady = this.appHealthState === '已启动' && this.fmHttpHealthState === '已启动'
    }
  },
  watch: {
    isCompactMode: {
      immediate: true,
      handler: async function (val) {
        await window.electron.setZoomFactor(val ? 0.8 : 1)
        // 可选：强制刷新布局
        window.dispatchEvent(new Event('resize'))
      }
    },
    navItems: {
      handler: 'saveNavState',
      deep: true
    },
    // 监听 healthState，一旦变为 'no' 就弹出气泡
    healthState(newVal) {
      if (newVal === 'no') {
        this.showConfigSnackbar = true
      }
    },
    // 监听路由变化，自动保存导航历史
    $route(to, from) {
      // 避免初始化时的重复记录
      if (!from.name) {
        return
      }

      // 构造导航项数据
      const navigationItem = {
        title: to.meta?.title || to.name || '未知页面',
        to: to.path,
        icon: to.meta?.icon || 'mdi-file-document-outline',
        timestamp: Date.now(),
        type: 'route-change',
        standalone: to.meta?.standalone || false
      }

      // 保存到导航历史（会自动过滤不需要保存的路由）
      this.saveNavigationToHistory(navigationItem)
    }
  },
  async mounted() {
    // 从localStorage恢复侧边栏状态
    this.loadSidebarState()

    // 初始化导航历史
    this.initializeFromSavedNavigation()

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
    height: calc(100vh - 60px);
    overflow-y: auto;
  }
}

/* 紧凑模式样式 */
.compact-btn {
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
}

.compact-switch {
  transform: scale(0.85);
  margin-right: -8px !important;
}

/* 减少chip之间的间距 */
.v-chip.ml-1 {
  margin-left: 6px !important;
  margin-right: 2px !important;
  font-size: 0.75rem !important;
  height: 24px !important;
}

/* 减少按钮间距 */
.v-btn.ml-1 {
  margin-left: 6px !important;
}

/* 顶部工具栏整体紧凑化 */
.v-app-bar {
  padding-left: 8px !important;
  padding-right: 8px !important;
}

.v-toolbar-title {
  font-size: 1rem !important;
  margin-left: 8px !important;
}

:deep(.v-toolbar__content) {
  /* height: 48px !important; */
  padding-bottom: 0px !important;
  margin-bottom: 0px !important;
}

/* 加载页面样式 */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 64px);
  padding: 24px;
}

.loading-content {
  text-align: center;
  max-width: 400px;
  width: 100%;
}

.service-status {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 24px 0;
}

.status-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 8px 16px;
  background-color: rgba(var(--v-theme-surface-variant), 0.1);
  border-radius: 8px;
  font-size: 0.875rem;
}

.skeleton-container {
  max-width: 300px;
  margin: 0 auto;
}
</style>
