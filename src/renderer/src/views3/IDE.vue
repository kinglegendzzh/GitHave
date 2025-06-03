<template>
  <v-container fluid class="cover-fill" style="height: 100vh">
    <!-- Loading Spinner -->
    <v-row v-if="loading" align="center" justify="center" style="height: 100vh">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate color="primary" size="70" />
      </v-col>
    </v-row>

    <!-- Main Content -->
    <div v-else style="height: 100%">
      <!-- Toolbar -->
      <v-row>
        <!-- 替换原来的 v-toolbar -->
        <v-toolbar flat density="compact">
          <v-toolbar-title style="user-select: none; pointer-events: none">
            <v-icon>mdi-code-block-tags</v-icon>
            <span style="border: 5px; padding: 0 4px"> GitHave IDE </span>
          </v-toolbar-title>
          <div class="d-flex align-center ml-auto">
            <v-autocomplete
              v-model="newRootPath"
              :items="pathSuggestions"
              label="选择代码仓库..."
              outlined
              dense
              clearable
              hide-details
              density="compact"
              item-title="title"
              item-value="value"
              color="warning"
              style="width: 400px"
              @focus="loadPathSuggestions"
              @update:model-value="onPathSelectionChanged"
            />
            <!-- NEW ─ 主题切换 -->
            <v-select
              v-model="currentTheme"
              :items="themeOptions"
              label="主题外观"
              dense
              clearable
              hide-details
              density="compact"
              style="width: 200px"
            >
              <!--              <template #prepend>🌗</template>-->
            </v-select>

            <!-- NEW ─ 格式化按钮 -->
            <v-btn
              icon="mdi-format-align-left"
              :disabled="!isCodeFileName(selectedFileName)"
              title="格式化 (Shift+Alt+F)"
              @click="formatDocument"
            />
            <v-tooltip text="保存代码 (Ctrl+S)">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon
                  :disabled="!isCodeFileName(selectedFileName)"
                  title="保存代码 (Ctrl+S)"
                  @click="saveDocument"
                >
                  <v-icon size="18">mdi-content-save</v-icon>
                </v-btn>
              </template>
            </v-tooltip>

            <v-tooltip text="更新代码">
              <template #activator="{ props }">
                <v-btn v-bind="props" outlined plain @click="pull()">
                  <v-icon>mdi-git</v-icon>
                </v-btn>
              </template>
            </v-tooltip>

            <!-- 其余按钮保持 -->
            <v-tooltip text="从本地目录打开">
              <template #activator="{ props }">
                <v-btn v-bind="props" outlined plain @click="openOutside(breadcrumbs, true)">
                  <v-icon>mdi-folder-eye</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
            <v-tooltip text="从本地应用程序打开">
              <template #activator="{ props }">
                <v-btn v-bind="props" outlined plain @click="openOutside(breadcrumbs, false)">
                  <v-icon>mdi-file-search-outline</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
          </div>
        </v-toolbar>
      </v-row>

      <v-row style="display: flex; height: calc(100% - 10px)">
        <!-- Left Tree -->
        <v-col cols="12" md="4" lg="3" style="width: 200px; max-width: 300px; position: relative">
          <v-card outlined class="pa-2 h-100" style="height: 100vh; overflow: auto">
            <Treeselect
              v-model="treeselectValue"
              :options="treeData"
              :normalizer="nodeNormalizer"
              placeholder="访达目录树..."
              item-key="path"
              :load-options="loadDirectoryOptions"
              :multiple="false"
              :searchable="true"
              :clearable="true"
              :auto-load-root-options="true"
              :always-open="true"
              :open-nodes="openNodes"
              :default-expand-level="1"
              class="mt-2"
              style="min-width: 800px"
              :menu-height="1000"
              @click="handleOptionClick"
            />
          </v-card>
        </v-col>

        <!-- Right Preview & Tabs -->
        <v-col
          cols="12"
          md="8"
          lg="9"
          style="width: 74%; max-width: 74%"
          class="mb-4 d-flex flex-column h-100"
        >
          <!-- Tabs & Breadcrumb -->
          <div class="flex-shrink-0">
            <v-tabs v-model="activeTab">
              <v-tab v-for="(tab, index) in tabs" :key="tab.path" class="d-flex align-center">
                <v-icon color="error" style="cursor: pointer" @click.stop="removeTab(index)"
                  >mdi-close</v-icon
                >
                <span style="cursor: pointer" @click="selectTab(tab)">{{ tab.name }}</span>
              </v-tab>
            </v-tabs>
            <div class="breadcrumb-container">
              <v-breadcrumbs :items="breadcrumbs">
                <template #item="{ item }">
                  <v-breadcrumbs-item @click="navigateTo(item.path)">{{
                    item.text
                  }}</v-breadcrumbs-item>
                </template>
              </v-breadcrumbs>
            </div>
          </div>
          <v-divider></v-divider>

          <!-- Preview Card -->
          <v-card tonal class="flex-grow-1" style="height: 100%; overflow-y: auto">
            <v-card-text style="height: 100%">
              <div v-if="selectedFileName" class="preview-content" style="height: 100%">
                <!-- PDF -->
                <iframe
                  v-if="isPDF(selectedFileName)"
                  :src="getPDFUrl()"
                  style="width: 100%; height: 100%"
                  frameborder="0"
                />

                <!-- DOCX -->
                <div v-else-if="isDocx(selectedFileName)">
                  <div v-if="renderedDocx" v-html="renderedDocx" />
                  <div v-else>加载 DOCX 中...</div>
                </div>

                <!-- XLSX -->
                <div v-else-if="isXlsx(selectedFileName)">
                  <div v-if="renderedXlsx" v-html="renderedXlsx" />
                  <div v-else>加载 XLSX 中...</div>
                </div>

                <!-- Code Preview with Monaco -->
                <div class="h-100">
                  <keep-alive>
                    <Suspense>
                      <template #default>
                        <MonacoEditor
                          v-model:value="fileContent"
                          :language="detectedLanguage"
                          :theme="currentTheme"
                          :options="monacoOptions"
                          @editor-mounted="onEditorMounted"
                        />
                      </template>
                      <template #fallback>
                        <div class="text-center">加载编辑器中…</div>
                      </template>
                    </Suspense>
                  </keep-alive>
                </div>
              </div>

              <!-- Placeholder -->
              <div v-else class="text-center">
                <img
                  :src="placeholderImage"
                  alt="Chart Placeholder"
                  draggable="false"
                  style="max-width: 100%; max-height: 100%; user-select: none; pointer-events: none"
                />
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Snackbar -->
      <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">{{
        snackbar.message
      }}</v-snackbar>
    </div>

    <!-- Progress Dialog -->
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
// 1) 导入 worker 构造器（路径视你的依赖版本和打包器语法而定）
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker.js?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker.js?worker'

