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

    <div v-else style="height: 90vh">
      <!-- 主内容区 -->
      <v-row>
        <v-toolbar class="mb-1">
          <v-toolbar-title>
            <v-icon>mdi-code-block-tags</v-icon>
          </v-toolbar-title>
          <div class="d-flex align-center ml-auto">
            <v-autocomplete
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
              style="min-width: 400px; max-width: 400px; height: auto"
              @focus="loadPathSuggestions"
              @update:menu="resetRoot"
            ></v-autocomplete>
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
          </div>
        </v-toolbar>
      </v-row>

      <v-row style="display: flex; height: calc(100% - 80px)">
        <!-- 左侧目录树 -->
        <v-col
          cols="12"
          md="4"
          lg="3"
          class="mb-4"
          style="width: 300px; max-width: 300px; position: relative"
        >
          <v-card outlined class="pa-2 h-100" style="height: 100vh; overflow: auto">
            <v-card-title class="subtitle-1">访达目录树</v-card-title>
            <v-divider></v-divider>
            <Treeselect
              v-model="treeselectValue"
              :options="treeData"
              :normalizer="nodeNormalizer"
              placeholder="选择目录树..."
              :item="['123', '321']"
              item-key="path"
              :load-options="loadDirectoryOptions"
              :multiple="false"
              :searchable="true"
              :clearable="true"
              :auto-load-root-options="true"
              :always-open="true"
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
          style="width: 72%; max-width: 72%"
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
                <span
                  style="cursor: pointer"
                  class="text-blue-grey-darken-4"
                  @click="selectTab(tab)"
                  >{{ tab.name }}</span
                >
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
                <h1 style="margin-top: 16px; user-select: none; pointer-events: none">代码详情</h1>
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
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import mammoth from 'mammoth'
import { LOAD_ROOT_OPTIONS, LOAD_CHILDREN_OPTIONS, ASYNC_SEARCH } from 'vue3-treeselect'
import path from 'path-browserify'
import Treeselect from 'vue3-treeselect'
import 'vue3-treeselect/dist/vue3-treeselect.css'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import * as XLSX from 'xlsx'
import codeSVG from '../assets/code.svg'
import { listRepos, pullRepo } from '../service/api.js'
import dynamicLoadingSvg from '../assets/load.svg'
// Vuex store（假定已配置）
const store = useStore()
// computed 用于展现 snackbar 数据（减少不必要的更新）
const snackbar = computed(() => store.state.snackbar)

