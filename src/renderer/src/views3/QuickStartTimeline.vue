<template>
  <v-container class="quick-start-container">
    <!-- 动态加载状态 -->
    <template v-if="loading">
      <div class="loading-container">
        <img :src="dynamicLoadingSvg" alt="加载动画" class="loading-svg" />
      </div>
    </template>

    <!-- 主要内容 -->
    <template v-else>
      <!-- 产品介绍头部 -->
      <div class="hero-section" :class="{ 'animate-fade-in': !loading }">
        <div class="hero-content">
          <div class="hero-logo animate-slide-up" :style="{ animationDelay: '0.2s' }">
            <v-img :src="titleNSrc" alt="GitHave" class="logo-image"></v-img>
          </div>
          <h1 class="hero-title animate-slide-up" :style="{ animationDelay: '0.2s' }">
            AI 驱动的代码仓库助手
          </h1>
          <p class="hero-subtitle animate-slide-up" :style="{ animationDelay: '0.2s' }">
            让 AI 帮您深度理解代码仓库，提供智能搜索、代码分析、文档生成等强大功能
          </p>
          <div class="hero-features animate-slide-up" :style="{ animationDelay: '0.2s' }">
            <div class="feature-highlight" :style="{ animationDelay: '0.3s' }">
              <v-icon color="white" size="24">mdi-telescope</v-icon>
              <span>空间透镜 - 可视化代码架构</span>
            </div>
            <div class="feature-highlight" :style="{ animationDelay: '0.4s' }">
              <v-icon color="white" size="24">mdi-magnify</v-icon>
              <span>深度搜索 - 智能代码检索</span>
            </div>
            <div class="feature-highlight" :style="{ animationDelay: '0.5s' }">
              <v-icon color="white" size="24">mdi-file-document-multiple</v-icon>
              <span>提交审查 - 识别潜在问题，提升质量和效率</span>
            </div>
            <div class="feature-highlight" :style="{ animationDelay: '0.6s' }">
              <v-icon color="white" size="24">mdi-file-document-multiple</v-icon>
              <span
                >文件枢纽 - 集中管理所有项目相关的文档、报告、分析结果和知识沉淀，信息不再散落</span
              >
            </div>
          </div>
        </div>
      </div>

      <!-- 快速开始步骤 -->
      <div class="steps-section animate-fade-in">
        <h2 class="steps-title animate-slide-up">五步开始使用</h2>
        <div class="steps-container">
          <div
            v-for="(step, index) in steps"
            :key="index"
            class="step-card animate-slide-up"
            :class="{ 'step-card-clickable': step.route || step.branches }"
          >
            <div class="step-number">{{ index + 1 }}</div>
            <div class="step-content">
              <div class="step-header">
                <v-icon :color="step.color" size="32">{{ step.icon }}</v-icon>
                <div class="step-title-container">
                  <h3 class="step-title">{{ step.title }}</h3>
                  <v-chip
                    v-if="step.optional"
                    size="x-small"
                    color="orange"
                    variant="tonal"
                    class="optional-chip"
                  >
                    可选
                  </v-chip>
                </div>
              </div>
              <p class="step-description">{{ step.description }}</p>

              <!-- 子步骤展示 -->
              <div v-if="step.subSteps && step.subSteps.length" class="sub-steps">
                <div
                  v-for="(subStep, subIndex) in step.subSteps"
                  :key="subIndex"
                  class="sub-step-item"
                  @click="selectSubStep(step, subStep)"
                >
                  <v-icon size="16" :color="step.selectedSubStep === subStep ? 'primary' : 'grey'">
                    {{ subStep.icon }}
                  </v-icon>
                  <span :class="{ 'sub-step-selected': step.selectedSubStep === subStep }">
                    {{ subStep.title }}
                  </span>
                </div>
                <div v-if="step.selectedSubStep" class="sub-step-description">
                  {{ step.selectedSubStep.description }}
                </div>
              </div>

              <!-- 分支选择 -->
              <div v-if="step.branches && step.branches.length" class="step-branches">
                <div class="branches-grid">
                  <div
                    v-for="(branch, branchIndex) in step.branches"
                    :key="branchIndex"
                    class="branch-card"
                    @click="jumpToRoute(branch.value)"
                  >
                    <v-icon :color="step.color">{{ branch.icon }}</v-icon>
                    <span>{{ branch.title }}</span>
                  </div>
                </div>
              </div>

              <!-- 单一跳转按钮 -->
              <div v-if="step.route && !step.branches" class="step-action">
                <v-btn :color="step.color" variant="elevated" @click="jumpToRoute(step.route)">
                  <v-icon left>{{ step.icon }}</v-icon>
                  {{ step.buttonText || '开始使用' }}
                </v-btn>
              </div>

              <!-- 更多按钮 -->
              <div v-if="step.more" class="step-more">
                <v-btn color="primary" variant="text" @click="scrollToFeatures">
                  更多功能...
                </v-btn>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- AI 功能展示 -->
      <div
        id="features-section"
        class="features-section animate-fade-in"
        :style="{ animationDelay: '1s' }"
      >
        <h2 class="features-title animate-slide-up" :style="{ animationDelay: '1s' }">
          九大核心 AI 功能
        </h2>
        <p class="features-subtitle animate-slide-up" :style="{ animationDelay: '1s' }">
          基于真实代码理解的智能化开发工具集
        </p>
        <div class="features-grid">
          <div
            v-for="(feature, index) in aiFeatures"
            :key="index"
            class="feature-card enhanced animate-slide-up"
            :style="{ animationDelay: `${1 + index * 0.01}s` }"
            @click="jumpToRoute(feature.route)"
          >
            <div class="feature-header">
              <div class="feature-icon">
                <v-icon :color="feature.color" size="32">{{ feature.icon }}</v-icon>
              </div>
              <div class="feature-badge">
                <v-chip size="x-small" :color="feature.color" variant="tonal">AI驱动</v-chip>
              </div>
            </div>
            <h4 class="feature-title">{{ feature.title }}</h4>
            <p class="feature-description">{{ feature.description }}</p>
            <div v-if="feature.features" class="feature-highlights">
              <div
                v-for="(highlight, idx) in feature.features.slice(0, 3)"
                :key="idx"
                class="highlight-item"
              >
                <v-icon size="12" :color="feature.color">mdi-check-circle</v-icon>
                <span>{{ highlight }}</span>
              </div>
              <div v-if="feature.features.length > 3" class="more-features">
                <span>+{{ feature.features.length - 3 }} 更多功能</span>
              </div>
            </div>
            <div class="feature-action">
              <v-btn size="small" :color="feature.color" variant="outlined" class="feature-btn">
                立即体验
                <v-icon size="16" end>mdi-arrow-right</v-icon>
              </v-btn>
            </div>
          </div>
        </div>
      </div>

      <!-- 剪切板快速导入功能介绍 -->
      <div class="clipboard-import-section animate-fade-in" :style="{ animationDelay: '1s' }">
        <div class="clipboard-import-container">
          <div class="clipboard-import-content">
            <div class="clipboard-import-header animate-slide-up" :style="{ animationDelay: '1s' }">
              <v-icon color="primary" size="48">mdi-clipboard-text</v-icon>
              <h2 class="clipboard-import-title">剪切板快速导入</h2>
              <p class="clipboard-import-subtitle">
                只需复制 GitHub 仓库链接，GitHave 会自动检测并提示您快速导入
              </p>
            </div>

            <div class="clipboard-import-demo animate-slide-up" :style="{ animationDelay: '1.2s' }">
              <div class="demo-steps">
                <div class="demo-step animate-slide-up" :style="{ animationDelay: '1.3s' }">
                  <div class="demo-step-number">1</div>
                  <div class="demo-step-content">
                    <h4>复制 GitHub 链接</h4>
                    <p>复制任意 GitHub 仓库的链接到剪切板</p>
                  </div>
                </div>
                <div class="demo-step animate-slide-up" :style="{ animationDelay: '1.4s' }">
                  <div class="demo-step-number">2</div>
                  <div class="demo-step-content">
                    <h4>自动检测提示</h4>
                    <p>GitHave 会自动检测并弹出导入确认对话框</p>
                  </div>
                </div>
                <div class="demo-step animate-slide-up" :style="{ animationDelay: '1.5s' }">
                  <div class="demo-step-number">3</div>
                  <div class="demo-step-content">
                    <h4>一键导入</h4>
                    <p>确认后自动克隆仓库到本地</p>
                  </div>
                </div>
              </div>

              <div class="demo-try-section animate-slide-up" :style="{ animationDelay: '1.5s' }">
                <h3 class="demo-try-title">立即体验</h3>
                <p class="demo-try-description">复制下面的链接试试看：</p>
                <div class="demo-links-container">
                  <v-card
                    v-for="(demoLink, index) in demoLinks"
                    :key="index"
                    class="demo-link-card"
                    elevation="2"
                  >
                    <v-card-text class="demo-link-text">
                      <v-icon left :color="demoLink.iconColor">{{ demoLink.icon }}</v-icon>
                      <span class="demo-link">{{ demoLink.url }}</span>
                      <v-btn
                        icon="mdi-content-copy"
                        size="small"
                        variant="text"
                        color="primary"
                        class="demo-copy-btn"
                        @click="copyDemoLink(demoLink.url)"
                      ></v-btn>
                    </v-card-text>
                    <v-card-subtitle class="demo-link-description">
                      {{ demoLink.description }}
                    </v-card-subtitle>
                  </v-card>
                </div>
                <v-alert type="info" variant="tonal" density="compact" class="demo-alert">
                  <template #prepend>
                    <v-icon>mdi-lightbulb-outline</v-icon>
                  </template>
                  复制链接后，GitHave 会在几秒内自动检测并提示您导入该仓库
                </v-alert>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 内置专业终端 - 开发者的得力助手 -->
      <div
        v-if="isMacOS"
        class="terminal-feature-section animate-fade-in"
        :style="{ animationDelay: '1.2s' }"
      >
        <div class="terminal-feature-container">
          <div class="terminal-feature-content">
            <div
              class="terminal-feature-header animate-slide-up"
              :style="{ animationDelay: '1.2s' }"
            >
              <v-icon color="success" size="48">mdi-console-line</v-icon>
              <h2 class="terminal-feature-title">
                GitHave IDE 内置真实终端
                <span style="font-size: 1.5rem"> (仅M1 Mac支持)</span>
              </h2>
              <p class="terminal-feature-subtitle">
                告别繁琐的终端切换！GitHave
                内置了与系统终端完全一致的专业终端环境，让您在分析代码的同时，无缝执行各种开发任务
              </p>
            </div>

            <!-- 真实终端演示 -->
            <div class="terminal-live-demo animate-slide-up" :style="{ animationDelay: '1.3s' }">
              <div class="demo-intro">
                <h3 class="demo-title">🚀 立即体验真实终端</h3>
                <p class="demo-description">
                  下方是一个完全可交互的真实终端环境，您可以直接在其中执行命令：
                </p>
              </div>

              <!-- 使用真实的VirtualTerminal组件 -->
              <div class="real-terminal-wrapper">
                <VirtualTerminal
                  :height="'300px'"
                  :width="'600px'"
                  :dark-mode="true"
                  :initial-path="termPath"
                  class="demo-terminal"
                />
              </div>

              <div class="terminal-tips">
                <v-alert type="info" variant="tonal" density="compact" class="terminal-tip">
                  <template #prepend>
                    <v-icon>mdi-lightbulb-outline</v-icon>
                  </template>
                  💡 试试输入 <code>ls</code>、<code>pwd</code>、<code>git status</code>
                  等命令，体验真实的终端交互
                </v-alert>
              </div>
            </div>

            <div class="terminal-feature-demo animate-slide-up" :style="{ animationDelay: '1.4s' }">
              <div class="terminal-features-grid">
                <div
                  class="terminal-feature-item animate-slide-up"
                  :style="{ animationDelay: '1.5s' }"
                >
                  <div class="feature-icon-wrapper">
                    <v-icon color="success" size="32">mdi-lightning-bolt</v-icon>
                  </div>
                  <div class="feature-content">
                    <h4>零配置即用</h4>
                    <p>无需额外安装或配置，打开即用的专业终端环境</p>
                  </div>
                </div>
                <div
                  class="terminal-feature-item animate-slide-up"
                  :style="{ animationDelay: '1.6s' }"
                >
                  <div class="feature-icon-wrapper">
                    <v-icon color="success" size="32">mdi-swap-horizontal</v-icon>
                  </div>
                  <div class="feature-content">
                    <h4>无缝切换</h4>
                    <p>在代码分析和终端操作间自由切换，提升开发效率</p>
                  </div>
                </div>
                <div
                  class="terminal-feature-item animate-slide-up"
                  :style="{ animationDelay: '1.7s' }"
                >
                  <div class="feature-icon-wrapper">
                    <v-icon color="success" size="32">mdi-magnify</v-icon>
                  </div>
                  <div class="feature-content">
                    <h4>智能搜索</h4>
                    <p>快速搜索终端历史记录，找到之前执行的命令</p>
                  </div>
                </div>
                <div
                  class="terminal-feature-item animate-slide-up"
                  :style="{ animationDelay: '1.8s' }"
                >
                  <div class="feature-icon-wrapper">
                    <v-icon color="success" size="32">mdi-content-copy</v-icon>
                  </div>
                  <div class="feature-content">
                    <h4>一键复制</h4>
                    <p>轻松复制终端内容，支持导出完整的操作记录</p>
                  </div>
                </div>
                <div
                  class="terminal-feature-item animate-slide-up"
                  :style="{ animationDelay: '1.9s' }"
                >
                  <div class="feature-icon-wrapper">
                    <v-icon color="success" size="32">mdi-palette</v-icon>
                  </div>
                  <div class="feature-content">
                    <h4>主题同步</h4>
                    <p>终端主题与IDE保持一致，提供统一的视觉体验</p>
                  </div>
                </div>
                <div
                  class="terminal-feature-item animate-slide-up"
                  :style="{ animationDelay: '2.0s' }"
                >
                  <div class="feature-icon-wrapper">
                    <v-icon color="success" size="32">mdi-speedometer</v-icon>
                  </div>
                  <div class="feature-content">
                    <h4>性能优化</h4>
                    <p>WebGL硬件加速渲染，即使大量输出也保持流畅</p>
                  </div>
                </div>
              </div>

              <div
                class="terminal-demo-section animate-slide-up"
                :style="{ animationDelay: '2.1s' }"
              >
                <!-- <h3 class="demo-section-title">特性</h3>
                <div class="features-showcase">
                  <div class="feature-column">
                    <h4>🎯 开发效率</h4>
                    <ul class="feature-list">
                      <li>🚀 无需切换窗口，专注开发</li>
                      <li>📂 自动定位到项目目录</li>
                      <li>🔄 与代码分析工具联动</li>
                      <li>⚡ 快速执行常用命令</li>
                      <li>📋 一键复制分析结果</li>
                      <li>🔍 智能命令历史搜索</li>
                    </ul>
                  </div>
                  <div class="feature-column">
                    <h4>💡 用户体验</h4>
                    <ul class="feature-list">
                      <li>🎨 主题自动同步IDE</li>
                      <li>📱 响应式界面设计</li>
                      <li>⌨️ 熟悉的快捷键操作</li>
                      <li>🔗 链接自动识别点击</li>
                      <li>💾 会话状态自动保存</li>
                      <li>🌐 完整Unicode字符支持</li>
                    </ul>
                  </div>
                  <div class="feature-column">
                    <h4>🛠️ 技术优势</h4>
                    <ul class="feature-list">
                      <li>🖥️ 与系统终端完全一致</li>
                      <li>⚡ WebGL硬件加速渲染</li>
                      <li>🔧 零配置开箱即用</li>
                      <li>🛡️ 安全沙箱环境</li>
                      <li>📊 性能监控优化</li>
                      <li>🔄 自动错误恢复</li>
                    </ul>
                  </div>
                </div> -->
                <v-alert
                  type="success"
                  variant="tonal"
                  density="compact"
                  class="terminal-tip-alert"
                >
                  <template #prepend>
                    <v-icon>mdi-star</v-icon>
                  </template>
                  集成9个专业插件，提供媲美VSCode的终端体验，让您的开发工作流更加顺畅
                </v-alert>
                <div class="terminal-action-section">
                  <v-btn
                    color="success"
                    variant="elevated"
                    size="large"
                    class="terminal-try-btn"
                    @click="jumpToRoute('/ide')"
                  >
                    <v-icon left>mdi-rocket-launch</v-icon>
                    <span style="text-transform: none">在GitHave IDE中使用</span>
                  </v-btn>
                  <v-btn
                    color="success"
                    variant="outlined"
                    size="large"
                    class="terminal-demo-btn"
                    @click="jumpToRoute('/term')"
                  >
                    <v-icon left>mdi-eye</v-icon>
                    查看终端功能演示
                  </v-btn>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import titleSrc from '../assets/title.svg'
