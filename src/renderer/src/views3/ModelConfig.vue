<template>
  <v-container style="overflow-y: unset">
    <v-col cols="12">
      <div v-if="messages.length > 0">
        <div class="news-tips compact-list">
          <tip-banner
            v-for="(item, idx) in messages"
            :key="idx"
            class="tip-compact"
            :date="item.date"
            :message="item.message"
            :href="item.href"
          />
        </div>
      </div>
    </v-col>
    <!-- 底部导航：本地模型 / 云端模型 -->
    <v-bottom-navigation v-model="selectedTab" grow>
      <v-btn value="env">
        <v-icon>mdi-briefcase</v-icon>
        <span>基础环境</span>
      </v-btn>
      <v-btn value="local">
        <v-icon>mdi-harddisk</v-icon>
        <span>本地模型</span>
      </v-btn>
      <v-btn value="remote">
        <v-icon>mdi-cloud</v-icon>
        <span>云端模型</span>
      </v-btn>
      <v-btn value="conf">
        <v-icon>mdi-code-greater-than-or-equal</v-icon>
        <span>高级配置</span>
      </v-btn>
    </v-bottom-navigation>
    <div v-if="selectedTab === 'env'">
      <v-container class="bottom-nav-padding">
        <!-- 环境检测模块 -->
        <v-card class="pa-2 mb-4 env-card-compact" outlined>
          <v-card-title class="d-flex align-center">
            <v-icon color="primary" small class="mr-2">mdi-briefcase</v-icon>
            <span class="font-weight-bold">1. 基础环境</span>
          </v-card-title>
          <v-card-text class="text-compact">
            <!-- 一键安装功能区 -->
            <v-alert v-if="needsInstallCount > 0" type="info" colored-border density="compact">
              <div class="d-flex align-center flex-wrap">
                <span>检测到 {{ needsInstallCount }} 个基础依赖未安装。</span>
                <v-spacer></v-spacer>
                <v-btn
                  color="primary"
                  :loading="isInstallingDeps"
                  :disabled="isInstallingDeps"
                  size="small"
                  class="ml-2"
                  @click="installRequiredPackages"
                >
                  <v-icon small class="mr-1">mdi-package-down</v-icon>
                  一键安装所有依赖
                </v-btn>

                <!-- 网络速度显示 -->
                <div v-if="networkSpeed.isMonitoring" class="ml-4 d-flex align-center">
                  <v-chip small color="warning" variant="outlined" class="mr-2">
                    <v-icon small class="mr-1">mdi-download</v-icon>
                    {{ networkSpeed.formattedDownloadSpeed }}
                  </v-chip>
                  <v-chip small color="warning" variant="outlined" class="mr-2">
                    <v-icon small class="mr-1">mdi-upload</v-icon>
                    {{ networkSpeed.formattedUploadSpeed }}
                  </v-chip>
                  <v-chip small color="warning" variant="outlined">
                    <v-icon small class="mr-1">mdi-network</v-icon>
                    {{ networkSpeed.interfaceName }}
                  </v-chip>
                </div>

                <!-- <v-btn
                v-else
                color="primary"
                size="small"
                class="ml-2"
                disabled
              >
                <v-icon small class="mr-1">mdi-microsoft-windows</v-icon>
                Windows暂不支持
              </v-btn> -->
              </div>
            </v-alert>

            <!-- 安装日志显示区域 -->
            <v-card v-if="installLogs.length > 0" class="mt-3 mb-3 install-log-section" outlined>
              <v-card-title class="d-flex align-center pa-2">
                <v-icon color="info" small class="mr-2">mdi-console</v-icon>
                <span class="font-weight-bold">安装日志</span>
                <v-spacer></v-spacer>
                <v-btn size="x-small" variant="outlined" color="grey" @click="clearInstallLogs">
                  <v-icon small>mdi-delete</v-icon>
                  清空
                </v-btn>
              </v-card-title>
              <v-card-text class="pa-2">
                <div class="install-log-content">
                  <div class="install-logs-container">
                    <div
                      v-for="(log, index) in installLogs"
                      :key="index"
                      class="install-log-entry"
                      :class="`log-${log.type}`"
                    >
                      <span class="log-timestamp">{{ log.timestamp }}</span>
                      <v-icon
                        small
                        :color="
                          log.type === 'error' ? 'red' : log.type === 'success' ? 'green' : 'blue'
                        "
                        class="log-icon"
                      >
                        {{
                          log.type === 'error'
                            ? 'mdi-alert-circle'
                            : log.type === 'success'
                              ? 'mdi-check-circle'
                              : 'mdi-information'
                        }}
                      </v-icon>
                      <span class="log-message">{{ log.message }}</span>
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>

            <v-row class="mt-3">
              <!-- Python 状态 -->
              <v-col cols="12" md="6" class="d-flex align-center">
                <span class="mr-2">Python > 3.9.0：</span>
                <template v-if="pythonInstalled === null">
                  <v-progress-circular indeterminate color="primary"></v-progress-circular>
                  <span class="ml-1">检测中...</span>
                </template>
                <template v-else-if="pythonInstalled">
                  <v-icon color="green" small>mdi-check-circle</v-icon>
                  <span class="ml-1">已安装</span>
                </template>
                <template v-else-if="pythonInstalling && !pythonInstalled">
                  <v-progress-circular
                    indeterminate
                    size="16"
                    width="2"
                    color="primary"
                    class="mr-1"
                  ></v-progress-circular>
                  <span class="ml-1">安装中 ({{ pythonProgress }}%)</span>
                </template>
                <template v-else-if="pythonInstalled === false || pythonInstalled === null">
                  <v-icon color="red" small>mdi-close-circle</v-icon>
                  <span class="ml-1">未安装</span>
                  <v-btn text small variant="plain" color="primary" @click="openPythonWebsite"
                    >前往官网自行安装</v-btn
                  >
                  <v-btn
                    text
                    small
                    variant="outlined"
                    color="success"
                    @click="installSinglePackage('python')"
                    >{{ isWindows ? '打开微软商店' : '一键安装' }}</v-btn
                  >
                </template>
              </v-col>
              <!-- Pandoc 状态 -->
              <v-col cols="12" md="6" class="d-flex align-center">
                <span class="mr-2">Pandoc：</span>
                <template v-if="pandocInstalled === null">
                  <v-progress-circular indeterminate color="primary"></v-progress-circular>
                  <span class="ml-1">检测中...</span>
                </template>
                <template v-else-if="pandocInstalled">
                  <v-icon color="green" small>mdi-check-circle</v-icon>
                  <span class="ml-1">已安装</span>
                </template>
                <template v-else-if="pandocInstalling && !pandocInstalled">
                  <v-progress-circular
                    indeterminate
                    size="16"
                    width="2"
                    color="primary"
                    class="mr-1"
                  ></v-progress-circular>
                  <span class="ml-1">安装中 ({{ pandocProgress }}%)</span>
                </template>
                <template v-else-if="pandocInstalled === false || pandocInstalled === null">
                  <v-icon color="red" small>mdi-close-circle</v-icon>
                  <span class="ml-1">未安装 Pandoc</span>
                  <v-btn
                    text
                    small
                    variant="plain"
                    color="primary"
                    class="ml-2"
                    @click="openPandocWebsite"
                    >前往官网自行安装</v-btn
                  >
                  <v-btn
                    text
                    small
                    variant="outlined"
                    color="success"
                    @click="installSinglePackage('pandoc')"
                    >一键安装</v-btn
                  >
                </template>
              </v-col>
              <!-- Git 状态 -->
              <v-col cols="12" md="6" class="d-flex align-center">
                <span class="mr-2">Git：</span>
                <template v-if="gitInstalled === null">
                  <v-progress-circular indeterminate color="primary"></v-progress-circular>
                  <span class="ml-1">检测中...</span>
                </template>
                <template v-else-if="gitInstalled">
                  <v-icon color="green" small>mdi-check-circle</v-icon>
                  <span class="ml-1">已安装</span>
                </template>
                <template v-else-if="gitInstalling && !gitInstalled">
                  <v-progress-circular
                    indeterminate
                    size="16"
                    width="2"
                    color="primary"
                    class="mr-1"
                  ></v-progress-circular>
                  <span class="ml-1">安装中 ({{ gitProgress }}%)</span>
                </template>
                <template v-else-if="gitInstalled === false || gitInstalled === null">
                  <v-icon color="red" small>mdi-close-circle</v-icon>
                  <span class="ml-1">未检测到 Git</span>
                  <v-btn
                    text
                    small
                    variant="plain"
                    color="primary"
                    class="ml-2"
                    @click="openGitWebsite"
                    >前往官网自行安装</v-btn
                  >
                  <v-btn
                    text
                    small
                    variant="outlined"
                    color="success"
                    @click="installSinglePackage('git')"
                    >一键安装</v-btn
                  >
                </template>
              </v-col>
              <!-- Homebrew 状态 (仅在macOS上显示) -->
              <v-col v-if="isMacOS" cols="12" md="6" class="d-flex align-center">
                <span class="mr-2">Homebrew：</span>
                <template v-if="brewInstalled === null">
                  <v-progress-circular indeterminate color="primary"></v-progress-circular>
                  <span class="ml-1">检测中...</span>
                </template>
                <template v-else-if="brewInstalled">
                  <v-icon color="green" small>mdi-check-circle</v-icon>
                  <span class="ml-1">已安装</span>
                </template>
                <template v-else>
                  <v-icon color="red" small>mdi-close-circle</v-icon>
                  <span class="ml-1">未安装</span>
                  <v-btn
                    text
                    small
                    variant="plain"
                    color="primary"
                    class="ml-2"
                    @click="openHomeBrewWebsite"
                    >前往官网自行安装</v-btn
                  >
                </template>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
        <v-card class="pa-4 mb-4" outlined>
          <v-card-title
            class="d-flex align-center dark-text-force"
            style="
              background: linear-gradient(90deg, #e3f2fd 60%, #fff 100%);
              border-left: 6px solid #1976d2;
              border-radius: 8px;
            "
          >
            <v-icon color="primary" class="mr-2">mdi-alert-decagram</v-icon>
            2. 模型配置
          </v-card-title>
          <v-card-text
            class="d-flex flex-wrap justify-space-between align-center"
            style="border-radius: 8px; border: 2px dashed #1976d2"
          >
            <v-row class="w-100 dark-text-force" align="center" justify="center">
              <!-- 云端/本地模型一键切换 -->
              <v-alert colored-border density="compact" class="mt-3 mb-3">
                <div class="d-flex align-center flex-wrap">
                  <div>
                    <span class="font-weight-bold">当前模型使用模式：</span>
                    <v-chip :color="allCloudModelsEnabled ? 'info' : 'primary'" class="ml-2" label>
                      {{ allCloudModelsEnabled ? '云端模型' : '本地模型' }}
                    </v-chip>
                  </div>
                  <v-spacer></v-spacer>
                  <v-switch
                    :model-value="allCloudModelsEnabled"
                    color="info"
                    hide-details
                    density="compact"
                    :label="allCloudModelsEnabled ? '切换至本地模型' : '切换至云端模型'"
                    @update:model-value="toggleAllCloudModels"
                  ></v-switch>
                </div>
                <div class="text-caption mt-2">
                  <v-icon small color="info">mdi-information-outline</v-icon>
                  <span> 一键切换当前所有模型的启用状态。 </span>
                </div>
              </v-alert>
            </v-row>
            <v-row class="w-100 dark-text-force" align="center" justify="center">
              <!-- GitHave AI订阅卡片 -->
              <v-col cols="12">
                <v-card
                  outlined
                  class="elevation-4 pa-4 mt-4 githave-subscription-card"
                  :class="isLoggedIn ? 'logged-in' : 'logged-out'"
                  :style="
                    isLoggedIn
                      ? {
                          border: '2px solid #3CB371',
                          background: 'linear-gradient(90deg, #fff 10%, #E6FFED 100%)'
                        }
                      : {
                          border: '2px solid #FFD700',
                          background: 'linear-gradient(90deg, #FFFACD 60%, #fff 100%)'
                        }
                  "
                >
                  <v-card-title class="d-flex align-center githave-subscription-title">
                    <v-icon v-if="!isLoggedIn" color="primary" class="mr-2" size="28"
                      >mdi-star-circle</v-icon
                    >
                    <v-icon v-else color="success" class="mr-2" size="28">mdi-check-circle</v-icon>
                    <span v-if="!isLoggedIn" class="font-weight-bold title-text"
                      >订阅 GitHave AI</span
                    >
                    <span v-else class="font-weight-bold title-text">已登录 GitHave AI</span>
                    <v-spacer></v-spacer>
                    <v-chip v-if="isLoggedIn" color="success" class="ml-2" label>
                      <v-icon small class="mr-1">mdi-check-circle</v-icon>
                      访问
                      <a :href="fmConfig.auth_base_url + '/dashboard'" target="_blank">
                        GitHave AI 控制台
                      </a>
                      查看账户信息
                    </v-chip>
                    <v-btn
                      v-if="isLoggedIn"
                      variant="text"
                      class="ml-2"
                      color="error"
                      @click="logoutGithave"
                      >退出登录</v-btn
                    >
                  </v-card-title>

                  <v-card-text>
                    <div v-if="!isLoggedIn" class="mb-3">
                      <div class="d-flex align-center mb-2">
                        <v-icon color="success" class="mr-2">mdi-gift</v-icon>
                        <span class="font-weight-bold">登录即赠送十万tokens</span>
                      </div>
                      <div class="d-flex align-center mb-2">
                        <v-icon color="info" class="mr-2">mdi-database-import</v-icon>
                        <span class="font-weight-bold">无需消耗算力，自动导入社区优质代码索引</span>
                      </div>
                      <div class="d-flex align-center mb-3">
                        <v-icon color="purple" class="mr-2">mdi-cpu-64-bit</v-icon>
                        <span class="font-weight-bold">免费试用全部AI功能</span>
                      </div>
                    </div>

                    <!-- 登录状态相关内容 -->
                    <div v-if="isLoggedIn" class="mb-3">
                      <v-divider class="mb-3"></v-divider>
                      <v-alert
                        v-if="!githaveUser.email || !githaveUser.verified"
                        type="error"
                        variant="tonal"
                        border="start"
                        class="mb-3"
                        density="comfortable"
                      >
                        <div class="d-flex align-center flex-wrap">
                          <v-icon color="error" class="mr-2">mdi-email-alert</v-icon>
                          <span class="font-weight-bold">该账号未激活</span>
                          <span class="ml-2">请前往</span>
                          <a
                            :href="fmConfig.auth_base_url + '/dashboard'"
                            target="_blank"
                            class="ml-1"
                          >
                            GitHave AI 控制台
                          </a>
                          <span class="ml-1">激活邮箱后，并重新登录，即可正常使用AI功能。</span>
                          <v-spacer></v-spacer>
                        </div>
                      </v-alert>
                      <!-- 账户信息（Ant Design Tag 标签化平铺展示） -->
                      <div class="mb-2 githave-account-inline">
                        <div class="account-row">
                          <a-tag color="blue">用户名</a-tag>
                          <span>{{ githaveUser.username || '—' }}</span>
                        </div>
                        <div class="account-row">
                          <a-tag color="geekblue">邮箱</a-tag>
                          <span>{{ githaveUser.email || '—' }}</span>
                        </div>
                        <div class="account-row">
                          <a-tag color="purple">登录时间</a-tag>
                          <span>{{ formattedLoginTime }}</span>
                        </div>
                        <div class="account-row">
                          <a-tag color="gold">APIKey</a-tag>
                          <span class="token">{{ maskedToken }}</span>
                          <div v-if="showToken">
                            <a-tag color="error">过期时间: {{ formattedExpireTime }}</a-tag>
                          </div>
                          <a-button size="small" type="link" @click="showToken = !showToken">{{
                            showToken ? '隐藏' : '显示'
                          }}</a-button>
                          <a-button
                            size="small"
                            type="link"
                            @click="copyToClipboard(githaveUser.token)"
                            >复制</a-button
                          >
                        </div>
                      </div>
                      <div class="mb-3">
                        <span class="font-weight-bold" style="color: #2c3e50">选择大模型：</span>
                        <v-chip-group v-model="selectedGithaveModel" mandatory class="mt-2">
                          <v-chip value="auto" color="primary" variant="outlined"
                            >GitHave-auto</v-chip
                          >
                          <v-chip value="openai" color="primary" variant="outlined"
                            >GitHave-o1</v-chip
                          >
                          <v-chip value="qwen" color="primary" variant="outlined"
                            >GitHave-q1</v-chip
                          >
                        </v-chip-group>
                      </div>
                      <v-btn
                        color="primary"
                        size="large"
                        class="mt-2"
                        :loading="isSubscribing"
                        @click="subscribeGithaveAI"
                      >
                        一键使用
                      </v-btn>
                    </div>

                    <div v-else>
                      <v-alert
                        v-if="loginExpired"
                        type="error"
                        variant="tonal"
                        border="start"
                        class="mb-2"
                      >
                        当前登录信息已失效，请重新登录。 过期时间：<span class="expired-time">{{
                          formattedExpireTime
                        }}</span>
                      </v-alert>
                      <v-btn color="primary" size="large" class="mt-2" @click="loginToGithave">
                        <v-icon class="mr-2">mdi-login</v-icon>
                        登录GitHave
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <v-row class="w-100 dark-text-force mt-4" align="center" justify="center">
              <!-- 云端模型卡片 -->
              <v-col cols="12" md="5">
                <v-card
                  outlined
                  class="elevation-3 pa-4 mt-4 dark-text-force"
                  style="border: 2px solid #42a5f5; background: #e3f2fd"
                >
                  <v-card-title class="d-flex align-center dark-text-force">
                    <v-icon color="info" class="mr-2">mdi-cloud</v-icon>
                    <span class="font-weight-bold dark-text-force" style="font-size: 1.2em"
                      >云端模型</span
                    >
                    <v-chip color="info" class="ml-2" label>灵活</v-chip>
                    <v-chip color="info" class="ml-2" label>快速体验</v-chip>
                  </v-card-title>
                  <v-card-text class="dark-text-force">
                    <!-- <div class="mb-4 dark-text-force">无需消耗本地算力，随时体验最新AI能力。</div> -->
                    <!-- 新增：云端模型配置检测信息 -->
                    <div class="mb-2">
                      <v-alert type="info" variant="outlined" colored-border class="pa-2 mb-2">
                        <template #prepend>
                          <v-icon color="info">mdi-information-outline</v-icon>
                        </template>
                        <div class="dark-text-force" style="overflow-x: auto; white-space: nowrap">
                          <v-icon v-if="cloudApiCount !== 0" color="green" small
                            >mdi-check-circle</v-icon
                          >
                          <v-icon v-else color="red" small>mdi-close-circle</v-icon>
                          <span class="font-weight-bold dark-text-force"
                            >已配置的云端模型API：</span
                          >
                          <span class="text-primary">{{ cloudApiCount }}</span>
                          <template v-if="uniqueProviders.length > 0">
                            <span class="ml-2 dark-text-force">供应商：</span>
                            <v-chip
                              v-for="provider in uniqueProviders"
                              :key="provider"
                              size="small"
                              color="info"
                              variant="outlined"
                              class="ml-1"
                            >
                              {{ provider }}
                            </v-chip>
                          </template>
                        </div>
                      </v-alert>
                    </div>
                    <v-btn text small variant="tonal" color="info" @click="selectedTab = 'remote'"
                      >前往配置详情</v-btn
                    >
                  </v-card-text>
                </v-card>
              </v-col>
              <!-- 二选一提示 -->
              <v-col cols="12" md="auto" class="d-flex flex-column align-center justify-center">
                <v-icon color="primary" size="36">mdi-swap-horizontal-bold</v-icon>
                <div class="font-weight-bold text-primary">二选一</div>
              </v-col>
              <!-- 本地模型卡片 -->
              <v-col cols="12" md="5">
                <v-card
                  outlined
                  class="elevation-3 pa-4 mt-4 dark-text-force"
                  style="border: 2px solid #1976d2; background: #e3f2fd"
                >
                  <v-card-title class="d-flex align-center dark-text-force">
                    <v-icon color="primary" class="mr-2">mdi-harddisk</v-icon>
                    <span class="font-weight-bold dark-text-force" style="font-size: 1.2em"
                      >本地模型</span
                    >
                    <v-chip color="primary" class="ml-2" label>离线</v-chip>
                    <v-chip color="primary" class="ml-2" label>安全可控</v-chip>
                  </v-card-title>
                  <v-card-text class="dark-text-force">
                    <!-- <div class="mb-2 dark-text-force">无需联网，数据本地安全，适合隐私场景。</div> -->
                  </v-card-text>
                  <v-tooltip location="top" :open-delay="200" :close-delay="100" max-width="600">
                    <template #activator="{ props }">
                      <v-alert
                        type="info"
                        variant="outlined"
                        colored-border
                        class="pa-2 mb-2 d-flex align-center"
                        style="
                          cursor: pointer;
                          white-space: nowrap;
                          overflow: hidden;
                          text-overflow: ellipsis;
                        "
                        v-bind="props"
                      >
                        <template #prepend>
                          <v-icon color="info">mdi-information-outline</v-icon>
                        </template>
                        <span class="dark-text-force">本地模型部署状态: </span>
                        <v-icon v-if="ollamaInstalled && ollamaRunning" color="green" small
                          >mdi-check-circle</v-icon
                        >
                        <template v-else-if="ollamaInstalled === null || ollamaRunning === null">
                          <v-progress-circular
                            size="20"
                            indeterminate
                            color="info"
                          ></v-progress-circular>
                        </template>
                        <v-icon v-else color="red" small>mdi-close-circle</v-icon>
                      </v-alert>
                    </template>

                    <!-- 弹窗内容 -->
                    <v-card min-width="500" class="pa-3" style="background-color: white !important">
                      <v-card-text
                        class="dark-text-force"
                        style="background-color: white !important"
                      >
                        <v-row>
                          <!-- Ollama 状态 -->
                          <v-col cols="12" md="6" class="d-flex align-center">
                            <span class="mr-2 dark-text-force">Ollama 环境状态：</span>

                            <!-- 检测中 -->
                            <template v-if="ollamaInstalled === null || ollamaRunning === null">
                              <span class="dark-text-force">正在检测...</span>
                            </template>

                            <!-- 已安装且运行 -->
                            <template v-else-if="ollamaInstalled && ollamaRunning">
                              <v-icon color="green" small>mdi-check-circle</v-icon>
                              <span class="ml-1 dark-text-force"
                                >已安装且运行中 (pid: {{ ollamaPid }})</span
                              >
                            </template>

                            <!-- 已安装但未运行 -->
                            <template v-else-if="ollamaInstalled && !ollamaRunning">
                              <v-icon color="orange" small>mdi-alert-circle</v-icon>
                              <span class="ml-1 dark-text-force">已安装但未运行</span>
                              <v-btn text small variant="plain" color="primary" @click="retryOllama"
                                >重新检测</v-btn
                              >
                            </template>

                            <!-- 未安装 -->
                            <template v-else>
                              <v-icon color="red" small>mdi-close-circle</v-icon>
                              <span class="ml-1 dark-text-force">未安装 Ollama</span>
                              <v-btn
                                text
                                small
                                variant="plain"
                                color="primary"
                                @click="openOllamaWebsite"
                                >前往官网自行安装</v-btn
                              >
                            </template>
                          </v-col>
                        </v-row>
                        <v-row>
                          <!-- nomic-embed-text -->
                          <v-col cols="12" md="6" class="d-flex align-center">
                            <div>
                              <div class="font-weight-medium dark-text-force">
                                bge-large-zh-v1.5
                              </div>
                              <div class="text--secondary text-caption dark-text-force">
                                <span class="text-grey">(大约需要651MB)</span
                                >构建代码知识库与智能AI索引
                              </div>
                            </div>
                            <template v-if="nomicInstalled === null">
                              <span class="ml-2 dark-text-force">检测中...</span>
                            </template>
                            <template v-else-if="nomicInstalled">
                              <v-icon color="green" small class="ml-2">mdi-check-circle</v-icon>
                              <span class="ml-1 dark-text-force">已安装</span>
                            </template>
                            <template v-else>
                              <v-icon color="red" small class="ml-2">mdi-close-circle</v-icon>
                              <span class="ml-1 dark-text-force">未安装</span>
                              <v-btn
                                icon
                                small
                                variant="plain"
                                color="primary"
                                class="ml-2"
                                @click="retryNomic"
                              >
                                <v-icon>mdi-refresh</v-icon>
                              </v-btn>
                            </template>
                          </v-col>

                          <!-- rwkv-7 -->
                          <v-col cols="12" md="6" class="d-flex align-center">
                            <div>
                              <div class="font-weight-medium dark-text-force">
                                qwen2.5-coder:1.5B,3B,7B
                              </div>
                              <div class="text--secondary text-caption dark-text-force">
                                <span class="text-grey">(大约需要5.7GB)</span>意图识别与快速摘要
                              </div>
                            </div>
                            <template v-if="llmInstalled === null">
                              <span class="ml-2 dark-text-force">检测中...</span>
                            </template>
                            <template v-else-if="llmInstalled">
                              <v-icon color="green" small class="ml-2">mdi-check-circle</v-icon>
                              <span class="ml-1 dark-text-force">已安装</span>
                            </template>
                            <template v-else>
                              <v-icon color="red" small class="ml-2">mdi-close-circle</v-icon>
                              <span class="ml-1 dark-text-force">未安装</span>
                              <v-btn
                                icon
                                small
                                variant="plain"
                                color="primary"
                                class="ml-2"
                                @click="retryRwkv"
                              >
                                <v-icon>mdi-refresh</v-icon>
                              </v-btn>
                            </template>
                          </v-col>
                        </v-row>
                      </v-card-text>
                      <v-card-text
                        v-if="deploymentInProgressNec"
                        class="py-1"
                        style="background-color: white !important"
                      >
                        <v-progress-linear
                          v-model="deploymentProgressNec"
                          :value="deploymentProgressNec"
                          color="success"
                          height="8"
                          striped
                          class="mt-2"
                          :indeterminate="false"
                        />
                        <div class="text-caption mt-1 dark-text-force">
                          进度：{{ deploymentProgressNec }}%
                        </div>
                      </v-card-text>
                      <v-card-actions
                        v-if="!(nomicInstalled && llmInstalled)"
                        style="background-color: white !important"
                      >
                        <v-spacer />
                        <v-btn color="primary" @click="installNecessaryModels"
                          >一键安装缺失模型</v-btn
                        >
                      </v-card-actions>
                    </v-card>
                  </v-tooltip>
                  <v-btn text small variant="tonal" color="primary" @click="selectedTab = 'local'"
                    >前往配置详情</v-btn
                  >
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-container>
    </div>
    <!-- 本地模型主区域 -->
    <div v-else-if="selectedTab === 'local'">
      <v-container class="bottom-nav-padding">
        <v-card class="pa-2 mb-2" outlined>
          <v-card-title class="subtitle-2">1. Ollama 是否安装</v-card-title>
          <v-card-text>
            <v-row>
              <!-- Ollama 状态 -->
              <v-col cols="12" md="6" class="d-flex align-center">
                <span class="mr-2">Ollama 环境状态：</span>

                <!-- 检测中 -->
                <template v-if="ollamaInstalled === null || ollamaRunning === null">
                  <span>正在检测...</span>
                </template>

                <!-- 已安装且运行 -->
                <template v-else-if="ollamaInstalled && ollamaRunning">
                  <v-icon color="green" small>mdi-check-circle</v-icon>
                  <span class="ml-1">已安装且运行中 (pid: {{ ollamaPid }})</span>
                </template>

                <!-- 已安装但未运行 -->
                <template v-else-if="ollamaInstalled && !ollamaRunning">
                  <v-icon color="orange" small>mdi-alert-circle</v-icon>
                  <span class="ml-1">已安装但未运行</span>
                  <v-btn text small variant="plain" color="primary" @click="retryOllama"
                    >重新检测</v-btn
                  >
                </template>

                <!-- 未安装 -->
                <template v-else>
                  <v-icon color="red" small>mdi-close-circle</v-icon>
                  <span class="ml-1">未安装 Ollama</span>
                  <v-btn text small variant="plain" color="primary" @click="openOllamaWebsite"
                    >前往官网自行安装</v-btn
                  >
                </template>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
        <!-- 一键部署模型 -->
        <v-card class="pa-2 mb-2" outlined>
          <v-card-title class="subtitle-2">2. 必要模型是否部署</v-card-title>

          <v-card-text>
            <v-row>
              <!-- nomic-embed-text -->
              <v-col cols="12" md="6" class="d-flex align-center">
                <div>
                  <div class="font-weight-medium">bge-large-zh-v1.5</div>
                  <div class="text--secondary text-caption">
                    <span class="text-grey">(大约需要651MB)</span>构建代码知识库与智能AI索引
                  </div>
                </div>
                <template v-if="nomicInstalled === null">
                  <span class="ml-2">检测中...</span>
                </template>
                <template v-else-if="nomicInstalled">
                  <v-icon color="green" small class="ml-2">mdi-check-circle</v-icon>
                  <span class="ml-1">已安装</span>
                </template>
                <template v-else>
                  <v-icon color="red" small class="ml-2">mdi-close-circle</v-icon>
                  <span class="ml-1">未安装</span>
                  <v-btn
                    icon
                    small
                    variant="plain"
                    color="primary"
                    class="ml-2"
                    @click="retryNomic"
                  >
                    <v-icon>mdi-refresh</v-icon>
                  </v-btn>
                </template>
              </v-col>

              <!-- rwkv-7 -->
              <v-col cols="12" md="6" class="d-flex align-center">
                <div>
                  <div class="font-weight-medium">qwen2.5-coder:1.5B,3B,7B</div>
                  <div class="text--secondary text-caption">
                    <span class="text-grey">(大约需要5.7GB)</span>意图识别与快速摘要
                  </div>
                </div>
                <template v-if="llmInstalled === null">
                  <span class="ml-2">检测中...</span>
                </template>
                <template v-else-if="llmInstalled">
                  <v-icon color="green" small class="ml-2">mdi-check-circle</v-icon>
                  <span class="ml-1">已安装</span>
                </template>
                <template v-else>
                  <v-icon color="red" small class="ml-2">mdi-close-circle</v-icon>
                  <span class="ml-1">未安装</span>
                  <v-btn icon small variant="plain" color="primary" class="ml-2" @click="retryRwkv">
                    <v-icon>mdi-refresh</v-icon>
                  </v-btn>
                </template>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-text v-if="deploymentInProgressNec" class="py-1">
            <v-progress-linear
              v-model="deploymentProgressNec"
              :value="deploymentProgressNec"
              color="success"
              height="8"
              striped
              class="mt-2"
              :indeterminate="false"
            />
            <div class="text-caption mt-1">进度：{{ deploymentProgressNec }}%</div>
          </v-card-text>
          <v-card-actions v-if="!(nomicInstalled && llmInstalled)">
            <v-spacer />
            <v-btn color="primary" @click="installNecessaryModels">一键安装缺失模型</v-btn>
          </v-card-actions>
        </v-card>
        <v-card class="pa-2 mb-2" outlined>
          <v-card-title class="subtitle-2">3. 安装其他模型</v-card-title>

          <v-card-text class="py-2">
            <v-row dense>
              <!-- 内置模型选项 -->
              <v-col v-for="model in builtInModels" :key="model.value" cols="12" sm="6">
                <v-checkbox
                  v-model="deployOptions"
                  :label="model.label"
                  :value="model.value"
                  density="compact"
                  hide-details
                />
              </v-col>

              <!-- 自定义模型输入 -->
              <v-col cols="12" class="d-flex align-center">
                <v-checkbox
                  v-model="customModelEnabled"
                  label="自定义模型"
                  density="compact"
                  hide-details
                />
                <v-text-field
                  v-model="customModel"
                  :disabled="!customModelEnabled"
                  placeholder="如 llama2:7b 或 qwen2.5:0.5b"
                  density="compact"
                  hide-details
                  class="ml-2"
                />
                <v-tooltip top>
                  <template #activator="{ props }">
                    <v-icon v-bind="props" small @click="openOllamaSearch"
                      >mdi-help-circle-outline</v-icon
                    >
                  </template>
                  <span class="text-caption">前往 Ollama 官网搜索模型</span>
                </v-tooltip>
              </v-col>
            </v-row>
          </v-card-text>

          <v-card-actions class="py-1">
            <v-spacer />
            <v-btn
              color="primary"
              :disabled="
                (deployOptions.length === 0 && !customModelEnabled) || deploymentInProgressOne
              "
              density="compact"
              @click="startDeploy"
            >
              {{ deploymentInProgressOne ? '部署中...' : '一键部署' }}
            </v-btn>
          </v-card-actions>

          <!-- 进度条 -->
          <v-card-text v-if="deploymentInProgressOne" class="py-1">
            <v-progress-linear
              v-model="deploymentProgressOne"
              :value="deploymentProgressOne"
              color="success"
              height="8"
              striped
              class="mt-2"
              :indeterminate="false"
            />
            <div class="text-caption mt-1">进度：{{ deploymentProgressOne }}%</div>
          </v-card-text>
        </v-card>

        <!-- 已安装模型 & 角色分配 -->
        <v-card class="pa-4 mb-4" outlined>
          <v-card-title class="headline">4. 可视化模型管理</v-card-title>
          <v-card-text>
            <v-row>
              <!-- 左侧：可拖拽的模型列表 -->
              <v-col cols="12" md="6">
                <div class="model-list">
                  <draggable
                    v-model="installedModels"
                    :group="{ name: 'models', pull: 'clone', put: false }"
                    item-key="id"
                    :tag="'div'"
                  >
                    <template #item="{ element }">
                      <div
                        class="chip-item"
                        draggable="true"
                        @dragstart="onDragStart(element)"
                        @dragend="onDragEnd"
                      >
                        <v-tooltip location="top">
                          <template #activator="{ props }">
                            <v-chip
                              v-bind="props"
                              class="ma-1"
                              outlined
                              closable
                              @click:close="removeModel(element)"
                            >
                              {{ element.name }}
                            </v-chip>
                          </template>
                          <div class="pa-2">
                            <div>大小：{{ element.size }}</div>
                            <div>更新时间：{{ element.modified }}</div>
                          </div>
                        </v-tooltip>
                      </div>
                    </template>
                  </draggable>
                </div>
              </v-col>

              <!-- 右侧：角色插槽卡片 -->
              <v-col cols="12" md="6" class="d-flex exp-list">
                <v-card-title class="subtitle-1 text-grey mb-2">
                  将左侧模型拖拽到右侧对应角色，点击保存即可
                </v-card-title>
                <div class="exp-list-placeholder">拖拽模型到这里 绑定角色</div>
                <v-row>
                  <!-- 常规角色 -->
                  <v-col cols="12">
                    <h3 class="role-section-title">常规角色</h3>
                  </v-col>
                  <v-col v-for="slot in oldExpertKeys" :key="slot" cols="12" sm="4" class="d-flex">
                    <v-card
                      class="flex-grow-1 pa-2"
                      outlined
                      :class="{
                        'drag-over': dragOverSlot === slot,
                        'card-transparent': isDragging
                      }"
                      @dragover.prevent="dragOverSlot = slot"
                      @dragleave="dragOverSlot = null"
                      @drop="onDrop(slot)"
                    >
                      <v-card-title class="subtitle-1">{{ slotLabels[slot] }}</v-card-title>
                      <v-divider />
                      <v-card-text class="d-flex flex-column">
                        <div class="text-center grey--text">
                          <span v-if="dragOverSlot === slot" class="font-weight-bold"
                            >释放至此</span
                          >
                          <span v-else class="text-grey">请拖入模型</span>
                        </div>
                        <v-chip
                          v-for="m in expertSlots[slot]"
                          :key="m.name"
                          class="ma-1 expert-chip"
                          color="primary"
                          dark
                        >
                          {{ m.name }}
                        </v-chip>
                      </v-card-text>
                    </v-card>
                  </v-col>
                  <!-- FM 配置角色 -->
                  <v-col cols="12" class="mt-4">
                    <h3 class="role-section-title">索引基础角色</h3>
                  </v-col>
                  <!-- FM 通用模型角色 -->
                  <v-col
                    v-for="slot in ['default_model', 'embedding_model']"
                    :key="slot"
                    cols="12"
                    sm="4"
                    class="d-flex"
                  >
                    <v-card
                      class="flex-grow-1 pa-2"
                      outlined
                      :class="{
                        'drag-over': dragOverSlot === slot,
                        'card-transparent': isDragging
                      }"
                      @dragover.prevent="dragOverSlot = slot"
                      @dragleave="dragOverSlot = null"
                      @drop="onDrop(slot)"
                    >
                      <v-card-title class="subtitle-1">{{ slotLabels[slot] }}</v-card-title>
                      <v-divider />
                      <v-card-text class="d-flex flex-column">
                        <div class="text-center grey--text">
                          <span v-if="dragOverSlot === slot" class="font-weight-bold"
                            >释放至此</span
                          >
                          <span v-else class="text-grey">请拖入模型</span>
                        </div>
                        <v-chip
                          v-for="m in expertSlots[slot]"
                          :key="m.name"
                          class="ma-1 expert-chip"
                          color="success"
                          dark
                        >
                          {{ m.name }}
                        </v-chip>
                      </v-card-text>
                    </v-card>
                  </v-col>

                  <!-- FM 配置模型角色 -->
                  <v-col cols="12" class="mt-2">
                    <h3 class="role-section-title">索引弹性策略角色</h3>
                  </v-col>
                  <v-col
                    v-for="i in fmConfig.model_configs.length"
                    :key="'model_config_' + (i - 1)"
                    cols="12"
                    sm="4"
                    class="d-flex"
                  >
                    <v-card
                      class="flex-grow-1 pa-2"
                      outlined
                      :class="{
                        'drag-over': dragOverSlot === 'model_config_' + (i - 1),
                        'card-transparent': isDragging
                      }"
                      @dragover.prevent="dragOverSlot = 'model_config_' + (i - 1)"
                      @dragleave="dragOverSlot = null"
                      @drop="onDrop('model_config_' + (i - 1))"
                    >
                      <v-card-title class="subtitle-1">
                        {{ '尺码 ' + fmConfig.model_configs[i - 1].size }}
                      </v-card-title>
                      <v-divider />
                      <v-card-text class="d-flex flex-column">
                        <div class="text-center grey--text">
                          <span
                            v-if="dragOverSlot === 'model_config_' + (i - 1)"
                            class="font-weight-bold"
                            >释放至此</span
                          >
                          <span v-else class="text-grey">请拖入模型</span>
                        </div>
                        <v-chip
                          v-for="m in expertSlots['model_config_' + (i - 1)]"
                          :key="m.name"
                          class="ma-1 expert-chip"
                          color="info"
                          dark
                        >
                          {{ m.name }}
                        </v-chip>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn text @click="resetConfig">重置</v-btn>
            <v-btn color="primary" @click="saveModelConfig">保存</v-btn>
          </v-card-actions>
        </v-card>
      </v-container>
    </div>

    <!-- 云端模型区域 -->
    <div v-else-if="selectedTab === 'remote'">
      <v-container class="bottom-nav-padding">
        <v-card class="pa-4" outlined>
          <v-card-title class="headline">☁️ 云端模型</v-card-title>
          <!-- 新增：统一云端模型配置展示区 -->
          <v-card-text>
            <v-btn color="success" variant="tonal" class="mr-2 mt-2" @click="saveAllCloudConfigs"
              >一键保存</v-btn
            >
            <v-btn color="primary" variant="tonal" class="mt-2" @click="refreshModelList"
              >刷新模型列表</v-btn
            >
            <!-- 常规云端模型配置区域 -->
            <v-card class="mb-4" outlined>
              <v-card-title class="text-h6 pa-3">
                <v-icon class="mr-2" color="primary">mdi-cloud</v-icon>
                大模型
              </v-card-title>
              <v-card-text class="pa-4">
                <v-row>
                  <v-col
                    v-for="(item, idx) in allCloudConfigs"
                    :key="item.label + idx"
                    cols="12"
                    md="6"
                  >
                    <v-card outlined class="cloud-config-card">
                      <v-card-title class="text-h6 pa-3">
                        <v-icon class="mr-2" color="primary">mdi-cloud</v-icon>
                        {{ item.label }}
                      </v-card-title>
                      <v-divider></v-divider>
                      <v-card-text class="pa-4">
                        <!-- API Key输入 -->
                        <v-text-field
                          v-model="item.ref.api"
                          label="API Key"
                          :type="item.showApiKey ? 'text' : 'password'"
                          prepend-inner-icon="mdi-key"
                          :append-inner-icon="item.showApiKey ? 'mdi-eye-off' : 'mdi-eye'"
                          variant="outlined"
                          density="compact"
                          class="mb-3"
                          hint="请输入您的API密钥"
                          persistent-hint
                          @click:append-inner="item.showApiKey = !item.showApiKey"
                        />

                        <!-- 供应商选择 -->
                        <v-select
                          v-model="item.selectedProvider"
                          :items="getProviderOptions()"
                          label="选择供应商"
                          prepend-inner-icon="mdi-domain"
                          variant="outlined"
                          density="compact"
                          class="mb-3"
                          @update:model-value="(val) => onProviderChange(item.ref, val)"
                        >
                          <template #item="{ props }">
                            <v-list-item v-bind="props">
                              <template #prepend>
                                <v-avatar size="24" class="mr-2">
                                  <v-icon size="16">mdi-cloud-outline</v-icon>
                                </v-avatar>
                              </template>
                            </v-list-item>
                          </template>
                        </v-select>

                        <!-- 模型选择（支持自定义输入） -->
                        <v-combobox
                          v-model="item.ref.model"
                          :items="getModelOptions(item.selectedProvider)"
                          item-title="title"
                          item-value="value"
                          label="选择或输入模型名称"
                          prepend-inner-icon="mdi-robot"
                          variant="outlined"
                          density="compact"
                          class="mb-3"
                          :disabled="!item.selectedProvider"
                          :hint="
                            item.selectedProvider
                              ? '可选择预设模型或手动输入自定义模型名称'
                              : '请先选择供应商'
                          "
                          persistent-hint
                          clearable
                        >
                          <template #item="{ props }">
                            <v-list-item v-bind="props">
                              <template #prepend>
                                <v-icon class="mr-2" size="16">mdi-brain</v-icon>
                              </template>
                            </v-list-item>
                          </template>
                        </v-combobox>

                        <!-- API URL和供应商类型已隐藏，通过选择供应商自动设置 -->

                        <!-- 启用开关和最大提示词数量 -->
                        <div class="d-flex align-center mb-3">
                          <v-switch
                            v-model="item.ref.enabled"
                            label="启用此模型"
                            color="success"
                            hide-details
                            class="mr-4"
                          />
                          <v-text-field
                            v-model.number="item.ref.max_prompts"
                            label="最大上下文限制"
                            type="number"
                            prepend-inner-icon="mdi-counter"
                            variant="outlined"
                            density="compact"
                            style="max-width: 200px"
                            hide-details
                          />
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
            <!-- 嵌入模型配置区域 -->
            <v-card class="mb-4" outlined style="border: 2px solid #ff9800; background: #fff3e0">
              <v-card-title class="text-h6 pa-3" style="background: #ff9800; color: white">
                <v-icon class="mr-2" color="white">mdi-vector-triangle</v-icon>
                小模型
              </v-card-title>
              <v-card-text class="pa-4">
                <v-row>
                  <v-col v-for="(item, idx) in embeddingConfigs" :key="item.label + idx" cols="12">
                    <v-card
                      outlined
                      class="embedding-config-card"
                      style="border: 1px solid #ff9800"
                    >
                      <v-card-title class="text-h6 pa-3">
                        <v-icon class="mr-2" color="orange">mdi-vector-triangle</v-icon>
                        {{ item.label }}
                      </v-card-title>
                      <v-divider></v-divider>
                      <v-card-text class="pa-4">
                        <!-- API Key输入 -->
                        <v-text-field
                          v-model="item.ref.api"
                          label="API Key"
                          :type="item.showApiKey ? 'text' : 'password'"
                          prepend-inner-icon="mdi-key"
                          :append-inner-icon="item.showApiKey ? 'mdi-eye-off' : 'mdi-eye'"
                          variant="outlined"
                          density="compact"
                          class="mb-3"
                          hint="请输入您的API密钥"
                          persistent-hint
                          @click:append-inner="item.showApiKey = !item.showApiKey"
                        />

                        <!-- 供应商选择 -->
                        <v-select
                          v-model="item.selectedProvider"
                          :items="getEmbeddingProviderOptions()"
                          label="选择嵌入模型供应商"
                          prepend-inner-icon="mdi-domain"
                          variant="outlined"
                          density="compact"
                          class="mb-3"
                          @update:model-value="(val) => onEmbeddingProviderChange(item.ref, val)"
                        >
                          <template #item="{ props }">
                            <v-list-item v-bind="props">
                              <template #prepend>
                                <v-avatar size="24" class="mr-2">
                                  <v-icon size="16">mdi-vector-triangle</v-icon>
                                </v-avatar>
                              </template>
                            </v-list-item>
                          </template>
                        </v-select>

                        <!-- 模型选择（支持自定义输入） -->
                        <v-combobox
                          v-model="item.ref.model"
                          :items="getEmbeddingModelOptions(item.selectedProvider)"
                          item-title="title"
                          item-value="value"
                          label="选择或输入嵌入模型名称"
                          prepend-inner-icon="mdi-vector-triangle"
                          variant="outlined"
                          density="compact"
                          class="mb-3"
                          :disabled="!item.selectedProvider"
                          :hint="
                            item.selectedProvider
                              ? '可选择预设嵌入模型或手动输入自定义模型名称'
                              : '请先选择供应商'
                          "
                          persistent-hint
                          clearable
                        >
                          <template #item="{ props }">
                            <v-list-item v-bind="props">
                              <template #prepend>
                                <v-icon class="mr-2" size="16">mdi-vector-triangle</v-icon>
                              </template>
                            </v-list-item>
                          </template>
                        </v-combobox>

                        <!-- 启用开关和最大提示词数量 -->
                        <div class="d-flex align-center mb-3">
                          <v-switch
                            v-model="item.ref.enabled"
                            label="启用此嵌入模型"
                            color="orange"
                            hide-details
                            class="mr-4"
                          />
                          <v-text-field
                            v-model.number="item.ref.max_prompts"
                            label="最大上下文限制"
                            type="number"
                            prepend-inner-icon="mdi-counter"
                            variant="outlined"
                            density="compact"
                            style="max-width: 200px"
                            hide-details
                          />
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <!-- 自定义模型配置 -->
            <v-card-text>
              <v-form ref="form" v-model="valid">
                <v-expansion-panels v-model="expandedPanels" multiple variant="popout">
                </v-expansion-panels>
              </v-form>
            </v-card-text>
          </v-card-text>
        </v-card>
      </v-container>
    </div>
    <div v-else-if="selectedTab === 'conf'">
      <v-container class="bottom-nav-padding">
        <v-card class="pa-4" outlined>
          <v-card-title class="headline">高级配置</v-card-title>
          <v-card-text>
            <v-form ref="form" v-model="valid">
              <v-expansion-panels v-model="expandedPanels" multiple variant="popout">
                <!-- 本地模型配置 -->
                <v-expansion-panel>
                  <v-expansion-panel-title id="offline-panel-header">
                    本地模型角色配置
                    <v-card-actions>
                      <v-spacer />
                      <v-btn text @click="resetConfig">重置</v-btn>
                      <v-btn color="primary" @click="saveModelConfig">保存</v-btn>
                    </v-card-actions>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-row>
                      <v-col v-for="(value, key) in config.ollama" :key="key" cols="12" md="6">
                        <!-- 数值字段：最大上下文长度 & 最大文件读取数量 -->
                        <template v-if="['max_prompts', 'max_file_num'].includes(key)">
                          <v-text-field
                            v-model.number="config.ollama[key]"
                            :label="getOllamaLabel(key)"
                            type="number"
                            outlined
                          />
                        </template>

                        <!-- 其他字段（字符串） -->
                        <template v-else>
                          <v-text-field
                            v-model="config.ollama[key]"
                            :label="getOllamaLabel(key)"
                            outlined
                          />
                        </template>
                      </v-col>
                      <v-col cols="12">
                        <v-text-field
                          v-model.number="config.deep_research.max_prompts"
                          label="最大上下文长度"
                          outlined
                        />
                      </v-col>
                      <v-col cols="12">
                        <v-text-field
                          v-model.number="config.deep_research.max_code_snippet_limit"
                          label="最大代码片段数量"
                          outlined
                        />
                      </v-col>
                      <v-col cols="12">
                        <v-text-field
                          v-model.number="config.deep_research.code_snippet_text_limit"
                          label="最大代码片段文本长度"
                          outlined
                        />
                      </v-col>
                      <v-col cols="12">
                        <v-text-field
                          v-model.number="config.flow_chart.max_prompts"
                          label="最大流程图上下文长度"
                          outlined
                        />
                      </v-col>
                      <v-col cols="12">
                        <v-text-field
                          v-model.number="config.flow_chart.max_code_snippet_limit"
                          label="最大流程图代码片段数量"
                          outlined
                        />
                      </v-col>
                      <v-col cols="12">
                        <v-text-field
                          v-model.number="config.flow_chart.code_snippet_text_limit"
                          label="最大流程图代码片段文本长度"
                          outlined
                        />
                      </v-col>
                    </v-row>
                    <v-card class="pa-4 mt-4" outlined max-height="250">
                      <v-card-title class="subtitle-1">部署向导</v-card-title>
                      <v-card-text>
                        <v-stepper v-model="deploymentStep">
                          <v-stepper-header>
                            <v-stepper-item value="1" :complete="deploymentStep > 1"
                              >检查 Ollama</v-stepper-item
                            >
                            <v-divider class="mx-2"></v-divider>
                            <v-stepper-item value="2" :complete="deploymentStep > 2"
                              >检查模型</v-stepper-item
                            >
                            <v-divider class="mx-2"></v-divider>
                            <v-stepper-item value="3">自动部署</v-stepper-item>
                          </v-stepper-header>
                          <v-container>
                            <!-- 步骤1 -->
                            <div v-if="deploymentStep === 1">
                              <div v-if="ollamaInstalled === null">检测中...</div>
                              <div v-else-if="ollamaInstalled">已安装且运行中。</div>
                              <div v-else>未检测到 Ollama。</div>
                              <v-btn
                                v-if="ollamaInstalled"
                                color="primary"
                                class="mt-3"
                                @click="nextStep"
                                >下一步</v-btn
                              >
                              <v-btn v-else color="error" class="mt-3" @click="openOllamaWebsite"
                                >前往安装</v-btn
                              >
                            </div>
                            <!-- 步骤2 -->
                            <div v-if="deploymentStep === 2">
                              <div v-if="modelsDeployed === null">检查模型部署...</div>
                              <div v-else-if="modelsDeployed">模型已部署。</div>
                              <div v-else>部分模型缺失：{{ modelsNotExits.join(', ') }}</div>
                              <v-btn
                                v-if="modelsDeployed"
                                color="primary"
                                class="mt-3"
                                @click="nextStep"
                                >下一步</v-btn
                              >
                              <v-btn v-else color="primary" class="mt-3" @click="startDeployment"
                                >开始部署</v-btn
                              >
                            </div>
                            <!-- 步骤3 -->
                            <div v-if="deploymentStep === 3">
                              <div v-if="deploymentInProgress">
                                部署中：{{ currentDeployingModel }}
                                <v-progress-linear
                                  v-model="deploymentProgress"
                                  color="success"
                                  :value="deploymentProgress"
                                  height="20"
                                  striped
                                  class="mt-2"
                                />
                              </div>
                              <div v-else>部署完成！</div>
                            </div>
                          </v-container>
                        </v-stepper>
                      </v-card-text>
                    </v-card>
                  </v-expansion-panel-text>
                </v-expansion-panel>
                <!-- 远程模型配置 -->
                <v-expansion-panel>
                  <v-expansion-panel-title id="remote-panel-header">
                    云端模型角色配置
                    <v-card-actions>
                      <v-spacer />
                      <v-btn text @click="resetConfig">重置</v-btn>
                      <v-btn color="primary" @click="saveModelConfig">保存</v-btn>
                    </v-card-actions>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <!-- 对每个角色（如 coder、chatter、officer）做一次卡片封装 -->
                    <div v-for="(modelCfg, slot) in config.custom" :key="slot">
                      <v-card flat class="mb-4 pa-2">
                        <v-card-title class="subtitle-1">
                          {{ slotLabels[slot] || getCustomLabel(slot) }}
                        </v-card-title>
                        <v-card-text>
                          <v-row>
                            <!-- 遍历该角色下的所有字段（api, url, model, type, enabled, max_prompts, max_file_num…） -->
                            <v-col v-for="(val, key) in modelCfg" :key="key" cols="12" md="6">
                              <!-- 布尔字段：启用云端模型 -->
                              <template v-if="key === 'enabled'">
                                <v-switch
                                  v-model="config.custom[slot].enabled"
                                  :label="getCustomLabel('enabled')"
                                />
                              </template>

                              <!-- 数值字段：最大上下文长度 & 最大文件读取数量 -->
                              <template v-else-if="['max_prompts', 'max_file_num'].includes(key)">
                                <v-text-field
                                  v-model.number="config.custom[slot][key]"
                                  :label="getCustomLabel(key)"
                                  type="number"
                                  outlined
                                />
                              </template>

                              <!-- 其他字段（字符串） -->
                              <template v-else>
                                <v-text-field
                                  v-model="config.custom[slot][key]"
                                  :label="getCustomLabel(key)"
                                  outlined
                                />
                              </template>
                            </v-col>
                          </v-row>
                        </v-card-text>
                      </v-card>
                    </div>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <!-- FM配置面板 -->
                <v-expansion-panel>
                  <v-expansion-panel-title id="fm-config-panel-header">
                    索引配置
                    <v-card-actions>
                      <v-spacer />
                      <v-btn text @click="resetFmConfig">重置</v-btn>
                      <v-btn color="primary" @click="saveFmConfig">保存</v-btn>
                    </v-card-actions>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <!-- 基础配置 -->
                    <v-card flat class="mb-4 pa-2">
                      <v-card-title class="subtitle-1">基础配置</v-card-title>
                      <v-card-text>
                        <v-row>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="fmConfig.api_base_url"
                              label="API基础URL"
                              outlined
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="fmConfig.completion_api"
                              label="补全API路径"
                              outlined
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="fmConfig.embedding_api"
                              label="嵌入API路径"
                              outlined
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="fmConfig.default_model"
                              label="默认模型"
                              outlined
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="fmConfig.default_format"
                              label="默认格式"
                              outlined
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model.number="fmConfig.default_temp"
                              label="默认温度"
                              type="number"
                              outlined
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="fmConfig.normalize_model"
                              label="标准化模型"
                              outlined
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="fmConfig.embedding_model"
                              label="嵌入模型"
                              outlined
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model.number="fmConfig.embedding_max_batch"
                              label="嵌入最大批次"
                              type="number"
                              outlined
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model.number="fmConfig.embedding_max_worker"
                              label="嵌入最大工作线程"
                              type="number"
                              outlined
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model.number="fmConfig.code_limit"
                              label="代码限制"
                              type="number"
                              outlined
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model.number="fmConfig.prompt_limit"
                              label="提示词限制"
                              type="number"
                              outlined
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model.number="fmConfig.parser_code_line_limit"
                              label="批量增强解析代码行数限制"
                              type="number"
                              outlined
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model.number="fmConfig.parser_code_chunk_limit"
                              label="批量增强解析代码块数上限"
                              type="number"
                              outlined
                            />
                          </v-col>
                        </v-row>
                      </v-card-text>
                    </v-card>

                    <!-- 分析提示词配置 -->
                    <v-card flat class="mb-4 pa-2">
                      <v-card-title class="subtitle-1">分析提示词配置</v-card-title>
                      <v-card-text>
                        <v-row>
                          <v-col cols="12">
                            <v-textarea
                              v-model="fmConfig.ana_prompts.role"
                              label="角色设定"
                              outlined
                              auto-grow
                              rows="3"
                            />
                          </v-col>
                          <v-col cols="12">
                            <v-textarea
                              v-model="fmConfig.ana_prompts.internal_deps"
                              label="内部依赖"
                              outlined
                              auto-grow
                              rows="3"
                            />
                          </v-col>
                          <v-col cols="12">
                            <v-textarea
                              v-model="fmConfig.ana_prompts.external_deps"
                              label="外部依赖"
                              outlined
                              auto-grow
                              rows="3"
                            />
                          </v-col>
                          <v-col cols="12">
                            <v-textarea
                              v-model="fmConfig.ana_prompts.main"
                              label="主要提示词"
                              outlined
                              auto-grow
                              rows="5"
                            />
                          </v-col>
                        </v-row>
                      </v-card-text>
                    </v-card>

                    <!-- 关键词提示词配置 -->
                    <v-card flat class="mb-4 pa-2">
                      <v-card-title class="subtitle-1">关键词提示词配置</v-card-title>
                      <v-card-text>
                        <v-row>
                          <v-col cols="12">
                            <v-textarea
                              v-model="fmConfig.keyword_prompts.system"
                              label="系统提示词"
                              outlined
                              auto-grow
                              rows="5"
                            />
                          </v-col>
                          <v-col cols="12">
                            <v-textarea
                              v-model="fmConfig.keyword_prompts.user"
                              label="用户提示词"
                              outlined
                              auto-grow
                              rows="3"
                            />
                          </v-col>
                        </v-row>
                      </v-card-text>
                    </v-card>
                    <v-card flat class="mb-4 pa-2">
                      <v-card-title class="subtitle-1">批量增强解析提示词配置</v-card-title>
                      <v-card-text>
                        <v-textarea
                          v-model="fmConfig.llm_parser_prompts"
                          label="系统提示词"
                          outlined
                          auto-grow
                          rows="5"
                        />
                      </v-card-text>
                    </v-card>

                    <!-- 嵌入云模型配置 -->
                    <v-card flat class="mb-4 pa-2">
                      <v-card-title class="subtitle-1">嵌入云模型配置</v-card-title>
                      <v-card-text>
                        <v-row>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="fmConfig.embedding_cloud_model.api"
                              label="API密钥"
                              outlined
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="fmConfig.embedding_cloud_model.model"
                              label="模型名称"
                              outlined
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="fmConfig.embedding_cloud_model.url"
                              label="API URL"
                              outlined
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="fmConfig.embedding_cloud_model.type"
                              label="类型"
                              outlined
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-switch
                              v-model="fmConfig.embedding_cloud_model.enabled"
                              label="启用"
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model.number="fmConfig.embedding_cloud_model.max_prompts"
                              label="最大提示词数量"
                              type="number"
                              outlined
                            />
                          </v-col>
                        </v-row>
                      </v-card-text>
                    </v-card>

                    <!-- 默认云模型配置 -->
                    <v-card flat class="mb-4 pa-2">
                      <v-card-title class="subtitle-1">默认云模型配置</v-card-title>
                      <v-card-text>
                        <v-row>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="fmConfig.default_cloud_model.api"
                              label="API密钥"
                              outlined
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="fmConfig.default_cloud_model.model"
                              label="模型名称"
                              outlined
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="fmConfig.default_cloud_model.url"
                              label="API URL"
                              outlined
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="fmConfig.default_cloud_model.type"
                              label="类型"
                              outlined
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-switch v-model="fmConfig.default_cloud_model.enabled" label="启用" />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model.number="fmConfig.default_cloud_model.max_prompts"
                              label="最大提示词数量"
                              type="number"
                              outlined
                            />
                          </v-col>
                        </v-row>
                      </v-card-text>
                    </v-card>

                    <!-- 模型配置列表 -->
                    <v-card flat class="mb-4 pa-2">
                      <v-card-title class="subtitle-1 d-flex align-center">
                        <span>模型配置列表</span>
                        <v-spacer />
                        <v-btn color="primary" small @click="addModelConfig">添加模型</v-btn>
                      </v-card-title>
                      <v-card-text>
                        <div
                          v-for="(model, index) in fmConfig.model_configs"
                          :key="index"
                          class="mb-4 pa-3 border rounded"
                        >
                          <div class="d-flex justify-space-between align-center mb-2">
                            <span class="font-weight-medium">模型 #{{ index + 1 }}</span>
                            <span class="font-weight-bold text-deep-orange-accent-4"
                              >模型尺码 {{ model.size }}</span
                            >
                            <v-btn icon small color="error" @click="removeModelConfig(index)">
                              <v-icon small>mdi-delete</v-icon>
                            </v-btn>
                          </div>
                          <v-row>
                            <v-col cols="12" md="6">
                              <v-text-field v-model="model.name" label="模型名称" outlined dense />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model="model.size"
                                label="模型尺码别称"
                                outlined
                                dense
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model.number="model.max_tokens"
                                label="最大Token数"
                                type="number"
                                outlined
                                dense
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model.number="model.num_ctx"
                                label="上下文数量"
                                type="number"
                                outlined
                                dense
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model.number="model.num_keep"
                                label="保留数量"
                                type="number"
                                outlined
                                dense
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model.number="model.num_predict"
                                label="预测数量"
                                type="number"
                                outlined
                                dense
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model.number="model.repeat_last_n"
                                label="重复最后N个"
                                type="number"
                                outlined
                                dense
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field v-model="model.format" label="格式" outlined dense />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model="model.temperature"
                                label="温度"
                                outlined
                                dense
                              />
                            </v-col>
                          </v-row>

                          <!-- 云模型配置 -->
                          <div class="mt-2 pt-2 border-top">
                            <div class="subtitle-2 mb-2">云模型配置</div>
                            <v-row>
                              <v-col cols="12" md="6">
                                <v-text-field
                                  v-model="model.cloud_model.api"
                                  label="API密钥"
                                  outlined
                                  dense
                                />
                              </v-col>
                              <v-col cols="12" md="6">
                                <v-text-field
                                  v-model="model.cloud_model.model"
                                  label="模型名称"
                                  outlined
                                  dense
                                />
                              </v-col>
                              <v-col cols="12" md="6">
                                <v-text-field
                                  v-model="model.cloud_model.url"
                                  label="API URL"
                                  outlined
                                  dense
                                />
                              </v-col>
                              <v-col cols="12" md="6">
                                <v-text-field
                                  v-model="model.cloud_model.type"
                                  label="类型"
                                  outlined
                                  dense
                                />
                              </v-col>
                              <v-col cols="12" md="6">
                                <v-switch v-model="model.cloud_model.enabled" label="启用" dense />
                              </v-col>
                              <v-col cols="12" md="6">
                                <v-text-field
                                  v-model.number="model.cloud_model.max_prompts"
                                  label="最大提示词数量"
                                  type="number"
                                  outlined
                                  dense
                                />
                              </v-col>
                            </v-row>
                          </div>
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-form>
          </v-card-text>
        </v-card>
      </v-container>
    </div>
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      rounded="pill"
      elevation="2"
    >
      {{ snackbar.message }}
    </v-snackbar>

    <!-- 模型切换确认对话框 -->
    <a-modal
      v-model:open="showSwitchConfirmDialog"
      title="切换模型使用模式确认"
      :closable="false"
      width="600px"
    >
      <template #title>
        <div class="d-flex align-center">
          <ExclamationCircleOutlined style="color: #faad14" class="mr-2" />
          切换模型使用模式确认
        </div>
      </template>

      <a-alert type="warning" show-icon class="mb-4">
        <template #message>
          <div class="font-weight-bold mb-2">⚠️ 重要提醒</div>
          <div class="mb-2">
            切换模型使用模式将会重启所有核心服务，这可能会影响以下正在运行的功能：
          </div>
          <ul class="ml-4">
            <li>代码分析和搜索任务</li>
            <li>AI对话和问答服务</li>
            <li>文档生成和处理</li>
            <li>其他依赖AI模型的功能</li>
          </ul>
        </template>
      </a-alert>

      <div class="mb-3">
        <span class="font-weight-bold">即将切换到：</span>
        <a-tag :color="pendingSwitchValue ? 'blue' : 'green'" class="ml-2">
          {{ pendingSwitchValue ? '云端模型' : '本地模型' }}
        </a-tag>
      </div>

      <div class="text-body-2 text-grey-darken-1">
        请确保当前没有重要任务正在进行，然后点击确认继续。
      </div>

      <template #footer>
        <div style="text-align: right">
          <a-button variant="outlined" style="color: #000" @click="cancelSwitch"> 取消 </a-button>
          <a-button type="primary" style="margin-left: 8px; color: #fff" @click="confirmSwitch">
            确认切换
          </a-button>
        </div>
      </template>
    </a-modal>
    <!-- 重启服务进度对话框（Ant Design） -->
    <a-modal
      v-model:open="showRestartDialog"
      :closable="false"
      :mask-closable="false"
      :footer="null"
      width="560px"
    >
      <template #title>
        <div class="d-flex align-center">
          <SyncOutlined style="color: #1677ff" class="mr-2" />
          重启服务中
        </div>
      </template>

      <a-alert type="info" show-icon class="mb-3" message="正在重启核心服务和索引服务，请稍候..." />

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
  </v-container>
