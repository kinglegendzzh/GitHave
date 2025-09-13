<template>
  <v-dialog v-model="visible" max-height="90vh" persistent scrollable>
    <div
      class="bg-white bg-opacity-90 rounded-2xl shadow-lg flex flex-col"
      :style="dialogStyle"
    >
      <!-- Header -->
      <div style="position: absolute; top: 12px; right: 16px; z-index: 10;">
        <v-btn
          icon
          size="small"
          variant="text"
          @click="close"
          class="text-gray-500 hover:text-gray-800"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>
      <div class="flex items-center justify-between px-6 py-4 border-b">
        <h3 v-if="props.api  === 'deepResearch'" class="text-xl font-semibold">代码分析报告</h3>
        <h3 v-else-if="props.api === 'commitsResearch'" class="text-xl font-semibold">提交记录分析报告</h3>
        <h3 v-else-if="props.api === 'weeklyReport'" class="text-xl font-semibold">仓库报刊</h3>
        <h3 v-else class="text-xl font-semibold">流程图</h3>
      </div>

      <!-- Status -->
      <div class="flex items-center px-6 py-2 space-x-2 border-b">
        <template v-if="isProcessing">
          <div class="w-5 h-5 border-2 border-t-2 border-gray-300 rounded-full animate-spin mt-2 mb-2">
            <v-row>
              <span class="text-gray-600"><span class="text-deep-orange-accent-4">{{ scopeText }}</span>
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
                生成中：
              </span>
            </v-row>
            <v-row>
              <span class="text-grey-lighten-1">(如果你第一次分析该路径，系统会花费较长时间为路径构建索引，请耐心等待...)</span>
            </v-row>
          </div>
        </template>
        <template v-else-if="success">
          <span class="text-green-darken-3">{{ scopeText }}</span><v-icon color="green">mdi-check-circle</v-icon>
          <div v-if="props.api === 'deepResearch'" class="ml-auto flex space-x-2">
            <span class="text-green-600"> 更多更详细的分析报告已生成，请前往'文件枢纽'查看！</span>
            <router-link :to="{ name: 'report' }">
              <v-btn color="primary" @click="close" size="small">文件枢纽</v-btn>
            </router-link>
            <v-btn color="error" @click="deleteReport" size="small">删除报告</v-btn>
          </div>
          <div v-else-if="props.api === 'commitsResearch'" class="ml-auto flex space-x-2">
            <span class="text-green-600"> 提交记录分析报告已生成，请前往'文件枢纽'查看！</span>
            <router-link :to="{ name: 'report' }">
              <v-btn color="primary" @click="close" size="small">文件枢纽</v-btn>
            </router-link>
            <v-btn color="error" @click="deleteReport" size="small">删除报告</v-btn>
          </div>
          <div v-else-if="props.api === 'weeklyReport'" class="ml-auto flex space-x-2">
            <span class="text-green-600"> 仓库报刊已生成，请前往'文件枢纽'查看！</span>
            <router-link :to="{ name: 'report' }">
              <v-btn color="primary" @click="close" size="small">文件枢纽</v-btn>
            </router-link>
            <v-btn color="error" @click="deleteReport" size="small">删除报告</v-btn>
          </div>
          <div v-else class="ml-auto flex items-center space-x-2">
            <span class="text-green-600"> 流程图已生成成功！</span>
            <v-btn color="error" variant="outlined" size="small" @click="restartStreaming">不满意?重新生成</v-btn>
            <v-btn variant="outlined" size="small" @click="exportDiagram">
              <v-icon>mdi-download</v-icon> 导出
            </v-btn>
          </div>
        </template>
        <template v-else>
          <span class="text-gray-500"><v-icon color="gray">mdi-account-hard-hat</v-icon> 等待生成...</span>
        </template>
      </div>

      <!-- Content: flex-1 + min-h-0 + overflow-auto -->
      <div class="flex-1 min-h-0 overflow-auto px-6 py-4 prose max-w-none" style="max-height: 70vh; max-width: 90vw;">
        <div v-if="props.api === 'deepResearch' || props.api === 'commitsResearch' || props.api === 'weeklyReport'">
          <div v-html="renderedMarkdown" class="markdown-content" style="padding-left: 10px; padding-right: 10px;"></div>
        </div>
        <div v-else>
          <div class="flow-area flex gap-3">
            <div class="flex-1 min-w-0">
              <div class="flowchart-toolbar mb-2 flex items-center space-x-2">
                <v-btn variant="outlined" size="small" @click="zoomIn"><v-icon>mdi-magnify</v-icon> 放大</v-btn>
                <v-btn variant="outlined" size="small" @click="zoomOut"><v-icon>mdi-magnify-minus</v-icon> 缩小</v-btn>
                <v-btn variant="outlined" size="small" @click="resetZoom"><v-icon>mdi-refresh</v-icon> 重置</v-btn>
                <div v-if="showExplainPanel" class="explain-panel" style="width: 80vw; max-height: 50vh; overflow: auto;">
              <a-card :title="'流程图解释 (' + explanationLines.length + ')'" :bordered="true">
                <template #extra>
                  <a-button type="text" @click="showExplainPanel = false">收起</a-button>
                </template>
                <div v-if="explanationLines.length === 0" style="color:#999;">暂无说明</div>
                <ul v-else class="list-disc pl-4 space-y-1">
                  <li v-for="(line, i) in explanationLines" :key="i">{{ line }}</li>
                </ul>
              </a-card>
            </div>
            <div v-else class="explain-collapsed-handle" style="display:flex; align-items:center;">
              <a-button @click="showExplainPanel = true">流程图解释</a-button>
            </div>
                <v-btn
                  v-if="pendingLarge"
                  color="primary"
                  variant="outlined"
                  size="small"
                  @click="confirmRenderLarge"
                >渲染大型图表</v-btn>
                <v-progress-circular
                  v-if="isRenderingChart"
                  indeterminate
                  size="20"
                  color="primary"
                />
              </div>
              <div 
                ref="mermaidContainer" 
                class="prose max-w-none mermaid-draggable"
                :style="mermaidContainerStyle"
                @mousedown="startDrag"
                @mousemove="onDrag"
                @mouseup="endDrag"
                @mouseleave="endDrag"
              ></div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      elevation="2"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick, onUnmounted } from 'vue'
