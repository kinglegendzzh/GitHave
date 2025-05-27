<!-- SubmitAnalysisAgent.vue -->
<template>
  <div class="analysis-agent">
    <!-- 全尺寸流程图 -->
    <img :src="agent2Diagram" alt="提交分析智能体工作原理流程图" class="diagram-full" />
    <!-- 原有内容 -->
    <slot />
  </div>
</template>

<script>
import agent2Diagram from '../../assets/flow/agent2.png'

export default {
  name: 'SubmitAnalysisAgent',
  data() {
    return {}
  },
  computed: {
    agent2Diagram() {
      return agent2Diagram
    }
  }
}
</script>

<style scoped>
.diagram-full {
  width: 55%; /* 宽度占满容器 */
  height: auto; /* 高度自适应 */
  display: block; /* 去除底部间距 */
  margin-bottom: 1rem;
  justify-self: center;
  user-select: none;
  pointer-events: none;
}
</style>