</template>

<script setup>
import { useStore } from 'vuex'
import { ref, reactive, onMounted, watch, computed, onBeforeUnmount, nextTick } from 'vue'
import {
  ExclamationCircleOutlined,
  SyncOutlined,
  LoadingOutlined,
  CheckCircleTwoTone,
  CloseCircleTwoTone
} from '@ant-design/icons-vue'
import { getConfig, updateConfig, getFmConfig, updateFmConfig } from '../service/api.js'
import draggable from 'vuedraggable'
import TipBanner from '../components/TipBanner.vue'

const selectedTab = ref('env')

// —— FM配置数据 ——
const fmConfig = reactive({
  ana_prompts: {
    role: '',
    internal_deps: '',
    external_deps: '',
    main: ''
  },
  keyword_prompts: {
    system: '',
    user: ''
  },
  api_base_url: '',
  completion_api: '',
  embedding_api: '',
  auth_base_url: 'http://localhost:3000',
  default_model: '',
  default_format: '',
  default_temp: 0.1,
  normalize_model: '',
  embedding_model: '',
  embedding_max_batch: 50,
  embedding_max_worker: 3,
  llm_parser_prompts: '',
  embedding_cloud_model: {
    api: '',
    model: '',
    url: '',
    enabled: true,
    type: '',
    max_prompts: 30000
  },
  default_cloud_model: {
    api: '',
    model: '',
    url: '',
    enabled: true,
    type: '',
    max_prompts: 30000
  },
  model_configs: [],
  code_limit: 23000,
  prompt_limit: 30000,
  parser_code_line_limit: 500,
  parser_code_chunk_limit: 10
})