import type { CSSProperties } from 'vue'
import MarkdownIt from 'markdown-it'
import { deepResearch, flowChart, deleteFile, commitsResearch, generateWeeklyReport } from '../../service/api.js'
import { useStore } from 'vuex'
import mermaid from 'mermaid/dist/mermaid.esm.min.mjs'
import html2canvas from 'html2canvas'

const mermaidContainer = ref<HTMLElement|null>(null)
const zoomLevel = ref(1)

// 窗口大小相关
const mermaidWidth = ref(0)
const mermaidHeight = ref(0)

// 拖动相关
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const translateX = ref(0)
const translateY = ref(0)

// Tooltip 与渲染状态
let hoverTimer: number | null = null
const isRenderingChart = ref(false)
const pendingLarge = ref(false)
const userConfirmLarge = ref(false)

// 解析后的 mermaid 与说明
const mermaidCode = ref('')
const mermaidExplanation = ref('')
// 右侧说明折叠面板
const showExplainPanel = ref(false)
const explanationLines = computed(() => {
  return (mermaidExplanation.value || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => !!s)
})

// 计算样式
const dialogStyle = computed<CSSProperties>(() => ({
  width: mermaidWidth.value > 800 ? '90vw' : '66vw',
  maxWidth: mermaidWidth.value > 1200 ? '95vw' : '80vw',
  height: mermaidHeight.value > 600 ? '85vh' : 'auto',
  maxHeight: '90vh',
  margin: '0 auto',
  borderRadius: '16px',
  position: 'relative' as CSSProperties['position']
}))

const mermaidContainerStyle = computed<CSSProperties>(() => ({
  cursor: isDragging.value ? 'grabbing' : 'grab',
  overflowX: 'auto',
  overflowY: 'auto',
  textAlign: 'left',
  position: 'relative' as CSSProperties['position']
}))

function applyZoom() {
  const svg = mermaidContainer.value?.querySelector<SVGSVGElement>('svg')
  if (svg) {
    svg.style.transformOrigin = '0 0'
    svg.style.transform = `translate(${translateX.value}px, ${translateY.value}px) scale(${zoomLevel.value})`
  }
}

function zoomIn()   { zoomLevel.value += 0.1; applyZoom() }
function zoomOut()  { zoomLevel.value = Math.max(0.1, zoomLevel.value - 0.1); applyZoom() }
function resetZoom(){ 
  zoomLevel.value = 1
  translateX.value = 0
  translateY.value = 0
  applyZoom() 
}

// 拖动功能
function startDrag(event: any) {
  if (props.api !== 'flowChart') return
  isDragging.value = true
  const e = event as MouseEvent
  dragStartX.value = e.clientX - translateX.value
  dragStartY.value = e.clientY - translateY.value
  e.preventDefault()
}

