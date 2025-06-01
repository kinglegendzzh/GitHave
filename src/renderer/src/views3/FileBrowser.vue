<template>
  <v-container fluid class="cover-fill" style="height: 90vh">
    <!-- 当 loading 为 true 时显示加载动画，反之显示主体页面 -->
    <v-row v-if="loading" align="center" justify="center" style="height: 100vh">
      <v-col cols="12" class="text-center" style="display: block">
        <!--        <img :src="dynamicLoadingSvg" alt="加载动画" class="loading-svg" />-->
        <v-progress-circular indeterminate color="primary" size="70" />
        <!--        <div class="mt-4" style="font-size: 1.0rem;">加载中...</div>-->
      </v-col>
    </v-row>

    <div v-else style="height: 100%">
      <!-- 主内容区 -->
      <v-row>
        <v-toolbar class="mb-1">
          <div class="d-flex align-center ml-auto">
            <v-select
              v-model="newRootPath"
              :items="pathSuggestions"
              label="选择访达路径..."
              outlined
              dense
              clearable
              item-title="title"
              item-value="value"
              color="success"
              class="mr-2"
              style="width: 400px; height: auto"
              @focus="loadPathSuggestions"
              @update:model-value="onPathSelectionChanged"
            ></v-select>
            <v-tooltip text="更新代码">
              <template #activator="{ props }">
                <v-btn v-bind="props" title="更新代码" outlined plain class="mr-2" @click="pull()">
                  <v-icon>mdi-git</v-icon>
                  更新代码
                </v-btn>
              </template>
            </v-tooltip>
            <v-tooltip text="从本地目录打开">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  title="从本地目录打开"
                  outlined
                  plain
                  class="mr-2"
                  @click="openOutside(breadcrumbs, true)"
                >
                  <v-icon>mdi-folder-eye</v-icon>
                  从本地目录打开
                </v-btn>
              </template>
            </v-tooltip>
            <v-tooltip text="从本地应用程序打开">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  title="从本地应用程序打开"
                  outlined
                  plain
                  class="mr-2"
                  @click="openOutside(breadcrumbs, false)"
                >
                  <v-icon>mdi-file-search-outline</v-icon>
                  从本地应用程序打开
                </v-btn>
              </template>
            </v-tooltip>
            <!-- <v-tooltip text="在IDE中编辑">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  title="在IDE中编辑"
                  outlined
                  plain
                  class="mr-2"
                  @click="previewIde(newRootPath)"
                >
                  <v-icon>mdi-code-block-tags</v-icon>
                  在IDE中编辑
                </v-btn>
              </template>
            </v-tooltip> -->
          </div>
        </v-toolbar>
      </v-row>

      <v-row style="display: flex; height: calc(100% - 50px)">
        <!-- 左侧目录树 -->
        <v-col
          cols="12"
          md="4"
          lg="3"
          class="mb-4"
          style="width: 20%; max-width: 20%; position: relative"
        >
          <v-card outlined class="pa-2 h-100" style="height: 100vh; overflow: auto">
            <v-card-title class="subtitle-1">访达目录树</v-card-title>
            <v-divider></v-divider>
            <Treeselect
              v-model="treeselectValue"
              :options="treeData"
              :normalizer="nodeNormalizer"
              placeholder="选择目录树..."
              :item="[]"
              item-key="path"
              :load-options="loadDirectoryOptions"
              :multiple="false"
              :clearable="true"
              :auto-load-root-options="true"
              :always-open="true"
              :open-nodes="openNodes"
              :default-expand-level="1"
              class="mt-2"
              style="min-width: 800px"
              :menu-height="1000"
              @click="handleOptionClick"
            ></Treeselect>
          </v-card>
        </v-col>

        <!-- 右侧文件预览和标签 -->
        <v-col
          cols="12"
          md="8"
          lg="9"
          style="width: 80%; max-width: 80%"
          class="mb-4 d-flex flex-column h-100"
        >
          <div class="flex-shrink-0">
            <!-- 顶部标签页 -->
            <v-tabs v-model="activeTab" class="mb-4">
              <v-tab v-for="(tab, index) in tabs" :key="tab.path" class="d-flex align-center">
                <v-icon
                  class="ml-2"
                  style="cursor: pointer"
                  color="error"
                  @click.stop="removeTab(index)"
                  >mdi-close</v-icon
                >
                <span style="cursor: pointer" @click="selectTab(tab)">{{ tab.name }}</span>
              </v-tab>
            </v-tabs>
            <!-- 面包屑导航 -->
            <div class="breadcrumb-container">
              <v-breadcrumbs :items="breadcrumbs" class="pa-0">
                <template #item="{ item }">
                  <v-breadcrumbs-item @click="navigateTo(item.path)">{{
                    item.text
                  }}</v-breadcrumbs-item>
                </template>
              </v-breadcrumbs>
            </div>
          </div>
          <v-divider></v-divider>
          <v-card tonal class="flex-grow-1" style="height: 100%; overflow-y: auto">
            <v-card-text>
              <div v-if="selectedFileName" class="preview-content">
                <!-- 文件操作按钮（英文支持小写） -->
                <div class="d-flex justify-end mb-0">
                  <v-btn
                    color="success"
                    size="small"
                    prepend-icon="mdi-code-braces"
                    @click="openInIDE(selectedFileUrl)"
                  >
                    <span style="text-transform: none">在GitHave IDE中编辑</span>
                  </v-btn>
                </div>
                <!-- PDF 预览 -->
                <div v-if="isPDF(selectedFileName)">
                  <iframe
                    :src="getPDFUrl()"
                    style="width: 100%; height: 100%"
                    frameborder="0"
                  ></iframe>
                </div>
                <!-- DOCX 预览 -->
                <div v-else-if="isDocx(selectedFileName)">
                  <div v-if="renderedDocx" v-html="renderedDocx"></div>
                  <div v-else>加载 DOCX 中...</div>
                </div>
                <!-- XLSX 预览 -->
                <div v-else-if="isXlsx(selectedFileName)">
                  <div v-if="renderedXlsx" v-html="renderedXlsx"></div>
                  <div v-else>加载 XLSX 中...</div>
                </div>
                <!-- Markdown 预览 -->
                <div
                  v-else-if="isMarkdown(selectedFileName)"
                  @click="handleLinkClick"
                  v-html="renderMarkdown(fileContent)"
                ></div>
                <!-- 代码文件预览 -->
                <pre v-else-if="isCodeFile">
                  <code
