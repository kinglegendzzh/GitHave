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
        <!-- 新手引导按钮 -->
        <v-btn
          class="onboarding-btn"
          size="small"
          variant="text"
          color="grey"
          @click="jumpToOnboarding"
        >
          <v-icon size="16" class="mr-1">mdi-dog</v-icon>
          回到环境配置引导界面
        </v-btn>

        <div class="hero-content">
          <div class="hero-logo animate-slide-up" :style="{ animationDelay: '0.2s' }">
            <v-img :src="titleNSrc" alt="GitHave" class="logo-image"></v-img>
          </div>
          <h1 class="hero-title animate-slide-up" :style="{ animationDelay: '0.2s' }">
            AI 驱动的代码仓库助手
          </h1>
          <p class="hero-subtitle animate-slide-up" :style="{ animationDelay: '0.2s' }">
            <!-- 让 AI 帮您深度理解代码仓库，提供智能搜索、代码分析、文档生成等强大功能 -->
          </p>
          <div class="hero-features animate-slide-up" :style="{ animationDelay: '0.2s' }">
            <div class="feature-highlight" :style="{ animationDelay: '0.3s' }">
              <v-icon color="white" size="24">mdi-magnify</v-icon>
              <span>AI搜索</span>
            </div>
            <div class="feature-highlight" :style="{ animationDelay: '0.4s' }">
              <v-icon color="white" size="24">mdi-sitemap-outline</v-icon>
              <span>AI理解</span>
            </div>
            <div class="feature-highlight" :style="{ animationDelay: '0.5s' }">
              <v-icon color="white" size="24">mdi-telescope</v-icon>
              <span>AI分析</span>
            </div>
            <div class="feature-highlight" :style="{ animationDelay: '0.6s' }">
              <v-icon color="white" size="24">mdi-robot</v-icon>
              <span>AI生成</span>
            </div>
            <div class="feature-highlight" :style="{ animationDelay: '0.7s' }">
              <v-icon color="white" size="24">mdi-github</v-icon>
              <span>AI审查</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 快速开始步骤 -->
      <div class="steps-section animate-fade-in">
        <h2 class="steps-title animate-slide-up">四步开始使用</h2>
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
                    size="small"
                    color="orange"
                    variant="tonal"
                    class="optional-chip"
                  >
                    可选
                  </v-chip>
                </div>
              </div>
              <!-- <p class="step-description">{{ step.description }}</p> -->

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
                <v-btn
                  size="large"
                  :color="step.color"
                  variant="elevated"
                  @click="jumpToRoute(step.route)"
                >
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
          九大核心功能
        </h2>
        <div class="features-grid">
          <div
            v-for="(feature, index) in aiFeatures"
            :key="index"
            class="feature-card enhanced animate-slide-up"
            :style="{ animationDelay: `${1 + index * 0.01}s` }"
          >
            <div @click="showFeatureDetail(feature)">
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
            </div>
            <div class="feature-action">
              <v-btn
                size="small"
                :color="feature.color"
                variant="outlined"
                class="feature-btn"
                @click="jumpToRoute(feature.route)"
              >
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
        v-if="false"
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

    <!-- 功能详情模态框 -->
    <a-modal
      v-model:open="featureDetailVisible"
      width="800px"
      :footer="null"
      class="feature-detail-modal"
    >
      <div v-if="selectedFeature" class="feature-detail-content">
        <div class="feature-detail-header">
          <div class="feature-icon-large">
            <v-icon :color="selectedFeature.color" size="48">{{ selectedFeature.icon }}</v-icon>
          </div>
          <div class="feature-info">
            <h3 class="feature-title-large">{{ selectedFeature.title }}</h3>
            <p class="feature-description-large">{{ selectedFeature.description }}</p>
            <v-chip :color="selectedFeature.color" variant="tonal" size="small">AI驱动</v-chip>
          </div>
        </div>

        <a-divider>核心功能特性</a-divider>

        <div class="feature-list-container">
          <div
            v-for="(feature, index) in selectedFeature.features"
            :key="index"
            class="feature-item-detailed"
          >
            <div class="feature-item-icon">
              <v-icon :color="selectedFeature.color" size="16">mdi-check-circle</v-icon>
            </div>
            <div class="feature-item-text">{{ feature }}</div>
          </div>
        </div>

        <div class="feature-detail-actions">
          <a-button type="primary" size="large" class="experience-btn" @click="jumpToFeatureRoute">
            <template #icon>
              <v-icon size="16">mdi-rocket-launch</v-icon>
            </template>
            立即体验
          </a-button>
          <a-button size="large" @click="featureDetailVisible = false"> 关闭 </a-button>
        </div>
      </div>
    </a-modal>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import dynamicLoadingSvg from '../assets/load.svg'
