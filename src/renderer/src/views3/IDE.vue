<template>
  <div v-if="loading" class="loading-container">
    <v-progress-circular indeterminate size="64" color="primary"></v-progress-circular>
  </div>
  <div v-else class="d-flex flex-column" style="height: 100vh">
    <!-- 工具栏 -->
    <v-toolbar density="compact" height="48">
      <!-- 侧边栏切换按钮 -->
      <v-btn variant="plain" size="small" title="切换侧边栏 (Ctrl+B)" @click="toggleSidebar">
        <v-icon>{{ sidebarVisible ? 'mdi-file-tree' : 'mdi-file-tree' }}</v-icon>
      </v-btn>
      <!-- 标题banner -->
      <div class="toolbar-title">
        <span class="text-caption">GitHave IDE (Beta测试)</span>
      </div>
      <!-- 左侧操作区 -->
      <div class="toolbar-left ml-4">
        <v-btn v-if="isMacOS" text size="small" title="终端" @click="showTerminal = !showTerminal">
          <v-icon>mdi-console</v-icon>
          <span class="text-caption">终端</span>
        </v-btn>

        <v-btn text size="small" title="Git" :disabled="true" @click="openGitModal">
          <v-icon>mdi-git</v-icon>
          <span class="text-caption">版本管理</span>
        </v-btn>

        <!-- 帮助按钮 -->
        <v-btn icon size="small" title="显示命令面板 (F1)" @click="shortcutHelpDialog = true">
          <v-icon>mdi-help-circle-outline</v-icon>
        </v-btn>
      </div>

      <v-spacer></v-spacer>

      <!-- 中间路径选择 -->
      <div class="toolbar-center">
        <span class="text-caption mr-2">选择项目路径: </span>
        <v-autocomplete
          v-model="newRootPath"
          :items="pathSuggestions"
          item-title="title"
          item-value="value"
          placeholder="选择项目路径"
          density="compact"
          variant="outlined"
          hide-details
          style="width: 500px"
          @update:model-value="handlePathChange"
          @focus="loadPathSuggestions"
        ></v-autocomplete>
      </div>

      <v-spacer></v-spacer>

      <!-- 右侧操作区 -->
      <div class="toolbar-right">
        <!-- 格式化按钮 -->
        <v-btn icon size="small" title="格式化" @click="formatDocument">
          <v-icon>mdi-code-braces</v-icon>
        </v-btn>

        <!-- 保存按钮 -->
        <v-btn icon size="small" title="保存" @click="saveDocument">
          <v-icon>mdi-content-save</v-icon>
        </v-btn>

        <!-- 主题切换 -->
        <v-btn
          icon
          size="small"
          :title="isDark ? '切换到亮色主题' : '切换到暗色主题'"
          @click="toggleTheme"
        >
          <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
        </v-btn>
      </div>
    </v-toolbar>

    <!-- 主内容区域 -->
    <div class="d-flex flex-grow-1" style="overflow: hidden">
      <!-- 左侧文件树 -->
      <div
        v-show="sidebarVisible"
        class="flex-shrink-0 sidebar-container"
        :style="{ width: sidebarWidth + 'px' }"
      >
        <!-- 文件操作按钮 -->
        <div
          v-if="newRootPath !== null && newRootPath !== ''"
          class="file-actions d-flex pa-2 gap-1"
        >
          <v-btn size="small" title="新建文件 (Ctrl+N)" @click="createNewFile">
            <v-icon size="16">mdi-file-plus</v-icon>
          </v-btn>
          <v-btn size="small" title="新建文件夹" @click="createNewFolder">
            <v-icon size="16">mdi-folder-plus</v-icon>
          </v-btn>
          <v-btn size="small" title="刷新 (F5)" @click="refreshFileTree">
            <v-icon size="16">mdi-refresh</v-icon>
          </v-btn>
        </div>

        <!-- 文件树 -->
        <div class="file-tree-container" @contextmenu="handleFileTreeContextMenu">
          <treeselect
            v-model="treeselectValue"
            :options="treeData"
            :load-options="loadDirectoryOptions"
            :normalizer="nodeNormalizer"
            :open-nodes="openNodes"
            :open-on-click="false"
            :open-on-focus="false"
            :clear-on-select="false"
            :searchable="true"
            :multiple="false"
            :close-on-select="false"
            :show-count="false"
            :disable-branch-nodes="false"
            :flat="false"
            :sort-value-by="'ORDER_SELECTED'"
            :limit="100"
            :max-height="600"
            :z-index="1000"
            :default-expand-level="1"
            :always-open="true"
            :hide-root="false"
            placeholder="搜索..."
            no-options-text="暂无文件"
            no-results-text="未找到匹配项"
            @select="handleNodeSelection"
            @open="handleOptionClick"
          />
        </div>

        <!-- 侧边栏调整器 -->
        <div class="sidebar-resizer" @mousedown="startResize"></div>
      </div>

      <!-- 侧边栏切换按钮（当侧边栏隐藏时显示） -->
      <div v-if="!sidebarVisible" class="sidebar-toggle-btn">
        <v-btn size="small" variant="plain" title="显示侧边栏 (Ctrl+B)" @click="toggleSidebar">
          <v-icon>mdi-file-tree</v-icon>
        </v-btn>
      </div>

      <!-- 右侧文件预览区域 -->
      <div class="flex-grow-1 d-flex flex-column" style="min-width: 0">
        <!-- 标签页容器 -->
        <div class="tabs-container" style="flex-shrink: 0; overflow: hidden">
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
        <div v-if="breadcrumbs.length" class="breadcrumb-container pa-2">
          <v-breadcrumbs :items="breadcrumbs" density="compact">
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

        <!-- 文件内容显示区域 -->
        <div class="flex-grow-1 d-flex flex-column" style="overflow: hidden">
          <!-- 编辑器区域 -->
          <div :style="{ height: showTerminal ? '60%' : '100%' }" style="overflow: hidden">
            <!-- PDF 预览 -->
            <iframe
              v-if="isPDF(selectedFileName)"
              :src="getPDFUrl()"
              style="width: 100%; height: 100%; border: none"
            ></iframe>

            <!-- DOCX 预览 -->
            <div
              v-else-if="isDocx(selectedFileName) && renderedDocx"
              class="pa-4"
              style="height: 100%; overflow-y: auto"
              v-html="renderedDocx"
            ></div>

            <!-- XLSX 预览 -->
            <div
              v-else-if="isXlsx(selectedFileName) && renderedXlsx"
              class="pa-4"
              style="height: 100%; overflow-y: auto"
              v-html="renderedXlsx"
            ></div>

            <!-- 代码编辑器 -->
            <div v-else-if="fileContent !== null" class="monaco-container">
              <MonacoEditor
                v-model:value="fileContent"
                :language="detectedLanguage"
                :theme="currentTheme"
                :options="monacoOptions"
                @editor-mounted="onEditorMounted"
              />
            </div>

            <!-- 空状态 -->
            <div
              v-else
              class="d-flex align-center justify-center h-100 text-grey-lighten-1"
              style="flex-direction: column"
            >
              <v-icon size="64" class="mb-4">mdi-file-outline</v-icon>
              <p class="text-h6">选择一个文件开始预览</p>
            </div>
          </div>

          <!-- 终端区域 -->
          <div v-if="showTerminal" style="height: 40%; border-top: 1px solid #e0e0e0">
            <VirtualTerminal
              :initial-path="newRootPath || localPath"
              :height="'100%'"
              :dark-mode="currentTheme === 'vs-dark'"
              @close="showTerminal = false"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 进度对话框 -->
    <v-dialog v-model="progressDialog" persistent max-width="400">
      <v-card>
        <v-card-title class="text-h6">{{ progressTitle }}</v-card-title>
        <v-card-text>
          <v-progress-linear
            v-model="progress"
            color="primary"
            height="8"
            class="mb-2"
          ></v-progress-linear>
          <p class="text-body-2 mb-0">{{ progressMessage }}</p>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Git 模态框 -->
    <v-dialog v-model="gitModal" max-width="800" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-git</v-icon>
          Git 操作
          <v-spacer></v-spacer>
          <v-btn icon size="small" @click="gitModal = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text>
          <v-tabs v-model="gitTab" density="compact">
            <v-tab value="status">状态</v-tab>
            <v-tab value="commit">提交</v-tab>
            <v-tab value="branch">分支</v-tab>
          </v-tabs>

          <v-tabs-window v-model="gitTab" class="mt-4">
            <!-- 状态标签页 -->
            <v-tabs-window-item value="status">
              <div class="git-output">
                <pre
                  v-if="gitOutput"
                  class="pa-3"
                  style="
                    background: #f5f5f5;
                    border-radius: 4px;
                    max-height: 300px;
                    overflow-y: auto;
                  "
                  >{{ gitOutput }}</pre
                >
                <p v-else class="text-grey">点击刷新查看 Git 状态</p>
              </div>
              <v-btn color="primary" class="mt-2" @click="runGitCommand('status')">
                <v-icon class="mr-1">mdi-refresh</v-icon>
                刷新状态
              </v-btn>
            </v-tabs-window-item>

            <!-- 提交标签页 -->
            <v-tabs-window-item value="commit">
              <v-textarea
                v-model="commitMessage"
                label="提交信息"
                placeholder="输入提交信息..."
                rows="3"
                variant="outlined"
                class="mb-3"
              ></v-textarea>
              <div class="d-flex gap-2">
                <v-btn color="orange" @click="runGitCommand('add .')">
                  <v-icon class="mr-1">mdi-plus</v-icon>
                  添加所有文件
                </v-btn>
                <v-btn color="primary" :disabled="!commitMessage.trim()" @click="commitChanges">
                  <v-icon class="mr-1">mdi-source-commit</v-icon>
                  提交更改
                </v-btn>
              </div>
              <div v-if="gitOutput" class="git-output mt-3">
                <pre
                  class="pa-3"
                  style="
                    background: #f5f5f5;
                    border-radius: 4px;
                    max-height: 200px;
                    overflow-y: auto;
                  "
                  >{{ gitOutput }}</pre
                >
              </div>
            </v-tabs-window-item>

            <!-- 分支标签页 -->
            <v-tabs-window-item value="branch">
              <div class="mb-3">
                <h4>当前分支: {{ currentBranch || '未知' }}</h4>
              </div>
              <div class="mb-3">
                <h4>所有分支:</h4>
                <v-list density="compact" class="branch-list">
                  <v-list-item
                    v-for="branch in branches"
                    :key="branch"
                    :class="{ 'bg-primary': branch === currentBranch }"
                    @click="checkoutBranch(branch)"
                  >
                    <v-list-item-title>{{ branch }}</v-list-item-title>
                    <template #append>
                      <v-icon v-if="branch === currentBranch" color="primary">mdi-check</v-icon>
                    </template>
                  </v-list-item>
                </v-list>
              </div>
              <div class="d-flex gap-2 mb-3">
                <v-text-field
                  v-model="newBranchName"
                  label="新分支名称"
                  variant="outlined"
                  density="compact"
                  style="max-width: 200px"
                ></v-text-field>
                <v-btn color="success" :disabled="!newBranchName.trim()" @click="createBranch">
                  <v-icon class="mr-1">mdi-source-branch</v-icon>
                  创建分支
                </v-btn>
              </div>
              <v-btn color="primary" @click="refreshBranches">
                <v-icon class="mr-1">mdi-refresh</v-icon>
                刷新分支列表
              </v-btn>
              <div v-if="gitOutput" class="git-output mt-3">
                <pre
                  class="pa-3"
                  style="
                    background: #f5f5f5;
                    border-radius: 4px;
                    max-height: 200px;
                    overflow-y: auto;
                  "
                  >{{ gitOutput }}</pre
                >
              </div>
            </v-tabs-window-item>
          </v-tabs-window>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- 新建文件对话框 -->
    <v-dialog v-model="newFileDialog" max-width="400">
      <v-card>
        <v-card-title>新建文件</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newFileName"
            label="文件名"
            placeholder="例如: index.js"
            variant="outlined"
            autofocus
            @keyup.enter="confirmCreateFile"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="newFileDialog = false">取消</v-btn>
          <v-btn color="primary" :disabled="!newFileName.trim()" @click="confirmCreateFile"
            >创建</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 新建文件夹对话框 -->
    <v-dialog v-model="newFolderDialog" max-width="400">
      <v-card>
        <v-card-title>新建文件夹</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newFolderName"
            label="文件夹名"
            placeholder="例如: components"
            variant="outlined"
            autofocus
            @keyup.enter="confirmCreateFolder"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="newFolderDialog = false">取消</v-btn>
          <v-btn color="primary" :disabled="!newFolderName.trim()" @click="confirmCreateFolder"
            >创建</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 重命名对话框 -->
    <v-dialog v-model="renameDialog" max-width="400">
      <v-card>
        <v-card-title>重命名</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="renameValue"
            label="新名称"
            variant="outlined"
            autofocus
            @keyup.enter="confirmRename"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="renameDialog = false">取消</v-btn>
          <v-btn color="primary" :disabled="!renameValue.trim()" @click="confirmRename"
            >重命名</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 快捷键帮助对话框 -->
    <v-dialog v-model="shortcutHelpDialog" max-width="600">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-keyboard</v-icon>
          快捷键帮助
          <v-spacer></v-spacer>
          <v-btn variant="total" size="small" @click="shortcutHelpDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <v-list density="compact">
            <v-list-item v-for="shortcut in shortcuts" :key="shortcut.action" class="shortcut-item">
              <template #prepend>
                <kbd class="shortcut-key">{{ getShortcutDisplay(shortcut) }}</kbd>
              </template>
              <v-list-item-title>{{ shortcut.desc }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="shortcutHelpDialog = false">关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.show"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <div v-for="item in contextMenu.items" :key="item.id" class="context-menu-item">
        <div
          v-if="!item.separator"
          class="context-menu-option"
          :class="{ disabled: item.disabled }"
          @click="handleContextMenuAction(item.action)"
        >
          <div class="context-menu-icon">
            <svg v-if="item.icon" :viewBox="item.icon.viewBox" class="menu-icon">
              <path :d="item.icon.path" />
            </svg>
          </div>
          <span class="context-menu-text">{{ item.label }}</span>
          <span v-if="item.shortcut" class="context-menu-shortcut">{{ item.shortcut }}</span>
        </div>
        <div v-else class="context-menu-separator"></div>
      </div>
    </div>

    <!-- 右键菜单背景遮罩 -->
    <div
      v-if="contextMenu.show"
      class="context-menu-overlay"
      @click="hideContextMenu"
      @contextmenu.prevent="hideContextMenu"
    ></div>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">{{
      snackbar.message
    }}</v-snackbar>
  </div>
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
// 使用 window.electron.path 替代 path-browserify
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
import VirtualTerminal from '../components/VirtualTerminal.vue'
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