import titleNSrc from '../assets/title-night.svg'
import dynamicLoadingSvg from '../assets/load.svg'
import VirtualTerminal from '../components/VirtualTerminal.vue'

// —— 平台检测 ——
const isMacOS = ref(navigator.platform.toUpperCase().indexOf('MAC') >= 0)

const termPath = ref(window.electron?.homeDir || '')

const router = useRouter()
const theme = useTheme()
const loading = ref(true)
const selectedBranch = ref(null)

const isDarkMode = computed(() => theme.global.current.value.dark)

// 演示链接配置
const demoLinks = ref([
  {
    url: 'https://github.com/cloudwego/eino',
    description: 'CloudWeGo Eino - 企业级AI应用开发框架',
    icon: 'mdi-github',
    iconColor: 'primary'
  },
  {
    url: 'https://github.com/tree-sitter/go-tree-sitter',
    description: 'go-tree-sitter - 基于Go的高效的语法解析器',
    icon: 'mdi-github',
    iconColor: 'info'
  }
])

// 模拟加载时间
onMounted(() => {
  setTimeout(() => {
    loading.value = false
  }, 1000)
})

const steps = ref([
  {
    title: '环境准备',
    description: '确保您的环境已准备就绪，包括Python和Git等必要工具。',
    icon: 'mdi-check-circle',
    color: 'success',
    route: '/onboarding',
    buttonText: '重新检查环境',
    subSteps: [
      {
        title: 'Python 环境',
        description: '检查Python版本是否符合要求（3.9+）',
        icon: 'mdi-language-python'
      },
      {
        title: 'Git 工具',
        description: '确保Git已正确安装并配置',
        icon: 'mdi-git'
      },
      {
        title: '依赖安装',
        description: '自动安装所需的Python依赖包',
        icon: 'mdi-package-down'
      }
    ],
    currentStep: 1,
    selectedSubStep: null
  },
  {
    title: '选择AI模型',
    description: '根据您的需求和硬件配置选择合适的AI模型，本地模型或云端API均可。',
    icon: 'mdi-brain',
    color: 'primary',
    route: '/model',
    buttonText: '配置模型',
    subSteps: [
      {
        title: '本地模型',
        description: '使用Ollama等本地模型，数据更安全',
        icon: 'mdi-server'
      },
      {
        title: '云端API',
        description: '使用OpenAI、Claude等云端API，性能更强',
        icon: 'mdi-cloud'
      },
      {
        title: '混合使用',
        description: '在高级配置中自行搭配，实现最佳性能',
        icon: 'mdi-auto-fix'
      }
    ],
    currentStep: 3,
    selectedSubStep: null
  },
  {
    title: '导入项目仓库',
    description: '选择合适的方式导入您的代码仓库，支持多种导入方式。',
    icon: 'mdi-source-repository',
    color: 'info',
    route: '/repo',
    buttonText: '导入项目仓库',
    subSteps: [
      {
        title: '本地导入项目',
        description: '从本地文件夹选择已有的Git仓库',
        icon: 'mdi-folder-open'
      },
      {
        title: '链接导入仓库',
        description: '手动输入GitHub、GitLab等仓库链接',
        icon: 'mdi-link'
      },
      {
        title: '剪切板快速导入 ⬇️',
        description: '复制GitHub/GitLab链接，自动检测并导入',
        icon: 'mdi-clipboard-text',
        action: 'scrollToClipboard'
      },
    ],
    currentStep: 2,
    selectedSubStep: null
  },
  {
    title: '构建智能索引',
    description: '可选步骤：为代码仓库构建AI索引，提升分析质量和搜索精度。',
    icon: 'mdi-database-search',
    color: 'orange',
    route: '/scan',
    buttonText: '构建索引',
    optional: true,
    subSteps: [
      {
        title: 'AI索引构建',
        description: '使用AI技术深度理解代码结构和语义',
        icon: 'mdi-brain'
      },
      {
        title: '函数级扫描',
        description: '精确到函数级别的代码分析和索引',
        icon: 'mdi-function'
      },
      {
        title: '社区索引',
        description: '导入社区共享的高质量索引数据',
        icon: 'mdi-account-group'
      }
    ],
    currentStep: 4,
    selectedSubStep: null
  },
  {
    title: '开始探索',
    description: '选择您想要的功能开始使用，AI将帮助您深度理解和分析代码仓库。',
    icon: 'mdi-rocket-launch',
    color: 'secondary',
    branches: [
      {
        title: '空间透镜',
        icon: 'mdi-telescope',
        value: '/space'
      },
      {
        title: '深度搜索',
        icon: 'mdi-book-search',
        value: '/search'
      },
      {
        title: '文件枢纽',
        icon: 'mdi-microsoft-word',
        value: '/report'
      },
      {
        title: '提交审查',
        icon: 'mdi-github',
        value: '/commits/history'
      },
      {
        title: 'IDE',
        icon: 'mdi-code-block-tags',
        value: '/ide'
      },
      {
        title: '推送机器人',
        icon: 'mdi-robot',
        value: '/sender'
      }
    ],
    more: true,
    currentStep: 5
  }
])