// 2) 注入到全局
// window.MonacoEnvironment = {
//   getWorker: (_moduleId, label) => {
//     if (label === 'json') {
//       return new JsonWorker()
//     }
//     if (label === 'typescript' || label === 'javascript') {
//       return new TsWorker()
//     }
//     // 默认就是编辑器本身的 worker
//     return new EditorWorker()
//   }
// }
import 'vue3-treeselect/dist/vue3-treeselect.css'
import 'highlight.js/styles/atom-one-dark.css'
import {
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  nextTick,
  onUnmounted,
  defineAsyncComponent,
  Suspense
} from 'vue'
import { debounce } from 'lodash-es'
import LoadingSpinner from '../components/LoadingSpinner.vue'
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
import codeSVG from '../assets/editor-mockup.svg'
import codeSVGWhite from '../assets/editor-mockup-white.svg'
import { listRepos, pullRepo } from '../service/api.js'
import { VSelect } from 'vuetify/components'
import dynamicLoadingSvg from '../assets/load.svg'
import { omit } from '../service/str'
// 让 Monaco 能正确加载 worker
const store = useStore()
// computed 用于展现 snackbar 数据（减少不必要的更新）
const snackbar = computed(() => store.state.snackbar)

const MonacoEditor = defineAsyncComponent({
  loader: () => import('monaco-editor-vue3'),
  loadingComponent: LoadingSpinner,
  delay: 200,
  timeout: 10000
})

// 原 loadFileByType 保持不变
const debouncedLoad = debounce((path) => loadFileByType(path), 200)

/* ----------------------------------------------------------
   Monaco Editor State & Utils
---------------------------------------------------------- */

const editorRef = ref(null)
/**
 * 通过文件扩展名推断 Monaco 语言
 */