// 注册组件
const components = {
  MonacoEditor,
  VirtualTerminal,
  LoadingSpinner,
  Treeselect
}

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
  const ext = window.electron.path.extname(selectedFileName.value).slice(1).toLowerCase()
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
const isDark = computed({
  get: () => currentTheme.value === 'vs-dark',
  set: (val) => {
    currentTheme.value = val ? 'vs-dark' : 'vs-light'
  }
})

function toggleTheme() {
  currentTheme.value = currentTheme.value === 'vs-dark' ? 'vs-light' : 'vs-dark'
}

function handlePathChange(newPath) {
  if (newPath) {
    resetTree(newPath).finally(() => {
      loading.value = false
    })
  }
}

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
  },
  rootPath: {
    type: String,
    default: ''
  }
})

// —— 平台检测 ——
const isMacOS = ref(navigator.platform.toUpperCase().indexOf('MAC') >= 0)

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

// 终端相关
const showTerminal = ref(false)

// Git 相关
const gitModal = ref(false)
const gitTab = ref('status')
const gitOutput = ref('')
const newBranchName = ref('')
const commitMessage = ref('')
const gitBranches = ref([])
const currentBranch = ref('')

// 常量配置
// allowedExtensions 常量已删除，现在使用 checkIfTextFile 函数进行智能文件类型检测
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