// AI功能展示数据 - 基于实际功能模块
const aiFeatures = ref([
  {
    title: '空间透镜',
    description: '深度扫描代码仓库，生成架构分析报告和流程图，可视化项目结构',
    icon: 'mdi-telescope',
    color: 'purple',
    route: '/space',
    features: ['代码深度扫描', '架构分析报告', '流程图生成', '代码视窗查看']
  },
  {
    title: '深度搜索',
    description:
      '基于自然语言代码功能描述，支持语义搜索、关键词搜索、混合搜索三种模式，精准定位代码片段',
    icon: 'mdi-book-search',
    color: 'primary',
    route: '/search',
    features: ['语义理解搜索', '关键词精确匹配', '混合搜索模式', '智能标签推荐']
  },
  {
    title: '文件枢纽',
    description: '集中管理所有项目相关的AI文档、报告、分析结果和知识沉淀，信息不再散落',
    icon: 'mdi-microsoft-word',
    color: 'info',
    route: '/report',
    features: ['文档管理', '报告生成', '知识沉淀', '分析结果查看']
  },
  {
    title: '提交审查',
    description: '智能分析Git提交记录，生成代码变更报告和开发统计',
    icon: 'mdi-github',
    color: 'teal',
    route: '/commits/history',
    features: ['提交记录分析', '代码变更统计', '开发者报告', '时间范围筛选']
  },
  {
    title: 'GitHave IDE（内测版）',
    description: '内置代码编辑器和终端，支持目录树导航、Git集成、语法高亮、代码格式化和多主题切换',
    icon: 'mdi-code-block-tags',
    color: 'success',
    route: '/ide',
    features: ['语法高亮、目录树导航', 'Git集成、真实终端', '多主题支持、快捷键操作', '']
  },
  {
    title: '推送机器人',
    description: '企业微信推送机器人，实时推送代码提交记录到团队群聊',
    icon: 'mdi-robot',
    color: 'pink',
    route: '/sender',
    features: ['企业微信集成', '实时推送', '状态监控', '一键启停']
  },
  {
    title: '模型管理',
    description: 'Ollama模型可视化管理，支持本地模型和云端API配置',
    icon: 'mdi-brain',
    color: 'indigo',
    route: '/model',
    features: ['本地模型管理', '云端API配置', '环境检测', '一键安装依赖']
  },
  {
    title: '智能索引',
    description: 'AI构建代码索引，支持函数级别的智能检索和代码理解',
    icon: 'mdi-database-search',
    color: 'orange',
    route: '/scan',
    features: ['AI索引构建', '函数级扫描', '进度可视化', '社区索引导入']
  },
  {
    title: '智能体中心',
    description: '配置和管理AI智能体，包括企业微信推送、报告生成等自动化任务',
    icon: 'mdi-robot',
    color: 'deep-purple',
    route: '/agent',
    features: ['企业微信推送', '提交记录分析', '仓库报刊生成', '自动化任务']
  }
])