import VirtualTerminal from '../components/VirtualTerminal.vue'
import titleNSrc from '../assets/title-night.svg'

const termPath = ref(window.electron?.homeDir || '')

const router = useRouter()
const loading = ref(true)

// 功能详情模态框状态
const featureDetailVisible = ref(false)
const selectedFeature = ref(null)

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

// 跳转到新手引导
const jumpToOnboarding = () => {
  router.push('/onboarding')
}

// 模拟加载时间
onMounted(() => {
  setTimeout(() => {
    loading.value = false
  }, 1000)
})

const steps = ref([
  // {
  //   title: '环境准备',
  //   description: '确保您的环境已准备就绪，包括Python和Git等必要工具。',
  //   icon: 'mdi-check-circle',
  //   color: 'success',
  //   route: '/onboarding',
  //   buttonText: '重新检查环境',
  //   subSteps: [
  //     {
  //       title: 'Python 环境',
  //       description: '检查Python版本是否符合要求（3.9+）',
  //       icon: 'mdi-language-python'
  //     },
  //     {
  //       title: 'Git 工具',
  //       description: '确保Git已正确安装并配置',
  //       icon: 'mdi-git'
  //     },
  //     {
  //       title: '依赖安装',
  //       description: '自动安装所需的Python依赖包',
  //       icon: 'mdi-package-down'
  //     }
  //   ],
  //   currentStep: 1,
  //   selectedSubStep: null
  // },
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
        title: '云端模型',
        description: '自由搭配使用OpenAI、Qwen等供应商的顶尖模型',
        icon: 'mdi-cloud'
      },
      {
        title: '订阅 GitHave AI 服务',
        description:
          '使用 GitHave 官方模型，登录即赠送1万tokens，无需消耗算力，自动导入社区优质代码索引，免费试用全部AI功能',
        icon: 'mdi-currency-usd'
      }
    ],
    currentStep: 3,
    selectedSubStep: null
  },
  {
    title: '导入项目仓库',
    description: '选择合适的方式导入您的代码仓库，支持多种导入方式。',
    icon: 'mdi-source-repository',
    color: 'success',
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
      }
    ],
    currentStep: 2,
    selectedSubStep: null
  },
  {
    title: '构建代码索引',
    description: '可选步骤：为代码仓库构建AI索引，提升分析质量和搜索精度。',
    icon: 'mdi-database-search',
    color: 'pink',
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
        title: '脉络感知',
        icon: 'mdi-sitemap-outline',
        route: '/module-graphs'
      },
      {
        title: '提交审查',
        icon: 'mdi-github',
        value: '/commits/history'
      },
      // {
      //   title: 'IDE',
      //   icon: 'mdi-code-block-tags',
      //   value: '/ide'
      // },
      {
        title: '代码视窗',
        icon: 'mdi-code-block-tags',
        value: '/finder'
      }
      // {
      //   title: '推送机器人',
      //   icon: 'mdi-robot',
      //   value: '/sender'
      // }
    ],
    more: true,
    currentStep: 5
  }
])