function onDrag(event: any) {
  if (!isDragging.value || props.api !== 'flowChart') return
  const e = event as MouseEvent
  translateX.value = e.clientX - dragStartX.value
  translateY.value = e.clientY - dragStartY.value
  applyZoom()
  e.preventDefault()
}

function endDrag() {
  isDragging.value = false
}

// 自动调整窗口大小与宽图适配
function autoResizeDialog() {
  if (props.api !== 'flowChart') return
  nextTick(() => {
    const svg = mermaidContainer.value?.querySelector<SVGSVGElement>('svg')
    if (svg) {
      const bbox = svg.getBBox()
      mermaidWidth.value = bbox.width
      mermaidHeight.value = bbox.height
      const containerWidth = mermaidContainer.value?.clientWidth || 0
      const viewportH = window.innerHeight

      // 当宽度超过容器：以高度为基准进行自适应，最大显示高度 90vh，固定高度渲染，宽度自适应
      if (containerWidth && bbox.width > containerWidth) {
        svg.style.height = Math.min(viewportH * 0.9, bbox.height || viewportH * 0.9) + 'px'
        svg.style.width = 'auto'
        // 取消缩放变换，避免叠加
        svg.style.transform = ''
        translateX.value = 0
        translateY.value = 0
        zoomLevel.value = 1
      }
    }
  })
}

const store = useStore()
const snackbar = computed(() => store.state.snackbar)

const props = defineProps<{
  modelValue: boolean
  repoID: string
  targetPath: string
  scopeText: string
  wholeCode: boolean
  api: string
  count: number
  commitRecord?: any
  startTime?: string
  endTime?: string
  config?: any
}>()
const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const markdownContent = ref('')
const isProcessing = ref(false)
const success = ref(false)
const scopeText = ref('')
let fileIds: number[] = []

// —— 1. 初始化 Mermaid ——
mermaid.initialize({ startOnLoad: false, theme: 'default' })

// —— 2. 配置 MarkdownIt ——
const md = new MarkdownIt({ html: true, linkify: false })
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  const info = token.info.trim()
  if (info === 'mermaid') {
    const code = token.content.trim()
    return `<div class=\"mermaid\">${code}</div>`
  }
  return self.renderToken(tokens, idx, options)
}
const renderedMarkdown = computed(() => md.render(markdownContent.value))

// —— 辅助：去抖与定点渲染 ——
const lastRenderedMermaid = ref('')
let renderTimer: number | null = null
let streamingClosedFence = false

function extractMermaidCodeFromMarkdown(mdAll: string): { code: string; explanation: string } {
  const m = mdAll.match(/```mermaid\s*([\s\S]*?)```/)
  if (!m) return { code: '', explanation: '' }
  const code = (m[1] || '').trim()
  const explanation = mdAll.slice((m.index ?? 0) + m[0].length).trim()
  return { code, explanation }
}

function scheduleRenderMermaid() {
  if (renderTimer) {
    window.clearTimeout(renderTimer)
    renderTimer = null
  }
  isRenderingChart.value = true
  renderTimer = window.setTimeout(async () => {
    await renderMermaidOnce()
  }, 200)
}