// —— 环境检测状态 ——
const ollamaInstalled = ref(null)
const ollamaRunning = ref(null)
const ollamaPid = ref(null)
const pythonInstalled = ref(null)
const attemptedStart = ref(false)
const pandocInstalled = ref(null)
const gitInstalled = ref(null)
const nomicInstalled = ref(null)
const llmInstalled = ref(null)

// —— 平台检测 ——
const isMacOS = ref(navigator.platform.toUpperCase().indexOf('MAC') >= 0)

// —— 依赖包安装状态 ——
const brewInstalled = ref(null)
const pythonInstalling = ref(false)
const pandocInstalling = ref(false)
const gitInstalling = ref(false)
const pythonProgress = ref(0)
const pandocProgress = ref(0)
const gitProgress = ref(0)
const isInstallingDeps = ref(false)

// —— 网络速度监控 ——
const networkSpeed = ref({
  downloadSpeed: 0,
  uploadSpeed: 0,
  formattedDownloadSpeed: '0 B/s',
  formattedUploadSpeed: '0 B/s',
  interfaceName: '',
  isMonitoring: false
})

// —— 安装日志 ——
const installLogs = ref([])

// 添加安装日志条目
const addLogEntry = (type, message) => {
  const timestamp = new Date().toLocaleTimeString()
  installLogs.value.push({
    type, // 'info', 'error', 'success'
    message,
    timestamp
  })

  // 自动滚动到底部
  nextTick(() => {
    const container = document.querySelector('.install-logs-container')
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  })
}