const languageMap = {
  js: 'javascript',
  ts: 'typescript',
  vue: 'javascript',
  java: 'java',
  go: 'go',
  py: 'python',
  rb: 'ruby',
  c: 'c',
  h: 'c',
  glsl: 'c',
  cpp: 'cpp',
  html: 'html',
  css: 'css',
  json: 'json',
  xml: 'xml',
  sh: 'shell',
  php: 'php',
  sql: 'sql',
  md: 'markdown',
  yaml: 'yaml',
  yml: 'yaml',
  jsx: 'javascript',
  tsx: 'typescript'
}
const selectedPath = ref('') // 记录当前打开的文件完整路径
// 保存逻辑
async function saveDocument() {
  if (!selectedPath.value) return

  try {
    console.log('saveDocument', selectedPath.value, fileContent.value)
    await window.electron.saveFile(selectedPath.value, fileContent.value, { encoding: 'utf-8' })
    // 保存后重新读取并刷新当前 Tab
    await loadFileByType(selectedPath.value)
    if (currentTab.value && currentTab.value.path === selectedPath.value) {
      currentTab.value.fileContent = fileContent.value
    }
    store.dispatch('snackbar/showSnackbar', {
      message: '文件已保存',
      type: 'success'
    })
  } catch (err) {
    store.dispatch('snackbar/showSnackbar', {
      message: `保存失败：${err.message}`,
      type: 'error'
    })
  }
}
// 可选：监听 Ctrl+S 快捷键
onMounted(() => {
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      saveDocument()
    }
  })
})
onUnmounted(() => {
  window.removeEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      saveDocument()
    }
  })
})
const detectedLanguage = computed(() => {
  const ext = path.extname(selectedFileName.value).slice(1).toLowerCase()
  return languageMap[ext] || 'shell'
})

const monacoOptions = reactive({
  readOnly: false,
  automaticLayout: true,
  wordWrap: 'on',
  minimap: { enabled: true },
  scrollBeyondLastLine: false,
  quickSuggestions: true,
  fontSize: 14
})

/* NEW ─ 供按钮/快捷键调用的格式化函数 */
function formatDocument() {
  const ed = editorRef.value?.getMonacoEditor?.()
  ed?.getAction('editor.action.formatDocument').run()
}

let monacoGlobal

/* NEW ─ onEditorMounted：注册快捷键、补全、装饰 */
function onEditorMounted(editor) {
  // 拿到 Monaco 的全局对象
  monacoGlobal = editor.$monaco

  // 1. 强制开启触发字符补全和片段建议
  editor.updateOptions({
    suggestOnTriggerCharacters: true,
    snippetSuggestions: 'inline'
  })

  // 2. 获取当前模型的语言 ID
  const model = editor.getModel()
  const langId = model.getLanguageId()

  // 3. 针对当前语言注册补全 provider
  monacoGlobal.languages.registerCompletionItemProvider(langId, {
    triggerCharacters: ['.'],
    provideCompletionItems: () => {
      return {
        suggestions: [
          {
            label: 'helloWorld',
            kind: monacoGlobal.languages.CompletionItemKind.Snippet,
            insertText: 'console.log("Hello, Monaco!");',
            // 确保这是以 snippet 形式插入
            insertTextRules: monacoGlobal.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '打印 "Hello, Monaco!" 到控制台'
          }
        ]
      }
    }
  })

  // 2. 自定义保存快捷键 Ctrl/Cmd+S → 格式化当前文档
  editor.addCommand(monacoGlobal.KeyMod.CtrlCmd | monacoGlobal.KeyCode.KeyS, () =>
    editor.getAction('editor.action.formatDocument').run()
  )

  // 3. 行高亮装饰示例
  const deco = editor.deltaDecorations(
    [],
    [
      {
        range: new monacoGlobal.Range(1, 1, 1, 1),
        options: { isWholeLine: true, className: 'myLineHighlight' }
      }
    ]
  )
  editor.onDidDispose(() => editor.deltaDecorations(deco, []))
}

// 你的主题列表
const themeOptions = ['vs-dark', 'vs-light', 'hc-black']

import { useTheme } from 'vuetify'

// 拿到 Vuetify 全局 theme 对象
const theme = useTheme()

// 根据 Vuetify 主题 name（'light' | 'dark'）算出一个布尔值
const isDarkMode = computed(() => theme.global.name.value === 'dark')

// 监听 Vuetify 主题切换
// watch(isDarkMode, dark => {
//   const t = dark ? 'vs-dark' : 'vs-light'
//   currentTheme.value = t
// }, { immediate: true })

