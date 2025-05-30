<template>
  <v-container>
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
    <div v-if="selectedTab === 'env'" class="bottom-nav-padding">
      <!-- 环境检测模块 -->
      <v-card class="pa-2 mb-4 env-card-compact" outlined>
        <v-card-title class="d-flex align-center">
          <v-icon color="primary" small class="mr-2">mdi-briefcase</v-icon>
          <span class="font-weight-bold">1. 必要基础环境是否具备</span>
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
                  v-if="isMacOS"
                  text
                  small
                  variant="outlined"
                  color="success"
                  @click="installSinglePackage('python')"
                  >一键安装</v-btn
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
                  v-if="isMacOS"
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
                  v-if="isMacOS"
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
          "
        >
          <v-icon color="primary" class="mr-2">mdi-alert-decagram</v-icon>
          2. 模型是否配置（二选一）
        </v-card-title>
        <v-card-text
          class="d-flex flex-wrap justify-space-between align-center"
          style="background: #f5f7fa; border-radius: 8px; border: 2px dashed #1976d2"
        >
          <v-row class="w-100 dark-text-force" align="center" justify="center">
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
                  <div class="mb-4 dark-text-force">无需本地部署，随时体验最新AI能力。</div>
                  <!-- 新增：云端模型配置检测信息 -->
                  <div class="mb-2">
                    <v-alert type="info" variant="outlined" colored-border class="pa-2 mb-2">
                      <template #prepend>
                        <v-icon color="info">mdi-information-outline</v-icon>
                      </template>
                      <div class="dark-text-force" style="overflow-x: auto; white-space: nowrap;">
                        <v-icon v-if="cloudApiCount !== 0" color="green" small>mdi-check-circle</v-icon>
                        <v-icon v-else color="red" small>mdi-close-circle</v-icon>
                        <span class="font-weight-bold dark-text-force">已启用的云端模型API：</span>
                        <span class="text-primary">{{ cloudApiCount }}</span>
                        <span class="ml-3 font-weight-bold dark-text-force">涉及提供商：</span>
                        <span class="text-info">{{ cloudVendors.join('，') || '无' }}</span>
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
              <div class="font-weight-bold text-primary dark-text-force">二选一</div>
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
                  <div class="mb-2 dark-text-force">无需联网，数据本地安全，适合隐私场景。</div>
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
                      <v-icon v-if="ollamaInstalled && ollamaRunning" color="green" small
                        >mdi-check-circle</v-icon
                      >
                      <v-icon v-else color="red" small>mdi-close-circle</v-icon>
                      <span class="dark-text-force">本地模型部署状态</span>
                    </v-alert>
                  </template>

                  <!-- 弹窗内容 -->
                  <v-card min-width="500" class="pa-3" style="background-color: white !important">
                    <v-card-text class="dark-text-force" style="background-color: white !important">
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
                              >一键启动</v-btn
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
                              nomic-embed-text/bge-large-zh/text2vec-large
                            </div>
                            <div class="text--secondary text-caption dark-text-force">
                              <span class="text-grey">(大约需要1.1GB)</span
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
    </div>
    <!-- 本地模型主区域 -->
    <div v-else-if="selectedTab === 'local'" class="bottom-nav-padding">
      <div>
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
                    >一键启动</v-btn
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
                  <div class="font-weight-medium">nomic-embed-text/bge-large-zh/text2vec-large</div>
                  <div class="text--secondary text-caption">
                    <span class="text-grey">(大约需要1.1GB)</span>构建代码知识库与智能AI索引
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
                      <div class="chip-item" draggable="true" @dragstart="onDragStart(element)">
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
                <div class="exp-list-placeholder">拖拽模型到这里 绑定角色</div>
                <v-row>
                  <v-col v-for="slot in expertKeys" :key="slot" cols="12" sm="4" class="d-flex">
                    <v-card
                      class="flex-grow-1 pa-2"
                      outlined
                      :class="{ 'drag-over': dragOverSlot === slot }"
                      @dragover.prevent="dragOverSlot = slot"
                      @dragleave="dragOverSlot = null"
                      @drop="onDrop(slot)"
                    >
                      <v-card-title class="subtitle-1">{{ slotLabels[slot] }}</v-card-title>
                      <v-divider />
                      <v-card-text class="d-flex flex-column">
                        <div v-if="expertSlots[slot].length === 0" class="text-center grey--text">
                          <span v-if="dragOverSlot === slot" class="font-weight-bold"
                            >释放至此</span
                          >
                          <span v-else>请拖入模型</span>
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
                </v-row>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn text @click="resetConfig">重置</v-btn>
            <v-btn color="primary" @click="saveModelConfig">保存模型配置</v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </div>

    <!-- 云端模型区域 -->
    <div v-else-if="selectedTab === 'remote'" class="bottom-nav-padding">
      <v-container>
        <v-card class="pa-4" outlined>
          <v-card-title class="headline">☁️ 云端模型</v-card-title>
          <!-- 新增：统一云端模型配置展示区 -->
          <v-card-text>
            <v-alert type="info" variant="outlined" colored-border class="mb-4">
              <span style="color: #9c1a1c; border: 10px">一键订阅</span>
              功能正在有序开发中，敬请期待，你可以先在这里手动配置云端模型的API。
            </v-alert>
            <v-btn color="primary" variant="tonal" class="mr-2 mt-2" @click="applyToAllCloudConfigs"
              >一键设置（以第一个为准）</v-btn
            >
            <v-btn color="success" variant="tonal" class="mt-2" @click="saveAllCloudConfigs"
              >一键保存</v-btn
            >
            <v-row>
              <v-col
                v-for="(item, idx) in allCloudConfigs"
                :key="item.label + idx"
                cols="12"
                md="6"
              >
                <v-card outlined>
                  <v-card-title>{{ item.label }}</v-card-title>
                  <v-card-text>
                    <v-text-field v-model="item.ref.api" label="API Key" />
                    <v-text-field v-model="item.ref.url" label="API URL" />
                    <v-text-field v-model="item.ref.model" label="模型名称" />
                    <v-text-field v-model="item.ref.type" label="供应商" />
                    <v-switch v-model="item.ref.enabled" label="启用" />
                    <v-text-field
                      v-model.number="item.ref.max_prompts"
                      label="最大提示词数量"
                      type="number"
                    />
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
          <!-- 自定义模型配置 -->
          <v-card-text>
            <v-form ref="form" v-model="valid">
              <v-expansion-panels v-model="expandedPanels" multiple variant="popout">
              </v-expansion-panels>
            </v-form>
          </v-card-text>
        </v-card>
      </v-container>
    </div>
    <div v-else-if="selectedTab === 'conf'" class="bottom-nav-padding">
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
                          <v-switch v-model="fmConfig.embedding_cloud_model.enabled" label="启用" />
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
                            <v-text-field v-model="model.temperature" label="温度" outlined dense />
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
    </div>
  </v-container>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed, onBeforeUnmount } from 'vue'
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