:class="`hljs ${path.extname(selectedFileName).slice(1)}`"
                        v-html="highlightCode(fileContent, path.extname(selectedFileName))"></code>
                </pre>
                <!-- 其他文本文件预览 -->
                <pre v-else>{{ fileContent }}</pre>
              </div>
              <div v-else style="text-align: center">
                <img
                  :src="placeholderImage"
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
                <h1 style="margin-top: 16px; user-select: none; pointer-events: none">代码视窗</h1>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
      <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
        {{ snackbar.message }}
      </v-snackbar>
    </div>
    <!-- 进度条弹窗 -->
    <v-dialog v-model="progressDialog" persistent max-width="400">
      <v-card>
        <v-card-title class="text-center">{{ progressTitle }}</v-card-title>
        <v-card-text>
          <v-progress-linear :model-value="progress" color="primary" height="25" striped>
            <template #default="{ value }">
              <strong>{{ Math.ceil(value) }}%</strong>
            </template>
          </v-progress-linear>
          <div class="text-center mt-2">{{ progressMessage }}</div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, onActivated, watch, nextTick } from 'vue'
import { useStore } from 'vuex'
import { isFilePath, getFileExtension, getFileName } from '../service/file'
import mammoth from 'mammoth'
import { LOAD_ROOT_OPTIONS, LOAD_CHILDREN_OPTIONS, ASYNC_SEARCH } from 'vue3-treeselect'
import path from 'path-browserify'
import Treeselect from 'vue3-treeselect'
import 'vue3-treeselect/dist/vue3-treeselect.css'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
// import 'highlight.js/styles/docco.css'
import * as XLSX from 'xlsx'
import codeSVG from '../assets/code.svg'
import { listRepos, pullRepo } from '../service/api.js'
import { omit } from '../service/str'
import dynamicLoadingSvg from '../assets/load.svg'
// router import removed as we're using IPC instead of direct routing
// Vuex store（假定已配置）
const store = useStore()
// computed 用于展现 snackbar 数据（减少不必要的更新）
const snackbar = computed(() => store.state.snackbar)

// 主题检测和高亮样式管理
const isDarkTheme = ref(false)
const highlightTheme = ref('mono-blue') // 默认亮色主题
const darkHighlightTheme = 'gradient-dark' // 暗色主题 [gradient-dark, xcode]
const lightHighlightTheme = 'mono-blue' // 亮色主题 [monokai, docco, mono-blue, github]

// 监听主题变化并加载对应的高亮样式
const loadHighlightTheme = (themeName) => {
  // 移除之前加载的样式
  const prevStyle = document.getElementById('highlight-theme-style')
  if (prevStyle) {
    console.log(`[FileBrowser] 已移除之前的高亮主题样式: ${prevStyle.href}`)
    prevStyle.remove()
  }

  // 创建并加载新样式
  const link = document.createElement('link')
  link.id = 'highlight-theme-style'
  link.rel = 'stylesheet'
  // link.href = `https://cdn.jsdelivr.net/npm/highlight.js@11.7.0/styles/${themeName}.css`
  link.href = `highlight.js/styles/${themeName}.css`
  document.head.appendChild(link)

  highlightTheme.value = themeName
  console.log(`[FileBrowser] 已加载高亮主题: ${themeName}`)
}

// 检测当前主题
const checkTheme = () => {
  // 通过检查 body 上的 Vuetify 主题类来确定当前主题
  const isDark = localStorage.getItem('isDark') === 'true'
  isDarkTheme.value = isDark

  // 根据主题加载对应的高亮样式
  loadHighlightTheme(isDark ? darkHighlightTheme : lightHighlightTheme)
}

// 设置主题变化的监听器
const setupThemeObserver = () => {
  // 使用 MutationObserver 监听 body 类变化
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        checkTheme()
      }
    })
  })

  observer.observe(document.body, { attributes: true })

  // 初始检查主题
  checkTheme()

  return observer
}

// 主题观察器实例
let themeObserver = null

// 组件挂载时初始化主题观察器
onMounted(() => {
  // 初始化主题观察器
  themeObserver = setupThemeObserver()
  console.log('[FileBrowser] 主题观察器已初始化')
})

// 组件卸载时清理主题观察器
onUnmounted(() => {
  if (themeObserver) {
    themeObserver.disconnect()
    themeObserver = null
    console.log('[FileBrowser] 主题观察器已清理')
  }
})

// 定义 props（支持传入本地路径及一些控制参数）
const props = defineProps({
  localPath: {
    type: String,
    default: ''
  },
  forceReplace: {
    type: String,
    default: 'false'
  },
  forceDeep: {
    type: Boolean,
    default: false
  },
  rootPath: {
    type: String,
    default: ''
  }
})

