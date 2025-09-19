<template>
  <!-- 剪切板导入确认对话框 -->
  <v-dialog v-model="clipboardImportDialog" max-width="500px" persistent>
    <v-card>
      <v-card-title class="text-h6">
        <v-icon left color="primary">mdi-clipboard-text</v-icon>
        检测到 GitHub 仓库链接
      </v-card-title>
      <v-card-text>
        <div class="mb-4">
          <p class="text-body-1 mb-2">检测到您复制了以下 GitHub 仓库链接：</p>
          <v-chip
            color="primary"
            variant="outlined"
            class="mb-3"
            style="word-break: break-all; height: auto; white-space: normal"
          >
            {{ clipboardRepoUrl }}
          </v-chip>
        </div>
        <div class="mb-3">
          <p class="text-body-1 mb-2"><strong>仓库名称：</strong>{{ clipboardRepoName }}</p>

          <!-- 目录选择选项 -->
          <div class="mb-3">
            <v-radio-group v-model="importMode" inline>
              <v-radio label="快速导入（默认目录）" value="quick"></v-radio>
              <v-radio label="自定义目录" value="custom"></v-radio>
            </v-radio-group>
          </div>

          <!-- 默认路径显示 -->
          <div v-if="importMode === 'quick'" class="mb-2">
            <p class="text-body-2 text-grey-600">
              <strong>本地路径：</strong> {{ getDefaultPathDisplay() }}/githave/{{
                clipboardRepoName
              }}
            </p>
          </div>

          <!-- 自定义目录选择 -->
          <div v-if="importMode === 'custom'" class="mb-2">
            <v-text-field
              v-model="customPath"
              label="选择保存目录"
              readonly
              variant="outlined"
              density="compact"
              append-inner-icon="mdi-folder-open"
              placeholder="点击选择目录"
              @click:append-inner="selectDirectory"
              @click="selectDirectory"
            ></v-text-field>
            <p v-if="customPath" class="text-body-2 text-grey-600 mt-1">
              <strong>完整路径：</strong> {{ customPath }}/{{ clipboardRepoName }}
            </p>
          </div>
        </div>

        <v-alert type="info" variant="tonal" density="compact" class="mb-3">
          是否要导入此仓库？导入后将自动克隆到{{ importMode === 'quick' ? '默认' : '指定' }}路径。
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="grey"
          variant="text"
          size="small"
          class="text-caption"
          @click="cancelClipboardImport"
        >
          取消
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          size="small"
          class="text-caption"
          @click="confirmClipboardImport"
        >
          确认导入
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 进度条对话框 -->
  <v-dialog v-model="progressDialog" max-width="450px" persistent>
    <v-card>
      <v-card-title class="text-h6">
        <v-icon left color="primary">mdi-download</v-icon>
        正在导入仓库
      </v-card-title>
      <v-card-text>
        <div class="text-center mb-3">
          <p class="text-body-1 mb-2">{{ progressText }}</p>
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
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="grey"
          variant="text"
          size="small"
          class="text-caption"
          @click="hideProgressDialog"
        >
          <v-icon left size="small">mdi-eye-off</v-icon>
          隐藏并后台运行
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Snackbar 提示 -->
  <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" top>
    {{ snackbar.text }}
    <template #action="{ attrs }">
      <v-btn color="white" text v-bind="attrs" @click="snackbar.show = false"> 关闭 </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { createRepo } from '../service/api'

/* ───── 路由 ───── */
const router = useRouter()

/* ───── 剪切板监听导入 ───── */
const clipboardImportDialog = ref(false)
const clipboardRepoUrl = ref('')
const clipboardRepoName = ref('')
const lastClipboardContent = ref('')
const clipboardCheckInterval = ref(null)

/* ───── 导入模式和路径选择 ───── */
const importMode = ref('quick') // 'quick' 或 'custom'
const customPath = ref('')

// localStorage 键名
const CANCELLED_URLS_KEY = 'githave_cancelled_clipboard_urls'

/* ───── 进度条 ───── */
const progressDialog = ref(false)
const progressValue = ref(0)
const progressText = ref('准备开始...')
const progressInterval = ref(null)