/**
 * 选择指定流程中某个子流程项
 * @param {Object} step - 当前流程项
 * @param {Object} subStep - 选中的子流程项
 */
function selectSubStep(step, subStep) {
  step.selectedSubStep = subStep

  // 如果选择的是剪切板快速导入，滚动到剪切板导入区域
  if (subStep.action === 'scrollToClipboard') {
    scrollToClipboard()
  }
}

/**
 * 使用 vue-router 进行路由跳转
 * @param {String|Object} route - 跳转的路由
 */
async function jumpToRoute(route) {
  console.log('跳转路由:', route)
  if (route === '/ide') {
    console.log('跳转IDE')
    // 构造要打开的完整 URL
    const url = `${window.location.origin}/#${route}`
    // 调用主进程打开新窗口
    await window.electron.openNewWindowIDE(url)
    return
  }
  router.push(route).catch((err) => {
    // 忽略重复导航错误
    if (err.name !== 'NavigationDuplicated') {
      console.error(err)
    }
  })
}

/**
 * 复制演示链接到剪切板
 * @param {string} url - 要复制的链接
 */
function copyDemoLink(url) {
  navigator.clipboard
    .writeText(url)
    .then(() => {
      // 可以添加一个提示，告诉用户链接已复制
      console.log(`演示链接已复制到剪切板: ${url}`)
    })
    .catch((err) => {
      console.error('复制失败:', err)
    })
}

