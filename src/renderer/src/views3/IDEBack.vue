<!-- FileBrowserWithMonaco.vue -->
<template>
  <!-- 根容器保持不变 -->
  <v-container fluid class="cover-fill" style="height: 90vh">
    <!-- loading 动画保持 -->
    <v-row v-if="loading" align="center" justify="center" style="height: 100vh">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate color="primary" size="70" />
      </v-col>
    </v-row>

    <!-- 主体内容区 -->
    <div v-else style="height: 100%">
      <!-- 顶部工具栏：原样保留 -->
      <v-row>
        <v-toolbar class="mb-1">
          <v-toolbar-title>
            <v-icon>mdi-code-block-tags</v-icon>
          </v-toolbar-title>

          <!-- ===== 右侧下拉框 & 按钮逻辑保持不变 ===== -->
          <!--（此处代码与原文件一致，故省略缩进变化，仅微调行尾空格）-->
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
              style="width: 400px"
              @focus="loadPathSuggestions"
              @update:menu="resetRoot"
            />
            <v-tooltip text="更新代码">
              <template #activator="{ props }">
                <v-btn v-bind="props" title="更新代码" outlined plain class="mr-2" @click="pull">
                  <v-icon>mdi-git</v-icon> 更新代码
                </v-btn>
              </template>
            </v-tooltip>
            <v-tooltip text="从文件夹打开">
              <template #activator="{ props }">
                <v-btn v-bind="props" outlined plain class="mr-2" @click="openOutside(breadcrumbs, true)">
                  <v-icon>mdi-folder-eye</v-icon> 从文件夹打开
                </v-btn>
              </template>
            </v-tooltip>
            <v-tooltip text="从程序打开">
              <template #activator="{ props }">
                <v-btn v-bind="props" outlined plain class="mr-2" @click="openOutside(breadcrumbs, false)">
                  <v-icon>mdi-file-search-outline</v-icon> 从本地应用程序打开
                </v-btn>
              </template>
            </v-tooltip>
          </div>
        </v-toolbar>
      </v-row>

      <!-- ====== ★★ 关键替换区域开始 ★★ ====== -->
      <!-- 原先 Treeselect + 预览结构已被整体替换为 VS Code 风格的文件树 + MonacoEditor -->
      <v-row style="display: flex; height: calc(100% - 10px)">
        <!-- 左侧：简易文件树 -->
        <v-col
          cols="12"
          md="4"
          lg="3"
          class="mb-4"
          style="width: 300px; max-width: 300px; position: relative"
        >
          <v-card outlined class="pa-2 h-100" style="height: 100%; overflow: auto">
            <v-card-title class="subtitle-1">文件列表</v-card-title>
            <v-divider></v-divider>

            <!-- 采用 v-list 渲染简洁文件树 -->
            <v-list dense nav class="mt-2">
              <v-list-item
                v-for="file in files"
                :key="file"
                :class="{ 'bg-blue-grey-lighten-4': file === activeFile }"
                @click="openFile(file)"
              >
                <template #prepend>
                  <v-icon v-if="fileTypeIcon(file)" class="mr-2">{{ fileTypeIcon(file) }}</v-icon>
                </template>
                <v-list-item-title class="text-body-2">{{ file }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- 右侧：MonacoEditor 代码编辑器 -->
        <v-col
          cols="12"
          md="8"
          lg="9"
          class="mb-4 d-flex flex-column h-100"
          style="width: 72%; max-width: 72%"
        >
          <v-card outlined class="h-100 d-flex flex-column">
            <!-- 标签栏（可选）：如果需要多文件标签，可自行扩展，此处只保留单页演示 -->
            <v-card-title class="py-2">
              <v-icon class="mr-1">mdi-file-code</v-icon>
              <span class="text-subtitle-2">{{ activeFile }}</span>
            </v-card-title>
            <v-divider />

            <!-- MonacoEditor 所在区域 -->
            <v-card-text class="flex-grow-1 pa-0" style="overflow: hidden">
              <MonacoEditor
                v-model="code"
                :language="languageForFile(activeFile)"
                :options="editorOptions"
                class="editor-instance"
                style="height: 100%; width: 100%"
              />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
      <!-- ====== ★★ 关键替换区域结束 ★★ ====== -->

      <!-- Snackbar & 进度条对话框（保持原逻辑） -->
      <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
        {{ snackbar.message }}
      </v-snackbar>

      <v-dialog v-model="progressDialog" persistent max-width="400">
        <v-card>
          <v-card-title class="text-center">{{ progressTitle }}</v-card-title>
          <v-card-text>
            <v-progress-linear :model-value="progress" color="primary" height="25" striped>
              <template #default="{ value }"><strong>{{ Math.ceil(value) }}%</strong></template>
            </v-progress-linear>
            <div class="text-center mt-2">{{ progressMessage }}</div>
          </v-card-text>
        </v-card>
      </v-dialog>
    </div>
  </v-container>
</template>

<script setup lang="ts">
/* ------------------------------------------------------
 * 依赖 & 核心状态：保留原引用，再新增 MonacoEditor 设置
 * ---------------------------------------------------- */
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useStore } from 'vuex'
import MonacoEditor from 'monaco-editor-vue3'   // ★ 新增
import path from 'path-browserify'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'