// 清空安装日志
const clearInstallLogs = () => {
  installLogs.value = []
}

// —— 计算属性：需要安装的依赖数量 ——
const needsInstallCount = computed(() => {
  let count = 0
  if (pythonInstalled.value == false || pythonInstalled.value == null) {
    count++
  }
  if (pandocInstalled.value == false || pandocInstalled.value == null) {
    count++
  }
  if (gitInstalled.value == false || gitInstalled.value == null) {
    count++
  }
  return count
})

// —— Windows系统检测 ——
const isWindows = computed(() => {
  return navigator.platform.indexOf('Win') > -1
})

// —— 拖拽分配 ——
const installedModels = ref([])
// 扩展 expertSlots 以包含 fmConfig 中的模型角色
const expertSlots = reactive({
  // 原有角色
  coder: [],
  chatter: [],
  officer: [],
  // fmConfig 模型角色
  default_model: [], // fmConfig.default_model
  embedding_model: [] // fmConfig.embedding_model
})
// 原有角色键名
const oldExpertKeys = ['coder', 'chatter', 'officer']

// fmConfig 模型角色键名
const fmExpertKeys = ['default_model', 'embedding_model']

// 注意：我们不再需要全部角色键名的合并列表，使用各自的列表即可
const slotLabels = {
  coder: '代码助手',
  chatter: '对话助手',
  officer: '总结助手',
  default_model: '索引默认模型',
  embedding_model: '索引嵌入模型',
  model_config: '索引弹性策略模型'
}
const dragOverSlot = ref(null)

// —— 自定义表单 ——
const valid = ref(true)
const config = reactive({
  ollama: {},
  custom: {},
  expertSlots: {},
  deep_research: {
    max_prompts: 0,
    max_code_snippet_limit: 0,
    code_snippet_text_limit: 0
  },
  flow_chart: {
    max_prompts: 0
  }
})
const expandedPanels = ref([])

// —— 部署向导 ——
const deploymentStep = ref(1)
const modelsDeployed = ref(null)
const deploymentInProgress = ref(false)
const deploymentProgress = ref(0)
const currentDeployingModel = ref('')
const modelsNotExits = ref([])

const deployOptions = ref([])
const deploymentProgressOne = ref(0)
const deploymentInProgressOne = ref(false)
const deploymentProgressNec = ref(0)
const deploymentInProgressNec = ref(false)

// —— 标签映射 ——
const ollamaLabels = {
  coder: { label: '代码助手模型', isModel: true },
  chatter: { label: '对话助手模型', isModel: true },
  officer: { label: '总结助手模型', isModel: true },
  max_prompts: { label: '最大上下文长度（Token）', isModel: false },
  max_file_num: { label: '最大文件读取数量', isModel: false }
}
const customLabels = {
  coder: { label: '代码助手模型', isModel: true },
  chatter: { label: '对话助手模型', isModel: true },
  officer: { label: '总结助手模型', isModel: true },
  max_prompts: { label: '最大上下文长度（Token）', isModel: false },
  max_file_num: { label: '最大文件读取数量', isModel: false },
  type: { label: '提供商', isModel: false },
  url: { label: 'API 地址', isModel: false },
  api: { label: 'API Key', isModel: false },
  model: { label: '模型', isModel: false },
  enabled: { label: '启用云端模型', isModel: false }
}

const messages = ref([])

// GitHave AI 订阅相关状态
const isLoggedIn = ref(false)
const selectedGithaveModel = ref('auto')
const isSubscribing = ref(false)
const loginExpired = ref(false)
// 登录用户信息与展示控制
const githaveUser = reactive({
  user_id: '',
  username: '',
  email: '',
  token: '',
  expires: 0,
  loginTime: 0,
  verified: false
})
const showToken = ref(false)
const formattedLoginTime = computed(() =>
  githaveUser.loginTime ? new Date(githaveUser.loginTime).toLocaleString() : '—'
)
const formattedExpireTime = computed(() =>
  githaveUser.expires ? new Date(githaveUser.expires).toLocaleString() : '—'
)
const maskedToken = computed(() => {
  const t = githaveUser.token || ''
  if (!t) return '—'
  if (showToken.value) return t
  return t.length > 8 ? `${t.slice(0, 4)}••••${t.slice(-4)}` : '••••'
})