// 响应式数据
const progressDialog = ref(false)
const progress = ref(0)
const progressTitle = ref('')
const progressMessage = ref('')
let progressTimer = null

// 控制是否处于加载状态
const loading = ref(true)
const treeselectValue = ref(null)
const tabs = ref([])
const activeTab = ref(null)
const breadcrumbs = ref([])
const currentTab = ref(null)
const fileContent = ref('')
const selectedFileName = ref('')
const renderedDocx = ref('')
const renderedXlsx = ref('')
const selectedFileUrl = ref('')
const placeholderImage = codeSVG
const newRootPath = ref('')
const pathSuggestions = ref([])
const openNodes = ref([])
// 初始化时目录树为空，不自动加载根目录
const treeData = ref([])

// 常量配置
const allowedExtensions = [
  '.txt',
  '.js',
  '.java',
  '.go',
  '.md',
  '.markdown',
  '.yml',
  '.yaml',
  '.json',
  '.xml',
  '.html',
  '.css',
  '.scss',
  '.h',
  '.glsl',
  '.c',
  '.cpp',
  '.vue',
  '.ts',
  '.sh',
  '.bash',
  '.php',
  '.py',
  '.rb',
  '.pl',
  '.erb',
  '.tsx',
  '.jsx',
  '.log',
  '.pdf',
  '.xls',
  '.xlsx',
  '.doc',
  '.docx',
  '.sql',
  '.conf',
  '.ini',
  '.properties',
  '.csv',
  '.ipynb',
  '.iml',
  '.mod',
  '.sum',
  '.toml',
  '.lock',
  '.lic',
  '.model',
  '.spec',
  '.svg',
  '.rs',
  '.rsx',
  '.hpp',
  '.hxx',
  '.rust'
]
const allowedFileName = [
  'Dockerfile',
  'README.md',
  'LICENSE',
  'CONTRIBUTING.md',
  'AUTHORS',
  'CHANGELOG.md',
  'HISTORY.md',
  'TODO.md',
  'FAQ.md',
  'README',
  'LICENSE',
  'CONTRIBUTING',
  'AUTHORS',
  'CHANGELOG',
  'HISTORY',
  'TODO',
  'FAQ'
]
const blacklistedExtensions = [
  '.zip',
  '.rar',
  '.7z',
  '.dmg',
  '.exe',
  '.tar',
  '.gz',
  '.iso',
  '.apk',
  '.jpg',
  '.png',
  '.gif',
  '.mp4',
  '.mp3',
  '.mpeg',
  '.mpg',
  '.avi',
  '.wmv',
  '.mov',
  '.flv',
  '.mkv',
  '.webm',
  '.ogg',
  '.ogv',
  '.ogm',
  '.ogx'
]
const customAppMapping = {
  '.txt': { win32: 'notepad', linux: 'gedit' },
  '.java': { darwin: 'code', win32: 'code', linux: 'code' },
  '.js': { darwin: 'code', win32: 'code', linux: 'code' },
  '.vue': { darwin: 'code', win32: 'code', linux: 'code' },
  '.go': { darwin: 'code', win32: 'code', linux: 'code' },
  '.sh': { darwin: 'code', win32: 'notepad', linux: 'gedit' },
  '.md': { darwin: 'code', win32: 'notepad', linux: 'gedit' },
  '.markdown': { darwin: 'code', win32: 'notepad', linux: 'gedit' },
  '.yml': { darwin: 'code', win32: 'code', linux: 'code' },
  '.yaml': { darwin: 'code', win32: 'code', linux: 'code' },
  '.json': { darwin: 'code', win32: 'notepad', linux: 'gedit' },
  '.xml': { darwin: 'code', win32: 'notepad', linux: 'gedit' },
  '.html': { darwin: 'code', win32: 'notepad', linux: 'gedit' },
  '.css': { darwin: 'code', win32: 'notepad', linux: 'gedit' }
}

// Markdown 渲染器
const md = new MarkdownIt({
  // 代码高亮处理
  highlight: (str, lang) => {
    try {
      // 确保在高亮前已加载正确的主题样式
      nextTick(() => {
        // 如果当前没有加载主题，则检查并加载
        if (!document.getElementById('highlight-theme-style')) {
          checkTheme()
        }
      })

      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(str, { language: lang }).value
      } else {
        return hljs.highlightAuto(str).value
      }
    } catch (e) {
      console.error('代码高亮错误:', e)
      return str
    }
  }
})

// 计算属性：是否为代码文件（非 Markdown）
const isCodeFile = computed(() => {
  const ext = path.extname(selectedFileName.value).toLowerCase()
  const fileName = path.basename(selectedFileName.value)
  return (
    (allowedExtensions.includes(ext) || allowedFileName.includes(fileName)) &&
    !isMarkdown(selectedFileName.value)
  )
})

// 懒加载大文件：滚动时加载更多
async function loadMoreLines(selectedPath, loadedLines = 1000, step = 1000) {
  try {
    const stream = await window.electron.createReadStream(selectedPath, { encoding: 'utf-8' })
    let content = ''
    let lineCount = 0
    let lines = []
    for await (const chunk of stream) {
      content += chunk
      lines = content.split(/\r?\n/)
      if (lines.length >= loadedLines + step) {
        break
      }
    }
    const moreContent =
      lines.slice(0, loadedLines + step).join('\n') +
      (lines.length > loadedLines + step ? '\n...\n(继续加载更多)' : '')
    updateFileState(selectedPath, {
      fileContent: moreContent,
      isLargeFile: true,
      loadedLines: loadedLines + step
    })
  } catch (err) {
    updateFileState(selectedPath, { fileContent: `读取文件失败：${err.message}` })
  }
}

