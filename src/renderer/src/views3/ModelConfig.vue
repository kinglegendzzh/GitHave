<template>
  <v-container>
    <!-- 环境检测模块 -->
    <v-card class="pa-4 mb-4" outlined>
      <v-card-title class="headline">本地模型所需的环境</v-card-title>
      <v-card-text>
        <v-row>
          <!-- Ollama 状态 -->
          <v-col cols="12" md="6" class="d-flex align-center">
            <span class="mr-2">Ollama 状态：</span>
            <template v-if="ollamaInstalled === null">
              <span>正在检测...</span>
            </template>
            <template v-else-if="ollamaInstalled">
              <v-icon color="green" small>mdi-check-circle</v-icon>
              <span class="ml-1">OLLAMA 已安装且正在运行</span>
            </template>
            <template v-else>
              <span>OLLAMA 未安装或未运行。</span>
              <template v-if="!attemptedStart">
                <v-btn text small color="primary" size="small" @click="retryOllama">一键启动</v-btn>
              </template>
              <template v-else>
                <v-btn text small color="primary" size="small" @click="openOllamaWebsite"
                  >前往Ollama官网下载</v-btn
                >
              </template>
            </template>
          </v-col>

          <!-- Python 状态 -->
          <v-col cols="12" md="6" class="d-flex align-center">
            <span class="mr-2">Python 状态：</span>
            <template v-if="pythonInstalled === null">
              <span>正在检测...</span>
            </template>
            <template v-else-if="pythonInstalled">
              <v-icon color="green" small>mdi-check-circle</v-icon>
              <span class="ml-1">已安装</span>
            </template>
            <template v-else>
              <v-icon color="red" small>mdi-close-circle</v-icon>
              <span class="ml-1">未安装</span>
              <v-btn text small color="primary" size="small" @click="openPythonWebsite">前往官网下载</v-btn>
            </template>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card class="pa-4 mb-4" outlined>
      <v-card-title class="headline">必要的本地模型是否安装</v-card-title>
      <v-card-text>
        <v-row>
          <!-- nomic-embed-text -->
          <v-col cols="12" md="6" class="d-flex align-center">
        <span class="mr-2">nomic-embed-text:
          <br><p class="text-grey">用于构建代码知识库与智能索引</p>
        </span>
            <template v-if="nomicInstalled === null">
              <span>正在检测...</span>
            </template>
            <template v-else-if="nomicInstalled">
              <v-icon color="green" small>mdi-check-circle</v-icon>
              <span class="ml-1">已安装</span>
            </template>
            <template v-else>
              <v-icon color="red" small>mdi-close-circle</v-icon>
              <span class="ml-1 mr-1">未安装</span>
              <v-btn text small color="primary" @click="retryNomic">重试检测</v-btn>
            </template>
          </v-col>

          <!-- rwkv-7 -->
          <v-col cols="12" md="6" class="d-flex align-center">
        <span class="mr-2">rwkv-7:
          <br><p class="text-grey">用于意图识别和快速摘要</p>
        </span>
            <template v-if="rwkvInstalled === null">
              <span>正在检测...</span>
            </template>
            <template v-else-if="rwkvInstalled">
              <v-icon color="green" small>mdi-check-circle</v-icon>
              <span class="ml-1">已安装</span>
            </template>
            <template v-else>
              <v-icon color="red" small>mdi-close-circle</v-icon>
              <span class="ml-1 mr-1">未安装</span>
              <v-btn text small color="primary" @click="retryRwkv">重试检测</v-btn>
            </template>
          </v-col>
        </v-row>
      </v-card-text>
      <!-- 新增一键安装按钮 -->
      <v-card-actions v-if="!(nomicInstalled && rwkvInstalled)">
        <v-spacer />
        <v-btn color="primary" @click="installNecessaryModels">一键安装</v-btn>
      </v-card-actions>
    </v-card>

    <!-- 模型选择拖拽模块 -->
    <v-card class="pa-4 mb-4" outlined>
      <v-card-title class="headline">所有已安装的模型列表 & 专家插槽</v-card-title>
      <v-card-text>
        <v-row>
          <!-- 左侧：可拖拽的模型列表 -->
          <v-col cols="12" md="6">
            <!-- 固定尺寸、可滚动的父容器 -->
            <div class="model-list">
              <draggable
                v-model="installedModels"
                :group="{ name: 'models', pull: 'clone', put: false }"
                item-key="id"
                :tag="'div'"
              >
                <!-- item 插槽：只有一个根节点 -->
                <template #item="{ element }">
                  <div
                    class="chip-item"
                    draggable="true"
                    @dragstart="onDragStart(element)"
                  >
                    <v-tooltip location="top">
                      <!-- activator 里放可拖拽的 chip -->
                      <template #activator="{ props }">
                        <v-chip
                          v-bind="props"
                          class="ma-1"
                          outlined
                        >
                          {{ element.name }}
                        </v-chip>
                      </template>
                      <!-- tooltip 内容 -->
                      <div class="pa-2">
                        <div>文件大小：{{ element.size }}</div>
                        <div>更新时间：{{ element.modified }}</div>
                      </div>
                    </v-tooltip>
                  </div>
                </template>
              </draggable>
            </div>
          </v-col>

          <!-- 右侧：专家插槽卡片 -->
          <v-col cols="12" md="6" class="d-flex exp-list">
            <div class="exp-list-placeholder">
              将模型拖拽到这里
            </div>
            <v-row>
              <v-col
                cols="12" sm="4"
                v-for="slot in expertKeys"
                :key="slot"
                class="d-flex"
              >
                <v-card
                  class="flex-grow-1 pa-2"
                  outlined
                  :class="{ 'drag-over': dragOverSlot === slot }"
                  @dragover.prevent="dragOverSlot = slot"
                  @dragleave="dragOverSlot = null"
                  @drop="onDrop(slot)"
                >
                  <v-card-title class="subtitle-1">
                    {{ slotLabels[slot] }}
                  </v-card-title>
                  <v-divider />
                  <v-card-text class="d-flex flex-column">
                    <div
                      v-if="expertSlots[slot].length === 0"
                      class="text-center grey--text"
                    >
                    <span v-if="dragOverSlot === slot" class="font-weight-bold">
                        拖到我这里
                    </span>
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
        <v-btn color="primary" @click="saveModelConfig">保存模型配置</v-btn>
      </v-card-actions>
    </v-card>

    <v-card class="pa-4" outlined>
      <v-card-title class="headline">自定义模型配置</v-card-title>
      <v-card-text>
        <v-form ref="form" v-model="valid">
          <v-expansion-panels v-model="expandedPanels" multiple variant="popout">
            <!-- 离线智能 -->
            <v-expansion-panel>
              <v-expansion-panel-title id="offline-panel-header"
                >📴 本地模型配置</v-expansion-panel-title
              >
              <v-expansion-panel-text>
                <v-row>
                  <v-col v-for="(value, key) in config.ollama" :key="key" cols="12" md="6">
                    <v-text-field
                      v-model="config.ollama[key]"
                      :label="checkOllamaLabel(key)"
                      outlined
                    ></v-text-field>
                  </v-col>
                </v-row>
                <v-card class="pa-4 mb-4" outlined>
                  <v-card-title class="headline">检测部署状态并自动安装</v-card-title>
                  <v-card-text>
                    <!-- 使用 v-stepper 控制步骤 -->
                    <v-stepper v-model="deploymentStep">
                      <v-stepper-header>
                        <v-stepper-item value="1" :complete="deploymentStep > 1" editable>
                          <template #title>检查 ollama 状态</template>
                        </v-stepper-item>
                        <v-divider class="mx-2"></v-divider>
                        <v-stepper-item value="2" :complete="deploymentStep > 2" editable>
                          <template #title>检查模型部署</template>
                        </v-stepper-item>
                        <v-divider class="mx-2"></v-divider>
                        <v-stepper-item value="3" editable>
                          <template #title>自动部署</template>
                        </v-stepper-item>
                      </v-stepper-header>
                      <v-container>
                        <!-- 步骤 1 内容 -->
                        <div v-if="deploymentStep === 1">
                          <div v-if="ollamaInstalled === null">正在检测 ollama 状态...</div>
                          <div v-else-if="ollamaInstalled">ollama 已安装且正在运行。</div>
                          <div v-else>ollama 未安装。请点击下面按钮进入官网下载安装。</div>
                          <v-btn
                            v-if="ollamaInstalled || ollamaInstalled === null"
                            color="primary"
                            class="mt-2"
                            @click="nextStep"
                          >
                            下一步
                          </v-btn>
                          <v-btn v-else color="error" class="mt-2" @click="openOllamaWebsite">
                            前往 ollama 官网
                          </v-btn>
                        </div>
                        <!-- 步骤 2 内容 -->
                        <div v-if="deploymentStep === 2">
                          <div v-if="modelsDeployed === null">检查所需模型部署情况</div>
                          <div v-else-if="modelsDeployed">所需模型已全部部署。</div>
                          <div v-else>
                            检测到部分模型未部署，请点击“开始部署”自动安装。<span>{{
                              modelsNotExits
                            }}</span>
                          </div>
                          <v-btn
                            v-if="modelsDeployed"
                            color="success"
                            class="mt-2"
                            @click="nextStep"
                          >
                            完成
                          </v-btn>
                          <v-btn v-else color="primary" class="mt-2" @click="startDeployment">
                            开始部署
                          </v-btn>
                        </div>
                        <!-- 步骤 3 内容 -->
                        <div v-if="deploymentStep === 3">
                          <div v-if="deploymentInProgress">
                            <div>正在部署模型：{{ currentDeployingModel }}</div>
                            <v-progress-linear
                              :value="deploymentProgress"
                              height="20"
                              striped
                              class="mt-2"
                            ></v-progress-linear>
                          </div>
                          <div v-else>已部署完成。</div>
                        </div>
                      </v-container>
                    </v-stepper>
                  </v-card-text>
                </v-card>
              </v-expansion-panel-text>
            </v-expansion-panel>
            <!-- 云端智能 -->
            <v-expansion-panel>
              <v-expansion-panel-title id="cloud-panel-header">☁️ 云端模型配置</v-expansion-panel-title>
              <v-expansion-panel-text>
                <div v-for="(modelConfig, modelKey) in config.custom" :key="modelKey">
                  <v-card flat class="mb-4 pa-2">
                    <v-card-title class="subtitle-1">{{ checkCustomLabel(modelKey) }}</v-card-title>
                    <v-card-text>
                      <v-row>
                        <v-col v-for="(value, key) in modelConfig" :key="key" cols="12" md="6">
                          <v-text-field
                            v-model="config.custom[modelKey][key]"
                            :label="checkCustomLabel(key)"
                            outlined
                          ></v-text-field>
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="saveModelConfig">保存模型配置</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from "vue";
import { getConfig, updateConfig } from '../service/api.js'
import draggable from 'vuedraggable'

