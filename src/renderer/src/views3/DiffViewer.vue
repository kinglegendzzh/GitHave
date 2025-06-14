<template>
  <v-dialog v-model="internalVisible" max-width="100%" width="90%">
    <v-card>
      <v-toolbar flat>
        <v-toolbar-title>代码差异详情</v-toolbar-title>
        <v-spacer />
        <v-btn icon @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>
      <v-divider />
      <v-card-text style="max-height: 70vh; overflow-y: auto;">
        <v-container fluid>
          <v-expansion-panels multiple>
            <v-expansion-panel v-for="(file, index) in fileDiffs" :key="index" class="mb-6">
              <v-row
                class="mb-6"
              >
                <v-col cols="9">
                  <v-card tonal min-width="400" class="mx-auto">
                    <v-expansion-panel-title>
                      {{ file.Filename }}
                      <v-spacer />
                      <v-chip color="green lighten-4" class="ma-1" text-color="green darken-2">+{{ file.Additions }}</v-chip>
                      <v-chip color="red lighten-4" class="ma-1" text-color="red darken-2">-{{ file.Deletions }}</v-chip>
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                      <div class="merged-diff">
                    <pre class="code-diff"><code>
<span
  v-for="(line, idx) in mergedDiffs[index]"
  :key="idx"
  :class="[
    'diff-line',
    {
      'diff-add': line.type === 'add',
      'diff-del': line.type === 'del',
      'diff-normal': line.type === 'normal'
    }
  ]"
>
  <strong>{{ line.lineNumber.toString().padStart(3, ' ') }} </strong>{{ line.text }}
</span>
                    </code></pre>
                      </div>
                    </v-expansion-panel-text>
                    <v-divider />
                    <v-card-actions tonal>
                      <details>
                        <summary>查看完整文件内容 (原始)</summary>
                        <pre class="full-content">{{ file.FullContent }}</pre>
                      </details>
                    </v-card-actions>
                  </v-card>
                </v-col>
                <!-- 右侧：Twitter 风格评价卡 -->
                <v-col
                  cols="1"
                  style="position: sticky; top: 24px; height: fit-content;"
                >
                  <v-btn disabled style="margin: 5px; padding: 5px;" size="small" class="mr-2" variant="outlined" color="warning">生成AI评价</v-btn>
                  <v-card
                    v-show="file.Evaluation && file.Evaluation.trim() !== ''"
                    class="my-new-card pa-4 mb-4 mx-auto"
                    min-width="250px"
                    outlined
                  >
                    <v-card-title class="title-text">
                      AI评价
                    </v-card-title>

                    <v-card-text class="subtitle-text">
                      {{ file.Evaluation }}
                    </v-card-text>

                    <v-card-actions>
                      <v-btn text color="primary">👍</v-btn>
                    </v-card-actions>
                  </v-card>
                </v-col>
              </v-row>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-container>
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="close">关闭</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, PropType, ref, watch } from "vue";
import { CommitRecord, FileDiff, HunkDetail } from '../types/commit.ts'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true,
  },
  commitRecord: {
    type: Object as PropType<CommitRecord | null>,
    default: null,
  },
})
const emit = defineEmits<{ (e: 'update:visible', visible: boolean): void }>()

const internalVisible = ref(props.visible)
watch(() => props.visible, v => (internalVisible.value = v))
watch(internalVisible, v => emit('update:visible', v))

// 提取文件差异列表
const fileDiffs = computed<FileDiff[]>(() => props.commitRecord?.FileDiffs || [])

// 合并行数据
const mergedDiffs = ref<Array<Array<{ lineNumber: number; text: string; type: string }>>>([]);
watch(
  fileDiffs,
  files => {
    mergedDiffs.value = files.map(file => applyHunks(file.FullContent || '', file.Hunks || []))
  },
  { immediate: true }
)

/**
 * 将 hunks 应用到 fullContent，生成带标记的行数据
 */
function applyHunks(
  fullContent: string,
  hunks: HunkDetail[] | null | undefined
): Array<{ lineNumber: number; text: string; type: string }> {
  const originalLines = fullContent.split('\n')
  const result: Array<{ lineNumber: number; text: string; type: string }> = []
  
  // 检查hunks是否为空或无效
  if (!hunks || !Array.isArray(hunks) || hunks.length === 0) {
    // 如果没有hunks，返回所有原始行作为normal类型
    return originalLines.map((line, index) => ({
      lineNumber: index + 1,
      text: line,
      type: 'normal'
    }))
  }
  
  // 按照NewStart排序，确保按正确顺序处理
  const sortedHunks = [...hunks].sort((a, b) => a.NewStart - b.NewStart)
  
  let currentOriginalIndex = 0
  let currentNewLineNumber = 1
  
  sortedHunks.forEach(hunk => {
    // 添加hunk之前的原始行
    while (currentOriginalIndex < hunk.OldStart - 1 && currentOriginalIndex < originalLines.length) {
      result.push({
        lineNumber: currentNewLineNumber++,
        text: originalLines[currentOriginalIndex],
        type: 'normal'
      })
      currentOriginalIndex++
    }
    
    // 处理删除的行
    if (hunk.OldLines > 0) {
      for (let i = 0; i < hunk.OldLines; i++) {
        if (currentOriginalIndex < originalLines.length) {
          result.push({
            lineNumber: currentNewLineNumber++,
            text: originalLines[currentOriginalIndex],
            type: 'del'
          })
          currentOriginalIndex++
        }
      }
    }
    
    // 添加新增的行
    if (hunk.Diff && hunk.Diff.trim()) {
      const addedLines = hunk.Diff.split('\n')
      addedLines.forEach(line => {
        result.push({
          lineNumber: currentNewLineNumber++,
          text: line,
          type: 'add'
        })
      })
    }
  })
  
  // 添加剩余的原始行
  while (currentOriginalIndex < originalLines.length) {
    result.push({
      lineNumber: currentNewLineNumber++,
      text: originalLines[currentOriginalIndex],
      type: 'normal'
    })
    currentOriginalIndex++
  }
  
  return result
}

function close() {
  internalVisible.value = false
}
</script>

<style scoped>
.diff-line {
  font-size: 14px;
  line-height: 0.6;
  margin: 0;
  padding: 0;
  display: block;
  white-space: pre;
}
.diff-add {
  background-color: #e6ffed;
  color: #22863a;
}
.diff-del {
  background-color: #ffeef0;
  color: #cb2431;
}
.diff-normal {
  background-color: #f5f5f5;
  color: #666;
}
.full-content {
  font-family: 'Source Code Pro', 'Courier New', monospace;
  background-color: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  margin-top: 8px;
  line-height: 1.1rem;
  color: #666;
  max-height: 40vh;
  overflow-y: auto;
}
.code-diff {
  white-space: pre-wrap; /* 允许自动换行 */
  word-break: break-all; /* 强制长单词/字符串换行 */
  overflow-x: auto; /* 若仍需滚动条可保留 */
  background-color: #f4f4f4;
  border-radius: 5px;
}

</style>