/**
 * 平滑滚动到九大核心功能区域
 */
function scrollToFeatures() {
  const featuresSection = document.getElementById('features-section')
  if (featuresSection) {
    featuresSection.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  }
}

/**
 * 平滑滚动到剪切板导入区域
 */
function scrollToClipboard() {
  const clipboardSection = document.querySelector('.clipboard-import-section')
  if (clipboardSection) {
    clipboardSection.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  }
}

// 组件加载时：为每个带子流程的步骤选择第一个子流程，并等待页面完全加载
onMounted(() => {
  steps.value.forEach((step) => {
    if (step.subSteps && step.subSteps.length) {
      selectSubStep(step, step.subSteps[0])
    }
  })
  // 判断页面是否已完全加载：
  if (document.readyState === 'complete') {
    loading.value = false
  } else {
    window.addEventListener('load', () => {
      loading.value = false
    })
  }
})
</script>

<style scoped>
:deep(.sub-step-item) {
  padding: 24px;
  span {
    color: #2c3e50;
  }
}
.quick-start-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow-x: hidden;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.loading-svg {
  width: 100px;
  height: 100px;
}

/* Hero Section */
.hero-section {
  padding: 80px 0 60px;
  text-align: center;
  color: white;
  position: relative;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.hero-logo {
  margin-bottom: 32px;
  margin-left: 100px;
}

.logo-image {
  width: 300px;
  height: auto;
  margin: 0 auto;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 24px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  background: linear-gradient(45deg, #fff, #e3f2fd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.4rem;
  margin-bottom: 48px;
  opacity: 0.9;
  line-height: 1.6;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.hero-features {
  display: flex;
  justify-content: center;
  gap: 48px;
  flex-wrap: wrap;
}

.feature-highlight {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.1rem;
  font-weight: 500;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.feature-highlight:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

/* Steps Section */
.steps-section {
  background: white;
  padding: 80px 0;

  position: relative;
  border-radius: 10px;
}

.steps-title {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 60px;
  color: #2c3e50;
}

.steps-container {
  max-width: 1500px;
  margin: 0 auto;
  padding: 0 24px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 40px;
}

.step-card {
  background: white;
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
  position: relative;
  transition: all 0.3s ease;
  overflow: hidden;
}

.step-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea, #764ba2);
}

.step-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.step-card-clickable {
  cursor: pointer;
}

.step-number {
  position: absolute;
  top: 0px;
  right: 24px;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  border: 3px solid white;
}

.step-content {
  margin-top: 16px;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.step-title-container {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.step-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
}

.optional-chip {
  margin-left: 8px;
}

.step-description {
  color: #666;
  line-height: 1.6;
  margin-bottom: 24px;
}

/* Sub Steps */
.sub-steps {
  margin: 24px 0;
}

.sub-step-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 8px;
}

.sub-step-item:hover {
  background: #f5f5f5;
}

.sub-step-selected {
  font-weight: 600;
  color: #1976d2;
}

.sub-step-description {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  margin-top: 16px;
  border-left: 4px solid #1976d2;
  color: #666;
  line-height: 1.5;
}

/* Branches */
.step-branches {
  margin-top: 24px;
}

.branches-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
}

.branch-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  background: #f8f9fa;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  color: #2c3e50;
}

.branch-card:hover {
  background: #e3f2fd;
  border-color: #1976d2;
  transform: translateY(-2px);
}

.step-action {
  margin-top: 24px;
  text-align: center;
}

/* Features Section */
.features-section {
  padding: 80px 0;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.features-title {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: #2c3e50;
}

.features-subtitle {
  text-align: center;
  font-size: 1.2rem;
  color: #7f8c8d;
  margin-bottom: 60px;
  font-weight: 400;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 30px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
}

.feature-card {
  background: white;
  padding: 30px 25px;
  border-radius: 20px;
  text-align: left;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.feature-card.enhanced {
  min-height: 280px;
  display: flex;
  flex-direction: column;
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  border-color: #667eea;
}

.feature-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.feature-icon {
  padding: 12px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.feature-badge {
  margin-top: 4px;
}

.feature-title {
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: #2c3e50;
  line-height: 1.3;
}

.feature-description {
  color: #7f8c8d;
  line-height: 1.6;
  font-size: 0.95rem;
  margin-bottom: 20px;
  flex-grow: 1;
}

.feature-highlights {
  margin-bottom: 20px;
}

.highlight-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: #5a6c7d;
}

.highlight-item span {
  line-height: 1.4;
}

.more-features {
  margin-top: 8px;
  font-size: 0.85rem;
  color: #95a5a6;
  font-style: italic;
}

.feature-action {
  margin-top: auto;
}

.feature-btn {
  width: 100%;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0.5px;
}

/* Clipboard Import Section */
.clipboard-import-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 80px 0;
  position: relative;
}

.clipboard-import-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.clipboard-import-content {
  text-align: center;
}

.clipboard-import-header {
  margin-bottom: 60px;
}

.clipboard-import-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 24px 0 16px;
  color: #2c3e50;
}

.clipboard-import-subtitle {
  font-size: 1.3rem;
  color: #666;
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto;
}

.clipboard-import-demo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: start;
  margin-top: 40px;
}