// 以下为各个辅助方法，均使用 Composition API 写法

// 处理链接点击（支持 Electron 调用）
function handleLinkClick(event) {
  let target = event.target
  while (target && target !== event.currentTarget) {
    if (target.tagName === 'A') {
      event.preventDefault()
      const url = target.getAttribute('href')
      if (window.electron && typeof window.electron.openNewWindow === 'function') {
        window.electron.openNewWindow(url)
      } else {
        window.open(url, '_blank')
      }
      break
    }
    target = target.parentNode
  }
}

async function initializePage() {
  loading.value = true
  try {
    await initialize(props.localPath)
  } catch (e) {
    console.error('初始化过程出错：', e)
  } finally {
    loading.value = false
  }
}

async function initialize(initialPath) {
  let rootDir = ''
  if (props.forceReplace == 'true' && initialPath) {
    newRootPath.value = initialPath
    rootDir = isFilePath(
      initialPath,
      allowedExtensions,
      allowedFileName,
      findNodeByPath,
      treeData.value
    )
      ? path.dirname(initialPath)
      : initialPath
  }
  if (rootDir) {
    fileContent.value = ''
    await resetTree(rootDir)
    if (initialPath) {
      if (props.forceReplace == 'true') {
        isFilePath(initialPath, allowedExtensions, allowedFileName, findNodeByPath, treeData.value)
          ? expandToPath(initialPath)
          : handleNodeSelection([rootDir])
      } else {
        expandToPath(initialPath)
      }
      if (
        isFilePath(initialPath, allowedExtensions, allowedFileName, findNodeByPath, treeData.value)
      ) {
        await loadFileByType(initialPath)
        const breadcrumbPath = buildBreadcrumb(initialPath)
        addOrSwitchTab({
          path: initialPath,
          name: path.basename(initialPath),
          breadcrumbs: breadcrumbPath
        })
      }
    }
  }
  newRootPath.value = initialPath
  resetRoot()
}

function resetRoot() {
  if (!newRootPath.value) return
  loadPathSuggestions()
  resetTree(newRootPath.value).then(() => {
    handleNodeSelection([newRootPath.value])
    tabs.value = []
    breadcrumbs.value = []
  })
}

// 处理路径选择变更，只在用户实际选择或清除路径时触发重置
function onPathSelectionChanged(newPath) {
  // 如果用户选择了路径（新路径或者已有路径）
  if (newPath) {
    // 更新目录树
    resetTree(newPath).then(() => {
      handleNodeSelection([newPath])
      tabs.value = []
      breadcrumbs.value = []
    })
    // 清空文件内容和预览区域，防止切换目录时残留上次的内容
    fileContent.value = ''
    renderedDocx.value = ''
    renderedXlsx.value = ''
    selectedFileUrl.value = ''
    selectedFileName.value = ''
  } else if (newPath === null || newPath === '') {
    // 用户清除了路径选择
    tabs.value = []
    breadcrumbs.value = []
    fileContent.value = ''
    treeData.value = []
    renderedDocx.value = ''
    renderedXlsx.value = ''
    selectedFileUrl.value = ''
    selectedFileName.value = ''
  }
}

function isPDF(fileName) {
  return path.extname(fileName).toLowerCase() === '.pdf'
}
function isDocx(fileName) {
  return ['.doc', '.docx'].includes(path.extname(fileName).toLowerCase())
}
function isXlsx(fileName) {
  return path.extname(fileName).toLowerCase() === '.xlsx'
}
function isMarkdown(fileName) {
  const ext = path.extname(fileName).toLowerCase()
  return ['.md', '.markdown'].includes(ext)
}
function getPDFUrl() {
  return selectedFileUrl.value
}