// —— 拖拽分配 ——
const installedModels = ref([])
const expertSlots = reactive({ coder: [], chatter: [], officer: [] })
const expertKeys = ['coder', 'chatter', 'officer']
const slotLabels = {
  coder: '代码助手',
  chatter: '对话助手',
  officer: '总结助手'
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

const messages = ref([
  {
    date: '立刻订阅',
    message:
      '本地部署嫌麻烦，反应速度太慢？订阅我们的一站式模型服务，无须下载任何模型，即可体验所有AI能力',
    href: 'https://your.link/3'
  }
])

// —— 拖拽处理 ——
const onDragStart = (model) => {
  event.dataTransfer.setData('application/json', JSON.stringify(model))
}
const onDrop = (slot) => {
  dragOverSlot.value = null
  const model = JSON.parse(event.dataTransfer.getData('application/json'))
  expertSlots[slot] = [model]
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
    const nomic1 = await window.electron.checkModelInstalled('nomic-embed-text:latest')
    const nomic2 = await window.electron.checkModelInstalled('quentinz/bge-large-zh-v1.5:latest')
    const nomic3 = await window.electron.checkModelInstalled(
      'nn200433/text2vec-bge-large-chinese:latest'
    )
    console.log('nomicInstalled', nomic1, nomic2, nomic3)
    nomicInstalled.value = nomic1 && nomic2 && nomic3
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
    toInstall.push('nomic-embed-text:latest')
    toInstall.push('quentinz/bge-large-zh-v1.5:latest')
    toInstall.push('nn200433/text2vec-bge-large-chinese:latest')
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
  expertKeys.forEach((slot) => {
    const name = config.ollama[slot]
    if (name) {
      const found = installedModels.value.find((m) => m.name === name)
      expertSlots[slot] = found ? [found] : [{ id: name, name, size: '', modified: '' }]
    }
  })
}

const saveModelConfig = async () => {
  // 同步 expertSlots 到 config
  expertKeys.forEach((slot) => {
    config.ollama[slot] = expertSlots[slot][0]?.name || ''
  })
  config.expertSlots = { ...expertSlots }
  try {
    await updateConfig(config)
    alert('模型配置已保存')
  } catch (e) {
    console.error(e)
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
  try {
    await updateFmConfig(fmConfig)
    alert('FM配置已保存')
  } catch (e) {
    console.error('保存FM配置失败:', e)
    alert('保存失败，请重试')
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

// —— 统一云端模型配置 ——
const allCloudConfigs = ref([])
function collectAllCloudConfigs() {
  const arr = []
  // 1. config.custom
  Object.entries(config.custom).forEach(([slot, cfg]) => {
    arr.push({
      type: 'custom',
      slot,
      ref: cfg,
      label: `自定义角色：${slotLabels[slot] || slot}`
    })
  })
  // 2. fmConfig.embedding_cloud_model
  arr.push({
    type: 'embedding_cloud_model',
    ref: fmConfig.embedding_cloud_model,
    label: '索引嵌入云模型'
  })
  // 3. fmConfig.default_cloud_model
  arr.push({
    type: 'default_cloud_model',
    ref: fmConfig.default_cloud_model,
    label: '索引默认云模型'
  })
  // 4. fmConfig.model_configs
  fmConfig.model_configs.forEach((model, idx) => {
    if (model.cloud_model) {
      arr.push({
        type: 'model_configs',
        index: idx,
        ref: model.cloud_model,
        label: `索引弹性策略云模型 #${idx + 1}`
      })
    }
  })
  allCloudConfigs.value = arr
}

// tab切换到remote时自动拉取并归纳
watch(selectedTab, async (val) => {
  if (val === 'remote') {
    await fetchConfig()
    await fetchFmConfig()
    collectAllCloudConfigs()
  }
})

// 一键设置：以第一个为准
function applyToAllCloudConfigs() {
  if (!allCloudConfigs.value.length) return
  const first = allCloudConfigs.value[0].ref
  allCloudConfigs.value.forEach((item) => {
    if (item.type !== 'embedding_cloud_model') {
      item.ref.api = first.api
      item.ref.url = first.url
      item.ref.model = first.model
      item.ref.type = first.type
      item.ref.enabled = first.enabled
      item.ref.max_prompts = first.max_prompts
    }
  })
}
// 一键保存
async function saveAllCloudConfigs() {
  await updateFmConfig(fmConfig)
  await updateConfig(config)
  alert('所有云端模型配置已保存')
}

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
  // if (!isMacOS.value) {
  //   alert('Windows 系统暂不支持一键安装，请手动安装所需依赖。')
  //   return
  // }

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
  }
}

// 安装单个依赖包
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
  if (
    fmConfig.embedding_cloud_model.enabled &&
    fmConfig.embedding_cloud_model.api &&
    fmConfig.embedding_cloud_model.api.trim()
  )
    count++
  // fmConfig.default_cloud_model
  if (
    fmConfig.default_cloud_model.enabled &&
    fmConfig.default_cloud_model.api &&
    fmConfig.default_cloud_model.api.trim()
  )
    count++
  // fmConfig.model_configs
  fmConfig.model_configs.forEach((model) => {
    if (
      model.cloud_model &&
      model.cloud_model.enabled &&
      model.cloud_model.api &&
      model.cloud_model.api.trim()
    )
      count++
  })
  return count
})
const cloudVendors = computed(() => {
  // 统计所有云端模型配置中涉及的type/供应商
  const vendors = new Set()
  Object.values(config.custom).forEach((cfg) => {
    if (cfg.type && cfg.type.trim()) vendors.add(cfg.type)
  })
  if (fmConfig.embedding_cloud_model.type && fmConfig.embedding_cloud_model.type.trim())
    vendors.add(fmConfig.embedding_cloud_model.type)
  if (fmConfig.default_cloud_model.type && fmConfig.default_cloud_model.type.trim())
    vendors.add(fmConfig.default_cloud_model.type)
  fmConfig.model_configs.forEach((model) => {
    if (model.cloud_model && model.cloud_model.type && model.cloud_model.type.trim())
      vendors.add(model.cloud_model.type)
  })
  return Array.from(vendors)
})

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
  initExpertSlotsFromConfig()

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
</script>

<style scoped>
.drag-over {
  border: 1px dashed #1976d2;
  background-color: rgba(25, 118, 210, 0.05);
  transition: background-color 0.2s;
}
.model-list {
  width: 300px;
  height: 400px;
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
  z-index: 1;
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
  line-height: 1.2 !important;
}
.expert-chip .v-chip__content {
  white-space: normal;
  word-break: break-word;
  height: auto;
  line-height: 1.2;
}
/* 让 v-progress-linear 的进度条宽度变化带过渡动画 */
.v-progress-linear .v-progress-linear__bar {
  transition: width 0.4s ease-in-out;
}
/* —— 新增：为底部导航留出空间 —— */
.bottom-nav-padding {
  padding-bottom: 56px;
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
</style>