const copyToClipboard = async (text) => {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    store.dispatch('snackbar/showSnackbar', { message: '已复制到剪贴板', color: 'success' })
  } catch (e) {
    console.error('复制失败:', e)
    store.dispatch('snackbar/showSnackbar', { message: '复制失败，请重试', color: 'error' })
  }
}

// GitHave AI 相关方法
const checkGithaveLoginStatus = async () => {
  try {
    // 检查Electron缓存中的登录状态
    const loginData = localStorage.getItem('githave_login_data')
    if (loginData) {
      const userData = JSON.parse(loginData)
      if (userData.token && userData.expires > Date.now()) {
        isLoggedIn.value = true
        loginExpired.value = false
        Object.assign(githaveUser, {
          user_id: userData.user_id || '',
          username: userData.username || '',
          email: userData.email || '',
          token: userData.token || '',
          expires: userData.expires || 0,
          loginTime: userData.loginTime || 0,
          verified: userData.verified || false
        })
        console.log('GitHave用户已登录:', {
          user_id: userData.user_id,
          username: userData.username,
          email: userData.email,
          loginTime: new Date(userData.loginTime).toLocaleString(),
          verified: userData.verified
        })
        return true
      } else if (userData.expires <= Date.now()) {
        // 登录已过期：提示过期，并清理本地存储
        localStorage.removeItem('githave_login_data')
        loginExpired.value = true
        isLoggedIn.value = false
        Object.assign(githaveUser, {
          user_id: userData.user_id || '',
          username: userData.username || '',
          email: userData.email || '',
          token: userData.token || '',
          expires: userData.expires || 0,
          loginTime: userData.loginTime || 0,
          verified: userData.verified || false
        })
        console.log('GitHave登录已过期，已清除缓存')
      }
    }
    if (!isLoggedIn.value && !loginExpired.value) {
      Object.assign(githaveUser, {
        user_id: '',
        username: '',
        email: '',
        token: '',
        expires: 0,
        loginTime: 0,
        verified: false
      })
    }
    return false
  } catch (error) {
    console.error('检查GitHave登录状态失败:', error)
    // 如果数据格式错误，清除缓存
    localStorage.removeItem('githave_login_data')
    isLoggedIn.value = false
    loginExpired.value = false
    Object.assign(githaveUser, {
      user_id: '',
      username: '',
      email: '',
      token: '',
      expires: 0,
      loginTime: 0,
      verified: false
    })
    return false
  }
}

const loginToGithave = async () => {
  try {
    // 根据配置构造 GitHave 登录页面URL
    const base = (fmConfig.auth_base_url || '').replace(/\/$/, '') || 'http://localhost:3000'
    const authUrl = `${base}/app/auth?callback=githave-desktop`

    // 通过外部浏览器打开GitHave登录页面
    if (window.electron && window.electron.shell && window.electron.shell.openExternal) {
      await window.electron.shell.openExternal(authUrl)

      // 显示等待登录的提示
      store.dispatch('snackbar/showSnackbar', {
        message: '正在打开浏览器登录页面，请完成登录后返回...',
        color: 'info'
      })
    } else {
      // 备用方案：使用window.open
      window.open(authUrl, '_blank')

      store.dispatch('snackbar/showSnackbar', {
        message: '正在打开浏览器登录页面，请完成登录后返回...',
        color: 'info'
      })
    }
  } catch (error) {
    console.error('打开外部浏览器失败:', error)
    const base = (fmConfig.auth_base_url || '').replace(/\/$/, '') || 'http://localhost:3000'
    store.dispatch('snackbar/showSnackbar', {
      message: `打开浏览器失败，请手动访问 ${base}/app/auth`,
      color: 'error'
    })
  }
}

const subscribeGithaveAI = async () => {
  const confirmResult = await window.electron.showMessageBox({
    type: 'question',
    buttons: ['继续', '取消'],
    defaultId: 0,
    cancelId: 1,
    title: '确认订阅 GitHave AI',
    message: '将使用 GitHave 云端模型，并写入当前配置。是否继续？',
    detail:
      '操作将：\n1) 为索引相关的大小模型写入 GitHave 提供商与凭证\n2) 为三个AI助手写入 GitHave 提供商与凭证\n3) 保存配置并进入统一切换与重启流程\n（注意：此操作会覆盖现有的云端模型配置，请及时保存）',
    noLink: true
  })
  if (!confirmResult || confirmResult.response !== 0) {
    return
  }

  if (!isLoggedIn.value) {
    store.dispatch('snackbar/showSnackbar', {
      message: '请先登录GitHave账户',
      color: 'error'
    })
    return
  }

  if (!selectedGithaveModel.value) {
    store.dispatch('snackbar/showSnackbar', {
      message: '请选择大模型',
      color: 'error'
    })
    return
  }

  isSubscribing.value = true

  try {
    // 读取登录信息中的 token
    const loginDataStr = localStorage.getItem('githave_login_data')
    const loginData = loginDataStr ? JSON.parse(loginDataStr) : null
    const token = loginData?.token || ''
    if (!token) {
      throw new Error('未获取到登录凭证，请重新登录')
    }

    // 1. 配置云端模型为GitHave AI
    const githaveProvider = cloudProviders['githave']
    if (!githaveProvider) {
      throw new Error('GitHave AI供应商配置未找到')
    }

    // 2. 配置大模型（默认云模型）
    if (fmConfig.default_cloud_model) {
      fmConfig.default_cloud_model.api = token
      fmConfig.default_cloud_model.url = githaveProvider.apiUrl
      fmConfig.default_cloud_model.type = githaveProvider.type
      fmConfig.default_cloud_model.model = selectedGithaveModel.value
      fmConfig.default_cloud_model.enabled = true
    }

    // 3. 配置小模型（嵌入模型）
    const githaveEmbedProvider = embeddingProviders['githave']
    if (fmConfig.embedding_cloud_model && githaveEmbedProvider) {
      fmConfig.embedding_cloud_model.api = token
      fmConfig.embedding_cloud_model.url = githaveEmbedProvider.apiUrl
      fmConfig.embedding_cloud_model.type = githaveEmbedProvider.type || 'githave'
      fmConfig.embedding_cloud_model.model = 'BAAI/bge-large-zh-v1.5'
      fmConfig.embedding_cloud_model.enabled = true
    }

    // 4. 配置索引弹性策略的云端模型（遍历 model_configs）
    if (Array.isArray(fmConfig.model_configs)) {
      fmConfig.model_configs.forEach((mc) => {
        if (!mc) return
        if (!mc.cloud_model) mc.cloud_model = {}
        mc.cloud_model.api = token
        mc.cloud_model.url = githaveProvider.apiUrl
        mc.cloud_model.type = githaveProvider.type || 'githave'
        // 使用当前选择的大模型作为云端模型标识
        mc.cloud_model.model = selectedGithaveModel.value
        mc.cloud_model.enabled = true
        mc.cloud_model.max_prompts = 30000
        // 若已有自定义温度则保留，否则按订阅默认值设置
        if (typeof mc.cloud_model.temperature !== 'number') {
          mc.cloud_model.temperature = 0.1
        }
      })
    }

    // 5. 同步常规助手 config.custom 为 GitHave AI
    const roles = ['coder', 'chatter', 'officer']
    roles.forEach((role) => {
      if (!config.custom[role]) config.custom[role] = {}
      const cc = config.custom[role]
      cc.api = token
      cc.url = githaveProvider.apiUrl
      cc.type = githaveProvider.type || 'githave'
      cc.model = selectedGithaveModel.value
      cc.enabled = true
      // 默认值：与示例一致；已存在则保留
      if (typeof cc.max_prompts !== 'number') cc.max_prompts = 30000
      if (typeof cc.max_file_num !== 'number') {
        cc.max_file_num = role === 'coder' ? 4 : 0
      }
    })

    console.log(fmConfig, config.custom)

    // 6. 保存配置（同时保存 config 与 fmConfig）
    await Promise.all([updateConfig(config), updateFmConfig(fmConfig)])

    // 7. 触发一次统一的切换确认与重启流程（已改为直接执行重启）
    await executeModelSwitch(true)

    store.dispatch('snackbar/showSnackbar', {
      message: 'GitHave AI订阅配置成功！正在重启服务…',
      color: 'success'
    })
  } catch (error) {
    console.error('GitHave AI订阅失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: '订阅失败: ' + error.message,
      color: 'error'
    })
  } finally {
    isSubscribing.value = false
  }
}

// 退出 GitHave 登录：清理本地缓存并更新状态
const logoutGithave = async () => {
  const confirmResult = await window.electron.showMessageBox({
    type: 'question',
    buttons: ['确认', '取消'],
    defaultId: 0,
    cancelId: 1,
    title: '确认退出 GitHave 登录',
    message: '确认退出 GitHave 登录？',
    detail:
      '操作将：\n1) 清除本地缓存中的 GitHave 登录凭证\n2) 更新本地配置，禁用已配置的 GitHave 云端模型\n3) 触发一次配置保存与重启流程\n（注意：此操作会清除当前的 GitHave 登录状态，且会影响已配置的索引与助手模型）',
    noLink: true
  })
  if (!confirmResult || confirmResult.response !== 0) {
    return
  }
  try {
    localStorage.removeItem('githave_login_data')
    isLoggedIn.value = false
    showToken.value = false
    Object.assign(githaveUser, {
      user_id: '',
      username: '',
      email: '',
      token: '',
      expires: 0,
      loginTime: 0,
      verified: false
    })

    // 清除 GitHave 相关 API 配置
    if (fmConfig && fmConfig.default_cloud_model) {
      fmConfig.default_cloud_model.api = ''
    }
    if (fmConfig && fmConfig.embedding_cloud_model) {
      fmConfig.embedding_cloud_model.api = ''
    }
    if (Array.isArray(fmConfig?.model_configs)) {
      fmConfig.model_configs.forEach((mc) => {
        if (mc && mc.cloud_model) {
          mc.cloud_model.api = ''
        }
      })
    }
    const roles = ['coder', 'chatter', 'officer']
    if (config && config.custom) {
      roles.forEach((role) => {
        if (config.custom[role]) {
          config.custom[role].api = ''
        }
      })
    }

    // 保存配置
    await Promise.all([updateConfig(config), updateFmConfig(fmConfig)])

    await executeModelSwitch(true)

    store.dispatch('snackbar/showSnackbar', {
      message: '已退出 GitHave 登录，并清除了相关 API 配置',
      color: 'success'
    })
  } catch (e) {
    console.error('退出登录失败:', e)
    store.dispatch('snackbar/showSnackbar', {
      message: '退出登录失败，请重试',
      color: 'error'
    })
  }
}

// 处理协议回调 - 基于GitHave App拉起回调协议
const handleProtocolCallback = (data) => {
  console.log('收到GitHave协议回调:', data)

  // 根据协议文档，回调格式为: githave://auth-success?route=auth&repo=success&token={token}&user_id={user_id}&username={username}&email={email}&timestamp={timestamp}&verified={verified}
  if (data.route === 'auth-success' || (data.route === 'auth' && data.repo === 'success')) {
    const { token, user_id, username, email, timestamp, verified } = data
    const isVerified = verified === 'true'

    if (token) {
      // 验证时间戳防止重放攻击（可选）
      if (timestamp) {
        const callbackTime = parseInt(timestamp)
        const currentTime = Date.now()
        const timeDiff = Math.abs(currentTime - callbackTime)

        // 如果时间差超过5分钟，拒绝回调
        if (timeDiff > 5 * 60 * 1000) {
          console.warn('协议回调时间戳过期，拒绝登录')
          store.dispatch('snackbar/showSnackbar', {
            message: '登录回调已过期，请重新登录',
            color: 'warning'
          })
          return
        }
      }

      // 保存完整的用户信息到localStorage
      const loginData = {
        token: token,
        user_id: user_id,
        username: username,
        email: email,
        expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30天过期
        loginTime: Date.now(),
        callbackTime: timestamp,
        verified: isVerified
      }
      localStorage.setItem('githave_login_data', JSON.stringify(loginData))
      Object.assign(githaveUser, {
        user_id,
        username,
        email,
        token,
        expires: loginData.expires,
        loginTime: loginData.loginTime,
        verified: isVerified
      })

      // 更新登录状态
      isLoggedIn.value = true
      loginExpired.value = false

      // 显示登录成功消息，包含用户信息
      const welcomeMessage = username ? `欢迎回来，${username}！` : 'GitHave登录成功！'
      store.dispatch('snackbar/showSnackbar', {
        message: welcomeMessage,
        color: 'success'
      })

      console.log('GitHave登录成功，用户信息:', { user_id, username, email })
    } else {
      console.error('协议回调缺少token参数')
      store.dispatch('snackbar/showSnackbar', {
        message: '登录回调数据不完整，请重新登录',
        color: 'error'
      })
    }
  } else {
    console.log('收到其他协议回调:', data)
  }
}

// —— 拖拽处理 ——
const isDragging = ref(false)

const onDragStart = (model) => {
  event.dataTransfer.setData('application/json', JSON.stringify(model))
  isDragging.value = true
}

const onDragEnd = () => {
  isDragging.value = false
}
const onDrop = (slot) => {
  dragOverSlot.value = null
  const model = JSON.parse(event.dataTransfer.getData('application/json'))
  expertSlots[slot] = [model]

  // 如果是 fmConfig 相关的角色，直接更新 fmConfig 对应的属性
  if (fmExpertKeys.includes(slot)) {
    if (slot === 'default_model') {
      fmConfig.default_model = model.name
      console.log('更新 fmConfig.default_model:', model.name)
    } else if (slot === 'embedding_model') {
      fmConfig.embedding_model = model.name
      console.log('更新 fmConfig.embedding_model:', model.name)
    } else if (slot.startsWith('model_config_')) {
      // 提取索引数字，如 'model_config_0' 中的 0
      const index = parseInt(slot.split('_').pop())
      if (!isNaN(index) && index >= 0 && fmConfig.model_configs[index]) {
        fmConfig.model_configs[index].name = model.name
        console.log(`更新 fmConfig.model_configs[${index}].name:`, model.name)
      }
    }
  }
}

// —— 环境检测 ——
async function checkOllama() {
  try {
    // 假设 IPC 返回 { installed, running, pid }
    const { installed, running, pid } = await window.electron.checkOllamaIPC()
    ollamaInstalled.value = installed
    ollamaRunning.value = running
    ollamaPid.value = pid || null
  } catch {
    ollamaInstalled.value = false
    ollamaRunning.value = false
    ollamaPid.value = null
  }
}
const retryOllama = async () => {
  attemptedStart.value = true
  await checkOllama()
}
const openOllamaWebsite = () => window.open('https://ollama.com', '_blank')

const checkPython = async () => {
  try {
    const { success, version } = await window.electron.checkPythonIPC()
    console.log('python 检测结果：', success)

    if (!success) {
      pythonInstalled.value = false
      return
    }

    // 使用正则表达式提取版本号
    const versionMatch = version.match(/^Python (\d+)\.(\d+)\.(\d+)$/)
    if (!versionMatch) {
      pythonInstalled.value = false
      return
    }

    // 提取主版本号、次版本号、修订号
    const [, major, minor, patch] = versionMatch.map(Number)

    // 目标版本号
    const targetVersion = { major: 3, minor: 9, patch: 0 } // 比较版本号, 3.9.0
    console.log('targetVersion :', targetVersion)
    // 比较版本号
    if (
      major > targetVersion.major ||
      (major === targetVersion.major && minor > targetVersion.minor) ||
      (major === targetVersion.major &&
        minor === targetVersion.minor &&
        patch > targetVersion.patch)
    ) {
      console.log('Python 版本大于或等于目标版本')
      pythonInstalled.value = true
      return
    }
    console.log('Python 版本小于或等于目标版本')
    pythonInstalled.value = false
    return
  } catch {
    console.log('Python 未安装')
    pythonInstalled.value = false
    return
  }
}
const openPythonWebsite = () =>
  window.open('https://www.python.org/downloads/release/python-3133/', '_blank')

const openHomeBrewWebsite = () => window.open('https://brew.sh/', '_blank')

const checkNomic = async () => {
  try {
    // const nomic1 = await window.electron.checkModelInstalled('nomic-embed-text:latest')
    const nomic2 = await window.electron.checkModelInstalled('quentinz/bge-large-zh-v1.5:latest')
    // const nomic3 = await window.electron.checkModelInstalled(
    //  'nn200433/text2vec-bge-large-chinese:latest'
    // )
    console.log('nomicInstalled', nomic2)
    nomicInstalled.value = nomic2
  } catch {
    nomicInstalled.value = false
  }
}
const retryNomic = async () => {
  await checkNomic()
}

const checkLlm = async () => {
  try {
    const llm1 = await window.electron.checkModelInstalled('qwen2.5-coder:0.5b')
    const llm2 = await window.electron.checkModelInstalled('qwen2.5-coder:1.5b')
    const llm3 = await window.electron.checkModelInstalled('qwen2.5-coder:3b')
    const llm4 = await window.electron.checkModelInstalled('qwen2.5-coder:7b')
    console.log('llmInstalled', llm1, llm2, llm3, llm4)
    llmInstalled.value = llm1 && llm2 && llm3 && llm4
  } catch {
    llmInstalled.value = false
  }
}
const retryRwkv = async () => {
  await checkLlm()
}

const installNecessaryModels = async () => {
  const toInstall = []
  if (!nomicInstalled.value) {
    // toInstall.push('nomic-embed-text:latest')
    toInstall.push('quentinz/bge-large-zh-v1.5:latest')
    // toInstall.push('nn200433/text2vec-bge-large-chinese:latest')
  }
  if (!llmInstalled.value) {
    toInstall.push('qwen2.5-coder:0.5b')
    toInstall.push('qwen2.5-coder:1.5b')
    toInstall.push('qwen2.5-coder:3b')
    toInstall.push('qwen2.5-coder:7b')
  }
  if (!toInstall.length) return
  console.log('toInstall:', toInstall)
  if (customModelEnabled.value && customModel.value.trim()) {
    toInstall.push(customModel.value.trim())
  }
  if (!toInstall.length) return

  deploymentInProgressNec.value = true
  deploymentProgressNec.value = 0

  try {
    // 1. 注册进度回调
    window.electron.onInstallProgress((data) => {
      console.log('progress event:', data)
      if (typeof data.progress === 'number') {
        deploymentProgressNec.value = data.progress
      }
    })
    // 2. 安装
    await window.electron.installModels(toInstall)
    // 3. 安装完成，进度达 100% 时弹窗
    if (deploymentProgressNec.value === 100) {
      alert('🎉 模型部署成功！')
    }
  } catch (e) {
    console.error('模型部署失败：', e)
  } finally {
    // 3. 清理监听，重置状态
    window.electron.clearInstallProgressListeners?.()
    deploymentInProgressNec.value = false
  }
}