// 离线部署相关状态
const deploymentStep = ref(1) // 当前步骤 1-检查 ollama；2-检查模型部署；3-自动部署
const modelsDeployed = ref(null) // 未检测：null，检测结果 true/false
const deploymentInProgress = ref(false)
const deploymentProgress = ref(0)
const currentDeployingModel = ref('')
const modelsNotExits = ref([])
// 环境检测状态
const ollamaInstalled = ref(null)
const pythonInstalled = ref(null)
const attemptedStart = ref(false)

// --- 系统必要模型检测状态 ---
const nomicInstalled = ref(null)
const rwkvInstalled = ref(null)
const attemptedNomic = ref(false)
const attemptedRwkv = ref(false)

// --- 拖拽模型选择 ---
const installedModels = ref([])                // ['modelA', 'modelB', …]
const expertSlots = reactive({                // 每个槽位可存一个或多个模型
  coder: [],
  chatter: [],
  officer: []
})
const expertKeys = ['coder', 'chatter', 'officer']
const slotLabels = {
  coder: '代码专家',
  chatter: '话术专家',
  officer: '总结官'
}
const dragOverSlot = ref(null)


// 表单校验以及配置数据
const valid = ref(true)
const config = reactive({
  custom: {},
  ollama: {},
  expertSlots: {}   // 用于保存拖拽结果
})
const expandedPanels = ref([])

