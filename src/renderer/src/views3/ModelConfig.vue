<template>
  <v-container>
    <!-- 环境检测模块 -->
    <v-card class="pa-4 mb-4" outlined>
      <v-card-title class="headline">本地环境检查</v-card-title>
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
              <span class="ml-1">OLLAMA 已安装且运行中</span>
            </template>
            <template v-else>
              <v-icon color="red" small>mdi-close-circle</v-icon>
              <span class="ml-1">OLLAMA 未安装或未运行</span>
              <template v-if="!attemptedStart">
                <v-btn text small color="primary" @click="retryOllama">一键启动</v-btn>
              </template>
              <template v-else>
                <v-btn text small color="primary" @click="openOllamaWebsite">前往官网下载</v-btn>
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
              <v-btn text small color="primary" @click="openPythonWebsite">前往官网下载</v-btn>
            </template>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- 本地模型安装状态 -->
    <v-card class="pa-4 mb-4" outlined>
      <v-card-title class="headline">必要本地模型安装状态</v-card-title>
      <v-card-text>
        <v-row>
          <!-- nomic-embed-text -->
          <v-col cols="12" md="6" class="d-flex align-center">
            <div>
              <div class="font-weight-medium">nomic-embed-text</div>
              <div class="text--secondary text-caption">构建代码知识库与智能索引</div>
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
              <v-btn text small color="primary" class="ml-2" @click="retryNomic">重试检测</v-btn>
            </template>
          </v-col>

          <!-- rwkv-7 -->
          <v-col cols="12" md="6" class="d-flex align-center">
            <div>
              <div class="font-weight-medium">rwkv-7</div>
              <div class="text--secondary text-caption">意图识别与快速摘要</div>
            </div>
            <template v-if="rwkvInstalled === null">
              <span class="ml-2">检测中...</span>
            </template>
            <template v-else-if="rwkvInstalled">
              <v-icon color="green" small class="ml-2">mdi-check-circle</v-icon>
              <span class="ml-1">已安装</span>
            </template>
            <template v-else>
              <v-icon color="red" small class="ml-2">mdi-close-circle</v-icon>
              <span class="ml-1">未安装</span>
              <v-btn text small color="primary" class="ml-2" @click="retryRwkv">重试检测</v-btn>
            </template>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions v-if="!(nomicInstalled && rwkvInstalled)">
        <v-spacer />
        <v-btn color="primary" @click="installNecessaryModels">一键安装缺失模型</v-btn>
      </v-card-actions>
    </v-card>

    <!-- 已安装模型 & 角色分配 -->
    <v-card class="pa-4 mb-4" outlined>
      <v-card-title class="headline">已安装模型列表 & 角色分配</v-card-title>
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
                        <v-chip v-bind="props" class="ma-1" outlined>{{ element.name }}</v-chip>
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
            <div class="exp-list-placeholder">拖拽模型至这里的角色</div>
            <v-row>
              <v-col cols="12" sm="4" v-for="slot in expertKeys" :key="slot" class="d-flex">
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
                      <span v-if="dragOverSlot === slot" class="font-weight-bold">释放至此</span>
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

    <!-- 自定义模型配置 -->
    <v-card class="pa-4" outlined>
      <v-card-title class="headline">自定义模型配置</v-card-title>
      <v-card-text>
        <v-form ref="form" v-model="valid">
          <v-expansion-panels v-model="expandedPanels" multiple variant="popout">
            <!-- 本地模型配置 -->
            <v-expansion-panel>
              <v-expansion-panel-title id="offline-panel-header">📴 本地模型参数</v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-row>
                  <v-col
                    v-for="(value, key) in config.ollama"
                    :key="key"
                    cols="12"
                    md="6"
                  >
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
                </v-row>
                <v-card class="pa-4 mt-4" outlined>
                  <v-card-title class="subtitle-1">部署向导</v-card-title>
                  <v-card-text>
                    <v-stepper v-model="deploymentStep">
                      <v-stepper-header>
                        <v-stepper-item value="1" :complete="deploymentStep>1">检查 Ollama</v-stepper-item>
                        <v-divider class="mx-2"></v-divider>
                        <v-stepper-item value="2" :complete="deploymentStep>2">检查模型</v-stepper-item>
                        <v-divider class="mx-2"></v-divider>
                        <v-stepper-item value="3">自动部署</v-stepper-item>
                      </v-stepper-header>
                      <v-container>
                        <!-- 步骤1 -->
                        <div v-if="deploymentStep===1">
                          <div v-if="ollamaInstalled===null">检测中...</div>
                          <div v-else-if="ollamaInstalled">已安装且运行中。</div>
                          <div v-else>未检测到 Ollama。</div>
                          <v-btn
                            v-if="ollamaInstalled"
                            color="primary"
                            class="mt-3"
                            @click="nextStep"
                          >下一步</v-btn>
                          <v-btn
                            v-else
                            color="error"
                            class="mt-3"
                            @click="openOllamaWebsite"
                          >前往安装</v-btn>
                        </div>
                        <!-- 步骤2 -->
                        <div v-if="deploymentStep===2">
                          <div v-if="modelsDeployed===null">检查模型部署...</div>
                          <div v-else-if="modelsDeployed">模型已部署。</div>
                          <div v-else>部分模型缺失：{{ modelsNotExits.join(', ') }}</div>
                          <v-btn
                            v-if="modelsDeployed"
                            color="primary"
                            class="mt-3"
                            @click="nextStep"
                          >下一步</v-btn>
                          <v-btn
                            v-else
                            color="primary"
                            class="mt-3"
                            @click="startDeployment"
                          >开始部署</v-btn>
                        </div>
                        <!-- 步骤3 -->
                        <div v-if="deploymentStep===3">
                          <div v-if="deploymentInProgress">
                            部署中：{{ currentDeployingModel }}
                            <v-progress-linear
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
                ☁️ 远程模型参数
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
                        <v-col
                          v-for="(val, key) in modelCfg"
                          :key="key"
                          cols="12"
                          md="6"
                        >
                          <!-- 布尔字段：启用云端模型 -->
                          <template v-if="key === 'enabled'">
                            <v-switch
                              v-model="config.custom[slot].enabled"
                              :label="getCustomLabel('enabled')"
                            />
                          </template>

                          <!-- 数值字段：最大上下文长度 & 最大文件读取数量 -->
                          <template v-else-if="['max_prompts','max_file_num'].includes(key)">
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

          </v-expansion-panels>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="resetConfig">重置</v-btn>
        <v-btn color="primary" @click="saveModelConfig">保存自定义配置</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getConfig, updateConfig } from '../service/api.js'