// —— 部署向导方法 ——
const animateProgress = (duration) =>
  new Promise((resolve) => {
    deploymentProgress.value = 0
    deploymentInProgress.value = true
    const start = performance.now()
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1)
      deploymentProgress.value = Math.floor(100 * (1 - (1 - t) ** 2))
      if (t < 1) requestAnimationFrame(step)
      else {
        deploymentInProgress.value = false
        resolve()
      }
    }
    requestAnimationFrame(step)
  })

const nextStep = () => {
  if (deploymentStep.value === 1) {
    deploymentStep.value = 2
    checkModelsDeployment()
  } else if (deploymentStep.value === 2 && modelsDeployed.value) {
    animateProgress(2000).then(() => {
      deploymentStep.value = 3
    })
  }
}

const checkModelsDeployment = async () => {
  const list = []
  for (const k in ollamaLabels) {
    if (ollamaLabels[k].isModel && config.ollama[k]) list.push(config.ollama[k])
  }
  try {
    modelsDeployed.value = await window.electron.checkModelDeployment(list)
    if (!modelsDeployed.value) modelsNotExits.value = list
  } catch {
    modelsDeployed.value = false
  }
}

const startDeployment = async () => {
  deploymentStep.value = 3
  const list = []
  for (const k in ollamaLabels) {
    if (ollamaLabels[k].isModel && config.ollama[k]) list.push(config.ollama[k])
  }
  deploymentInProgress.value = true
  await window.electron.onInstallProgress((data) => {
    console.log('⚙️ onInstallProgress event:', data)
    deploymentProgress.value = data.progress
    currentDeployingModel.value = data.model
  })
  try {
    await window.electron.installModels(list)
    await animateProgress(2000)
    deploymentStep.value = 3
  } catch (e) {
    console.error(e)
    deploymentInProgress.value = false
  } finally {
    window.electron.clearInstallProgressListeners?.()
  }
}

// —— 配置获取与保存 ——
const fetchConfig = async () => {
  try {
    const resp = await getConfig()
    Object.assign(config, resp.data)
    if (resp.data.expertSlots) Object.assign(expertSlots, resp.data.expertSlots)
  } catch (e) {
    console.error(e)
  }
}

const initExpertSlotsFromConfig = () => {
  // 从config初始化原有expertSlots
  oldExpertKeys.forEach((slot) => {
    const name = config.ollama[slot]
    if (name) {
      const found = installedModels.value.find((m) => m.name === name)
      expertSlots[slot] = found ? [found] : [{ id: name, name, size: '', modified: '' }]
    }
  })

  // 从fmConfig初始化FM相关的expertSlots
  // 初始化 default_model
  if (fmConfig.default_model) {
    const defaultModel = fmConfig.default_model
    const found = installedModels.value.find((m) => m.name === defaultModel)
    expertSlots.default_model = found
      ? [found]
      : [{ id: defaultModel, name: defaultModel, size: '', modified: '' }]
  }

  // 初始化 embedding_model
  if (fmConfig.embedding_model) {
    const embeddingModel = fmConfig.embedding_model
    const found = installedModels.value.find((m) => m.name === embeddingModel)
    expertSlots.embedding_model = found
      ? [found]
      : [{ id: embeddingModel, name: embeddingModel, size: '', modified: '' }]
  }

  // 初始化 model_configs 数组的前三个元素
  for (let i = 0; i < fmConfig.model_configs.length; i++) {
    if (fmConfig.model_configs[i]?.name) {
      const modelName = fmConfig.model_configs[i].name
      const found = installedModels.value.find((m) => m.name === modelName)
      const slotKey = `model_config_${i}`
      expertSlots[slotKey] = found
        ? [found]
        : [{ id: modelName, name: modelName, size: '', modified: '' }]
    }
  }
}

