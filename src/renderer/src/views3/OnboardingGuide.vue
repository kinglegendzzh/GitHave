<template>
  <div class="onboarding-container">
    <!-- 顶部进度条 -->
    <div class="progress-header drag-region">
      <div class="progress-bar-top" style="max-width: 60%">
        <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
      </div>
      <div class="progress-text">
        {{ currentStep }}/{{ totalSteps }} - {{ stepTitles[currentStep - 1] }}
      </div>
      <!-- 跳过按钮 -->
      <div class="skip-button no-drag">
        <a-button type="text" size="small" class="wt-btn" @click="skipOnboarding">
          <template #icon><FastForwardOutlined /></template>
          跳过
        </a-button>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="content-area">
      <!-- 步骤1: 欢迎页面 -->
      <div v-if="currentStep === 1" class="step-content welcome-step">
        <div class="welcome-icon">
          <img :src="bannerSvg" alt="GitHave Logo" class="logo-banner" />
        </div>
        <h1 class="welcome-title">欢迎使用 GitHave</h1>
        <p class="welcome-subtitle">让我们花几分钟时间来设置您的环境</p>
      </div>

      <!-- 步骤2: 环境检测 -->
      <div v-if="currentStep === 2" class="step-content env-check-step">
        <h2 class="step-title">
          <SafetyCertificateOutlined class="mr-2" style="color: #1890ff" />
          环境检测
        </h2>
        <p class="step-description">检查您的系统是否具备运行 GitHave 所需的基础环境</p>

        <!-- 环境检测卡片 -->
        <div class="env-cards">
          <div
            class="env-card"
            :class="{
              'env-card-success': pythonInstalled,
              'env-card-error': pythonInstalled === false
            }"
          >
            <div class="env-card-header">
              <v-icon>mdi-language-python</v-icon>
              <span>Python 3.9+</span>
            </div>
            <div class="env-card-status">
              <template v-if="pythonInstalled === null">
                <a-spin size="small" />
                <span>检测中...</span>
              </template>
              <template v-else-if="pythonInstalled">
                <CheckCircleOutlined style="color: #52c41a" />
                <span>已安装</span>
              </template>
              <template v-else-if="pythonInstalling">
                <a-spin size="small" />
                <div class="installing-info">
                  <span>安装中 ({{ pythonProgress }}%)</span>
                  <div v-if="networkSpeed.downloadSpeedFormatted !== '0 B/s'" class="network-speed">
                    <div class="speed-item">
                      <DownloadOutlined style="font-size: 14px; color: #1890ff" />
                      <span>{{ networkSpeed.downloadSpeedFormatted }}</span>
                    </div>
                    <div v-if="networkSpeed.interfaceName" class="interface-name">
                      <span>{{ networkSpeed.interfaceName }}</span>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <CloseCircleOutlined style="color: #ff4d4f" />
                <span>未安装</span>
                <a-button size="small" type="default" class="blk-btn" @click="openPythonWebsite"
                  >前往官网安装</a-button
                >
                <a-button size="small" type="primary" @click="installSinglePackage('python')">{{
                  isWindows ? '打开微软商店' : '一键安装'
                }}</a-button>
              </template>
            </div>
          </div>

          <div
            class="env-card"
            :class="{ 'env-card-success': gitInstalled, 'env-card-error': gitInstalled === false }"
          >
            <div class="env-card-header">
              <v-icon>mdi-git</v-icon>
              <span>Git</span>
            </div>
            <div class="env-card-status">
              <template v-if="gitInstalled === null">
                <a-spin size="small" />
                <span>检测中...</span>
              </template>
              <template v-else-if="gitInstalled">
                <CheckCircleOutlined style="color: #52c41a" />
                <span>已安装</span>
              </template>
              <template v-else-if="gitInstalling">
                <a-spin size="small" />
                <div class="installing-info">
                  <span>安装中 ({{ gitProgress }}%)</span>
                  <div v-if="networkSpeed.downloadSpeedFormatted !== '0 B/s'" class="network-speed">
                    <div class="speed-item">
                      <DownloadOutlined style="font-size: 14px; color: #1890ff" />
                      <span>{{ networkSpeed.downloadSpeedFormatted }}</span>
                    </div>
                    <div v-if="networkSpeed.interfaceName" class="interface-name">
                      <span>{{ networkSpeed.interfaceName }}</span>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <CloseCircleOutlined style="color: #ff4d4f" />
                <span>未安装</span>
                <a-button size="small" type="default" class="blk-btn" @click="openGitWebsite"
                  >前往官网安装</a-button
                >
                <a-button size="small" type="primary" @click="installSinglePackage('git')"
                  >一键安装</a-button
                >
              </template>
            </div>
          </div>

          <div
            class="env-card"
            :class="{
              'env-card-success': pandocInstalled,
              'env-card-error': pandocInstalled === false
            }"
          >
            <div class="env-card-header">
              <v-icon>mdi-file-document</v-icon>
              <span>Pandoc</span>
            </div>
            <div class="env-card-status">
              <template v-if="pandocInstalled === null">
                <a-spin size="small" />
                <span>检测中...</span>
              </template>
              <template v-else-if="pandocInstalled">
                <CheckCircleOutlined style="color: #52c41a" />
                <span>已安装</span>
              </template>
              <template v-else-if="pandocInstalling">
                <a-spin size="small" />
                <div class="installing-info">
                  <span>安装中 ({{ pandocProgress }}%)</span>
                  <div v-if="networkSpeed.downloadSpeedFormatted !== '0 B/s'" class="network-speed">
                    <div class="speed-item">
                      <DownloadOutlined style="font-size: 14px; color: #1890ff" />
                      <span>{{ networkSpeed.downloadSpeedFormatted }}</span>
                    </div>
                    <div v-if="networkSpeed.interfaceName" class="interface-name">
                      <span>{{ networkSpeed.interfaceName }}</span>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <CloseCircleOutlined style="color: #ff4d4f" />
                <span>未安装</span>
                <a-button size="small" type="default" class="blk-btn" @click="openPandocWebsite"
                  >前往官网安装</a-button
                >
                <a-button size="small" type="primary" @click="installSinglePackage('pandoc')"
                  >一键安装</a-button
                >
              </template>
            </div>
          </div>

          <!-- macOS 上显示 Homebrew -->
          <div
            v-if="isMacOS"
            class="env-card"
            :class="{
              'env-card-success': brewInstalled,
              'env-card-error': brewInstalled === false
            }"
          >
            <div class="env-card-header">
              <v-icon>mdi-package-variant</v-icon>
              <span>Homebrew</span>
            </div>
            <div class="env-card-status">
              <template v-if="brewInstalled === null">
                <a-spin size="small" />
                <span>检测中...</span>
              </template>
              <template v-else-if="brewInstalled">
                <CheckCircleOutlined style="color: #52c41a" />
                <span>已安装</span>
              </template>
              <template v-else>
                <CloseCircleOutlined style="color: #ff4d4f" />
                <span>未安装</span>
                <a-button size="small" type="primary" class="blk-btn" @click="openHomeBrewWebsite"
                  >前往官网安装</a-button
                >
              </template>
            </div>
          </div>
        </div>

        <!-- 一键安装按钮 -->
        <div v-if="needsInstallCount > 0" class="install-section">
          <a-alert type="warning" show-icon class="mb-4">
            <div class="d-flex align-center">
              <div class="install-info">
                <span>检测到 {{ needsInstallCount }} 个依赖未安装</span>
                <div
                  v-if="isInstallingDeps && networkSpeed.downloadSpeedFormatted !== '0 B/s'"
                  class="network-speed mt-2"
                >
                  <div class="speed-item">
                    <DownloadOutlined style="font-size: 14px; color: #1890ff" />
                    <span>{{ networkSpeed.downloadSpeedFormatted }}</span>
                  </div>
                  <div v-if="networkSpeed.interfaceName" class="interface-name">
                    <span>{{ networkSpeed.interfaceName }}</span>
                  </div>
                </div>
              </div>
              <div style="flex: 1"></div>
              <a-button
                type="primary"
                :loading="isInstallingDeps"
                :disabled="isInstallingDeps || (!isMacOS && !brewInstalled)"
                @click="installRequiredPackages"
              >
                一键安装所有依赖
              </a-button>
            </div>
          </a-alert>
        </div>

        <!-- 安装日志显示区域 -->
        <div v-if="installLogs.length > 0" class="install-logs-section mt-4">
          <a-card class="install-logs-card">
            <template #title>
              <div class="d-flex align-center">
                <FileTextOutlined class="mr-2" style="color: #1890ff" />
                安装日志
                <div style="flex: 1"></div>
                <a-button size="small" type="text" @click="installLogs = []">
                  <template #icon><DeleteOutlined /></template>
                  清空
                </a-button>
              </div>
            </template>
            <div class="install-logs-content">
              <div class="logs-container">
                <div
                  v-for="log in installLogs"
                  :key="log.id"
                  class="log-entry"
                  :class="{
                    'log-info': log.type === 'info',
                    'log-error': log.type === 'error',
                    'log-success': log.type === 'success'
                  }"
                >
                  <div class="log-timestamp">{{ log.timestamp }}</div>
                  <div class="log-type">
                    <ExclamationCircleOutlined
                      v-if="log.type === 'error'"
                      style="font-size: 14px; color: #ff4d4f"
                    />
                    <CheckCircleOutlined
                      v-else-if="log.type === 'success'"
                      style="font-size: 14px; color: #52c41a"
                    />
                    <InfoCircleOutlined v-else style="font-size: 14px; color: #1890ff" />
                  </div>
                  <div class="log-message">{{ log.message }}</div>
                </div>
              </div>
            </div>
          </a-card>
        </div>
      </div>

      <!-- 步骤3: 核心服务检查 -->
      <div v-if="currentStep === 3" class="step-content">
        <div class="step-header">
          <h2>核心服务检查</h2>
        </div>

        <div class="service-check-container">
          <div class="service-item">
            <div class="service-info">
              <div class="service-icon">🔧</div>
              <div class="service-details">
                <div class="service-name">核心服务</div>
                <div class="service-description">GitHave主要功能服务</div>
              </div>
            </div>

            <div class="service-status">
              <div v-if="coreServiceStatus === null" class="status-checking">
                <a-spin size="small" />
                <span class="status-text">检测中...</span>
              </div>
              <div v-else-if="coreServiceStatus === true" class="status-success">
                <CheckCircleOutlined style="color: #52c41a" />
                <span class="status-text">已启动</span>
              </div>
              <div v-else-if="coreServiceStarting" class="status-checking">
                <a-spin size="small" />
                <span class="status-text">启动中...</span>
              </div>
              <div v-else class="status-error">
                <a-button type="primary" size="small" class="start-btn" @click="startCoreService">
                  <template #icon><PlayCircleOutlined /></template>
                  启动
                </a-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 服务日志显示 -->
        <div
          v-if="showServiceLogs && (coreServiceStarting || serviceLogListening)"
          class="service-logs-container"
        >
          <a-card class="service-logs-card">
            <template #title>
              <div class="service-logs-header">
                <CodeOutlined class="logs-icon" />
                <span class="logs-title">服务启动日志</span>
                <div style="flex: 1"></div>
                <a-tag :color="serviceLogListening ? 'success' : 'default'" size="small">
                  <template #icon>
                    <PlayCircleOutlined v-if="serviceLogListening" />
                    <StopOutlined v-else />
                  </template>
                  {{ serviceLogListening ? '监听中' : '已停止' }}
                </a-tag>
              </div>
            </template>
            <div class="service-logs-content">
              <div class="logs-list">
                <div
                  v-for="log in serviceLogs"
                  :key="log.id"
                  class="log-entry"
                  :class="`log-${log.type}`"
                >
                  <div class="log-time">{{ log.timestamp }}</div>
                  <div class="log-icon">
                    <ExclamationCircleOutlined v-if="log.type === 'error'" style="color: #ff4d4f" />
                    <CheckCircleOutlined
                      v-else-if="log.type === 'success'"
                      style="color: #52c41a"
                    />
                    <WarningOutlined v-else-if="log.type === 'warning'" style="color: #faad14" />
                    <InfoCircleOutlined v-else style="color: #1890ff" />
                  </div>
                  <div class="log-message">{{ log.message }}</div>
                </div>
              </div>
            </div>
          </a-card>
        </div>
      </div>

      <!-- 步骤4: 索引服务检查 -->
      <div v-if="currentStep === 4" class="step-content">
        <div class="step-header">
          <h2>索引服务检查</h2>
          <div v-if="indexServiceFirstTime" class="first-time-notice">
            <div class="notice-icon">⚠️</div>
            <div class="notice-text">
              <strong>首次启动提示：</strong>
              索引服务首次启动需要下载基础包，请确保网络连接正常。
              此过程可能需要几分钟时间，请耐心等待。
            </div>
          </div>
        </div>

        <div class="service-check-container">
          <div class="service-item">
            <div class="service-info">
              <DatabaseOutlined class="service-icon" />
              <div class="service-details">
                <div class="service-name">索引服务</div>
                <div class="service-description">负责代码索引和向量搜索功能</div>
              </div>
            </div>
            <div class="service-status">
              <div
                v-if="indexServiceStatus === null || faissServiceStatus === null"
                class="status-checking"
              >
                <a-spin size="small" />
                <span class="status-text">检测中...</span>
              </div>
              <div
                v-else-if="indexServiceStatus === true && faissServiceStatus === true"
                class="status-success"
              >
                <CheckCircleOutlined style="color: #52c41a" />
                <span class="status-text">已启动</span>
              </div>
              <div v-else-if="indexServiceStarting || faissServiceStarting" class="status-starting">
                <div class="starting-animation">
                  <div class="pulse-ring"></div>
                  <div class="pulse-ring delay-1"></div>
                  <div class="pulse-ring delay-2"></div>
                  <DownloadOutlined class="starting-icon" />
                </div>
                <div class="starting-content">
                  <div class="starting-text">正在安装基础包...</div>
                  <div class="progress-container">
                    <!-- 网络速度显示 -->
                    <div
                      v-if="networkSpeed.downloadSpeedFormatted !== '0 B/s'"
                      class="network-speed"
                    >
                      <div class="speed-item">
                        <DownloadOutlined style="font-size: 14px; color: #52c41a" />
                        <span>{{ networkSpeed.downloadSpeedFormatted }}</span>
                      </div>
                      <div class="interface-name">{{ networkSpeed.interfaceName }}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="status-error">
                <a-button type="primary" size="small" class="start-btn" @click="startIndexService">
                  <template #icon><PlayCircleOutlined /></template>
                  启动
                </a-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 服务日志显示 -->
        <div
          v-if="
            showServiceLogs && (indexServiceStarting || faissServiceStarting || serviceLogListening)
          "
          class="service-logs-container"
        >
          <a-card class="service-logs-card">
            <template #title>
              <div class="service-logs-header">
                <CodeOutlined class="logs-icon" />
                <span class="logs-title">服务启动日志</span>
                <div style="flex: 1"></div>
                <a-tag :color="serviceLogListening ? 'success' : 'default'" size="small">
                  <template #icon>
                    <PlayCircleOutlined v-if="serviceLogListening" />
                    <StopOutlined v-else />
                  </template>
                  {{ serviceLogListening ? '监听中' : '已停止' }}
                </a-tag>
              </div>
            </template>
            <div class="service-logs-content">
              <div class="logs-list">
                <div
                  v-for="log in serviceLogs"
                  :key="log.id"
                  class="log-entry"
                  :class="`log-${log.type}`"
                >
                  <div class="log-time">{{ log.timestamp }}</div>
                  <div class="log-icon">
                    <v-icon
                      size="small"
                      :color="
                        log.type === 'error'
                          ? 'error'
                          : log.type === 'success'
                            ? 'success'
                            : log.type === 'warning'
                              ? 'warning'
                              : 'info'
                      "
                    >
                      {{
                        log.type === 'error'
                          ? 'mdi-alert-circle'
                          : log.type === 'success'
                            ? 'mdi-check-circle'
                            : log.type === 'warning'
                              ? 'mdi-alert'
                              : 'mdi-information'
                      }}
                    </v-icon>
                  </div>
                  <div class="log-message">{{ log.message }}</div>
                </div>
              </div>
            </div>
          </a-card>
        </div>

        <div v-if="indexServiceStarting && indexServiceFirstTime" class="installation-progress">
          <div class="progress-header">
            <div class="progress-icon">📦</div>
            <div class="progress-text">
              <h4>正在安装基础包...</h4>
              <p>首次启动需要下载必要的依赖包，请保持网络连接</p>
            </div>
            <div class="progress-2-text">{{ faissServiceProgressText }}</div>
            <div class="progress-2-percentage">{{ Math.round(faissServiceProgress) }}%</div>
            <!-- 网络速度显示 -->
            <div v-if="networkSpeed.downloadSpeedFormatted !== '0 B/s'" class="network-speed">
              <div class="speed-item">
                <DownloadOutlined style="font-size: 14px; color: #52c41a" />
                <span>{{ networkSpeed.downloadSpeedFormatted }}</span>
              </div>
              <div class="interface-name">{{ networkSpeed.interfaceName }}</div>
            </div>
          </div>
          <div class="progress-bar">
            <div class="progress-container">
              <a-progress
                :percent="faissServiceProgress"
                stroke-color="#52c41a"
                trail-color="#f0f0f0"
                :show-info="false"
                class="progress-bar"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤5: 模型选择 -->
      <div v-if="currentStep === 5" class="step-content model-select-step">
        <h2 class="step-title">
          <BulbOutlined class="mr-2" style="color: #1890ff" />
          选择 AI 模型
        </h2>
        <p class="step-description">选择您偏好的 AI 模型类型，稍后可以在设置中更改</p>

        <div class="model-options">
          <!-- GitHave AI 订阅选项 -->
          <div
            class="model-option githave-option"
            :class="{ 'model-option-selected': selectedModelType === 'githave' }"
            @click="selectedModelType = 'githave'"
          >
            <div class="model-option-header">
              <div class="githave-icon">
                <img :src="bannerSvg" alt="GitHave" style="width: 40px; height: 40px" />
              </div>
              <h3>GitHave AI</h3>
              <a-tag color="gold" size="small" class="ml-2">推荐</a-tag>
            </div>
            <div class="model-option-content">
              <p>GitHave 官方 AI 服务，专为代码分析优化</p>
              <ul>
                <li>登录即赠送十万tokens</li>
                <li>专业代码分析能力</li>
                <li>无需配置，一键使用</li>
              </ul>
              <div class="githave-status">
                <template v-if="!isLoggedIn">
                  <div class="login-section">
                    <a-button type="primary" @click="loginToGithave">
                      <template #icon><LoginOutlined /></template>
                      登录GitHave
                    </a-button>
                  </div>
                </template>
                <template v-else>
                  <div class="logged-in-section">
                    <div class="user-info">
                      <CheckCircleOutlined style="color: #52c41a" />
                      <span>{{ githaveUser.username || '已登录' }}</span>
                      <v-btn
                        color="success"
                        variant="outlined"
                        size="small"
                        class="ml-2"
                        @click="openGithaveConsole"
                      >
                        <v-icon small class="mr-1">mdi-console-line</v-icon>
                        访问控制台
                      </v-btn>
                      <v-btn
                        color="error"
                        variant="text"
                        size="small"
                        class="ml-2"
                        @click.stop="logoutGithave"
                        >退出登录</v-btn
                      >
                    </div>
                    <div class="model-selection">
                      <span class="selection-label">选择模型：</span>
                      <a-select
                        v-model:value="selectedGithaveModel"
                        size="small"
                        style="width: 240px"
                      >
                        <a-select-option value="auto">GitHave-auto</a-select-option>
                        <a-select-option value="openai">GitHave-o1</a-select-option>
                        <a-select-option value="qwen">GitHave-q1</a-select-option>
                      </a-select>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <div
            class="model-option"
            :class="{ 'model-option-selected': selectedModelType === 'cloud' }"
            @click="selectedModelType = 'cloud'"
          >
            <div class="model-option-header">
              <CloudOutlined style="font-size: 40px; color: #1890ff" />
              <h3>其他云端模型</h3>
            </div>
            <div class="model-option-content">
              <p>使用第三方 AI 服务，需要自行配置</p>
              <ul>
                <li>支持多种AI供应商</li>
                <li>需要API密钥配置</li>
                <li>灵活性更高</li>
              </ul>
              <div class="model-status">
                <InfoCircleOutlined style="color: #1890ff" />
                <span>已配置的云端模型API：{{ cloudApiCount }}</span>
              </div>
            </div>
          </div>

          <div
            class="model-option"
            :class="{ 'model-option-selected': selectedModelType === 'local' }"
            @click="selectedModelType = 'local'"
          >
            <div class="model-option-header">
              <HddOutlined style="font-size: 40px; color: #1890ff" />
              <h3>本地模型</h3>
            </div>
            <div class="model-option-content">
              <p>在本地运行 AI 模型，数据更安全</p>
              <ul>
                <li>数据完全本地化</li>
                <li>无需网络连接</li>
                <li>需要下载模型文件</li>
              </ul>
              <div class="model-status">
                <template v-if="ollamaInstalled === null || ollamaRunning === null">
                  <a-spin size="small" />
                  <span>检测中...</span>
                </template>
                <template v-else-if="ollamaInstalled && ollamaRunning">
                  <CheckCircleOutlined style="color: #52c41a" />
                  <span>Ollama 运行中</span>
                </template>
                <template v-else-if="ollamaInstalled && !ollamaRunning">
                  <ExclamationCircleOutlined style="color: #faad14" />
                  <span>Ollama 已安装但未运行</span>
                  <a-button type="primary" size="small" @click="retryOllama">启动</a-button>
                </template>
                <template v-else>
                  <CloseCircleOutlined style="color: #ff4d4f" />
                  <span>Ollama 未安装</span>
                  <a-button type="primary" size="small" class="blk-btn" @click="openOllamaWebsite"
                    >前往官网安装</a-button
                  >
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤6: 完成设置 -->
      <div v-if="currentStep === 6" class="step-content complete-step">
        <div class="complete-icon">
          <CheckCircleOutlined style="font-size: 80px; color: #52c41a" />
        </div>
        <h2 class="complete-title">设置完成！</h2>
        <p class="complete-description">您的 GitHave 基础环境已经准备就绪</p>
      </div>
    </div>

    <!-- 底部导航 -->
    <div class="navigation-footer">
      <a-button v-if="currentStep > 1" type="default" ghost @click="previousStep">
        上一步
      </a-button>
      <div style="flex: 1"></div>
      <a-button
        v-if="currentStep < totalSteps"
        type="primary"
        :disabled="!canProceed"
        :loading="currentStep === 5 && isApplyingModelConfig"
        @click="nextStep"
      >
        {{ currentStep === 5 && isApplyingModelConfig ? '应用配置中...' : '下一步' }}
      </a-button>
      <a-button v-else type="primary" @click="completeOnboarding"> 开始使用 </a-button>
    </div>

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
          <a-button type="primary" style="margin-left: 8px" @click="confirmSwitch">
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
  <!-- 登录信息弹窗：展示账户信息（Ant Design） -->
  <a-modal v-model:open="showLoginInfoModal" :footer="null" width="520px">
    <template #title>
      <div class="d-flex align-center">
        <CheckCircleOutlined style="color:#52c41a" class="mr-2" /> 登录成功
      </div>
    </template>
    <a-descriptions size="small" :column="1">
      <a-descriptions-item label="用户名">{{ githaveUser.username || '—' }}</a-descriptions-item>
      <a-descriptions-item label="邮箱">{{ githaveUser.email || '—' }}</a-descriptions-item>
      <a-descriptions-item label="登录时间">{{ formattedLoginTime }}</a-descriptions-item>
      <a-descriptions-item label="过期时间">{{ formattedExpireTime }}</a-descriptions-item>
      <a-descriptions-item label="API Key">
        <span style="word-break: break-all">{{ maskedToken }}</span>
        <a-button size="small" type="link" @click="modalShowToken = !modalShowToken">{{ modalShowToken ? '隐藏' : '显示' }}</a-button>
        <a-button size="small" type="link" @click="copyToClipboard(githaveUser.token)">复制</a-button>
      </a-descriptions-item>
    </a-descriptions>
    <div style="text-align:right; margin-top: 8px">
      <a-button type="primary" @click="showLoginInfoModal = false">知道了</a-button>
    </div>
  </a-modal>