// 1️⃣ 初始化：优先用 localStorage，fallback 到系统（Vuetify）主题
const saved = localStorage.getItem('ideTheme')

const currentTheme = ref(
  saved && themeOptions.includes(saved)
    ? saved
    : theme.global.name.value === 'dark'
      ? 'vs-dark'
      : 'vs-light'
)

// 2️⃣ 监听并持久化，同时同步切 Vuetify light/dark
watch(
  currentTheme,
  (val) => {
    // 存
    localStorage.setItem('ideTheme', val)
    // 同步 Vuetify 模式
    theme.global.name.value = val === 'vs-light' ? 'light' : 'dark'
  },
  { immediate: true }
)

// 占位图也跟着 currentTheme 切
const placeholderImage = computed(() =>
  currentTheme.value === 'vs-light' ? codeSVGWhite : codeSVG
)

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
  '.h',
  '.glsl',
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
  '.inc',
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
const blacklistedExtensions = ['.zip', '.rar', '.7z', '.dmg', '.exe', '.tar', '.gz', '.iso', '.apk']
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

// 递归加载子目录时的阈值，超出则懒加载
const CHILDREN_THRESHOLD = 100

async function initializePage() {
  loading.value = true
  try {
    if (props.localPath) {
      // 确定根目录路径
      // 如果传入的是文件路径，则使用其所在目录作为根目录
      // 如果传入的是目录路径，则直接使用该目录作为根目录
      const rootDir = isFilePath(props.localPath) ? path.dirname(props.localPath) : props.localPath

      // 初始化目录树
      await resetTree(rootDir)

      // 如果是文件路径，则展开到该文件并加载文件内容
      if (isFilePath(props.localPath)) {
        // 展开到文件所在路径
        await expandToPath(props.localPath)

        // 检查文件类型是否支持
        const fileExt = path.extname(props.localPath).toLowerCase()
        const fileName = path.basename(props.localPath)

        const isAllowedFile =
          allowedExtensions.includes(fileExt) || allowedFileName.includes(fileName) || !fileExt // 无扩展名的文件也允许打开

        // 检查是否在黑名单中
        const isBlacklisted = blacklistedExtensions.includes(fileExt)

        if (isAllowedFile && !isBlacklisted) {
          // 加载文件内容
          await loadFileByType(props.localPath)

          // 构建面包屑路径
          const breadcrumbPath = buildBreadcrumb(props.localPath)

          // 添加或切换到对应的标签页
          addOrSwitchTab({
            path: props.localPath,
            name: path.basename(props.localPath),
            breadcrumbs: breadcrumbPath
          })
        } else {
          // 显示不支持的文件类型警告
          store.dispatch('snackbar/showSnackbar', {
            message: `不支持的文件类型: ${fileExt || '无扩展名'}`,
            type: 'warning'
          })

          // 仍然选择文件所在目录
          handleNodeSelection([rootDir])
        }
      } else {
        // 如果是目录路径，则选择该目录
        handleNodeSelection([rootDir])
      }

      // 更新路径选择器的值
      newRootPath.value = rootDir
    } else {
      loading.value = false
      // 没有路径时不加载任何目录树
    }
  } catch (e) {
    console.error('初始化过程出错：', e)
    store.dispatch('snackbar/showSnackbar', {
      message: `初始化失败: ${e.message}`,
      type: 'error'
    })
  } finally {
    loading.value = false
  }
}

async function initialize(initialPath) {
  if (!initialPath) return
  let rootDir = isFilePath(initialPath) ? path.dirname(initialPath) : initialPath
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

  // 禁止打开无后缀或非允许类型的文件
  const ext = path.extname(selectedPath).toLowerCase()
  const fileName = path.basename(selectedPath)
  if (!allowedExtensions.includes(ext) && !allowedFileName.includes(fileName)) {
    store.dispatch('snackbar/showSnackbar', {
      message: '该文件类型不支持预览',
      type: 'warning'
    })
    return
  }

  // 早于任何读取操作新增：
  if (blacklistedExtensions.includes(ext)) {
    store.dispatch('snackbar/showSnackbar', {
      message: `暂不支持在线预览 "${ext}" 文件`,
      type: 'warning'
    })
    return // ⛔ 直接跳过，绝不 readFile
  }

  // —— 真正开始按类型读取文件 ——
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

    /* 1️⃣ 读取代码文件时，先把当前内容存入 original，再读取新内容 */
    if (isFilePath(selectedPath)) {
      const prev = fileContent.value
      const content = await window.electron.readFile(selectedPath, { encoding: 'utf-8' })
      fileContent.value = content
    }
  } catch (err) {
    console.error('加载文件失败：', err)
    updateFileState(selectedPath, { fileContent: `读取文件失败：${err.message}` })
  }
}

