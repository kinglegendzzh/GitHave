<template>
  <div class="onboarding-container">
    <!-- 顶部进度条 -->
    <div class="progress-header">
      <div class="progress-bar-top">
        <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
      </div>
      <div class="progress-text">
        {{ currentStep }}/{{ totalSteps }} - {{ stepTitles[currentStep - 1] }}
      </div>
      <!-- 跳过按钮 -->
      <div class="skip-button">
        <v-btn variant="text" size="small" color="white" @click="skipOnboarding">
          <v-icon left>mdi-skip-next</v-icon>
          跳过
        </v-btn>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="content-area">
      <!-- 步骤1: 欢迎页面 -->
      <div v-if="currentStep === 1" class="step-content welcome-step">
        <div class="welcome-icon">
          <v-icon size="80" color="primary">mdi-rocket-launch</v-icon>
        </div>
        <h1 class="welcome-title">欢迎使用 GitHave</h1>
        <p class="welcome-subtitle">让我们花几分钟时间来设置您的环境</p>
        <div class="feature-list">
          <div class="feature-item">
            <v-icon color="success">mdi-check-circle</v-icon>
            <span>空间透镜、深度搜索、智能代码分析</span>
          </div>
          <div class="feature-item">
            <v-icon color="success">mdi-check-circle</v-icon>
            <span>AI 驱动的代码仓库助手</span>
          </div>
          <div class="feature-item">
            <v-icon color="success">mdi-check-circle</v-icon>
            <span>本地/云端模型双支持</span>
          </div>
        </div>
      </div>

      <!-- 步骤2: 环境检测 -->
      <div v-if="currentStep === 2" class="step-content env-check-step">
        <h2 class="step-title">
          <v-icon class="mr-2" color="primary">mdi-shield-check</v-icon>
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
                <v-progress-circular indeterminate size="20"></v-progress-circular>
                <span>检测中...</span>
              </template>
              <template v-else-if="pythonInstalled">
                <v-icon color="success">mdi-check-circle</v-icon>
                <span>已安装</span>
              </template>
              <template v-else-if="pythonInstalling">
                <v-progress-circular indeterminate size="20"></v-progress-circular>
                <div class="installing-info">
                  <span>安装中 ({{ pythonProgress }}%)</span>
                  <div v-if="networkSpeed.downloadSpeedFormatted !== '0 B/s'" class="network-speed">
                    <div class="speed-item">
                      <v-icon size="14" color="primary">mdi-download</v-icon>
                      <span>{{ networkSpeed.downloadSpeedFormatted }}</span>
                    </div>
                    <div class="speed-item">
                      <v-icon size="14" color="success">mdi-upload</v-icon>
                      <span>{{ networkSpeed.uploadSpeedFormatted }}</span>
                    </div>
                    <div v-if="networkSpeed.interfaceName" class="interface-name">
                      <span>{{ networkSpeed.interfaceName }}</span>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <v-icon color="error">mdi-close-circle</v-icon>
                <span>未安装</span>
                <v-btn size="small" variant="outlined" color="primary" @click="openPythonWebsite"
                  >前往官网</v-btn
                >
                <v-btn size="small" color="primary" @click="installSinglePackage('python')"
                  >一键安装</v-btn
                >
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
                <v-progress-circular indeterminate size="20"></v-progress-circular>
                <span>检测中...</span>
              </template>
              <template v-else-if="gitInstalled">
                <v-icon color="success">mdi-check-circle</v-icon>
                <span>已安装</span>
              </template>
              <template v-else-if="gitInstalling">
                <v-progress-circular indeterminate size="20"></v-progress-circular>
                <div class="installing-info">
                  <span>安装中 ({{ gitProgress }}%)</span>
                  <div v-if="networkSpeed.downloadSpeedFormatted !== '0 B/s'" class="network-speed">
                    <div class="speed-item">
                      <v-icon size="14" color="primary">mdi-download</v-icon>
                      <span>{{ networkSpeed.downloadSpeedFormatted }}</span>
                    </div>
                    <div class="speed-item">
                      <v-icon size="14" color="success">mdi-upload</v-icon>
                      <span>{{ networkSpeed.uploadSpeedFormatted }}</span>
                    </div>
                    <div v-if="networkSpeed.interfaceName" class="interface-name">
                      <span>{{ networkSpeed.interfaceName }}</span>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <v-icon color="error">mdi-close-circle</v-icon>
                <span>未安装</span>
                <v-btn size="small" variant="outlined" color="primary" @click="openGitWebsite"
                  >前往官网</v-btn
                >
                <v-btn size="small" color="primary" @click="installSinglePackage('git')"
                  >一键安装</v-btn
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
                <v-progress-circular indeterminate size="20"></v-progress-circular>
                <span>检测中...</span>
              </template>
              <template v-else-if="pandocInstalled">
                <v-icon color="success">mdi-check-circle</v-icon>
                <span>已安装</span>
              </template>
              <template v-else-if="pandocInstalling">
                <v-progress-circular indeterminate size="20"></v-progress-circular>
                <div class="installing-info">
                  <span>安装中 ({{ pandocProgress }}%)</span>
                  <div v-if="networkSpeed.downloadSpeedFormatted !== '0 B/s'" class="network-speed">
                    <div class="speed-item">
                      <v-icon size="14" color="primary">mdi-download</v-icon>
                      <span>{{ networkSpeed.downloadSpeedFormatted }}</span>
                    </div>
                    <div class="speed-item">
                      <v-icon size="14" color="success">mdi-upload</v-icon>
                      <span>{{ networkSpeed.uploadSpeedFormatted }}</span>
                    </div>
                    <div v-if="networkSpeed.interfaceName" class="interface-name">
                      <span>{{ networkSpeed.interfaceName }}</span>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <v-icon color="error">mdi-close-circle</v-icon>
                <span>未安装</span>
                <v-btn size="small" variant="outlined" color="primary" @click="openPandocWebsite"
                  >前往官网</v-btn
                >
                <v-btn size="small" color="primary" @click="installSinglePackage('pandoc')"
                  >一键安装</v-btn
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
                <v-progress-circular indeterminate size="20"></v-progress-circular>
                <span>检测中...</span>
              </template>
              <template v-else-if="brewInstalled">
                <v-icon color="success">mdi-check-circle</v-icon>
                <span>已安装</span>
              </template>
              <template v-else>
                <v-icon color="error">mdi-close-circle</v-icon>
                <span>未安装</span>
                <v-btn size="small" color="primary" @click="openHomeBrewWebsite">前往官网</v-btn>
              </template>
            </div>
          </div>
        </div>

        <!-- 一键安装按钮 -->
        <div v-if="needsInstallCount > 0" class="install-section">
          <v-alert type="warning" class="mb-4">
            <div class="d-flex align-center">
              <div class="install-info">
                <span>检测到 {{ needsInstallCount }} 个依赖未安装</span>
                <div v-if="isInstallingDeps && networkSpeed.downloadSpeedFormatted !== '0 B/s'" class="network-speed mt-2">
                  <div class="speed-item">
                    <v-icon size="14" color="primary">mdi-download</v-icon>
                    <span>{{ networkSpeed.downloadSpeedFormatted }}</span>
                  </div>
                  <div class="speed-item">
                    <v-icon size="14" color="success">mdi-upload</v-icon>
                    <span>{{ networkSpeed.uploadSpeedFormatted }}</span>
                  </div>
                  <div v-if="networkSpeed.interfaceName" class="interface-name">
                    <span>{{ networkSpeed.interfaceName }}</span>
                  </div>
                </div>
              </div>
              <v-spacer></v-spacer>
              <v-btn
                color="primary"
                :loading="isInstallingDeps"
                :disabled="isInstallingDeps || (!isMacOS && !brewInstalled)"
                @click="installRequiredPackages"
              >
                一键安装所有依赖
              </v-btn>
            </div>
          </v-alert>
        </div>
      </div>

      <!-- 步骤3: 核心服务检查 -->
      <div v-if="currentStep === 3" class="step-content">
        <div class="step-header">
          <h2>核心服务检查</h2>
          <p>检查并启动GitHave核心服务</p>
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
                <v-progress-circular
                  indeterminate
                  size="20"
                  width="2"
                  color="primary"
                ></v-progress-circular>
                <span class="status-text">检测中...</span>
              </div>
              <div v-else-if="coreServiceStatus === true" class="status-success">
                <v-icon color="success">mdi-check-circle</v-icon>
                <span class="status-text">已启动</span>
              </div>
              <div v-else-if="coreServiceStarting" class="status-checking">
                <v-progress-circular
                  indeterminate
                  size="20"
                  width="2"
                  color="primary"
                ></v-progress-circular>
                <span class="status-text">启动中...</span>
              </div>
              <div v-else class="status-error">
                <v-btn
                  color="primary"
                  variant="elevated"
                  size="small"
                  class="start-btn"
                  @click="startCoreService"
                >
                  <v-icon left>mdi-play</v-icon>
                  启动
                </v-btn>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤4: 索引服务检查 -->
      <div v-if="currentStep === 4" class="step-content">
        <div class="step-header">
          <h2>索引服务检查</h2>
          <p>检查并启动代码索引服务</p>
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
              <v-icon class="service-icon">mdi-database-search</v-icon>
              <div class="service-details">
                <div class="service-name">索引服务</div>
                <div class="service-description">负责文档索引和向量搜索功能</div>
              </div>
            </div>
            <div class="service-status">
              <div
                v-if="indexServiceStatus === null || faissServiceStatus === null"
                class="status-checking"
              >
                <v-progress-circular
                  indeterminate
                  size="20"
                  width="2"
                  color="primary"
                ></v-progress-circular>
                <span class="status-text">检测中...</span>
              </div>
              <div
                v-else-if="indexServiceStatus === true && faissServiceStatus === true"
                class="status-success"
              >
                <v-icon color="success">mdi-check-circle</v-icon>
                <span class="status-text">已启动</span>
              </div>
              <div v-else-if="indexServiceStarting || faissServiceStarting" class="status-starting">
                <div class="starting-animation">
                  <div class="pulse-ring"></div>
                  <div class="pulse-ring delay-1"></div>
                  <div class="pulse-ring delay-2"></div>
                  <v-icon class="starting-icon">mdi-download</v-icon>
                </div>
                <div class="starting-content">
                  <div class="starting-text">正在安装基础包...</div>
                  <div class="progress-container">
                    <v-progress-linear
                      :model-value="faissServiceProgress"
                      height="6"
                      rounded
                      color="primary"
                      bg-color="grey-lighten-3"
                      class="progress-bar"
                    ></v-progress-linear>
                    <div class="progress-text">{{ faissServiceProgressText }}</div>
                    <div class="progress-percentage">{{ Math.round(faissServiceProgress) }}%</div>
                    <!-- 网络速度显示 -->
                    <div v-if="networkSpeed.downloadSpeedFormatted !== '0 B/s'" class="network-speed">
                      <div class="speed-item">
                        <v-icon size="small" color="success">mdi-download</v-icon>
                        <span>{{ networkSpeed.downloadSpeedFormatted }}</span>
                      </div>
                      <div class="speed-item">
                        <v-icon size="small" color="info">mdi-upload</v-icon>
                        <span>{{ networkSpeed.uploadSpeedFormatted }}</span>
                      </div>
                      <div class="interface-name">{{ networkSpeed.interfaceName }}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="status-error">
                <v-btn
                  color="primary"
                  variant="elevated"
                  size="small"
                  class="start-btn"
                  @click="startIndexService"
                >
                  <v-icon left>mdi-play</v-icon>
                  启动
                </v-btn>
              </div>
            </div>
          </div>
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
                <v-icon size="small" color="success">mdi-download</v-icon>
                <span>{{ networkSpeed.downloadSpeedFormatted }}</span>
              </div>
              <div class="speed-item">
                <v-icon size="small" color="info">mdi-upload</v-icon>
                <span>{{ networkSpeed.uploadSpeedFormatted }}</span>
              </div>
              <div class="interface-name">{{ networkSpeed.interfaceName }}</div>
            </div>
          </div>
          <div class="progress-bar">
            <div class="progress-container">
              <v-progress-linear
                :model-value="faissServiceProgress"
                height="6"
                rounded
                color="success"
                bg-color="grey-lighten-3"
                class="progress-bar"
              ></v-progress-linear>
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤5: 模型选择 -->
      <div v-if="currentStep === 5" class="step-content model-select-step">
        <h2 class="step-title">
          <v-icon class="mr-2" color="primary">mdi-brain</v-icon>
          选择 AI 模型
        </h2>
        <p class="step-description">选择您偏好的 AI 模型类型，稍后可以在设置中更改</p>

        <div class="model-options">
          <div
            class="model-option"
            :class="{ 'model-option-selected': selectedModelType === 'cloud' }"
            @click="selectedModelType = 'cloud'"
          >
            <div class="model-option-header">
              <v-icon size="40" color="info">mdi-cloud</v-icon>
              <h3>云端模型</h3>
            </div>
            <div class="model-option-content">
              <p>使用在线 AI 服务，无需本地部署</p>
              <ul>
                <li>快速开始，无需等待</li>
                <li>支持最新的 AI 模型</li>
                <li>需要网络连接</li>
              </ul>
              <div class="model-status">
                <v-icon color="info">mdi-information-outline</v-icon>
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
              <v-icon size="40" color="primary">mdi-harddisk</v-icon>
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
                  <v-progress-circular size="16" indeterminate></v-progress-circular>
                  <span>检测中...</span>
                </template>
                <template v-else-if="ollamaInstalled && ollamaRunning">
                  <v-icon color="success">mdi-check-circle</v-icon>
                  <span>Ollama 运行中</span>
                </template>
                <template v-else-if="ollamaInstalled && !ollamaRunning">
                  <v-icon color="warning">mdi-alert-circle</v-icon>
                  <span>Ollama 已安装但未运行</span>
                  <v-btn size="small" @click="retryOllama">启动</v-btn>
                </template>
                <template v-else>
                  <v-icon color="error">mdi-close-circle</v-icon>
                  <span>Ollama 未安装</span>
                  <v-btn size="small" @click="openOllamaWebsite">前往官网</v-btn>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤6: 完成设置 -->
      <div v-if="currentStep === 6" class="step-content complete-step">
        <div class="complete-icon">
          <v-icon size="80" color="success">mdi-check-circle</v-icon>
        </div>
        <h2 class="complete-title">设置完成！</h2>
        <p class="complete-description">您的 GitHave 基础环境已经准备就绪</p>

        <div class="setup-summary">
          <div class="summary-item">
            <v-icon color="success">mdi-check</v-icon>
            <span>基础环境检测完成</span>
          </div>
          <div class="summary-item">
            <v-icon color="success">mdi-check</v-icon>
            <span>核心服务已启动</span>
          </div>
          <div class="summary-item">
            <v-icon color="success">mdi-check</v-icon>
            <span>索引服务已启动</span>
          </div>
          <div class="summary-item">
            <v-icon color="success">mdi-check</v-icon>
            <span
              >AI 模型类型已选择：{{
                selectedModelType === 'cloud' ? '云端模型' : '本地模型'
              }}</span
            >
          </div>
          <div class="summary-item">
            <v-icon color="success">mdi-check</v-icon>
            <span>配置已保存</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部导航 -->
    <div class="navigation-footer">
      <v-btn v-if="currentStep > 1" variant="outlined" @click="previousStep"> 上一步 </v-btn>
      <v-spacer></v-spacer>
      <v-btn
        v-if="currentStep < totalSteps"
        color="primary"
        :disabled="!canProceed"
        :loading="currentStep === 5 && isApplyingModelConfig"
        @click="nextStep"
      >
        {{ currentStep === 5 && isApplyingModelConfig ? '应用配置中...' : '下一步' }}
      </v-btn>
      <v-btn v-else color="success" @click="completeOnboarding"> 开始使用 </v-btn>
    </div>

    <!-- 模型切换确认对话框 -->
    <v-dialog v-model="showSwitchConfirmDialog" persistent max-width="600">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="warning" class="mr-2">mdi-alert-circle</v-icon>
          切换模型使用模式确认
        </v-card-title>
        <v-card-text>
          <v-alert type="warning" variant="outlined" class="mb-4">
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
          </v-alert>

          <div class="mb-3">
            <span class="font-weight-bold">即将切换到：</span>
            <v-chip :color="pendingSwitchValue ? 'info' : 'primary'" class="ml-2" label>
              {{ pendingSwitchValue ? '云端模型' : '本地模型' }}
            </v-chip>
          </div>

          <div class="text-body-2 text-grey-darken-1">
            请确保当前没有重要任务正在进行，然后点击确认继续。
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="cancelSwitch"> 取消 </v-btn>
          <v-btn color="primary" variant="elevated" @click="confirmSwitch"> 确认切换 </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 重启服务进度对话框 -->
    <v-dialog v-model="showRestartDialog" persistent max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-restart</v-icon>
          重启服务中
        </v-card-title>
        <v-card-text>
          <div class="mb-4">正在重启核心服务和索引服务，请稍候...</div>
          <v-list>
            <v-list-item v-for="step in restartProgress" :key="step.step" class="px-0">
              <template #prepend>
                <v-icon v-if="step.status === 'pending'" color="grey" size="small">
                  mdi-circle-outline
                </v-icon>
                <v-progress-circular
                  v-else-if="step.status === 'running'"
                  indeterminate
                  color="primary"
                  size="20"
                  width="2"
                ></v-progress-circular>
                <v-icon v-else-if="step.status === 'completed'" color="success" size="small">
                  mdi-check-circle
                </v-icon>
                <v-icon v-else-if="step.status === 'error'" color="error" size="small">
                  mdi-close-circle
                </v-icon>
              </template>
              <v-list-item-title>{{ step.text }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
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
  setup() {
    const router = useRouter()

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
    const selectedModelType = ref('cloud')
    const cloudApiCount = ref(0)
    // eslint-disable-next-line no-unused-vars
    const cloudVendors = ref([])

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

    // 配置数据
    const config = ref({})
    const fmConfig = ref({})

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

    // 系统检测
    const isMacOS = computed(() => {
      return navigator.platform.toUpperCase().indexOf('MAC') >= 0
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
      if (!isMacOS.value) {
        alert('Windows 系统暂不支持一键安装，请手动安装所需依赖。')
        return
      }

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
      }
    }

    const startIndexService = async () => {
      if (indexServiceStarting.value) return

      try {
        indexServiceStarting.value = true
        faissServiceStarting.value = true

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
          const maxRetries = isFirstTime ? 20 : 10

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
        // 如果是从模型选择步骤进入下一步，弹出确认对话框
        if (currentStep.value === 5) {
          if (selectedModelType.value) {
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

      // 跳转到主页面
      router.push('/start')
    }

    const skipOnboarding = () => {
      // 直接调用完成引导函数
      completeOnboarding()
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
        checkDependenciesStatus()
      ])

      // 设置定时检查依赖安装进度
      const checkStatusInterval = setInterval(async () => {
        if (pythonInstalling.value || pandocInstalling.value || gitInstalling.value) {
          await checkDependenciesStatus()
        } else {
          clearInterval(checkStatusInterval)
        }
      }, 2000) // 每两秒检查一次

      // 组件卸载时清除定时器
      onBeforeUnmount(() => {
        clearInterval(checkStatusInterval)
      })
    })

    return {
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

      // 计算属性
      isMacOS,
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

      // 模型切换对话框
      showSwitchConfirmDialog,
      pendingSwitchValue,
      showRestartDialog,
      isRestarting,
      restartProgress,
      cancelSwitch,
      confirmSwitch,
      executeModelSwitch
    }
  }
}
</script>

<style scoped>
.onboarding-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
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
  padding: 40px;
  max-width: 800px;
  width: 100%;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  text-align: center;
}

/* 欢迎步骤样式 */
.welcome-step {
  text-align: center;
}

.welcome-icon {
  margin-bottom: 20px;
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
  margin-bottom: 30px;
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
  gap: 16px;
  margin: 24px 0;
}

.service-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
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
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.service-details p {
  margin: 0;
  color: #666;
  font-size: 14px;
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
  margin-bottom: 30px;
}

.step-header h2 {
  font-size: 1.8rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}

.step-header p {
  font-size: 1.1rem;
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
  font-size: 14px;
  line-height: 1.5;
}

.notice-text strong {
  color: #856404;
}

/* 安装进度 */
.installation-progress {
  margin-top: 24px;
  padding: 20px;
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
    padding: 20px;
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
  text-align: right;
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
</style>