</div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  PlayCircleOutlined,
  StopOutlined,
  CodeOutlined,
  DownloadOutlined,
  BulbOutlined,
  CloudOutlined,
  HddOutlined,
  DatabaseOutlined,
  SafetyCertificateOutlined,
  FastForwardOutlined,
  FileTextOutlined,
  DeleteOutlined,
  SyncOutlined,
  LoadingOutlined,
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  LoginOutlined
} from '@ant-design/icons-vue'
import bannerSvg from '../assets/banner_v3_low.png'
import titleSvg from '../assets/title.svg'
import {
  appHealthCheck,
  fmHealthCheck,
  faissHealthCheck,
  getConfig,
  updateConfig,
  getFmConfig,
  updateFmConfig
} from '../service/api'

export default {
  name: 'OnboardingGuide',
  components: {
    CheckCircleOutlined,
    CloseCircleOutlined,
    ExclamationCircleOutlined,
    InfoCircleOutlined,
    WarningOutlined,
    PlayCircleOutlined,
    StopOutlined,
    CodeOutlined,
    DownloadOutlined,
    BulbOutlined,
    CloudOutlined,
    HddOutlined,
    DatabaseOutlined,
    SafetyCertificateOutlined,
    FastForwardOutlined,
    FileTextOutlined,
    DeleteOutlined,
    LoginOutlined,
    SyncOutlined,
    LoadingOutlined,
    CheckCircleTwoTone,
    CloseCircleTwoTone
  },
  setup() {
    const router = useRouter()
    const store = useStore()

    // 步骤管理
    const currentStep = ref(1)
    const totalSteps = 6
    const stepTitles = ['欢迎', '环境检测', '核心服务', '索引服务', '模型选择', '完成设置']

    // 环境检测状态
    const pythonInstalled = ref(null)
    const gitInstalled = ref(null)
    const pandocInstalled = ref(null)
    const brewInstalled = ref(null)
    const ollamaInstalled = ref(null)
    const ollamaRunning = ref(null)
    const ollamaPid = ref(null)

    // 安装进度状态
    const pythonInstalling = ref(false)
    const gitInstalling = ref(false)
    const pandocInstalling = ref(false)
    const isInstallingDeps = ref(false)
    const pythonProgress = ref(0)
    const gitProgress = ref(0)
    const pandocProgress = ref(0)

    // 服务状态
    const coreServiceStatus = ref(null) // null: 检测中, true: 已启动, false: 已关闭
    const indexServiceStatus = ref(null)
    const faissServiceStatus = ref(null)
    const coreServiceStarting = ref(false)
    const indexServiceStarting = ref(false)
    const faissServiceStarting = ref(false)
    const indexServiceFirstTime = ref(false) // 是否首次启动索引服务

    // FAISS服务虚拟进度
    const faissServiceProgress = ref(0)
    const faissServiceProgressText = ref('')
    let progressInterval = null

    // 模型选择
    const selectedModelType = ref('githave')
    const cloudApiCount = ref(0)
    // eslint-disable-next-line no-unused-vars
    const cloudVendors = ref([])

    // GitHave AI 相关状态
    const isLoggedIn = ref(false)
    const selectedGithaveModel = ref('auto')
    const githaveUser = ref({
      user_id: '',
      username: '',
      email: '',
      token: '',
      expires: 0,
      loginTime: 0,
      verified: false
    })
    const isSubscribing = ref(false)

    // 模型切换确认对话框
    const showSwitchConfirmDialog = ref(false)
    const pendingSwitchValue = ref(false)

    // 重启服务进度对话框
    const showRestartDialog = ref(false)
    const isRestarting = ref(false)
    const restartProgress = ref([
      { step: 1, text: '保存配置', status: 'pending' },
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

  // 配置数据
  const config = ref({})
  const fmConfig = ref({})

  // 登录信息弹窗（Ant Design）
  const showLoginInfoModal = ref(false)
  const modalShowToken = ref(false)
  const formattedLoginTime = computed(() =>
    githaveUser.value.loginTime ? new Date(githaveUser.value.loginTime).toLocaleString() : '—'
  )
  const formattedExpireTime = computed(() =>
    githaveUser.value.expires ? new Date(githaveUser.value.expires).toLocaleString() : '—'
  )
  const maskedToken = computed(() => {
    const t = githaveUser.value.token || ''
    if (!t) return '—'
    if (modalShowToken.value) return t
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

    // 模型切换状态
    const isApplyingModelConfig = ref(false)

    // 网络速度监控相关数据
    const networkSpeed = ref({
      downloadSpeed: 0,
      uploadSpeed: 0,
      downloadSpeedFormatted: '0 B/s',
      uploadSpeedFormatted: '0 B/s',
      interfaceName: ''
    })

    // 安装日志相关数据
    const installLogs = ref([])
    const maxLogEntries = 100 // 最大日志条数

    // 添加日志条目
    const addLogEntry = (type, message) => {
      const timestamp = new Date().toLocaleTimeString()
      const logEntry = {
        id: Date.now() + Math.random(),
        type, // 'info', 'error', 'success'
        message,
        timestamp
      }

      installLogs.value.unshift(logEntry)

      // 限制日志条数
      if (installLogs.value.length > maxLogEntries) {
        installLogs.value = installLogs.value.slice(0, maxLogEntries)
      }
    }

    // 实时服务日志相关数据
    const serviceLogs = ref([])
    const maxServiceLogEntries = 50 // 最大服务日志条数
    const showServiceLogs = ref(false) // 是否显示服务日志
    const serviceLogListening = ref(false) // 是否正在监听服务日志

    // 添加服务日志条目
    const addServiceLogEntry = (type, message) => {
      const timestamp = new Date().toLocaleTimeString()
      const logEntry = {
        id: Date.now() + Math.random(),
        type, // 'info', 'error', 'success', 'warning'
        message,
        timestamp
      }

      serviceLogs.value.unshift(logEntry)

      // 限制日志条数
      if (serviceLogs.value.length > maxServiceLogEntries) {
        serviceLogs.value = serviceLogs.value.slice(0, maxServiceLogEntries)
      }
    }

    // 服务日志监听器引用
    let serviceLogListener = null

    // 开始监听服务日志
    const startServiceLogListening = () => {
      if (serviceLogListening.value) {
        console.log('服务日志监听已在运行中，跳过重复启动')
        return
      }

      serviceLogListening.value = true
      showServiceLogs.value = true
      serviceLogs.value = [] // 清空之前的日志

      // 清理之前的监听器
      if (serviceLogListener) {
        serviceLogListener()
        serviceLogListener = null
      }

      // 启用服务日志监听
      window.electron.startServiceLog()

      // 监听服务日志事件
      serviceLogListener = window.electron.onServiceLog((logData) => {
        addServiceLogEntry(logData.type, logData.message)
      })

      addServiceLogEntry('info', '开始监听服务日志...')
    }

    // 停止监听服务日志
    const stopServiceLogListening = () => {
      if (!serviceLogListening.value) return

      serviceLogListening.value = false

      // 清理监听器
      if (serviceLogListener) {
        serviceLogListener()
        serviceLogListener = null
      }

      // 停用服务日志监听
      window.electron.stopServiceLog()

      addServiceLogEntry('info', '停止监听服务日志')
    }

    // 系统检测
    const isMacOS = computed(() => {
      return navigator.platform.toUpperCase().indexOf('MAC') >= 0
    })

    const isWindows = computed(() => {
      return navigator.platform.indexOf('Win') > -1
    })

    // 进度计算
    const progressPercentage = computed(() => {
      return (currentStep.value / totalSteps) * 100
    })

    // 需要安装的依赖数量
    const needsInstallCount = computed(() => {
      let count = 0
      if (pythonInstalled.value === false) count++
      if (gitInstalled.value === false) count++
      if (pandocInstalled.value === false) count++
      return count
    })

    // 是否可以进入下一步
    const canProceed = computed(() => {
      if (currentStep.value === 1) return true
      if (currentStep.value === 2) {
        // 环境检测步骤：至少基础环境要安装完成
        return pythonInstalled.value && gitInstalled.value && pandocInstalled.value
      }
      if (currentStep.value === 3) {
        // 核心服务步骤：核心服务必须启动
        return coreServiceStatus.value === true
      }
      if (currentStep.value === 4) {
        // 索引服务步骤：索引服务和FAISS服务都必须启动
        return indexServiceStatus.value === true && faissServiceStatus.value === true
      }
      if (currentStep.value === 5) {
        // 模型选择步骤：必须选择一种模型类型且不在应用配置、重启服务或显示确认对话框中
        if (selectedModelType.value === 'githave') {
          // GitHave AI选项：必须已登录且选择了模型
          return (
            isLoggedIn.value &&
            selectedGithaveModel.value &&
            !isApplyingModelConfig.value &&
            !isRestarting.value &&
            !showSwitchConfirmDialog.value
          )
        }
        return (
          selectedModelType.value !== null &&
          !isApplyingModelConfig.value &&
          !isRestarting.value &&
          !showSwitchConfirmDialog.value
        )
      }
      return true
    })

    // 环境检测方法
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
            patch >= targetVersion.patch)
        ) {
          console.log('Python 版本大于或等于目标版本')
          pythonInstalled.value = true
          return
        }
        console.log('Python 版本小于目标版本')
        pythonInstalled.value = false
        return
      } catch {
        console.log('Python 未安装')
        pythonInstalled.value = false
        return
      }
    }

    const checkGit = async () => {
      try {
        const { installed } = await window.electron.checkGitIPC()
        console.log('Git 检测结果：', installed)
        gitInstalled.value = installed
      } catch {
        gitInstalled.value = false
      }
    }

    const checkPandoc = async () => {
      try {
        const { installed } = await window.electron.checkPandocIPC()
        console.log('Pandoc 检测结果：', installed)
        pandocInstalled.value = installed
      } catch {
        pandocInstalled.value = false
      }
    }

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

    const checkOllama = async () => {
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

    // 启动网络监控
    const startNetworkMonitoring = async () => {
      try {
        await window.electron.startNetworkMonitor()

        // 监听网络速度更新事件
        window.electron.onNetworkSpeedUpdate((data) => {
          networkSpeed.value = {
            downloadSpeed: data.downloadSpeed,
            uploadSpeed: data.uploadSpeed,
            downloadSpeedFormatted: data.downloadSpeedFormatted,
            uploadSpeedFormatted: data.uploadSpeedFormatted,
            interfaceName: data.interfaceName
          }
        })
      } catch (error) {
        console.error('启动网络监控失败:', error)
      }
    }

    // 停止网络监控
    const stopNetworkMonitoring = async () => {
      try {
        await window.electron.stopNetworkMonitor()
        window.electron.removeNetworkSpeedListener()
        // 重置网络速度数据
        networkSpeed.value = {
          downloadSpeed: 0,
          uploadSpeed: 0,
          downloadSpeedFormatted: '0 B/s',
          uploadSpeedFormatted: '0 B/s',
          interfaceName: ''
        }
      } catch (error) {
        console.error('停止网络监控失败:', error)
      }
    }

    // 安装方法
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
        // 启动网络监控
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
        // 停止网络监控
        await stopNetworkMonitoring()
      }
    }

    const installSinglePackage = async (packageName) => {
      // 先检查 Homebrew 是否安装
      const hasHomebrew = await checkBrewInstalled()
      if (!hasHomebrew) {
        alert('请先安装 Homebrew，然后再尝试安装。\n可访问 https://brew.sh 获取安装指南。')
        return
      }

      try {
        // 设置对应包的安装状态
        if (packageName === 'python') pythonInstalling.value = true
        else if (packageName === 'pandoc') pandocInstalling.value = true
        else if (packageName === 'git') gitInstalling.value = true

        // 启动网络监控
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

        // 停止网络监控
        await stopNetworkMonitoring()
      }
    }

    // 外部链接方法
    const openHomeBrewWebsite = () => window.open('https://brew.sh/', '_blank')
    const openOllamaWebsite = () => window.open('https://ollama.com', '_blank')
    const openPythonWebsite = () =>
      window.open('https://www.python.org/downloads/release/python-3133/', '_blank')
    const openGitWebsite = () => window.open('https://git-scm.com/downloads', '_blank')
    const openPandocWebsite = () => window.open('https://pandoc.org/installing.html', '_blank')

    const retryOllama = async () => {
      await checkOllama()
    }

    // 获取配置数据
    const fetchConfig = async () => {
      try {
        const [configResp, fmConfigResp] = await Promise.all([getConfig(), getFmConfig()])
        config.value = configResp.data
        fmConfig.value = fmConfigResp.data

        // 统计云端模型API数量
        let count = 0
        Object.values(config.value.custom || {}).forEach((cfg) => {
          if (cfg.api && cfg.api.trim()) {
            count++
          }
        })
        // fmConfig.embedding_cloud_model
        if (
          fmConfig.value.embedding_cloud_model.api &&
          fmConfig.value.embedding_cloud_model.api.trim()
        )
          count++
        // fmConfig.default_cloud_model
        if (fmConfig.value.default_cloud_model.api && fmConfig.value.default_cloud_model.api.trim())
          count++
        // fmConfig.model_configs
        fmConfig.value.model_configs.forEach((model) => {
          if (model.cloud_model && model.cloud_model.api && model.cloud_model.api.trim()) count++
        })
        cloudApiCount.value = count
      } catch (error) {
        console.error('获取配置失败:', error)
      }
    }

    // 应用模型配置
    const applyModelConfig = async (modelType) => {
      if (isApplyingModelConfig.value) return

      try {
        isApplyingModelConfig.value = true
        const newValue = modelType === 'cloud'

        // 1. 更新config.custom中的模型
        Object.values(config.value.custom || {}).forEach((cfg) => {
          if (cfg.api && cfg.api.trim()) {
            cfg.enabled = newValue
          }
        })

        // 2. 更新fmConfig.embedding_cloud_model
        if (
          fmConfig.value.embedding_cloud_model?.api &&
          fmConfig.value.embedding_cloud_model.api.trim()
        ) {
          fmConfig.value.embedding_cloud_model.enabled = newValue
        }

        // 3. 更新fmConfig.default_cloud_model
        if (
          fmConfig.value.default_cloud_model?.api &&
          fmConfig.value.default_cloud_model.api.trim()
        ) {
          fmConfig.value.default_cloud_model.enabled = newValue
        }

        // 4. 更新fmConfig.model_configs中的云端模型
        if (fmConfig.value.model_configs) {
          fmConfig.value.model_configs.forEach((model) => {
            if (model.cloud_model && model.cloud_model.api && model.cloud_model.api.trim()) {
              model.cloud_model.enabled = newValue
            }
          })
        }

        // 5. 保存配置
        await Promise.all([updateConfig(config.value), updateFmConfig(fmConfig.value)])

        console.log(`模型配置已切换到${modelType === 'cloud' ? '云端' : '本地'}模式`)
      } catch (error) {
        console.error('应用模型配置失败:', error)
        throw error
      } finally {
        isApplyingModelConfig.value = false
      }
    }

    // 模型切换确认对话框相关方法
    const cancelSwitch = () => {
      showSwitchConfirmDialog.value = false
      pendingSwitchValue.value = false
    }

    const confirmSwitch = async () => {
      showSwitchConfirmDialog.value = false
      await executeModelSwitch(pendingSwitchValue.value)
      // 切换完成后自动进入下一步
      currentStep.value++
    }

    // 执行模型切换
    const executeModelSwitch = async (newValue) => {
      // 重置进度状态
      restartProgress.value.forEach((step) => (step.status = 'pending'))
      isRestarting.value = true
      showRestartDialog.value = true

      try {
        // 步骤1: 修改配置
        restartProgress.value[0].status = 'running'

        // 1. 更新config.custom中的模型
        Object.values(config.value.custom || {}).forEach((cfg) => {
          if (cfg.api && cfg.api.trim()) {
            cfg.enabled = newValue
          }
        })

        // 2. 更新fmConfig.embedding_cloud_model
        if (
          fmConfig.value.embedding_cloud_model?.api &&
          fmConfig.value.embedding_cloud_model.api.trim()
        ) {
          fmConfig.value.embedding_cloud_model.enabled = newValue
        }

        // 3. 更新fmConfig.default_cloud_model
        if (
          fmConfig.value.default_cloud_model?.api &&
          fmConfig.value.default_cloud_model.api.trim()
        ) {
          fmConfig.value.default_cloud_model.enabled = newValue
        }

        // 4. 更新fmConfig.model_configs中的云端模型
        if (fmConfig.value.model_configs) {
          fmConfig.value.model_configs.forEach((model) => {
            if (model.cloud_model && model.cloud_model.api && model.cloud_model.api.trim()) {
              model.cloud_model.enabled = newValue
            }
          })
        }

        // 5. 保存配置
        await Promise.all([updateConfig(config.value), updateFmConfig(fmConfig.value)])

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

        console.log(`${newValue ? '云端模型' : '本地模型'}模式切换完成，服务已重启`)
      } catch (error) {
        console.error('切换模型模式失败:', error)
        // 标记当前步骤为失败
        const currentStepIndex = restartProgress.value.findIndex(
          (step) => step.status === 'running'
        )
        if (currentStepIndex !== -1) {
          restartProgress.value[currentStepIndex].status = 'error'
        }
      } finally {
        isRestarting.value = false
        // 0.1秒后关闭进度对话框
        setTimeout(() => {
          showRestartDialog.value = false
        }, 100)
      }
    }

    // 服务检查方法
    const checkCoreService = async () => {
      try {
        coreServiceStatus.value = null
        const result = await window.electron.checkAppHealth()
        if (result.state === '已启动') {
          // 再次通过HTTP接口确认
          try {
            const resp = await appHealthCheck()
            if (resp.status === 200) {
              coreServiceStatus.value = true
              fetchConfig()
              return
            }
          } catch {
            /* empty */
          }
        }
        coreServiceStatus.value = false
      } catch (error) {
        console.error('检查核心服务失败:', error)
        coreServiceStatus.value = false
      }
    }

    const checkIndexService = async () => {
      try {
        indexServiceStatus.value = null
        faissServiceStatus.value = null

        const result = await window.electron.checkFmHttpHealth()
        if (result.state === '已启动') {
          // 检查FM HTTP服务
          try {
            const fmResp = await fmHealthCheck()
            if (fmResp.status === 200) {
              indexServiceStatus.value = true
            }
          } catch {
            indexServiceStatus.value = false
          }

          // 检查FAISS服务
          try {
            const faissResp = await faissHealthCheck()
            if (faissResp.status === 200) {
              fetchConfig()
              faissServiceStatus.value = true
            }
          } catch {
            faissServiceStatus.value = false
          }
        } else {
          indexServiceStatus.value = false
          faissServiceStatus.value = false
        }
      } catch (error) {
        console.error('检查索引服务失败:', error)
        indexServiceStatus.value = false
        faissServiceStatus.value = false
      }
    }

    // 服务启动方法
    const startCoreService = async () => {
      if (coreServiceStarting.value) return

      try {
        coreServiceStarting.value = true

        // 开始监听服务日志
        startServiceLogListening()

        const sysConfigResp = await window.electron.sysConfig()
        const result = await window.electron.startApp(sysConfigResp.configPath)

        if (result.started) {
          // 等待服务稳定
          await new Promise((resolve) => setTimeout(resolve, 3000))
          await checkCoreService()
        } else {
          alert('核心服务启动失败，请检查系统配置')
        }
      } catch (error) {
        console.error('启动核心服务失败:', error)
        alert(`启动核心服务失败: ${error.message || '未知错误'}`)
      } finally {
        coreServiceStarting.value = false
        // 延迟停止日志监听，让用户看到完整的启动过程
        setTimeout(() => {
          stopServiceLogListening()
        }, 500)
      }
    }

    const startIndexService = async () => {
      if (indexServiceStarting.value) return

      try {
        indexServiceStarting.value = true
        faissServiceStarting.value = true

        // 开始监听服务日志
        startServiceLogListening()

        // 启动网络监控
        startNetworkMonitoring()

        // 检查是否首次启动
        const isFirstTime = localStorage.getItem('index_service_started') !== 'true'
        indexServiceFirstTime.value = isFirstTime

        // 启动虚拟进度条
        startVirtualProgress()

        const fmConfigResp = await window.electron.fmConfig()
        const result = await window.electron.startFmHttp(fmConfigResp.configPath)

        if (result.started) {
          // 首次启动需要更长的等待时间
          const waitTime = isFirstTime ? 10000 : 5000
          await new Promise((resolve) => setTimeout(resolve, waitTime))

          // 持续检查直到服务完全启动
          let retryCount = 0
          const maxRetries = isFirstTime ? 200 : 20

          while (retryCount < maxRetries) {
            await checkIndexService()
            if (indexServiceStatus.value === true && faissServiceStatus.value === true) {
              // 标记已启动过
              localStorage.setItem('index_service_started', 'true')
              indexServiceFirstTime.value = false
              // 完成进度
              faissServiceProgress.value = 100
              faissServiceProgressText.value = '安装完成'
              clearInterval(progressInterval)
              break
            }
            await new Promise((resolve) => setTimeout(resolve, 3000))
            retryCount++
          }

          if (retryCount >= maxRetries) {
            clearInterval(progressInterval)
            alert('服务启动超时，请检查网络连接或稍后重试')
          }
        } else {
          clearInterval(progressInterval)
          alert('服务启动失败，请检查系统配置')
        }
      } catch (error) {
        clearInterval(progressInterval)
        console.error('启动服务失败:', error)
        alert(`启动服务失败: ${error.message || '未知错误'}`)
      } finally {
        indexServiceStarting.value = false
        faissServiceStarting.value = false
        indexServiceFirstTime.value = false
        clearInterval(progressInterval)
        // 停止网络监控
        stopNetworkMonitoring()
        // 延迟停止日志监听，让用户看到完整的启动过程
        setTimeout(() => {
          stopServiceLogListening()
        }, 5000)
      }
    }

    // 虚拟进度条逻辑
    const startVirtualProgress = () => {
      const progressSteps = [
        { progress: 15, text: '正在下载基础依赖包...', duration: 5000 },
        { progress: 30, text: '正在安装向量计算库...', duration: 8000 },
        { progress: 45, text: '正在配置索引引擎...', duration: 12000 },
        { progress: 60, text: '正在初始化向量空间...', duration: 18000 },
        { progress: 75, text: '正在加载预训练模型...', duration: 25000 },
        { progress: 90, text: '正在优化搜索参数...', duration: 35000 },
        { progress: 95, text: '正在完成最后配置...', duration: 38000 }
      ]

      let currentStepIndex = 0
      let startTime = Date.now()

      progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime

        // 检查是否需要进入下一个步骤
        if (currentStepIndex < progressSteps.length - 1) {
          const currentStep = progressSteps[currentStepIndex]
          const nextStep = progressSteps[currentStepIndex + 1]

          if (elapsed >= currentStep.duration) {
            currentStepIndex++
            faissServiceProgressText.value = nextStep.text
          }
        }

        // 计算当前进度
        const currentStep = progressSteps[currentStepIndex]
        const nextStep = progressSteps[currentStepIndex + 1]

        if (nextStep) {
          const stepElapsed =
            elapsed - (currentStepIndex > 0 ? progressSteps[currentStepIndex - 1].duration : 0)
          const stepDuration =
            currentStep.duration -
            (currentStepIndex > 0 ? progressSteps[currentStepIndex - 1].duration : 0)
          const stepProgress = Math.min(stepElapsed / stepDuration, 1)

          faissServiceProgress.value = Math.min(
            currentStep.progress + (nextStep.progress - currentStep.progress) * stepProgress,
            95
          )
        } else {
          faissServiceProgress.value = Math.min(currentStep.progress, 95)
        }

        // 40秒后停止虚拟进度，等待实际完成
        if (elapsed >= 40000) {
          faissServiceProgress.value = 95
          faissServiceProgressText.value = '正在等待服务响应...'
          clearInterval(progressInterval)
        }
      }, 200)
    }

    // 导航方法
    const nextStep = async () => {
      if (currentStep.value < totalSteps) {
        // 如果是从模型选择步骤进入下一步，处理不同的模型类型
        if (currentStep.value === 5) {
          if (selectedModelType.value === 'githave') {
            // GitHave AI选项：直接执行订阅配置
            await subscribeGithaveAI()
            return // subscribeGithaveAI内部会处理重启和进入下一步
          } else if (selectedModelType.value) {
            // 其他选项：弹出确认对话框
            pendingSwitchValue.value = selectedModelType.value === 'cloud'
            showSwitchConfirmDialog.value = true
            return // 不立即进入下一步，等待用户确认
          }
        }

        currentStep.value++

        // 进入服务检查步骤时自动检查并启动服务
        if (currentStep.value === 3) {
          // 检查核心服务状态
          await checkCoreService()
          // 如果服务未启动，自动启动
          if (coreServiceStatus.value === false) {
            await startCoreService()
          }
        } else if (currentStep.value === 4) {
          // 检查索引服务状态
          await checkIndexService()
          // 如果索引服务或FAISS服务未启动，自动启动
          if (indexServiceStatus.value === false || faissServiceStatus.value === false) {
            await startIndexService()
          }
        }
      }
    }

    const previousStep = () => {
      if (currentStep.value > 1) {
        currentStep.value--
      }
    }
    const completeOnboarding = () => {
      // 标记引导完成
      localStorage.setItem('onboarding_completed', 'true')

      // 保存模型选择配置
      localStorage.setItem('preferred_model_type', selectedModelType.value)

      // 异步启动服务
      Promise.all([
        (async () => {
          await checkCoreService()
          if (coreServiceStatus.value === false) {
            startCoreService()
          }
        })(),
        (async () => {
          await checkIndexService()
          if (indexServiceStatus.value === false) {
            startIndexService()
          }
        })()
      ]).catch(() => {}) // 忽略任何错误
      // 跳转到主页面
      router.push('/start')
    }

    const skipOnboarding = () => {
      // 直接调用完成引导函数
      completeOnboarding()
    }

    // GitHave AI 相关方法
    const checkGithaveLoginStatus = async () => {
      try {
        const loginData = localStorage.getItem('githave_login_data')
        if (loginData) {
          const userData = JSON.parse(loginData)
          if (userData.token && userData.expires > Date.now()) {
            isLoggedIn.value = true
            Object.assign(githaveUser.value, {
              user_id: userData.user_id || '',
              username: userData.username || '',
              email: userData.email || '',
              token: userData.token || '',
              expires: userData.expires || 0,
              loginTime: userData.loginTime || 0,
              verified: userData.verified || false
            })
            return true
          } else if (userData.expires <= Date.now()) {
            localStorage.removeItem('githave_login_data')
            isLoggedIn.value = false
          }
        }
        return false
      } catch (error) {
        console.error('检查GitHave登录状态失败:', error)
        localStorage.removeItem('githave_login_data')
        isLoggedIn.value = false
        return false
      }
    }

    const loginToGithave = async () => {
      try {
        const base = (fmConfig.value.auth_base_url || '').replace(/\/$/, '') || 'http://localhost:3000'
        const authUrl = `${base}/app/auth?callback=githave-desktop`

        if (window.electron && window.electron.shell && window.electron.shell.openExternal) {
          await window.electron.shell.openExternal(authUrl)
        } else {
          window.open(authUrl, '_blank')
        }
      } catch (error) {
        console.error('打开外部浏览器失败:', error)
      }
    }

    const openGithaveConsole = async () => {
      try {
        const base = (fmConfig.value.auth_base_url || '').replace(/\/$/, '') || 'http://localhost:3000'
        const consoleUrl = `${base}/dashboard`

        if (window.electron && window.electron.shell && window.electron.shell.openExternal) {
          await window.electron.shell.openExternal(consoleUrl)
        } else {
          window.open(consoleUrl, '_blank')
        }
      } catch (error) {
        console.error('打开GitHave控制台失败:', error)
      }
    }

    const subscribeGithaveAI = async () => {
      if (!isLoggedIn.value || !selectedGithaveModel.value) {
        return
      }

      isSubscribing.value = true

      try {
        const loginDataStr = localStorage.getItem('githave_login_data')
        const loginData = loginDataStr ? JSON.parse(loginDataStr) : null
        const token = loginData?.token || ''
        if (!token) {
          throw new Error('未获取到登录凭证，请重新登录')
        }

        // 配置GitHave AI模型
        if (fmConfig.value.default_cloud_model) {
          fmConfig.value.default_cloud_model.api = token
          fmConfig.value.default_cloud_model.url = 'https://api.githave.com/v1/'
          fmConfig.value.default_cloud_model.type = 'githave'
          fmConfig.value.default_cloud_model.model = selectedGithaveModel.value
          fmConfig.value.default_cloud_model.enabled = true
        }

        if (fmConfig.value.embedding_cloud_model) {
          fmConfig.value.embedding_cloud_model.api = token
          fmConfig.value.embedding_cloud_model.url = 'https://api.githave.com/v1/'
          fmConfig.value.embedding_cloud_model.type = 'githave'
          fmConfig.value.embedding_cloud_model.model = 'BAAI/bge-large-zh-v1.5'
          fmConfig.value.embedding_cloud_model.enabled = true
        }

        // 配置索引弹性策略的云端模型（遍历 model_configs）
        if (Array.isArray(fmConfig.value.model_configs)) {
          fmConfig.value.model_configs.forEach((mc) => {
            if (!mc) return
            if (!mc.cloud_model) mc.cloud_model = {}
            mc.cloud_model.api = token
            mc.cloud_model.url = 'https://api.githave.com/v1/'
            mc.cloud_model.type = 'githave'
            mc.cloud_model.model = selectedGithaveModel.value
            mc.cloud_model.enabled = true
            mc.cloud_model.max_prompts = 30000
            if (typeof mc.cloud_model.temperature !== 'number') {
              mc.cloud_model.temperature = 0.1
            }
          })
        }

        // 配置常规助手
        const roles = ['coder', 'chatter', 'officer']
        roles.forEach((role) => {
          if (!config.value.custom[role]) config.value.custom[role] = {}
          const cc = config.value.custom[role]
          cc.api = token
          cc.url = 'https://api.githave.com/v1/'
          cc.type = 'githave'
          cc.model = selectedGithaveModel.value
          cc.enabled = true
          if (typeof cc.max_prompts !== 'number') cc.max_prompts = 30000
          if (typeof cc.max_file_num !== 'number') {
            cc.max_file_num = role === 'coder' ? 4 : 0
          }
        })

        await Promise.all([updateConfig(config.value), updateFmConfig(fmConfig.value)])
        await executeModelSwitch(true)
        // 重启完成后跳转到下一步
        currentStep.value++
      } catch (error) {
        console.error('GitHave AI订阅失败:', error)
      } finally {
        isSubscribing.value = false
      }
    }

    // 处理协议回调
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
          Object.assign(githaveUser.value, {
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

      // 显示登录成功消息，包含用户信息
      const welcomeMessage = username ? `欢迎回来，${username}！` : 'GitHave登录成功！'
      store.dispatch('snackbar/showSnackbar', {
        message: welcomeMessage,
        color: 'success'
      })

      // 弹出账户信息
      showLoginInfoModal.value = true

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

    // 退出 GitHave 登录
    const logoutGithave = () => {
      try {
        localStorage.removeItem('githave_login_data')
        isLoggedIn.value = false
        Object.assign(githaveUser.value, {
          user_id: '',
          username: '',
          email: '',
          token: '',
          expires: 0,
          loginTime: 0,
          verified: false
        })
        store.dispatch('snackbar/showSnackbar', {
          message: '已退出 GitHave 登录',
          color: 'success'
        })
      } catch (e) {
        console.error('退出登录失败:', e)
        store.dispatch('snackbar/showSnackbar', { message: '退出登录失败，请重试', color: 'error' })
      }
    }

    // 生命周期
    onMounted(async () => {
      // 初始化检测所有环境
      await Promise.all([
        checkPython(),
        checkGit(),
        checkPandoc(),
        checkBrewInstalled(),
        checkOllama(),
        checkDependenciesStatus(),
        checkGithaveLoginStatus(),
        fetchConfig()
      ])

      // 监听协议回调（兼容两种事件名）
      if (window.electron && window.electron.onProtocolCallback) {
        window.electron.onProtocolCallback(handleProtocolCallback)
      }
      if (window.electron && window.electron.onProtocolUrl) {
        window.electron.onProtocolUrl(handleProtocolCallback)
      }

      // 监听安装日志事件
      const removeLogListener = window.electron.onInstallLog((logData) => {
        addLogEntry(logData.type, logData.message)
      })

      // 设置定时检查依赖安装进度
      const checkStatusInterval = setInterval(async () => {
        if (pythonInstalling.value || pandocInstalling.value || gitInstalling.value) {
          await checkDependenciesStatus()
        } else {
          clearInterval(checkStatusInterval)
        }
      }, 2000) // 每两秒检查一次

      // 组件卸载时清除定时器和监听器
      onBeforeUnmount(() => {
        clearInterval(checkStatusInterval)
        if (removeLogListener) {
          removeLogListener()
        }
        // 清理服务日志监听器
        if (serviceLogListener) {
          serviceLogListener()
          serviceLogListener = null
        }
      })
    })

    return {
      // SVG资源
      bannerSvg,
      titleSvg,

      // 步骤管理
      currentStep,
      totalSteps,
      stepTitles,
      progressPercentage,

      // 环境状态
      pythonInstalled,
      gitInstalled,
      pandocInstalled,
      brewInstalled,
      ollamaInstalled,
      ollamaRunning,
      ollamaPid,

      // 安装状态
      pythonInstalling,
      gitInstalling,
      pandocInstalling,
      isInstallingDeps,
      pythonProgress,
      gitProgress,
      pandocProgress,

      // 网络速度监控
      networkSpeed,

      // 安装日志
      installLogs,
      addLogEntry,

      // 服务日志
      serviceLogs,
      showServiceLogs,
      serviceLogListening,
      addServiceLogEntry,
      startServiceLogListening,
      stopServiceLogListening,

      // 服务状态
      coreServiceStatus,
      indexServiceStatus,
      faissServiceStatus,
      coreServiceStarting,
      indexServiceStarting,
      faissServiceStarting,
      indexServiceFirstTime,

      // FAISS服务进度相关变量
      faissServiceProgress,
      faissServiceProgressText,

      selectedModelType,
      cloudApiCount,
      isApplyingModelConfig,

      // GitHave AI 相关
      isLoggedIn,
      selectedGithaveModel,
      githaveUser,
      isSubscribing,
      showLoginInfoModal,
      modalShowToken,
      formattedLoginTime,
      formattedExpireTime,
      maskedToken,
      copyToClipboard,

      // 计算属性
      isMacOS,
      isWindows,
      needsInstallCount,
      canProceed,

      // 方法
      installRequiredPackages,
      installSinglePackage,
      checkCoreService,
      checkIndexService,
      startCoreService,
      startIndexService,
      openHomeBrewWebsite,
      openOllamaWebsite,
      openPythonWebsite,
      openGitWebsite,
      openPandocWebsite,
      retryOllama,
      nextStep,
      previousStep,
      completeOnboarding,
      skipOnboarding,

      // 配置方法
      fetchConfig,
      applyModelConfig,

      // GitHave AI 方法
      checkGithaveLoginStatus,
      loginToGithave,
      openGithaveConsole,
      subscribeGithaveAI,
      handleProtocolCallback,
      logoutGithave,

      // 模型切换对话框
      showSwitchConfirmDialog,
      pendingSwitchValue,
      showRestartDialog,
      isRestarting,
      restartProgress,
      antStepStatusMap,
      restartHasError,
      restartPercent,
      cancelSwitch,
      confirmSwitch,
      executeModelSwitch
    }
  }
}
</script>