// 离线状态信息（可按需扩展）
const offlineStatus = reactive({
  checking: false,
  downloading: false,
  progress: 0,
  message: ''
})

// 离线模型标签
const ollamaLabels = {
  coder: { label: '代码专家模型', isModel: true },
  chatter: { label: '话术专家模型', isModel: true },
  officer: { label: '总结官模型', isModel: true },
  max_prompts: { label: '最大提示词数', isModel: false },
  max_file_num: { label: '最多读取代码文件', isModel: false }
}

// 云端模型标签
const customLabels = {
  coder: { label: '代码专家模型', isModel: true },
  chatter: { label: '话术专家模型', isModel: true },
  officer: { label: '总结官模型', isModel: true },
  max_prompts: { label: '最大提示词数', isModel: false },
  type: { label: '模型厂商', isModel: false },
  enabled: { label: '是否启用(关闭则默认使用本地模型)', isModel: false },
  url: { label: '地址', isModel: false },
  api: { label: 'ApiKey', isModel: false },
  model: { label: '模型', isModel: false },
  max_file_num: { label: '最多读取代码文件', isModel: false }
}

const onDragStart = (model) => {
  // 将整个对象序列化带到 drop 回调
  event.dataTransfer.setData('application/json', JSON.stringify(model))
}

const onDrop = (slot) => {
  dragOverSlot.value = null
  const model = JSON.parse(event.dataTransfer.getData('application/json'))
  // 直接替换该槽位的数组，保证只有一个元素
  expertSlots[slot] = [model]
}


