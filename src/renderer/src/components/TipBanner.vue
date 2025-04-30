<template>
  <!-- 整体用 v-sheet 承载，支持点击跳转 -->
  <v-sheet
    class="tip-banner"
    elevation="2"
    rounded="lg"
    @click="handleClick"
  >
    <div class="d-flex align-center">
      <!-- 左侧闪电图标 -->
      <v-icon size="24" class="me-2">mdi-flash</v-icon>
      <span class="date-badge">{{ date }}</span>
      <!-- 提示文字，可通过 prop 覆盖 -->
      <span class="tip-text">{{ message }}</span>
    </div>
    <!-- 右侧箭头图标 -->
    <v-icon size="20">mdi-open-in-new</v-icon>
  </v-sheet>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const props = defineProps({
  date: {
    type: String,
    required: true
  },
  /** 显示的消息 */
  message: {
    type: String,
    default: '⚡ Gemini 2.5 Pro and GPT-4.1 are now available—try them for free.',
  },
  /** 点击后跳转的链接 */
  href: {
    type: String,
    default: '#',
  },
})

const router = useRouter()
function handleClick() {
  // 根据需要改为 router.push 或 window.open
  // window.open(props.href, '_blank')
}
</script>

<style scoped>
.tip-banner {
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  transition: background-color 0.2s ease-in-out;
}
.tip-banner:hover {
  background-color: #dadada;
}
.tip-text {
  font-size: 14px;
  line-height: 1.4;
}
.date-badge {
  display: inline-block;
  margin-right: 8px;
  padding: 2px 6px;
  background-color: #ffca28;
  color: #000;
  font-weight: 500;
  border-radius: 4px;
  font-size: 12px;
}
</style>