.demo-steps {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.demo-step {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  text-align: left;
}

.demo-step-number {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.2rem;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.demo-step-content h4 {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 8px 0;
}

.demo-step-content p {
  color: #666;
  line-height: 1.5;
  margin: 0;
}

.demo-try-section {
  background: white;
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
}

.demo-try-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 16px 0;
}

.demo-try-description {
  color: #666;
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.demo-links-container {
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.demo-link-card {
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  background: #ffffff;
  border: 1px solid #e2e8f0;
}

.demo-link-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15) !important;
  border-color: #3b82f6;
}

.demo-link-text {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px 8px 16px !important;
}

.demo-link {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: #1976d2;
  background: #f5f7fa;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #e1e8ed;
  font-weight: 500;
}

.demo-link-description {
  padding: 0 16px 12px 16px !important;
  font-size: 12px;
  color: #64748b;
  font-weight: 400;
}

.demo-copy-btn {
  flex-shrink: 0;
}

.demo-alert {
  margin: 0;
  border-radius: 8px;
}

/* Terminal Feature Section */
.terminal-feature-section {
  padding: 80px 0;
  background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%);
}

.terminal-feature-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.terminal-feature-content {
  text-align: center;
}

.terminal-feature-header {
  margin-bottom: 60px;
}

.terminal-feature-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 16px 0;
}