// 重试检测 Ollama
const retryOllama = async () => {
  attemptedStart.value = true
  await checkOllama()
}

// 重试检测 nomic-embed-text
const retryNomic = async () => {
  attemptedNomic.value = true
  await checkNomic()
}

// 重试检测 rwkv-7
const retryRwkv = async () => {
  attemptedRwkv.value = true
  await checkRwkv()
}


// 检测 Python
const checkPython = async () => {
  try {
    const result = await window.electron.checkPythonIPC()
    pythonInstalled.value = result
  } catch (e) {
    console.error(e)
    pythonInstalled.value = false
  }
}

// 打开 Python 官网
const openPythonWebsite = () => window.open('https://python.org', '_blank')

// 辅助方法：获取 ollama 标签文本
const checkOllamaLabel = (key) => {
  try {
    return ollamaLabels[key].label
  } catch (e) {
    console.error(e)
    return key
  }
}

// 辅助方法：获取云端模型标签文本
const checkCustomLabel = (key) => {
  try {
    return customLabels[key].label
    // eslint-disable-next-line no-unused-vars
  } catch (e) {
    return key
  }
}

// 非线性动画方法，默认2000ms（采用 easeOutQuad 算法）
const animateProgress = (duration = 2000) => {
  return new Promise((resolve) => {
    deploymentProgress.value = 0
    deploymentInProgress.value = true
    const startTime = performance.now()
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const t = Math.min(elapsed / duration, 1)
      const progress = 100 * (1 - Math.pow(1 - t, 2))
      deploymentProgress.value = Math.floor(progress)
      if (t < 1) {
        requestAnimationFrame(animate)
      } else {
        deploymentInProgress.value = false
        resolve()
      }
    }
    requestAnimationFrame(animate)
  })
}

// 下一步：步骤1到2时，检测模型部署；步骤2时若全部部署，进入步骤3
const nextStep = () => {
  if (deploymentStep.value === 1) {
    deploymentStep.value = 2
    checkModelsDeployment()
  } else if (deploymentStep.value === 2 && modelsDeployed.value) {
    animateProgress(2000).then(() => {
      deploymentStep.value = 3
      offlineStatus.message = '离线智能部署已完成。'
    })
  }
}

// 检测模型部署情况
const checkModelsDeployment = async () => {
  const modelsList = []
  if (config.ollama) {
    for (const key in ollamaLabels) {
      if (ollamaLabels[key].isModel && config.ollama[key]) {
        modelsList.push(config.ollama[key])
      }
    }
  }
  try {
    const result = await window.electron.checkModelDeployment(modelsList)
    modelsDeployed.value = result
    if (result) {
      offlineStatus.message = '所有模型均已部署。'
    } else {
      modelsNotExits.value = modelsList
    }
  } catch (error) {
    console.error('检查模型部署状态失败：', error)
    modelsDeployed.value = false
  }
}