<style scoped>
button,
[type='button'],
[type='reset'],
[type='submit'],
[role='button'] {
  color: #fff;
}
.onboarding-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%);
  display: flex;
  flex-direction: column;
}

/* Electron 窗口拖拽样式 */
.drag-region {
  -webkit-app-region: drag;
  app-region: drag;
  cursor: move;
  user-select: none;
}

.no-drag {
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

.progress-header {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
}

.skip-button {
  position: absolute;
  top: 10px;
  right: 20px;
}

.progress-bar {
  width: 80%;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-bar-top {
  width: 80%;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
  margin-left: 150px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  color: rgb(14, 14, 14);
  font-weight: 500;
  text-align: center;
}

.progress-2-text {
  color: rgb(14, 14, 14);
  font-weight: 500;
  text-align: center;
}

.content-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.step-content {
  background: white;
  border-radius: 16px;
  padding: 24px;
  max-width: 800px;
  width: 100%;
  max-height: 70vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  text-align: center;
}

/* 欢迎步骤样式 */
.welcome-step {
  text-align: center;
}

.welcome-icon {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-items: center;
  gap: 10px;
}

.logo-banner {
  width: 80px;
  height: 80px;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
}

.logo-title {
  height: 40px;
  width: auto;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1));
}

.welcome-title {
  font-size: 2.5rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}

