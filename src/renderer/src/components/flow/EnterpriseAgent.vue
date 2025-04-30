<!-- EnterpriseAgent.vue -->
<template>
  <div class="enterprise-agent">
    <!-- 全尺寸流程图 -->
    <img :src="agent1Diagram" alt="企业微信智能体工作原理流程图" class="diagram-full" />
    <!-- 原有内容 -->
    <slot />
  </div>
</template>

<script>
import agent1Diagram from '../../assets/flow/wechat_agent.png'

export default {
  name: 'EnterpriseAgent',
  data() {
    return {}
  },
  computed: {
    // 如果需要动态切换图，可在此扩展
    agent1Diagram() {
      return agent1Diagram
    }
  }
}
</script>

<style scoped>
.diagram-full {
  width: 60%; /* 宽度占满容器 */
  height: auto; /* 高度自适应 */
  display: block; /* 去除底部间距 */
  margin-bottom: 1rem;
  justify-self: center;
  user-select: none;
  pointer-events: none;
}
</style>
