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
        <div v-html="renderedMarkdown"></div>

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
import { ref, watch, computed } from 'vue'
import MarkdownIt from 'markdown-it'
import { deepResearch, flowChart } from '../../service/api.js'
import { useStore } from "vuex";
import mermaid from 'mermaid/dist/mermaid.esm.min.mjs'
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

// Markdown parser
const md = new MarkdownIt({ html: true, linkify: false })
const renderedMarkdown = computed(() => md.render(markdownContent.value))

watch(visible, (val) => {
  if (val) startStreaming()
  else reset()
})

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx]
  const hrefIndex = token.attrIndex('href')
  if (hrefIndex >= 0) {
    const href = token.attrs[hrefIndex][1]
    token.attrs[hrefIndex][1] = 'javascript:void(0)' // 将链接替换为 void(0)，防止跳转
  }
  return self.renderToken(tokens, idx, options) // 返回正常的 <a> 标签开始部分
}

md.renderer.rules.link_close = function () {
  return '' // 不返回任何内容，避免链接闭合
}

const reset = () => {
  scopeText.value = '(' + props.scopeText + ')'
  markdownContent.value = ''
  isProcessing.value = false
  success.value = false
}

async function startStreaming() {
  isProcessing.value = true
  success.value = false
  try {
    const repoID = parseInt(props.repoID)
    const without_code = props.wholeRepo
    console.log('props.wholeRepo and without_code', props.wholeRepo, without_code)
    let response = null
    if (props.api  === 'deepResearch') {
      console.log('调用 deepResearch，repoID=', repoID, 'targetPath=', props.targetPath)
      store.dispatch('snackbar/showSnackbar', {
        message: `正在异步${scopeText}生成代码分析报告，你可以关闭当前输出稍等片刻后在‘枢纽’中查看...`,
        color: 'info'
      })
      response = await deepResearch(repoID, props.targetPath, without_code, true)
      if (!response.body) throw new Error('Streaming not supported')
    } else {
      console.log('调用 flowChart，repoID=', repoID, 'targetPath=', props.targetPath)
      store.dispatch('snackbar/showSnackbar', {
        message: `正在异步${scopeText}生成流程图，你可以关闭当前输出稍等片刻后在‘枢纽’中查看...`,
        color: 'info'
      })
      response = await flowChart(repoID, props.targetPath, without_code, true)
      if (!response.body) throw new Error('Streaming not supported')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    console.log('开始流式处理...')
    while (true) {
      const { value, done } = await reader.read()
      // console.log('read → done:', done, 'chunk 字节数:', value?.length)
      if (done) {
        console.log('流式读取完成')
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      // console.log('当前 chunk:', chunk)
      buffer += chunk
      // console.log('累积 buffer:', buffer)

      // 按“空行”拆分完整事件
      const events = buffer.split('\n\n')
      buffer = events.pop() || ''
      // console.log('分割后的 events:', events, '剩余 buffer:', buffer)

      for (const evt of events) {
        // console.log('处理事件块:', evt)
        const lines = evt.split('\n')
        let raw = ''
        for (const line of lines) {
          // console.log('事件行:', line)
          if (line.startsWith('data:')) {
            raw += line.slice(5)
          }
        }
        // console.log('拼接 raw JSON:', raw)
        if (!raw) continue

        try {
          const data = JSON.parse(raw)
          // console.log('解析 JSON:', data)
          if (data.title !== undefined && data.title !== '') {
            scopeText.value += data.title
            console.log('添加标题:', data.title)
          }
          if (data.answer !== undefined && data.answer !== '') {
            markdownContent.value += data.answer
            // console.log('添加回答内容:', data.answer)
          }
          if (data.status === 200) {
            console.log('收到成功状态码:', data.status)
            success.value = true
            isProcessing.value = false
            reader.cancel()
            break
          }
        } catch (e) {
          console.error('JSON 解析失败:', e, raw)
        }
      }

      if (!isProcessing.value) break
    }

    // 处理残余 buffer（如果刚好是一条完整 JSON）
    if (buffer.trim()) {
      console.log('处理最终缓冲区内容:', buffer)
      try {
        const data = JSON.parse(buffer.trim())
        console.log('最终解析 JSON:', data)
        if (data.answer !== undefined) {
          markdownContent.value += data.answer
          console.log('添加最终回答内容:', data.answer)
        }
        if (data.status === 200) {
          console.log('收到成功状态码:', data.status)
          success.value = true
        }
      } catch (e) {
        console.error('最终缓冲区 JSON 解析失败:', e, buffer)
      }
    }
  } catch (error) {
    console.error('流式解析失败:', error)
  } finally {
    console.log('最终状态 → isProcessing:', isProcessing.value, 'success:', success.value)
    isProcessing.value = false
    if (props.api  === 'deepResearch') {
      store.dispatch('snackbar/showSnackbar', {
        message: success.value ? '代码分析报告生成成功，在‘枢纽’中查看' : '代码分析报告生成失败',
        color: success.value ? 'success' : 'error'
      })
    } else {
      store.dispatch('snackbar/showSnackbar', {
        message: success.value ? '流程图生成成功，在‘枢纽’中查看' : '流程图生成失败',
        color: success.value ? 'success' : 'error'
      })
    }
  }
}

function close() {
  visible.value = false
}
</script>

<style scoped>
</style>
