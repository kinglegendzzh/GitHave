<template>
  <v-container class="cover-fill space-lens-container-modern">
    <!-- 全局加载遮罩：在调用 IPC 时显示 -->
    <v-overlay :value="isProcessing" absolute class="modern-overlay">
      <v-progress-circular indeterminate color="purple" size="64" />
    </v-overlay>

    <v-container fluid class="cover-fill">
      <v-row style="display: flex">
        <v-autocomplete
          v-model="lensPath"
          :items="pathSuggestions"
          label="选择透镜路径..."
          dense
          variant="solo-filled"
          flat
          clearable
          item-title="title"
          item-value="value"
          style="width: 55%"
          color="purple"
          @focus="loadPathSuggestions"
        />
        <div class="button-group-modern" style="width: 45%; height: 55px; font-size: 18px; display: flex; align-items: center; margin-top: 0px; gap: 8px;">
          <v-btn color="purple" class="mr-2 modern-btn" elevation="0" @click="applyLensPath">
            <v-icon color="white">mdi-line-scan</v-icon>
            <span style="color: white">深度扫描</span>
          </v-btn>
          <v-btn ref="analysisBtn" variant="flat" color="indigo" class="mr-2 modern-btn" elevation="0" @click="toggleAnalysisDrawer">
            <v-icon>mdi-file-document</v-icon>
            <span>生成代码分析报告</span>
          </v-btn>
          <v-btn ref="architectureBtn" variant="flat" color="teal" class="modern-btn" elevation="0" @click="toggleArchitectureDrawer">
            <v-icon>mdi-sitemap</v-icon>
            <span>生成架构流程图</span>
          </v-btn>
        </div>
      </v-row>

      <!-- 顶部工具栏：面包屑导航 -->
      <v-row>
        <v-col cols="12">
          <v-toolbar flat color="transparent" density="compact">
            <v-spacer />
            <v-breadcrumbs :items="breadcrumbs" divider="/">
              <template #item="{ item }">
                <v-breadcrumbs-item @click="navigateToBreadcrumb(item)">
                  {{ item.text }}
                </v-breadcrumbs-item>
              </template>
            </v-breadcrumbs>
          </v-toolbar>
        </v-col>
      </v-row>

      <!-- 主体内容：左侧图表、右侧目录列表 -->
      <v-row>
        <!-- 图表区域 -->
        <v-col cols="8">
          <div ref="chart" :key="chartKey" class="chart" style="position: relative">
            <div v-if="initialLoad" style="text-align: center">
              <img
                :src="grassSVG"
                alt="Chart Placeholder"
                draggable="false"
                style="
                  max-width: 100%;
                  max-height: 100%;
                  display: block;
                  margin: auto;
                  user-select: none;
                  pointer-events: none;
                "
              />
              <h1 style="margin-top: 16px; user-select: none; pointer-events: none">空间透镜</h1>
            </div>
            <v-overlay v-else :value="chartLoading">
              <v-progress-circular indeterminate size="64" />
            </v-overlay>
          </div>
        </v-col>

        <!-- 右侧目录列表 -->
        <v-col cols="4">
          <div class="text-center">
            <v-skeleton-loader v-if="legendLoading" type="table" />
            <div v-else class="modern-surface rounded-lg mx-auto directory-list-container">
              <v-list dense class="pa-0 directory-list modern-list">
                <v-list-item
                  v-for="item in legendItems"
                  :key="item.name"
                  style="cursor: pointer"
                  @click="onLegendItemClick($event, item)"
                  @contextmenu="showContextMenu($event, item)"
                  class="modern-list-item"
                >
                  <template #prepend>
                    <v-avatar size="32">
                      <v-icon :color="item.color">
                        {{ item.isDirectory ? item.icon : 'mdi-file-outline' }}
                      </v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title>{{ item.name }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- 新增：悬浮提示（微信聊天气泡样式） -->
      <div
        v-if="tooltipVisible"
        :style="{
          position: 'absolute',
          left: tooltipX + 'px',
          top: tooltipY + 'px',
          pointerEvents: 'none',
          zIndex: 1000
        }"
      >
        <!-- 此处没有明确设置背景颜色，由 v-card 全局主题决定 -->
        <v-card class="tooltip-card-modern theme--light" elevation="2">
          <v-icon left>mdi-comment</v-icon>
          <span style="font-size: 18px; margin-left: 4px">{{ tooltipContent }}</span>
        </v-card>
      </div>
    </v-container>

    <FileContextMenu ref="contextMenu" :menu-items="menuItems" />

    <!-- 代码分析报告抽屉 -->
    <div v-if="analysisDrawerVisible" class="modern-drawer analysis-drawer" :style="analysisDrawerStyle">
      <v-card class="drawer-card-modern" elevation="2">
        <v-card-text>
          <div class="drawer-title">选择分析范围</div>
          <v-radio-group v-model="analysisScope" column dense>
            <v-radio value="current" label="当前层级" color="indigo"></v-radio>
            <v-radio value="all" label="整个仓库" color="indigo"></v-radio>
          </v-radio-group>
          <div class="drawer-actions">
            <v-btn color="indigo" variant="flat" small @click="generateAnalysisReport">确认</v-btn>
            <v-btn variant="text" small @click="analysisDrawerVisible = false">取消</v-btn>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- 架构流程图抽屉 -->
    <div
      v-if="architectureDrawerVisible"
      class="modern-drawer architecture-drawer"
      :style="architectureDrawerStyle"
    >
      <v-card class="drawer-card-modern" elevation="2">
        <v-card-text>
          <div class="drawer-title">选择架构图范围</div>
          <v-radio-group v-model="architectureScope" column dense>
            <v-radio value="current" label="当前层级" color="teal"></v-radio>
            <v-radio value="all" label="整个仓库" color="teal"></v-radio>
          </v-radio-group>
          <div class="drawer-actions">
            <v-btn color="teal" variant="flat" small @click="generateArchitectureMap">确认</v-btn>
            <v-btn variant="text" small @click="architectureDrawerVisible = false">取消</v-btn>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" rounded="pill" elevation="2">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import * as d3 from 'd3'
