<template>
  <v-app>
    <!-- 侧边抽屉 -->
    <v-navigation-drawer
      v-model="drawer"
      app
      rail
      :dark="isDark"
      :color="isDark ? 'black' : 'white'"
      :style="isWindows ? 'padding-top: 30px' : 'padding-top: 30px'"
      width="72"
      class="drag-region app-drawer"
    >
      <v-list dense>

        <v-divider></v-divider>

        <!-- 遍历导航项 -->
        <template v-for="(item, index) in navItems" :key="item.title">
          <v-list-item
            v-if="!item.children"
            class="no-drag-region"
            :prepend-icon="item.icon"
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

          <!-- 有子菜单时使用悬浮菜单 -->
          <v-menu
            v-if="item.children"
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
        </template>

        <v-divider class="my-2"></v-divider>

        <!-- 功能按钮区域 -->
        <!-- 环境状态 -->
        <v-list-item class="no-drag-region" @click="goToConfig">
          <v-tooltip activator="parent" location="end"> 环境配置 </v-tooltip>
          <template #prepend>
            <v-icon :color="healthChipColor" size="small">{{ healthChipIcon }}</v-icon>
          </template>
        </v-list-item>

        <!-- 核心服务 -->
        <v-list-item class="no-drag-region" :disabled="isTogglingApp" @click="coreDialog = true">
          <v-tooltip activator="parent" location="end"> 核心服务管理 </v-tooltip>
          <template #prepend>
            <v-icon :color="chipColor" size="small">{{ chipIcon }}</v-icon>
          </template>
        </v-list-item>

        <!-- 索引服务 -->
        <v-list-item class="no-drag-region" :disabled="isTogglingFm" @click="fmDialog = true">
          <v-tooltip activator="parent" location="end"> 索引服务管理 </v-tooltip>
          <template #prepend>
            <v-icon :color="fmHttpChipColor" size="small">{{ fmHttpChipIcon }}</v-icon>
          </template>
        </v-list-item>

        <!-- 重新加载 -->
        <v-list-item class="no-drag-region" @click="reloadPage">
          <v-tooltip activator="parent" location="end"> 重新加载 </v-tooltip>
          <template #prepend>
            <v-icon size="small">mdi-refresh</v-icon>
          </template>
        </v-list-item>

        <!-- 重启所有服务 -->
        <v-list-item
          class="no-drag-region"
          :disabled="isRestarting"
          @click="handleRestartService('both')"
        >
          <v-tooltip activator="parent" location="end"> 重启所有服务 </v-tooltip>
          <template #prepend>
            <v-icon size="small">mdi-laptop</v-icon>
          </template>
        </v-list-item>

        <!-- 切换显示模式 -->
        <v-list-item class="no-drag-region" @click="toggleCompactMode">
          <v-tooltip activator="parent" location="end">
            {{ isCompactMode ? '切换到标准显示' : '切换到紧凑显示' }}
          </v-tooltip>
          <template #prepend>
            <v-icon size="small">{{
              isCompactMode ? 'mdi-magnify-plus' : 'mdi-magnify-minus'
              }}</v-icon>
          </template>
        </v-list-item>

        <!-- 控制台 -->
        <v-list-item class="no-drag-region" @click="toggleLogConsole">
          <v-tooltip activator="parent" location="end"> 打开控制台 </v-tooltip>
          <template #prepend>
            <v-icon size="small">mdi-console</v-icon>
          </template>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- 顶部标签栏 -->
    <div class="tabs-toolbar drag-region" :class="{ 'dark-toolbar': isDark }">
      <div class="tabs-container drag-region">
        <!-- 导航：返回 / 前进 -->
        <div class="toolbar-nav-buttons no-drag-region mr-2">
          <v-btn size="small" variant="text" :disabled="!canGoBack" @click="goBackCurrentTab">
            <v-icon size="small">mdi-arrow-left</v-icon>
          </v-btn>
          <v-btn size="small" variant="text" :disabled="!canGoForward" @click="goForwardCurrentTab">
            <v-icon size="small">mdi-arrow-right</v-icon>
          </v-btn>
        </div>
        <div class="tabs-scroll-wrapper">
          <v-btn
            icon
            size="small"
            variant="text"
            class="mr-1 no-drag-region"
            :disabled="!tabsCanScrollPrev"
            @click="pageTabs('prev')"
          >
            <v-icon size="small">mdi-chevron-left</v-icon>
          </v-btn>
          <div class="tabs-viewport">
            <v-tabs
              ref="tabsRef"
              v-if="openTabs.length > 0"
              v-model="activeTabIndex"
              density="compact"
              height="40"
              show-arrows
              class="tabs-wrapper"
            >
              <v-tab
                v-for="(tab, index) in openTabs"
                :key="tab.id"
                :value="index"
                class="tab-item no-drag-region"
                :draggable="true"
                @dragstart="onTabDragStart(index)"
                @dragover.prevent
                @drop="onTabDrop(index)"
                @click="switchToTab(tab)"
              >
                <v-icon v-if="tab.icon" size="small" class="mr-2">{{ tab.icon }}</v-icon>
                <span class="tab-text">{{ tab.title }}</span>
                <v-btn
                  v-if="tab.closable"
                  size="x-small"
                  variant="text"
                  class="tab-close-btn ml-1"
                  @click.stop="closeTab(index)"
                >
                  <v-icon size="12">mdi-close</v-icon>
                </v-btn>
              </v-tab>
            </v-tabs>
          </div>
          <v-btn
            icon
            size="small"
            variant="text"
            class="ml-1 no-drag-region"
            :disabled="!tabsCanScrollNext"
            @click="pageTabs('next')"
          >
            <v-icon size="small">mdi-chevron-right</v-icon>
          </v-btn>
        </div>
        <div v-if="openTabs.length === 0" class="empty-tabs">
          <span class="text-caption text-medium-emphasis">暂无打开的页面</span>
        </div>
      </div>

      <!-- 右侧主题指示器 -->
      <div class="toolbar-right no-drag-region">
      </div>
    </div>
    <!-- 主体区域：条件渲染 router-view 或加载状态 -->
    <v-main class="custom-main">
      <!-- 服务未准备就绪时显示加载状态 -->
      <div
        v-if="!servicesReady && !isStandalonePage && !isBypassLoadingPage"
        class="loading-container"
      >
        <div class="loading-content">
          <v-progress-circular
            indeterminate
            size="x-small"
            color="primary"
            class="mb-4"
          ></v-progress-circular>
          <h3 class="text-h6 mb-2">正在等待服务启动...</h3>
          <p class="text-body-2 text-medium-emphasis mb-4">请等待核心服务和索引服务启动完成</p>

          <!-- 服务状态显示 -->
          <div class="service-status">
            <!-- 一键重启所有服务按钮（只要有一个服务异常就显示） -->
            <v-btn
              v-if="appHealthState !== '已启动' || fmHttpHealthState !== '已启动'"
              variant="text"
              color="error"
              size="small"
              class="ml-4"
              @click="handleRestartService('both')"
            >
              <span>有异常？点我一键重启所有服务</span>
            </v-btn>
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

          <!-- 实时日志显示 -->
          <div v-if="serviceLogs.length > 0" class="service-logs mt-4">
            <h4 class="text-subtitle-2 mb-2">启动日志</h4>
            <div class="log-container">
              <div
                v-for="(log, index) in serviceLogs.slice(-10).reverse()"
                :key="index"
                class="log-entry"
                :class="{
                  'log-info': log.type === 'info',
                  'log-error': log.type === 'error',
                  'log-success': log.type === 'success'
                }"
              >
                <v-icon
                  :color="
                    log.type === 'error' ? 'error' : log.type === 'success' ? 'success' : 'info'
                  "
                  size="small"
                  class="mr-2"
                >
                  {{
                  log.type === 'error'
                  ? 'mdi-alert-circle'
                  : log.type === 'success'
                  ? 'mdi-check-circle'
                  : 'mdi-information'
                  }}
                </v-icon>
                <span class="log-service">[{{ log.serviceName === 'app' ? '核心' : '索引' }}]</span>
                <span class="log-message">{{ log.message }}</span>
                <span class="log-time">{{ formatLogTime(log.timestamp) }}</span>
              </div>
            </div>
          </div>

          <!-- 骨架屏 -->
          <!-- <div class="skeleton-container mt-6">
            <v-skeleton-loader type="card" class="mb-4"></v-skeleton-loader>
            <v-skeleton-loader type="list-item-two-line" class="mb-2"></v-skeleton-loader>
            <v-skeleton-loader type="list-item-two-line" class="mb-2"></v-skeleton-loader>
          </div> -->
        </div>
      </div>

      <!-- 服务准备就绪或独立页面时显示正常内容 -->
      <RouterView v-else v-slot="{ Component }">
        <Suspense>
          <KeepAlive>
            <component :is="Component" :key="viewCacheKey" />
          </KeepAlive>
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
        <v-card-title class="d-flex align-center pa-4">
          <v-icon class="mr-2" size="small">mdi-laptop</v-icon>
          <span class="text-subtitle-1 font-weight-medium">核心服务管理</span>
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
        <v-card-title class="d-flex align-center pa-4">
          <v-icon class="mr-2" size="small">mdi-flash</v-icon>
          <span class="text-subtitle-1 font-weight-medium">索引服务管理</span>
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

    <!-- 重启服务进度对话框（Ant Design） -->
    <a-modal
      v-model:open="showRestartDialog"
      :closable="false"
      :mask-closable="false"
      :footer="null"
      width="720px"
    >
      <template #title>
        <div class="d-flex align-center">
          <SyncOutlined style="color: #1677ff" class="mr-2" />
          {{ getRestartTitle() }}
        </div>
      </template>

      <div class="mb-3 text-caption">
        {{ getRestartDescription() }}
      </div>

      <a-steps direction="vertical" size="small">
        <a-step
          v-for="step in restartProgress"
          :key="step.step"
          :title="`${step.step}. ${step.text}`"
          :status="antStepStatusMap[step.status]"
        >
          <template #icon>
            <LoadingOutlined v-if="step.status === 'running'" />
            <CheckCircleTwoTone v-else-if="step.status === 'completed'" two-tone-color="#52c41a" />
            <CloseCircleTwoTone v-else-if="step.status === 'error'" two-tone-color="#ff4d4f" />
            <span
              v-else
              style="
                display: inline-block;
                width: 14px;
                height: 14px;
                border: 1px solid #d9d9d9;
                border-radius: 50%;
              "
            ></span>
          </template>
        </a-step>
      </a-steps>

      <!-- 服务日志显示区域 -->
      <div v-if="showServiceLogs && serviceLogs.length > 0" class="service-logs-container mt-3">
        <div class="service-logs-header">
          <span class="service-logs-title">服务日志</span>
          <a-tag
            :color="serviceLogListening ? 'success' : 'default'"
            class="ml-2"
            style="height: 18px; line-height: 18px"
          >
            {{ serviceLogListening ? '监听中' : '已停止' }}
          </a-tag>
        </div>
        <div class="service-logs-content">
          <div
            v-for="log in serviceLogs"
            :key="log.id"
            class="service-log-entry"
            :class="`log-${log.type}`"
          >
            <span class="log-time">{{ formatLogTime(log.timestamp) }}</span>
            <span
              class="log-icon"
              :style="{
                color:
                  log.type === 'error' ? '#ff4d4f' : log.type === 'success' ? '#52c41a' : '#1677ff'
              }"
            >●</span
            >
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>

      <div class="mt-3">
        <a-progress
          :percent="restartPercent"
          :status="restartHasError ? 'exception' : isRestarting ? 'active' : 'normal'"
        />
      </div>

      <div v-if="!isRestarting" style="text-align: right; margin-top: 8px">
        <a-button type="link" @click="showRestartDialog = false">关闭</a-button>
      </div>
    </a-modal>
    <!-- 日志控制台 -->
    <LogConsole
      v-model="showLogConsole"
      :logs="serviceLogs"
      :max-log-entries="maxServiceLogEntries"
      @clear-logs="clearServiceLogs"
      @add-log="addServiceLogEntry"
    />

    <!-- 导入索引确认弹窗 -->
    <v-dialog :key="'import-' + dialogNonce" v-model="importDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title class="d-flex align-center pa-4">
          <v-icon class="mr-2" color="primary">mdi-download</v-icon>
          <span class="text-h6">导入索引文件</span>
        </v-card-title>

        <v-card-text v-if="operationData" class="pa-4">
          <div class="mb-4">
            <v-alert type="info" variant="tonal" density="compact" class="mb-3">
              检测到索引文件导入请求
            </v-alert>

            <div class="mb-3">
              <strong>仓库地址：</strong>
              <v-chip color="primary" variant="outlined" size="small" class="ml-2">
                {{ operationData.github }}
              </v-chip>
            </div>

            <div class="mb-3">
              <strong>索引文件：</strong>
              <v-chip color="secondary" variant="outlined" size="small" class="ml-2">
                {{ operationData.filename }}
              </v-chip>
            </div>

            <v-alert type="warning" variant="tonal" density="compact" class="mb-3">
              <strong>注意：</strong>此操作将覆盖目标仓库的现有索引内容！
            </v-alert>
          </div>
        </v-card-text>

        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" size="small" @click="cancelImportOperation">
            取消
          </v-btn>
          <v-btn color="primary" variant="elevated" size="small" @click="confirmImportOperation">
            确认导入
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 克隆仓库确认弹窗 -->
    <v-dialog :key="'clone-' + dialogNonce" v-model="cloneDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title class="d-flex align-center pa-4">
          <v-icon class="mr-2" color="success">mdi-git</v-icon>
          <span class="text-h6">克隆仓库</span>
        </v-card-title>

        <v-card-text v-if="operationData" class="pa-4">
          <div class="mb-4">
            <v-alert type="info" variant="tonal" density="compact" class="mb-3">
              检测到仓库克隆请求
            </v-alert>

            <div class="mb-3">
              <strong>仓库地址：</strong>
              <v-chip color="primary" variant="outlined" size="small" class="ml-2">
                {{ operationData.github }}
              </v-chip>
            </div>

            <div class="mb-3">
              <strong>仓库名称：</strong>
              <v-chip color="secondary" variant="outlined" size="small" class="ml-2">
                {{ operationData.owner }}/{{ operationData.repo }}
              </v-chip>
            </div>

            <div class="mb-3">
              <strong>分支：</strong>
              <v-chip color="info" variant="outlined" size="small" class="ml-2">
                {{ operationData.branch || 'main' }}
              </v-chip>
            </div>

            <div v-if="operationData.description" class="mb-3">
              <strong>描述：</strong>
              <p class="text-body-2 mt-1">{{ operationData.description }}</p>
            </div>

            <!-- 路径选择选项 -->
            <div class="mb-3">
              <v-radio-group v-model="cloneMode" inline>
                <v-radio label="快速克隆（默认目录）" value="quick"></v-radio>
                <v-radio label="自定义目录" value="custom"></v-radio>
              </v-radio-group>
            </div>

            <!-- 默认路径显示 -->
            <div v-if="cloneMode === 'quick'" class="mb-2">
              <p class="text-body-2 text-grey-600">
                <strong>本地路径：</strong> 你的用户根目录/githave/{{ operationData.repo }}
              </p>
            </div>

            <!-- 自定义目录选择 -->
            <div v-if="cloneMode === 'custom'" class="mb-2">
              <v-text-field
                v-model="customClonePath"
                label="选择保存目录"
                readonly
                variant="outlined"
                density="compact"
                append-inner-icon="mdi-folder-open"
                placeholder="点击选择目录"
                @click:append-inner="selectCloneDirectory"
                @click="selectCloneDirectory"
              ></v-text-field>
              <p v-if="customClonePath" class="text-body-2 text-grey-600 mt-1">
                <strong>完整路径：</strong> {{ customClonePath }}/{{ operationData.repo }}
              </p>
            </div>
          </div>
        </v-card-text>

        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" size="small" @click="cancelCloneOperation">
            取消
          </v-btn>
          <v-btn color="success" variant="elevated" size="small" @click="confirmCloneOperation">
            确认克隆
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 操作进度弹窗 -->
    <v-dialog v-model="operationProgress" max-width="500px" persistent>
      <v-card>
        <v-card-title class="d-flex align-center pa-4">
          <v-icon class="mr-2" color="primary">mdi-progress-clock</v-icon>
          <span class="text-h6">操作进行中</span>
        </v-card-title>

        <v-card-text class="pa-4">
          <div class="text-center mb-4">
            <p class="text-body-1 mb-3">{{ progressText }}</p>
            <v-progress-linear
              :model-value="progressValue"
              color="primary"
              height="8"
              rounded
            ></v-progress-linear>
            <p class="text-caption mt-2">{{ progressValue }}%</p>

            <!-- 网络速度显示 -->
            <div v-if="networkSpeed.show" class="mt-3 pa-2 bg-grey-lighten-5 rounded">
              <div class="d-flex justify-space-between align-center mb-1">
                <span class="text-caption text-grey-darken-1">
                  <v-icon size="small" class="mr-1">mdi-download</v-icon>
                  下载速度
                </span>
                <span class="text-caption font-weight-bold text-primary">
                  {{ networkSpeed.downloadSpeedFormatted }}
                </span>
              </div>
              <div class="text-center mt-1">
                <span class="text-caption text-grey-darken-2">
                  网络接口: {{ networkSpeed.interface }}
                </span>
              </div>
            </div>
          </div>
        </v-card-text>

        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" size="small" @click="hideProgressDialog">
            <v-icon left size="small">mdi-eye-off</v-icon>
            隐藏并后台运行
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 重复克隆确认弹窗 -->
    <v-dialog v-model="duplicateCloneDialog" max-width="500px" persistent>
      <v-card>
        <v-card-title class="d-flex align-center pa-4">
          <v-icon class="mr-2" color="warning">mdi-alert</v-icon>
          <span class="text-h6">重复仓库提醒</span>
        </v-card-title>

        <v-card-text v-if="operationData" class="pa-4">
          <v-alert type="warning" variant="tonal" density="compact" class="mb-3">
            你已经克隆过 <strong>{{ operationData.github }}</strong> 了
          </v-alert>
          <p class="text-body-1">是否还要新增一个？</p>
        </v-card-text>

        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" size="small" @click="cancelDuplicateClone">
            取消
          </v-btn>
          <v-btn color="warning" variant="elevated" size="small" @click="confirmDuplicateClone">
            仍要新增
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 仓库选择弹窗 -->
    <v-dialog
      :key="'repo-select-' + dialogNonce"
      v-model="repoSelectionDialog"
      max-width="600px"
      persistent
    >
      <v-card>
        <v-card-title class="d-flex align-center pa-4">
          <v-icon class="mr-2" color="primary">mdi-source-repository</v-icon>
          <span class="text-h6">选择目标仓库</span>
        </v-card-title>

        <v-card-text class="pa-4">
          <v-alert type="info" variant="tonal" density="compact" class="mb-3">
            发现多个相同URL的仓库，请选择要导入索引的目标仓库
          </v-alert>

          <v-radio-group v-model="selectedRepo">
            <v-radio v-for="repo in duplicateRepos" :key="repo.id" :value="repo" class="mb-2">
              <template #label>
                <div class="d-flex flex-column">
                  <span class="font-weight-medium">{{ repo.name }}</span>
                  <span class="text-caption text-grey"
                  >ID: {{ repo.id }} | 路径: {{ repo.local_path }}</span
                  >
                  <span class="text-caption text-grey"
                  >创建时间: {{ new Date(repo.created_at).toLocaleString() }} | 描述：{{
                      omitDesc(repo.desc, 20)
                    }}</span
                  >
                </div>
              </template>
            </v-radio>
          </v-radio-group>
        </v-card-text>

        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" size="small" @click="cancelRepoSelection">
            取消
          </v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            size="small"
            :disabled="!selectedRepo"
            @click="confirmRepoSelection"
          >
            确认选择
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script>
import _ from 'lodash'
import bannerSrc from '../assets/banner_v3_low.png'
import titleSrc from '../assets/title.svg'
import titleNSrc from '../assets/title-night.svg'
import { RouterView } from 'vue-router'
import { fmHealthCheck, appHealthCheck, faissHealthCheck } from '../service/api'
import LogConsole from './LogConsole.vue'
import {
  SyncOutlined,
  LoadingOutlined,
  CheckCircleTwoTone,
  CloseCircleTwoTone
} from '@ant-design/icons-vue'
import { omit } from '../service/str'