.welcome-subtitle {
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 30px;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-width: 400px;
  margin: 0 auto;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.1rem;
  color: #555;
}

/* 环境检测步骤样式 */
.env-check-step {
  text-align: left;
}

.step-title {
  display: flex;
  align-items: center;
  font-size: 1.8rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}

.step-description {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 20px;
}

.env-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.env-card {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
}

.env-card-success {
  border-color: #4caf50;
  background: #f8fff8;
}

.env-card-error {
  border-color: #f44336;
  background: #fff8f8;
}

.env-card-header {
  color: black;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  font-weight: bold;
  font-size: 1.1rem;
}

.env-card-status {
  color: #333;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.install-section {
  color: #333;
  margin-top: 20px;
}

/* 模型选择步骤样式 */
.model-select-step {
  text-align: left;
}

.model-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 20px;
}

.model-option {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.model-option:hover {
  border-color: #2196f3;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.2);
}

.model-option-selected {
  border-color: #2196f3;
  background: #f3f9ff;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.2);
}

.model-option-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.model-option-header h3 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: bold;
}

.model-option-content p {
  color: #666;
  margin-bottom: 15px;
}

.model-option-content ul {
  list-style: none;
  padding: 0;
  margin-bottom: 15px;
}

.model-option-content li {
  padding: 5px 0;
  color: #555;
}