// 开始部署：调用 IPC 接口安装模型并监听进度事件
const startDeployment = async () => {
  deploymentStep.value = 3
  const modelsList = []
  if (config.ollama) {
    for (const key in ollamaLabels) {
      if (ollamaLabels[key].isModel && config.ollama[key]) {
        modelsList.push(config.ollama[key])
      }
    }
  }
  deploymentInProgress.value = true
  // 监听安装进度
  await window.electron.onInstallProgress((data) => {
    deploymentProgress.value = data.progress
    currentDeployingModel.value = data.model
  })
  try {
    await window.electron.installModels(modelsList)
    await animateProgress(2000)
    deploymentInProgress.value = false
    deploymentStep.value = 3
    offlineStatus.message = '离线智能部署已完成。'
    await window.electron.clearInstallProgressListeners()
  } catch (error) {
    console.error('安装模型失败：', error)
    deploymentInProgress.value = false
  }
}

// 获取远端配置并初始化
const fetchConfig = async () => {
  try {
    const resp = await getConfig()
    Object.assign(config, resp.data)
    // 如果已有专家插槽配置，载入到 reactive
    if (resp.data.expertSlots) {
      Object.assign(expertSlots, resp.data.expertSlots)
    }
  } catch (error) {
    console.error('获取配置失败：', error)
  }
}
// 同步 expertSlots 到 config.ollama
function syncExpertToOllama() {
  for (const slot of expertKeys) {
    // 如果数组非空，取第一个对象的 name，否则置空字符串
    config.ollama[slot] = expertSlots[slot][0]?.name || ''
  }
}

// 保存模型配置
const saveModelConfig = async () => {
  try {
    syncExpertToOllama()
    config.expertSlots = { ...expertSlots }
    await updateConfig(config)
    alert('模型配置已保存！')
  } catch (error) {
    console.error('保存模型配置失败：', error)
  }
}

// 检查 ollama 状态（调用 Electron IPC 接口）
const checkOllama = async () => {
  try {
    const result = await window.electron.checkOllamaIPC()
    ollamaInstalled.value = result
  } catch (error) {
    console.error('检查ollama状态失败：', error)
    ollamaInstalled.value = false
  }
}

// 打开 ollama 官网
const openOllamaWebsite = () => {
  window.open('https://ollama.com', '_blank')
}