import draggable from 'vuedraggable'

// —— 环境检测状态 ——
const ollamaInstalled = ref(null)
const pythonInstalled = ref(null)
const attemptedStart = ref(false)
const nomicInstalled = ref(null)
const rwkvInstalled = ref(null)

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
const config = reactive({ ollama: {}, custom: {}, expertSlots: {} })
const expandedPanels = ref([])

// —— 部署向导 ——
const deploymentStep = ref(1)
const modelsDeployed = ref(null)
const deploymentInProgress = ref(false)
const deploymentProgress = ref(0)
const currentDeployingModel = ref('')
const modelsNotExits = ref([])

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

// —— 拖拽处理 ——
const onDragStart = model => {
  event.dataTransfer.setData('application/json', JSON.stringify(model))
}
const onDrop = slot => {
  dragOverSlot.value = null
  const model = JSON.parse(event.dataTransfer.getData('application/json'))
  expertSlots[slot] = [model]
}

// —— 环境检测 ——
const checkOllama = async () => {
  try { ollamaInstalled.value = await window.electron.checkOllamaIPC() }
  catch { ollamaInstalled.value = false }
}
const retryOllama = async () => { attemptedStart.value = true; await checkOllama() }
const openOllamaWebsite = () => window.open('https://ollama.com','_blank')

