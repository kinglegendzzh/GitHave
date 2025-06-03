<template>
  <v-dialog v-model="visible" max-height="90vh" persistent>
    <div
      class="bg-white bg-opacity-90 rounded-2xl shadow-lg w-11/12 max-w-3xl max-h-[90vh] flex flex-col"
      style=" margin: 10px; border-radius: 5px; "
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
              <span class="text-grey-darken-2">(为该仓库提前构建全量索引，可以大幅提升AI分析的速度和质量哦)</span>
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
          <div v-else class="ml-auto flex space-x-2">
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
        <div v-if="props.api === 'deepResearch' || props.api === 'commitsResearch'">
          <div v-html="renderedMarkdown"></div>
        </div>
        <div v-else>
          <div class="flowchart-toolbar mb-2">
            <v-btn variant="outlined" size="small" @click="zoomIn"><v-icon>mdi-magnify</v-icon> 放大</v-btn>
            <v-btn variant="outlined" size="small" @click="zoomOut"><v-icon>mdi-magnify-minus</v-icon> 缩小</v-btn>
            <v-btn variant="outlined" size="small" @click="resetZoom"><v-icon>mdi-refresh</v-icon> 重置</v-btn>
          </div>
          <div ref="mermaidContainer" class="prose max-w-none"></div>
        </div>
      </div>
    </div>
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      rounded="pill"
      elevation="2"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'
import { deepResearch, flowChart, deleteFile, commitsResearch } from '../../service/api.js'
import { useStore } from 'vuex'
import mermaid from 'mermaid/dist/mermaid.esm.min.mjs'
import { useRouter } from 'vue-router'
import html2canvas from 'html2canvas'
import { loadRepoProgress } from "../../storage/progress-storage";

const mermaidContainer = ref<HTMLElement|null>(null)
const zoomLevel = ref(1)
function applyZoom() {
  const svg = mermaidContainer.value?.querySelector<SVGSVGElement>('svg')
  if (svg) {
    svg.style.transformOrigin = '0 0'
    svg.style.transform = `scale(${zoomLevel.value})`
  }
}
function zoomIn()   { zoomLevel.value += 0.1; applyZoom() }
function zoomOut()  { zoomLevel.value = Math.max(0.1, zoomLevel.value - 0.1); applyZoom() }
function resetZoom(){ zoomLevel.value = 1; applyZoom() }

const store = useStore()
const snackbar = computed(() => store.state.snackbar)
const router = useRouter()

const props = defineProps<{
  modelValue: boolean
  repoID: string
  targetPath: string
  scopeText: string
  wholeRepo: boolean
  api: string
  count: number
  commitRecord?: any
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
const lastEndIndex = ref(-1)
const isRendering = ref(false)
let fileIds = []
const MAX_TREE_COUNT = 10

// —— 1. 初始化 Mermaid ——
mermaid.initialize({ startOnLoad: false, theme: 'default' })

// —— 2. 配置 MarkdownIt ——
const md = new MarkdownIt({ html: true, linkify: false })
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  const info = token.info.trim()
  if (info === 'mermaid') {
    const code = token.content.trim()
    return `<div class="mermaid">${code}</div>`
  }
  return self.renderToken(tokens, idx, options)
}
const renderedMarkdown = computed(() => md.render(markdownContent.value))

// —— 3. Mermaid 渲染观察 ——
watch(renderedMarkdown, async () => {
  if (props.api !== 'flowChart') return
  await nextTick()
  try {
    mermaidContainer.value!.innerHTML = renderedMarkdown.value
    const mdStr = renderedMarkdown.value
    const openTag = '<div class="mermaid">'
    const closeTag = '</div>'
    const startIndex = mdStr.indexOf(openTag)
    const endIndex = mdStr.indexOf(closeTag)
    if (
      startIndex !== -1 && endIndex !== -1 && startIndex < endIndex
      && endIndex === lastEndIndex.value && !isRendering.value
    ) {
      mermaid.init(undefined, '.prose .mermaid')
      applyZoom()
      isRendering.value = true
    }
  } catch (e) {
    console.error('Mermaid 渲染失败：', e)
  }
})

watch(visible, (val) => {
  if (val) startStreaming()
  else reset()
})