// 处理 hash 导航（展开对应面板并滚动到面板标题）
const handleHashNavigation = () => {
  const hash = window.location.hash.slice(1).toLowerCase()
  if (hash.includes('离线') || hash.includes('offline')) {
    expandedPanels.value = [0]
    setTimeout(() => {
      const el = document.getElementById('offline-panel-header')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, 0)
  } else if (hash.includes('云端') || hash.includes('cloud')) {
    expandedPanels.value = [1]
    setTimeout(() => {
      const el = document.getElementById('cloud-panel-header')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, 0)
  }
}

// 检测 nomic-embed-text
const checkNomic = async () => {
  try {
    const ok = await window.electron.checkModelInstalled('nomic-embed-text:latest')
    console.log('nomic-embed-text installed', ok);
    nomicInstalled.value = ok
  } catch {
    nomicInstalled.value = false
  }
}

// 检测 rwkv-7
const checkRwkv = async () => {
  try {
    const ok = await window.electron.checkModelInstalled('mollysama/rwkv-7-world:1.5b')
    rwkvInstalled.value = ok
  } catch {
    rwkvInstalled.value = false
  }
}

// 获取所有已安装模型列表（调用 Ollama CLI）
const fetchInstalledModels = async () => {
  try {
    const models = await window.electron.listModels()
    console.log('installedModels raw:', models);
    // 如果返回的 model 对象里已经包含 name、size、modified，就直接用：
    installedModels.value = models.map(m => ({
      id:   m.id ?? m.NAME ?? m.name,    // 唯一 key
      name: m.name ?? m.NAME ?? '',
      size: m.size || '未知大小',
      modified: m.modified || '未知时间'
    }))
  } catch (error) {
    console.error('获取模型列表失败：', error)
    installedModels.value = []
  }
}


// 一键安装所有未安装的必要模型
const installNecessaryModels = async () => {
  // 把未安装的模型名称收集进数组
  const toInstall = [];
  if (!nomicInstalled.value)  toInstall.push('nomic-embed-text:latest');
  if (!rwkvInstalled.value)   toInstall.push('mollysama/rwkv-7-world:1.5b');
  if (!toInstall.length) {
    // 全部已安装
    return;
  }

  try {
    // 监听安装进度（可选，用于打印或更新进度条）
    await window.electron.onInstallProgress((data) => {
      console.log(`Installing ${data.model}: ${data.progress}%`);
    });
    // 调用 Electron IPC 安装模型
    await window.electron.installModels(toInstall);
    // 安装成功后，把对应的状态置为 true
    if (toInstall.includes('nomic-embed-text:latest')) nomicInstalled.value = true;
    if (toInstall.includes('mollysama/rwkv-7-world:1.5b')) rwkvInstalled.value = true;
    console.log('一键安装完成');
  } catch (error) {
    console.error('一键安装失败：', error);
  } finally {
    // 清理监听器（如果你的 IPC 暴露了此方法）
    if (window.electron.clearInstallProgressListeners) {
      await window.electron.clearInstallProgressListeners();
    }
  }
};

// 根据 config.ollama 把 expertSlots 预先填充
function initExpertSlotsFromConfig() {
  expertKeys.forEach(slot => {
    const modelName = config.ollama[slot]
    if (modelName) {
      // 尝试从 installedModels 里找出完整对象
      const matched = installedModels.value.find(m => m.name === modelName)
      if (matched) {
        expertSlots[slot] = [ matched ]
      } else {
        // 如果没找到，就至少填 name，保证能显示
        expertSlots[slot] = [{ id: modelName, name: modelName, size: '', modified: '' }]
      }
    } else {
      expertSlots[slot] = []
    }
  })
}


onMounted(async () => {
  await fetchConfig()
  await Promise.all([
    checkOllama(),
    checkPython(),
    checkNomic(),
    checkRwkv(),
    fetchInstalledModels()
  ])
  initExpertSlotsFromConfig()
  handleHashNavigation()
})
</script>

<style scoped>
.drag-over {
  border: 1px dashed #1976D2;
  background-color: rgba(25, 118, 210, 0.05);
  transition: background-color 0.2s;
}
.model-list {
  /* 你可以根据实际需要自行调整 */
  width: 300px;
  height: 400px;

  /* 支持在这个框里上下滚动 */
  overflow-y: auto;

  /* chip 自动按行换行，排列紧凑 */
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start; /* 保证顶部对齐 */
  padding: 8px;
  background-color: #fafafa;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 1px;
}
.exp-list {
  position: relative; /* 容器变相对定位 */
  /* 你可以根据实际需要自行调整 */
  width: 1000px;

  /* 支持在这个框里上下滚动 */
  overflow-y: auto;

  /* chip 自动按行换行，排列紧凑 */
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start; /* 保证顶部对齐 */
  padding: 8px;
  background-color: #fafafa;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 1px;
}
.exp-list-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 32px;            /* 根据需要再调大 */
  color: rgba(0, 0, 0, 0.2);  /* 浅灰半透明 */
  pointer-events: none;       /* 不阻挡拖拽事件 */
  z-index: 1;                 /* 在插槽卡片之下或之上按需调 */
}
.chip-item {
  cursor: grab;
}
.chip-item:active {
  cursor: grabbing;
}
/* 专家槽内的 chip 支持完整回显文字 */
.expert-chip {
  /* 允许多行换行 */
  white-space: normal !important;
  word-break: break-word;

  /* 父容器跟随内容高度 */
  display: inline-flex !important;
  align-items: flex-start !important;
  padding: 4px 8px !important;

  /* 覆盖默认的固定高度 */
  height: auto !important;
  min-height: auto !important;
  line-height: 1.2 !important;
}

/* 如果 Vuetify 内部还有固定高度在 v-chip__content 上，也一起覆盖 */
.expert-chip .v-chip__content {
  white-space: normal;
  word-break: break-word;
  /* 确保内容块也能撑高 */
  height: auto;
  line-height: 1.2;
}

</style>