async function loadFileByType(selectedPath) {
  // —— 先判定是否目录 ——
  let isDir = false
  // 1. 如果树里已有这个节点，直接用它的 isDirectory
  const node = findNodeByPath(treeData.value, selectedPath)
  if (node) {
    isDir = node.isDirectory
  } else {
    // 2. 否则尝试用 readDirectory，如果能读通就是目录
    try {
      await window.electron.readDirectory(selectedPath)
      isDir = true
    } catch (e) {
      isDir = false
    }
  }
  if (isDir) {
    console.log(`跳过目录读取：${selectedPath}`)
    return
  }

  // 早于任何读取操作新增：
  const extLower = path.extname(selectedPath).toLowerCase()
  if (blacklistedExtensions.includes(extLower)) {
    store.dispatch('snackbar/showSnackbar', {
      message: `暂不支持在线预览 " ${extLower} " 文件`,
      type: 'warning'
    })
    return // ⛔ 直接跳过，绝不 readFile
  }

  // —— 真正开始按类型读取文件 ——
  const ext = path.extname(selectedPath).toLowerCase()
  try {
    if (isPDF(selectedPath)) {
      const buffer = await window.electron.readFile(selectedPath)
      const blob = new Blob([buffer], { type: 'application/pdf' })
      updateFileState(selectedPath, { selectedFileUrl: URL.createObjectURL(blob) })
    } else if (isDocx(selectedPath)) {
      const buffer = await window.electron.readFile(selectedPath)
      const arrayBuffer = convertBuffer(buffer)
      updateFileState(selectedPath, { renderedDocx: await renderDocx(arrayBuffer) })
    } else if (isXlsx(selectedPath)) {
      const buffer = await window.electron.readFile(selectedPath)
      const arrayBuffer = convertBuffer(buffer)
      updateFileState(selectedPath, { renderedXlsx: renderXlsx(arrayBuffer) })
    } else {
      // 判断文件大小，超过8MB则懒加载
      try {
        const stat = await window.electron.stat(selectedPath)
        const maxSize = 1 * 1024 * 1024 // 1MB
        if (stat.size > maxSize) {
          // 懒加载逻辑：先加载前1000行
          const stream = await window.electron.createReadStream(selectedPath, { encoding: 'utf-8' })
          let content = ''
          let lineCount = 0
          const maxLines = 1000
          for await (const chunk of stream) {
            content += chunk
            let lines = content.split(/\r?\n/)
            if (lines.length >= maxLines) {
              content =
                lines.slice(0, maxLines).join('\n') +
                '\n...\n(文件过大，仅显示前1000行，滚动可继续加载)'
              break
            }
          }
          updateFileState(selectedPath, {
            fileContent: content,
            isLargeFile: true,
            loadedLines: maxLines,
            totalSize: stat.size
          })
        } else {
          const content = await window.electron.readFile(selectedPath, { encoding: 'utf-8' })
          updateFileState(selectedPath, { fileContent: content, isLargeFile: false })
        }
      } catch (err) {
        updateFileState(selectedPath, { fileContent: `读取文件失败：${err.message}` })
      }
    }
  } catch (err) {
    console.error('加载文件失败：', err)
    updateFileState(selectedPath, { fileContent: `读取文件失败：${err.message}` })
  }
}

function updateFileState(selectedPath, updates) {
  selectedFileName.value = path.basename(selectedPath)
  Object.keys(updates).forEach((key) => {
    if (key === 'fileContent') {
      fileContent.value = updates[key]
    } else if (key === 'renderedDocx') {
      renderedDocx.value = updates[key]
    } else if (key === 'renderedXlsx') {
      renderedXlsx.value = updates[key]
    } else if (key === 'selectedFileUrl') {
      selectedFileUrl.value = updates[key]
    }
  })
}

function restoreState(tab) {
  selectedFileName.value = tab.selectedFileName || path.basename(tab.path)
  fileContent.value = tab.fileContent || ''
  renderedDocx.value = tab.renderedDocx || ''
  renderedXlsx.value = tab.renderedXlsx || ''
  selectedFileUrl.value = tab.selectedFileUrl || ''
  breadcrumbs.value = tab.breadcrumbs || []
}

function addOrSwitchTab(tabData) {
  let tab = tabs.value.find((t) => t.path === tabData.path)
  if (!tab) {
    tab = {
      fileContent: fileContent.value,
      renderedDocx: renderedDocx.value,
      renderedXlsx: renderedXlsx.value,
      selectedFileUrl: selectedFileUrl.value,
      selectedFileName: selectedFileName.value,
      ...tabData
    }
    tabs.value.push(tab)
  }
  activeTab.value = tabs.value.indexOf(tab)
  currentTab.value = tabs.value[activeTab.value]
  breadcrumbs.value = currentTab.value.breadcrumbs
}

function loadDirectoryOptions({ action, parentNode, searchQuery, callback }) {
  if (action === LOAD_ROOT_OPTIONS) {
    const rootPath = props.localPath
    fetchChildren(rootPath)
      .then(() => {
        callback()
      })
      .catch((error) => callback(error))
  } else if (action === LOAD_CHILDREN_OPTIONS) {
    fetchChildren(parentNode)
      .then((result) => {
        parentNode.children = result
        callback()
      })
      .catch((error) => callback(error))
  } else if (action === ASYNC_SEARCH) {
    fetchPathSuggestions(searchQuery)
      .then((results) => {
        const suggestions = results.map((p) => ({
          id: p,
          label: p,
          children: null
        }))
        callback(null, suggestions)
      })
      .catch((error) => callback(error))
  }
}

async function fetchPathSuggestions(query) {
  const response = await listRepos()
  if (response.data && Array.isArray(response.data)) {
    return response.data.map((repo) => repo.local_path).filter((p) => p.includes(query))
  }
  return []
}

function nodeNormalizer(node) {
  return {
    id: node.path,
    label: node.name,
    children: node.children,
    isLeaf: !node.isDirectory
  }
}

function handleOptionClick(option) {
  console.log('handleOptionClick', JSON.stringify(option))
}

function findNodeByPath(nodes, targetPath) {
  for (const node of nodes) {
    if (node.path === targetPath) return node
    if (node.children) {
      const found = findNodeByPath(node.children, targetPath)
      if (found) return found
    }
  }
  return null
}

// 懒加载节点点击时递归加载
async function handleNodeSelection(activeItems) {
  if (!activeItems.length) return
  const selectedPath = activeItems[activeItems.length - 1]
  const node = findNodeByPath(treeData.value, selectedPath)
  if (!node) return
  if (node.isDirectory) {
    if (node.children === null) {
      // 懒加载：递归加载该节点，深度从当前节点层级起
      const currentDepth =
        selectedPath.split(path.sep).length - treeData.value[0].path.split(path.sep).length + 1
      node.children = await getDirectoryTree(node.path, currentDepth, MAX_TREE_DEPTH)
    }
  } else {
    // 只允许打开指定后缀的文件
    const ext = path.extname(node.name).toLowerCase()
    const fileName = path.basename(node.name)
    if (!allowedExtensions.includes(ext) && !allowedFileName.includes(fileName)) {
      store.dispatch('snackbar/showSnackbar', {
        message: '该文件类型不支持预览',
        type: 'warning'
      })
      return
    }
    await loadFileByType(node.path)
    const breadcrumbPath = buildBreadcrumb(node.path)
    addOrSwitchTab({
      path: node.path,
      name: node.name,
      breadcrumbs: breadcrumbPath
    })
  }
}

