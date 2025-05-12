<template>
  <div v-if="visible" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-white rounded-lg shadow-lg w-1/2">
      <div class="px-4 py-2 border-b">
        <h3 class="text-lg font-semibold">排除文件管理</h3>
      </div>
      <div class="p-4">
        <!-- 列表展示 -->
        <ul class="space-y-2 mb-4">
          <li v-for="(file, index) in localExcludedFiles" :key="index" class="flex justify-between items-center bg-gray-100 p-2 rounded">
            <span>{{ file }}</span>
            <button class="text-red-500 hover:text-red-700" @click="remove(index)">删除</button>
          </li>
          <li v-if="!localExcludedFiles.length" class="text-gray-500">暂无排除文件</li>
        </ul>
        <!-- 新增输入 -->
        <div class="flex space-x-2">
          <input
            v-model="newFile"
            type="text"
            placeholder="输入文件路径或名称"
            class="flex-1 border rounded px-2 py-1"
            @keyup.enter="add"
          />
          <button @click="add" class="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600">新增</button>
        </div>
      </div>
      <div class="px-4 py-2 border-t flex justify-end">
        <button @click="close" class="mr-2 px-4 py-1 rounded border hover:bg-gray-100">取消</button>
        <button @click="confirm" class="bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, toRefs } from 'vue'

const props = defineProps({
  // 控制弹窗显示
  modelValue: { type: Boolean, required: true },
  // 外部传入的排除文件列表
  excludedFiles: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue', 'update:excludedFiles'])

// 本地状态
const { modelValue: visibleProp, excludedFiles } = toRefs(props)
const visible = ref(visibleProp.value)
const localExcludedFiles = ref([...excludedFiles.value])
const newFile = ref('')

// 同步外部变化到本地
watch(visibleProp, v => visible.value = v)
watch(excludedFiles, list => localExcludedFiles.value = [...list])

// 添加文件
function add() {
  const file = newFile.value.trim()
  if (file && !localExcludedFiles.value.includes(file)) {
    localExcludedFiles.value.push(file)
    newFile.value = ''
  }
}

// 删除文件
function remove(idx) {
  localExcludedFiles.value.splice(idx, 1)
}

// 关闭不保存
function close() {
  visible.value = false
  emit('update:modelValue', false)
}

// 确定并同步到父组件
function confirm() {
  emit('update:excludedFiles', [...localExcludedFiles.value])
  visible.value = false
  emit('update:modelValue', false)
}
</script>

<style scoped>
/* 可根据需求自定义更丰富的样式 */
</style>
