<template>
  <v-dialog v-model="internalVisible" max-width="90%" width="90%">
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
        <div v-if="commitRecord?.FileDiffs?.length">
          <v-expansion-panels multiple>
            <v-expansion-panel v-for="(file, fi) in commitRecord.FileDiffs" :key="fi">
              <v-expansion-panel-title>
                <div class="d-flex justify-space-between w-100">
                  <span>{{ file.Filename }}</span>
                  <span class="grey--text">+{{ file.Additions }} / -{{ file.Deletions }}</span>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <div v-for="(hunk, hi) in file.Hunks" :key="hi" class="mb-4">
                  <div class="font-weight-medium mb-2">
                    Hunk {{ hi + 1 }}: old({{ hunk.OldStart }},{{ hunk.OldLines }}) → new({{ hunk.NewStart }},{{ hunk.NewLines }})
                  </div>
                  <pre><code>{{ hunk.Diff }}</code></pre>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
        <div v-else class="text-center grey--text">
          暂无差异信息
        </div>
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
import { PropType, ref, watch } from "vue";
import { CommitRecord, FileDiff, HunkDetail } from '../types/commit.js'

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
watch(() => props.visible, v => internalVisible.value = v)
watch(internalVisible, v => emit('update:visible', v))

function close() {
  internalVisible.value = false
}
</script>

<style scoped>
pre {
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
}
code {
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  white-space: pre-wrap;
}
</style>
