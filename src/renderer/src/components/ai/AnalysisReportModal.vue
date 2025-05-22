<template>
  <v-dialog v-model="visible" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm z-50">
    <div class="bg-white bg-opacity-90 rounded-2xl shadow-lg w-11/12 max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b">
        <h3 class="text-xl font-semibold">代码分析报告</h3>
        <button @click="close" class="text-gray-500 hover:text-gray-800">
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <!-- Status -->
      <div class="flex items-center px-6 py-2 space-x-2 border-b">
        <template v-if="isProcessing">
          <div class="w-5 h-5 border-2 border-t-2 border-gray-300 rounded-full animate-spin"></div>
          <span class="text-gray-600">生成中：{{ scopeText }}</span>
        </template>
        <template v-else-if="success">
          <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span class="text-green-600">生成成功</span>
        </template>
        <template v-else>
          <span class="text-gray-500">等待生成...</span>
        </template>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-auto px-6 py-4 prose max-w-none">
        <div v-html="renderedMarkdown"></div>
      </div>
    </div>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import MarkdownIt from 'markdown-it'
import { deepResearch } from '../../service/api.js'

const props = defineProps<{
  modelValue: boolean
  repoID: string
  targetPath: string
  scopeText: string
}>()
const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const markdownContent = ref('')
const isProcessing = ref(false)
const success = ref(false)

// Markdown parser
const md = new MarkdownIt({ html: true, linkify: true })
const renderedMarkdown = computed(() => md.render(markdownContent.value))

// Watch modal visibility
watch(visible, (val) => {
  if (val) startStreaming()
  else reset()
})

const reset = () => {
  markdownContent.value = ''
  isProcessing.value = false
  success.value = false
}

async function startStreaming() {
  isProcessing.value = true
  success.value = false
  try {
    // 将props.repoID 转换成int类型
    const repoID = parseInt(props.repoID)
    console.log('deepResearch', repoID, props.targetPath)
    const response = await deepResearch(repoID, props.targetPath, false, true)
    if (!response.body) throw new Error('Streaming not supported')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    console.log('开始流式处理...') // 添加调试日志

    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        console.log('流式读取完成') // 添加调试日志
        break
      }

      buffer += decoder.decode(value, { stream: true })
      console.log('当前buffer内容:', buffer) // 添加调试日志

      // 移除开头的'data:'前缀并分割行
      buffer = buffer.replace(/^data:/, '')
      const lines = buffer.split('\n')

      // 保存最后一个不完整的行回缓冲区
      buffer = lines.pop() || ''

      console.log('分割后的lines内容:', lines) // 添加调试日志

      for (const line of lines) {
        const text = line.trim()
        if (!text) continue
        try {
          const data = JSON.parse(text)
          // Append incremental answer
          if (data.answer !== undefined) {
            markdownContent.value += data.answer
            console.log('添加回答内容:', data.answer) // 添加调试日志
          }
          // Check for final status
          if (data.status !== undefined && data.status === 200) {
            console.log('收到成功状态码:', data.status) // 添加调试日志
            success.value = true
            isProcessing.value = false
            reader.cancel()
            break
          }
        } catch (parseError) {
          console.error('JSON解析失败:', parseError, '错误行:', line) // 添加调试日志
        }
      }
      if (!isProcessing.value) break
    }

    // 处理最后剩余在buffer中的内容（如果有的话）
    if (buffer.trim()) {
      console.log('处理最终缓冲区内容:', buffer)
      try {
        const data = JSON.parse(buffer.trim())

        if (data.answer !== undefined) {
          markdownContent.value += data.answer
          console.log('添加最终回答内容:', data.answer)
        }

        if (data.status !== undefined && data.status === 200) {
          console.log('收到成功状态码:', data.status)
          success.value = true
        }
      } catch (parseError) {
        console.error('最终缓冲区JSON解析失败:', parseError, '错误内容:', buffer)
      }
    }
  } catch (error) {
    console.error('流式解析失败:', error)
  } finally {
    console.log('最终状态 - isProcessing:', isProcessing.value, 'success:', success.value) // 添加调试日志
    isProcessing.value = false
  }
}

function close() {
  visible.value = false
}
</script>

<style scoped>
:deep(.v-overlay__scrim) {
  background: rgb(255, 255, 255);
  opacity: 1;
}
</style>