.terminal-feature-subtitle {
  font-size: 1.2rem;
  color: #666;
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto;
}

/* 实时终端演示窗口样式 */
.terminal-live-demo {
  margin-bottom: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 真实终端演示样式 */
.demo-intro {
  text-align: center;
  margin-bottom: 24px;
}

.demo-title {
  font-size: 24px;
  font-weight: 600;
  color: #2e7d32;
  margin-bottom: 8px;
}

.demo-description {
  font-size: 16px;
  color: #666;
  margin-bottom: 0;
}

.real-terminal-wrapper {
  margin: 24px 0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(46, 125, 50, 0.2);
}

.demo-terminal {
  border-radius: 0 !important;
}

.terminal-tips {
  margin-top: 16px;
}

.terminal-tip {
  border-left: 4px solid #2e7d32;
}

.terminal-tip code {
  background: rgba(46, 125, 50, 0.1);
  color: #2e7d32;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
}

.terminal-features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 32px;
  margin-bottom: 60px;
}

.terminal-feature-item {
  background: white;
  border-radius: 16px;
  padding: 32px 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
  transition: all 0.3s ease;
  text-align: center;
}

.terminal-feature-item:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.15);
}

.feature-icon-wrapper {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #4caf50, #66bb6a);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.feature-icon-wrapper .v-icon {
  color: white !important;
}

