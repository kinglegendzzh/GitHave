<template>
  <v-container fluid class="file-browser-container pa-0 ma-0" style="height: 100vh">
    <!-- 当 loading 为 true 时显示加载动画，反之显示主体页面 -->
    <v-row v-if="loading" align="center" justify="center" class="ma-0" style="height: 100vh">
      <v-col cols="12" class="text-center pa-0" style="display: block">
        <v-progress-circular indeterminate color="primary" size="70" />
      </v-col>
    </v-row>

    <div v-else class="file-browser-layout">
      <!-- 主内容区 -->
      <div class="toolbar-container">
        <v-toolbar density="compact" height="48" class="pa-0 pl-1 pr-1">
          <!-- 标题banner -->
          <!-- <div class="toolbar-title ml-4">
            <span class="text-h8 text-caption">代码视窗</span>
          </div> -->

          <v-spacer></v-spacer>

          <!-- 中间路径选择 -->
          <div class="toolbar-center">
            <span class="text-caption mr-2">选择代码仓库: </span>
            <v-autocomplete
              v-model="newRootPath"
              :items="pathSuggestions"
              item-title="title"
              item-value="value"
              placeholder="选择代码仓库"
              no-data-text="暂无数据"
              density="compact"
              variant="outlined"
              hide-details
              class="pa-0 mt-1 mb-0 pt-1 pb-0"
              style="width: 500px"
              @focus="loadPathSuggestions"
              @update:model-value="onPathSelectionChanged"
            ></v-autocomplete>
          </div>

          <v-spacer></v-spacer>

          <!-- 右侧操作区 -->
          <div class="toolbar-right d-flex align-center">
            <!-- 主题选择器 -->
            <v-menu>
              <template #activator="{ props }">
                <v-btn
                  v-if="1 === 2"
                  text
                  size="small"
                  class="pa-1 ma-0 mr-2"
                  title="切换代码高亮主题"
                  v-bind="props"
                >
                  <v-icon size="small">mdi-palette</v-icon>
                  主题
                </v-btn>
              </template>
              <v-list density="compact">
                <v-list-subheader>亮色主题</v-list-subheader>
                <v-list-item
                  v-for="theme in lightThemes"
                  :key="theme.value"
                  :title="theme.title"
                  :active="highlightTheme === theme.value"
                  @click="changeHighlightTheme(theme.value)"
                >
                  <template #prepend>
                    <v-icon
                      :color="highlightTheme === theme.value ? 'primary' : undefined"
                      size="small"
                    >
                      {{ highlightTheme === theme.value ? 'mdi-check' : 'mdi-code-tags' }}
                    </v-icon>
                  </template>
                </v-list-item>
                <v-divider></v-divider>
                <v-list-subheader>暗色主题</v-list-subheader>
                <v-list-item
                  v-for="theme in darkThemes"
                  :key="theme.value"
                  :title="theme.title"
                  :active="highlightTheme === theme.value"
                  @click="changeHighlightTheme(theme.value)"
                >
                  <template #prepend>
                    <v-icon
                      :color="highlightTheme === theme.value ? 'primary' : undefined"
                      size="small"
                    >
                      {{ highlightTheme === theme.value ? 'mdi-check' : 'mdi-code-tags' }}
                    </v-icon>
                  </template>
                </v-list-item>
              </v-list>
            </v-menu>
            <v-btn
              text
              size="small"
              class="pa-1 ma-0"
              title="切换代码高亮主题"
              v-bind="props"
              @click="changeHighlightTheme()"
            >
              <v-icon size="small">mdi-palette</v-icon>
              主题
            </v-btn>
            <v-btn text size="small" class="pa-1 ma-0" title="更新代码" @click="pull()">
              <v-icon size="small">mdi-git</v-icon>
              更新代码
            </v-btn>

            <v-btn
              text
              size="small"
              class="pa-1 ma-0"
              title="从文件夹打开"
              @click="openOutside(breadcrumbs, true)"
            >
              <v-icon size="small">mdi-folder-eye</v-icon>
              从文件夹打开
            </v-btn>

            <v-btn
              text
              size="small"
              class="pa-1 ma-0"
              title="从应用程序打开"
              @click="openOutside(breadcrumbs, false)"
            >
              <v-icon size="small">mdi-file-search-outline</v-icon>
              从应用程序打开
            </v-btn>
          </div>
        </v-toolbar>
      </div>

      <div class="content-container">
        <!-- 左侧目录树 -->
        <div class="file-tree-panel">
          <div outlined class="pa-1 file-tree-card">
            <v-divider></v-divider>
            <div class="file-tree-search-container pa-2">
              <el-input
                v-model="searchQuery"
                placeholder="搜索文件..."
                clearable
                :prefix-icon="Search"
                class="mb-2"
                @input="filterTree"
              />

              <!-- 添加路径导航输入框 -->
              <!-- <div class="path-navigation mt-2">
                <v-text-field
                  v-model="pathInput"
                  placeholder="输入路径..."
                  clearable
                  class="mb-1"
                  density="compact"
                  hide-details
                  append-inner-icon="mdi-crosshairs-gps"
                  @click:append-inner="expandToInputPath(pathInput)"
                ></v-text-field>
              </div> -->
            </div>
            <el-tree
              ref="treeRef"
              style="height: 78vh; overflow-y: scroll"
              :data="filteredTreeData"
              :props="{
                label: 'name',
                children: 'children',
                isLeaf: (data) => !data.isDirectory
              }"
              :expand-on-click-node="false"
              :default-expanded-keys="openNodes"
              :key-field="'path'"
              :item-size="26"
              :empty-text="searchQuery ? '未找到匹配项' : '暂无文件'"
              virtual-scrolling
              :scroll="{ x: true, y: true }"
              @node-click="handleNodeClick"
              @node-expand="handleNodeExpand"
              @node-collapse="handleNodeCollapse"
              @node-contextmenu="handleNodeContextMenu"
            >
              <template #default="{ data }">
                <div class="custom-tree-node">
                  <el-icon class="mr-1">
                    <Folder v-if="data.isDirectory" />
                    <Document v-else />
                  </el-icon>
                  <span class="node-label">{{ data.name }}</span>
                </div>
              </template>
            </el-tree>
          </div>
        </div>

        <!-- 右侧文件预览和标签 -->
        <div class="file-content-panel">
          <div class="flex-shrink-0">
            <div class="tabs-container" style="flex-shrink: 0; overflow: hidden; max-width: 75%">
              <v-tabs
                v-if="tabs.length"
                v-model="activeTab"
                density="compact"
                height="32"
                scrollable
                show-arrows
                :slider-color="'primary'"
                class="tabs-wrapper"
              >
                <v-tab
                  v-for="(tab, index) in tabs"
                  :key="tab.path"
                  :value="index"
                  class="text-caption tab-item"
                  @click="selectTab(tab)"
                  @contextmenu="(e) => handleTabContextMenu(e, tab, index)"
                >
                  <span class="tab-text">{{ tab.name }}</span>
                  <v-btn
                    size="x-small"
                    variant="text"
                    class="tab-close-btn"
                    :title="`关闭 ${tab.name} (Ctrl+W)`"
                    @click.stop="removeTab(index)"
                  >
                    <v-icon size="12">mdi-close</v-icon>
                  </v-btn>
                </v-tab>
              </v-tabs>
            </div>
            <!-- 面包屑导航 -->
            <div class="breadcrumb-container">
              <v-breadcrumbs :items="breadcrumbs" class="pa-0" density="compact">
                <template #item="{ item }">
                  <v-breadcrumbs-item
                    :title="item.text"
                    class="text-caption"
                    @click="navigateTo(item.path)"
                  >
                    {{ item.text }}
                  </v-breadcrumbs-item>
                </template>
              </v-breadcrumbs>
            </div>
          </div>
          <v-divider></v-divider>

          <!-- 主要预览区域 -->
          <div class="d-flex flex-grow-1" style="height: 100%">
            <!-- 文件内容预览区域 -->
            <v-card tonal class="flex-grow-1 pa-0" style="height: 100%; overflow-y: auto">
              <v-card-text class="pt-1 h-100 pb-2 mb-2">
                <div v-if="selectedFileName" class="preview-content">
                  <!-- 文件操作按钮 -->
                  <!-- 快速代码查找和函数操作按钮 -->
                  <div class="d-flex justify-space-between align-center mb-2">
                    <!-- 原有的函数操作按钮 -->
                    <div class="d-flex gap-2">
                      <v-btn
                        v-if="isCodeFile && codeIndex && codeIndex.functions"
                        size="small"
                        variant="outlined"
                        color="info"
                        prepend-icon="mdi-function"
                      >
                        <span class="text-caption"
                          >{{ codeIndex.total_function_count }} 个索引</span
                        >
                      </v-btn>
                      <v-btn
                        class="ml-2"
                        color="success"
                        size="small"
                        prepend-icon="mdi-code-braces"
                        @click="openInIDE(selectedFileUrl)"
                      >
                        <span style="text-transform: none" class="text-caption ml-1 mr-1">
                          在IDE中编辑
                        </span>
                      </v-btn>
                    </div>
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
                    class="markdown-content pt-0 mt-0"
                    @click="handleLinkClick"
                    v-html="renderMarkdown(fileContent)"
                  ></div>
                  <!-- 代码文件预览 -->
                  <!-- <div v-else-if="isCodeFile" class="monaco-container"> -->
                  <div v-else class="monaco-container">
                    <MonacoEditor
                      v-model:value="fileContent"
                      :language="getFileLanguage(selectedFileName)"
                      :theme="currentTheme"
                      :options="monacoOptions"
                      @editor-mounted="onEditorMounted"
                    />
                  </div>
                  <!-- 其他文本文件预览 -->
                  <!-- <pre v-else>{{ fileContent }}</pre> -->
                </div>
                <div v-else style="text-align: center; padding-top: 20%">
                  <img
                    :src="placeholderImage"
                    alt="Chart Placeholder"
                    draggable="false"
                    style="
                      max-width: 150px;
                      max-height: 150px;
                      display: block;
                      margin: auto;
                      user-select: none;
                      pointer-events: none;
                    "
                  />
                  <h1
                    style="
                      font-size: 16px;
                      margin-top: 16px;
                      user-select: none;
                      pointer-events: none;
                    "
                  >
                    代码视窗
                  </h1>
                </div>
              </v-card-text>
            </v-card>

            <!-- 代码索引侧边栏 -->
            <v-card
              v-if="isCodeFile && codeIndex && Object.keys(codeIndex.functions || {}).length > 0"
              class="mt-1 mb-1 code-index-sidebar"
              style="max-width: 320px"
            >
              <div class="text-subtitle-2 mb-2 text-primary font-weight-bold">
                <v-icon size="small" class="mr-1">mdi-function</v-icon>
                代码结构 ({{ codeIndex.total_function_count }} 个索引)
              </div>
              <!-- 代码结构搜索框 -->
              <div class="d-flex align-center mb-2" style="position: relative">
                <div class="code-search-container" :class="{ 'dark-theme': isDarkTheme }">
                  <v-icon
                    size="small"
                    style="
                      position: absolute;
                      left: 22px;
                      top: 50%;
                      transform: translateY(-50%);
                      z-index: 1;
                    "
                    >mdi-magnify</v-icon
                  >
                  <input
                    v-model="codeStructureSearch"
                    type="text"
                    class="custom-search-input"
                    :placeholder="'搜索函数...'"
                    :style="{
                      paddingLeft: '32px',
                      width: '100%',
                      height: '36px',
                      border: '1px solid ' + (isDarkTheme ? '#4a5568' : '#d1d5db'),
                      borderRadius: '6px',
                      outline: 'none',
                      color: isDarkTheme ? '#e2e8f0' : 'inherit',
                      background: isDarkTheme ? '#1e1e1e' : 'white'
                    }"
                  />
                  <v-icon
                    v-if="codeStructureSearch"
                    size="small"
                    color="grey"
                    style="
                      position: absolute;
                      right: 24px;
                      top: 50%;
                      transform: translateY(-50%);
                      cursor: pointer;
                      z-index: 2;
                    "
                    @click="codeStructureSearch = ''"
                  >
                    mdi-close-circle
                  </v-icon>
                </div>
              </div>
              <v-divider class="mb-3"></v-divider>

              <!-- 遍历每个文件 -->
              <div v-for="(functions, filePath) in codeIndex.functions" :key="filePath">
                <div class="text-caption text-medium-emphasis mb-2">
                  <v-icon size="small" class="mr-1">mdi-file-code</v-icon>
                  {{ filePath }}
                </div>

                <!-- 遍历文件中的每个函数 (带搜索过滤) -->
                <div
                  v-for="functionItem in filterFunctions(functions)"
                  :key="`${filePath}-${functionItem.name}`"
                  class="mb-3"
                >
                  <v-card
                    variant="outlined"
                    class="pa-2 function-card"
                    :class="{ 'elevation-2': hoveredFunction === functionItem.name }"
                    style="cursor: pointer; transition: all 0.2s"
                    @mouseenter="hoveredFunction = functionItem.name"
                    @mouseleave="hoveredFunction = null"
                  >
                    <div class="d-flex align-center mb-1">
                      <v-icon size="small" color="primary" class="mr-2"
                        >mdi-function-variant</v-icon
                      >
                      <span class="font-weight-medium text-primary">{{ functionItem.name }}</span>
                    </div>

                    <div class="text-caption text-medium-emphasis mb-1">
                      <v-icon size="x-small" class="mr-1">mdi-map-marker</v-icon>
                      行 {{ functionItem.start_line }} - {{ functionItem.end_line }}
                    </div>

                    <!-- 函数描述 -->
                    <template v-if="functionItem.description">
                      <div
                        v-if="getParsedDescription(functionItem.description).description"
                        class="text-caption description-text mb-2"
                      >
                        <strong>描述：</strong>
                        {{ getParsedDescription(functionItem.description).description }}
                      </div>

                      <!-- 处理流程 -->
                      <div
                        v-if="
                          getParsedDescription(functionItem.description).process &&
                          getParsedDescription(functionItem.description).process.length > 0
                        "
                        class="text-caption process-text"
                      >
                        <strong>处理流程：</strong>
                        <div
                          v-for="(step, index) in getParsedDescription(functionItem.description)
                            .process"
                          :key="index"
                          class="ml-2 mt-1"
                        >
                          <div class="d-flex">
                            <div class="mr-1">{{ index + 1 }}.</div>
                            <div>{{ step }}</div>
                          </div>
                        </div>
                      </div>
                    </template>

                    <div v-if="functionItem.package" class="text-caption text-success mt-1">
                      <v-icon size="x-small" class="mr-1">mdi-package-variant</v-icon>
                      {{ functionItem.package }}
                    </div>
                  </v-card>
                </div>
                <v-divider
                  v-if="Object.keys(codeIndex.functions).length > 1"
                  class="my-3"
                ></v-divider>
              </div>
            </v-card>
          </div>
        </div>
      </div>
      <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" class="ma-0">
        {{ snackbar.message }}
      </v-snackbar>
    </div>
    <!-- 进度条弹窗 -->
    <v-dialog v-model="progressDialog" persistent max-width="400">
      <v-card class="pa-2">
        <v-card-title class="text-center pa-1">{{ progressTitle }}</v-card-title>
        <v-card-text class="pa-2">
          <v-progress-linear
            :model-value="progress"
            color="primary"
            height="25"
            striped
            class="mb-1"
          >
            <template #default="{ value }">
              <strong>{{ Math.ceil(value) }}%</strong>
            </template>
          </v-progress-linear>
          <div class="text-center mt-1">{{ progressMessage }}</div>
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
window.MonacoEnvironment = {
  getWorker: (_moduleId, label) => {
    if (label === 'json') {
      return new JsonWorker()
    }
    if (label === 'typescript' || label === 'javascript') {
      return new TsWorker()
    }
    // 默认就是编辑器本身的 worker
    return new EditorWorker()
  }
}
import 'highlight.js/styles/default.css'
import { ref, computed, onMounted, onUnmounted, onActivated, watch, nextTick, reactive } from 'vue'
import { useStore } from 'vuex'
import { isFilePath, getFileExtension, getFileName } from '../service/file'
import mammoth from 'mammoth'
import path from 'path-browserify'
import { ElTreeV2, ElInput, ElIcon } from 'element-plus'
import { Folder, Document, Search } from '@element-plus/icons-vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import MonacoEditor from 'monaco-editor-vue3'