// 定义 props（支持传入本地路径及一些控制参数）
const props = defineProps({
  localPath: {
    type: String,
    default: ''
  },
  forceReplace: {
    type: Boolean,
    default: false
  },
  forceDeep: {
    type: Boolean,
    default: false
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
  'xls',
  '.xlsx',
  '.doc',
  '.docx',
  '.sql'
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
  highlight: (str, lang) => {
    const validLang = hljs.getLanguage(lang) ? lang : 'plaintext'
    return hljs.highlight(str, { language: validLang }).value
  }
})

// 计算属性：是否为代码文件（非 Markdown）
const isCodeFile = computed(() => {
  const ext = path.extname(selectedFileName.value).toLowerCase()
  return allowedExtensions.includes(ext) && !isMarkdown(selectedFileName.value)
})

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
  if (props.forceReplace && initialPath) {
    newRootPath.value = initialPath
    rootDir = isFilePath(initialPath) ? path.dirname(initialPath) : initialPath
  } else {
    rootDir = await window.electron.homeDir
  }
  if (rootDir) {
    await resetTree(rootDir)
    if (initialPath) {
      if (props.forceReplace) {
        isFilePath(initialPath) ? expandToPath(initialPath) : handleNodeSelection([rootDir])
      } else {
        expandToPath(initialPath)
      }
      if (isFilePath(initialPath)) {
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
      const content = await window.electron.readFile(selectedPath, { encoding: 'utf-8' })
      updateFileState(selectedPath, { fileContent: content })
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
    fetchChildren(props.localPath || '/')
      .then((children) => {
        callback()
      })
      .catch((error) => callback(error))
  } else if (action === LOAD_CHILDREN_OPTIONS) {
    fetchChildren(parentNode)
      .then((children) => {
        parentNode.children = children
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

async function handleNodeSelection(activeItems) {
  if (!activeItems.length) return
  const selectedPath = activeItems[activeItems.length - 1]
  const node = findNodeByPath(treeData.value, selectedPath)
  if (!node) return
  if (node.isDirectory) {
    if (node.children === null) {
      await fetchChildren(node)
    }
  } else {
    if (!allowedExtensions.includes(path.extname(node.name).toLowerCase())) {
      store.dispatch('snackbar/showSnackbar', {
        message: '不支持的文件类型：' + node.name,
        type: 'error'
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

function highlightCode(code, ext) {
  const language = ext.slice(1)
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
    let map = children
      .map((child) => ({
        name: child.name,
        path: child.fullPath,
        isDirectory: child.isDirectory,
        children: child.isDirectory ? null : undefined
      }))
      .filter((child) => !child.name.startsWith('.'))
    return map.filter(
      (child) =>
        child.isDirectory || allowedExtensions.includes(path.extname(child.path).toLowerCase())
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

async function getAppPath(appName) {
  try {
    const appPath = await window.electron.getAppPathIPC(appName)
    if (!appPath) throw new Error(`获取的应用路径为空: ${appName}`)
    return appPath
  } catch (err) {
    console.error('获取应用路径失败:', err)
  }
}

async function openOutside(breadcrumbsArray, shouldFile) {
  if (!breadcrumbsArray || breadcrumbsArray.length === 0) {
    store.dispatch('snackbar/showSnackbar', {
      message: '请先预览一个文件',
      type: 'error'
    })
    return
  }
  let url = breadcrumbsArray[breadcrumbsArray.length - 1].path
  if (url !== null) {
    const isFile = isFilePath(url)
    // 只有在非 Windows 上才加 “/”
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
            const ext = path.extname(targetPath).toLowerCase()
            const mapping = customAppMapping[ext]
            if (mapping) {
              const platform = await window.electron.platform
              const appName = mapping[platform]
              if (appName) {
                try {
                  const appPath = await getAppPath(appName)
                  await window.electron.openPathWithApp(targetPath, appPath).then((error) => {
                    if (error) {
                      store.dispatch('snackbar/showSnackbar', {
                        message: `打开文件失败: ${error}`,
                        type: 'error'
                      })
                    }
                  })
                  return
                } catch (error) {
                  console.error('未找到应用程序:', appName, error)
                }
              }
            }
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

function isFilePath(filePath) {
  return allowedExtensions.includes(path.extname(filePath).toLowerCase())
}

async function resetTree(newPath) {
  const targetPath = isFilePath(newPath) ? path.dirname(newPath) : newPath
  try {
    const root = await window.electron.readDirectory(targetPath)
    root.sort((a, b) => b.mtime - a.mtime)
    const filteredRoot = root.filter((child) => !child.name.startsWith('.'))
    treeData.value = [
      {
        name: path.basename(targetPath),
        path: targetPath,
        isDirectory: true,
        children: filteredRoot.map((child) => ({
          name: child.name,
          path: child.fullPath,
          isDirectory: child.isDirectory,
          children: child.isDirectory ? null : undefined
        }))
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
      pathSuggestions.value = response.data.map((repo) => ({
        value: repo.local_path,
        title: `${repo.desc}(${repo.name})`,
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
  } catch (err) {
    console.error('拉取失败:', err)
    completeProgress(false)
    store.dispatch('snackbar/showSnackbar', {
      message: `拉取失败：${err.message || err}`,
      type: 'error'
    })
  }
}

// 监听 props 和响应式数据变化
watch(
  () => props.localPath,
  (newPath) => {
    if (newPath) {
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
:deep(.v-tabs) {
  background: white;
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
  background: #f8f8f8;
  :deep(.vue-treeselect__label) {
    color: #292929;
    background: #f8f8f8;
  }
}
:deep(.v-slide-group__container) {
  background: #f4f4f4;
  border-radius: 10px;
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
</style>