import FileContextMenu from '../components/FileContextMenu.vue'
import { listRepos } from '../service/api'
import grassSVG from '../assets/透镜.svg'

// Electron 内置模块（使用 top-level await）
const fs = window.electron.fs
const path = window.electron.path

// 状态管理
const isProcessing = ref(false)
const selectedFile = ref(null)
const fileTree = ref(null)
const legendItems = ref([])
const colorScale = ref(null)
const rootPath = ref('')
const chartLoading = ref(false)
const legendLoading = ref(false)
const root = ref(null)
const currentFocus = ref(null)
const tooltipVisible = ref(false)
const tooltipContent = ref('')
const tooltipX = ref(0)
const tooltipY = ref(0)
const lensPath = ref('')
const pathSuggestions = ref([])
const depth = ref(3)
const initialLoad = ref(true)
const chartKey = ref(0)
// 用于保存 d3 sunburst 更新函数（将在绘图函数中设置）
const updateSunburst = ref(null)

// 抽屉状态管理
const analysisScope = ref('current')
const architectureScope = ref('current')
const analysisDrawerVisible = ref(false)
const architectureDrawerVisible = ref(false)
const analysisBtn = ref(null)
const architectureBtn = ref(null)

// 抽屉位置计算
const analysisDrawerStyle = computed(() => {
  if (!analysisBtn.value) return {}
  const rect = analysisBtn.value.$el.getBoundingClientRect()
  return {
    position: 'absolute',
    top: `${rect.bottom + 5}px`,
    left: `${rect.left}px`,
    zIndex: 100,
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1)'
  }
})

const architectureDrawerStyle = computed(() => {
  if (!architectureBtn.value) return {}
  const rect = architectureBtn.value.$el.getBoundingClientRect()
  return {
    position: 'absolute',
    top: `${rect.bottom + 5}px`,
    left: `${rect.left}px`,
    zIndex: 100,
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1)'
  }
})

// FileContextMenu 引用
const contextMenu = ref(null)

// 路由与 store（假设项目中已配置 vue-router 与 vuex）
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
const router = useRouter()
const store = useStore()
const snackbar = computed(() => store.state.snackbar)

// menuItems 定义，同时引用下面定义的三个操作函数
const viewFileDetails = () => {
  if (selectedFile.value && selectedFile.value.fullPath) {
    console.log('跳转到文件浏览器页面，文件路径：', selectedFile.value.fullPath)
    router.push({
      name: 'finder',
      params: { localPath: selectedFile.value.fullPath, forceDeep: true, forceReplace: true }
    })
  }
}
const copyFilePath = async () => {
  if (selectedFile.value && selectedFile.value.fullPath) {
    try {
      await navigator.clipboard.writeText(selectedFile.value.fullPath)
      store.dispatch('snackbar/showSnackbar', {
        show: true,
        message: '路径已复制到剪贴板',
        color: 'success'
      })
    } catch (err) {
      console.error('复制失败:', err)
    }
  }
}
const openInFinder = async () => {
  if (selectedFile.value && selectedFile.value.fullPath) {
    await window.electron.shell.openPath(path.dirname(selectedFile.value.fullPath))
  }
}
// 为文件夹生成代码分析报告
const generateFileAnalysisReport = async () => {
  if (selectedFile.value && selectedFile.value.fullPath) {
    analysisDrawerVisible.value = false
    isProcessing.value = true
    try {
      const targetPath = selectedFile.value.fullPath
      console.log(`生成文件代码分析报告，路径：${targetPath}`)

      // 这里可以调用后端API生成报告
      // 示例：await window.electron.ipcRenderer.invoke('generate-analysis-report', targetPath)

      store.dispatch('snackbar/showSnackbar', {
        message: `正在为文件生成代码分析报告，请稍等片刻后在‘枢纽’中查看...`,
        color: 'info'
      })
    } catch (error) {
      console.error('生成代码分析报告失败:', error)
      store.dispatch('snackbar/showSnackbar', {
        message: '生成代码分析报告失败',
        color: 'error'
      })
    } finally {
      isProcessing.value = false
    }
  }
}