/* ───── Snackbar ───── */
const snackbar = reactive({
  show: false,
  text: '',
  color: 'success'
})

/* ───── 网络速度监控 ───── */
const networkSpeed = reactive({
  show: false,
  downloadSpeed: 0,
  uploadSpeed: 0,
  downloadSpeedFormatted: '0 B/s',
  uploadSpeedFormatted: '0 B/s',
  interface: ''
})

// 获取默认路径显示文本
const getDefaultPathDisplay = () => {
  if (window.electron.platform === 'win32') {
    return '你的文档目录'
  } else {
    return '你的用户根目录'
  }
}

// 检测是否为GitHub链接
const isGitHubUrl = (text) => {
  if (!text || typeof text !== 'string') return false
  const githubPattern = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?(?:\/)?$/i
  return githubPattern.test(text.trim())
}

// 从GitHub URL提取仓库名
const extractRepoNameFromGitHubUrl = (url) => {
  if (!url) return 'unknown'
  const match = url.match(/github\.com\/[\w.-]+\/([\w.-]+)(?:\.git)?(?:\/)?$/i)
  return match ? match[1].replace(/\.git$/, '') : 'unknown'
}

// 获取已取消的URL列表
const getCancelledUrls = () => {
  try {
    const stored = localStorage.getItem(CANCELLED_URLS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.debug('读取已取消URL列表失败:', error)
    return []
  }
}

// 添加URL到已取消列表
const addCancelledUrl = (url) => {
  try {
    const cancelledUrls = getCancelledUrls()
    if (!cancelledUrls.includes(url)) {
      cancelledUrls.push(url)
      // 只保留最近的1个URL，避免localStorage过大
      if (cancelledUrls.length > 1) {
        cancelledUrls.splice(0, cancelledUrls.length - 1)
      }
      localStorage.setItem(CANCELLED_URLS_KEY, JSON.stringify(cancelledUrls))
    }
  } catch (error) {
    console.debug('保存已取消URL失败:', error)
  }
}

// 检查URL是否已被取消过
const isUrlCancelled = (url) => {
  const cancelledUrls = getCancelledUrls()
  return cancelledUrls.includes(url)
}

// 检查剪切板内容
const checkClipboard = async () => {
  try {
    const onboardingCompleted = localStorage.getItem('onboarding_completed')
    if (!onboardingCompleted) return
    const clipboardText = await navigator.clipboard.readText()
    if (clipboardText && clipboardText !== lastClipboardContent.value) {
      // 剪切板内容发生变化
      console.debug('剪切板内容发生变化:', clipboardText)
      lastClipboardContent.value = clipboardText

      if (isGitHubUrl(clipboardText)) {
        const trimmedUrl = clipboardText.trim()
        // 检查该URL是否已被取消过
        if (!isUrlCancelled(trimmedUrl)) {
          // 检查该URL是否已经导入过
          try {
            // const response = await listRepos()
            // if (response.status === 200) {
            //   const existingRepo = response.data.find(repo => repo.repo_url === trimmedUrl)
            //   if (existingRepo) {
            //     console.debug('仓库已存在，跳过检测:', trimmedUrl)
            //     return
            //   }
            // }
          } catch (error) {
            console.debug('获取仓库列表失败:', error)
            // 如果获取仓库列表失败，继续显示导入对话框
          }

          clipboardRepoUrl.value = trimmedUrl
          clipboardRepoName.value = extractRepoNameFromGitHubUrl(clipboardText)
          clipboardImportDialog.value = true
        }
      }
    }
  } catch (error) {
    // 忽略剪切板访问错误（可能是权限问题）
    console.debug('剪切板访问失败:', error)
  }
}

// 启动剪切板监听
const startClipboardMonitoring = () => {
  // 如果已经有定时器在运行，先清理
  if (clipboardCheckInterval.value) {
    clearInterval(clipboardCheckInterval.value)
  }
  // 每2秒检查一次剪切板
  clipboardCheckInterval.value = setInterval(checkClipboard, 2000)
  console.log('剪切板监听已启动')

  // 将定时器ID存储到全局，用于状态检查
  window.githaveClipboardInterval = clipboardCheckInterval.value
}

// 停止剪切板监听
const stopClipboardMonitoring = () => {
  if (clipboardCheckInterval.value) {
    clearInterval(clipboardCheckInterval.value)
    clipboardCheckInterval.value = null
    console.log('剪切板监听已停止')
  }
  // 清理全局引用
  if (window.githaveClipboardInterval) {
    clearInterval(window.githaveClipboardInterval)
    window.githaveClipboardInterval = null
  }
}

// 启动网络监控
const startNetworkMonitoring = async () => {
  try {
    // 启动网络监控
    await window.electron.startNetworkMonitor()

    // 显示网络速度区域
    networkSpeed.show = true

    // 监听网络速度更新
    window.electron.onNetworkSpeedUpdate((data) => {
      networkSpeed.downloadSpeed = data.downloadSpeed
      networkSpeed.uploadSpeed = data.uploadSpeed
      networkSpeed.downloadSpeedFormatted = data.downloadSpeedFormatted
      networkSpeed.uploadSpeedFormatted = data.uploadSpeedFormatted
      networkSpeed.interface = data.interface
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
    networkSpeed.show = false
    // 重置网络速度数据
    networkSpeed.downloadSpeed = 0
    networkSpeed.uploadSpeed = 0
    networkSpeed.downloadSpeedFormatted = '0 B/s'
    networkSpeed.uploadSpeedFormatted = '0 B/s'
    networkSpeed.interface = ''
  } catch (error) {
    console.error('停止网络监控失败:', error)
  }
}

// 启动进度模拟
const startProgressSimulation = async () => {
  progressDialog.value = true
  progressValue.value = 0
  progressText.value = '正在克隆仓库...'

  // 启动网络监控
  await startNetworkMonitoring()

  // 清理之前的定时器
  if (progressInterval.value) {
    clearInterval(progressInterval.value)
  }

  progressInterval.value = setInterval(() => {
    if (progressValue.value < 90) {
      progressValue.value += Math.random() * 10
      if (progressValue.value > 30 && progressValue.value < 60) {
        progressText.value = '正在下载文件...'
      } else if (progressValue.value >= 60) {
        progressText.value = '正在处理文件...'
      }
    }
  }, 500)
}

// 完成进度
const completeProgress = async (success = true) => {
  if (progressInterval.value) {
    clearInterval(progressInterval.value)
    progressInterval.value = null
  }

  // 停止网络监控
  await stopNetworkMonitoring()

  progressValue.value = 100
  progressText.value = success ? '导入完成！' : '导入失败'

  setTimeout(() => {
    progressDialog.value = false
    progressValue.value = 0
    progressText.value = '准备开始...'
  }, 1000)
}

// 隐藏进度对话框（后台继续运行）
const hideProgressDialog = () => {
  progressDialog.value = false
  showSnackbar('导入任务已转入后台运行', 'info')
}

// 显示提示信息
const showSnackbar = (text, color = 'success') => {
  snackbar.text = text
  snackbar.color = color
  snackbar.show = true
}

// 选择目录
const selectDirectory = async () => {
  try {
    const result = await window.electron.invoke('dialog:openDirectory', {
      defaultPath: customPath.value,
      properties: ['openDirectory']
    })

    if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0]
      const fs = await window.electron.fs
      const path = await window.electron.path

      // 判断选中文件夹是否为空
      const folderContent = fs.readdirSync(selectedPath)
      if (folderContent.length === 0) {
        customPath.value = selectedPath
        showSnackbar('选中的文件夹为空，直接使用该目录。', 'info')
      } else {
        // 文件夹不为空，自动创建子文件夹，去掉名称里的所有点和.git后缀
        const safeName = clipboardRepoName.value.replace(/\./g, '').replace(/\.git$/, '')
        const newFolderPath = path.join(selectedPath, safeName)
        if (!fs.existsSync(newFolderPath)) {
          fs.mkdirSync(newFolderPath)
          showSnackbar(`已自动创建 ${newFolderPath} 文件夹`, 'info')
        }
        customPath.value = newFolderPath
      }
    }
  } catch (error) {
    console.error('选择目录失败:', error)
    showSnackbar('选择目录失败', 'error')
  }
}

// 确认从剪切板导入仓库
const confirmClipboardImport = async () => {
  if (!clipboardRepoUrl.value) return

  // 检查自定义模式下是否选择了目录
  if (importMode.value === 'custom' && !customPath.value) {
    showSnackbar('请先选择保存目录', 'warning')
    return
  }

  // 关闭确认对话框
  clipboardImportDialog.value = false

  // 显示进度条
  startProgressSimulation()

  try {
    // 根据导入模式确定本地路径
    let localPath
    if (importMode.value === 'quick') {
      // 快速导入：根据系统类型使用不同的默认路径
      let baseDir
      if (window.electron.platform === 'win32') {
        // Windows系统使用Documents目录
        baseDir = await window.electron.getDocumentsPath()
      } else {
        // macOS和Linux使用用户主目录
        baseDir = await window.electron.homeDir
      }
      localPath = window.electron.path.join(baseDir, 'githave', clipboardRepoName.value)
    } else {
      // 自定义目录：使用用户选择的路径
      localPath = window.electron.path.join(customPath.value, clipboardRepoName.value)
    }

    await createRepo({
      name: clipboardRepoName.value,
      repo_url: clipboardRepoUrl.value,
      branch: 'master', // 默认分支
      local_path: localPath,
      username: '',
      password: '',
      desc: `从剪切板自动导入的仓库: ${clipboardRepoName.value}`,
      pull: true // 克隆后立即拉取
    })

    await completeProgress(true)
    showSnackbar(`仓库 ${clipboardRepoName.value} 导入成功`, 'success')

    // 发出导入成功事件，通知其他组件刷新
    window.dispatchEvent(
      new CustomEvent('repo-imported', {
        detail: { repoName: clipboardRepoName.value }
      })
    )

    // 延迟跳转到仓库身份证界面，让用户看到成功提示
    setTimeout(() => {
      router.push('/repo')
    }, 1500)
  } catch (err) {
    console.error('从剪切板导入仓库失败:', err)
    await completeProgress(false)
    const errorMsg = err.response?.data || err.message || '导入仓库失败'
    showSnackbar(errorMsg, 'error')
  }
}

// 取消剪切板导入
const cancelClipboardImport = () => {
  // 将当前URL添加到已取消列表
  if (clipboardRepoUrl.value) {
    addCancelledUrl(clipboardRepoUrl.value)
  }

  clipboardImportDialog.value = false
  clipboardRepoUrl.value = ''
  clipboardRepoName.value = ''
  // 重置导入模式和自定义路径
  importMode.value = 'quick'
  customPath.value = ''
}

// 组件挂载时启动监听
onMounted(() => {
  console.log('ClipboardRepoImporter 组件挂载，启动剪切板监听')
  startClipboardMonitoring()
})

// 组件激活时重新启动监听（防止在标签页操作中被意外停止）
onActivated(() => {
  console.log('ClipboardRepoImporter 组件激活，检查剪切板监听状态')
  if (!clipboardCheckInterval.value) {
    console.log('剪切板监听未运行，重新启动')
    startClipboardMonitoring()
  }
})

// 全局剪切板监听恢复机制
const restoreClipboardMonitoring = () => {
  // 检查全局定时器是否存在且有效
  if (window.githaveClipboardInterval) {
    try {
      // 尝试清理可能存在的无效定时器
      clearInterval(window.githaveClipboardInterval)
    } catch (error) {
      console.log('清理无效的全局定时器:', error)
    }
    window.githaveClipboardInterval = null
  }

  // 重新启动监听
  if (!clipboardCheckInterval.value) {
    console.log('恢复剪切板监听')
    startClipboardMonitoring()
  }
}

// 监听全局事件，用于恢复剪切板监听
window.addEventListener('githave:restore-clipboard', restoreClipboardMonitoring)

// 组件卸载时停止监听
onUnmounted(async () => {
  console.log('ClipboardRepoImporter 组件卸载，清理定时器')
  stopClipboardMonitoring()
  if (progressInterval.value) {
    clearInterval(progressInterval.value)
    progressInterval.value = null
  }
  // 停止网络监控
  await stopNetworkMonitoring()
})
</script>

<style scoped>
/* 组件样式 */
</style>
