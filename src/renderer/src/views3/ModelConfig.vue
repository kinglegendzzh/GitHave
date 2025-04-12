<template>
  <v-container>
    <v-card class="pa-4" outlined>
      <v-card-text>
        <v-form ref="form" v-model="valid">
          <v-expansion-panels v-model="expandedPanels" multiple variant="popout">
            <!-- 离线智能 -->
            <v-expansion-panel>
              <v-expansion-panel-title id="offline-panel-header">📴 离线智能</v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-row>
                  <v-col v-for="(value, key) in config.ollama" :key="key" cols="12" md="6">
                    <v-text-field
                      :label="checkOllamaLabel(key)"
                      v-model="config.ollama[key]"
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
                          <div v-if="ollamaInstalled === null">
                            正在检测 ollama 状态...
                          </div>
                          <div v-else-if="ollamaInstalled">
                            ollama 已安装且正在运行。
                          </div>
                          <div v-else>
                            ollama 未安装。请点击下面按钮进入官网下载安装。
                          </div>
                          <v-btn
                            v-if="ollamaInstalled || ollamaInstalled === null"
                            color="primary"
                            class="mt-2"
                            @click="nextStep"
                          >
                            下一步
                          </v-btn>
                          <v-btn
                            v-else
                            color="error"
                            class="mt-2"
                            @click="openOllamaWebsite"
                          >
                            前往 ollama 官网
                          </v-btn>
                        </div>
                        <!-- 步骤 2 内容 -->
                        <div v-if="deploymentStep === 2">
                          <div v-if="modelsDeployed === null">
                            检查所需模型部署情况
                          </div>
                          <div v-else-if="modelsDeployed">
                            所需模型已全部部署。
                          </div>
                          <div v-else>
                            检测到部分模型未部署，请点击“开始部署”自动安装。<span>{{ modelsNotExits }}</span>
                          </div>
                          <v-btn
                            v-if="modelsDeployed"
                            color="success"
                            class="mt-2"
                            @click="nextStep"
                          >
                            完成
                          </v-btn>
                          <v-btn
                            v-else
                            color="primary"
                            class="mt-2"
                            @click="startDeployment"
                          >
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
                          <div v-else>
                            已部署完成。
                          </div>
                        </div>
                      </v-container>
                    </v-stepper>
                  </v-card-text>
                </v-card>
              </v-expansion-panel-text>
            </v-expansion-panel>
            <!-- 云端智能 -->
            <v-expansion-panel>
              <v-expansion-panel-title id="cloud-panel-header">☁️ 云端智能</v-expansion-panel-title>
              <v-expansion-panel-text>
                <div v-for="(modelConfig, modelKey) in config.custom" :key="modelKey">
                  <v-card flat class="mb-4 pa-2">
                    <v-card-title class="subtitle-1">{{ checkCustomLabel(modelKey) }}</v-card-title>
                    <v-card-text>
                      <v-row>
                        <v-col v-for="(value, key) in modelConfig" :key="key" cols="12" md="6">
                          <v-text-field
                            :label="checkCustomLabel(key)"
                            v-model="config.custom[modelKey][key]"
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
import { ref, reactive, onMounted } from 'vue'
import { getConfig, updateConfig } from '../service/api.js'

// 离线部署相关状态
const deploymentStep = ref(1)         // 当前步骤 1-检查 ollama；2-检查模型部署；3-自动部署
const ollamaInstalled = ref(null)       // 未检测：null，检测结果 true/false
const modelsDeployed = ref(null)        // 未检测：null，检测结果 true/false
const deploymentInProgress = ref(false)
const deploymentProgress = ref(0)
const currentDeployingModel = ref('')
const modelsNotExits = ref([])

// 表单校验以及配置数据
const valid = ref(true)
const config = reactive({
  custom: {},
  ollama: {}
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
  coder: { label: "代码专家模型", isModel: true },
  chatter: { label: "话术专家模型", isModel: true },
  officer: { label: "总结官模型", isModel: true },
  max_prompts: { label: "最大提示词数", isModel: false },
}

// 云端模型标签
const customLabels = {
  coder: { label: "代码专家模型", isModel: true },
  chatter: { label: "话术专家模型", isModel: true },
  officer: { label: "总结官模型", isModel: true },
  max_prompts: { label: "最大提示词数", isModel: false },
  type: { label: "模型厂商", isModel: false },
  enabled: { label: "是否启用(关闭则默认使用本地模型)", isModel: false },
  url: { label: "地址", isModel: false },
  api: { label: "ApiKey", isModel: false },
  model: { label: "模型", isModel: false },
}

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
  } catch (e) {
    return key
  }
}

// 非线性动画方法，默认2000ms（采用 easeOutQuad 算法）
const animateProgress = (duration = 2000) => {
  return new Promise(resolve => {
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

// 获取配置数据，并合并到 reactive 对象 config 中
const fetchConfig = async () => {
  try {
    const response = await getConfig()
    Object.assign(config, response.data)
  } catch (error) {
    console.error('获取配置失败：', error)
  }
}

// 保存模型配置
const saveModelConfig = async () => {
  try {
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

onMounted(async () => {
  await fetchConfig()
  checkOllama()
  handleHashNavigation()
})
</script>

<style scoped>
/* 可根据需要自定义样式 */
</style>