/* ------- Vuex store 与 Snackbar 原逻辑 ------- */
const store = useStore()
const snackbar = computed(() => store.state.snackbar)

/* ------- 页面加载状态 ------- */
const loading = ref(true)

/* ============ 1. VSCode 风格 IDE 相关响应式数据 ============ */
const files = ref<string[]>([])       // 文件名数组
const activeFile = ref<string>('')    // 当前激活文件
const code = ref<string>('')          // Monaco 中显示的代码
const editorOptions = reactive({
  automaticLayout: true,
  fontSize: 14,
  minimap: { enabled: false },
  theme: 'vs-dark',
})

/* --------- 2. 仍保留的原顶栏 & 拉取仓库相关数据 --------- */
const newRootPath = ref('')
const pathSuggestions = ref([])
const progressDialog = ref(false)
const progress = ref(0)
const progressTitle = ref('')
const progressMessage = ref('')
let progressTimer: ReturnType<typeof setInterval> | null = null

/* ========== 3. 方法：文件树加载、打开文件、语言推断 ========== */

/** 判断文件类型并返回合适的图标（mdi） */
function fileTypeIcon(file: string) {
  const ext = path.extname(file).toLowerCase()
  const mapping: Record<string, string> = {
    '.js': 'mdi-language-javascript',
    '.ts': 'mdi-language-typescript',
    '.vue': 'mdi-vuejs',
    '.json': 'mdi-code-json',
    '.md': 'mdi-markdown',
    '.py': 'mdi-language-python',
    '.java': 'mdi-language-java',
    '.go': 'mdi-language-go',
    // 其余默认
  }
  return mapping[ext] || 'mdi-file'
}

/** 根据文件扩展名推断 Monaco 语言 */
function languageForFile(file: string) {
  const ext = path.extname(file).toLowerCase()
  const map: Record<string, string> = {
    '.js': 'javascript',
    '.ts': 'typescript',
    '.vue': 'vue',
    '.json': 'json',
    '.md': 'markdown',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
  }
  return map[ext] || 'plaintext'
}

/** 打开（点击）文件时：读取内容并显示到 Monaco */
async function openFile(file: string) {
  activeFile.value = file
  try {
    // 此处示例使用 Electron preload 中暴露的 readFile；若非 Electron，可替换为 fetch/axios
    const content = await window.electron.readFile(file, { encoding: 'utf-8' })
    code.value = content
  } catch (err: any) {
    code.value = `/* 读取文件失败：${err.message || err} */`
  }
}

/* ========== 4. 初始化：扫描目标目录下的文件列表（示例/演示用） ========== */
async function scanDirectory(dirPath: string) {
  try {
    const entries = await window.electron.readDirectory(dirPath)
    // 过滤隐藏文件，仅保留常见文本/代码格式
    const allowed = ['.js', '.ts', '.vue', '.json', '.md', '.py', '.java', '.go']
    files.value = entries
      .filter((e) => allowed.includes(path.extname(e.name).toLowerCase()))
      .map((e) => e.fullPath)
    // 默认选中第一个文件
    if (files.value.length) openFile(files.value[0])
  } catch (e) {
    console.error('扫描目录失败：', e)
  }
}

/* -------------- 顶部“拉取代码”与 Snackbar 相关原方法 -------------- */
/* （此处保留原实现，仅移除与 Treeselect 强关联的逻辑，使其可独立运行） */
async function pull() {
  if (!pathSuggestions.value.length) return
  startProgressSimulation()

  try {
    const repo = pathSuggestions.value.find((p) => p.value === newRootPath.value)
    if (repo) {
      await pullRepo(repo) // pullRepo 方法需保证在 preload 中暴露 / 本文件中引入
    }
    completeProgress(true)
    store.dispatch('snackbar/showSnackbar', { message: '代码拉取成功', type: 'success' })
    // 拉取成功后重新扫描目录
    await scanDirectory(newRootPath.value || '.')
  } catch (err: any) {
    console.error('拉取失败:', err)
    completeProgress(false)
    store.dispatch('snackbar/showSnackbar', { message: `拉取失败：${err.message || err}`, type: 'error' })
  }
}

/* --------- 与进度对话框相关的 start/completeProgress 函数保持原样 --------- */
function startProgressSimulation(title = '正在拉取代码') { /* 省略，保持原逻辑 */ }
function completeProgress(success = true) { /* 省略，保持原逻辑 */ }

/* -------------------- 生命周期钩子 -------------------- */
onMounted(async () => {
  // 假设默认扫描用户主目录或 props 指定路径
  const defaultDir = await window.electron.homeDir
  await scanDirectory(defaultDir)
  loading.value = false
})
</script>

<style scoped>
/* Monaco 编辑器占满容器 */
.editor-instance {
  height: 100%;
  width: 100%;
}

/* 文件树高亮样式 */
.bg-blue-grey-lighten-4 {
  background: #e0e0e0 !important;
}

/* 保留原有全局样式（scrollbar、breadcrumb 等）；若不再使用可自行移除 */
pre {
  font-size: 0.9rem;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

/* 其它样式与原文件一致，这里仅示例保留 editor 区块必要样式 */
</style>