const saveModelConfig = async () => {
  // 重置进度状态
  restartProgress.value.forEach((step) => (step.status = 'pending'))
  isRestarting.value = true
  showRestartDialog.value = true

  try {
    // 步骤1: 修改配置
    restartProgress.value[0].status = 'running'

    // 同步原有 expertSlots 到 config
    oldExpertKeys.forEach((slot) => {
      config.ollama[slot] = expertSlots[slot][0]?.name || ''
    })
    config.expertSlots = { ...expertSlots }

    // 同步 fmConfig 相关的 expertSlots 到 fmConfig
    if (expertSlots.default_model[0]) {
      fmConfig.default_model = expertSlots.default_model[0].name
    }
    if (expertSlots.embedding_model[0]) {
      fmConfig.embedding_model = expertSlots.embedding_model[0].name
    }

    // 全量同步 model_configs（根据 expertSlots 中的 model_config_i 对应项）
    if (Array.isArray(fmConfig.model_configs)) {
      fmConfig.model_configs.forEach((_, i) => {
        const slotKey = `model_config_${i}`
        if (expertSlots[slotKey]?.[0]) {
          fmConfig.model_configs[i].name = expertSlots[slotKey][0].name
        }
      })
    }

    // 保存两个配置
    await Promise.all([updateConfig(config), updateFmConfig(fmConfig)])

    restartProgress.value[0].status = 'completed'
    await new Promise((resolve) => setTimeout(resolve, 500))

    // 步骤2: 停止核心服务
    restartProgress.value[1].status = 'running'
    try {
      await window.electron.stopApp()
      restartProgress.value[1].status = 'completed'
    } catch (error) {
      console.warn('停止核心服务失败，可能已经停止:', error)
      restartProgress.value[1].status = 'completed'
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 步骤3: 停止索引服务
    restartProgress.value[2].status = 'running'
    try {
      await window.electron.stopFmHttp()
      restartProgress.value[2].status = 'completed'
    } catch (error) {
      console.warn('停止索引服务失败，可能已经停止:', error)
      restartProgress.value[2].status = 'completed'
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 步骤4: 启动核心服务
    restartProgress.value[3].status = 'running'
    const sysConfigResp = await window.electron.sysConfig()
    const startAppResult = await window.electron.startApp(sysConfigResp.configPath)
    if (startAppResult.started) {
      restartProgress.value[3].status = 'completed'
    } else {
      throw new Error('启动核心服务失败')
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 步骤5: 启动索引服务
    restartProgress.value[4].status = 'running'
    const fmConfigResp = await window.electron.fmConfig()
    const startFmResult = await window.electron.startFmHttp(fmConfigResp.configPath)
    if (startFmResult.started) {
      restartProgress.value[4].status = 'completed'
    } else {
      throw new Error('启动索引服务失败')
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 步骤6: 完成
    restartProgress.value[5].status = 'completed'

    store.dispatch('snackbar/showSnackbar', {
      message: '模型配置和FM配置已成功保存，服务已重启',
      color: 'success'
    })
  } catch (error) {
    console.error('保存配置失败:', error)
    // 标记当前步骤为失败
    const currentStepIndex = restartProgress.value.findIndex((step) => step.status === 'running')
    if (currentStepIndex !== -1) {
      restartProgress.value[currentStepIndex].status = 'error'
    }
    store.dispatch('snackbar/showSnackbar', {
      message: '保存配置失败: ' + error.message,
      color: 'error'
    })
  } finally {
    isRestarting.value = false
  }
}

// —— 标签获取 ——
const getOllamaLabel = (key) => ollamaLabels[key]?.label || key
const getCustomLabel = (key) => customLabels[key]?.label || key

// —— 已装模型列表 ——
const fetchInstalledModels = async () => {
  try {
    const ms = await window.electron.listModels()
    installedModels.value = ms.map((m) => ({
      id: m.id || m.NAME || m.name,
      name: m.name || m.NAME || '',
      size: m.size || '未知',
      modified: m.modified || '未知'
    }))
  } catch {
    installedModels.value = []
  }
}

// —— 删除模型方法 ——
// 点击 chip 关闭图标时调用，IPC 请求删除后从列表中移除
const removeModel = async (model) => {
  const confirmed = window.confirm(`确定要删除模型 " ${model.name} " 吗？`)
  if (!confirmed) return
  try {
    await window.electron.removeModels(model.name)
    // 本地状态中滤除已删模型
    installedModels.value = installedModels.value.filter((m) => m.id !== model.id)
  } catch (e) {
    console.error('删除模型失败：', e)
    alert('删除模型失败，请重试')
  }
}

// 重置：重新从后端拉取配置并恢复拖拽槽位
const resetConfig = async () => {
  try {
    await fetchConfig()
    await fetchFmConfig()
    await fetchInstalledModels()
    initExpertSlotsFromConfig()
    expandedPanels.value = [] // 可选：收起所有面板
  } catch (e) {
    console.error('重置配置失败：', e)
  }
}

const customModelEnabled = ref(false)
const customModel = ref('')
// —— 新增：一键部署模型相关 —— //
const builtInModels = [
  {
    label: '【官方推荐】始智RWKV-7"GooseOne"系列(先进架构/低功耗):1.5b',
    value: ['mollysama/rwkv-7-world:1.5b']
  },
  { label: '【官方推荐】谷歌Gemma3系列(多模态):4b', value: ['gemma3:4b'] },
  { label: '【官方推荐】深度求索DeepSeek系列(推理):7b', value: ['deepseek-r1:7b'] },
  { label: '【官方推荐】阿里千问系列(代码专家):7b', value: ['qwen2.5-coder:7b'] }
]

// 打开 Ollama 搜索页面
const openOllamaSearch = () => {
  window.open('https://ollama.com/search', '_blank')
}
/**
 * startDeploy 严格仿照 installNecessaryModels：
 * 1. 直接调用 onInstallProgress 注册回调（不 await）
 * 2. await installModels
 * 3. finally 清理监听器并重置 inProgress
 */
const startDeploy = async () => {
  // 1. 将 deployOptions.value（数组的数组）展平成一维的字符串列表
  const toInstall = deployOptions.value.flatMap((val) => (Array.isArray(val) ? val : [val]))
  console.log('toInstall:', toInstall)
  if (customModelEnabled.value && customModel.value.trim()) {
    toInstall.push(customModel.value.trim())
  }
  if (!toInstall.length) return

  deploymentInProgressOne.value = true
  deploymentProgressOne.value = 0

  try {
    // 1. 注册进度回调
    window.electron.onInstallProgress((data) => {
      console.log('progress event:', data)
      if (typeof data.progress === 'number') {
        deploymentProgressOne.value = data.progress
      }
    })
    // 2. 安装
    await window.electron.installModels(toInstall)
    // 3. 安装完成，进度达 100% 时弹窗
    if (deploymentProgressOne.value === 100) {
      alert('🎉 模型部署成功！')
    }
  } catch (e) {
    console.error('模型部署失败：', e)
  } finally {
    // 3. 清理监听，重置状态
    window.electron.clearInstallProgressListeners?.()
    deploymentInProgressOne.value = false
  }
}

// —— FM配置相关方法 ——
const fetchFmConfig = async () => {
  try {
    const resp = await getFmConfig()
    if (resp.data) {
      // 将API返回的数据合并到fmConfig对象中
      Object.keys(resp.data).forEach((key) => {
        if (key in fmConfig) {
          if (typeof fmConfig[key] === 'object' && !Array.isArray(fmConfig[key])) {
            // 对于嵌套对象，进行深度合并
            Object.assign(fmConfig[key], resp.data[key])
          } else {
            // 对于基本类型或数组，直接赋值
            fmConfig[key] = resp.data[key]
          }
        }
      })
      console.log('FM配置加载成功', fmConfig)
    }
  } catch (e) {
    console.error('获取FM配置失败:', e)
  }
}

// 保存FM配置
const saveFmConfig = async () => {
  // 重置进度状态
  restartProgress.value.forEach((step) => (step.status = 'pending'))
  isRestarting.value = true
  showRestartDialog.value = true

  try {
    // 步骤1: 修改配置
    restartProgress.value[0].status = 'running'

    await updateFmConfig(fmConfig)

    restartProgress.value[0].status = 'completed'
    await new Promise((resolve) => setTimeout(resolve, 500))

    // 步骤2: 停止核心服务
    restartProgress.value[1].status = 'running'
    try {
      await window.electron.stopApp()
      restartProgress.value[1].status = 'completed'
    } catch (error) {
      console.warn('停止核心服务失败，可能已经停止:', error)
      restartProgress.value[1].status = 'completed'
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 步骤3: 停止索引服务
    restartProgress.value[2].status = 'running'
    try {
      await window.electron.stopFmHttp()
      restartProgress.value[2].status = 'completed'
    } catch (error) {
      console.warn('停止索引服务失败，可能已经停止:', error)
      restartProgress.value[2].status = 'completed'
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 步骤4: 启动核心服务
    restartProgress.value[3].status = 'running'
    const sysConfigResp = await window.electron.sysConfig()
    const startAppResult = await window.electron.startApp(sysConfigResp.configPath)
    if (startAppResult.started) {
      restartProgress.value[3].status = 'completed'
    } else {
      throw new Error('启动核心服务失败')
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 步骤5: 启动索引服务
    restartProgress.value[4].status = 'running'
    const fmConfigResp = await window.electron.fmConfig()
    const startFmResult = await window.electron.startFmHttp(fmConfigResp.configPath)
    if (startFmResult.started) {
      restartProgress.value[4].status = 'completed'
    } else {
      throw new Error('启动索引服务失败')
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 步骤6: 完成
    restartProgress.value[5].status = 'completed'

    store.dispatch('snackbar/showSnackbar', {
      message: 'FM配置已保存，服务已重启',
      color: 'success'
    })
  } catch (error) {
    console.error('保存FM配置失败:', error)
    // 标记当前步骤为失败
    const currentStepIndex = restartProgress.value.findIndex((step) => step.status === 'running')
    if (currentStepIndex !== -1) {
      restartProgress.value[currentStepIndex].status = 'error'
    }
    store.dispatch('snackbar/showSnackbar', {
      message: '保存失败，请重试: ' + error.message,
      color: 'error'
    })
  } finally {
    isRestarting.value = false
  }
}

// 重置FM配置
const resetFmConfig = async () => {
  try {
    await fetchFmConfig()
    alert('FM配置已重置')
  } catch (e) {
    console.error('重置FM配置失败:', e)
  }
}

// 添加模型配置
const addModelConfig = () => {
  // 创建新的模型配置模板
  const newModel = {
    name: 'new-model',
    max_tokens: 2048,
    num_ctx: 1024,
    num_keep: 2048,
    num_predict: 512,
    repeat_last_n: 128,
    format: 'json',
    size: 'S',
    temperature: 0.1,
    cloud_model: {
      api: fmConfig.default_cloud_model.api,
      model: fmConfig.default_cloud_model.model,
      url: fmConfig.default_cloud_model.url,
      enabled: true,
      type: fmConfig.default_cloud_model.type,
      max_prompts: 30000,
      temperature: 0.1
    }
  }

  // 添加到模型配置列表
  fmConfig.model_configs.push(newModel)
}

// 删除模型配置
const removeModelConfig = (index) => {
  if (index >= 0 && index < fmConfig.model_configs.length) {
    const confirmed = window.confirm(`确定要删除模型配置 #${index + 1} 吗？`)
    if (confirmed) {
      fmConfig.model_configs.splice(index, 1)
    }
  }
}

// —— 预设云端模型供应商配置 ——
const cloudProviders = {
  githave: {
    name: 'GitHave AI',
    apiUrl: 'https://api.githave.com/v1/',
    type: 'githave',
    models: ['auto', 'openai', 'qwen']
  },
  siliconflow: {
    name: '硅基流动',
    apiUrl: 'https://api.siliconflow.cn/v1/',
    type: 'openai',
    models: [
      'BAAI/bge-large-zh-v1.5',
      'deepseek-ai/DeepSeek-V3',
      'deepseek-ai/DeepSeek-R1',
      'Qwen/Qwen2.5-Coder-7B-Instruct',
      'Qwen/Qwen2.5-Coder-32B-Instruct',
      'Qwen/Qwen2.5-72B-Instruct',
      'meta-llama/Llama-3.1-405B-Instruct',
      'meta-llama/Llama-3.1-70B-Instruct',
      'meta-llama/Llama-3.1-8B-Instruct',
      'THUDM/glm-4-9b-chat',
      'google/gemma-2-9b-it',
      'mistralai/Mistral-7B-Instruct-v0.3'
    ]
  },
  qwen: {
    name: '阿里云百炼',
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    type: 'qwen',
    models: [
      'qwen-max',
      'qwen-plus',
      'qwen-turbo',
      'qwen-long',
      'qwen2.5-72b-instruct',
      'qwen2.5-32b-instruct',
      'qwen2.5-14b-instruct',
      'qwen2.5-7b-instruct',
      'qwen2.5-coder-32b-instruct',
      'qwen2.5-coder-14b-instruct',
      'qwen2.5-coder-7b-instruct'
    ]
  },
  openai: {
    name: 'OpenAI',
    apiUrl: 'https://api.openai.com/v1/',
    type: 'openai',
    models: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'o1-preview',
      'o1-mini'
    ]
  },
  deepseek: {
    name: 'DeepSeek',
    apiUrl: 'https://api.deepseek.com/chat/completions',
    type: 'openai',
    models: ['deepseek-chat', 'deepseek-reasoner']
  },
  doubao: {
    name: '火山引擎豆包',
    apiUrl: 'https://ark.cn-beijing.volces.com/api/v3/',
    type: 'doubao',
    models: ['doubao-pro-32k', 'doubao-pro-4k', 'doubao-lite-32k', 'doubao-lite-4k']
  },
  anthropic: {
    name: 'Anthropic',
    apiUrl: 'https://api.anthropic.com/v1/',
    type: 'anthropic',
    models: [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ]
  },
  moonshot: {
    name: '月之暗面 Kimi',
    apiUrl: 'https://api.moonshot.cn/v1/',
    type: 'openai',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k']
  },
  zhipu: {
    name: '智谱AI',
    apiUrl: 'https://open.bigmodel.cn/api/paas/v4/',
    type: 'zhipu',
    models: ['glm-4-plus', 'glm-4-0520', 'glm-4', 'glm-4-air', 'glm-4-airx', 'glm-4-flash']
  }
}

// —— 预设嵌入模型供应商配置 ——
const embeddingProviders = {
  githave: {
    name: 'GitHave AI',
    apiUrl: 'https://api.githave.com/v1/',
    type: 'githave',
    models: ['BAAI/bge-large-zh-v1.5', 'text-embedding-3-large', 'text-embedding-3-small']
  },
  siliconflow: {
    name: '硅基流动',
    apiUrl: 'https://api.siliconflow.cn/v1/',
    type: 'openai',
    models: [
      'BAAI/bge-large-zh-v1.5',
      'BAAI/bge-m3',
      'netease-youdao/bce-embedding-base_v1',
      'jinaai/jina-embeddings-v2-base-zh'
    ]
  },
  qwen: {
    name: '阿里云百炼',
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    type: 'qwen',
    models: [
      'text-embedding-v1',
      'text-embedding-v2',
      'text-embedding-async-v1',
      'text-embedding-async-v2'
    ]
  },
  openai: {
    name: 'OpenAI',
    apiUrl: 'https://api.openai.com/v1/',
    type: 'openai',
    models: ['text-embedding-3-large', 'text-embedding-3-small', 'text-embedding-ada-002']
  },
  zhipu: {
    name: '智谱AI',
    apiUrl: 'https://open.bigmodel.cn/api/paas/v4/',
    type: 'zhipu',
    models: ['embedding-2']
  }
}

// 获取所有供应商列表
const getProviderOptions = () => {
  return Object.entries(cloudProviders).map(([key, provider]) => ({
    value: key,
    title: provider.name
  }))
}

// 根据选择的供应商获取模型列表
const getModelOptions = (providerKey) => {
  if (!providerKey || !cloudProviders[providerKey]) return []
  return cloudProviders[providerKey].models.map((model) => model)
}

// 获取嵌入模型供应商列表
const getEmbeddingProviderOptions = () => {
  return Object.entries(embeddingProviders).map(([key, provider]) => ({
    value: key,
    title: provider.name
  }))
}

// 根据选择的供应商获取嵌入模型列表
const getEmbeddingModelOptions = (providerKey) => {
  if (!providerKey || !embeddingProviders[providerKey]) return []
  return embeddingProviders[providerKey].models.map((model) => model)
}

// 当供应商改变时自动填充URL和type
const onProviderChange = (configRef, providerKey) => {
  if (!providerKey || !cloudProviders[providerKey]) return
  const provider = cloudProviders[providerKey]
  configRef.url = provider.apiUrl
  configRef.type = provider.type
  // 清空模型选择，让用户重新选择
  configRef.model = ''
}

// 当嵌入模型供应商改变时自动填充URL和type
const onEmbeddingProviderChange = (configRef, providerKey) => {
  if (!providerKey || !embeddingProviders[providerKey]) return
  const provider = embeddingProviders[providerKey]
  configRef.url = provider.apiUrl
  configRef.type = provider.type
  // 清空模型选择，让用户重新选择
  configRef.model = ''
}

// —— 统一云端模型配置 ——
const allCloudConfigs = ref([])
// —— 嵌入模型配置 ——
const embeddingConfigs = ref([])

function collectAllCloudConfigs() {
  const arr = []
  // 1. config.custom
  Object.entries(config.custom).forEach(([slot, cfg]) => {
    arr.push({
      type: 'custom',
      slot,
      ref: cfg,
      label: `常规角色：${slotLabels[slot] || slot}`,
      selectedProvider: getProviderKeyByUrl(cfg.url) || '',
      showApiKey: false
    })
  })
  // 2. fmConfig.embedding_cloud_model - 移到单独的嵌入模型配置中
  // 注释掉原来的嵌入模型配置
  // 3. fmConfig.default_cloud_model
  arr.push({
    type: 'default_cloud_model',
    ref: fmConfig.default_cloud_model,
    label: '索引默认云模型',
    selectedProvider: getProviderKeyByUrl(fmConfig.default_cloud_model.url) || '',
    showApiKey: false
  })
  // 4. fmConfig.model_configs
  fmConfig.model_configs.forEach((model, idx) => {
    if (model.cloud_model) {
      arr.push({
        type: 'model_configs',
        index: idx,
        ref: model.cloud_model,
        label: `索引弹性策略云模型 ${model.size}尺码`,
        selectedProvider: getProviderKeyByUrl(model.cloud_model.url) || '',
        showApiKey: false
      })
    }
  })
  allCloudConfigs.value = arr
}

function collectEmbeddingConfigs() {
  const arr = []
  // 嵌入模型配置
  arr.push({
    type: 'embedding_cloud_model',
    ref: fmConfig.embedding_cloud_model,
    label: '索引嵌入云模型',
    selectedProvider: getEmbeddingProviderKeyByUrl(fmConfig.embedding_cloud_model.url) || '',
    showApiKey: false
  })
  embeddingConfigs.value = arr
}

// 新增：统一补全/规范化云端模型字段，避免 undefined 导致切换失败
function normalizeCloudModels() {
  // 1) 三个常规助手（custom.coder / custom.chatter / custom.officer）
  const ensureCustom = (key) => {
    if (!config.custom[key]) config.custom[key] = {}
    const t = config.custom[key]
    t.api = t.api || ''
    t.url = t.url || ''
    t.type = t.type || ''
    t.model = t.model || ''
    t.enabled = !!t.enabled
  }
  ;['coder', 'chatter', 'officer'].forEach(ensureCustom)

  // 2) 索引弹性策略云模型（fmConfig.model_configs[*].cloud_model）
  if (!Array.isArray(fmConfig.model_configs)) fmConfig.model_configs = []
  fmConfig.model_configs.forEach((mc) => {
    if (!mc.cloud_model) mc.cloud_model = {}
    const t = mc.cloud_model
    t.api = t.api || ''
    t.url = t.url || ''
    t.type = t.type || ''
    t.model = t.model || ''
    t.enabled = !!t.enabled
  })

  // 3) 默认与嵌入云模型兜底
  if (!fmConfig.default_cloud_model)
    fmConfig.default_cloud_model = { api: '', url: '', type: '', model: '', enabled: false }
  if (!fmConfig.embedding_cloud_model)
    fmConfig.embedding_cloud_model = { api: '', url: '', type: '', model: '', enabled: false }
}

// 新增：在保存前把统一配置面板中的更改，可靠地写回到 config/fmConfig
const applyCloudConfigsBeforeSave = () => {
  // 处理大模型配置（custom/default_cloud_model/model_configs）
  allCloudConfigs.value.forEach((item) => {
    const providerKey = item.selectedProvider
    const applyProviderMeta = (target, key) => {
      if (key && cloudProviders[key]) {
        target.url = cloudProviders[key].apiUrl
        target.type = cloudProviders[key].type
      }
    }

    if (item.type === 'custom') {
      // 确保目标对象存在
      if (!config.custom[item.slot]) config.custom[item.slot] = {}
      const target = config.custom[item.slot]
      // 将表单中的字段合并回去
      Object.assign(target, item.ref)
      applyProviderMeta(target, providerKey)
    } else if (item.type === 'default_cloud_model') {
      const target = fmConfig.default_cloud_model
      Object.assign(target, item.ref)
      applyProviderMeta(target, providerKey)
    } else if (item.type === 'model_configs') {
      // 确保数组项与 cloud_model 存在
      if (!fmConfig.model_configs[item.index]) fmConfig.model_configs[item.index] = {}
      if (!fmConfig.model_configs[item.index].cloud_model)
        fmConfig.model_configs[item.index].cloud_model = {}
      const target = fmConfig.model_configs[item.index].cloud_model
      Object.assign(target, item.ref)
      applyProviderMeta(target, providerKey)
    }
  })

  // 处理嵌入模型配置
  embeddingConfigs.value.forEach((item) => {
    if (item.type !== 'embedding_cloud_model') return
    const target = fmConfig.embedding_cloud_model
    Object.assign(target, item.ref)
    const key = item.selectedProvider
    if (key && embeddingProviders[key]) {
      target.url = embeddingProviders[key].apiUrl
      target.type = embeddingProviders[key].type
    }
  })
}

// 根据URL反推供应商key
const getProviderKeyByUrl = (url) => {
  if (!url) return ''
  for (const [key, provider] of Object.entries(cloudProviders)) {
    if (
      url.includes(provider.apiUrl.replace('https://', '').replace('http://', '').split('/')[0])
    ) {
      return key
    }
  }
  return ''
}

// 根据URL反推嵌入模型供应商key
const getEmbeddingProviderKeyByUrl = (url) => {
  if (!url) return ''
  for (const [key, provider] of Object.entries(embeddingProviders)) {
    if (
      url.includes(provider.apiUrl.replace('https://', '').replace('http://', '').split('/')[0])
    ) {
      return key
    }
  }
  return ''
}

// tab切换到remote时自动拉取并归纳
watch(selectedTab, async (val) => {
  if (val === 'remote') {
    await fetchConfig()
    await fetchFmConfig()
    collectAllCloudConfigs()
    collectEmbeddingConfigs()
  }
})

// 刷新模型列表
const refreshModelList = async () => {
  try {
    // 重新获取已安装的模型列表
    const models = await window.electron.listModels()
    installedModels.value = models.map((model, index) => ({
      id: model.id || `model-${index}`,
      name: model.name,
      size: model.size || 'Unknown',
      modified: model.modified || 'Unknown'
    }))

    // 重新初始化专家插槽
    initExpertSlotsFromConfig()

    // 显示成功提示
    snackbar.value = {
      show: true,
      message: '模型列表已刷新',
      color: 'success'
    }
  } catch (error) {
    console.error('刷新模型列表失败:', error)
    snackbar.value = {
      show: true,
      message: '刷新模型列表失败',
      color: 'error'
    }
  }
}

// 保存所有云端配置
const saveAllCloudConfigs = async () => {
  // 二次确认
  const confirmed = confirm('确定要保存所有配置吗？')
  if (!confirmed) return
  // 重置进度状态
  restartProgress.value.forEach((step) => (step.status = 'pending'))
  isRestarting.value = true
  showRestartDialog.value = true

  try {
    // 步骤1: 修改配置
    restartProgress.value[0].status = 'running'

    // 先将面板变更写回到 config/fmConfig
    applyCloudConfigsBeforeSave()

    // 保存两个配置
    await Promise.all([updateConfig(config), updateFmConfig(fmConfig)])

    restartProgress.value[0].status = 'completed'
    await new Promise((resolve) => setTimeout(resolve, 500))

    // 步骤2: 停止核心服务
    restartProgress.value[1].status = 'running'
    try {
      await window.electron.stopApp()
      restartProgress.value[1].status = 'completed'
    } catch (error) {
      console.warn('停止核心服务失败，可能已经停止:', error)
      restartProgress.value[1].status = 'completed'
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 步骤3: 停止索引服务
    restartProgress.value[2].status = 'running'
    try {
      await window.electron.stopFmHttp()
      restartProgress.value[2].status = 'completed'
    } catch (error) {
      console.warn('停止索引服务失败，可能已经停止:', error)
      restartProgress.value[2].status = 'completed'
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 步骤4: 启动核心服务
    restartProgress.value[3].status = 'running'
    const sysConfigResp = await window.electron.sysConfig()
    const startAppResult = await window.electron.startApp(sysConfigResp.configPath)
    if (startAppResult.started) {
      restartProgress.value[3].status = 'completed'
    } else {
      throw new Error('启动核心服务失败')
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 步骤5: 启动索引服务
    restartProgress.value[4].status = 'running'
    const fmConfigResp = await window.electron.fmConfig()
    const startFmResult = await window.electron.startFmHttp(fmConfigResp.configPath)
    if (startFmResult.started) {
      restartProgress.value[4].status = 'completed'
    } else {
      throw new Error('启动索引服务失败')
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 步骤6: 完成
    restartProgress.value[5].status = 'completed'

    store.dispatch('snackbar/showSnackbar', {
      message: '✅ 所有云端模型配置已成功保存，服务已重启',
      color: 'success'
    })
  } catch (error) {
    console.error('保存云端配置失败:', error)
    // 标记当前步骤为失败
    const currentStepIndex = restartProgress.value.findIndex((step) => step.status === 'running')
    if (currentStepIndex !== -1) {
      restartProgress.value[currentStepIndex].status = 'error'
    }
    store.dispatch('snackbar/showSnackbar', {
      message: '❌ 保存配置失败: ' + error.message,
      color: 'error'
    })
  } finally {
    isRestarting.value = false
  }
}

// 获取 Vuex store 实例
const store = useStore()
const snackbar = computed(() => store.state.snackbar)

// —— 打开 Pandoc 官网 ——
const openPandocWebsite = () => {
  window.open('https://pandoc.org/installing.html', '_blank')
}

// —— 检测 Pandoc ——
// 需要在主进程里实现一个 IPC 通道 `checkPandocIPC`，返回 { installed: boolean, version?: string }
async function checkPandoc() {
  try {
    const { installed } = await window.electron.checkPandocIPC()
    console.log('Pandoc 检测结果：', installed)
    pandocInstalled.value = installed
  } catch {
    pandocInstalled.value = false
  }
}

// —— 打开 Git 官网 ——
const openGitWebsite = () => {
  window.open('https://git-scm.com/downloads', '_blank')
}

async function checkGit() {
  try {
    const { installed } = await window.electron.checkGitIPC()
    console.log('Git 检测结果：', installed)
    gitInstalled.value = installed
  } catch {
    gitInstalled.value = false
  }
}

// 检查 Homebrew 是否安装
const checkBrewInstalled = async () => {
  try {
    const result = await window.electron.checkBrewInstalled()
    console.log('Homebrew 检测结果：', result)
    brewInstalled.value = result.installed
    return result.installed
  } catch (error) {
    console.error('检查 Homebrew 失败:', error)
    brewInstalled.value = false
    return false
  }
}

// 检查所有依赖的状态
const checkDependenciesStatus = async () => {
  try {
    const status = await window.electron.checkDependenciesStatus()
    // 更新各依赖包的安装状态和进度
    pythonInstalled.value = status.python.installed
    pythonProgress.value = status.python.progress
    pythonInstalling.value = status.python.installing

    pandocInstalled.value = status.pandoc.installed
    pandocProgress.value = status.pandoc.progress
    pandocInstalling.value = status.pandoc.installing

    gitInstalled.value = status.git.installed
    gitProgress.value = status.git.progress
    gitInstalling.value = status.git.installing
    console.log('依赖状态：', status)
    return status
  } catch (error) {
    console.error('检查依赖状态失败:', error)
    return null
  }
}

// 安装所有缺失的依赖
const installRequiredPackages = async () => {
  // 先检查 Homebrew 是否安装
  if (isMacOS.value) {
    const hasHomebrew = await checkBrewInstalled()
    if (!hasHomebrew) {
      alert('请先安装 Homebrew，然后再尝试一键安装。\n可访问 https://brew.sh 获取安装指南。')
      return
    }
  }

  try {
    isInstallingDeps.value = true
    await startNetworkMonitoring()
    const result = await window.electron.installRequiredPackages()
    console.log('安装结果:', result)

    // 安装完成后重新检查状态
    await checkDependenciesStatus()

    // 显示安装结果
    if (result.success) {
      alert('所有依赖安装完成！请重启应用以使更改生效。')
    } else {
      alert(`安装过程中出现问题: ${result.message}`)
    }
  } catch (error) {
    console.error('安装依赖失败:', error)
    alert(`安装失败: ${error.message || '未知错误'}`)
  } finally {
    isInstallingDeps.value = false
    await stopNetworkMonitoring()
  }
}

// 安装单个依赖包
const installSinglePackage = async (packageName) => {
  if (isMacOS.value) {
    // 先检查 Homebrew 是否安装
    const hasHomebrew = await checkBrewInstalled()
    if (!hasHomebrew) {
      alert('请先安装 Homebrew，然后再尝试安装。\n可访问 https://brew.sh 获取安装指南。')
      return
    }
  }

  try {
    // 设置对应包的安装状态
    if (packageName === 'python') pythonInstalling.value = true
    else if (packageName === 'pandoc') pandocInstalling.value = true
    else if (packageName === 'git') gitInstalling.value = true

    await startNetworkMonitoring()

    const result = await window.electron.installPackage(packageName)
    console.log(`${packageName} 安装结果:`, result)

    // 安装完成后重新检查状态
    await checkDependenciesStatus()

    // 显示安装结果
    if (result.success) {
      alert(`${packageName} 安装完成！请重启应用以使更改生效。`)
    } else {
      alert(`${packageName} 安装过程中出现问题: ${result.message}， 请前往官网尝试手动安装。`)
    }
  } catch (error) {
    console.error(`安装 ${packageName} 失败:`, error)
    alert(`安装失败: ${error.message || '未知错误'}`)
  } finally {
    // 重置安装状态
    if (packageName === 'python') pythonInstalling.value = false
    else if (packageName === 'pandoc') pandocInstalling.value = false
    else if (packageName === 'git') gitInstalling.value = false
    await stopNetworkMonitoring()
  }
}

// —— 网络速度监控函数 ——
const startNetworkMonitoring = async () => {
  try {
    // 启动网络监控
    await window.electron.getNetworkSpeed()
    networkSpeed.value.isMonitoring = true

    // 监听网络速度更新
    window.electron.onNetworkSpeedUpdate((data) => {
      networkSpeed.value = {
        downloadSpeed: data.downloadSpeed,
        uploadSpeed: data.uploadSpeed,
        formattedDownloadSpeed: data.downloadSpeedFormatted,
        formattedUploadSpeed: data.uploadSpeedFormatted,
        interfaceName: data.interface,
        isMonitoring: true
      }
    })
  } catch (error) {
    console.error('启动网络监控失败:', error)
  }
}

const stopNetworkMonitoring = async () => {
  try {
    // 移除网络速度监听器
    window.electron.removeNetworkSpeedListener()

    // 重置网络速度数据
    networkSpeed.value = {
      downloadSpeed: 0,
      uploadSpeed: 0,
      formattedDownloadSpeed: '0 B/s',
      formattedUploadSpeed: '0 B/s',
      interfaceName: '',
      isMonitoring: false
    }
  } catch (error) {
    console.error('停止网络监控失败:', error)
  }
}

// —— 云端模型配置检测 ——
const cloudApiCount = computed(() => {
  // 统计所有云端模型配置中已填写API的数量
  let count = 0
  // config.custom
  Object.values(config.custom).forEach((cfg) => {
    if (cfg.api && cfg.api.trim()) count++
  })
  // fmConfig.embedding_cloud_model
  if (fmConfig.embedding_cloud_model.api && fmConfig.embedding_cloud_model.api.trim()) count++
  // fmConfig.default_cloud_model
  if (fmConfig.default_cloud_model.api && fmConfig.default_cloud_model.api.trim()) count++
  // fmConfig.model_configs
  fmConfig.model_configs.forEach((model) => {
    if (model.cloud_model && model.cloud_model.api && model.cloud_model.api.trim()) count++
  })
  return count
})

// —— 获取所有model_config中去重后的供应商名称 ——
const uniqueProviders = computed(() => {
  const providerNames = new Set()

  // 从 fmConfig.model_configs 中收集供应商类型，并转换为供应商名称
  fmConfig.model_configs.forEach((model) => {
    if (model.cloud_model && model.cloud_model.type && model.cloud_model.type.trim()) {
      const type = model.cloud_model.type
      // 遍历 cloudProviders 找到匹配的供应商
      Object.values(cloudProviders).forEach((provider) => {
        if (provider.type === type) {
          providerNames.add(provider.name)
        }
      })
    }
  })

  return Array.from(providerNames)
})

// 云端模型一键开关状态
const allCloudModelsEnabled = computed({
  get: () => {
    // 检查所有云端模型是否都已启用
    // 如果有任何一个云端模型未启用，则返回false
    // 1. 检查config.custom中的模型
    for (const cfg of Object.values(config.custom)) {
      if (cfg.api && cfg.api.trim() && !cfg.enabled) {
        return false
      }
    }

    // 2. 检查fmConfig.embedding_cloud_model
    if (
      fmConfig.embedding_cloud_model.api &&
      fmConfig.embedding_cloud_model.api.trim() &&
      !fmConfig.embedding_cloud_model.enabled
    ) {
      return false
    }

    // 3. 检查fmConfig.default_cloud_model
    if (
      fmConfig.default_cloud_model.api &&
      fmConfig.default_cloud_model.api.trim() &&
      !fmConfig.default_cloud_model.enabled
    ) {
      return false
    }

    // 4. 检查fmConfig.model_configs中的云端模型
    for (const model of fmConfig.model_configs) {
      if (
        model.cloud_model &&
        model.cloud_model.api &&
        model.cloud_model.api.trim() &&
        !model.cloud_model.enabled
      ) {
        return false
      }
    }

    // 如果所有模型都已启用或没有配置API，则返回true
    return cloudApiCount.value > 0
  },
  set: () => {
    // 这里不需要实现setter，因为我们使用toggleAllCloudModels方法来更新状态
  }
})

// 进度状态
const isRestarting = ref(false)
const showRestartDialog = ref(false)
const showSwitchConfirmDialog = ref(false)
const pendingSwitchValue = ref(false)
const restartProgress = ref([
  { step: 1, text: '修改配置', status: 'pending' },
  { step: 2, text: '停止核心服务', status: 'pending' },
  { step: 3, text: '停止索引服务', status: 'pending' },
  { step: 4, text: '启动核心服务', status: 'pending' },
  { step: 5, text: '启动索引服务', status: 'pending' },
  { step: 6, text: '完成', status: 'pending' }
])

// Ant Design Steps 状态映射与进度条
const antStepStatusMap = {
  pending: 'wait',
  running: 'process',
  completed: 'finish',
  error: 'error'
}
const restartHasError = computed(() => restartProgress.value.some((s) => s.status === 'error'))
const restartPercent = computed(() => {
  const total = restartProgress.value.length || 1
  const done = restartProgress.value.filter((s) => s.status === 'completed').length
  const running = restartProgress.value.some((s) => s.status === 'running')
  let pct = Math.round((done / total) * 100)
  if (running && pct < 95) pct += 5
  return Math.min(pct, 100)
})

// 显示切换确认对话框
const toggleAllCloudModels = async (newValue) => {
  console.log('toggleAllCloudModels', newValue)

  // 保存待切换的值并显示确认对话框
  pendingSwitchValue.value = newValue
  showSwitchConfirmDialog.value = true
}

// 取消切换
const cancelSwitch = () => {
  showSwitchConfirmDialog.value = false
  pendingSwitchValue.value = false
}

// 确认切换并执行实际的切换逻辑
const confirmSwitch = async () => {
  showSwitchConfirmDialog.value = false
  await executeModelSwitch(pendingSwitchValue.value)
}

// 实际执行模型切换的逻辑（带兜底回落）
const executeModelSwitch = async (newValue) => {
  console.log('executeModelSwitch', newValue)

  // 重置进度状态
  restartProgress.value.forEach((step) => (step.status = 'pending'))
  isRestarting.value = true
  showRestartDialog.value = true

  try {
    // 步骤1: 修改配置
    restartProgress.value[0].status = 'running'

    // 将当前面板变更写回并统一字段形状，避免 undefined 造成失败
    applyCloudConfigsBeforeSave()
    normalizeCloudModels()

    // 默认云模型作为回落来源
    const def = fmConfig.default_cloud_model || {}

    // 1) custom.* 三个常规助手
    Object.entries(config.custom).forEach(([cfg]) => {
      if (cfg.api && cfg.api.trim()) {
        cfg.enabled = newValue
      }
    })

    // 2) 嵌入云模型
    if (fmConfig.embedding_cloud_model?.api?.trim()) {
      fmConfig.embedding_cloud_model.enabled = newValue
    }

    // 3) 默认云模型
    if (def.api && def.api.trim()) {
      fmConfig.default_cloud_model.enabled = newValue
    }

    // 4) 索引弹性策略云模型
    if (!Array.isArray(fmConfig.model_configs)) fmConfig.model_configs = []
    fmConfig.model_configs.forEach((m) => {
      if (!m.cloud_model) m.cloud_model = {}
      const t = m.cloud_model
      if (t.api && t.api.trim()) {
        t.enabled = newValue
      }
    })

    // 持久化（两个配置都要写）
    await updateFmConfig(fmConfig)
    await updateConfig(config)

    restartProgress.value[0].status = 'completed'
    await new Promise((resolve) => setTimeout(resolve, 500))

    // 步骤2: 停止核心服务
    restartProgress.value[1].status = 'running'
    try {
      await window.electron.stopApp()
      restartProgress.value[1].status = 'completed'
    } catch (error) {
      console.warn('停止核心服务失败，可能已经停止:', error)
      restartProgress.value[1].status = 'completed'
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 步骤3: 停止索引服务
    restartProgress.value[2].status = 'running'
    try {
      await window.electron.stopFmHttp()
      restartProgress.value[2].status = 'completed'
    } catch (error) {
      console.warn('停止索引服务失败，可能已经停止:', error)
      restartProgress.value[2].status = 'completed'
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 步骤4: 启动核心服务
    restartProgress.value[3].status = 'running'
    const sysConfigResp = await window.electron.sysConfig()
    const startAppResult = await window.electron.startApp(sysConfigResp.configPath)
    if (startAppResult.started) {
      restartProgress.value[3].status = 'completed'
    } else {
      throw new Error('启动核心服务失败')
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 步骤5: 启动索引服务
    restartProgress.value[4].status = 'running'
    const fmConfigResp = await window.electron.fmConfig()
    const startFmResult = await window.electron.startFmHttp(fmConfigResp.configPath)
    if (startFmResult.started) {
      restartProgress.value[4].status = 'completed'
    } else {
      throw new Error('启动索引服务失败')
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 步骤6: 完成
    restartProgress.value[5].status = 'completed'

    store.dispatch('snackbar/showSnackbar', {
      message: `✅ 已切换为${newValue ? '云端' : '本地'}模型并生效`,
      color: 'success'
    })
  } catch (error) {
    console.error('切换模型模式失败:', error)
    const currentStepIndex = restartProgress.value.findIndex((step) => step.status === 'running')
    if (currentStepIndex !== -1) {
      restartProgress.value[currentStepIndex].status = 'error'
    }
    store.dispatch('snackbar/showSnackbar', {
      message: '❌ 切换模型模式失败，请检查服务状态',
      color: 'error'
    })
  } finally {
    isRestarting.value = false
    setTimeout(() => {
      showRestartDialog.value = false
    }, 3000)
  }
}

onMounted(async () => {
  await fetchConfig()
  await Promise.all([
    checkOllama(),
    checkPython(),
    checkNomic(),
    checkLlm(),
    checkPandoc(),
    checkGit(),
    fetchInstalledModels(),
    fetchFmConfig(), // 添加获取FM配置
    checkBrewInstalled(),
    checkDependenciesStatus()
  ])

  // 从 fmConfig 初始化 GitHave 选择大模型默认值
  try {
    const cfgModel = fmConfig?.default_cloud_model?.model
    if (typeof cfgModel === 'string' && cfgModel.trim()) {
      const allowed = ['auto', 'openai', 'qwen']
      selectedGithaveModel.value = allowed.includes(cfgModel) ? cfgModel : 'auto'
    } else {
      selectedGithaveModel.value = 'auto'
    }
  } catch (e) {
    console.warn('初始化 GitHave 模型默认值失败:', e)
    selectedGithaveModel.value = 'auto'
  }

  // 关键：补全形状 + 收集配置（保证 UI 与底层数据一致）
  normalizeCloudModels()
  collectAllCloudConfigs()
  collectEmbeddingConfigs()

  initExpertSlotsFromConfig()
})

// 设置定时检查依赖安装进度
const checkStatusInterval = setInterval(async () => {
  if (pythonInstalling.value || pandocInstalling.value || gitInstalling.value) {
    await checkDependenciesStatus()
  } else {
    clearInterval(checkStatusInterval)
  }
}, 2000) // 每两秒检查一次

// 注册安装日志监听器
if (window.electron && window.electron.onInstallLog) {
  window.electron.onInstallLog((logData) => {
    addLogEntry(logData.type, logData.message)
  })
}

// 协议监听器清理函数
let protocolListenerCleanup = null

// 监听协议回调
onMounted(() => {
  // 检查初始登录状态
  checkGithaveLoginStatus()

  // 监听协议回调 - 使用返回的清理函数
  if (window.electron && window.electron.onProtocolUrl) {
    protocolListenerCleanup = window.electron.onProtocolUrl(handleProtocolCallback)
  }
})

// 组件卸载时清除定时器
onBeforeUnmount(() => {
  clearInterval(checkStatusInterval)

  // 移除安装日志监听器
  if (window.electron && window.electron.removeInstallLogListener) {
    window.electron.removeInstallLogListener()
  }

  // 移除协议监听器 - 只移除当前组件注册的监听器
  if (protocolListenerCleanup) {
    protocolListenerCleanup()
    protocolListenerCleanup = null
  }
})
</script>

<style scoped>
.drag-over {
  border: 1px dashed #1976d2;
  background-color: rgba(25, 118, 210, 0.05);
  transition: background-color 0.2s;
}
.model-list {
  width: 450px;
  height: 500px;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  padding: 8px;
  background-color: rgb(var(--v-theme-tertiary)) !important;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}
.exp-list {
  height: 500px;
  position: relative;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  padding: 8px;
  background-color: rgb(var(--v-theme-tertiary)) !important;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}
.exp-list-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 24px;
  color: lightgrey;
  pointer-events: none;
  z-index: -1;
}
.chip-item {
  cursor: grab;
}
.chip-item:active {
  cursor: grabbing;
}
.expert-chip {
  white-space: normal !important;
  word-break: break-word;
  display: inline-flex !important;
  align-items: flex-start !important;
  padding: 4px 8px !important;
  height: auto !important;
  min-height: auto !important;
  font-size: 12px !important;
  line-height: 2 !important;
  text-align: center !important;
}
.expert-chip .v-chip__content {
  white-space: normal;
  word-break: break-word;
  height: auto;
  line-height: 1.2;
}

/* FM模型角色分组标题样式 */
.role-section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.card-transparent {
  opacity: 0.6;
  transition: opacity 0.3s ease;
}
/* 让 v-progress-linear 的进度条宽度变化带过渡动画 */
.v-progress-linear .v-progress-linear__bar {
  transition: width 0.4s ease-in-out;
}
/* —— 新增：为底部导航留出空间 —— */
.bottom-nav-padding {
  padding-bottom: 120px; /* 增加底部间距，确保内容不被底部导航遮挡 */
  margin-bottom: 20px; /* 额外的底部边距 */
}

/* —— 原有样式保持不变 —— */
.drag-over {
  border: 1px dashed #1976d2;
  background-color: rgba(25, 118, 210, 0.05);
  transition: background-color 0.2s;
}

/* 强制黑色文本样式，在黑夜模式下保持黑色 */
.dark-text-force {
  color: #000000 !important;
}

/* 紧凑风格样式，参考AgentConfig.vue */
.card-title-compact {
  padding: 8px 0 8px 8px;
  font-size: 15px;
  display: flex;
  align-items: center;
}
.icon-compact {
  font-size: 18px;
  margin-right: 4px;
}
.title-compact {
  font-size: 15px;
  font-weight: 600;
}
.text-compact {
  font-size: 13px;
}
.env-card-compact {
  margin: 8px 0;
  border-radius: 8px;
}
@media (min-width: 1280px) {
  .v-container {
    max-width: 1200px;
  }
}

@media (min-width: 960px) {
  .v-container {
    max-width: 1900px;
  }
}

/* 云端模型配置卡片样式 */
.cloud-config-card {
  transition: all 0.3s ease;
  border-radius: 12px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

.cloud-config-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
}

.cloud-config-card .v-card-title {
  background: linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%);
  color: white !important;
  border-radius: 12px 12px 0 0 !important;
}

.cloud-config-card .v-text-field--outlined {
  border-radius: 8px;
}

.cloud-config-card .v-select--outlined {
  border-radius: 8px;
}

/* 美化选择框选项 */
.v-list-item {
  border-radius: 6px;
  margin: 2px 4px;
}

.v-list-item:hover {
  background-color: rgba(33, 150, 243, 0.08) !important;
}

/* 美化开关样式 */
.v-switch .v-selection-control__input {
  border-radius: 12px;
}

/* 安装日志样式 */
.install-log-section {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.install-log-content {
  background-color: #1e1e1e;
  border-radius: 4px;
  padding: 8px;
  font-family: 'Courier New', monospace;
}

.install-logs-container {
  max-height: 200px;
  overflow-y: auto;
  padding: 4px;
}

.install-log-entry {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  font-size: 12px;
  line-height: 1.4;
}

.log-timestamp {
  color: #888;
  margin-right: 8px;
  min-width: 80px;
  font-size: 11px;
}

.log-icon {
  margin-right: 6px;
  font-size: 14px !important;
}

.log-message {
  flex: 1;
  word-break: break-word;
}

.log-info .log-message {
  color: #2196f3;
}

.log-error .log-message {
  color: #f44336;
}

.log-success .log-message {
  color: #4caf50;
}

/* 过期时间高亮 */
.expired-time {
  color: #ff4d4f;
  font-weight: 600;
}

/* 账户信息紧凑行样式 */
.githave-account-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
}

.githave-account-inline .account-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.githave-account-inline .token {
  word-break: break-all;
}

/* 自定义滚动条样式 */
.install-logs-container::-webkit-scrollbar {
  width: 6px;
}

.install-logs-container::-webkit-scrollbar-track {
  background: #2a2a2a;
  border-radius: 3px;
}

.install-logs-container::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 3px;
}

.install-logs-container::-webkit-scrollbar-thumb:hover {
  background: #777;
}

/* GitHave AI 订阅卡片样式（主题友好、轻量渐变、去强制色） */
.githave-subscription-card {
  border-width: 1.5px;
  border-style: solid;
  border-color: color-mix(
    in srgb,
    var(--v-theme-primary) 28%,
    var(--v-theme-surface-variant, #c7c7c7)
  );
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--v-theme-primary) 6%, var(--v-theme-surface)),
    color-mix(in srgb, var(--v-theme-primary) 2%, var(--v-theme-surface))
  );
  backdrop-filter: saturate(1.05);
  transition:
    box-shadow 180ms ease,
    transform 180ms ease;
}

.githave-subscription-card:hover {
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
}

.githave-subscription-title .title-text {
  font-size: 1.25rem;
  color: var(--v-theme-on-surface);
}

.githave-subscription-card .v-chip,
.githave-subscription-card .v-btn {
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.3px;
}

.githave-subscription-card .text-primary {
  color: var(--v-theme-primary);
}

/* 夜间模式下保持订阅面板为日间配色（字体不随主题变色） */
.v-theme--dark .githave-subscription-card:not(.logged-in):not(.logged-out) {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%) !important;
}
.v-theme--dark .githave-subscription-card,
.v-theme--dark .githave-subscription-card .v-card-title,
.v-theme--dark .githave-subscription-card .v-card-text,
.v-theme--dark .githave-subscription-card .title-text,
.v-theme--dark .githave-subscription-card .v-icon,
.v-theme--dark .githave-subscription-card .text-primary,
.v-theme--dark .githave-subscription-card span,
.v-theme--dark .githave-subscription-card p {
  color: #2c3e50 !important;
}

/* 夜间模式：登录/未登录的卡片配色（仅在暗色主题下启用） */
.v-theme--dark .githave-subscription-card.logged-in {
  border: 2px solid #3cb371 !important;
  background: linear-gradient(90deg, #fff 10%, #e6ffed 100%) !important;
}
.v-theme--dark .githave-subscription-card.logged-out {
  border: 2px solid #ffd700 !important;
  background: linear-gradient(90deg, #fffacd 60%, #fff 100%) !important;
}
</style>