import * as XLSX from 'xlsx'
import codeSVG from '../assets/code.svg'
import { listRepos, pullRepo, checkIndexApi } from '../service/api.js'
import { omit } from '../service/str'
import dynamicLoadingSvg from '../assets/load.svg'
// router import removed as we're using IPC instead of direct routing
// Vuex store（假定已配置）
const store = useStore()
// computed 用于展现 snackbar 数据（减少不必要的更新）
const snackbar = computed(() => store.state.snackbar)

// 主题检测和高亮样式管理
const isDarkTheme = ref(false)
const highlightTheme = ref('github')

// MonacoEditor 相关配置
// 读取黑色主题偏好设置
const highlightThemeDark = ref(localStorage.getItem('fileBrowser.highlightDark') !== 'false')
const currentTheme = ref(highlightThemeDark.value ? 'vs-dark' : 'vs-light') // Monaco编辑器主题

const monacoOptions = reactive({
  fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
  readOnly: true,
  automaticLayout: true,
  wordWrap: 'on',
  minimap: { enabled: true },
  theme: currentTheme.value,
  fontSize: 14
})

// Monaco编辑器实例和装饰引用
let monacoGlobal = null
let monacoInstance = null
let highlightDecoration = null
let searchDecorations = [] // 搜索高亮装饰ID数组
let monacoReady = false // 标记Monaco编辑器是否完全初始化完成
let pendingScrollActions = [] // 缓存等待执行的滚动操作