// 移除懒加载机制，直接遍历所有子路径
// const CHILDREN_THRESHOLD = 1000 // 已移除懒加载阈值
// 检查文件是否为文本文件
async function checkIfTextFile(filePath) {
  try {
    // 首先检查文件扩展名，对于已知的二进制文件类型直接返回false
    const ext = window.electron.path.extname(filePath).toLowerCase()
    const binaryExtensions = [
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
      '.jpeg',
      '.png',
      '.gif',
      '.bmp',
      '.ico',
      '.tiff',
      '.webp',
      '.mp4',
      '.avi',
      '.mov',
      '.wmv',
      '.flv',
      '.mkv',
      '.webm',
      '.mp3',
      '.wav',
      '.flac',
      '.aac',
      '.ogg',
      '.wma',
      '.bin',
      '.dll',
      '.so',
      '.dylib',
      '.class',
      '.jar'
    ]

    if (binaryExtensions.includes(ext)) {
      return false
    }

    // 对于已知的文本文件类型直接返回true
    const textExtensions = [
      '.txt',
      '.js',
      '.ts',
      '.jsx',
      '.tsx',
      '.vue',
      '.html',
      '.css',
      '.scss',
      '.sass',
      '.json',
      '.xml',
      '.yaml',
      '.yml',
      '.md',
      '.markdown',
      '.py',
      '.java',
      '.go',
      '.c',
      '.cpp',
      '.h',
      '.hpp',
      '.cs',
      '.php',
      '.rb',
      '.pl',
      '.sh',
      '.bash',
      '.sql',
      '.log',
      '.conf',
      '.ini',
      '.properties',
      '.csv',
      '.toml',
      '.lock'
    ]

    if (textExtensions.includes(ext)) {
      return true
    }

    // 检查文件是否存在
    try {
      const stats = await window.electron.getFileStats(filePath)
      // 如果文件大小为0，直接返回true允许打开
      if (stats.size === 0) {
        return true
      }
    } catch (error) {
      console.error('获取文件状态失败:', error)
      // 如果文件不存在，也返回true以允许创建新文件
      return true
    }

    // 对于无扩展名或未知扩展名的文件，尝试读取前10个字符
    try {
      const content = await window.electron.readFile(filePath, {
        encoding: 'utf8',
        maxBytes: 10
      })

      // 如果能成功读取并解析为UTF-8字符串，就认为是文本文件
      if (content && typeof content === 'string') {
        return true
      }
    } catch {
      // UTF-8解析失败，尝试作为二进制读取检查
      const buffer = await window.electron.readFile(filePath, {
        encoding: null,
        maxBytes: 1024
      })

      // 检查是否包含null字节或其他二进制字符
      for (let i = 0; i < Math.min(buffer.length, 10); i++) {
        const byte = buffer[i]
        if (byte === 0 || (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13)) {
          return false
        }
      }
      return true
    }

    return true // 默认返回true以支持打开空文件
  } catch (error) {
    console.error('检查文件类型失败:', error)
    return true // 出错时也返回true以支持打开
  }
}
async function initializePage() {
  loading.value = true
  try {
    // 确定要处理的路径和根目录
    let targetPath = props.localPath
    let rootDir = props.rootPath || ''

    if (targetPath) {
      // 如果指定了rootPath，则使用rootPath作为目录树根目录
      if (props.rootPath) {
        rootDir = props.rootPath
      } else {
        // 如果没有指定rootPath，则根据localPath确定根目录
        const isFile = await isFilePath(props.localPath)
        rootDir = isFile ? window.electron.path.dirname(props.localPath) : props.localPath
      }

      // 初始化目录树
      await resetTree(rootDir)

      // 检查localPath是否为文件
      const isFile = await isFilePath(props.localPath)

      if (isFile) {
        // 如果localPath是文件，则展开到该文件并加载文件内容
        await expandToPath(props.localPath)

        // 检查文件是否为文本文件
        const isTextFile = await checkIfTextFile(props.localPath)

        if (isTextFile) {
          // 加载文件内容
          await loadFileByType(props.localPath)

          // 构建面包屑路径
          const breadcrumbPath = buildBreadcrumb(props.localPath)

          // 添加或切换到对应的标签页
          addOrSwitchTab({
            path: props.localPath,
            name: window.electron.path.basename(props.localPath),
            breadcrumbs: breadcrumbPath
          })
        } else {
          // 显示不支持的文件类型警告
          const fileExt = window.electron.path.extname(props.localPath).toLowerCase()
          store.dispatch('snackbar/showSnackbar', {
            message: `不支持的文件类型: ${fileExt || '无扩展名'}`,
            type: 'warning'
          })

          // 仍然选择根目录
          handleNodeSelection([rootDir])
        }
      } else {
        // 如果localPath是目录，则选择该目录
        handleNodeSelection([props.localPath])
      }

      // 更新路径选择器的值
      newRootPath.value = rootDir
    } else if (props.rootPath) {
      // 如果只指定了rootPath而没有localPath，则只初始化目录树
      await resetTree(props.rootPath)
      handleNodeSelection([props.rootPath])
      newRootPath.value = props.rootPath
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
  const isFile = await isFilePath(initialPath)
  let rootDir = isFile ? window.electron.path.dirname(initialPath) : initialPath
  await resetTree(rootDir)
  if (initialPath) {
    if (props.forceReplace) {
      isFile ? expandToPath(initialPath) : handleNodeSelection([rootDir])
    } else {
      expandToPath(initialPath)
    }
    if (isFile) {
      await loadFileByType(initialPath)
      const breadcrumbPath = buildBreadcrumb(initialPath)
      addOrSwitchTab({
        path: initialPath,
        name: window.electron.path.basename(initialPath),
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
  return window.electron.path.extname(fileName).toLowerCase() === '.pdf'
}
function isDocx(fileName) {
  return ['.doc', '.docx'].includes(window.electron.path.extname(fileName).toLowerCase())
}
function isXlsx(fileName) {
  return window.electron.path.extname(fileName).toLowerCase() === '.xlsx'
}
function isMarkdown(fileName) {
  const ext = window.electron.path.extname(fileName).toLowerCase()
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

  // 检查文件是否为文本文件
  const isTextFile = await checkIfTextFile(selectedPath)
  if (!isTextFile) {
    const ext = path.extname(selectedPath).toLowerCase()
    store.dispatch('snackbar/showSnackbar', {
      message: `暂不支持在线预览 "${ext || '该'}" 文件`,
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
    const isFile = await isFilePath(selectedPath)
    if (isFile) {
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
async function isCodeFileName(name) {
  // 检查是否为允许的文件名
  const fileName = path.basename(name)
  if (allowedFileName.includes(fileName)) {
    return true
  }

  // 使用智能文件类型检测
  try {
    return await checkIfTextFile(name)
  } catch (error) {
    // 如果检测失败，返回false
    return false
  }
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
    // 由于已经递归加载了所有子目录，这里直接回调即可
    // 子目录内容已经在初始加载时完成
    callback()
  } else if (action === ASYNC_SEARCH) {
    fetchPathSuggestions(searchQuery)
      .then((results) => {
        const suggestions = results.map((p) => ({
          id: p,
          label: p,
          children: undefined // 路径建议不需要子节点
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
    // 由于已经递归加载了所有子目录，这里不需要再次加载
    // 目录节点的children已经在初始化时完成加载
  } else {
    // 检查文件是否为文本文件
    const isTextFile = await checkIfTextFile(node.path)

    if (!isTextFile) {
      // 不是文本文件，显示提示但不添加标签页
      const ext = path.extname(node.path).toLowerCase()
      const fileName = path.basename(node.path)
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

// 递归加载所有子目录和文件，一次性遍历所有子路径
async function fetchChildren(item, depth = 0) {
  if (!item.isDirectory) return []
  try {
    const children = await window.electron.readDirectory(item.path)
    children.sort((a, b) => b.mtime - a.mtime)
    const visibleChildren = children.filter((child) => !child.name.startsWith('.'))

    // 递归加载所有子目录，不使用懒加载
    const result = []
    for (const child of visibleChildren) {
      let node = {
        name: child.name,
        path: child.fullPath,
        isDirectory: child.isDirectory,
        children: undefined // 文件没有children
      }
      
      // 如果是目录，递归加载其子内容
      if (child.isDirectory) {
        try {
          node.children = await fetchChildren({
            path: child.fullPath,
            isDirectory: true
          }, depth + 1)
        } catch (err) {
          console.error(`加载子目录失败：${child.fullPath}`, err)
          node.children = [] // 加载失败时设为空数组
        }
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
  const relativePath = window.electron.path.relative(homeDir, targetPath)
  const segments = relativePath.split(window.electron.path.sep)
  let currentNode = treeData.value[0]
  let openPaths = [currentNode.path]
  for (const segment of segments) {
    // 由于已经递归加载了所有子目录，这里不需要再次加载
    // 直接查找子节点即可
    if (!currentNode.children) {
      console.warn(`节点 ${currentNode.path} 没有子节点`)
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
    const isFile = await isFilePath(url)
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

async function isFilePath(filePath) {
  // 先通过树结构判断：若找到节点，就以节点的isDirectory为准
  const node = findNodeByPath(treeData.value, filePath)
  if (node) {
    if (node.isDirectory) return false
    // 使用新的文本文件检查函数
    return await checkIfTextFile(node.path)
  }

  // 如果在树中找不到节点，检查文件是否存在并且是文本文件
  try {
    const stats = await window.electron.getFileStats(filePath)
    if (stats.isDirectory()) return false
    return await checkIfTextFile(filePath)
  } catch (error) {
    // 文件不存在或无法访问
    return false
  }
}

async function resetTree(newPath) {
  const isFile = await isFilePath(newPath)
  const targetPath = isFile ? path.dirname(newPath) : newPath
  
  // 保存当前展开状态
  const previousOpenNodes = [...openNodes.value]
  
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
    
    // 恢复展开状态，如果之前有展开的节点且仍然存在，则保持展开
    if (previousOpenNodes.length > 0) {
      // 验证之前展开的节点是否仍然存在
      const validOpenNodes = []
      for (const nodePath of previousOpenNodes) {
        if (await pathExists(nodePath)) {
          validOpenNodes.push(nodePath)
        }
      }
      openNodes.value = validOpenNodes.length > 0 ? validOpenNodes : [targetPath]
    } else {
      openNodes.value = [targetPath]
    }
  } catch (e) {
    console.error('路径加载失败:', e)
  }
}

// 检查路径是否存在的辅助函数
async function pathExists(filePath) {
  try {
    await window.electron.getFileStats(filePath)
    return true
  } catch {
    return false
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
        title: repo.desc ? `${omit(repo.desc, 15)}(${repo.name})` : repo.name,
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
  () => [props.localPath, props.rootPath],
  ([newLocalPath, newRootPath]) => {
    if (newLocalPath || newRootPath) {
      initializePage()
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

// 终端相关状态已移至VirtualTerminal组件中

// 终端配置已移至VirtualTerminal组件中

// 终端初始化已移至VirtualTerminal组件中

// 终端相关功能已移至VirtualTerminal组件中

// Git 相关方法
function openGitModal() {
  gitModal.value = true
  runGitCommand('status')
  refreshBranches()
}

async function runGitCommand(command) {
  try {
    const result = await window.electron.gitCommand({
      command,
      cwd: localPath.value
    })
    gitOutput.value = result.output || result.error || '命令执行完成'
  } catch (error) {
    gitOutput.value = `错误: ${error.message}`
  }
}

async function commitChanges() {
  if (!commitMessage.value.trim()) return

  try {
    const result = await window.electron.gitCommand({
      command: `commit -m "${commitMessage.value}"`,
      cwd: localPath.value
    })
    gitOutput.value = result.output || result.error || '提交完成'
    commitMessage.value = ''

    // 刷新状态
    setTimeout(() => {
      runGitCommand('status')
    }, 500)
  } catch (error) {
    gitOutput.value = `提交失败: ${error.message}`
  }
}

async function refreshBranches() {
  try {
    const result = await window.electron.gitCommand({
      command: 'branch -a',
      cwd: localPath.value
    })

    if (result.output) {
      const branchLines = result.output.split('\n').filter((line) => line.trim())
      gitBranches.value = []

      branchLines.forEach((line) => {
        const cleanLine = line.replace(/^[\s\*]+/, '').trim()
        if (cleanLine && !cleanLine.startsWith('remotes/')) {
          gitBranches.value.push(cleanLine)
          if (line.startsWith('*')) {
            currentBranch.value = cleanLine
          }
        }
      })
    }
  } catch (error) {
    gitOutput.value = `获取分支失败: ${error.message}`
  }
}

async function checkoutBranch(branchName) {
  if (branchName === currentBranch.value) return

  try {
    const result = await window.electron.gitCommand({
      command: `checkout ${branchName}`,
      cwd: localPath.value
    })
    gitOutput.value = result.output || result.error || '切换分支完成'

    // 刷新分支列表
    setTimeout(() => {
      refreshBranches()
    }, 500)
  } catch (error) {
    gitOutput.value = `切换分支失败: ${error.message}`
  }
}

async function createBranch() {
  if (!newBranchName.value.trim()) return

  try {
    const result = await window.electron.gitCommand({
      command: `checkout -b ${newBranchName.value}`,
      cwd: localPath.value
    })
    gitOutput.value = result.output || result.error || '创建分支完成'
    newBranchName.value = ''

    // 刷新分支列表
    setTimeout(() => {
      refreshBranches()
    }, 500)
  } catch (error) {
    gitOutput.value = `创建分支失败: ${error.message}`
  }
}

// 监听器
watch(gitTab, (newTab) => {
  if (newTab === 'status') {
    runGitCommand('status')
  } else if (newTab === 'branch') {
    refreshBranches()
  }
})

// 侧边栏相关状态
const sidebarVisible = ref(true)
const sidebarWidth = ref(300)
const isResizing = ref(false)

// 文件历史备份
const fileHistory = ref(new Map()) // 存储文件的历史版本
const maxHistoryVersions = 10

// 新建文件对话框
const newFileDialog = ref(false)
const newFileName = ref('')
const newFolderDialog = ref(false)
const newFolderName = ref('')

// 重命名对话框
const renameDialog = ref(false)
const renameValue = ref('')
const renameTargetPath = ref('')

// 快捷键帮助对话框
const shortcutHelpDialog = ref(false)

// 长按cmd键相关状态
const cmdKeyPressed = ref(false)
const cmdKeyTimer = ref(null)
const CMD_LONG_PRESS_DURATION = 1200 // 长按时间阈值（毫秒）

// 右键菜单状态
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  items: [],
  target: null,
  targetType: null // 'tab' | 'file' | 'folder'
})

// 剪贴板状态
const clipboard = ref({
  type: null, // 'copy' | 'cut'
  path: null
})

// 侧边栏功能
function toggleSidebar() {
  sidebarVisible.value = !sidebarVisible.value
}

// 侧边栏调整大小
function startResize(event) {
  isResizing.value = true
  const startX = event.clientX
  const startWidth = sidebarWidth.value

  function handleMouseMove(e) {
    if (!isResizing.value) return
    const newWidth = startWidth + (e.clientX - startX)
    sidebarWidth.value = Math.max(200, Math.min(600, newWidth))
  }

  function handleMouseUp() {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 文件操作功能
function createNewFile() {
  newFileName.value = ''
  newFileDialog.value = true
}

function createNewFolder() {
  newFolderName.value = ''
  newFolderDialog.value = true
}

async function confirmCreateFile() {
  if (!newFileName.value.trim()) return

  try {
    // 确定创建目录：优先使用右键菜单的目标路径，其次使用当前选中路径的目录，最后使用根路径
    let currentDir
    if (contextMenu.value.target?.path) {
      // 从右键菜单触发，检查目标是文件还是文件夹
      const targetPath = contextMenu.value.target.path
      try {
        const stats = await window.electron.getFileStats(targetPath)
        currentDir = stats.isDirectory ? targetPath : path.dirname(targetPath)
      } catch {
        currentDir = path.dirname(targetPath)
      }
    } else {
      // 从其他方式触发（如快捷键）
      currentDir = selectedPath.value ? path.dirname(selectedPath.value) : newRootPath.value
    }
    
    const newFilePath = path.join(currentDir, newFileName.value)

    await window.electron.saveFile(newFilePath, '', { encoding: 'utf-8' })

    // 直接添加新文件节点到目录树
    const newFileNode = {
      name: newFileName.value,
      path: newFilePath,
      isDirectory: false,
      children: undefined
    }
    addNodeToTree(currentDir, newFileNode)

    // 打开新创建的文件
    await loadFileByType(newFilePath)

    newFileDialog.value = false
    store.dispatch('snackbar/showSnackbar', {
      message: `文件 ${newFileName.value} 创建成功`,
      type: 'success'
    })
  } catch (err) {
    store.dispatch('snackbar/showSnackbar', {
      message: `创建文件失败：${err.message}`,
      type: 'error'
    })
  }
}

async function confirmCreateFolder() {
  if (!newFolderName.value.trim()) return

  try {
    // 确定创建目录：优先使用右键菜单的目标路径，其次使用当前选中路径的目录，最后使用根路径
    let currentDir
    if (contextMenu.value.target?.path) {
      // 从右键菜单触发，检查目标是文件还是文件夹
      const targetPath = contextMenu.value.target.path
      try {
        const stats = await window.electron.getFileStats(targetPath)
        currentDir = stats.isDirectory ? targetPath : path.dirname(targetPath)
      } catch {
        currentDir = path.dirname(targetPath)
      }
    } else {
      // 从其他方式触发（如快捷键）
      currentDir = selectedPath.value ? path.dirname(selectedPath.value) : newRootPath.value
    }
    
    const newFolderPath = path.join(currentDir, newFolderName.value)

    await window.electron.createDirectory(newFolderPath)

    // 直接添加新文件夹节点到目录树
    const newFolderNode = {
      name: newFolderName.value,
      path: newFolderPath,
      isDirectory: true,
      children: [] // 新建的空文件夹，子内容为空数组
    }
    addNodeToTree(currentDir, newFolderNode)

    newFolderDialog.value = false
    store.dispatch('snackbar/showSnackbar', {
      message: `文件夹 ${newFolderName.value} 创建成功`,
      type: 'success'
    })
  } catch (err) {
    store.dispatch('snackbar/showSnackbar', {
      message: `创建文件夹失败：${err.message}`,
      type: 'error'
    })
  }
}

// 重命名文件/文件夹
async function renameFile(filePath) {
  renameTargetPath.value = filePath
  renameValue.value = path.basename(filePath)
  renameDialog.value = true
}

// 确认重命名
async function confirmRename() {
  if (!renameValue.value.trim() || !renameTargetPath.value) return

  try {
    const oldPath = renameTargetPath.value
    const newPath = path.join(path.dirname(oldPath), renameValue.value)
    
    // 检查新文件名是否与原文件名相同
    if (oldPath === newPath) {
      renameDialog.value = false
      return
    }
    
    // 检查新文件是否已存在
    try {
      await window.electron.getFileStats(newPath)
      store.dispatch('snackbar/showSnackbar', {
        message: '文件名已存在，请选择其他名称',
        type: 'error'
      })
      return
    } catch {
      // 文件不存在，可以继续重命名
    }

    // 使用move接口进行重命名
    await window.electron.moveFile(oldPath, newPath)
    
    // 如果重命名的是当前打开的文件，更新标签页
    const tabIndex = tabs.value.findIndex(tab => tab.path === oldPath)
    if (tabIndex !== -1) {
      tabs.value[tabIndex].path = newPath
      tabs.value[tabIndex].name = path.basename(newPath)
      if (activeTab.value === tabIndex) {
        selectedPath.value = newPath
      }
    }

    // 直接更新目录树中的节点
    updateNodeInTree(oldPath, newPath)

    renameDialog.value = false
    store.dispatch('snackbar/showSnackbar', {
      message: `重命名成功`,
      type: 'success'
    })
  } catch (err) {
    store.dispatch('snackbar/showSnackbar', {
      message: `重命名失败：${err.message}`,
      type: 'error'
    })
  }
}

// 直接操作树节点的函数
function addNodeToTree(parentPath, newNode) {
  const parentNode = findNodeByPath(treeData.value, parentPath)
  if (parentNode && parentNode.isDirectory) {
    if (!parentNode.children) {
      parentNode.children = []
    }
    // 检查节点是否已存在
    const existingIndex = parentNode.children.findIndex(child => child.path === newNode.path)
    if (existingIndex === -1) {
      // 插入新节点并保持排序（目录在前，文件在后，按名称排序）
      const insertIndex = parentNode.children.findIndex(child => {
        if (newNode.isDirectory && !child.isDirectory) return true
        if (!newNode.isDirectory && child.isDirectory) return false
        return newNode.name.localeCompare(child.name) < 0
      })
      if (insertIndex === -1) {
        parentNode.children.push(newNode)
      } else {
        parentNode.children.splice(insertIndex, 0, newNode)
      }
    }
  }
}

function removeNodeFromTree(nodePath) {
  const parentPath = path.dirname(nodePath)
  const parentNode = findNodeByPath(treeData.value, parentPath)
  if (parentNode && parentNode.children) {
    const nodeIndex = parentNode.children.findIndex(child => child.path === nodePath)
    if (nodeIndex !== -1) {
      parentNode.children.splice(nodeIndex, 1)
    }
  }
}

function updateNodeInTree(oldPath, newPath) {
  const node = findNodeByPath(treeData.value, oldPath)
  if (node) {
    node.path = newPath
    node.name = path.basename(newPath)
    // 如果节点有子节点，需要递归更新所有子节点的路径
    if (node.children) {
      updateChildrenPaths(node.children, oldPath, newPath)
    }
  }
}

function updateChildrenPaths(children, oldParentPath, newParentPath) {
  children.forEach(child => {
    const relativePath = window.electron.path.relative(oldParentPath, child.path)
    child.path = window.electron.path.join(newParentPath, relativePath)
    if (child.children) {
      updateChildrenPaths(child.children, oldParentPath, newParentPath)
    }
  })
}

// 刷新文件树（保留原函数作为备用）
async function refreshFileTree() {
  if (newRootPath.value) {
    await resetTree(newRootPath.value)
  }
}

// 删除当前文件
async function deleteCurrentFile() {
  if (!selectedPath.value) return

  const confirmed = await window.electron.showMessageBox({
    type: 'warning',
    buttons: ['删除', '取消'],
    defaultId: 1,
    message: `确定要删除文件 "${path.basename(selectedPath.value)}" 吗？`,
    detail: '此操作不可撤销。'
  })

  if (confirmed.response === 0) {
    try {
      await window.electron.deleteFile(selectedPath.value)

      // 关闭对应的标签页
      const tabIndex = tabs.value.findIndex((tab) => tab.path === selectedPath.value)
      if (tabIndex !== -1) {
        removeTab(tabIndex)
      }

      // 直接从目录树中删除节点
      removeNodeFromTree(selectedPath.value)

      store.dispatch('snackbar/showSnackbar', {
        message: '文件删除成功',
        type: 'success'
      })
    } catch (err) {
      store.dispatch('snackbar/showSnackbar', {
        message: `删除文件失败：${err.message}`,
        type: 'error'
      })
    }
  }
}

// 文件历史备份功能
function saveToHistory(filePath, content) {
  if (!fileHistory.value.has(filePath)) {
    fileHistory.value.set(filePath, [])
  }

  const history = fileHistory.value.get(filePath)
  history.unshift({
    content,
    timestamp: new Date(),
    id: Date.now()
  })

  // 限制历史版本数量
  if (history.length > maxHistoryVersions) {
    history.splice(maxHistoryVersions)
  }
}

// 恢复文件历史版本
function restoreFromHistory(filePath, historyId) {
  const history = fileHistory.value.get(filePath)
  if (!history) return

  const version = history.find((v) => v.id === historyId)
  if (version) {
    fileContent.value = version.content
    store.dispatch('snackbar/showSnackbar', {
      message: '文件已恢复到历史版本',
      type: 'success'
    })
  }
}

// 标签页导航
function navigateToNextTab() {
  if (tabs.value.length <= 1) return
  const nextIndex = (activeTab.value + 1) % tabs.value.length
  activeTab.value = nextIndex
  selectTab(tabs.value[nextIndex])
}

function navigateToPrevTab() {
  if (tabs.value.length <= 1) return
  const prevIndex = activeTab.value === 0 ? tabs.value.length - 1 : activeTab.value - 1
  activeTab.value = prevIndex
  selectTab(tabs.value[prevIndex])
}

// 关闭当前标签页
function closeCurrentTab() {
  if (tabs.value.length > 0 && activeTab.value >= 0) {
    removeTab(activeTab.value)
  }
}

// 关闭其他标签页
function closeOtherTabs() {
  if (tabs.value.length <= 1) return

  const currentTab = tabs.value[activeTab.value]
  tabs.value = [currentTab]
  activeTab.value = 0
}

// 关闭所有标签页
function closeAllTabs() {
  tabs.value = []
  activeTab.value = -1
  fileContent.value = null
  selectedPath.value = ''
}

// 快捷键定义
const shortcuts = [
  { key: 'Ctrl+S', mac: 'Cmd+S', desc: '保存文件', action: 'save' },
  { key: 'Ctrl+N', mac: 'Cmd+N', desc: '新建文件', action: 'newFile' },
  { key: 'Ctrl+B', mac: 'Cmd+B', desc: '切换侧边栏', action: 'toggleSidebar' },
  { key: 'Ctrl+`', mac: 'Cmd+`', desc: '切换终端', action: 'toggleTerminal' },
  { key: 'Ctrl+W', mac: 'Cmd+W', desc: '关闭标签页', action: 'closeTab' },
  { key: 'Ctrl+Tab', mac: 'Ctrl+Tab', desc: '下一个标签页', action: 'nextTab' },
  { key: 'Ctrl+Shift+Tab', mac: 'Ctrl+Shift+Tab', desc: '上一个标签页', action: 'prevTab' },
  { key: 'Ctrl+Shift+P', mac: 'Cmd+Shift+P', desc: '命令面板', action: 'commandPalette' },
  { key: 'F5', mac: 'F5', desc: '刷新文件树', action: 'refresh' },
  { key: 'Delete', mac: 'Delete', desc: '删除文件', action: 'deleteFile' },
  { key: 'F1', mac: 'F1', desc: '显示快捷键帮助', action: 'showHelp' }
]

// 获取当前平台的快捷键显示
function getShortcutDisplay(shortcut) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  return isMac ? shortcut.mac : shortcut.key
}

// 处理cmd键长按
function handleCmdKeyDown(event) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

  // 检查页面是否有焦点
  if (!document.hasFocus()) {
    return
  }

  // if (isMac && event.metaKey && !cmdKeyPressed.value) {
  //   cmdKeyPressed.value = true
  //   cmdKeyTimer.value = setTimeout(() => {
  //     // 长按cmd键显示命令面板
  //     shortcutHelpDialog.value = true
  //   }, CMD_LONG_PRESS_DURATION)
  // }
}

function handleCmdKeyUp(event) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

  if (isMac && !event.metaKey && cmdKeyPressed.value) {
    cmdKeyPressed.value = false

    // 清除定时器
    if (cmdKeyTimer.value) {
      clearTimeout(cmdKeyTimer.value)
      cmdKeyTimer.value = null
    }

    // 松开cmd键自动隐藏面板
    if (shortcutHelpDialog.value) {
      shortcutHelpDialog.value = false
    }
  }
}

// 键盘快捷键处理
function handleKeyboardShortcuts(event) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey

  // 处理cmd键长按逻辑
  handleCmdKeyDown(event)

  // Ctrl/Cmd + S - 保存文件
  if (ctrlOrCmd && event.key === 's') {
    event.preventDefault()
    saveDocument()
    return
  }

  // Ctrl/Cmd + N - 新建文件
  if (ctrlOrCmd && event.key === 'n') {
    event.preventDefault()
    createNewFile()
    return
  }

  // Ctrl/Cmd + B - 切换侧边栏
  if (ctrlOrCmd && event.key === 'b') {
    event.preventDefault()
    toggleSidebar()
    return
  }

  // Ctrl/Cmd + ` - 切换终端
  if (ctrlOrCmd && event.key === '`') {
    event.preventDefault()
    showTerminal.value = !showTerminal.value
    return
  }

  // Ctrl/Cmd + W - 关闭标签页
  if (ctrlOrCmd && event.key === 'w') {
    event.preventDefault()
    closeCurrentTab()
    return
  }

  // Ctrl + Tab - 下一个标签页
  if (event.ctrlKey && event.key === 'Tab' && !event.shiftKey) {
    event.preventDefault()
    navigateToNextTab()
    return
  }

  // Ctrl + Shift + Tab - 上一个标签页
  if (event.ctrlKey && event.key === 'Tab' && event.shiftKey) {
    event.preventDefault()
    navigateToPrevTab()
    return
  }

  // F5 - 刷新文件树
  if (event.key === 'F5') {
    event.preventDefault()
    refreshFileTree()
    return
  }

  // Delete - 删除文件
  if (event.key === 'Delete' && selectedPath.value) {
    event.preventDefault()
    deleteCurrentFile()
    return
  }

  // F1 - 显示快捷键帮助
  if (event.key === 'F1') {
    event.preventDefault()
    shortcutHelpDialog.value = true
    return
  }

  // Ctrl/Cmd + Shift + P - 命令面板（暂时显示快捷键帮助）
  if (ctrlOrCmd && event.shiftKey && event.key === 'P') {
    event.preventDefault()
    shortcutHelpDialog.value = true
    return
  }
}

// 右键菜单图标定义
const menuIcons = {
  open: {
    viewBox: '0 0 24 24',
    path: 'M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z'
  },
  folder: {
    viewBox: '0 0 24 24',
    path: 'M19,20H4C2.89,20 2,19.1 2,18V6C2,4.89 2.89,4 4,4H10L12,6H19A2,2 0 0,1 21,8H21L4,8V18L6.14,10H23.21L20.93,18.5C20.7,19.37 19.92,20 19,20Z'
  },
  copy: {
    viewBox: '0 0 24 24',
    path: 'M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z'
  },
  cut: {
    viewBox: '0 0 24 24',
    path: 'M9.64,7.64C10.37,6.91 10.37,5.73 9.64,5C8.91,4.27 7.73,4.27 7,5C6.27,5.73 6.27,6.91 7,7.64C7.73,8.37 8.91,8.37 9.64,7.64M21.64,2.64L10.5,13.78L9.64,12.92L20.78,1.78L21.64,2.64M12.92,9.64L14.5,11.22L2.64,23.08L1.78,22.22L12.92,9.64M17,14C17.73,14.27 18.27,14.73 18.64,15.36C19,16 19,16.73 18.64,17.36C18.27,18 17.73,18.45 17,18.73C16.27,19 15.45,19 14.73,18.73C14,18.45 13.55,18 13.27,17.36C13,16.73 13,16 13.27,15.36C13.55,14.73 14,14.27 14.73,14C15.45,13.73 16.27,13.73 17,14Z'
  },
  paste: {
    viewBox: '0 0 24 24',
    path: 'M19,20H5V4H7V7H17V4H19M12,2A1,1 0 0,1 13,3A1,1 0 0,1 12,4A1,1 0 0,1 11,3A1,1 0 0,1 12,2M19,2H14.82C14.4,0.84 13.3,0 12,0C10.7,0 9.6,0.84 9.18,2H5A2,2 0 0,0 3,4V20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V4A2,2 0 0,0 19,2Z'
  },
  newFile: {
    viewBox: '0 0 24 24',
    path: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z'
  },
  newFolder: {
    viewBox: '0 0 24 24',
    path: 'M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4M15,9V12H18V14H15V17H13V14H10V12H13V9H15Z'
  },
  copyPath: {
    viewBox: '0 0 24 24',
    path: 'M10.59,13.41C11,13.8 11,14.4 10.59,14.81C10.2,15.2 9.6,15.2 9.19,14.81L7.05,12.67C6.64,12.26 6.64,11.65 7.05,11.24L9.19,9.1C9.6,8.69 10.2,8.69 10.59,9.1C11,9.5 11,10.1 10.59,10.51L9.67,11.43H14.32L13.4,10.51C13,10.1 13,9.5 13.4,9.1C13.8,8.69 14.4,8.69 14.81,9.1L16.95,11.24C17.35,11.65 17.35,12.26 16.95,12.67L14.81,14.81C14.4,15.2 13.8,15.2 13.4,14.81C13,14.4 13,13.8 13.4,13.41L14.32,12.49H9.67L10.59,13.41M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z'
  },
  delete: {
    viewBox: '0 0 24 24',
    path: 'M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z'
  },
  refresh: {
    viewBox: '0 0 24 24',
    path: 'M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z'
  },
  rename: {
    viewBox: '0 0 24 24',
    path: 'M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z'
  }
}

// 右键菜单功能
function showContextMenu(event, type, target = null) {
  event.preventDefault()
  event.stopPropagation()

  const items = getContextMenuItems(type, target)

  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    items,
    target,
    targetType: type
  }

  // 确保菜单不会超出屏幕边界
  nextTick(() => {
    const menu = document.querySelector('.context-menu')
    if (menu) {
      const rect = menu.getBoundingClientRect()
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight

      if (rect.right > windowWidth) {
        contextMenu.value.x = windowWidth - rect.width - 10
      }
      if (rect.bottom > windowHeight) {
        contextMenu.value.y = windowHeight - rect.height - 10
      }
    }
  })
}

function hideContextMenu() {
  contextMenu.value.show = false
}

function getContextMenuItems(type, target) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const cmdOrCtrl = isMac ? 'Cmd' : 'Ctrl'

  if (type === 'tab') {
    return [
      {
        id: 'open-in-folder',
        label: '在文件夹中显示',
        icon: menuIcons.folder,
        action: 'openInFolder'
      },
      { separator: true },
      {
        id: 'copy-path',
        label: '复制路径',
        icon: menuIcons.copyPath,
        action: 'copyPath'
      },
      { separator: true },
      {
        id: 'close-tab',
        label: '关闭',
        shortcut: `${cmdOrCtrl}+W`,
        action: 'closeTab'
      },
      {
        id: 'close-other-tabs',
        label: '关闭其他标签页',
        action: 'closeOtherTabs'
      },
      {
        id: 'close-all-tabs',
        label: '关闭所有标签页',
        action: 'closeAllTabs'
      }
    ]
  }

  if (type === 'file') {
    return [
      {
        id: 'open',
        label: '打开',
        icon: menuIcons.open,
        action: 'openFile'
      },
      {
        id: 'open-in-folder',
        label: '在文件夹中显示',
        icon: menuIcons.folder,
        action: 'openInFolder'
      },
      { separator: true },
      {
        id: 'copy',
        label: '复制',
        icon: menuIcons.copy,
        shortcut: `${cmdOrCtrl}+C`,
        action: 'copyFile'
      },
      {
        id: 'cut',
        label: '剪切',
        icon: menuIcons.cut,
        shortcut: `${cmdOrCtrl}+X`,
        action: 'cutFile'
      },
      {
        id: 'paste',
        label: '粘贴',
        icon: menuIcons.paste,
        shortcut: `${cmdOrCtrl}+V`,
        action: 'pasteFile',
        disabled: !clipboard.value.path
      },
      { separator: true },
      {
        id: 'new-file',
        label: '新建文件',
        icon: menuIcons.newFile,
        shortcut: `${cmdOrCtrl}+N`,
        action: 'newFile'
      },
      {
        id: 'new-folder',
        label: '新建文件夹',
        icon: menuIcons.newFolder,
        action: 'newFolder'
      },
      { separator: true },
      {
        id: 'rename',
        label: '重命名',
        icon: menuIcons.rename,
        shortcut: 'F2',
        action: 'renameFile'
      },
      {
        id: 'copy-path',
        label: '复制路径',
        icon: menuIcons.copyPath,
        action: 'copyPath'
      },
      { separator: true },
      {
        id: 'delete',
        label: '删除',
        icon: menuIcons.delete,
        shortcut: 'Delete',
        action: 'deleteFile'
      }
    ]
  }

  if (type === 'folder') {
    return [
      {
        id: 'open-in-folder',
        label: '在文件夹中显示',
        icon: menuIcons.folder,
        action: 'openInFolder'
      },
      { separator: true },
      {
        id: 'copy',
        label: '复制',
        icon: menuIcons.copy,
        shortcut: `${cmdOrCtrl}+C`,
        action: 'copyFile'
      },
      {
        id: 'cut',
        label: '剪切',
        icon: menuIcons.cut,
        shortcut: `${cmdOrCtrl}+X`,
        action: 'cutFile'
      },
      {
        id: 'paste',
        label: '粘贴',
        icon: menuIcons.paste,
        shortcut: `${cmdOrCtrl}+V`,
        action: 'pasteFile',
        disabled: !clipboard.value.path
      },
      { separator: true },
      {
        id: 'new-file',
        label: '新建文件',
        icon: menuIcons.newFile,
        shortcut: `${cmdOrCtrl}+N`,
        action: 'newFile'
      },
      {
        id: 'new-folder',
        label: '新建文件夹',
        icon: menuIcons.newFolder,
        action: 'newFolder'
      },
      { separator: true },
      {
        id: 'rename',
        label: '重命名',
        icon: menuIcons.rename,
        shortcut: 'F2',
        action: 'renameFile'
      },
      {
        id: 'copy-path',
        label: '复制路径',
        icon: menuIcons.copyPath,
        action: 'copyPath'
      },
      { separator: true },
      {
        id: 'delete',
        label: '删除',
        icon: menuIcons.delete,
        shortcut: 'Delete',
        action: 'deleteFile'
      }
    ]
  }

  return []
}

// 标签页右键菜单处理
function handleTabContextMenu(event, tab, index) {
  showContextMenu(event, 'tab', { tab, index })
}

// 文件树右键菜单处理
function handleFileTreeContextMenu(event) {
  // 获取点击的节点信息
  const target = event.target.closest('.vue-treeselect__option')
  if (!target) return

  // 从DOM中获取节点信息
  const nodeText = target.querySelector('.vue-treeselect__label')?.textContent
  if (!nodeText) return

  // 判断是文件还是文件夹
  const isFolder = target.classList.contains('vue-treeselect__option--branch')
  const nodePath = getNodePathFromText(nodeText)

  showContextMenu(event, isFolder ? 'folder' : 'file', { path: nodePath, name: nodeText })
}

// 从节点文本获取完整路径
function getNodePathFromText(nodeText) {
  // 递归查找文件树中匹配的节点
  function findNodeByName(nodes, name) {
    for (const node of nodes) {
      if (node.name === name) {
        return node
      }
      if (node.children) {
        const found = findNodeByName(node.children, name)
        if (found) return found
      }
    }
    return null
  }
  
  const node = findNodeByName(treeData.value, nodeText)
  return node ? node.path : path.join(newRootPath.value || '', nodeText)
}

// 右键菜单动作处理
async function handleContextMenuAction(action) {
  const target = contextMenu.value.target
  hideContextMenu()

  try {
    switch (action) {
      case 'openFile':
        if (target?.path) {
          await loadFileByType(target.path)
        }
        break

      case 'openInFolder':
        const pathToShow = target?.tab?.path || target?.path
        if (pathToShow) {
          await window.electron.showItemInFolder(pathToShow)
        }
        break

      case 'copyFile':
        if (target?.path || target?.tab?.path) {
          clipboard.value = {
            type: 'copy',
            path: target?.path || target?.tab?.path
          }
          store.dispatch('snackbar/showSnackbar', {
            message: '已复制到剪贴板',
            type: 'success'
          })
        }
        break

      case 'cutFile':
        if (target?.path || target?.tab?.path) {
          clipboard.value = {
            type: 'cut',
            path: target?.path || target?.tab?.path
          }
          store.dispatch('snackbar/showSnackbar', {
            message: '已剪切到剪贴板',
            type: 'success'
          })
        }
        break

      case 'pasteFile':
        if (clipboard.value.path) {
          await handlePasteFile(target?.path || newRootPath.value)
        }
        break

      case 'copyPath':
        const pathToCopy = target?.tab?.path || target?.path
        if (pathToCopy) {
          await navigator.clipboard.writeText(pathToCopy)
          store.dispatch('snackbar/showSnackbar', {
            message: '路径已复制到剪贴板',
            type: 'success'
          })
        }
        break

      case 'closeTab':
        if (target?.index !== undefined) {
          removeTab(target.index)
        }
        break

      case 'closeOtherTabs':
        closeOtherTabs()
        break

      case 'closeAllTabs':
        closeAllTabs()
        break

      case 'newFile':
        createNewFile()
        break

      case 'newFolder':
        createNewFolder()
        break

      case 'renameFile':
        const pathToRename = target?.path || target?.tab?.path
        if (pathToRename) {
          await renameFile(pathToRename)
        }
        break

      case 'deleteFile':
        const pathToDelete = target?.path || target?.tab?.path
        if (pathToDelete) {
          await deleteFileByPath(pathToDelete)
        }
        break
    }
  } catch (error) {
    store.dispatch('snackbar/showSnackbar', {
      message: `操作失败：${error.message}`,
      type: 'error'
    })
  }
}

// 粘贴文件处理
async function handlePasteFile(targetDir) {
  if (!clipboard.value.path) return

  const sourcePath = clipboard.value.path
  const fileName = path.basename(sourcePath)
  
  // 检查目标路径是否为目录，如果是文件则使用其父目录
  let actualTargetDir = targetDir
  try {
    const stats = await window.electron.getFileStats(targetDir)
    if (!stats.isDirectory) {
      actualTargetDir = path.dirname(targetDir)
    }
  } catch (error) {
    // 如果获取文件状态失败，假设是目录
    console.warn('无法获取目标路径状态，假设为目录:', error)
  }
  console.log('实际目标目录:', actualTargetDir)
  // 检查actualTargetDir，如果与sourcePath属于同级目录，则忽略操作
  if (path.dirname(sourcePath) === actualTargetDir) {
    store.dispatch('snackbar/showSnackbar', {
      message: '无法将文件移动到自身',
      type: 'warning'
    })
    return
  }
  const targetPath = path.join(actualTargetDir, fileName)

  try {

    if (clipboard.value.type === 'copy') {
      await window.electron.copyFile(sourcePath, targetPath)
      
      // 直接添加复制的文件/文件夹节点到目标目录
      const stats = await window.electron.getFileStats(targetPath)
      const newNode = {
        name: fileName,
        path: targetPath,
        isDirectory: stats.isDirectory,
        children: stats.isDirectory ? null : undefined
      }
      addNodeToTree(actualTargetDir, newNode)
      
      store.dispatch('snackbar/showSnackbar', {
        message: '文件复制成功',
        type: 'success'
      })
    } else if (clipboard.value.type === 'cut') {
      await window.electron.moveFile(sourcePath, targetPath)
      
      // 从原位置删除节点
      removeNodeFromTree(sourcePath)
      
      // 在目标位置添加节点
      const stats = await window.electron.getFileStats(targetPath)
      const newNode = {
        name: fileName,
        path: targetPath,
        isDirectory: stats.isDirectory,
        children: stats.isDirectory ? null : undefined
      }
      addNodeToTree(actualTargetDir, newNode)
      
      clipboard.value = { type: null, path: null } // 清空剪贴板
      store.dispatch('snackbar/showSnackbar', {
        message: '文件移动成功',
        type: 'success'
      })
    }
  } catch (error) {
    store.dispatch('snackbar/showSnackbar', {
      message: `操作失败：${error.message}`,
      type: 'error'
    })
  }
}

// 根据路径删除文件
async function deleteFileByPath(filePath) {
  const confirmed = await window.electron.showMessageBox({
    type: 'warning',
    buttons: ['删除', '取消'],
    defaultId: 1,
    message: `确定要删除 "${path.basename(filePath)}" 吗？`,
    detail: '此操作不可撤销。'
  })

  if (confirmed.response === 0) {
    try {
      await window.electron.deleteFile(filePath)

      // 关闭对应的标签页
      const tabIndex = tabs.value.findIndex((tab) => tab.path === filePath)
      if (tabIndex !== -1) {
        removeTab(tabIndex)
      }

      // 直接从目录树中删除节点
      removeNodeFromTree(filePath)

      store.dispatch('snackbar/showSnackbar', {
        message: '文件删除成功',
        type: 'success'
      })
    } catch (err) {
      store.dispatch('snackbar/showSnackbar', {
        message: `删除文件失败：${err.message}`,
        type: 'error'
      })
    }
  }
}

// 生命周期挂载时执行初始化
onMounted(() => {
  initializePage()

  // 添加全局键盘事件监听
  document.addEventListener('keydown', handleKeyboardShortcuts)
  document.addEventListener('keyup', handleCmdKeyUp)

  // 添加全局点击事件监听，用于隐藏右键菜单
  document.addEventListener('click', hideContextMenu)
})

// 组件卸载时清理
onUnmounted(() => {
  // 移除键盘事件监听
  document.removeEventListener('keydown', handleKeyboardShortcuts)
  document.removeEventListener('keyup', handleCmdKeyUp)
  document.removeEventListener('click', hideContextMenu)

  // 清理定时器
  if (cmdKeyTimer.value) {
    clearTimeout(cmdKeyTimer.value)
    cmdKeyTimer.value = null
  }
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

/* 工具栏样式 */
.v-toolbar {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface-rgb), 0.12);
  padding: 0 16px !important;
}

/* 工具栏区域 */
.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-center {
  display: flex;
  align-items: center;
}

/* 工具栏按钮 */
.v-toolbar .v-btn {
  margin: 0 2px;
}

.v-toolbar .v-btn .v-icon {
  font-size: 18px;
}

/* 标签页样式 */
.v-tabs .v-tab,
.v-tabs .v-tab .text-blue-grey-darken-4 {
  text-transform: none !important;
}
.vue-treeselect--single .vue-treeselect__option--selected {
  background: rgb(var(--v-theme-on-surface-variant)) !important;
  color: rgb(var(--v-theme-surface-variant)) !important;
}

/* 终端样式已移至VirtualTerminal组件中 */

/* 快捷键样式 */
kbd {
  background: rgba(var(--v-theme-surface-variant), 0.8);
  border: 1px solid rgba(var(--v-theme-outline), 0.3);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.9);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  display: inline-block;
  min-width: 20px;
  text-align: center;
}

/* 等宽字体样式 */
.font-mono {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
}

/* 命令历史列表样式 */
.v-list-item:hover .font-mono {
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 4px;
  padding: 2px 4px;
  transition: all 0.2s ease;
}

/* 响应式样式 */
@media (max-width: 768px) {
  kbd {
    font-size: 10px;
    padding: 1px 4px;
  }
}

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  background: rgba(var(--v-theme-surface), 1);
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  min-width: 200px;
  padding: 4px 0;
  backdrop-filter: blur(8px);
}

.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: transparent;
}

.context-menu-option {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.context-menu-option:hover:not(.disabled) {
  background: rgba(var(--v-theme-primary), 0.1);
}

.context-menu-option.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.context-menu-icon {
  width: 16px;
  height: 16px;
  margin-right: 12px;
  flex-shrink: 0;
}

.menu-icon {
  width: 100%;
  height: 100%;
  fill: currentColor;
}

.context-menu-text {
  flex: 1;
  white-space: nowrap;
}

.context-menu-shortcut {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-left: 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.context-menu-separator {
  height: 1px;
  background: rgba(var(--v-theme-outline), 0.1);
  margin: 4px 0;
}

/* 侧边栏样式 */
.sidebar-container {
  border-right: 1px solid rgba(var(--v-theme-outline), 0.2);
  background: rgba(var(--v-theme-surface), 1);
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-header {
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.1);
  background: rgba(var(--v-theme-surface-variant), 0.5);
  min-height: 40px;
}

.file-actions {
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.1);
  background: rgba(var(--v-theme-surface), 1);
}

.file-tree-container {
  flex: 1;
  overflow: auto;
}

.sidebar-resizer {
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  z-index: 10;
}

.sidebar-resizer:hover {
  background: rgba(var(--v-theme-primary), 0.3);
}

.sidebar-toggle-btn {
  position: absolute;
  top: 50%;
  left: 8px;
  transform: translateY(-50%);
  z-index: 100;
  background: rgba(var(--v-theme-surface), 0.9);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 标签页样式修复 */
.tabs-container {
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.2);
  background: rgba(var(--v-theme-surface), 1);
}

.tabs-wrapper {
  min-height: 32px;
}

.tab-item {
  min-width: 120px !important;
  max-width: 200px !important;
  padding: 0 8px !important;
  text-transform: none !important;
  justify-content: space-between !important;
}

.tab-text {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 4px;
}

.tab-close-btn {
  opacity: 0.6;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
}

.tab-item:hover .tab-close-btn {
  opacity: 1;
}

.tab-close-btn:hover {
  background: rgba(var(--v-theme-error), 0.1) !important;
  color: rgb(var(--v-theme-error)) !important;
}

/* 确保标签页容器不会溢出 */
.v-tabs {
  overflow: hidden;
}

.v-tabs .v-slide-group__content {
  overflow-x: auto;
  scrollbar-width: thin;
}

.v-tabs .v-slide-group__content::-webkit-scrollbar {
  height: 2px;
}

.v-tabs .v-slide-group__content::-webkit-scrollbar-track {
  background: transparent;
}

.v-tabs .v-slide-group__content::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-outline), 0.3);
  border-radius: 1px;
}

/* 快捷键帮助样式 */
.shortcut-item {
  padding: 8px 16px;
}

.shortcut-key {
  min-width: 120px;
  text-align: center;
  margin-right: 16px;
  font-weight: 600;
}

/* 文件操作按钮样式 */
.file-actions .v-btn {
  margin: 0 2px;
  position: relative;
}

.file-actions .v-btn:hover {
  background: rgba(var(--v-theme-primary), 0.1);
}

/* 专业IDE风格的图标按钮 */
.file-actions .v-btn .v-icon {
  transition: all 0.2s ease;
}

.file-actions .v-btn:hover .v-icon {
  transform: scale(1.1);
}

/* 新建文件按钮特殊样式 */
.file-actions .v-btn[title*='新建文件'] {
  position: relative;
}

.file-actions .v-btn[title*='新建文件']:before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 14px;
  background: currentColor;
  mask: url('data:image/svg+xml,<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg>')
    no-repeat center;
  mask-size: contain;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.file-actions .v-btn[title*='新建文件']:hover:before {
  opacity: 0.3;
}

/* 新建文件夹按钮特殊样式 */
.file-actions .v-btn[title*='新建文件夹']:before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 12px;
  background: currentColor;
  mask: url('data:image/svg+xml,<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4M15,9V12H18V14H15V17H13V14H10V12H13V9H15Z"/></svg>')
    no-repeat center;
  mask-size: contain;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.file-actions .v-btn[title*='新建文件夹']:hover:before {
  opacity: 0.3;
}

/* 刷新按钮特殊样式 */
.file-actions .v-btn[title*='刷新']:before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background: currentColor;
  mask: url('data:image/svg+xml,<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/></svg>')
    no-repeat center;
  mask-size: contain;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.file-actions .v-btn[title*='刷新']:hover:before {
  opacity: 0.3;
}

/* 响应式调整 */
@media (max-width: 1024px) {
  .sidebar-container {
    width: 250px !important;
  }

  .tab-item {
    min-width: 100px !important;
    max-width: 150px !important;
  }
}

@media (max-width: 768px) {
  .sidebar-container {
    width: 200px !important;
  }

  .tab-item {
    min-width: 80px !important;
    max-width: 120px !important;
  }

  .shortcut-key {
    min-width: 80px;
    font-size: 10px;
  }
}

/* 工具栏响应式 */
@media (max-width: 1200px) {
  .toolbar-center .v-autocomplete {
    width: 400px !important;
  }
}

@media (max-width: 900px) {
  .toolbar-center .v-autocomplete {
    width: 300px !important;
  }
}

/* 修复原有的字段宽度问题 */
:deep(.v-field) {
  min-width: auto;
}

/* 确保主内容区域不会被挤压 */
.flex-grow-1 {
  min-width: 0;
  flex: 1 1 auto;
}

/* 动画效果 */
.sidebar-container {
  transition: width 0.3s ease;
}

.sidebar-toggle-btn {
  transition: all 0.3s ease;
}

/* 选中状态样式 */
.v-tab--selected {
  background: rgba(var(--v-theme-primary), 0.1) !important;
}

/* 文件树选中项样式 */
.vue-treeselect__option--selected {
  background: rgba(var(--v-theme-primary), 0.2) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
}

/* 加载状态样式 */
.loading-container {
  background: rgba(var(--v-theme-surface), 0.9);
  backdrop-filter: blur(4px);
}

/* 对话框样式优化 */
.v-dialog .v-card {
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* 按钮悬停效果 */
.v-btn:hover {
  transform: translateY(-1px);
  transition: transform 0.2s ease;
}

.v-btn:active {
  transform: translateY(0);
}
</style>
