<template>
  <v-dialog
    v-model="visible"
    persistent
    transition="none"
    overlay-transition="none"
    max-width="550"
    overlay-color="rgba(255,255,255,0.2)"
    overlay-opacity="1"
  >
    <v-card outlined elevation="6" class="pa-6 rounded-lg">
      <!-- 标题 -->
      <v-card-title class="text-h6"> 排除文件管理 </v-card-title>

      <v-divider />

      <!-- 内容区 -->
      <v-card-text class="py-6 px-4 content-area">
        <div>
          <div v-if="localExcludedFiles.length" class="d-flex flex-wrap gap-2 mb-4">
            <v-chip
              v-for="(file, index) in localExcludedFiles"
              :key="file"
              closable
              size="md"
              variant="outlined"
              class="pl-2 pr-2"
              @click:close="remove(index)"
            >
              {{ file }}
            </v-chip>
          </div>
          <div v-else class="text-caption grey--text mb-4">暂无排除文件</div>
        </div>

        <!-- 新增输入区 -->
        <v-text-field
          v-model="newFile"
          label="输入文件路径或名称"
          dense
          hide-details
          clearable
          append-inner-icon="mdi-file-plus"
          outlined
          rounded
          full-width
          @keyup.enter="add"
          @click:append-inner="add"
        />
      </v-card-text>

      <v-divider />

      <!-- 底部操作 -->
      <v-card-actions class="justify-end">
        <v-btn variant="text" size="sm" @click="close">取消</v-btn>
        <v-btn color="primary" variant="tonal" size="sm" @click="confirm"> 确定 </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, toRefs } from 'vue'
import {updateExcludeApi} from '../service/api'
import {
  VDialog,
  VCard,
  VCardTitle,
  VCardText,
  VCardActions,
  VDivider,
  VChip,
  VTextField,
  VBtn
} from 'vuetify/components'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  excludedFiles: { type: Array, default: () => [] },
  projDir: { type: String, default: ''}
})
const emit = defineEmits(['update:modelValue', 'update:excludedFiles'])

const { modelValue: visibleProp, excludedFiles } = toRefs(props)
const visible = ref(visibleProp.value)
const localExcludedFiles = ref([...excludedFiles.value])
const newFile = ref('')

watch(visibleProp, (v) => (visible.value = v))
watch(excludedFiles, (list) => (localExcludedFiles.value = [...list]))

function add() {
  const file = newFile.value.trim()
  if (file && !localExcludedFiles.value.includes(file)) {
    localExcludedFiles.value.push(file)
    newFile.value = ''
  }
}

function remove(idx) {
  localExcludedFiles.value.splice(idx, 1)
}

function close() {
  visible.value = false
  emit('update:modelValue', false)
}

function confirm() {
  emit('update:excludedFiles', [...localExcludedFiles.value])
  updateExcludeApi(props.projDir, localExcludedFiles.value)
  visible.value = false
  emit('update:modelValue', false)
}
</script>

<style scoped>
/* 去除所有过渡动画 */
.v-dialog-transition-enter-active,
.v-dialog-transition-leave-active,
.v-overlay__scrim,
.v-card,
.v-chip {
  transition: none !important;
}

:deep(.v-overlay__scrim) {
  background: rgb(var(--v-theme-surface)) !important;
}

/* 卡片圆角和更高的阴影 */
.v-card {
  border-radius: 16px;
}

/* 内容区背景和圆角 */
.content-area {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}
</style>