/* NEW ─ onEditorMounted：注册快捷键、补全、装饰 */
function onEditorMounted(editor) {
  // 获取Monaco全局对象和编辑器实例
  monacoGlobal = editor.$monaco
  monacoInstance = editor

  // 标记编辑器已就绪
  monacoReady = true
  console.log('Monaco编辑器初始化完成')

  // 执行之前缓存的滚动操作
  if (pendingScrollActions.length > 0) {
    console.log(`执行 ${pendingScrollActions.length} 个缓存的滚动操作`)
    pendingScrollActions.forEach((action) => action())
    pendingScrollActions = []
  }

  // 拿到 Monaco 的全局对象
  // monacoGlobal = editor.$monaco

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

// 根据文件扩展名获取语言类型
function getFileLanguage(filename) {
  if (!filename) return 'plaintext'

  const ext = path.extname(filename).slice(1).toLowerCase()

  return languageMap[ext] || 'shell'
}

// 可选的亮色主题列表
const lightThemes = [
  { title: 'GitHub', value: 'github' },
  { title: 'Mono Blue', value: 'mono-blue' },
  { title: 'Docco', value: 'docco' },
  { title: 'Atom One Light', value: 'atom-one-light' },
  { title: 'VS', value: 'vs' },
  { title: 'Solarized Light', value: 'solarized-light' }
]

// 可选的暗色主题列表
const darkThemes = [
  { title: 'Gradient Dark', value: 'gradient-dark' },
  { title: 'Atom One Dark', value: 'atom-one-dark' },
  { title: 'Dracula', value: 'dracula' },
  { title: 'Monokai', value: 'monokai' },
  { title: 'Nord', value: 'nord' },
  { title: 'Tokyo Night Dark', value: 'tokyo-night-dark' }
]

// 默认主题设置
const darkHighlightTheme = 'gradient-dark' // 暗色主题默认值
const lightHighlightTheme = 'mono-blue' // 亮色主题默认值

// 用户自定义主题（从localStorage读取）
const userDarkTheme = localStorage.getItem('userDarkTheme') || darkHighlightTheme
const userLightTheme = localStorage.getItem('userLightTheme') || lightHighlightTheme

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
  // 使用 public 目录下的主题样式
  link.href = `/hljs/${themeName}.css`
  document.head.appendChild(link)

  highlightTheme.value = themeName
  console.log(`[FileBrowser] 已加载高亮主题: ${themeName}`)

  // 强制重新渲染代码高亮
  nextTick(() => {
    if (fileContent.value && isCodeFile.value) {
      // 强制重新渲染代码高亮
      const tempContent = fileContent.value
      fileContent.value = ''
      nextTick(() => {
        fileContent.value = tempContent
        // 重新应用语法高亮
        setTimeout(() => {
          const codeBlocks = document.querySelectorAll('pre code')
          codeBlocks.forEach((block) => {
            hljs.highlightElement(block)
          })
        }, 100)
      })
    }
  })
}

