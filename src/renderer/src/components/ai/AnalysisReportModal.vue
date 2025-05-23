<template>
  <v-dialog v-model="visible" max-width="1200" max-height="100vh">
    <div
      class="bg-white bg-opacity-90 rounded-2xl shadow-lg w-11/12 max-w-3xl max-h-[70vh] flex flex-col"
      style="padding: 10px; margin: 10px; border-radius: 5px; "
    >
      <!-- Header -->
      <v-btn @click="close" class="text-gray-500 hover:text-gray-800" color="white">
        <v-icon>mdi-close</v-icon>
      </v-btn>
      <div class="flex items-center justify-between px-6 py-4 border-b">
        <h3 v-if="props.api  === 'deepResearch'" class="text-xl font-semibold">代码分析报告</h3>
        <h3 v-else class="text-xl font-semibold">流程图</h3>
      </div>

      <!-- Status -->
      <div class="flex items-center px-6 py-2 space-x-2 border-b">
        <template v-if="isProcessing">
          <div class="w-5 h-5 border-2 border-t-2 border-gray-300 rounded-full animate-spin"></div>
          <span class="text-gray-600"><span class="text-cyan">{{ scopeText }}</span><v-icon color="warning">mdi-reload</v-icon> 生成中：</span>
        </template>
        <template v-else-if="success">
          <span class="text-green-600"> <span class="text-green">{{ scopeText }}</span><v-icon color="green">mdi-check-circle</v-icon> 文件生成成功！请前往'枢纽'查看！</span>
        </template>
        <template v-else>
          <span class="text-gray-500"><v-icon color="gray">mdi-account-hard-hat</v-icon>等待生成...</span>
        </template>
      </div>

      <!-- Content: flex-1 + min-h-0 + overflow-auto -->
      <div class="flex-1 min-h-0 overflow-auto px-6 py-4 prose max-w-none" style="max-height: 70vh;">
        <div v-if="props.api === 'deepResearch'">
          <div v-html="renderedMarkdown"></div>
        </div>
        <div v-else>
          <div class="flowchart-toolbar mb-2">
            <v-btn variant="outlined" @click="zoomIn"><v-icon>mdi-magnify</v-icon>放大</v-btn>
            <v-btn variant="outlined" @click="zoomOut"><v-icon>mdi-magnify-minus</v-icon>缩小</v-btn>
            <v-btn variant="outlined" @click="resetZoom"><v-icon>mdi-refresh</v-icon>重置</v-btn>
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
import { deepResearch, flowChart } from '../../service/api.js'
import { useStore } from "vuex"
import mermaid from 'mermaid/dist/mermaid.esm.min.mjs'
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

const props = defineProps<{
  modelValue: boolean
  repoID: string
  targetPath: string
  scopeText: string
  wholeRepo: boolean
  api: string
}>()
const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const markdownContent = ref('')
const isProcessing = ref(false)
const success = ref(false)
const scopeText = ref('(' + props.scopeText + ')')
const lastEndIndex = ref(-1)
const isRendering = ref(false)

// —— 1. 初始化 Mermaid ——
// 关闭 startOnLoad，由手动触发渲染
mermaid.initialize({ startOnLoad: false, theme: 'default' })

// —— 2. 配置 MarkdownIt ——
// 支持 HTML、关闭默认链接跳转
const md = new MarkdownIt({ html: true, linkify: false })

// 重写 fence 渲染：遇到 mermaid 代码块，输出 <div class="mermaid">…</div>
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  const info = token.info.trim()  // 语言标识
  if (info === 'mermaid') {
    const code = token.content.trim()
    return `<div class="mermaid">${code}</div>`
  }
  // 其他语言走默认
  return self.renderToken(tokens, idx, options)
}

const renderedMarkdown = computed(() => md.render(markdownContent.value))

// —— 3. 每次 Markdown 渲染完毕后，如果是 flowChart，就触发 Mermaid 渲染 ——
watch(renderedMarkdown, async () => {
  if (props.api !== 'flowChart') return

  // 等待 DOM 更新
  await nextTick()

  try {
    // 更新容器内容
    mermaidContainer.value!.innerHTML = renderedMarkdown.value

    const md = renderedMarkdown.value
    const openTag = '<div class="mermaid">'
    const closeTag = '</div>'

    // 只找第一个开标签和第一个闭标签
    const startIndex = md.indexOf(openTag)
    const endIndex = md.indexOf(closeTag)

    console.log('Mermaid 渲染范围：', startIndex, endIndex)
    if (
      startIndex !== -1 &&
      endIndex !== -1 &&
      startIndex < endIndex &&
      endIndex === lastEndIndex.value
      && !isRendering.value
    ) {
      // 有完整 mermaid 块且还没渲染过
      mermaid.init(undefined, '.prose .mermaid')
      applyZoom()
      console.log('Mermaid 渲染成功', md)
      isRendering.value = true
    } else {
      // lastEndIndex.value =  endIndex
      console.log('跳过 Mermaid 渲染：未检测到完整的 <div class="mermaid">…</div> 块，或已渲染过')
    }
  } catch (e) {
    console.error('Mermaid 渲染失败：', e)
  }
})

watch(visible, (val) => {
  if (val) startStreaming()
  else reset()
})

const reset = () => {
  scopeText.value = '(' + props.scopeText + ')'
  markdownContent.value = ''
  isProcessing.value = false
  success.value = false
  lastEndIndex.value = -1
  isRendering.value = false
}

async function renderingMermaid() {
  if (props.api !== 'flowChart') return
  await nextTick()
  try {
    mermaidContainer.value!.innerHTML = renderedMarkdown.value
    mermaid.init(undefined, '.prose .mermaid')
    applyZoom()
    console.log('Mermaid 渲染成功', renderedMarkdown.value)
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
    if (props.api  === 'deepResearch') {
      store.dispatch('snackbar/showSnackbar', {
        message: `正在异步${scopeText.value}生成代码分析报告…`,
        color: 'info'
      })
      response = await deepResearch(repoID, props.targetPath, without_code, true)
    } else {
      store.dispatch('snackbar/showSnackbar', {
        message: `正在异步${scopeText.value}生成流程图…`,
        color: 'info'
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
        const raw = evt
          .split('\n')
          .filter(line => line.startsWith('data:'))
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
          success.value = true
          isProcessing.value = false
          reader.cancel()
          break
        }
      }
      if (!isProcessing.value) break
    }

    // 处理残余
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
        ? (props.api === 'deepResearch' ? '代码分析报告生成成功' : '流程图生成成功')
        : (props.api === 'deepResearch' ? '代码分析报告生成失败' : '流程图生成失败'),
      color: success.value ? 'success' : 'error'
    })
  }
}

function close() {
  visible.value = false
}
</script>

<style scoped>
</style>