/* 2️⃣ 判断代码文件的通用函数（路径或文件名都能用）*/
function isCodeFileName(name) {
  const ext = path.extname(name).toLowerCase()
  const fileName = path.basename(name)
  return allowedExtensions.includes(ext) || allowedFileName.includes(fileName)
}

function updateFileState(sp, updates) {
  selectedPath.value = sp
  selectedFileName.value = path.basename(sp)
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
    // 检查文件类型是否支持预览，如果不支持则不添加标签页
    const ext = path.extname(node.path).toLowerCase()
    const fileName = path.basename(node.path)
    const isAllowedFile = allowedExtensions.includes(ext) || allowedFileName.includes(fileName)
    const isBlacklisted = blacklistedExtensions.includes(ext)

    if (!isAllowedFile || isBlacklisted) {
      // 不支持的文件类型，显示提示但不添加标签页
      store.dispatch('snackbar/showSnackbar', {
        message: `暂不支持在线预览 "${ext || fileName}" 文件`,
        type: 'warning'
      })
      return // 直接返回，不添加标签页
    }

    // 文件类型支持，加载文件并添加标签页
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

// 递归加载所有子目录和文件，超阈值则懒加载
async function fetchChildren(item, depth = 0) {
  if (!item.isDirectory) return []
  try {
    const children = await window.electron.readDirectory(item.path)
    children.sort((a, b) => b.mtime - a.mtime)
    const visibleChildren = children.filter((child) => !child.name.startsWith('.'))
    // 超过阈值则懒加载
    if (visibleChildren.length > CHILDREN_THRESHOLD) {
      return visibleChildren.map((child) => ({
        name: child.name,
        path: child.fullPath,
        isDirectory: child.isDirectory,
        children: child.isDirectory ? null : undefined // 懒加载
      }))
    }
    // 否则递归加载所有子目录
    const result = []
    for (const child of visibleChildren) {
      let node = {
        name: child.name,
        path: child.fullPath,
        isDirectory: child.isDirectory,
        children: undefined
      }
      if (child.isDirectory) {
        node.children = await fetchChildren(
          {
            path: child.fullPath,
            isDirectory: child.isDirectory
          },
          depth + 1
        )
      }
      result.push(node)
    }
    return result
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
  if ((!breadcrumbsArray || breadcrumbsArray.length === 0) && !shouldFile) {
    store.dispatch('snackbar/showSnackbar', {
      message: '请先预览一个文件',
      type: 'error'
    })
    return
  }
  let url = breadcrumbsArray[breadcrumbsArray.length - 1].path
  if (url !== null) {
    const isFile = isFilePath(url)
    // 只有在非 Windows 上才加 "/"
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

function isFilePath(filePath) {
  // 先通过树结构判断：若找到节点，就以节点的isDirectory为准
  const node = findNodeByPath(treeData.value, filePath)
  if (node) {
    if (node.isDirectory) return false
    const ext = path.extname(node.name).toLowerCase()
    const fileName = path.basename(node.name)
    return (
      (ext && allowedExtensions.includes(ext)) || (fileName && allowedFileName.includes(fileName))
    )
  }
  const ext = path.extname(filePath).toLowerCase()
  const fileName = path.basename(filePath)
  return (
    (ext && allowedExtensions.includes(ext)) || (fileName && allowedFileName.includes(fileName))
  )
}

async function resetTree(newPath) {
  const targetPath = isFilePath(newPath) ? path.dirname(newPath) : newPath
  try {
    const rootChildren = await fetchChildren({ path: targetPath, isDirectory: true })
    treeData.value = [
      {
        name: path.basename(targetPath),
        path: targetPath,
        isDirectory: true,
        children: rootChildren
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
        // 如果desc为空则只显示name,否则显示desc(name)
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
    debouncedLoad(newVal)
  }
})

// 生命周期挂载时执行初始化
onMounted(() => {
  initializePage()
})
</script>

<style>
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
body {
  background-color: rgba(var(--v-theme-surface-rgb), 1) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
}

@media (prefers-color-scheme: dark) {
  body {
    background-color: rgba(var(--v-theme-surface-rgb), 1) !important;
    color: rgb(var(--v-theme-on-surface)) !important;
  }
}
html,
body {
  height: 100%;
  overflow: hidden;
}
.vue-treeselect__menu {
  height: 1000px !important;
  max-height: 1000px !important;
  overflow: auto;
  background: rgb(var(--v-theme-tertiary)) !important;
  .vue-treeselect__label {
    color: rgb(var(--v-theme-on-tertiary)) !important;
    background: rgb(var(--v-theme-tertiary)) !important;
  }
}
.vue-treeselect__option--highlight {
  background: rgb(var(--v-theme-tertiary)) !important;
  color: rgb(var(--v-theme-on-tertiary)) !important;
}
.vue-treeselect__control {
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
.v-breadcrumbs {
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

.monaco-container {
  width: 100%;
  height: 100%;
}
.myLineHighlight {
  background: rgba(255, 200, 0, 0.15);
}

.mac-toolbar {
  /* 以 surface 色为底，半透明度 20% */
  background: rgba(var(--v-theme-surface-rgb), 0.2) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  backdrop-filter: blur(20px);
  padding: 0 12px !important;
  box-shadow: inset 0 -1px 0 rgba(var(--v-theme-on-surface-rgb), 0.1);
}

.mac-toolbar {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #000 !important;
}

.v-theme--dark .mac-toolbar {
  background: rgba(0, 0, 0, 0.2) !important;
  color: #fff !important;
}

/* 左侧菜单组 */
.mac-menu-group {
  display: flex;
  align-items: center;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 12px;
  color: #333;
}
.mac-menu-item {
  margin: 0 6px;
  cursor: default;
  user-select: none;
}
.mac-menu-item:hover {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

/* 右侧操作区 */
.mac-toolbar-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
}
.mac-input,
.mac-select {
  width: 180px;
  font-size: 12px;
  margin: 0 4px;
  --v-input-control-height: 24px;
}
.mac-switch {
  margin: 0 4px;
}

/* 按钮图标更小、更紧凑 */
.mac-toolbar-actions .v-btn {
  min-width: 24px;
  height: 24px;
  padding: 0 4px;
}
.mac-toolbar-actions .v-icon {
  font-size: 16px;
}

/* 去掉默认分隔线 */
.mac-toolbar .v-toolbar__content {
  border-bottom: none;
}
.v-tabs .v-tab,
.v-tabs .v-tab .text-blue-grey-darken-4 {
  text-transform: none !important;
}
/* 核心：把输入框高度、内边距、字体都拉小 */
.small-autocomplete .v-input__control {
  min-height: 20px !important;
  height: 20px !important;
}

/* 把 label / placeholder 也调小 */
.small-autocomplete .v-field__label {
  font-size: 12px !important;
  line-height: 20px !important;
}

/* 输入框文字、padding */
.small-autocomplete input {
  font-size: 12px !important;
  height: 20px !important;
  padding: 0 4px !important;
}

/* 下拉列表项也缩一点 */
.small-autocomplete .v-list-item {
  min-height: 24px !important;
  padding-top: 2px !important;
  padding-bottom: 2px !important;
  font-size: 12px !important;
}
/* 整体控制高度 */
.small-switch .v-input__control {
  min-height: 20px !important;
  height: 20px !important;
  padding: 0 4px !important;
}

/* 轨道 (track) */
.small-switch .v-switch .v-input--selection-controls__track {
  height: 12px !important;
  width: 34px !important;
  border-radius: 6px !important;
}

/* 滑块容器 */
.small-switch .v-switch .v-input--selection-controls__thumb-container {
  height: 16px !important;
  width: 16px !important;
  top: 2px !important;
}

/* 滑块 (thumb) */
.small-switch .v-switch .v-input--selection-controls__thumb {
  height: 16px !important;
  width: 16px !important;
}

/* label 字体 & 行高 */
.small-switch .v-label {
  font-size: 12px !important;
  line-height: 20px !important;
  margin-left: 4px !important;
}
.v-slide-group__container,
.v-tabs {
}
.vue-treeselect--single .vue-treeselect__option--selected {
  background: rgb(var(--v-theme-on-surface-variant)) !important;
  color: rgb(var(--v-theme-surface-variant)) !important;
}
</style>