export default {
  name: 'MainLayout',
  components: {
    RouterView,
    LogConsole,
    SyncOutlined,
    LoadingOutlined,
    CheckCircleTwoTone,
    CloseCircleTwoTone
  },
  data() {
    return {
      isTogglingApp: false, // 核心服务按钮防连点
      isTogglingFm: false, // 索引服务按钮防连点
      isCompactMode: true, // 紧凑模式开关
      // 标签页管理
      openTabs: [], // 打开的标签页列表
      lastNavigatedTabId: null, // 记录最近一次导航的标签ID，用于重复路由时定位激活标签
      draggingTabIndex: null, // 当前正在拖拽的标签索引
      tabTitleUnwatch: null,
      tabsCanScrollPrev: false,
      tabsCanScrollNext: false,
      activeTabIndex: 0, // 当前激活的标签页索引
      tabIdCounter: 0, // 标签页ID计数器
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
      // 服务日志相关
      maxServiceLogEntries: 6000,
      showServiceLogs: false,
      serviceLogListening: false,
      navItems: [
        { title: '快速开始', to: '/start', icon: 'mdi-home' },
        { title: '脉络感知', to: '/module-graphs', icon: 'mdi-chart-bar-stacked' },
        { title: '空间透镜', to: '/space', icon: 'mdi-telescope' },
        { title: '深度搜索', to: '/search', icon: 'mdi-book-search' },
        { title: '文件枢纽', to: '/report', icon: 'mdi-microsoft-word' },
        { title: '提交审查', to: '/commits/history', icon: 'mdi-github' },
        // { title: '代码记忆', to: '/memory', icon: 'mdi-brain' },
        { title: '代码视窗', to: '/finder', icon: 'mdi-code-block-tags' },
        { title: '推送机器人', to: '/sender', icon: 'mdi-robot' },
        // { title: "Ant Design 演示", to: "/ant-design-demo", icon: "mdi-palette" },
        // { title: 'Monaco测试', to: '/monaco-demo', icon: 'mdi-code-braces' },
        {
          title: '代码管理',
          icon: 'mdi-source-repository',
          expanded: false,
          children: [
            { title: '仓库', to: '/repo', icon: 'mdi-github' },
            { title: '上下文索引', to: '/scan', icon: 'mdi-credit-card-scan' }
          ]
        },
        {
          title: '配置管理',
          icon: 'mdi-cogs',
          expanded: false,
          children: [
            { title: '模型', to: '/model', icon: 'mdi-cards-playing-club-multiple-outline' },
            { title: '智能体', to: '/agent', icon: 'mdi-robot-happy-outline' }
          ]
        }
        // { title: 'IDE (研究预览版)', to: '/ide', icon: 'mdi-code-greater-than', standalone: true }
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
      servicesReady: false, // 核心和索引服务是否都已启动
      // 服务日志相关
      serviceLogs: [], // 服务启动日志
      serviceLogListener: null, // 日志监听器清理函数
      maxLogEntries: 50, // 最大日志条目数
      showLogConsole: false, // 控制日志控制台显示
      // 协议操作弹窗相关
      importDialog: false, // 导入索引确认弹窗
      cloneDialog: false, // 克隆仓库确认弹窗
      operationData: null, // 当前操作数据
      operationProgress: false, // 操作进度弹窗
      progressText: '正在处理...',
      progressValue: 0,
      // 重复仓库处理弹窗
      duplicateCloneDialog: false, // 重复克隆确认弹窗
      repoSelectionDialog: false, // 仓库选择弹窗
      duplicateRepos: [], // 重复的仓库列表
      selectedRepo: null, // 用户选择的仓库
      // 克隆路径选择
      cloneMode: 'quick', // 'quick' 或 'custom'
      customClonePath: '', // 自定义克隆路径
      // 网络速度监控
      networkSpeed: {
        show: false,
        downloadSpeed: 0,
        uploadSpeed: 0,
        downloadSpeedFormatted: '0 B/s',
        uploadSpeedFormatted: '0 B/s',
        interface: ''
      },
      // 弹窗强制重挂载计数器
      dialogNonce: 0
    }
  },
  computed: {
    canGoBack() {
      const tab = this.openTabs[this.activeTabIndex]
      if (!tab || !tab.history) return false
      return tab.history.index > 0
    },
    canGoForward() {
      const tab = this.openTabs[this.activeTabIndex]
      if (!tab || !tab.history) return false
      return tab.history.index < tab.history.stack.length - 1
    },
    // 当前活动标签的唯一缓存键（标签ID + 路由完整路径）
    viewCacheKey() {
      const tabId = this.openTabs[this.activeTabIndex]?.id || 0
      const routeKey = this.$route.fullPath || this.$route.path
      return `${tabId}:${routeKey}`
    },
    antStepStatusMap() {
      return { pending: 'wait', running: 'process', completed: 'finish', error: 'error' }
    },
    restartHasError() {
      return this.restartProgress.some((s) => s.status === 'error')
    },
    restartPercent() {
      const total = this.restartProgress.length || 1
      const done = this.restartProgress.filter((s) => s.status === 'completed').length
      const running = this.restartProgress.some((s) => s.status === 'running')
      let pct = Math.round((done / total) * 100)
      if (running && pct < 95) pct += 5
      return Math.min(pct, 100)
    },
    isWindows() {
      return navigator.platform.indexOf('Win') > -1
    },
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
      else if (this.appHealthState === '已启动') return 'mdi-heart-multiple'
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
      else if (this.healthState === 'yes') return 'mdi-hospital-box'
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
    },
    // 判断当前路由是否需要绕过加载页面
    isBypassLoadingPage() {
      const standaloneRoutes = ['/', '/start', '/ide', '/model']
      return standaloneRoutes.includes(this.$route.path)
    }
  },
  async created() {
    this.detectSystemTheme()
    this.changeTip(this.appHealthState)
    console.log('初始 appHealthState:', this.appHealthState)

    // 设置服务日志监听器
    this.setupServiceLogListener()

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
    // 清理服务日志监听器
    if (this.serviceLogListener) {
      this.serviceLogListener()
    }
    // 无需清理 tabTitleUnwatch
    window.removeEventListener('resize', this.updateTabsScrollState)
    window.removeEventListener('tabs:set-title', this.onSetTabTitle)
    window.removeEventListener('addNewTab', this.onAddNewTab)
  },
  methods: {
    // 接收子页面事件，更新当前活动标签标题
    onSetTabTitle(e) {
      try {
        const title = e?.detail?.title
        if (!title) return
        const active = this.openTabs[this.activeTabIndex]
        if (active) {
          active.title = title
          // 标记该标签具有自定义标题，防止被路由变化覆盖
          active.hasCustomTitle = true
        }
      } catch (err) {
        console.warn('更新标签标题失败:', err)
      }
    },

    // 处理新增标签页事件
    onAddNewTab(event) {
      try {
        const { route, title } = event?.detail || {}
        if (!route) {
          console.warn('新增标签页事件缺少路由信息')
          return
        }
        
        console.log('收到新增标签页事件:', { route, title })
        
        // 创建新标签页
        const newTab = {
          id: ++this.tabIdCounter,
          title: title || route,
          to: route,
          icon: this.getRouteIcon(route),
          closable: true,
          history: { stack: [route], index: 0 }
        }

        this.openTabs.push(newTab)
        this.activeTabIndex = this.openTabs.length - 1
        this.lastNavigatedTabId = newTab.id

        // 跳转到新页面
        this.$router.push(route)
        
        console.log('新增标签页成功:', newTab)
      } catch (err) {
        console.error('新增标签页失败:', err)
      }
    },

    // 根据路由获取对应的图标
    getRouteIcon(route) {
      const routeIconMap = {
        '/space': 'mdi-telescope',
        '/search': 'mdi-book-search',
        '/report': 'mdi-microsoft-word',
        '/commits/history': 'mdi-github',
        '/finder': 'mdi-code-block-tags',
        '/sender': 'mdi-robot',
        '/model': 'mdi-cards-playing-club-multiple-outline',
        '/scan': 'mdi-credit-card-scan',
        '/agent': 'mdi-robot-happy-outline',
        '/repo': 'mdi-github',
        '/term': 'mdi-console'
      }
      return routeIconMap[route] || 'mdi-file-document-outline'
    },
    // 根据当前路由动态生成标签标题
    buildTabTitleFromRoute(route) {
      try {
        const base = route.meta?.title || route.name || '页面'
        // 优先从 params 中提取有意义的尾段
        const getLast = (p) => {
          if (!p) return ''
          try {
            const s = decodeURIComponent(p)
            const segs = s.split(/[/\\]/).filter(Boolean)
            return segs[segs.length - 1] || s
          } catch (e) {
            return p
          }
        }

        let extra = ''
        if (route.params && route.params.localPath) {
          extra = getLast(route.params.localPath)
        } else if (route.query && route.query.repoPath) {
          extra = getLast(route.query.repoPath)
        } else if (route.query && route.query.rootPath) {
          extra = getLast(route.query.rootPath)
        }

        // 针对常见页面优化标题
        if (route.name === 'finder' || route.name === 'ide' || route.name === 'space') {
          return extra ? `${base} · ${extra}` : base
        }
        if (route.name === 'moduleGraphs') {
          return extra ? `${base} · ${extra}` : base
        }
        return base
      } catch (e) {
        return route.meta?.title || route.name || '页面'
      }
    },
    omitDesc(str, limit) {
      return omit(str, limit)
    },
    // 初始化默认标签页
    initializeDefaultTab() {
      // 如果没有打开的标签页，创建默认的首页标签
      if (this.openTabs.length === 0) {
        const currentPath = this.$route?.fullPath || this.$route?.path || '/start'
        const defaultTab = {
          id: ++this.tabIdCounter,
          title: '快速开始',
          to: currentPath,
          icon: 'mdi-home',
          closable: true, // 默认标签页可关闭
          history: { stack: [currentPath], index: 0 }
        }
        this.openTabs.push(defaultTab)
        this.activeTabIndex = 0
      }
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
      // 二次确认
      const confirmed = confirm('确定要跳转到配置页吗？')
      if (!confirmed) return
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

    updateTabsScrollState() {
      try {
        const host = this.$refs.tabsRef && this.$refs.tabsRef.$el
        if (!host) return
        const prevBtn = host.querySelector('.v-slide-group__prev')
        const nextBtn = host.querySelector('.v-slide-group__next')
        this.tabsCanScrollPrev = prevBtn ? !prevBtn.hasAttribute('disabled') : false
        this.tabsCanScrollNext = nextBtn ? !nextBtn.hasAttribute('disabled') : false
      } catch {
        this.tabsCanScrollPrev = false
        this.tabsCanScrollNext = false
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

      // 创建新标签页（允许重复路由）
      this.openTab(item)
    },

    // 打开新标签页（允许重复路由）
    openTab(item) {
      const newTab = {
        id: ++this.tabIdCounter,
        title: item.title,
        to: item.to,
        icon: item.icon,
        closable: true,
        history: { stack: [item.to], index: 0 }
      }

      this.openTabs.push(newTab)
      this.activeTabIndex = this.openTabs.length - 1
      this.lastNavigatedTabId = newTab.id

      // 跳转到新页面（路由相同也可重复打开）
      this.$router.push(item.to)
    },

    // 切换到指定标签页
    switchToTab(tab) {
      this.lastNavigatedTabId = tab.id
      const target = tab.history?.stack?.[tab.history.index] || tab.to
      tab.to = target
      this.$router.push(target)
    },

    // 当前标签返回
    goBackCurrentTab() {
      const tab = this.openTabs[this.activeTabIndex]
      if (!tab || !tab.history) return
      if (tab.history.index > 0) {
        tab.history.index -= 1
        const target = tab.history.stack[tab.history.index]
        tab.to = target
        this.lastNavigatedTabId = tab.id
        this.$router.push(target)
      }
    },
    // 当前标签前进
    goForwardCurrentTab() {
      const tab = this.openTabs[this.activeTabIndex]
      if (!tab || !tab.history) return
      if (tab.history.index < tab.history.stack.length - 1) {
        tab.history.index += 1
        const target = tab.history.stack[tab.history.index]
        tab.to = target
        this.lastNavigatedTabId = tab.id
        this.$router.push(target)
      }
    },

    // 关闭标签页
    closeTab(index) {
      this.openTabs.splice(index, 1)

      // 如果关闭的是当前激活的标签页
      if (index === this.activeTabIndex) {
        // 计算新的激活索引
        this.activeTabIndex = Math.min(index, this.openTabs.length - 1)
        // 切换到新的激活标签页（若仍存在）
        if (this.openTabs.length > 0 && this.openTabs[this.activeTabIndex]) {
          this.switchToTab(this.openTabs[this.activeTabIndex])
        }
      } else if (index < this.activeTabIndex) {
        // 如果关闭的标签页在当前激活标签页之前，调整索引
        this.activeTabIndex--
      }
    },

    // —— 标签拖拽排序 ——
    onTabDragStart(index) {
      this.draggingTabIndex = index
    },
    onTabDrop(targetIndex) {
      const from = this.draggingTabIndex
      const to = targetIndex
      this.draggingTabIndex = null
      if (from === null || from === undefined) return
      if (from === to) return

      // 记录当前激活标签的ID，重排后再恢复激活索引
      const activeId = this.openTabs[this.activeTabIndex]?.id

      const moved = this.openTabs.splice(from, 1)[0]
      // 计算插入位置（如果从左往右拖并且越过目标，新的索引需-1）
      const insertAt = from < to ? to - 1 : to
      this.openTabs.splice(insertAt, 0, moved)

      // 恢复激活索引
      const newActiveIndex = this.openTabs.findIndex((t) => t.id === activeId)
      if (newActiveIndex !== -1) {
        this.activeTabIndex = newActiveIndex
      }
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
    // 手动切换主题功能已禁用
    // toggleTheme() {
    //   this.$vuetify.theme.global.name = this.isDark ? 'dark' : 'light'
    //   localStorage.setItem('isDark', this.isDark)
    // },

    detectSystemTheme() {
      // 始终跟随系统主题，不再使用localStorage保存的设置
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
      this.isDark = isDarkMode
      this.$vuetify.theme.global.name = this.isDark ? 'dark' : 'light'
      // 移除localStorage中的主题设置，确保始终跟随系统
      localStorage.removeItem('isDark')
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
          this.serviceLogs = []
          // this.setupServiceLogListener()
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
          this.serviceLogs = []
          // this.setupServiceLogListener()
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
        this.restartProgress[1].text = '冷却等待 (3 秒)'
        await new Promise((resolve) => setTimeout(resolve, 3000))
        this.restartProgress[1].status = 'completed'
        await new Promise((resolve) => setTimeout(resolve, 500))

        // 步骤3: 启动服务
        this.restartProgress[2].status = 'running'
        this.restartProgress[2].text =
          type === 'core' ? '启动核心服务' : type === 'fm' ? '启动索引服务' : '启动所有服务'

        // 启动服务日志监听
        // await this.startServiceLogListening()

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

        // 延迟停止服务日志监听，让用户看到完整的启动日志
        setTimeout(async () => {
          await this.stopServiceLogListening()
        }, 5000)

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

    // Tabs 翻页按钮：触发 v-tabs 内部左右滑动
    pageTabs(direction) {
      const host = this.$refs.tabsRef && this.$refs.tabsRef.$el
      if (!host) return
      const selector = direction === 'prev' ? '.v-slide-group__prev' : '.v-slide-group__next'
      const btn = host.querySelector(selector)
      if (!btn) return
      for (let i = 0; i < 3; i++) btn.click()
      setTimeout(() => this.updateTabsScrollState(), 150)
    },

    updateTabsScrollState() {
      try {
        const host = this.$refs.tabsRef && this.$refs.tabsRef.$el
        if (!host) return
        const prevBtn = host.querySelector('.v-slide-group__prev')
        const nextBtn = host.querySelector('.v-slide-group__next')
        this.tabsCanScrollPrev = prevBtn ? !prevBtn.hasAttribute('disabled') : false
        this.tabsCanScrollNext = nextBtn ? !nextBtn.hasAttribute('disabled') : false
      } catch (err) {
        this.tabsCanScrollPrev = false
        this.tabsCanScrollNext = false
      }
    },

    // 切换日志控制台显示
    toggleLogConsole() {
      this.showLogConsole = !this.showLogConsole

      // 如果打开控制台，确保日志监听已启动
      if (this.showLogConsole && !this.serviceLogListening) {
        this.startServiceLogListening()
      }
    },

    // 切换服务日志监听状态
    async toggleServiceLogListening() {
      if (this.serviceLogListening) {
        await this.stopServiceLogListening()
      } else {
        await this.startServiceLogListening()
      }
    },

    // 清空服务日志
    clearServiceLogs() {
      this.serviceLogs = []
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

      // 如果服务都已启动，停止日志监听以避免内存泄漏
      if (this.servicesReady && this.serviceLogListener) {
        await this.stopServiceLogListener()
      }
    },

    // 设置服务日志监听器
    setupServiceLogListener() {
      if (this.serviceLogListener) {
        this.serviceLogListener() // 清理之前的监听器
      }

      this.serviceLogListener = window.electron.onServiceLog((logData) => {
        this.addServiceLogEntry(logData)
      })
    },

    // 停止服务日志监听
    async stopServiceLogListener() {
      try {
        if (this.serviceLogListener) {
          this.serviceLogListener()
          this.serviceLogListener = null
        }
        await window.electron.stopServiceLog()
        console.log('服务日志监听已停止')
      } catch (error) {
        console.error('停止服务日志监听失败:', error)
      }
    },

    // 格式化日志时间
    formatLogTime(timestamp) {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    },

    // 添加服务日志条目
    addServiceLogEntry(logData) {
      const logEntry = {
        id: Date.now() + Math.random(),
        timestamp: Date.now(),
        type: logData.type || 'info',
        message: logData.message || '',
        service: logData.service || 'system',
        ...logData
      }

      this.serviceLogs.push(logEntry)

      // 限制日志条目数量
      if (this.serviceLogs.length > this.maxServiceLogEntries) {
        this.serviceLogs = this.serviceLogs.slice(-this.maxServiceLogEntries)
      }
    },

    // 启动服务日志监听
    async startServiceLogListening() {
      try {
        this.serviceLogListening = true
        this.showServiceLogs = true

        // 清空之前的日志
        this.serviceLogs = []

        // 启动日志监听
        await window.electron.startServiceLog()

        // 使用已有的监听器设置方法，避免重复注册
        this.setupServiceLogListener()

        console.log('服务日志监听已启动')
      } catch (error) {
        console.error('启动服务日志监听失败:', error)
        this.serviceLogListening = false
      }
    },

    // 停止服务日志监听
    async stopServiceLogListening() {
      try {
        this.serviceLogListening = false

        // 停止日志监听
        if (window.electron.stopServiceLog) {
          await window.electron.stopServiceLog()
        }

        console.log('服务日志监听已停止')
      } catch (error) {
        console.error('停止服务日志监听失败:', error)
      }
    },

    // 重置操作UI状态
    resetOperationUI() {
      console.log('🔄 [DEBUG] resetOperationUI 开始执行')
      console.log('🔄 [DEBUG] 重置前状态:', {
        importDialog: this.importDialog,
        cloneDialog: this.cloneDialog,
        operationProgress: this.operationProgress,
        dialogNonce: this.dialogNonce,
        operationData: this.operationData
      })

      // 关闭所有相关对话框
      this.importDialog = false
      this.cloneDialog = false
      this.repoSelectionDialog = false
      this.duplicateCloneDialog = false
      this.operationProgress = false
      this.showRestartDialog = false

      // 清空一次性状态
      this.operationData = null
      this.selectedRepo = null
      this.duplicateRepos = []
      this.progressText = '正在处理...'
      this.progressValue = 0
      this.cloneMode = 'quick'
      this.customClonePath = ''

      // 网络监控确保停掉
      this.stopNetworkMonitoring?.().catch(() => {})

      // bump 一个 key，强制下次对话框重挂载
      this.dialogNonce++

      console.log('🔄 [DEBUG] 重置后状态:', {
        importDialog: this.importDialog,
        cloneDialog: this.cloneDialog,
        operationProgress: this.operationProgress,
        dialogNonce: this.dialogNonce,
        operationData: this.operationData
      })
      console.log('🔄 [DEBUG] resetOperationUI 执行完成')
    },

    // 处理协议回调
    async handleProtocolCallback(data) {
      console.log('🚀 [DEBUG] 收到协议回调:', data)
      console.log('🚀 [DEBUG] 当前组件状态:', {
        importDialog: this.importDialog,
        cloneDialog: this.cloneDialog,
        operationProgress: this.operationProgress,
        dialogNonce: this.dialogNonce
      })

      try {
        console.log('🚀 [DEBUG] 开始重置UI状态')
        // 关键：先把上一次可能残留的 UI/状态全部复位
        this.resetOperationUI()
        await this.$nextTick()
        console.log('🚀 [DEBUG] UI状态重置完成，开始处理具体操作')

        switch (data.route) {
          case 'import':
            console.log('🚀 [DEBUG] 处理导入操作')
            await this.handleImportOperation(data)
            break
          case 'clone':
            console.log('🚀 [DEBUG] 处理克隆操作')
            await this.handleCloneOperation(data)
            break
          case 'auth-success':
          case 'auth':
            console.log('🚀 [DEBUG] 处理登录回调')
            // 处理登录回调（保持现有逻辑）
            this.handleAuthCallback(data)
            break
          default:
            console.log('🚀 [DEBUG] 未知的协议操作:', data.route)
        }
      } catch (error) {
        console.error('🚀 [DEBUG] 处理协议回调失败:', error)
        this.resetOperationUI()
        this.$store?.dispatch('snackbar/showSnackbar', {
          message: `操作失败: ${error.message}`,
          color: 'error'
        })
      }
    },

    // 处理导入索引操作
    async handleImportOperation(data) {
      console.log('📥 [DEBUG] handleImportOperation 开始执行')
      const { github, download, filename } = data

      if (!github || !download || !filename) {
        console.log('📥 [DEBUG] 导入参数不完整:', { github, download, filename })
        throw new Error('导入参数不完整')
      }

      console.log('📥 [DEBUG] 开始导入索引:', { github, filename })
      console.log('📥 [DEBUG] 设置操作数据前状态:', {
        operationData: this.operationData,
        importDialog: this.importDialog
      })

      // 只负责赋值 + 打开
      this.operationData = data
      this.importDialog = true

      console.log('📥 [DEBUG] 设置操作数据后状态:', {
        operationData: this.operationData,
        importDialog: this.importDialog
      })
      console.log('📥 [DEBUG] handleImportOperation 执行完成')
    },

    // 确认导入操作
    async confirmImportOperation() {
      console.log('✅ [DEBUG] confirmImportOperation 被调用')
      console.log('✅ [DEBUG] 当前状态:', {
        busyFlag: this.__busyConfirmImport,
        operationData: this.operationData,
        importDialog: this.importDialog
      })

      if (this.__busyConfirmImport) {
        console.log('✅ [DEBUG] 操作正在进行中，跳过')
        return
      }
      this.__busyConfirmImport = true

      try {
        console.log('✅ [DEBUG] 开始确认导入操作')
        this.importDialog = false
        this.operationProgress = true
        this.progressText = '正在检查仓库状态...'
        this.progressValue = 10
        console.log('✅ [DEBUG] 弹窗状态更新完成')

        const { github, download, filename, token, owner, repo } = this.operationData

        // 1. 检查仓库是否已存在
        const { listRepos } = await import('../service/api')
        const reposResponse = await listRepos()
        let existingRepo = null

        if (reposResponse.status === 200) {
          // 按repo.id降序排序，选择最新的仓库
          const matchingRepos = reposResponse.data.filter((r) => r.repo_url === github)
          if (matchingRepos.length > 1) {
            // 多个仓库，让用户选择
            this.operationProgress = false
            this.duplicateRepos = matchingRepos.sort((a, b) => b.id - a.id)
            this.selectedRepo = this.duplicateRepos[0] // 默认选择最新的
            this.repoSelectionDialog = true
            return // 等待用户选择
          } else if (matchingRepos.length === 1) {
            existingRepo = matchingRepos[0]
          }
        }

        this.progressValue = 20

        // 2. 如果仓库不存在，先克隆仓库
        if (!existingRepo) {
          console.log('仓库不存在，开始克隆...')
          this.progressText = '仓库不存在，正在克隆仓库...'
          this.progressValue = 30

          const repoName = repo || github.split('/').pop().replace('.git', '')
          const ownerName = owner || github.split('/').slice(-2, -1)[0]

          // 执行克隆操作
          await this.executeCloneOperation({
            github,
            owner: ownerName,
            repo: repoName,
            branch: 'main',
            description: `通过索引导入自动克隆的仓库: ${ownerName}/${repoName}`,
            isPrivate: false,
            token
          })

          this.progressValue = 50

          // 重新获取仓库列表
          const updatedReposResponse = await listRepos()
          if (updatedReposResponse.status === 200) {
            // 按repo.id降序排序，选择最新的仓库
            const matchingRepos = updatedReposResponse.data.filter((r) => r.repo_url === github)
            if (matchingRepos.length > 0) {
              existingRepo = matchingRepos.sort((a, b) => b.id - a.id)[0]
            }
          }

          if (!existingRepo) {
            throw new Error('仓库克隆失败，无法继续导入索引')
          }
        }
        console.log('仓库信息:', existingRepo)

        // 3. 执行下载和解压操作
        await this.downloadAndExtractIndex(existingRepo, download, filename, token)
      } catch (error) {
        console.error('导入索引失败:', error)
        this.resetOperationUI()
        this.$store?.dispatch('snackbar/showSnackbar', {
          message: `导入索引失败: ${error.message}`,
          color: 'error'
        })
      } finally {
        this.__busyConfirmImport = false
        // 如果还开着进度条，1.5s 后收尾并复位一次
        setTimeout(() => {
          if (this.operationProgress) {
            this.operationProgress = false
          }
          // 不打断成功提示和自动跳转，只清理状态
          this.operationData = null
          this.progressText = '正在处理...'
          this.progressValue = 0
        }, 1500)
      }
    },

    // 取消导入操作
    cancelImportOperation() {
      this.importDialog = false
      this.operationData = null
    },

    // 处理克隆仓库操作
    async handleCloneOperation(data) {
      console.log('📦 [DEBUG] handleCloneOperation 开始执行')
      const { github, owner, repo } = data

      if (!github || !owner || !repo) {
        console.log('📦 [DEBUG] 克隆参数不完整:', { github, owner, repo })
        throw new Error('克隆参数不完整')
      }

      console.log('📦 [DEBUG] 开始克隆仓库:', { github, owner, repo })
      console.log('📦 [DEBUG] 设置操作数据前状态:', {
        operationData: this.operationData,
        cloneDialog: this.cloneDialog
      })

      // 只负责赋值 + 打开
      this.operationData = data
      this.cloneDialog = true

      console.log('📦 [DEBUG] 设置操作数据后状态:', {
        operationData: this.operationData,
        cloneDialog: this.cloneDialog
      })
      console.log('📦 [DEBUG] handleCloneOperation 执行完成')
    },

    // 确认克隆操作
    async confirmCloneOperation() {
      console.log('✅ [DEBUG] confirmCloneOperation 被调用')
      console.log('✅ [DEBUG] 当前状态:', {
        busyFlag: this.__busyConfirmClone,
        operationData: this.operationData,
        cloneDialog: this.cloneDialog,
        cloneMode: this.cloneMode,
        customClonePath: this.customClonePath
      })

      if (this.__busyConfirmClone) {
        console.log('✅ [DEBUG] 克隆操作正在进行中，跳过')
        return
      }
      this.__busyConfirmClone = true

      try {
        console.log('✅ [DEBUG] 开始确认克隆操作')
        // 检查自定义模式下是否选择了目录
        if (this.cloneMode === 'custom' && !this.customClonePath) {
          console.log('✅ [DEBUG] 自定义模式下未选择目录')
          this.$store?.dispatch('snackbar/showSnackbar', {
            message: '请先选择保存目录',
            color: 'warning'
          })
          return
        }

        console.log('✅ [DEBUG] 关闭克隆弹窗，开始执行克隆操作')
        this.cloneDialog = false
        await this.executeCloneOperation(this.operationData)
      } finally {
        this.__busyConfirmClone = false
        console.log('✅ [DEBUG] confirmCloneOperation 执行完成')
      }
    },

    // 取消克隆操作
    cancelCloneOperation() {
      this.cloneDialog = false
      this.operationData = null
    },

    // 执行克隆仓库操作
    async executeCloneOperation(data) {
      const { github, owner, repo, branch = 'main', description, isPrivate, token } = data

      this.operationProgress = true
      this.progressText = '正在检查仓库状态...'
      this.progressValue = 10

      try {
        // 1. 检查仓库是否已存在
        const { listRepos } = await import('../service/api')
        const reposResponse = await listRepos()

        if (reposResponse.status === 200) {
          // 按repo.id降序排序，选择最新的仓库
          const matchingRepos = reposResponse.data.filter((r) => r.repo_url === github)
          if (matchingRepos.length > 0) {
            console.log('发现重复仓库，显示确认弹窗:', github)
            this.operationProgress = false
            this.progressValue = 0
            this.progressText = '正在处理...'

            // 显示重复克隆确认弹窗
            this.duplicateRepos = matchingRepos.sort((a, b) => b.id - a.id)
            this.duplicateCloneDialog = true
            return // 等待用户选择
          }
        }

        this.progressValue = 30

        // 2. 执行实际克隆操作
        return await this.performCloneOperation(
          github,
          owner,
          repo,
          branch,
          description,
          isPrivate,
          token
        )
      } catch (error) {
        console.error('克隆仓库失败:', error)

        // 停止网络监控
        await this.stopNetworkMonitoring()

        this.operationProgress = false
        this.progressValue = 0
        this.progressText = '正在处理...'

        // 重置克隆相关状态
        this.cloneMode = 'quick'
        this.customClonePath = ''

        // 显示详细错误信息
        const errorMsg = error.response?.data?.message || error.message || '克隆仓库失败'
        this.$store?.dispatch('snackbar/showSnackbar', {
          message: `克隆仓库失败: ${errorMsg}`,
          color: 'error'
        })

        throw new Error(`克隆仓库失败: ${errorMsg}`)
      }
    },

    // 隐藏进度弹窗
    hideProgressDialog() {
      this.operationProgress = false
      this.$store?.dispatch('snackbar/showSnackbar', {
        message: '操作已转入后台运行',
        color: 'info'
      })
    },

    // 取消重复克隆
    cancelDuplicateClone() {
      this.duplicateCloneDialog = false
      this.duplicateRepos = []
      this.operationData = null
    },

    // 确认重复克隆
    async confirmDuplicateClone() {
      this.duplicateCloneDialog = false
      // 继续执行克隆操作
      await this.proceedWithClone()
    },

    // 取消仓库选择
    cancelRepoSelection() {
      this.repoSelectionDialog = false
      this.duplicateRepos = []
      this.selectedRepo = null
      this.operationData = null
    },

    // 确认仓库选择
    async confirmRepoSelection() {
      this.repoSelectionDialog = false
      const selectedRepo = this.selectedRepo
      this.duplicateRepos = []
      this.selectedRepo = null

      // 继续执行导入操作
      await this.proceedWithImport(selectedRepo)
    },

    // 继续执行克隆操作
    async proceedWithClone() {
      const {
        github,
        owner,
        repo,
        branch = 'main',
        description,
        isPrivate,
        token
      } = this.operationData

      this.operationProgress = true

      try {
        // 执行实际克隆操作
        return await this.performCloneOperation(
          github,
          owner,
          repo,
          branch,
          description,
          isPrivate,
          token
        )
      } catch (error) {
        console.error('克隆仓库失败:', error)

        // 停止网络监控
        await this.stopNetworkMonitoring()

        this.operationProgress = false
        this.progressValue = 0
        this.progressText = '正在处理...'

        // 重置克隆相关状态
        this.cloneMode = 'quick'
        this.customClonePath = ''

        // 显示详细错误信息
        const errorMsg = error.response?.data?.message || error.message || '克隆仓库失败'
        this.$store?.dispatch('snackbar/showSnackbar', {
          message: `克隆仓库失败: ${errorMsg}`,
          color: 'error'
        })

        throw new Error(`克隆仓库失败: ${errorMsg}`)
      }
    },

    // 继续执行导入操作
    async proceedWithImport(existingRepo) {
      const { download, filename, token } = this.operationData

      this.operationProgress = true

      try {
        // 执行下载和解压操作
        await this.downloadAndExtractIndex(existingRepo, download, filename, token)
      } catch (error) {
        console.error('导入索引失败:', error)
        this.operationProgress = false
        this.progressValue = 0
        this.progressText = '正在处理...'

        this.$store?.dispatch('snackbar/showSnackbar', {
          message: `导入索引失败: ${error.message}`,
          color: 'error'
        })
      }
    },

    // 选择克隆目录
    async selectCloneDirectory() {
      try {
        const result = await window.electron.invoke('dialog:openDirectory', {
          defaultPath: this.customClonePath,
          properties: ['openDirectory']
        })

        if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
          const selectedPath = result.filePaths[0]
          const fs = window.electron.fs
          const path = window.electron.path

          // 判断选中文件夹是否为空
          const folderContent = fs.readdirSync(selectedPath)
          if (folderContent.length === 0) {
            this.customClonePath = selectedPath
            this.$store?.dispatch('snackbar/showSnackbar', {
              message: '选中的文件夹为空，直接使用该目录。',
              color: 'info'
            })
          } else {
            // 文件夹不为空，自动创建子文件夹
            const safeName = this.operationData.repo.replace(/\./g, '').replace(/\.git$/, '')
            const newFolderPath = path.join(selectedPath, safeName)
            if (!fs.existsSync(newFolderPath)) {
              fs.mkdirSync(newFolderPath)
              this.$store?.dispatch('snackbar/showSnackbar', {
                message: `已自动创建 ${newFolderPath} 文件夹`,
                color: 'info'
              })
            }
            this.customClonePath = newFolderPath
          }
        }
      } catch (error) {
        console.error('选择目录失败:', error)
        this.$store?.dispatch('snackbar/showSnackbar', {
          message: '选择目录失败',
          color: 'error'
        })
      }
    },

    // 启动网络监控
    async startNetworkMonitoring() {
      try {
        // 启动网络监控
        await window.electron.startNetworkMonitor()

        // 显示网络速度区域
        this.networkSpeed.show = true

        // 监听网络速度更新
        window.electron.onNetworkSpeedUpdate((data) => {
          this.networkSpeed.downloadSpeed = data.downloadSpeed
          this.networkSpeed.uploadSpeed = data.uploadSpeed
          this.networkSpeed.downloadSpeedFormatted = data.downloadSpeedFormatted
          this.networkSpeed.uploadSpeedFormatted = data.uploadSpeedFormatted
          this.networkSpeed.interface = data.interface
        })
      } catch (error) {
        console.error('启动网络监控失败:', error)
      }
    },

    // 停止网络监控
    async stopNetworkMonitoring() {
      try {
        await window.electron.stopNetworkMonitor()
        window.electron.removeNetworkSpeedListener()
        this.networkSpeed.show = false
        // 重置网络速度数据
        this.networkSpeed.downloadSpeed = 0
        this.networkSpeed.uploadSpeed = 0
        this.networkSpeed.downloadSpeedFormatted = '0 B/s'
        this.networkSpeed.uploadSpeedFormatted = '0 B/s'
        this.networkSpeed.interface = ''
      } catch (error) {
        console.error('停止网络监控失败:', error)
      }
    },

    // 执行克隆仓库的公共方法
    async performCloneOperation(
      github,
      owner,
      repo,
      branch = 'main',
      description,
      isPrivate,
      token
    ) {
      // 检查自定义模式下是否选择了目录
      if (this.cloneMode === 'custom' && !this.customClonePath) {
        this.$store?.dispatch('snackbar/showSnackbar', {
          message: '请先选择保存目录',
          color: 'warning'
        })
        throw new Error('请先选择保存目录')
      }

      // 启动网络监控
      await this.startNetworkMonitoring()

      // 确定本地路径
      this.progressText = '正在准备本地路径...'
      this.progressValue = 40

      let localPath
      if (this.cloneMode === 'quick') {
        // 快速克隆：使用默认路径
        const homeDir = window.electron.homeDir || (await window.electron.homeDir)
        const path = window.electron.path
        localPath = path.join(homeDir, 'githave', repo)
      } else {
        // 自定义目录：使用用户选择的路径
        const path = window.electron.path
        localPath = path.join(this.customClonePath)
      }

      this.progressValue = 50

      // 构建仓库数据
      const repoData = {
        name: repo,
        repo_url: github,
        branch: branch,
        local_path: localPath,
        username: isPrivate && token ? 'token' : '',
        password: isPrivate && token ? token : '',
        desc: description || `${owner}/${repo}`,
        pull: true // 执行克隆
      }

      console.log('准备克隆仓库:', repoData)

      // 执行克隆
      this.progressText = `正在克隆仓库 ${owner}/${repo}...`
      this.progressValue = 60

      const { createRepo } = await import('../service/api')
      const result = await createRepo(repoData)

      this.progressValue = 90

      if (result.status === 200 || result.status === 201) {
        console.log('仓库克隆成功:', result.data)

        this.progressValue = 100
        this.progressText = '克隆完成！'

        // 停止网络监控
        await this.stopNetworkMonitoring()

        setTimeout(() => {
          this.operationProgress = false
          this.progressValue = 0
          this.progressText = '正在处理...'

          // 重置克隆相关状态
          this.cloneMode = 'quick'
          this.customClonePath = ''
        }, 1500)

        this.$store?.dispatch('snackbar/showSnackbar', {
          message: `仓库 ${owner}/${repo} 克隆成功`,
          color: 'success'
        })

        // 发出仓库导入成功事件
        window.dispatchEvent(
          new CustomEvent('repo-imported', {
            detail: { repoName: repo, repoUrl: github }
          })
        )

        // 延迟跳转到仓库页面
        setTimeout(() => {
          this.$router.push('/repo')
        }, 2000)

        return result.data
      } else {
        throw new Error(result.message || '克隆仓库失败')
      }
    },

    // 下载和解压索引文件的公共方法
    async downloadAndExtractIndex(existingRepo, download, filename, token) {
      // 下载索引文件
      this.progressText = '正在下载索引文件...'
      this.progressValue = 60

      console.log('开始下载索引文件...')

      // 获取API基础URL
      const { getFmConfig } = await import('../service/api')
      const configResponse = await getFmConfig()
      if (configResponse.status !== 200) {
        throw new Error('获取API配置失败')
      }

      const apiBaseUrl = configResponse.data.api_url_simple
      const fullDownloadUrl = `${apiBaseUrl}${download}`
      console.log('完整下载地址:', fullDownloadUrl)

      const headers = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(fullDownloadUrl, { headers })
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status} ${response.statusText}`)
      }

      const blob = await response.blob()
      console.log('下载完成，文件大小:', blob.size, 'bytes')

      this.progressValue = 75

      // 保存文件到临时目录
      this.progressText = '正在处理文件...'
      const arrayBuffer = await blob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      const path = window.electron.path
      const tempDir = window.electron.tmpdir || (await window.electron.homeDir)
      const tempFilePath = path.join(tempDir, filename)

      await window.electron.fs.writeFileSync(tempFilePath, uint8Array)
      console.log('文件已保存到临时目录:', tempFilePath)

      // 验证文件格式
      const fileContent = new TextDecoder().decode(uint8Array.slice(0, 100))
      console.log('文件头部内容:', fileContent)

      // 检查是否为HTML错误页面
      if (
        fileContent.toLowerCase().includes('<html') ||
        fileContent.toLowerCase().includes('<!doctype')
      ) {
        throw new Error('下载的文件是HTML页面，可能是访问权限问题或链接错误')
      }

      // 检查tar.gz文件头
      const magicBytes = uint8Array.slice(0, 3)
      const isGzip = magicBytes[0] === 0x1f && magicBytes[1] === 0x8b && magicBytes[2] === 0x08
      if (!isGzip) {
        throw new Error(
          `文件格式错误：期望tar.gz格式，但检测到的文件头为 [${Array.from(magicBytes)
            .map((b) => '0x' + b.toString(16).padStart(2, '0'))
            .join(', ')}]`
        )
      }

      this.progressValue = 85

      // 解压到仓库的.gitgo目录
      this.progressText = '正在解压索引文件...'
      const targetDir = path.join(existingRepo.local_path)

      // 确保目标目录存在
      if (!window.electron.fs.existsSync(targetDir)) {
        window.electron.fs.mkdirSync(targetDir, { recursive: true })
      }
      console.log('目标目录:', targetDir)

      // 解压文件
      const { success, message } = await window.electron.extractTarGz(tempFilePath, targetDir)

      if (!success) {
        throw new Error(`解压失败: ${message}`)
      }

      this.progressValue = 95

      // 清理临时文件
      try {
        window.electron.fs.unlinkSync(tempFilePath)
      } catch (cleanupError) {
        console.warn('清理临时文件失败:', cleanupError)
      }

      this.progressValue = 100
      this.progressText = '导入完成！'

      setTimeout(() => {
        this.operationProgress = false
        this.progressValue = 0
        this.progressText = '正在处理...'
      }, 1500)

      this.$store?.dispatch('snackbar/showSnackbar', {
        message: `索引文件 ${filename} 导入成功，已解压到 ${existingRepo.name} 仓库`,
        color: 'success'
      })

      // 跳转到上下文索引页面
      setTimeout(() => {
        this.$router.push('/scan')
      }, 2000)
    },

    // 处理登录回调
    handleAuthCallback(data) {
      if (data.route === 'auth-success' || (data.route === 'auth' && data.repo === 'success')) {
        const { token, user_id, username, email, verified } = data
        const isVerified = verified === 'true'

        if (token) {
          const loginData = {
            token: token,
            user_id: user_id,
            username: username,
            email: email,
            expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
            loginTime: Date.now(),
            verified: isVerified
          }
          localStorage.setItem('githave_login_data', JSON.stringify(loginData))

          this.$store?.dispatch('snackbar/showSnackbar', {
            message: username ? `欢迎回来，${username}！` : 'GitHave登录成功！',
            color: 'success'
          })

          console.log('GitHave登录成功，用户信息:', { user_id, username, email })
        }
      }
    }
  },
  watch: {
    isCompactMode: {
      immediate: true,
      handler: async function (val) {
        await window.electron.setZoomFactor(val ? 0.8 : 0.92)
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
    // 监听路由变化，自动保存导航历史和更新标签页状态
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

      // 更新当前激活的标签页索引（支持重复路由：优先匹配最近导航的tab，否则选择最后一个匹配项）
      const matches = this.openTabs
        .map((t, i) => ({ t, i }))
        .filter((x) => x.t.to === to.path)
      if (matches.length > 0) {
        const byLast = matches.find((m) => m.t.id === this.lastNavigatedTabId)
        this.activeTabIndex = (byLast ? byLast.i : matches[matches.length - 1].i)
      }

      // 将本次路由变更记录到当前活动标签的历史堆栈（确保实例内导航可被后退/前进）
      const activeTab = this.openTabs[this.activeTabIndex]
      if (activeTab) {
        // 对于finder路由，不覆盖已有的自定义标题（防止覆盖FileBrowser组件设置的标题）
        if (to.name === 'finder' && activeTab.hasCustomTitle) {
          // 如果是finder路由且已有自定义标题，则保持不变
          console.log('保持finder路由的自定义标题:', activeTab.title)
        } else {
          // 动态更新当前标签的标题（统一按路由规则）
          activeTab.title = this.buildTabTitleFromRoute(to)
        }
        if (!activeTab.history) {
          activeTab.history = { stack: [], index: -1 }
        }
        const full = to.fullPath || to.path
        const currentEntry = activeTab.history.stack[activeTab.history.index] || null
        // 如果路由等于当前索引指向的条目，则说明是切换标签/后退/前进导致的渲染，不记录
        if (currentEntry !== full) {
          // 若存在前进分支，先截断
          if (activeTab.history.index < activeTab.history.stack.length - 1) {
            activeTab.history.stack = activeTab.history.stack.slice(0, activeTab.history.index + 1)
          }
          activeTab.history.stack.push(full)
          activeTab.history.index = activeTab.history.stack.length - 1
          activeTab.to = full
        }
      }
    }
  },
  async mounted() {
    // 初始化标签页系统
    this.initializeDefaultTab()

    // 初始化导航历史
    this.initializeFromSavedNavigation()

    // 初始化主题设置
    this.detectSystemTheme()

    // 实时监听系统主题变化，始终跟随系统主题
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
      await window.electron.setZoomFactor(this.isCompactMode ? 0.8 : 0.92)
    }

    // 监听协议回调
    if (window.electron && window.electron.onProtocolUrl) {
      window.electron.onProtocolUrl(this.handleProtocolCallback)
    }

    // 监听子页面发出的标签标题更新事件
    window.addEventListener('tabs:set-title', this.onSetTabTitle)

    // 监听新增标签页事件
    window.addEventListener('addNewTab', this.onAddNewTab)

    // 取消通过全局 store 同步标题的逻辑，改由路由自身管理

    // 初始化 tabs 翻页可用状态
    this.$nextTick(() => {
      this.updateTabsScrollState()
      // 监听窗口大小变化以更新可用状态
      window.addEventListener('resize', this.updateTabsScrollState)
    })
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

  /* 隐藏所有滚动条 */
  :deep(*) {
  scrollbar-width: none !important; /* Firefox */
  -ms-overflow-style: none !important; /* IE和Edge */
}

  :deep(*::-webkit-scrollbar) {
  display: none !important; /* Chrome, Safari, Opera */
  width: 0 !important;
  height: 0 !important;
}

  /* 确保主要容器的滚动条也被隐藏 */
  :deep(.v-main),
  :deep(.v-container),
  :deep(.v-navigation-drawer),
  :deep(.loading-container),
  :deep(.service-logs-content),
  :deep(.log-container) {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

  :deep(.v-main::-webkit-scrollbar),
  :deep(.v-container::-webkit-scrollbar),
  :deep(.v-navigation-drawer::-webkit-scrollbar),
  :deep(.loading-container::-webkit-scrollbar),
  :deep(.service-logs-content::-webkit-scrollbar),
  :deep(.log-container::-webkit-scrollbar) {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
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

  /* 标签栏样式 */
  .tabs-toolbar {
  display: flex;
  align-items: center;
  height: 40px;
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.12);
  background-color: rgba(var(--v-theme-surface), 1);
  padding-left: 200px;
  position: sticky;
  top: 0;
  z-index: 200; /* 保证覆盖侧边抽屉 */
}

  .tabs-toolbar.dark-toolbar {
  background-color: rgba(var(--v-theme-surface), 1);
}

  .tabs-container {
  flex: 1;
  display: flex;
  align-items: center;
}

  .tabs-wrapper {
  flex: 1;
}

  /* Tabs总宽度限制与滚动翻页区域 */
  .tabs-scroll-wrapper {
  display: flex;
  align-items: center;
  max-width: 70vw; /* 限制总宽度，可按需调整 */
  overflow: hidden;
}
  .tabs-viewport {
  overflow: hidden;
  max-width: 68vw;
}

  .tab-item {
  /* 自适应内容宽度：不强制最小/最大宽度，按内容伸缩 */
  min-width: 0 !important;
  max-width: none !important;
  height: 32px !important;
  padding: 0 8px;
  flex: 0 0 auto; /* 不占据剩余空间，按内容渲染 */
}

  .tab-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 0 0 auto; /* 跟随内容宽度 */
  font-size: 0.875rem;
}

  .tab-close-btn {
  opacity: 0.7;
  transition: opacity 0.2s;
}

  .tab-close-btn:hover {
  opacity: 1;
}

  .empty-tabs {
  padding: 8px 16px;
  display: flex;
  align-items: center;
}

  .toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

  .theme-chip {
  font-size: 0.75rem !important;
}

  .theme-chip-text {
  margin-left: 4px;
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
  max-width: 600px;
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

  /* 服务日志样式 */
  .service-logs {
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
  border-radius: 8px;
  padding: 12px;
  background-color: rgba(var(--v-theme-surface-variant), 0.05);
}

  .log-container {
  max-height: 200px;
  overflow-y: auto;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  width: 100%;
  min-width: 500px;
}

  /* 重启对话框中的服务日志样式 */
  .service-logs-container {
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
  border-radius: 8px;
  background-color: rgba(var(--v-theme-surface-variant), 0.05);
  margin-top: 16px;
}

  .service-logs-header {
  display: flex;
  align-items: center;
  padding: 12px 16px 8px;
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.1);
}

  .service-logs-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.87);
}

  .service-logs-content {
  max-height: 200px;
  overflow-y: auto;
  padding: 8px 16px 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
}

  .service-log-entry {
  display: flex;
  align-items: center;
  padding: 4px 0;
  gap: 8px;
}

  .service-log-entry .log-time {
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 11px;
  min-width: 60px;
  flex-shrink: 0;
}

  .service-log-entry .log-icon {
  flex-shrink: 0;
}

  .service-log-entry .log-message {
  flex: 1;
  word-break: break-word;
}

  .service-log-entry.log-info .log-message {
  color: rgb(var(--v-theme-info));
}

  .service-log-entry.log-error .log-message {
  color: rgb(var(--v-theme-error));
}

  .service-log-entry.log-success .log-message {
  color: rgb(var(--v-theme-success));
}

  /* 滚动条样式 */
  .service-logs-content::-webkit-scrollbar {
  width: 6px;
}

  .service-logs-content::-webkit-scrollbar-track {
  background: rgba(var(--v-theme-outline), 0.1);
  border-radius: 3px;
}

  .service-logs-content::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-outline), 0.3);
  border-radius: 3px;
}

  .service-logs-content::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-outline), 0.5);
}

  .log-entry {
  display: flex;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.1);
}

  .log-entry:last-child {
  border-bottom: none;
}

  .log-service {
  font-weight: bold;
  margin-right: 8px;
  min-width: 40px;
}

  .log-message {
  flex: 1;
  margin-right: 8px;
}

  .log-time {
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 11px;
  min-width: 60px;
  text-align: right;
}

  .log-info {
  color: rgb(var(--v-theme-info));
}

  .log-error {
  color: rgb(var(--v-theme-error));
}

  .log-success {
  color: rgb(var(--v-theme-success));
}

  /* 自定义工具栏样式 */
  .custom-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 40px;
  padding: 0 10px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  user-select: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

  /* 侧边抽屉层级略低于顶部标签栏 */
  :deep(.app-drawer) {
  z-index: 150 !important;
}

  .dark-toolbar {
  background-color: #1e1e1e;
  border-bottom: 1px solid #333;
}

  .toolbar-left {
  display: flex;
  align-items: center;
  flex: 1;
  margin-left: 20%;
}

  .toolbar-nav-buttons {
  display: flex;
  gap: 4px;
}

.toolbar-title {
  font-size: 1rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  user-select: none;
  pointer-events: none;
}

  .toolbar-center {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 30%;
  flex: 4;
}

  .status-chips {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

  .status-chip {
  height: 20px !important;
  padding: 0 4px !important;
}

  .toolbar-right {
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: flex-end;
}

  .theme-chip {
  height: 20px !important;
}

  .toolbar-actions {
  display: flex;
  gap: 2px;
}

  .toolbar-btn {
  margin: 0 !important;
  padding: 0 !important;
}

  .chip-text {
  font-size: 0.7rem;
  margin-left: 2px;
}
  :deep(.v-chip) {
  .theme-chip-text {
  color: #ff6200 !important;
}
}

  @media (prefers-color-scheme: dark) {
  :deep(.v-chip) .theme-chip-text {
  color: #fff !important;
}
}
</style>