// 为文件夹生成架构流程图
const generateFolderArchitectureMap = async () => {
  if (selectedFile.value && selectedFile.value.fullPath && selectedFile.value.isDirectory) {
    architectureDrawerVisible.value = false
    isProcessing.value = true
    try {
      const targetPath = selectedFile.value.fullPath
      console.log(`生成文件夹架构流程图，路径：${targetPath}`)

      // 这里可以调用后端API生成架构图
      // 示例：await window.electron.ipcRenderer.invoke('generate-architecture-map', targetPath)

      store.dispatch('snackbar/showSnackbar', {
        message: `正在为文件夹梳理架构流程图，请稍等片刻后在‘枢纽’中查看...`,
        color: 'info'
      })
    } catch (error) {
      console.error('生成架构流程图失败:', error)
      store.dispatch('snackbar/showSnackbar', {
        message: '生成架构流程图失败',
        color: 'error'
      })
    } finally {
      isProcessing.value = false
    }
  }
}

// 动态菜单项，根据选中项是文件还是文件夹显示不同的菜单
const menuItems = computed(() => {
  const baseItems = [
    { title: '查看详情', icon: 'mdi-information', action: viewFileDetails },
    { title: '复制路径', icon: 'mdi-content-copy', action: copyFilePath },
    { title: '在本地目录中显示', icon: 'mdi-folder', action: openInFinder }
  ]

  // 添加生成代码分析报告选项（对文件和文件夹都可用）
  baseItems.push({
    title: '生成代码分析报告',
    icon: 'mdi-file-document-outline',
    action: generateFileAnalysisReport
  })

  // 如果是文件夹，添加生成架构流程图选项
  if (selectedFile.value && selectedFile.value.isDirectory) {
    baseItems.push({
      title: '生成架构流程图',
      icon: 'mdi-sitemap',
      action: generateFolderArchitectureMap
    })
  }

  return baseItems
})

// 面包屑计算（使用 currentFocus 构建）
const breadcrumbs = computed(() => {
  const crumbs = []
  let node = currentFocus.value
  while (node) {
    crumbs.push({ text: node.data.name, path: node.data.fullPath })
    node = node.parent
  }
  return crumbs.reverse()
})

// 以下函数均为组件内业务逻辑

const showContextMenu = (event, item) => {
  console.log('右键菜单点击事件', event, item)
  // 先设置选中的文件，这样computed的menuItems才能根据文件类型显示正确的菜单项
  selectedFile.value = item
  // 然后显示上下文菜单
  contextMenu.value?.show(event)
}

const navigateToBreadcrumb = (item) => {
  const target = root.value.descendants().find((n) => n.data.fullPath === item.path)
  if (target && updateSunburst.value) {
    currentFocus.value = target
    updateSunburst.value(currentFocus.value)
  }
}

// 切换代码分析报告抽屉
const toggleAnalysisDrawer = () => {
  if (!rootPath.value) {
    store.dispatch('snackbar/showSnackbar', {
      message: '请先选择一个目录并进行扫描',
      color: 'warning'
    })
    return
  }
  // 关闭另一个抽屉
  architectureDrawerVisible.value = false
  // 切换当前抽屉
  analysisDrawerVisible.value = !analysisDrawerVisible.value
}

// 切换架构流程图抽屉
const toggleArchitectureDrawer = () => {
  if (!rootPath.value) {
    store.dispatch('snackbar/showSnackbar', {
      message: '请先选择一个目录并进行扫描',
      color: 'warning'
    })
    return
  }
  // 关闭另一个抽屉
  analysisDrawerVisible.value = false
  // 切换当前抽屉
  architectureDrawerVisible.value = !architectureDrawerVisible.value
}