// 检测当前主题
const checkTheme = () => {

  // 通过检查 body 上的 Vuetify 主题类来确定当前主题
  // 检测系统主题偏好
  const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  isDarkTheme.value = isDark
  console.log('[FileBrowser] 当前主题:', isDark ? '暗色' : '亮色')

  // 根据主题加载对应的高亮样式
  const themeToUse = isDark
    ? localStorage.getItem('userDarkTheme') || darkHighlightTheme
    : localStorage.getItem('userLightTheme') || lightHighlightTheme

  loadHighlightTheme(themeToUse)

  // 更新搜索框样式
  nextTick(() => {
    // 强制重新应用样式
    const searchInputs = document.querySelectorAll('.custom-search-input, .quick-find-input')
    searchInputs.forEach((input) => {
      if (isDark) {
        input.style.background = '#1e1e1e'
        input.style.color = '#e2e8f0'
        input.style.border = '1px solid #4a5568'
      } else {
        input.style.background = 'white'
        input.style.color = 'inherit'
        input.style.border = '1px solid #d1d5db'
      }
    })
  })
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
const treeRef = ref(null) // Reference to the el-tree-v2 component
const searchQuery = ref('') // Search query for filtering the tree
const pathInput = ref('') // 路径输入框的值
const filteredTreeData = ref([]) // Filtered tree data based on search
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
const hoveredNode = ref(null)
const codeIndex = ref(null)
const hoveredFunction = ref(null)
// 代码结构搜索
const codeStructureSearch = ref('')
// 快速查找代码
const quickFindText = ref('')
const findResults = ref([])
const findCurrentIndex = ref(-1)

// allowedExtensions 常量已删除，现在使用 checkIfTextFile 函数进行智能文件类型检测

// checkIfTextFile 函数：内容优先+mime兜底智能检测文本文件
async function checkIfTextFile(filePath) {
  try {
    // 目录直接返回 false
    try {
      const stats = await window.electron.getFileStats(filePath)
      if (stats && stats.isDirectory) return false
    } catch (error) {
      console.warn('获取文件状态失败:', error)
    }
    const isText = await window.electron.isText(filePath)
    console.log('isText', isText)
    return isText
  } catch (error) {
    console.error('检查文件类型失败:', error)
    return false
  }
}
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
  linkify: true,
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
}).use(function (md) {
  // 自定义链接渲染器，使所有链接在新窗口中打开
  const defaultRender =
    md.renderer.rules.link_open ||
    function (tokens, idx, options, env, renderer) {
      return renderer.renderToken(tokens, idx, options)
    }

  md.renderer.rules.link_open = function (tokens, idx, options, env, renderer) {
    const token = tokens[idx]
    const hrefIndex = token.attrIndex('href')

    if (hrefIndex >= 0) {
      // 添加 target="_blank" 和 rel="noopener noreferrer" 属性
      token.attrPush(['target', '_blank'])
      token.attrPush(['rel', 'noopener noreferrer'])
    }

    return defaultRender(tokens, idx, options, env, renderer)
  }

  // 自定义图片渲染器，处理本地图片路径
  const defaultImageRender =
    md.renderer.rules.image ||
    function (tokens, idx, options, env, renderer) {
      return renderer.renderToken(tokens, idx, options)
    }

  md.renderer.rules.image = function (tokens, idx, options, env, renderer) {
    const token = tokens[idx]
    const srcIndex = token.attrIndex('src')

    if (srcIndex >= 0) {
      const src = token.attrs[srcIndex][1]

      // 检查是否为本地路径（不是http/https/data协议）
      if (src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('//')) {
        // 使用占位符图片，避免CSP问题
        token.attrs[srcIndex][1] =
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y2ZjhmYSIgc3Ryb2tlPSIjZDFkOWUwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1kYXNoYXJyYXk9IjUsMTAiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzY1NmQ3NiIgZGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWKoOi9veS4rS4uLjwvdGV4dD48L3N2Zz4='
        token.attrPush(['data-original-src', src])
        token.attrPush(['class', 'local-image-placeholder'])
        token.attrPush(['alt', '正在加载本地图片...'])
      }
    }

    return defaultImageRender(tokens, idx, options, env, renderer)
  }
})

// 计算属性：是否为代码文件（非 Markdown）
const isCodeFile = ref(false)

// 更新isCodeFile状态的函数
async function updateIsCodeFile() {
  if (!selectedFileName.value) {
    isCodeFile.value = false
    return
  }
  // 1. 先尝试在 treeData 中查找对应的节点，获取完整路径
  let absPath = ''
  if (treeData.value && typeof findNodeByPath === 'function') {
    // 遍历 treeData，找到 name 匹配的节点
    const stack = Array.isArray(treeData.value) ? [...treeData.value] : [treeData.value]
    while (stack.length) {
      const node = stack.pop()
      if (node && node.name === selectedFileName.value) {
        absPath = node.path || node.fullPath || ''
        break
      }
      if (node && node.children && Array.isArray(node.children)) {
        stack.push(...node.children)
      }
    }
  }
  // 2. 如果 treeData 没查到，则拼接 newRootPath
  if (!absPath && newRootPath.value) {
    absPath = path.resolve(newRootPath.value, selectedFileName.value)
  }
  const fileName = path.basename(absPath || selectedFileName.value)
  console.log('[FileBrowser] selectedFileName:', selectedFileName.value, '完整路径:', absPath)
  const isTextFile = await checkIfTextFile(absPath)
  isCodeFile.value = (isTextFile || allowedFileName.includes(fileName)) && !isMarkdown(absPath)
}

