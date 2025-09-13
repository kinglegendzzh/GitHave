<template>
  <div class="markdown-viewer">
    <!-- 使用 markdown-content 类名来应用样式 -->
    <div class="markdown-content" v-html="renderedMarkdown"></div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// 定义props
const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

// 这里可以集成markdown解析器，比如marked或markdown-it
// 示例使用简单的文本替换
const renderedMarkdown = computed(() => {
  // 这里应该使用真正的markdown解析器
  // 例如: return marked(props.content)
  return props.content
})
</script>

<style scoped>
/* 引入markdown样式文件 */
@import '../styles/markdown.css';

.markdown-viewer {
  padding: 20px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}
</style>