// AI功能展示数据 - 基于实际功能模块
const aiFeatures = ref([
  {
    title: '空间透镜',
    description: '可视化代码仓库结构分析工具，通过多级饼图和智能索引提供深度代码洞察',
    icon: 'mdi-telescope',
    color: 'purple',
    route: '/space',
    features: [
      '🔍 多级饼图可视化，直观展示代码仓库的层级结构和文件分布',
      '📊 智能文件类型统计，支持紧凑和详细两种展示模式',
      '⚡ 实时索引构建，支持函数级别的代码结构分析',
      '🎯 交互式导航，点击饼图或目录列表快速跳转到任意层级',
      '🧠 AI驱动的代码分析，生成深度分析报告和流程图',
      '🔧 权重配置系统，支持多种分析场景的个性化设置',
      '📈 全量/普通扫描模式，根据项目规模自适应扫描深度',
      '💡 悬浮提示功能，实时显示文件索引状态和函数信息',
      '🎨 多配色方案支持，提供预设色卡和自定义配色选项',
      '📋 右键菜单操作，支持代码预览、路径复制、本地打开等功能'
    ]
  },
  {
    title: '深度搜索',
    description: '基于AI增强的智能代码搜索引擎，支持自然语言查询和多模式检索',
    icon: 'mdi-book-search',
    color: 'primary',
    route: '/search',
    features: [
      '🔍 混合增强搜索，结合RAG检索增强生成技术提供精准结果',
      '🎯 意图精确搜索，基于大模型意图识别的关键词匹配',
      '🧠 语义向量检索，基于自然语义相似度的智能搜索',
      '📝 自然语言查询，支持用自然语言描述功能需求进行搜索',
      '🏷️ 智能标签推荐，"猜你所想"功能提供相关搜索建议',
      '📊 多维度结果展示，支持函数、文件、目录的分类筛选',
      '💡 搜索助手引导，提供丰富的搜索示例和使用技巧',
      '🔄 实时索引状态检测，自动检查和管理代码库索引',
      '📖 Markdown渲染支持，美观展示搜索结果和代码描述',
      '⚡ 快捷键操作，支持键盘快捷键快速切换搜索模式'
    ]
  },
  {
    title: '脉络感知',
    description: 'AI驱动的代码仓库结构分析与可视化工具，通过网络结构、目录树、树状图、旭日图等多种视图展示代码模块关系',
    icon: 'mdi-sitemap-outline',
    color: 'deep-purple',
    route: '/module-graphs',
    features: [
      '🔍 网络结构可视化，直观展示代码模块间的依赖关系和调用链路',
      '🌳 目录树展示，清晰呈现代码仓库的层级结构和文件分布',
      '🌲 树状图分析，分层展示代码模块的组织结构',
      '🌞 旭日图展示，多维度展示代码模块的占比和关系',
      '🤖 AI智能分析，自动生成模块功能描述和接口说明',
      '⚡ 实时索引构建，支持函数级别的代码结构分析',
      '🎯 交互式导航，点击图表节点快速跳转到对应代码',
      '📊 模块详情展示，查看模块的函数信息、索引状态和AI分析摘要',
      '🔄 一键刷新功能，实时更新模块图谱数据',
      '📥 项目目录选择，支持快速切换和分析不同代码仓库'
    ]
  },
  {
    title: '文件枢纽',
    description: '智能文档管理中心，集中展示和管理所有AI生成的分析报告、图表和研究成果',
    icon: 'mdi-microsoft-word',
    color: 'info',
    route: '/report',
    features: [
      '📊 多类型文档管理，支持代码分析报告、提交记录分析、仓库报刊等',
      '🔍 智能搜索筛选，支持文件名搜索和文件类型分类筛选',
      '👁️ 在线预览功能，支持Markdown、CSV、图片等多种格式预览',
      '📈 数据可视化展示，包括贡献榜图表和活跃度热力图',
      '🏷️ 智能标签系统，自动分类和标记文档来源与类型',
      '⚡ 实时刷新机制，自动同步最新生成的分析报告',
      '🔧 文件操作功能，支持重命名、删除、外部打开等操作',
      '📋 CSV数据分析，支持大文件分页浏览和内容搜索',
      '🖼️ 图片智能加载，支持本地图片路径解析和预览',
      '📱 响应式设计，支持虚拟滚动和性能优化'
    ]
  },
  {
    title: '提交审查',
    description: '全方位Git提交记录分析平台，提供智能代码审查和开发统计功能',
    icon: 'mdi-github',
    color: 'teal',
    route: '/commits/history',
    features: [
      '🔍 多维度筛选查询，支持仓库、分支、时间范围、作者等条件筛选',
      '📊 批量操作功能，支持多选提交记录生成综合报告和明细',
      '👀 可视化代码差异，提供直观的代码变更对比和审查界面',
      '📈 智能统计图表，生成仓库提交贡献榜和活跃度热力图',
      '🏷️ 作者马甲管理，支持提交作者别名映射和统一显示',
      '📋 详细报告导出，生成提交记录分析报告和修改明细CSV',
      '📰 仓库报刊生成，定期生成项目开发动态和统计报告',
      '⚡ 缓存优化机制，支持提交记录缓存清理和性能优化',
      '🎯 精确代码审查，逐行显示代码变更和AI智能评价',
      '📅 灵活时间选择，支持自定义时间范围和预设时间段'
    ]
  },
  {
    title: '代码视窗',
    description: '强大的代码浏览和预览工具，支持多种文件格式的在线查看和代码结构分析',
    icon: 'mdi-code-block-tags',
    color: 'success',
    route: '/finder',
    features: [
      '📁 智能目录树浏览，支持文件搜索和快速定位',
      '📄 多格式文件预览：代码、Markdown、PDF、Word、Excel等',
      '🎨 多主题代码高亮，支持亮色/暗色主题切换',
      '🔍 代码结构索引，函数和类的智能解析展示',
      '📑 多标签页管理，支持同时打开多个文件',
      '🔗 面包屑导航，快速跳转到任意目录层级',
      '⚡ Monaco编辑器集成，提供专业的代码查看体验',
      '🎯 右键菜单操作，支持文件的创建、重命名、删除等',
      '📋 剪贴板操作，支持文件和文件夹的复制粘贴',
      '🔧 侧边栏自定义，可隐藏/显示目录树和索引面板'
    ]
  },
  {
    title: '模型管理',
    description: '全方位AI模型管理平台，提供本地模型部署和云端API配置的一站式解决方案',
    icon: 'mdi-brain',
    color: 'indigo',
    route: '/model',
    features: [
      '🔧 基础环境检测，自动检测Python、Git、Pandoc等必要依赖',
      '📦 一键安装依赖，支持自动安装缺失的基础环境组件',
      '🤖 Ollama本地模型管理，支持模型部署、删除和状态监控',
      '☁️ 云端模型API配置，支持多家AI服务提供商的API集成',
      '🎯 可视化角色分配，通过拖拽方式为不同角色分配专用模型',
      '⚙️ 高级配置管理，支持详细的模型参数和提示词配置',
      '📊 实时状态监控，显示模型运行状态和资源使用情况',
      '🔄 智能模式切换，一键在本地模型和云端模型间切换',
      '📈 网络速度监控，实时显示下载和上传速度信息',
      '📝 安装日志记录，详细记录依赖安装过程和错误信息'
    ]
  },
  {
    title: '智能索引',
    description: 'AI驱动的代码索引构建平台，提供函数级别的智能检索和深度代码理解',
    icon: 'mdi-database-search',
    color: 'orange',
    route: '/scan',
    features: [
      '🔍 快速仓库搜索，支持仓库名称和描述的实时搜索过滤',
      '📊 智能索引状态监控，实时显示构建、已构建、未构建等状态',
      '⚡ 函数级别扫描，支持Go、Java、Python、C/C++、PHP、JS等语言',
      '📈 可视化进度跟踪，显示索引构建进度和预估完成时间',
      '🎯 仓库大小智能分类，自动识别超小型、小型、中型、大型仓库',
      '🔧 自定义排除规则，支持配置索引排除文件和目录',
      '📦 索引导出功能，支持将构建的索引打包导出和分享',
      '🔄 增量索引更新，支持索引的增量构建和重置操作',
      '🤖 模块分析集成，自动进行代码模块结构分析',
      '💾 本地进度缓存，自动保存和恢复索引构建进度'
    ]
  },
  {
    title: '智能体中心',
    description: '全方位AI智能体管理平台，提供企业级自动化任务配置和工作流管理',
    icon: 'mdi-robot',
    color: 'deep-purple',
    route: '/agent',
    features: [
      '🤖 企业微信推送智能体，自动推送代码提交记录到团队群聊',
      '📊 提交记录分析智能体，生成详细的代码变更分析报告',
      '📰 仓库报刊智能体，定期生成项目动态和开发统计报告',
      '⚙️ 智能体配置管理，支持Webhook、定时任务、消息模板配置',
      '🎯 AI语气风格定制，支持多种评价语气和消息总结风格',
      '📁 文件消息发送设置，灵活控制热力图、报告、明细的推送',
      '🔄 一键导入功能，快速导入监听仓库和索引',
      '📈 可视化工作流展示，直观了解智能体的工作流程',
      '🛠️ 高级配置选项，支持自定义提示词和文件模板设置',
      '📋 智能体状态监控，实时显示配置状态和运行信息'
    ]
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
 * 使用新增标签页的方式进行路由跳转
 * @param {String|Object} route - 跳转的路由
 */
async function jumpToRoute(route) {
  console.log('新增标签页跳转:', route)
  
  if (route === '/ide') {
    console.log('跳转IDE')
    // 构造要打开的完整 URL
    const url = `${window.location.origin}/#${route}`
    // 调用主进程打开新窗口
    await window.electron.openNewWindowIDE(url)
    return
  }
  
  if (route === '/onboarding') {
    console.log('跳转新手引导时，清除相关localStorage')
    localStorage.removeItem('onboarding_completed')
    localStorage.removeItem('index_service_started')
    // 新手引导使用路由跳转而不是新增标签页
    router.push(route).catch((err) => {
      if (err.name !== 'NavigationDuplicated') {
        console.error(err)
      }
    })
    return
  }
  
  // 其他路由使用新增标签页的方式
  try {
    // 触发自定义事件来新增标签页
    const event = new CustomEvent('addNewTab', {
      detail: {
        route: route,
        title: getRouteTitle(route)
      }
    })
    window.dispatchEvent(event)
  } catch (error) {
    console.error('新增标签页失败:', error)
    // 降级处理：使用普通路由跳转
    router.push(route).catch((err) => {
      if (err.name !== 'NavigationDuplicated') {
        console.error(err)
      }
    })
  }
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
 * 显示功能详情模态框
 * @param {Object} feature - 功能对象
 */
function showFeatureDetail(feature) {
  selectedFeature.value = feature
  featureDetailVisible.value = true
}

/**
 * 跳转到功能路由
 */
function jumpToFeatureRoute() {
  if (selectedFeature.value?.route) {
    featureDetailVisible.value = false
    jumpToRoute(selectedFeature.value.route)
  }
}

/**
 * 根据路由获取标签页标题
 * @param {String} route - 路由路径
 * @returns {String} 标签页标题
 */
function getRouteTitle(route) {
  const routeTitleMap = {
    '/space': '空间透镜',
    '/search': '深度搜索',
    '/report': '文件枢纽',
    '/module-graphs': '脉络感知',
    '/commits/history': '提交审查',
    '/finder': '代码视窗',
    '/sender': '推送机器人',
    '/model': '模型管理',
    '/scan': '智能索引',
    '/agent': '智能体中心',
    '/repo': '项目仓库',
    '/term': '终端功能'
  }
  return routeTitleMap[route] || route
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
  background: linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%);
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
  grid-template-columns: repeat(2, 1fr);
  gap: 40px;
  max-width: 1100px;
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
  max-width: 550px;
}

.step-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #1e3a8a, #0891b2);
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
  top: 12px;
  right: 24px;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #1e3a8a, #0891b2);
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
  margin-bottom: 60px;
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
  border-color: #1e3a8a;
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
  background: linear-gradient(135deg, #1e3a8a, #0891b2);
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
@media (max-width: 1024px) and (min-width: 769px) {
  .steps-container {
    grid-template-columns: repeat(2, 1fr);
    gap: 30px;
  }
}

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

/* 功能详情模态框样式 */
.feature-detail-modal :deep(.ant-modal-content) {
  border-radius: 12px;
  overflow: hidden;
}

.feature-detail-content {
  padding: 8px 0;
}

.feature-detail-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}

.feature-icon-large {
  flex-shrink: 0;
  padding: 12px;
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 0.1);
}

.feature-info {
  flex: 1;
}

.feature-title-large {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--v-theme-on-surface);
}

.feature-description-large {
  font-size: 1rem;
  line-height: 1.6;
  margin: 0 0 12px 0;
  color: var(--v-theme-on-surface-variant);
}

.feature-list-container {
  max-height: 400px;
  overflow-y: auto;
  margin: 16px 0;
}

.feature-item-detailed {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.1);
}

.feature-item-detailed:last-child {
  border-bottom: none;
}

.feature-item-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.feature-item-text {
  flex: 1;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--v-theme-on-surface);
}

.feature-detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--v-theme-outline), 0.1);
}

.experience-btn {
  background: linear-gradient(135deg, var(--v-theme-primary), var(--v-theme-secondary));
  border: none;
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.3);
}

.experience-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(var(--v-theme-primary), 0.4);
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

/* 新手引导按钮样式 */
.onboarding-btn {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
  opacity: 0.6;
  font-size: 12px;
  min-width: auto;
  padding: 4px 8px;
  transition: opacity 0.3s ease;
}

.onboarding-btn:hover {
  opacity: 1;
}

.demo-copy-btn {
  color: #3b82f6 !important;
}
</style>