.model-option-content li:before {
  content: '✓';
  color: #4caf50;
  margin-right: 8px;
  font-weight: bold;
}

.model-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #666;
  margin-top: 10px;
}

/* 完成步骤样式 */
.complete-step {
  text-align: center;
}

.complete-icon {
  margin-bottom: 20px;
}

.complete-title {
  font-size: 2rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}

.complete-description {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 30px;
}

.setup-summary {
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-width: 400px;
  margin: 0 auto;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.1rem;
  color: #555;
}

/* 底部导航样式 */
.navigation-footer {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  gap: 20px;
}

h3 {
  color: #333;
}

/* 服务检查样式 */
.service-check-container {
  color: #333;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 16px 0;
}

.service-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: #fafafa;
  transition: all 0.3s ease;
}

.service-item:hover {
  border-color: #9c27b0;
  background: #faf4ff;
}

.service-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.service-icon {
  font-size: 32px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.service-details h3 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.service-details p {
  margin: 0;
  color: #666;
  font-size: 10px;
}

.service-status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-checking {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
}

.status-success {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4caf50;
  font-weight: 500;
}

.status-error {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f44336;
  font-weight: 500;
}

.status-icon {
  font-size: 20px;
}

.start-btn {
  background: #9c27b0;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s ease;
}

.start-btn:hover {
  background: #7b1fa2;
}

.start-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #2196f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 步骤标题样式 */
.step-header {
  text-align: center;
  margin-bottom: 20px;
}

.step-header h2 {
  font-size: 1.4rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}

.step-header p {
  font-size: 0.9rem;
  color: #666;
}

/* 首次启动提示 */
.first-time-notice {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  margin: 16px 0;
}

.notice-icon {
  font-size: 20px;
  margin-top: 2px;
}

.notice-text {
  flex: 1;
  font-size: 10px;
  color: #292929;
  line-height: 1.5;
}

.notice-text strong {
  color: #856404;
}

/* 安装进度 */
.installation-progress {
  margin-top: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #dee2e6;
}

/* 网络速度显示样式 */
.installing-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.network-speed {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.speed-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.interface-name {
  font-size: 11px;
  color: #999;
  padding: 2px 6px;
  background: #f0f0f0;
  border-radius: 4px;
}

.install-info {
  display: flex;
  flex-direction: column;
}

.progress-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.progress-icon {
  font-size: 24px;
}

.progress-text h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.progress-text p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .content-area {
    padding: 20px 10px;
  }

  .step-content {
    padding: 16px;
  }

  .env-cards {
    grid-template-columns: 1fr;
  }

  .model-options {
    grid-template-columns: 1fr;
  }

  .welcome-title {
    font-size: 2rem;
  }
}

/* 启动动画样式 */
.status-starting {
  display: flex;
  align-items: center;
  gap: 16px;
}

.starting-animation {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-ring {
  position: absolute;
  border: 2px solid rgb(var(--v-theme-primary));
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: pulse 2s ease-out infinite;
  opacity: 0;
}

.pulse-ring.delay-1 {
  animation-delay: 0.5s;
}

.pulse-ring.delay-2 {
  animation-delay: 1s;
}

.starting-icon {
  position: relative;
  z-index: 1;
  color: rgb(var(--v-theme-primary));
  animation: bounce 1s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.5);
    opacity: 1;
  }
  100% {
    transform: scale(1.2);
    opacity: 0;
  }
}