// 生成代码分析报告
const generateAnalysisReport = async () => {
  analysisDrawerVisible.value = false
  isProcessing.value = true
  try {
    const targetPath =
      analysisScope.value === 'current' && currentFocus.value
        ? currentFocus.value.data.fullPath
        : rootPath.value
    const scopeText = analysisScope.value === 'current' ? '当前层级' : '整个仓库'

    console.log(`生成代码分析报告，范围：${scopeText}，路径：${targetPath}`)

    // 这里可以调用后端API生成报告
    // 示例：await window.electron.ipcRenderer.invoke('generate-analysis-report', targetPath)

    store.dispatch('snackbar/showSnackbar', {
      message: `正在为${scopeText}生成代码分析报告，请稍等片刻后在‘枢纽’中查看...`,
      color: 'info'
    })
  } catch (error) {
    console.error('生成代码分析报告失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: '生成代码分析报告失败',
      color: 'error'
    })
  } finally {
    isProcessing.value = false
  }
}

// 生成架构流程图
const generateArchitectureMap = async () => {
  architectureDrawerVisible.value = false
  isProcessing.value = true
  try {
    const targetPath =
      architectureScope.value === 'current' && currentFocus.value
        ? currentFocus.value.data.fullPath
        : rootPath.value
    const scopeText = architectureScope.value === 'current' ? '当前层级' : '整个仓库'

    console.log(`生成架构流程图，范围：${scopeText}，路径：${targetPath}`)

    // 这里可以调用后端API生成架构图
    // 示例：await window.electron.ipcRenderer.invoke('generate-architecture-map', targetPath)

    store.dispatch('snackbar/showSnackbar', {
      message: `正在为${scopeText}梳理架构流程图，请稍等片刻后在‘枢纽’中查看...`,
      color: 'info'
    })
  } catch (error) {
    console.error('生成架构流程图失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: '生成架构流程图失败',
      color: 'error'
    })
  } finally {
    isProcessing.value = false
  }
}

const applyLensPath = async () => {
  if (lensPath.value) {
    console.log(`用户输入的路径: ${lensPath.value}`)
    isProcessing.value = true
    try {
      // 规范路径格式
      lensPath.value = window.electron.normalize(lensPath.value)
      const parts = lensPath.value.split(window.electron.sep).filter(Boolean)
      const pathDepth = parts.length
      const adaptiveDepth = Math.floor((pathDepth - 3) / 0.3) + 3
      const scanDepth = Math.min(Math.max(adaptiveDepth, 3), 14)
      console.log(
        `路径深度: ${pathDepth}, 自适应扫描深度: ${adaptiveDepth}, 最终扫描深度: ${scanDepth}`
      )
      depth.value = adaptiveDepth
      rootPath.value = lensPath.value
      chartLoading.value = true
      legendLoading.value = true
      fileTree.value = await buildFileTreeAsync(rootPath.value, '', 0, scanDepth)
      drawChartWithAnimation()
    } catch (error) {
      console.error('扫描失败：', error)
      store.dispatch('snackbar/showSnackbar', {
        message: '扫描目录失败，请检查输入路径',
        color: 'error'
      })
      legendLoading.value = false
    } finally {
      isProcessing.value = false
      legendLoading.value = false
    }
  } else {
    console.log('输入为空，不进行扫描')
    depth.value = 3
    lensPath.value = ''
    rootPath.value = ''
    chartLoading.value = false
    legendLoading.value = false
    fileTree.value = null
    legendItems.value = []
    currentFocus.value = null
    chartKey.value++
    initialLoad.value = true
    d3.select(chart.value).selectAll('*').remove()
    initialLoad.value = true
  }
}

const onLegendItemClick = async (event, item) => {
  if (currentFocus.value && currentFocus.value.children) {
    const childNode = currentFocus.value.children.find((child) => child.data.name === item.name)
    if (childNode) {
      if (childNode.data.isDirectory) {
        console.log('目录扫描不完整，准备重新扫描：', childNode.data.fullPath)
        isProcessing.value = true
        try {
          let additionalDepth = await rescanNode(childNode.data)
          fileTree.value = await buildFileTreeAsync(rootPath.value, '', 0, additionalDepth)
          root.value = d3.hierarchy(fileTree.value).sum((d) => d.size)
          const newTarget = root.value
            .descendants()
            .find((node) => node.data.fullPath === childNode.data.fullPath)
          if (newTarget) {
            currentFocus.value = newTarget
          }
          updateSunburst.value && updateSunburst.value(currentFocus.value)
        } catch (error) {
          console.error('右侧目录扫描失败：', error)
          store.dispatch('snackbar/showSnackbar', {
            message: '扫描目录失败，请检查输入路径',
            color: 'error'
          })
        } finally {
          isProcessing.value = false
        }
      } else {
        showContextMenu(event, item)
      }
    }
  }
}