const checkPython = async () => {
  try { pythonInstalled.value = await window.electron.checkPythonIPC() }
  catch { pythonInstalled.value = false }
}
const openPythonWebsite = () => window.open('https://python.org','_blank')

const checkNomic = async () => {
  try { nomicInstalled.value = await window.electron.checkModelInstalled('nomic-embed-text:latest') }
  catch { nomicInstalled.value = false }
}
const retryNomic = async () => { await checkNomic() }

const checkRwkv = async () => {
  try { rwkvInstalled.value = await window.electron.checkModelInstalled('mollysama/rwkv-7-world:1.5b') }
  catch { rwkvInstalled.value = false }
}
const retryRwkv = async () => { await checkRwkv() }

const installNecessaryModels = async () => {
  const toInstall = []
  if (!nomicInstalled.value) toInstall.push('nomic-embed-text:latest')
  if (!rwkvInstalled.value)  toInstall.push('mollysama/rwkv-7-world:1.5b')
  if (!toInstall.length) return
  try {
    await window.electron.onInstallProgress(data => console.log(data))
    await window.electron.installModels(toInstall)
    toInstall.includes('nomic-embed-text:latest') && (nomicInstalled.value = true)
    toInstall.includes('mollysama/rwkv-7-world:1.5b') && (rwkvInstalled.value = true)
  } catch (e) { console.error(e) }
  finally { window.electron.clearInstallProgressListeners?.() }
}

// —— 部署向导方法 ——
const animateProgress = duration => new Promise(resolve => {
  deploymentProgress.value = 0
  deploymentInProgress.value = true
  const start = performance.now()
  const step = now => {
    const t = Math.min((now - start) / duration, 1)
    deploymentProgress.value = Math.floor(100 * (1 - (1 - t)**2))
    if (t < 1) requestAnimationFrame(step)
    else { deploymentInProgress.value = false; resolve() }
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
  } catch { modelsDeployed.value = false }
}

const startDeployment = async () => {
  deploymentStep.value = 3
  const list = []
  for (const k in ollamaLabels) {
    if (ollamaLabels[k].isModel && config.ollama[k]) list.push(config.ollama[k])
  }
  deploymentInProgress.value = true
  await window.electron.onInstallProgress(data => {
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
  } catch (e) { console.error(e) }
}

const initExpertSlotsFromConfig = () => {
  expertKeys.forEach(slot => {
    const name = config.ollama[slot]
    if (name) {
      const found = installedModels.value.find(m => m.name === name)
      expertSlots[slot] = found ? [found] : [{ id: name, name, size: '', modified: '' }]
    }
  })
}

const saveModelConfig = async () => {
  // 同步 expertSlots 到 config
  expertKeys.forEach(slot => {
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
const getOllamaLabel = key => ollamaLabels[key]?.label || key
const getCustomLabel = key => customLabels[key]?.label || key

// —— 已装模型列表 ——
const fetchInstalledModels = async () => {
  try {
    const ms = await window.electron.listModels()
    installedModels.value = ms.map(m => ({
      id: m.id || m.NAME || m.name,
      name: m.name || m.NAME || '',
      size: m.size || '未知',
      modified: m.modified || '未知'
    }))
  } catch {
    installedModels.value = []
  }
}

// 重置：重新从后端拉取配置并恢复拖拽槽位
const resetConfig = async () => {
  try {
    await fetchConfig()
    initExpertSlotsFromConfig()
    expandedPanels.value = []  // 可选：收起所有面板
  } catch (e) {
    console.error('重置配置失败：', e)
  }
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
})
</script>

<style scoped>
.drag-over {
  border: 1px dashed #1976D2;
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
  background-color: #fafafa;
  border: 1px solid rgba(0,0,0,0.1);
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
  background-color: #fafafa;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 4px;
}
.exp-list-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 24px;
  color: rgba(0,0,0,0.2);
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
</style>