@keyframes bounce {
  0%,
  20%,
  50%,
  80%,
  100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-8px);
  }
  60% {
    transform: translateY(-4px);
  }
}

.starting-content {
  flex: 1;
  min-width: 0;
}

.starting-text {
  font-weight: 500;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 8px;
  font-size: 14px;
}

.progress-container {
  width: 100%;
}

.progress-bar {
  margin-bottom: 6px;
}

.progress-text {
  font-size: 12px;
  color: #f3f3f3;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.progress-percentage {
  font-size: 11px;
  color: #333;
  font-weight: 600;
  text-align: right;
}

.progress-2-percentage {
  font-size: 11px;
  color: #333;
  font-weight: 600;
  text-align: right;
}

/* 启动动画样式 */
.status-starting {
  display: flex;
  align-items: center;
  gap: 16px;
}

.starting-animation {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-ring {
  position: absolute;
  border: 2px solid rgb(var(--v-theme-primary));
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: pulse 2s ease-out infinite;
  opacity: 0;
}

.pulse-ring.delay-1 {
  animation-delay: 0.5s;
}

.pulse-ring.delay-2 {
  animation-delay: 1s;
}

.starting-icon {
  position: relative;
  z-index: 1;
  color: rgb(var(--v-theme-primary));
  animation: bounce 1s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.5);
    opacity: 1;
  }
  100% {
    transform: scale(1.2);
    opacity: 0;
  }
}