const buildFileTree = (dirPath, parentName = '') => {
  const name = path.basename(dirPath)
  let totalSize = 0
  let children = []
  let files
  try {
    files = fs.readdirSync(dirPath).filter((file) => !file.startsWith('.'))
  } catch (err) {
    console.error('读取目录失败：', err)
    return { name, size: 0, group: parentName, children: [] }
  }
  files.forEach((file) => {
    const fullPath = path.join(dirPath, file)
    try {
      const stats = fs.statSync(fullPath)
      if (stats.isDirectory()) {
        const subtree = buildFileTree(fullPath, name)
        children.push(subtree)
        totalSize += subtree.size
      } else if (stats.isFile()) {
        const fileSizeMB = Math.ceil(stats.size / 1024 / 1024)
        children.push({
          name: file,
          size: fileSizeMB,
          group: name,
          fullPath,
          isDirectory: false,
          children: []
        })
        totalSize += fileSizeMB
      }
    } catch (err) {
      console.error('处理文件失败：', fullPath, err)
    }
  })
  return {
    name,
    size: totalSize,
    group: parentName,
    fullPath: dirPath,
    isDirectory: true,
    children
  }
}

const rescanNode = async (nodeData) => {
  const currentDepth = nodeData.fullPath.split(path.sep).filter(Boolean).length
  const targetDepth = lensPath.value.split(path.sep).filter(Boolean).length
  let additionalDepth = depth.value
  if (targetDepth < currentDepth) {
    additionalDepth += currentDepth - targetDepth
  }
  console.log(
    `重新扫描目录 ${nodeData.fullPath}，当前层级 ${currentDepth}，目标层级 ${targetDepth}，额外扩展深度 ${additionalDepth}`
  )
  try {
    const newSubtree = await buildFileTreeAsync(
      nodeData.fullPath,
      nodeData.group || nodeData.name,
      0,
      additionalDepth
    )
    nodeData.children = newSubtree.children
    nodeData.size = newSubtree.size
    nodeData.incomplete = newSubtree.incomplete
    console.log(`节点 ${nodeData.fullPath} 已更新扫描数据`)
    return additionalDepth
  } catch (error) {
    console.error('重新扫描节点失败：', nodeData.fullPath, error)
  }
}

const buildFileTreeAsync = async (dirPath, parentName = '', d = 0, maxDepth = depth.value) => {
  const name = path.basename(dirPath)
  let totalSize = 0
  let children = []
  let files
  try {
    files = (await fs.promises.readdir(dirPath)).filter((file) => !file.startsWith('.'))
  } catch (err) {
    if (err.code === 'EPERM') {
      console.warn(`权限不足，跳过目录：${dirPath}`)
      store.dispatch('snackbar/showSnackbar', {
        show: true,
        message: `权限不足，已跳过目录：${path.basename(dirPath)}`,
        color: 'warning'
      })
      return {
        name,
        size: 0,
        group: parentName,
        fullPath: dirPath,
        isDirectory: true,
        children: [],
        inaccessible: true
      }
    }
    console.error(`读取目录失败：${dirPath}`, err)
    return {
      name,
      size: 0,
      group: parentName,
      fullPath: dirPath,
      isDirectory: true,
      children: []
    }
  }
  if (d >= maxDepth) {
    console.log(`达到最大扫描深度 ${maxDepth}，返回时附加 incomplete 标志`)
    return {
      name,
      size: 0,
      group: parentName,
      fullPath: dirPath,
      isDirectory: true,
      children: [],
      incomplete: true
    }
  }
  const results = await Promise.all(
    files.map(async (file) => {
      const fullPath = path.join(dirPath, file)
      try {
        await fs.promises.access(fullPath, fs.constants.F_OK)
        const statData = await window.electron.getFileStats(fullPath)
        if (statData.isDirectory) {
          const subtree = await buildFileTreeAsync(fullPath, name, d + 1, maxDepth)
          totalSize += subtree.size
          return subtree
        } else if (statData.isFile) {
          const fileSizeKB = Math.ceil(statData.size / 1024)
          totalSize += fileSizeKB
          return {
            name: file,
            size: fileSizeKB,
            group: name,
            fullPath,
            isDirectory: false,
            children: [],
            incomplete: false
          }
        }
      } catch (err) {
        if (err.code === 'ENOENT' || err.code === 'EACCES') {
          console.warn(`跳过文件：${fullPath}`)
          return null
        } else {
          console.error('处理文件失败：', fullPath, err)
          return null
        }
      }
    })
  )
  children = results.filter((item) => item !== null)
  return {
    name,
    size: totalSize,
    group: parentName,
    fullPath: dirPath,
    isDirectory: true,
    children,
    incomplete: false
  }
}

