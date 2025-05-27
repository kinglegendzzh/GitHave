<!-- src/components/DemoMermaid.vue -->
<template>
  <!-- 直接用 ref="chart"，Vue 会自动把 DOM 节点赋给 setup 里的 chart.value -->
  <div ref="chart" class="mermaid-demo"></div>
</template>


<script setup lang="ts">
import { ref, onMounted } from 'vue'
import mermaid from 'mermaid/dist/mermaid.esm.min.mjs'

/** 这里不用修改：就声明一个 ref */
const chart = ref<HTMLElement|null>(null)

onMounted(async () => {
  mermaid.initialize({ startOnLoad: false, theme: 'default' })

  const demoCode = `
graph TD
  A[开始] --> B[处理]
  B --> C[结束]
`

  try {
    const { svg } = await mermaid.render('demo-chart', demoCode)
    if (chart.value) {
      chart.value.innerHTML = svg
    }
  } catch (err) {
    console.error('Mermaid 渲染失败:', err)
    if (chart.value) {
      chart.value.textContent = '⚠️ Mermaid 渲染失败，请检查安装'
    }
  }
})
</script>

<style scoped>
.mermaid-demo {
  max-width: 400px;
  margin: 40px auto;
  padding: 10px;
  border: 1px dashed #999;
}
</style>