async function exportDiagram() {
  if (!mermaidContainer.value) return

  // html2canvas 会把 div（包含 SVG）渲染成一张图片
  const canvas = await html2canvas(mermaidContainer.value, {
    scale: 2,            // 可选：提高分辨率
    backgroundColor: 'white' // 不保留透明背景
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

const reset = () => {
  scopeText.value = ''
  markdownContent.value = ''
  isProcessing.value = false
  success.value = false
  lastEndIndex.value = -1
  isRendering.value = false
  fileIds = []
}

async function restartStreaming() {
  reset()
  await startStreaming()
}

async function deleteReport() {
  //二次确认
  if (!confirm('确定要删除报告吗？')) return
  for (let fileIdsKey in fileIds) {
    console.log('delete ', fileIds[fileIdsKey])
    await deleteFile(fileIds[fileIdsKey]).then(
      () => {
        store.dispatch('snackbar/showSnackbar', { message: '文件删除成功', color: 'success' })
      },
      (error) => {
        store.dispatch('snackbar/showSnackbar', { message: '文件删除失败', color: 'error' })
      }
    )
  }
  close()
  reset()
  store.dispatch('snackbar/showSnackbar', { message: '报告已删除', color: 'info' })
}

async function renderingMermaid() {
  if (props.api !== 'flowChart') return
  await nextTick()
  try {
    mermaidContainer.value!.innerHTML = renderedMarkdown.value
    mermaid.init(undefined, '.prose .mermaid')
    applyZoom()
  } catch (e) {
    console.error('Mermaid 渲染失败：', e)
  }
}

async function startStreaming() {
  isProcessing.value = true
  success.value = false
  try {
    const repoID = parseInt(props.repoID)
    const without_code = props.wholeRepo
    let response
    // 估算扫描时间：扫描每个文件平均需要n秒，则扫描props.count个文件需要props.count * n 秒
    const min_n = 2
    const max_n = 6
    // 小数量后2位忽略，自动正则 秒 和 分钟 的转换
    const minEstimatedTime = props.count * min_n < 60 ? props.count * min_n + '秒' : (props.count * min_n / 60).toFixed(0) + '分钟'
    const maxEstimatedTime = props.count * max_n < 60 ? props.count * max_n + '秒' : (props.count * max_n / 60).toFixed(0) + '分钟'
    if (props.api  === 'deepResearch') {
      const saved = loadRepoProgress(repoID);
      if (saved != null) {
        console.log('从 localStorage 读取进度', saved);
        const progress = saved.indexProgress;
        if (progress < 75 && props.count > MAX_TREE_COUNT) {
          const confirmed = window.confirm(
            `当前路径下需要分析${props.count}个代码文件，
            检测到你对该仓库构建的索引量少于75%，如果从未构建过这个路径的索引，可能需要${minEstimatedTime}~${maxEstimatedTime}进行初始化，确定要继续吗？`
          )
          if (!confirmed) {
            visible.value = false
            return
          }
        }
      }
      store.dispatch('snackbar/showSnackbar', {
        message: `正在异步${scopeText.value}生成代码分析报告…`, color: 'info'
      })
      response = await deepResearch(repoID, props.targetPath, without_code, true)
    } else if (props.api === 'commitsResearch') {
      store.dispatch('snackbar/showSnackbar', {
        message: `正在异步${scopeText.value}生成提交记录分析报告…`, color: 'info'
      })
      response = await commitsResearch(repoID, props.commitRecord, true)
    } else {
      const saved = loadRepoProgress(repoID);
      if (saved != null) {
        console.log('从 localStorage 读取进度', saved);
        const progress = saved.indexProgress;
        if (progress < 75 && props.count > MAX_TREE_COUNT) {
          const confirmed = window.confirm(
            `当前路径下需要分析${props.count}个代码文件，
            检测到你对该仓库构建的索引量少于75%，如果从未构建过这个路径的索引，可能需要${minEstimatedTime}~${maxEstimatedTime}进行初始化，确定要继续吗？`
          )
          if (!confirmed) {
            visible.value = false
            return
          }
        }
      }
      store.dispatch('snackbar/showSnackbar', {
        message: `正在异步${scopeText.value}生成流程图…`, color: 'info'
      })
      response = await flowChart(repoID, props.targetPath, without_code, true)
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
        if (data.title) {
          scopeText.value += data.title
        }
        if (data.answer) {
          markdownContent.value += data.answer
        }
        if (data.status === 200) {
          await renderingMermaid()
          if (data.data.md_file_id !== 0) {
            console.log('md_file_id', data.data.md_file_id)
            fileIds.push(data.data.md_file_id)
          }
          if (data.data.doc_file_id !== 0) {
            console.log('doc_file_id', data.data.doc_file_id)
            fileIds.push(data.data.doc_file_id)
          }
          success.value = true
          isProcessing.value = false
          reader.cancel()
          console.log('finished!')
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
           props.api === 'commitsResearch' ? '提交记录分析报告生成成功' : '流程图生成成功')
        : (props.api === 'deepResearch' ? '代码分析报告生成失败' : 
           props.api === 'commitsResearch' ? '提交记录分析报告生成失败' : '流程图生成失败'),
      color: success.value ? 'success' : 'error'
    })
  }
}

function close() {
  if (isProcessing.value == true) {
    store.dispatch('snackbar/showSnackbar', {
      message: '请等待当前任务完成',
      color: 'error'
    })
    return
  }
  visible.value = false
}
</script>

<style scoped>
</style>