async function renderMermaidOnce() {
  if (props.api !== 'flowChart') { isRenderingChart.value = false; return }
  // 以增量解析得到的 code 为准
  const code = mermaidCode.value || extractMermaidCodeFromMarkdown(markdownContent.value).code
  if (!code) { isRenderingChart.value = false; return }
  if (!streamingClosedFence) { isRenderingChart.value = false; return }
  if (code === lastRenderedMermaid.value) { isRenderingChart.value = false; return }

  // 大图懒加载策略
  const estimatedNodes = (code.match(/\w+\s*\[/g) || []).length
  const isLarge = code.length > 8000 || estimatedNodes > 120
  if (isLarge && !userConfirmLarge.value) {
    pendingLarge.value = true
    isRenderingChart.value = false
    return
  }
  pendingLarge.value = false

  try {
    mermaid.parse(code)
    const { svg } = await mermaid.render('mmd-' + Date.now(), code)
    if (mermaidContainer.value) {
      mermaidContainer.value.innerHTML = svg
      await nextTick()
        autoResizeDialog()
        applyZoom()
      // 记录已渲染代码，避免重复渲染
      lastRenderedMermaid.value = code
    }
  } catch (e) {
    // 解析未通过时跳过
  } finally {
    isRenderingChart.value = false
  }
}

// —— 3. Mermaid 渲染观察 ——
watch(renderedMarkdown, async () => {
  if (props.api !== 'flowChart') return
  scheduleRenderMermaid()
})

watch(visible, (val) => {
  if (val) startStreaming()
  else reset()
})

async function exportDiagram() {
  if (!mermaidContainer.value) return
  const canvas = await html2canvas(mermaidContainer.value, {
    scale: 2,
    backgroundColor: 'white'
  })
  canvas.toBlob(blob => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = scopeText.value + '.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  })
}

function confirmRenderLarge() {
  userConfirmLarge.value = true
  scheduleRenderMermaid()
}

const reset = () => {
  scopeText.value = ''
  markdownContent.value = ''
  isProcessing.value = false
  success.value = false
  lastRenderedMermaid.value = ''
  if (renderTimer) {
    window.clearTimeout(renderTimer)
    renderTimer = null
  }
  streamingClosedFence = false
  fileIds = []
  mermaidCode.value = ''
  mermaidExplanation.value = ''
  pendingLarge.value = false
  userConfirmLarge.value = false
  if (hoverTimer) { window.clearTimeout(hoverTimer); hoverTimer = null }
}

async function restartStreaming() {
  reset()
  await startStreaming()
}

async function deleteReport() {
  if (!confirm('确定要删除报告吗？')) return
  for (let fileIdsKey in fileIds) {
    console.log('delete ', fileIds[fileIdsKey])
    await deleteFile(fileIds[fileIdsKey]).then(
      () => { store.dispatch('snackbar/showSnackbar', { message: '文件删除成功', color: 'success' }) },
      () => { store.dispatch('snackbar/showSnackbar', { message: '文件删除失败', color: 'error' }) }
    )
  }
  close()
  reset()
  store.dispatch('snackbar/showSnackbar', { message: '报告已删除', color: 'info' })
}

async function renderingMermaid() {
  if (props.api !== 'flowChart') return
  streamingClosedFence = true
  await renderMermaidOnce()
}

async function startStreaming() {
  isProcessing.value = true
  success.value = false
  try {
    const repoID = parseInt(props.repoID)
    const without_code = !props.wholeCode
    let response
    if (props.api  === 'deepResearch') {
      store.dispatch('snackbar/showSnackbar', { message: `正在异步${scopeText.value}生成代码分析报告…`, color: 'info' })
      response = await deepResearch(repoID, props.targetPath, without_code, true, props.config)
    } else if (props.api === 'commitsResearch') {
      store.dispatch('snackbar/showSnackbar', { message: `正在异步${scopeText.value}生成提交记录分析报告…`, color: 'info' })
      response = await commitsResearch(repoID, props.commitRecord, true)
    } else if (props.api === 'weeklyReport') {
      store.dispatch('snackbar/showSnackbar', { message: `正在异步${scopeText.value}…`, color: 'info' })
      response = await generateWeeklyReport(repoID, props.startTime ?? '', props.endTime ?? '', true)
    } else {
      store.dispatch('snackbar/showSnackbar', { message: `正在异步${scopeText.value}生成流程图…`, color: 'info' })
      response = await flowChart(repoID, props.targetPath, without_code, true, props.config)
    }
    if (!response.body) throw new Error('Streaming not supported')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const events = buffer.split('\n\n')
      buffer = events.pop() || ''
      for (const evt of events) {
        const raw = evt.split('\n').filter(line => line.startsWith('data:'))
          .map(line => line.slice(5)).join('')
        if (!raw) continue
        const data = JSON.parse(raw)
        if (data.title) { scopeText.value += data.title }
        if (data.answer) {
          markdownContent.value += data.answer
          if (props.api === 'flowChart') {
            const { code, explanation } = extractMermaidCodeFromMarkdown(markdownContent.value)
            mermaidCode.value = code
            mermaidExplanation.value = explanation
            const fenceCount = (markdownContent.value.match(/```mermaid|```/g) || []).length
            streamingClosedFence = fenceCount >= 2 && fenceCount % 2 === 0
            if (streamingClosedFence) scheduleRenderMermaid()
          }
        }
        if (data.status === 200) {
          await renderingMermaid()
          if (data.data && data.data.md_file_id !== 0) { fileIds.push(data.data.md_file_id) }
          if (data.data && data.data.doc_file_id !== 0) { fileIds.push(data.data.doc_file_id) }
          success.value = true
          isProcessing.value = false
          reader.cancel()
          break
        }
      }
      if (!isProcessing.value) break
    }

    if (buffer.trim()) {
      const data = JSON.parse(buffer.trim())
      if (data.answer) markdownContent.value += data.answer
      if (data.status === 200) success.value = true
    }
  } catch (error) {
    console.error('流式解析失败:', error)
  } finally {
    isProcessing.value = false
    store.dispatch('snackbar/showSnackbar', {
      message: success.value
        ? (props.api === 'deepResearch' ? '代码分析报告生成成功' :
           props.api === 'commitsResearch' ? '提交记录分析报告生成成功' :
           props.api === 'weeklyReport' ? '仓库报刊生成成功' : '流程图生成成功')
        : (props.api === 'deepResearch' ? '代码分析报告生成失败' :
           props.api === 'commitsResearch' ? '提交记录分析报告生成失败' :
           props.api === 'weeklyReport' ? '仓库报刊生成失败' : '流程图生成失败'),
      color: success.value ? 'success' : 'error'
    })
  }
}

function close() {
  if (isProcessing.value == true && props.api!== 'flowChart') {
    store.dispatch('snackbar/showSnackbar', { message: '请等待当前任务完成', color: 'error' })
    return
  }
  visible.value = false
}

onUnmounted(() => {
  if (renderTimer) window.clearTimeout(renderTimer)
  if (hoverTimer) window.clearTimeout(hoverTimer)
})
</script>

<style scoped>
.mermaid-draggable {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.mermaid-draggable svg {
  transition: transform 0.1s ease-out;
}

.mermaid-draggable:active {
  cursor: grabbing !important;
}

/* Tooltip 已移除 */


/* Markdown内容样式 */
.markdown-content {
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 4px;
  line-height: 1.6;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin-top: 16px;
  margin-bottom: 8px;
  font-weight: 600;
}

.markdown-content :deep(p) {
  margin-bottom: 12px;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  padding-left: 24px;
  margin-bottom: 12px;
}

.markdown-content :deep(code) {
  background-color: #eee;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
}

.markdown-content :deep(pre) {
  background-color: #f0f0f0;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  margin-bottom: 16px;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid #ddd;
  padding-left: 16px;
  color: #666;
  margin: 12px 0;
}

.markdown-content :deep(a) {
  color: #0366d6;
  text-decoration: none;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
}

.markdown-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 16px;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.markdown-content :deep(th) {
  background-color: #f2f2f2;
}

@media (prefers-color-scheme: dark) {
  /* 模块基本信息卡片夜间模式 */
  .detail-section .v-card.mb-4.pa-3 {
    background-color: #23272e !important;
    color: #e6e6e6 !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
    border: 1px solid #2d333b;
  }
  .detail-section .v-card.mb-4.pa-3 h3 {
    color: #fff !important;
  }
  .detail-section .v-card.mb-4.pa-3 p,
  .detail-section .v-card.mb-4.pa-3 strong {
    color: #e6e6e6 !important;
  }
  .detail-section .v-card.mb-4.pa-3 .v-icon {
    filter: brightness(1.1);
  }
}

@media (prefers-color-scheme: dark) {
  .markdown-content {
    background-color: #23272e;
    color: #e6e6e6;
  }

  .markdown-content :deep(h1),
  .markdown-content :deep(h2),
  .markdown-content :deep(h3),
  .markdown-content :deep(h4),
  .markdown-content :deep(h5),
  .markdown-content :deep(h6) {
    color: #fff;
  }

  .markdown-content :deep(p) {
    color: #e6e6e6;
  }

  .markdown-content :deep(ul),
  .markdown-content :deep(ol) {
    color: #e6e6e6;
  }

  .markdown-content :deep(code) {
    background-color: #2d333b;
    color: #ffea70;
  }

  .markdown-content :deep(pre) {
    background-color: #23272e;
    color: #e6e6e6;
  }

  .markdown-content :deep(blockquote) {
    border-left: 4px solid #444c56;
    color: #b3bac5;
    background: rgba(255, 255, 255, 0.02);
  }

  .markdown-content :deep(a) {
    color: #58a6ff;
  }

  .markdown-content :deep(a:hover) {
    color: #91caff;
  }

  .markdown-content :deep(table) {
    background-color: #23272e;
    color: #e6e6e6;
  }

  .markdown-content :deep(th),
  .markdown-content :deep(td) {
    border: 1px solid #444c56;
    background-color: #23272e;
    color: #e6e6e6;
  }

  .markdown-content :deep(th) {
    background-color: #2d333b;
    color: #fff;
  }
}

</style>