.terminal-feature-item .feature-content h4 {
  font-size: 1.3rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 12px 0;
}

.terminal-feature-item .feature-content p {
  color: #666;
  line-height: 1.5;
  margin: 0;
}

.terminal-demo-section {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
  text-align: left;
}

.demo-section-title {
  font-size: 1.8rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 32px 0;
  text-align: center;
}

.features-showcase {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 32px;
  margin-bottom: 40px;
}

.feature-column h4 {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-list li {
  padding: 8px 0;
  color: #555;
  font-size: 0.95rem;
  line-height: 1.4;
  border-bottom: 1px solid #f0f0f0;
}

.feature-list li:last-child {
  border-bottom: none;
}

.terminal-action-section {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.terminal-try-btn,
.terminal-demo-btn {
  min-width: 200px;
  height: 48px;
  font-weight: 600;
  border-radius: 24px;
  transition: all 0.3s ease;
}

.terminal-try-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(76, 175, 80, 0.3);
}

.terminal-demo-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(76, 175, 80, 0.2);
}

.terminal-tip-alert {
  margin-bottom: 20px;
  border-radius: 12px;
  border: 1px solid rgba(76, 175, 80, 0.2);
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: 1.2rem;
  }

  .hero-features {
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }

  .feature-highlight {
    font-size: 1rem;
    padding: 12px 20px;
  }

  .steps-container {
    grid-template-columns: 1fr;
    gap: 30px;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .logo-image {
    width: 200px;
  }

  .clipboard-import-demo {
    grid-template-columns: 1fr;
    gap: 40px;
    padding: 0;
  }

  .demo-steps {
    grid-template-columns: 1fr;
  }

  .demo-step {
    text-align: center;
  }

  .demo-step-number {
    margin: 0 auto 16px;
  }

  .clipboard-import-title {
    font-size: 2rem;
  }

  .clipboard-import-subtitle {
    font-size: 1.1rem;
  }
}

@media (max-width: 480px) {
  .hero-section {
    padding: 60px 0 40px;
  }

  .hero-title {
    font-size: 2rem;
  }

  .branches-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .clipboard-import-section {
    padding: 60px 0;
  }

  .demo-try-section {
    padding: 24px;
  }

  .demo-link-text {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .demo-link {
    text-align: center;
  }

  /* Terminal Feature Responsive */
  .terminal-feature-section {
    padding: 60px 0;
  }

  .terminal-feature-title {
    font-size: 2rem;
  }

  .terminal-feature-subtitle {
    font-size: 1.1rem;
  }

  .demo-terminal-window {
    max-width: 100%;
  }

  .terminal-content {
    padding: 16px;
    font-size: 12px;
  }

  .terminal-features-grid {
    grid-template-columns: 1fr;
    gap: 24px;
    margin-bottom: 40px;
  }

  .features-showcase {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .terminal-demo-section {
    padding: 24px;
  }

  .demo-section-title {
    font-size: 1.5rem;
  }

  .terminal-action-section {
    flex-direction: column;
    align-items: center;
  }

  .terminal-try-btn,
  .terminal-demo-btn {
    width: 100%;
    max-width: 300px;
  }
}
@media (min-width: 960px) {
  .v-container {
    max-width: 3000px;
  }
}

.step-more {
  margin-top: 24px;
  text-align: center;
}

/* 动画样式 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 动画类 */
.animate-fade-in {
  animation: fadeIn 0.8s ease-out forwards;
  opacity: 0;
}

.animate-slide-up {
  animation: slideUp 0.8s ease-out forwards;
  opacity: 0;
}

.animate-slide-in-left {
  animation: slideInLeft 0.8s ease-out forwards;
  opacity: 0;
}

.animate-slide-in-right {
  animation: slideInRight 0.8s ease-out forwards;
  opacity: 0;
}

.animate-scale-in {
  animation: scaleIn 0.8s ease-out forwards;
  opacity: 0;
}

/* 特殊动画效果 */
.feature-highlight {
  animation: slideUp 0.6s ease-out forwards;
  opacity: 0;
}

.step-card {
  animation-fill-mode: forwards;
}

.feature-card {
  animation-fill-mode: forwards;
}

:deep(.v-card-text) {
  background-color: #ffffff;
}

/* 固定颜色方案，不跟随系统主题 */
.demo-link-card {
  background: #ffffff !important;
}

.demo-link {
  color: #1976d2 !important;
  background: #f5f7fa !important;
}

.demo-link-description {
  color: #64748b !important;
}

.demo-copy-btn {
  color: #3b82f6 !important;
}
</style>