function buildBreadcrumb(fullPath) {
  const parts = fullPath.split(path.sep).filter((p) => p)
  let currentPath = ''
  return parts.map((part, index) => {
    currentPath += (index ? path.sep : '') + part
    return { text: part, path: currentPath }
  })
}

function navigateTo(targetPath) {
  const node = findNodeByPath(treeData.value, targetPath)
  if (node) {
    openNodes.value = [targetPath]
    nextTick(() => {
      handleNodeSelection([targetPath])
    })
  }
}

function selectTab(tab) {
  addOrSwitchTab({
    path: tab.path,
    name: tab.name,
    breadcrumbs: tab.breadcrumbs
  })
  loadFileByType(tab.path)
}

function removeTab(index) {
  if (activeTab.value === index) {
    activeTab.value = index > 0 ? index - 1 : tabs.value.length > 1 ? 0 : null
  }
  tabs.value.splice(index, 1)
  fileContent.value = ''
}

function highlightCode(code, extension) {
  const language = extension ? extension.slice(1) : ''
  const validLang = hljs.getLanguage(language) ? language : 'plaintext'
  return hljs.highlight(code, { language: validLang }).value
}

function renderMarkdown(content) {
  return md.render(content)
}

async function fetchChildren(item) {
  if (!item.isDirectory) return []
  try {
    const children = await window.electron.readDirectory(item.path)
    children.sort((a, b) => b.mtime - a.mtime)
    // 构造节点并去除隐藏文件
    const map = children
      .map((child) => ({
        name: child.name,
        path: child.fullPath,
        isDirectory: child.isDirectory,
        children: child.isDirectory ? null : undefined
      }))
      .filter((child) => !child.name.startsWith('.'))
    // 目录一律展示；文件只要不在黑名单中就展示
    return map.filter(
      (child) =>
        child.isDirectory || !blacklistedExtensions.includes(path.extname(child.path).toLowerCase())
    )
  } catch (err) {
    console.error('加载子目录失败：', item.path, err)
    return []
  }
}

function convertBuffer(buffer) {
  if (buffer instanceof ArrayBuffer) return buffer
  if (buffer instanceof Uint8Array) return buffer.buffer
  if (buffer && buffer.data && Array.isArray(buffer.data)) return new Uint8Array(buffer.data).buffer
  if (buffer && buffer.buffer) {
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  }
  return buffer
}

async function renderDocx(buffer) {
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
    return result.value
  } catch (error) {
    console.error('DOCX 渲染失败：', error)
    return `<p>DOCX 渲染失败：${error.message}</p>`
  }
}