const loadPathSuggestions = async () => {
  try {
    const response = await listRepos()
    console.log('loadPathSuggestions', JSON.stringify(response.data))
    if (!response.data || !Array.isArray(response.data)) return
    pathSuggestions.value = response.data.map((repo) => ({
      value: repo.local_path,
      title: `${repo.desc}(${repo.name})`
    }))
  } catch (err) {
    console.error('获取仓库数据失败:', err)
  }
}

// 绘制图表并添加动画与交互
const chart = ref(null)
const drawChartWithAnimation = () => {
  if (!fileTree.value) return
  initialLoad.value = false
  d3.select(chart.value).selectAll('*').remove()
  const width = 600,
    height = 600
  const radius = Math.min(width, height) / 2
  const innerRadius = 60
  const topLevelNames = fileTree.value.children ? fileTree.value.children.map((d) => d.name) : []
  colorScale.value = d3.scaleOrdinal().domain(topLevelNames).range(d3.schemeCategory10)
  legendItems.value = topLevelNames.map((name) => {
    const child = fileTree.value.children.find((child) => child.name === name)
    return {
      name,
      color: colorScale.value(name),
      fullPath: child?.fullPath || ''
    }
  })
  const svg = d3.select(chart.value).append('svg').attr('width', width).attr('height', height)
  const g = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`)
  const diameter = innerRadius * 2.5
  const defs = svg.append('defs')
  const pattern = defs
    .append('pattern')
    .attr('id', 'minecraftGlassPattern')
    .attr('width', diameter)
    .attr('height', diameter)
    .attr('x', innerRadius * 1.25)
    .attr('y', innerRadius * 1.25)
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('patternRepeat', 'no-repeat')
  pattern
    .append('image')
    .attr('xlink:href', grassSVG)
    .attr('width', diameter)
    .attr('height', diameter)
  const lensCircle = g
    .append('circle')
    .attr('r', innerRadius)
    .attr('fill', 'url(#minecraftGlassPattern)')
    .style('cursor', 'pointer')
    .on('click', () => {
      if (currentFocus.value && currentFocus.value.parent) {
        currentFocus.value = currentFocus.value.parent
        if (updateSunburst.value) {
          updateSunburst.value(currentFocus.value)
        }
      }
    })
    .on('mousemove', (event) => {
      const [mx, my] = d3.pointer(event, lensCircle.node())
      const shiftX = mx * 0.3
      const shiftY = my * 0.3
      pattern.attr('patternTransform', `translate(${shiftX}, ${shiftY})`)
    })
    .on('mouseout', () => {
      pattern.attr('patternTransform', null)
    })
  g.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .style('pointer-events', 'none')
    .style('font-size', '14px')
    .style('font-weight', 'bold')
    .style('fill', '#3B00EB')
    .style('text-shadow', '2px 2px 4px rgba(0, 0, 0, 0.5)')
  root.value = d3.hierarchy(fileTree.value)
  root.value.each((node) => {
    if (node.data.isDirectory) {
      node.value = node.data.children ? node.data.children.length : 0
    } else {
      node.value = node.data.size
    }
  })
  currentFocus.value = root.value

  const handleContextMenu = (event, d) => {
    event.preventDefault()
    event.stopPropagation()
    selectedFile.value = {
      name: d.data.name,
      fullPath: d.data.fullPath,
      isDirectory: d.data.isDirectory
    }
    showContextMenu(event, selectedFile.value)
  }
  const getArcData = (d) => ({ x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 })

  const updateSunburstFunc = (focusNode) => {
    if (!focusNode) return
    updateSunburst.value = updateSunburstFunc
    const rootHierarchy = d3.hierarchy(focusNode.data).sum((d) => d.size)
    d3.partition().size([2 * Math.PI, rootHierarchy.height + 1])(rootHierarchy)
    const focusDepth = focusNode.height
    const ringThickness = (radius - innerRadius) / (focusDepth > 0 ? focusDepth : 1)
    const arcGen = d3
      .arc()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .innerRadius((d) => innerRadius + (d.y0 - 1) * ringThickness)
      .outerRadius((d) => innerRadius + (d.y1 - 1) * ringThickness)
    const arcs = g.selectAll('path').data(
      rootHierarchy.descendants().filter((d) => d.depth > 0),
      (d) => d.data.name + '-' + d.depth
    )
    arcs
      .exit()
      .transition()
      .duration(750)
      .attrTween('d', function (d) {
        const current = this._current ? getArcData(this._current) : getArcData(d)
        const target = { x0: d.x0, x1: d.x0, y0: d.y0, y1: d.y1 }
        const i = d3.interpolate(current, target)
        return (t) => arcGen(i(t))
      })
      .remove()
    arcs
      .transition()
      .duration(750)
      .attrTween('d', function (d) {
        const current = this._current ? getArcData(this._current) : getArcData(d)
        const target = getArcData(d)
        const i = d3.interpolate(current, target)
        this._current = i(0)
        return (t) => arcGen(i(t))
      })
    if (focusNode.children && focusNode.children.length > 0) {
      const childrenNames = focusNode.children.map((child) => child.data.name)
      colorScale.value = d3.scaleOrdinal().domain(childrenNames).range(d3.schemeCategory10)
      const directories = focusNode.children.filter((child) => child.data.isDirectory)
      const files = focusNode.children.filter((child) => !child.data.isDirectory)
      legendItems.value = [
        ...directories.map((dir) => ({
          name: dir.data.name,
          color: colorScale.value(dir.data.name),
          fullPath: dir.data.fullPath,
          isDirectory: true,
          icon: 'mdi-folder'
        })),
        ...files.map((file) => ({
          name: file.data.name,
          color: colorScale.value(file.data.name),
          fullPath: file.data.fullPath,
          isDirectory: false
        }))
      ]
    } else {
      legendItems.value = []
    }
    legendLoading.value = false
    const formatSize = (value) =>
      value >= 1024 ? (value / 1024).toFixed(1) + ' MB' : value + ' KB'
    const newArcs = arcs
      .enter()
      .append('path')
      .attr('fill', (d) => {
        if (d.depth === 1) {
          return colorScale.value(d.data.name)
        } else {
          let ancestor = d
          while (ancestor.depth > 1) {
            ancestor = ancestor.parent
          }
          const baseColor = d3.color(colorScale.value(ancestor.data.name))
          const lighten = (d.depth - 1) * 0.2
          return baseColor.brighter(lighten).toString()
        }
      })
      .attr('stroke', 'none')
      .attr('stroke-width', 1)
      .each(function (d) {
        this._current = getArcData(d)
      })
      .on('click', async (event, d) => {
        if (d.data.isDirectory) {
          console.log('目录扫描不完整，准备重新扫描：', d.data.fullPath)
          let additionalDepth = await rescanNode(d.data)
          fileTree.value = await buildFileTreeAsync(rootPath.value, '', 0, additionalDepth)
          root.value = d3.hierarchy(fileTree.value).sum((d) => d.size)
          const newTarget = root.value
            .descendants()
            .find((node) => node.data.fullPath === d.data.fullPath)
          if (newTarget) {
            currentFocus.value = newTarget
          }
          updateSunburstFunc(currentFocus.value)
        }
        event.stopPropagation()
      })
      .on('contextmenu', handleContextMenu)
      .on('mouseover', (event, d) => {
        if (d.data.isDirectory) {
          tooltipContent.value = `${d.data.name}: ${d.value} 个子项`
        } else {
          tooltipContent.value = `${d.data.name}: ${formatSize(d.value)}`
        }
        tooltipVisible.value = true
      })
      .on('mousemove', (event) => {
        tooltipX.value = event.pageX + 10
        tooltipY.value = event.pageY + 10
      })
      .on('mouseout', () => {
        tooltipVisible.value = false
      })
    newArcs.append('title').text((d) => `${d.data.name}: ${d.value}`)
    newArcs
      .transition()
      .duration(750)
      .attrTween('d', function (d) {
        const current = this._current
        const target = getArcData(d)
        const i = d3.interpolate(current, target)
        this._current = i(0)
        return (t) => arcGen(i(t))
      })
    legendLoading.value = false
    chartLoading.value = false
  }
  updateSunburstFunc(currentFocus.value)
}

onMounted(() => {
  // 如有需要，可在 mounted 时做额外初始化（例如自动加载默认数据）
})
</script>

<style scoped>
.drawer-card {
  width: 220px;
  overflow: hidden;
  animation: slide-in 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.drawer-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 12px;
  color: #424242;
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  gap: 8px;
}

.directory-list-container {
  height: 60vh;
  overflow: hidden;
  background-color: #eeefef;
  border-radius: 8px;
}

.directory-list {
  max-height: 60vh;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: #eeefef;
  color: #333;
}

.directory-list::-webkit-scrollbar {
  width: 6px;
}

.directory-list::-webkit-scrollbar-thumb {
  background-color: #eeefef;
  border-radius: 4px;
}
@keyframes slide-in {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
:deep(.bg-surface-variant) {
  background-color: rgb(var(--v-theme-on-surface-variant)) !important;
}
</style>

<style scoped>
/* General container and animations */
.space-lens-container-modern {
  /* Inspired by DeepSearch.vue .search-container */
  animation: fadeIn 0.6s ease-out;
  padding-top: 16px; /* Add some top padding */
}

.modern-overlay .v-progress-circular {
  /* Style for progress circular if needed, matching DeepSearch */
}

/* Autocomplete and Buttons */
.v-autocomplete.v-input--density-dense.v-text-field--solo-filled.v-text-field--single-line .v-field {
  border-radius: 20px !important; /* Rounded like DeepSearch input */
  box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.v-autocomplete.v-input--density-dense.v-text-field--solo-filled.v-text-field--single-line .v-field:focus-within {
  box-shadow: 0 6px 16px rgba(0,0,0,0.12) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.6) !important;
}

.button-group-modern .modern-btn {
  border-radius: 20px; /* Rounded buttons */
  text-transform: none; /* No uppercase text */
  font-weight: 500;
  transition: all 0.2s ease-in-out;
}

.button-group-modern .modern-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

/* Toolbar and Breadcrumbs */
.v-toolbar--density-compact {
  margin-bottom: 8px; /* Spacing like DeepSearch header */
}

.v-breadcrumbs {
  padding: 8px 0;
}

.v-breadcrumbs-item {
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface-rgb), 0.7);
  transition: color 0.2s ease;
}

.v-breadcrumbs-item:hover {
  color: rgba(var(--v-theme-primary-rgb), 1);
}

/* Chart and Legend Area */
.chart {
  /* Add subtle shadow or border if needed */
  border-radius: 12px;
  /* background: rgba(var(--v-theme-surface-rgb), 0.6); */ /* Optional: if a background is desired */
  /* box-shadow: 0 6px 24px rgba(0, 0, 0, 0.05); */
  animation: slideUp 0.5s ease-out 0.2s; /* Delayed animation */
  animation-fill-mode: backwards; /* Ensure it starts from opacity 0 */
}

.directory-list-container.modern-surface {
  background: rgba(var(--v-theme-surface-rgb), 0.4);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(var(--v-theme-on-surface-rgb), 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  animation: slideUp 0.5s ease-out 0.3s; /* Delayed animation */
  animation-fill-mode: backwards;
}

.modern-list {
  background-color: transparent !important; /* Make list transparent to show container's backdrop */
}

.modern-list-item {
  transition: background-color 0.2s ease, transform 0.2s ease;
  border-radius: 8px;
  margin: 4px 0; /* Add some spacing */
}

.modern-list-item:hover {
  background-color: rgba(var(--v-theme-primary-rgb), 0.1);
  transform: translateX(3px);
}

.modern-list-item .v-list-item-title {
  font-weight: 500;
}

/* Tooltip */
.tooltip-card-modern {
  background-color: rgba(var(--v-theme-surface-rgb), 0.9) !important; /* Match DeepSearch dropdown */
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border-radius: 8px !important;
  padding: 10px 14px !important;
  box-shadow: 0 4px 15px rgba(0,0,0,0.12) !important;
}

.tooltip-card-modern .v-icon {
  color: rgba(var(--v-theme-primary-rgb), 1);
}

.tooltip-card-modern span {
  color: rgba(var(--v-theme-on-surface-rgb), 0.87) !important;
  font-size: 1rem !important;
}

/* Drawers */
.modern-drawer .drawer-card-modern {
  width: 250px; /* Slightly wider */
  border-radius: 12px; /* More rounded */
  background: rgba(var(--v-theme-surface-rgb), 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(var(--v-theme-on-surface-rgb), 0.08);
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
  overflow: hidden;
  animation: fadeIn 0.3s ease-out; /* Use fadeIn for drawers */
}

.drawer-card-modern .v-card-text {
  padding: 20px;
}

.drawer-card-modern .drawer-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: rgba(var(--v-theme-primary-rgb), 0.9);
  margin-bottom: 16px;
}

.drawer-card-modern .v-radio-group .v-label {
  font-size: 0.95rem;
}

.drawer-card-modern .drawer-actions {
  margin-top: 20px;
}

.drawer-card-modern .drawer-actions .v-btn {
  border-radius: 18px;
  text-transform: none;
}

/* Snackbar */
.v-snackbar--rounded-pill .v-snackbar__wrapper {
  /* Styles for pill snackbar if needed, already has good defaults */
}

/* Keyframe animations (from DeepSearch.vue) */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideDown {
  from { transform: translateY(-15px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(15px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Ensure initial state for animations if not handled by v-if */
.v-row:first-child, /* Top controls row */
.v-row:nth-child(2) /* Breadcrumbs row */
{
  animation: slideDown 0.5s ease-out;
}

.space-lens-container {
  max-width: 600px;
  margin: 0 auto;
}
.chart {
  text-align: center;
  min-height: 600px;
  position: relative;
}
.legend-list {
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
}
.legend-list li {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}
.legend-color-block {
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 8px;
}
.tooltip-card {
  background-color: #fff;
  padding: 8px;
  border-radius: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
.tooltip-card span {
  color: #454545 !important;
}
</style>