@keyframes bounce {
  0%,
  20%,
  50%,
  80%,
  100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-8px);
  }
  60% {
    transform: translateY(-4px);
  }
}

.starting-content {
  flex: 1;
  min-width: 0;
}

.starting-text {
  font-weight: 500;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 8px;
  font-size: 14px;
}

.progress-container {
  width: 100%;
}

.progress-bar {
  margin-bottom: 6px;
}

.progress-text {
  font-size: 12px;
  color: #f3f3f3;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.progress-percentage {
  font-size: 11px;
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

/* 安装日志样式 */
.install-logs-section {
  margin-top: 16px;
}

.install-logs-card {
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  border-radius: 8px;
}

.install-logs-content {
  padding: 0 !important;
}

.logs-container {
  max-height: 300px;
  overflow-y: auto;
  border-radius: 4px;
  padding: 8px;
}

.log-entry {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.log-entry:last-child {
  border-bottom: none;
}

.log-timestamp {
  color: #888;
  font-size: 11px;
  min-width: 60px;
  flex-shrink: 0;
}

.log-type {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.log-message {
  flex: 1;
  word-break: break-word;
}

.log-info .log-message {
  color: #585858;
}

.log-error .log-message {
  color: #ff6b6b;
}

.log-success .log-message {
  color: #51cf66;
}

/* 服务日志样式 */
.service-logs-container {
  margin-top: 16px;
}

.service-logs-card {
  background: rgba(255, 255, 255, 0.95) !important;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  max-height: 300px;
}

.service-logs-header {
  padding: 16px 20px 12px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(102, 126, 234, 0.05);
  border-radius: 12px 12px 0 0;
}

.logs-icon {
  margin-right: 8px;
  color: rgb(var(--v-theme-primary));
}

.logs-title {
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  font-size: 16px;
}

.service-logs-content {
  padding: 0;
  max-height: 200px;
  overflow-y: auto;
}

.logs-list {
  padding: 12px;
}

.log-entry {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.02);
  border-left: 3px solid transparent;
  transition: all 0.2s ease;
}

.log-entry:hover {
  background: rgba(0, 0, 0, 0.05);
}

.log-entry.log-info {
  border-left-color: #2196f3;
}

.log-entry.log-success {
  border-left-color: #4caf50;
}

.log-entry.log-warning {
  border-left-color: #ff9800;
}

.log-entry.log-error {
  border-left-color: #f44336;
}

.log-time {
  font-size: 11px;
  color: #666;
  min-width: 60px;
  font-family: 'Courier New', monospace;
}

.log-icon {
  margin-top: 1px;
}

.log-message {
  flex: 1;
  font-size: 13px;
  line-height: 1.4;
  color: #333;
  word-break: break-word;
}

/* 滚动条样式 */
.logs-container::-webkit-scrollbar,
.service-logs-content::-webkit-scrollbar {
  width: 6px;
}

.logs-container::-webkit-scrollbar-track,
.service-logs-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.logs-container::-webkit-scrollbar-thumb,
.service-logs-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.logs-container::-webkit-scrollbar-thumb:hover,
.service-logs-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .status-starting {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .starting-animation {
    width: 32px;
    height: 32px;
  }

  .pulse-ring {
    width: 32px;
    height: 32px;
  }
}

/* GitHave AI 选项样式 */
.githave-option {
  border: 2px solid #ffd700 !important;
  background: linear-gradient(135deg, #fff9e6 0%, #ffffff 100%) !important;
}

.githave-option.model-option-selected {
  border-color: #ffa500 !important;
  background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%) !important;
  box-shadow: 0 4px 20px rgba(255, 165, 0, 0.3) !important;
}

.githave-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.githave-status {
  margin-top: 12px;
}

.login-section {
  display: flex;
  justify-content: center;
}

.logged-in-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.model-selection {
  display: flex;
  align-items: center;
  gap: 8px;
}

.selection-label {
  font-size: 12px;
  color: #666;
}

/* a-button 自定义样式 */
.blk-btn {
  color: #3f3f3f !important;
}
.wt-btn {
  color: #fff !important;
}
</style>