function renderXlsx(buffer) {
  try {
    const data = new Uint8Array(buffer)
    const workbook = XLSX.read(data, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    return XLSX.utils.sheet_to_html(worksheet)
  } catch (error) {
    console.error('XLSX 渲染失败：', error)
    return `<p>XLSX 渲染失败：${error.message}</p>`
  }
}

async function expandToPath(targetPath) {
  const homeDir = await window.electron.homeDir
  if (!targetPath.startsWith(homeDir)) return
  const relativePath = path.relative(homeDir, targetPath)
  const segments = relativePath.split(path.sep)
  let currentNode = treeData.value[0]
  let openPaths = [currentNode.path]
  for (const segment of segments) {
    if (!currentNode.children || currentNode.children.length === 0) {
      await fetchChildren(currentNode).then((children) => {
        currentNode.children = children
      })
    }
    const child = currentNode.children.find((child) => child.name === segment)
    if (!child) return
    openPaths.push(child.path)
    currentNode = child
  }
  openNodes.value = openPaths
  nextTick(() => {
    const targetId = 'node-' + currentNode.path.replace(/[^a-zA-Z0-9]/g, '-')
    const targetEl = document.getElementById(targetId)
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
  handleNodeSelection([currentNode.path])
}

async function openOutside(breadcrumbsArray, shouldFile) {
  if ((!breadcrumbsArray || breadcrumbsArray.length === 0) && !shouldFile) {
    store.dispatch('snackbar/showSnackbar', {
      message: '请先预览一个文件',
      type: 'error'
    })
    return
  }
  let url = breadcrumbsArray[breadcrumbsArray.length - 1].path
  if (url !== null) {
    const isFile = isFilePath(
      url,
      allowedExtensions,
      allowedFileName,
      findNodeByPath,
      treeData.value
    )
    // 只有在非 Windows 上才加 " / "
    const platform = await window.electron.platform
    if (platform !== 'win32') {
      url = '/' + url
    }
    const targetPath = shouldFile ? (isFile ? path.dirname(url) : url) : url
    await window.electron
      .checkPathExists(targetPath)
      .then(async (exists) => {
        if (exists) {
          if (!shouldFile) {
            // const ext = path.extname(targetPath).toLowerCase()
            // const mapping = customAppMapping[ext]
            // if (mapping) {
            //   const platform = await window.electron.platform
            //   const appName = mapping[platform]
            //   if (appName) {
            //     try {
            //       const appPath = await getAppPath(appName)
            //       await window.electron.openPathWithApp(targetPath, appPath).then((error) => {
            //         if (error) {
            //           store.dispatch('snackbar/showSnackbar', {
            //             message: `打开文件失败: ${error}`,
            //             type: 'error'
            //           })
            //         }
            //       })
            //       return
            //     } catch (error) {
            //       console.error('未找到应用程序:', appName, error)
            //     }
            //   }
            // }
          }
          await window.electron.shell.openPath(targetPath).then((error) => {
            if (error) {
              store.dispatch('snackbar/showSnackbar', {
                message: `打开文件失败: ${error}`,
                type: 'error'
              })
            }
          })
        } else {
          store.dispatch('snackbar/showSnackbar', {
            message: `路径不存在: ${targetPath}`,
            type: 'error'
          })
        }
      })
      .catch((err) => {
        store.dispatch('snackbar/showSnackbar', {
          message: `路径验证失败: ${err.message}`,
          type: 'error'
        })
      })
  }
}

// 使用导入的 isFilePath 函数判断文件路径，需要传入必要的参数

// 最大递归深度（可根据实际需求调整）
const MAX_TREE_DEPTH = 50

// 递归获取目录树，带深度阈值
async function getDirectoryTree(targetPath, depth = 0, maxDepth = MAX_TREE_DEPTH) {
  if (depth >= maxDepth) {
    return null // 达到阈值，children=null，前端可懒加载
  }
  let root
  try {
    root = await window.electron.readDirectory(targetPath)
  } catch (e) {
    return [] // 目录不可读
  }
  const filteredRoot = root.filter((child) => !child.name.startsWith('.'))
  return await Promise.all(
    filteredRoot.map(async (child) => {
      if (child.isDirectory) {
        const children = await getDirectoryTree(child.fullPath, depth + 1, maxDepth)
        return {
          name: child.name,
          path: child.fullPath,
          isDirectory: true,
          children: children // 可能为 null
        }
      } else {
        return {
          name: child.name,
          path: child.fullPath,
          isDirectory: false,
          children: undefined
        }
      }
    })
  )
}

// 重置目录树：仅在用户选定路径后调用
async function resetTree(newPath) {
  const targetPath = isFilePath(
    newPath,
    allowedExtensions,
    allowedFileName,
    findNodeByPath,
    treeData.value
  )
    ? path.dirname(newPath)
    : newPath
  try {
    const children = await getDirectoryTree(targetPath, 0, MAX_TREE_DEPTH)
    treeData.value = [
      {
        name: path.basename(targetPath),
        path: targetPath,
        isDirectory: true,
        children: children
      }
    ]
    openNodes.value = [targetPath]
  } catch (e) {
    console.error('路径加载失败:', e)
  }
}
async function loadPathSuggestions() {
  await listRepos()
    .then((response) => {
      if (!response.data || !Array.isArray(response.data)) {
        return
      }
      // 按id降序排序
      const sortedData = [...response.data].sort((a, b) => b.id - a.id)

      pathSuggestions.value = sortedData.map((repo) => ({
        value: repo.local_path,
        // 如果desc为空则只显示name，否则显示desc(name)
        title: repo.desc ? `${omit(repo.desc, 10)}(${repo.name})` : repo.name,
        repo_url: repo.local_path,
        branch: repo.branch,
        local_path: repo.local_path,
        username: repo.username,
        password: repo.password,
        name: repo.name,
        desc: repo.desc
      }))
    })
    .catch((err) => {
      console.error('获取仓库数据失败:', err)
    })
}
// ---------- 仓库拉取进度条 ----------
function startProgressSimulation(title = '正在拉取代码') {
  progress.value = 0
  progressTitle.value = title
  progressMessage.value = '正在初始化…'
  progressDialog.value = true

  if (progressTimer) clearInterval(progressTimer)
  progressTimer = setInterval(() => {
    if (progress.value < 90) {
      const inc = (90 - progress.value) / 10
      progress.value += Math.max(0.5, inc)
      progressMessage.value =
        progress.value < 30 ? '准备数据…' : progress.value < 60 ? '同步文件…' : '即将完成，请稍候…'
    }
  }, 200)
}

function completeProgress(success = true) {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
  if (success) {
    progress.value = 100
    progressMessage.value = '拉取完成！'
    setTimeout(() => {
      progressDialog.value = false
      progress.value = 0
    }, 800)
  } else {
    progressDialog.value = false
    progress.value = 0
  }
}

async function pull() {
  if (!pathSuggestions.value.length) return

  // ① 启动进度模拟
  startProgressSimulation()

  // ② 真正执行 pullRepo
  try {
    var repos = pathSuggestions.value
    for (const repo of repos) {
      if (newRootPath.value === repo.value) {
        console.log('拉取仓库：', repo)
        await pullRepo(repo)
      }
    }

    // ③ 成功：收尾
    completeProgress(true)
    store.dispatch('snackbar/showSnackbar', {
      message: '代码拉取成功',
      type: 'success'
    })

    await initializePage()
  } catch (err) {
    console.error('拉取失败:', err)
    completeProgress(false)
    const errorMsg =
      err.response?.data || err.message || (newRootPath.value ? '更新仓库失败' : '新增仓库失败')
    store.dispatch('snackbar/showSnackbar', {
      message: `拉取失败：${errorMsg}`,
      type: 'error'
    })
  }
}

// 预览仓库内容，使用 Vue Router 进行跳转
const previewIde = (path) => {
  if (path) {
    // 构建路由参数
    const rootDir = path

    // 构建带参数的URL
    const url = `${window.location.origin}/#/ide/${encodeURIComponent(path)}?rootPath=${encodeURIComponent(rootDir)}`

    // 调用主进程打开新窗口
    window.electron.openNewWindowIDE(url)
  } else {
    alert('请先打开一个仓库')
  }
}

// 在IDE中打开当前文件或目录
const openInIDE = (filePath) => {
  // 如果没有指定文件路径，则使用当前选中的文件或目录
  const pathToOpen = filePath || (currentTab.value ? currentTab.value.path : newRootPath.value)

  if (!pathToOpen) {
    store.dispatch('snackbar/showSnackbar', {
      message: '请先选择一个文件或目录',
      type: 'warning'
    })
    return
  }

  // 构建路由参数
  const rootDir = isFilePath(
    pathToOpen,
    allowedExtensions,
    allowedFileName,
    findNodeByPath,
    treeData.value
  )
    ? path.dirname(pathToOpen)
    : pathToOpen

  // 构建带参数的URL
  const url = `${window.location.origin}/#/ide/${encodeURIComponent(pathToOpen)}?rootPath=${encodeURIComponent(rootDir)}`

  // 调用主进程打开新窗口，并传递URL参数
  window.electron.openNewWindowIDE(url)
}

// 监听 props 和响应式数据变化
watch(
  () => props.localPath,
  (newPath) => {
    // 清空文件内容和预览区域，防止切换目录时残留上次的内容
    fileContent.value = ''
    renderedDocx.value = ''
    renderedXlsx.value = ''
    selectedFileUrl.value = ''
    selectedFileName.value = ''

    if (newPath) {
      // 重置标签页和其他状态
      tabs.value = []
      activeTab.value = null

      initialize(newPath).finally(() => {
        loading.value = false
      })
    }
  }
)
watch(activeTab, (newIndex) => {
  if (tabs.value[newIndex]) {
    restoreState(tabs.value[newIndex])
  }
})
watch(treeselectValue, (newVal) => {
  if (newVal) {
    handleNodeSelection([newVal])
  }
})

// 生命周期挂载时执行初始化
onMounted(() => {
  initializePage()
})

// 组件激活时重新检查主题（解决返回页面时样式不一致的问题）
onActivated(() => {
  // 重新检查并加载正确的主题样式
  checkTheme()
  console.log('[FileBrowser] 组件激活，重新检查主题样式')
})
</script>

<style scoped>
pre {
  font-size: 0.9rem;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
:deep(.v-card) {
  min-height: 200px;
}
:deep(.v-application) {
  height: 100%;
}
html,
body {
  height: 100%;
  overflow: hidden;
}
:deep(.vue-treeselect__menu) {
  height: 1000px !important;
  max-height: 1000px !important;
  overflow: auto;
  background: rgb(var(--v-theme-tertiary)) !important;
  :deep(.vue-treeselect__label) {
    color: rgb(var(--v-theme-on-tertiary)) !important;
    background: rgb(var(--v-theme-tertiary)) !important;
  }
}
:deep(.vue-treeselect__option--highlight) {
  background: rgb(var(--v-theme-tertiary)) !important;
  color: rgb(var(--v-theme-on-tertiary)) !important;
}
:deep(.vue-treeselect__control) {
  background: rgb(var(--v-theme-tertiary)) !important;
  color: rgb(var(--v-theme-on-tertiary)) !important;
}
.breadcrumb-container {
  overflow-x: auto;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  max-width: 100%;
}
.breadcrumb-container::-webkit-scrollbar {
  height: 4px;
}
.breadcrumb-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.breadcrumb-container::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 2px;
}
:deep(.v-breadcrumbs) {
  flex-wrap: nowrap;
  min-width: min-content;
}
/* 动态加载容器 */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

/* 动态加载SVG（也可增加动画效果） */
.loading-svg {
  width: 80px;
  height: auto;
}
:deep(.v-slide-group__container, .v-tabs) {
}
:deep(.vue-treeselect--single .vue-treeselect__option--selected) {
  background: rgb(var(--v-theme-on-surface-variant)) !important;
  color: rgb(var(--v-theme-surface-variant)) !important;
}
/* 默认（亮色模式）的样式 */
.hljs {
  background-color: #f5f5f5; /* 亮色背景 */
  color: #333333; /* 亮色文本 */
}

.hljs-keyword {
  color: #1a73e8; /* 亮色模式下关键字颜色 */
}

.hljs-string {
  color: #d14; /* 亮色模式下字符串颜色 */
}

.hljs-comment {
  color: #888; /* 亮色模式下注释颜色 */
}

/* 暗黑模式的样式 */
@media (prefers-color-scheme: dark) {
  .hljs {
    background-color: #000000; /* 暗色背景 */
    color: #dcdcdc; /* 暗色文本 */
  }

  .hljs-keyword {
    color: #ff6347; /* 暗色模式下关键字颜色 */
  }

  .hljs-string {
    color: #32cd32; /* 暗色模式下字符串颜色 */
  }

  .hljs-comment {
    color: #808080; /* 暗色模式下注释颜色 */
  }
}
.preview-content pre {
  /* 保持原有空格格式，不自动换行 */
  white-space: pre; /* 强制按照原始空白和换行显示 */
  word-wrap: normal; /* 禁用单词换行 */
  word-break: normal; /* 禁用任意字符换行 */

  /* 横向滚动条，超出宽度时显示 */
  overflow-x: auto;
  overflow-y: hidden; /* 可选：隐藏垂直滚动条 */

  font-size: 0.8rem;
}
.preview-content code.hljs {
  white-space: pre !important;
}
</style>