// 懒加载大文件：滚动时加载更多
async function loadMoreLines(selectedPath, loadedLines = 2000, step = 2000) {
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
  // 对URL编码的路径进行解码
  const decodedInitialPath = initialPath ? decodeURIComponent(initialPath) : initialPath
  const decodedRootPath = props.rootPath ? decodeURIComponent(props.rootPath) : props.rootPath
  console.log('[FileBrowser] decodedInitialPath:', decodedInitialPath)
  console.log('[FileBrowser] decodedRootPath:', decodedRootPath)

  // 处理根路径的逻辑
  if (decodedRootPath) {
    // 如果提供了rootPath，取其上一层目录作为根路径
    rootDir = path.dirname(decodedRootPath)
    console.log('[FileBrowser] 使用rootPath构建根路径:', rootDir)
    newRootPath.value = rootDir
  } else if (decodedInitialPath) {
    const ext = path.extname(decodedInitialPath)
    const isFile = !!ext && ext !== ''
    rootDir = isFile ? path.dirname(decodedInitialPath) : decodedInitialPath
    console.log('[FileBrowser] 使用initialPath构建根路径:', rootDir)
    newRootPath.value = rootDir
  }

  // 如果有有效的根目录，加载目录树
  if (rootDir) {
    fileContent.value = ''
    await resetTree(rootDir)
    if (initialPath) {
      console.log('有initialPath，展开到该路径:', initialPath)
      // 使用 path.extname 判断是否为文件
      const ext = path.extname(initialPath)
      const isFile = !!ext && ext !== ''

      if (isFile) {
        console.log('是文件，加载文件内容')
        await loadFileByType(initialPath)
        const breadcrumbPath = buildBreadcrumb(initialPath)
        addOrSwitchTab({
          path: initialPath,
          name: path.basename(initialPath),
          breadcrumbs: breadcrumbPath
        })
      } else {
        console.log('不是文件，选择该路径')
        handleNodeSelection([initialPath])
      }
    } else {
      console.log('没有initialPath，选择根路径')
      handleNodeSelection([rootDir])
    }
  }

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
    updateIsCodeFile() // 更新代码文件状态
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
    updateIsCodeFile() // 更新代码文件状态
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
      // 判断文件大小，超过10MB则懒加载
      try {
        const stat = await window.electron.stat(selectedPath)
        const maxSize = 10 * 1024 * 1024
        if (stat.size > maxSize) {
          // 懒加载逻辑：先加载前100000行
          const stream = await window.electron.createReadStream(selectedPath, { encoding: 'utf-8' })
          let content = ''
          let lineCount = 0
          const maxLines = 100000
          for await (const chunk of stream) {
            content += chunk
            let lines = content.split(/\r?\n/)
            if (lines.length >= maxLines) {
              content = lines.slice(0, maxLines).join('\n') + '\n...\n(文件过大，仅显示前100000行)'
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
  updateIsCodeFile() // 更新代码文件状态
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

  // 加载代码索引（异步执行，不阻塞界面）
  nextTick(() => {
    if (isCodeFile.value && selectedPath) {
      loadCodeIndex(selectedPath)
    } else {
      codeIndex.value = null
    }
  })
}

function restoreState(tab) {
  selectedFileName.value = tab.selectedFileName || path.basename(tab.path)
  updateIsCodeFile() // 更新代码文件状态
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

// 处理文件节点选择
async function handleNodeSelection(filePath) {
  const node = findNodeByPath(treeData.value, filePath)
  if (!node) return

  // 只允许打开指定后缀的文件
  const fileName = path.basename(node.name)
  const isTextFile = await checkIfTextFile(node.path)
  if (!isTextFile && !allowedFileName.includes(fileName)) {
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

// 递归搜索文件和文件夹
async function searchFileAndFolders(dir, query, maxDepth = 100, currentDepth = 0) {
  let results = []
  if (currentDepth > maxDepth) return results
  try {
    const children = await window.electron.readDirectory(dir)
    for (const child of children) {
      if (child.name.startsWith('.')) continue // 跳过隐藏文件夹
      const fullPath = child.fullPath || child.path || dir + '/' + child.name
      if (child.name.toLowerCase().includes(query.toLowerCase())) {
        results.push({
          path: fullPath,
          name: child.name,
          isDirectory: child.isDirectory
        })
      }
      if (child.isDirectory) {
        // 递归进入子目录
        const subResults = await searchFileAndFolders(fullPath, query, maxDepth, currentDepth + 1)
        results = results.concat(subResults)
      }
    }
  } catch (e) {
    // 权限或其他错误跳过
  }
  return results
}

// 支持递归文件夹和文件的模糊搜索
async function fetchPathSuggestions(query) {
  if (!query || !newRootPath.value) return []
  try {
    const items = await searchFileAndFolders(newRootPath.value, query)
    // 返回所有匹配到的文件和文件夹
    return items
  } catch (e) {
    return []
  }
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
      handleNodeSelection(targetPath)
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
  const rendered = md.render(content)
  // 渲染完成后处理本地图片
  nextTick(() => {
    processLocalImages()
  })
  return rendered
}

// 处理本地图片加载
async function processLocalImages() {
  try {
    // 获取当前文件所在目录
    const path = window.electron.path
    const currentFilePath = currentTab.value?.path
    if (!currentFilePath) return

    const markdownDir = path.dirname(currentFilePath)

    // 查找所有标记为本地图片的元素
    await nextTick()

    // 使用setTimeout确保DOM已更新
    setTimeout(async () => {
      const localImages = document.querySelectorAll(
        'img[data-original-src].local-image-placeholder'
      )

      for (const img of localImages) {
        try {
          const originalSrc = img.getAttribute('data-original-src')
          if (!originalSrc) continue

          // 解析相对路径为绝对路径
          let imagePath
          if (path.isAbsolute(originalSrc)) {
            imagePath = originalSrc
          } else {
            imagePath = path.resolve(markdownDir, originalSrc)
          }

          console.log('加载本地图片:', imagePath)

          // 使用readImageBlob读取图片并转换为base64
          const imageDataUrl = await window.electron.readImageBlob(imagePath)

          if (imageDataUrl) {
            img.src = imageDataUrl
            img.removeAttribute('data-original-src')
            img.classList.remove('local-image-placeholder')
            console.log('本地图片加载成功:', originalSrc)
          } else {
            // 图片加载失败，显示占位符
            img.alt = `图片加载失败: ${originalSrc}`
            img.classList.add('local-image-error')
            console.warn('本地图片加载失败:', originalSrc)
          }
        } catch (error) {
          console.error('处理本地图片时出错:', error)
          img.alt = `图片加载出错: ${img.getAttribute('data-original-src')}`
          img.classList.add('local-image-error')
        }
      }
    }, 100)
  } catch (error) {
    console.error('处理本地图片时出错:', error)
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
    // 由于我们已经一次性加载了所有目录树，不再需要懒加载逻辑
    // 直接查找子节点即可
    if (!currentNode.children || currentNode.children.length === 0) {
      // 如果没有子节点，则无法继续导航
      return
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

/**
 * 自动展开目录树到指定路径
 * @param {string} targetPath - 要展开到的目标路径
 * @param {boolean} selectNode - 是否选中该节点，默认为true
 * @returns {Promise<void>}
 */
async function autoExpandPath(targetPath, selectNode = true) {
  console.log('自动展开目录树到路径:', targetPath, treeData.value)

  if (!targetPath || !treeData.value || treeData.value.length === 0) {
    console.warn('无法展开路径: 目标路径为空或目录树未加载')
    return
  }

  // 查找路径对应的节点
  const node = findNodeByPath(targetPath, treeData.value)
  if (!node) {
    console.warn('无法找到路径对应的节点:', targetPath)
    return
  }

  // 构建路径层级
  const pathSegments = []
  let currentPath = targetPath

  // 递归构建父路径数组
  while (currentPath) {
    const parentPath = path.dirname(currentPath)
    // 如果到达根路径或者父路径与当前路径相同，则结束
    if (parentPath === currentPath) break

    pathSegments.unshift(currentPath)
    currentPath = parentPath

    // 如果到达根目录，也添加到路径中
    if (treeData.value.some((node) => node.path === parentPath)) {
      pathSegments.unshift(parentPath)
      break
    }
  }

  // 更新展开节点数组
  openNodes.value = [...new Set([...openNodes.value, ...pathSegments])]

  // 等待DOM更新后滚动到节点并选中
  nextTick(() => {
    // 尝试滚动到节点
    const targetId = 'node-' + targetPath.replace(/[^a-zA-Z0-9]/g, '-')
    const targetEl = document.getElementById(targetId)
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    // 如果需要选中节点
    if (selectNode) {
      handleNodeSelection([targetPath])
    }
  })

  return node
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
    const isFile = await isFilePath(url, null, allowedFileName, findNodeByPath, treeData.value)
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

// 已移除最大递归深度限制，一次性加载所有目录结构

// 递归获取目录树，不带深度阈值，一次性加载全部内容
async function getDirectoryTree(targetPath) {
  let root
  try {
    root = await window.electron.readDirectory(targetPath)
  } catch (e) {
    return [] // 目录不可读
  }
  const filteredRoot = root.filter((child) => !child.name.startsWith('.'))
  // 先分组，再递归
  const directories = filteredRoot.filter((child) => child.isDirectory)
  const files = filteredRoot.filter((child) => !child.isDirectory)

  const dirNodes = await Promise.all(
    directories.map(async (child) => {
      const children = await getDirectoryTree(child.fullPath)
      return {
        name: child.name,
        path: child.fullPath,
        isDirectory: true,
        children: children
      }
    })
  )

  const fileNodes = files.map((child) => ({
    name: child.name,
    path: child.fullPath,
    isDirectory: false,
    children: undefined
  }))

  return [...dirNodes, ...fileNodes]
}

// 重置目录树：仅在用户选定路径后调用
async function resetTree(newPath) {
  const targetPath = (await isFilePath(
    newPath,
    null,
    allowedFileName,
    findNodeByPath,
    treeData.value
  ))
    ? path.dirname(newPath)
    : newPath
  try {
    const children = await getDirectoryTree(targetPath)
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
        title: repo.desc ? `${omit(repo.desc, 40)}(${repo.name})` : repo.name,
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
const openInIDE = async (filePath) => {
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
  // rootDir 应该始终是文件树的根目录，即 newRootPath.value
  let rootDir = newRootPath.value
  // 如果rootDir是文件，则使用其所在的目录
  if (await isFilePath(rootDir, null, allowedFileName, findNodeByPath, treeData.value)) {
    rootDir = path.dirname(rootDir)
  }
  console.log('openInIDE:', encodeURIComponent(pathToOpen), encodeURIComponent(rootDir))
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
    updateIsCodeFile() // 更新代码文件状态

    if (newPath) {
      console.log('Loading file:', newPath)
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
    console.log('Restored state for:', tabs.value[newIndex].path)
    if (tabs.value[newIndex].path) {
      console.log('Loading code index for:', tabs.value[newIndex].path)
      loadCodeIndex(tabs.value[newIndex].path)
    }
  }
})
// Filter tree data based on search query
const filterTree = () => {
  if (!searchQuery.value || searchQuery.value.trim() === '') {
    filteredTreeData.value = treeData.value
    return
  }

  const filter = (nodes, query) => {
    if (!nodes) return []

    return nodes.filter((node) => {
      // Check if current node matches
      const matches = node.name.toLowerCase().includes(query.toLowerCase())

      // If it has children, recursively filter them
      if (node.children && node.children.length > 0) {
        const filteredChildren = filter(node.children, query)
        node.children = filteredChildren

        // Include this node if it matches or has matching children
        return matches || filteredChildren.length > 0
      }

      return matches
    })
  }

  // Create a deep copy of the tree data to avoid modifying the original
  const clonedData = JSON.parse(JSON.stringify(treeData.value))
  filteredTreeData.value = filter(clonedData, searchQuery.value)
}

/**
 * 根据输入的路径自动展开目录树
 * 这是一个示例方法，展示如何使用autoExpandPath
 * @param {string} inputPath - 要展开到的路径
 */
function expandToInputPath(inputPath) {
  if (!inputPath) return

  // 确保路径格式正确
  const normalizedPath = path.normalize(inputPath)
  console.log('尝试展开到路径:', normalizedPath)

  // 调用自动展开方法
  autoExpandPath(normalizedPath, true).then((node) => {
    if (node) {
      console.log('成功展开到路径:', normalizedPath)
    } else {
      console.warn('无法展开到路径:', normalizedPath)
    }
  })
}

// Handle node click event
const handleNodeClick = (data) => {
  console.log('handleNodeClick:', data)
  if (!data.isDirectory) {
    // For files, load the file content
    handleNodeSelection(data.path)
  }
}

// Handle node expand event
const handleNodeExpand = (data) => {
  // 只保留核心功能：将展开节点添加到openNodes数组中
  if (!openNodes.value.includes(data.path)) {
    openNodes.value.push(data.path)
  }
  // 已删除冗余的日志输出和注释，目录树现在一次性加载完成，不需要额外处理
}

// Handle node collapse event
const handleNodeCollapse = (data) => {
  // 移除当前被折叠的节点
  const index = openNodes.value.indexOf(data.path)
  if (index !== -1) {
    openNodes.value.splice(index, 1)
  }

  // 同时移除所有子节点的路径
  if (data.children && data.children.length > 0) {
    removeChildrenFromOpenNodes(data)
  }
}

// 递归移除所有子节点的路径
function removeChildrenFromOpenNodes(node) {
  if (!node.children) return

  for (const child of node.children) {
    const childIndex = openNodes.value.indexOf(child.path)
    if (childIndex !== -1) {
      openNodes.value.splice(childIndex, 1)
    }

    // 递归移除更深层级的子节点
    if (child.children && child.children.length > 0) {
      removeChildrenFromOpenNodes(child)
    }
  }
}

// 处理节点右键菜单事件
const handleNodeContextMenu = (event, data) => {
  // 阻止默认右键菜单
  event.preventDefault()
  console.log('[节点右键菜单]', data.path)
  // 这里可以添加自定义右键菜单逻辑
}

// Initialize filteredTreeData with the original treeData
watch(
  treeData,
  (newVal) => {
    filteredTreeData.value = newVal

    // 当目录树加载完成后，自动查找并选择指定路径的节点
    if (newVal && newVal.length > 0 && props.localPath) {
      console.log('目录树加载完成，自动查找节点:', props.localPath)
      // 使用 nextTick 确保 DOM 已更新
      nextTick(async () => {
        if (isMarkdown(props.localPath)) {
          handleLinkClick(props.localPath)
          return
        }
        // 检查是否是文件路径
        const isFile = await window.electron.isText(props.localPath)

        if (isFile) {
          // 如果是文件，展开到该路径并选择该文件
          console.log('找到文件路径，自动选择:', props.localPath)
          expandToPath(props.localPath)
          handleNodeSelection(props.localPath)
          loadFileByType(props.localPath)
        }
      })
    }
  },
  { immediate: true }
)

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

// 获取代码索引信息
async function loadCodeIndex(filePath) {
  if (!filePath) {
    console.log('No file path provided')
    codeIndex.value = null
    return
  }

  try {
    await loadPathSuggestions()
    console.log('Loading code index for:', filePath, newRootPath.value, pathSuggestions.value)
    const repoPath = pathSuggestions.value.find((item) => {
      return filePath.includes(item.value)
    }).value
    const response = await checkIndexApi(repoPath, path.relative(repoPath, filePath))

    if (response && response.data.code === 0) {
      codeIndex.value = response.data.data
      console.log('Code index loaded:', codeIndex.value)
    } else {
      codeIndex.value = null
    }
  } catch (error) {
    console.error('Failed to load code index:', error)
    codeIndex.value = null
  }
}

// 过滤函数列表（用于代码结构搜索）
function filterFunctions(functions) {
  if (!codeStructureSearch.value || codeStructureSearch.value.trim() === '') {
    return functions
  }

  const searchTerm = codeStructureSearch.value.toLowerCase()
  return functions.filter((func) => {
    // 搜索函数名
    if (func.name.toLowerCase().includes(searchTerm)) {
      return true
    }

    // 搜索函数描述
    const parsedDesc = getParsedDescription(func.description)
    if (parsedDesc.description && parsedDesc.description.toLowerCase().includes(searchTerm)) {
      return true
    }

    // 搜索处理流程
    if (
      parsedDesc.process &&
      parsedDesc.process.some((step) => step.toLowerCase().includes(searchTerm))
    ) {
      return true
    }

    return false
  })
}

// 在代码中查找文本
function findInCode() {
  if (!quickFindText.value || !fileContent.value || !monacoInstance) {
    findResults.value = []
    findCurrentIndex.value = -1
    return
  }

  const searchTerm = quickFindText.value

  // 清除之前的搜索装饰
  if (searchDecorations.length) {
    monacoInstance.deltaDecorations(searchDecorations, [])
    searchDecorations = []
  }

  // 使用Monaco的搜索API
  const model = monacoInstance.getModel()
  const matches = model.findMatches(
    searchTerm,
    false, // 不想要搜索整个单词
    false, // 支持正则表达式
    true, // 区分大小写
    null, // 跳过单词分隔符
    true // 支持回滚(可以在前开始)
  )

  findResults.value = matches
  findCurrentIndex.value = findResults.value.length > 0 ? 0 : -1

  // 创建搜索高亮装饰
  if (matches.length > 0) {
    const decorations = matches.map((match) => ({
      range: match.range,
      options: {
        inlineClassName: 'monaco-search-highlight',
        stickiness: monacoGlobal.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
      }
    }))

    // 添加装饰并保存装饰ID
    searchDecorations = monacoInstance.deltaDecorations([], decorations)

    // 当前选中项特殊高亮
    jumpToResult(findCurrentIndex.value)
  }

  // 显示搜索结果数量
  if (findResults.value.length > 0) {
    store.dispatch('snackbar/showSnackbar', {
      message: `找到 ${findResults.value.length} 个匹配结果`,
      color: 'info'
    })
  } else {
    store.dispatch('snackbar/showSnackbar', {
      message: '未找到匹配结果',
      color: 'warning'
    })
  }
}

// 跳转到特定的搜索结果
function jumpToResult(index) {
  if (index < 0 || index >= findResults.value.length) return

  // 如果Monaco实例未初始化，将操作加入等待队列
  if (!monacoReady) {
    console.log(`Monaco编辑器尚未准备好，缓存跳转操作到索引 ${index}`)
    pendingScrollActions.push(() => jumpToResult(index))
    return
  }

  // 再次检查实例
  if (!monacoInstance) {
    console.warn('Monaco编辑器实例仍未初始化，无法跳转到搜索结果')
    return
  }

  // 获取当前选中的结果
  const match = findResults.value[index]

  // 滚动到匹配位置
  monacoInstance.revealRangeInCenter(match.range)

  // 选中文本
  monacoInstance.setSelection(match.range)
}

// 查找下一个结果
function findNext() {
  if (findResults.value.length === 0) return

  findCurrentIndex.value = (findCurrentIndex.value + 1) % findResults.value.length
  jumpToResult(findCurrentIndex.value)
}

// 查找上一个结果
function findPrevious() {
  if (findResults.value.length === 0) return

  findCurrentIndex.value =
    (findCurrentIndex.value - 1 + findResults.value.length) % findResults.value.length
  jumpToResult(findCurrentIndex.value)
}

// 切换Monaco编辑器主题
function changeHighlightTheme() {
  highlightThemeDark.value = !highlightThemeDark.value

  // 存储用户的主题偏好
  localStorage.setItem('fileBrowser.highlightDark', highlightThemeDark.value ? 'true' : 'false')

  // 为Monaco编辑器切换主题
  currentTheme.value = highlightThemeDark.value ? 'vs-dark' : 'vs-light'

  // 更新Monaco编辑器选项并应用新主题
  if (monacoInstance) {
    monacoInstance.updateOptions({ theme: currentTheme.value })
  }

  // 显示主题切换成功提示
  store.dispatch('snackbar/showSnackbar', {
    message: `已切换到${highlightThemeDark.value ? '深色' : '浅色'}主题`,
    color: 'success'
  })
}

// 解析函数描述
function getParsedDescription(description) {
  if (!description) return { description: '', process: [] }

  try {
    // 尝试解析为JSON对象
    const parsed = JSON.parse(description)

    // 提取描述和处理流程
    return {
      description: parsed.description || '',
      process: Array.isArray(parsed.process) ? parsed.process : []
    }
  } catch (error) {
    // 解析失败，返回原始描述
    return { description: description, process: [] }
  }
}
</script>

<style scoped>
.monaco-container {
  width: 100%;
  height: 100%;
}
.code-container {
  position: relative;
  width: 100%;
  overflow: auto;
  max-height: calc(100vh - 150px);
}

.code-table {
  width: 100%;
  border-collapse: collapse;
  font-family: monospace;
}

.line-number {
  color: #999;
  font-size: 0.85rem;
  line-height: 1.5;
  padding: 0 0.5rem;
  text-align: right;
  user-select: none;
  background: rgb(var(--v-theme-on-tertiary));
  border-right: 1px solid rgb(var(--v-theme-on-tertiary));
  min-width: 4rem;
  vertical-align: top;
  white-space: nowrap;
}

.code-line {
  padding-left: 0.5rem;
  white-space: pre;
  width: 100%;
}

.code-line code {
  display: block;
  font-family: monospace;
  min-height: 1.5em; /* 确保空白行也有最小高度 */
}

.highlighted-line {
  background-color: rgba(255, 215, 0, 0.3);
  font-weight: bold;
  color: #333;
}

/* 搜索结果高亮 */
.search-highlight {
  background-color: rgba(255, 165, 0, 0.4);
  border-radius: 2px;
  padding: 1px;
}

/* 修改tr被选中时的样式 */
.code-table tr:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.description-text {
  max-height: 100px;
  white-space: normal;
  line-height: 1.4;
  overflow-y: auto;
}

.process-text {
  max-height: 150px;
  overflow-y: auto;
  white-space: normal;
  line-height: 1.4;
  background-color: rgb(var(--v-theme-on-surface-variant));
  color: rgb(var(--v-theme-surface-variant));
  padding: 6px;
  border-radius: 4px;
  margin-top: 4px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}
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
/* El-tree-v2 styles with theme support */
@media (prefers-color-scheme: dark) {
  :deep(.el-tree) {
    --el-tree-node-hover-bg-color: rgba(255, 255, 255, 0.1);
    --el-tree-text-color: rgb(235, 235, 235);
    --el-tree-expand-icon-color: rgb(180, 180, 180);
    --el-fill-color-light: rgba(255, 255, 255, 0.1);
    --el-fill-color-blank: rgb(30, 30, 30);
    background-color: rgb(30, 30, 30);
    color: rgb(235, 235, 235);
    border-radius: 4px;
  }

  :deep(.el-tree-v2) {
    background-color: rgb(30, 30, 30);
    color: rgb(235, 235, 235);
  }

  :deep(.el-input__wrapper) {
    background-color: rgb(30, 30, 30);
    color: rgb(235, 235, 235);
  }

  :deep(.el-tree-node__content) {
    height: 28px;
    line-height: 28px;
  }

  :deep(.el-tree-node__content:hover) {
    background-color: rgba(255, 255, 255, 0.1) !important;
  }

  :deep(.el-tree-node.is-current > .el-tree-node__content) {
    background-color: rgba(64, 158, 255, 0.2) !important;
    color: #409eff !important;
  }

  :deep(.el-tree-node__expand-icon) {
    color: rgb(180, 180, 180) !important;
  }

  :deep(.el-tree-node__label) {
    font-size: 0.9rem;
    color: rgb(235, 235, 235) !important;
  }

  :deep(.el-tree__empty-block) {
    background-color: rgba(255, 255, 255, 0.1) !important;
    border-radius: 4px;
  }

  :deep(.el-tree-node__content:hover) {
    background-color: rgba(255, 255, 255, 0.1) !important;
  }
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

/* 文件浏览器主布局 */
.file-browser-layout {
  display: flex;
  flex-direction: column;
  height: 94vh;
  overflow: hidden;
}

/* 工具栏容器 */
.toolbar-container {
  flex: 0 0 auto;
}

/* 内容容器 */
.content-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  height: calc(100vh - 48px);
}

/* 左侧文件树面板 */
.file-tree-panel {
  width: 20%;
  height: 100%;
  overflow: hidden;
  padding: 4px;
}

.file-tree-card {
  height: 100%;
  overflow-y: hidden;
  overflow-x: auto;
}

/* 右侧文件内容面板 */
.file-content-panel {
  width: 80%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 4px;
}

/* 代码索引侧边栏 */
.code-index-sidebar {
  max-height: calc(100vh - 150px);
  overflow-y: auto;
  padding: 8px;
}

/* 文件预览卡片 */
.file-preview-card {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 150px);
  overflow: hidden;
}

.file-preview-container {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
:deep(.v-slide-group__container, .v-tabs) {
  /* 确保标签栏不滚动 */
  overflow: hidden;
}
/* El-tree-v2 selected node style */
:deep(.el-tree-node.is-selected > .el-tree-node__content) {
  background: rgb(var(--v-theme-on-surface-variant)) !important;
  color: rgb(var(--v-theme-surface-variant)) !important;
}
/* 默认（亮色模式）的样式 */
.hljs {
  background-color: #f5f5f5; /* 亮色背景 */
  color: #333333; /* 亮色文本 */
}

/* 暗黑模式的样式 */
@media (prefers-color-scheme: dark) {
  .hljs {
    background-color: #000000; /* 暗色背景 */
    color: #dcdcdc; /* 暗色文本 */
  }
}
.preview-content {
  height: 80vh;
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
:deep(.v-input__control) {
  height: 50px;
  width: auto;
}

/* 强制覆盖markdown内容样式 - 使用:deep()穿透 */
:deep(.markdown-content),
:deep([v-html]) {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
  line-height: 1.6 !important;
  color: inherit !important;
}

:deep(.markdown-content) h1,
:deep(.markdown-content) h2,
:deep(.markdown-content) h3,
:deep(.markdown-content) h4,
:deep(.markdown-content) h5,
:deep(.markdown-content) h6,
:deep([v-html]) h1,
:deep([v-html]) h2,
:deep([v-html]) h3,
:deep([v-html]) h4,
:deep([v-html]) h5,
:deep([v-html]) h6 {
  margin-top: 24px !important;
  margin-bottom: 16px !important;
  font-weight: 600 !important;
  line-height: 1.25 !important;
  color: inherit !important;
}

:deep(.markdown-content) h1,
:deep([v-html]) h1 {
  font-size: 2em !important;
  border-bottom: 1px solid #eaecef !important;
  padding-bottom: 0.3em !important;
}

:deep(.markdown-content) h2,
:deep([v-html]) h2 {
  font-size: 1.5em !important;
  border-bottom: 1px solid #eaecef !important;
  padding-bottom: 0.3em !important;
}

:deep(.markdown-content) h3,
:deep([v-html]) h3 {
  font-size: 1.25em !important;
}

:deep(.markdown-content) h4,
:deep([v-html]) h4 {
  font-size: 1em !important;
}

:deep(.markdown-content) a,
:deep([v-html]) a {
  color: #0366d6 !important;
  text-decoration: none !important;
}

:deep(.markdown-content) p,
:deep(.markdown-content) li,
:deep(.markdown-content) td,
:deep([v-html]) p,
:deep([v-html]) li,
:deep([v-html]) td {
  margin-bottom: 16px !important;
}

:deep(.markdown-content) th,
:deep([v-html]) th {
  background-color: #21262d !important;
  color: #ffffff !important;
}

:deep(.markdown-content) table,
:deep([v-html]) table {
  border-color: #30363d !important;
}

:deep(.markdown-content) th,
:deep(.markdown-content) td,
:deep([v-html]) th,
:deep([v-html]) td {
  border-color: #30363d !important;
}

:deep(.markdown-content) a,
:deep([v-html]) a {
  color: #58a6ff !important;
}

:deep(.markdown-content) a:hover,
:deep([v-html]) a:hover {
  color: #79c0ff !important;
}
:deep(.markdown-content) img,
:deep([v-html]) img {
  max-width: 100% !important;
}
:deep(.v-field__input) {
  font-size: 0.8em !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  margin-top: 4px !important;
}
:deep(.v-autocomplete__selection) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}
.tab-item {
  max-width: 300px !important;
}
.tabs-wrapper {
  overflow-x: auto !important;
}

/* Code search container styles */
.code-search-container {
  position: fixed;
  top: 80px;
  right: 36px;
  z-index: 20;
  width: 250px;
  height: 40px;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.13);
  border-radius: 8px;
  padding: 14px 18px;
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
}

.code-search-container.dark-theme {
  background: rgba(30, 30, 30, 0.99) !important;
  border: 1px solid #383838 !important;
  color: #e2e8f0 !important;
}
</style>
