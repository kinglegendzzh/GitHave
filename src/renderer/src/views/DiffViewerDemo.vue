<template>
      <v-container fluid>
        <v-card class="pa-4 mb-6">
          <v-card-title>Diff Viewer 示例（Vuetify版）</v-card-title>
          <v-card-text>
            <p>下方示例为了演示新增/删除行，将行号做了精准匹配。</p>
            <p>绿色：<strong>新增</strong>；红色：<strong>删除</strong>；灰色：<strong>原始行</strong></p>
          </v-card-text>
        </v-card>

        <!-- 循环每个文件的 diff 信息 -->
        <v-row
            v-for="(file, fileIndex) in fileDiffs"
            :key="fileIndex"
            class="mb-6"
        >
          <!-- 左侧：Diff 内容卡 -->
          <v-col cols="8">
            <v-card
              min-width="400"
              class="mx-auto"
              tonal
            >
              <v-card-title>
                {{ file.filename }}
                <v-spacer></v-spacer>
                <v-chip color="green lighten-4" class="ma-1" text-color="green darken-2">
                  +{{ file.additions }}
                </v-chip>
                <v-chip color="red lighten-4" class="ma-1" text-color="red darken-2">
                  -{{ file.deletions }}
                </v-chip>
              </v-card-title>
              <v-card-text>
                <div class="merged-diff">
          <pre>
            <code>
              <span
                  v-for="(line, idx) in mergedDiffs[fileIndex]"
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
            </code>
          </pre>
                </div>
              </v-card-text>
              <v-divider></v-divider>
              <v-card-actions tonal>
                <details>
                  <summary>查看完整文件内容 (原始)</summary>
                  <pre class="full-content">{{ file.fullContent }}</pre>
                </details>
              </v-card-actions>
            </v-card>
          </v-col>

          <!-- 右侧：Twitter 风格评价卡 -->
          <v-col cols="4">
            <v-card
                class="my-new-card pa-4 mb-4 mx-auto"
                min-width="300"
                outlined
            >
              <v-card-title class="title-text">
                AI评价
              </v-card-title>

              <v-card-text class="subtitle-text">
                {{ file.evaluation }}
              </v-card-text>

              <v-card-actions>
                <v-btn text color="primary">👍</v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

      </v-container>
</template>

<script>
export default {
  name: "DiffViewer",
  data() {
    return {
      /**
       * 这里演示一个短小的 fullContent，行号与 hunks 对应，方便看到删除/新增效果
       */
      fileDiffs: [
        {
          filename: "ExampleFile.java",
          additions: 2,
          deletions: 2,
          fullContent: `1: package com.example;
2: public class HelloWorld {
3:     public static void main(String[] args) {
4:         System.out.println("Hello, ChatGPT!");
5:     }
6:
7:     public static void greet(String name) {
8:         System.out.println("Hello, " + name);
9:     }
10: }
`,
          hunks: [
            {
              oldStart: 4,
              oldLines: 1,
              newStart: 4,
              newLines: 1,
              diff: "        System.out.println(\"Hello, ChatGPT!\");"
            },
            {
              oldStart: 7,
              oldLines: 0,
              newStart: 7,
              newLines: 3,
              diff: "        public static void greet(String name) {\n            System.out.println(\"Hello, \" + name);\n        }"
            }
          ],
          evaluation: "代码结构清晰，但建议在 greet 方法中加入空值检查，提高健壮性。"
        }
      ],
      mergedDiffs: []
    };
  },
  created() {
// 在组件创建时，根据 fileDiffs 生成合并后的行数据
    this.mergedDiffs = this.fileDiffs.map((file) =>
        this.applyHunks(file.fullContent, file.hunks)
    );
  },
  methods: {
    /**
     * 将 hunks 应用到 fullContent，生成带颜色标记的行数据
     */
    applyHunks(fullContent, hunks) {
// 1. 按行拆分原始内容
      const originalLines = fullContent.split("\n");

// 2. 生成 { lineNumber, text, type } 数组，初始全部 normal
      const lineObjects = originalLines.map((text, index) => {
        return {
          lineNumber: index + 1, // 假设从第1行开始
          text: text.replace(/^(\d+:\s)/, ""), // 去掉前面行号说明
          type: "normal"
        };
      });

// 3. 按 hunks 从后往前处理
      const sortedHunks = [...hunks].sort((a, b) => b.oldStart - a.oldStart);

      sortedHunks.forEach((hunk) => {
        const {oldStart, oldLines, diff} = hunk;
        const startIndex = Math.max(0, oldStart - 1);
        const removedCount = Math.min(oldLines, lineObjects.length - startIndex);

// 3.1 将被删除的行标记为 del
        for (let i = 0; i < removedCount; i++) {
          const idx = startIndex + i;
          if (idx < lineObjects.length) {
            lineObjects[idx].type = "del";
          }
        }

// 3.2 在 oldStart + oldLines 处插入新增行
        const addedLines = diff.split("\n").map((line) => {
          return {
            lineNumber: 0, // 新增行先给0
            text: line,
            type: "add"
          };
        });
        lineObjects.splice(startIndex + oldLines, 0, ...addedLines);
      });

// 4. 重新编号（可选）
      return lineObjects.map((obj, idx) => ({
        lineNumber: idx + 1,
        text: obj.text,
        type: obj.type
      }));
    }
  }
};
</script>

<style scoped>
/* ================= Vuetify基础布局就不重复示范，以下是针对行样式的优化 ================ */

/* diff-line：使用等宽字体 + 更紧凑的行距 */
.diff-line {
  font-family: "Source Code Pro", "Courier New", monospace;
  font-size: 14px;
  line-height: 0.5; /* 行间距相对默认更紧凑一些 */
  margin: 0;
  padding: 0;
  display: block;
  white-space: pre;
}

/* 新增行：绿色 */
.diff-add {
  background-color: #e6ffed;
  color: #22863a;
}

/* 删除行：红色 */
.diff-del {
  background-color: #ffeef0;
  color: #cb2431;
}

/* 正常行：灰色文字 */
.diff-normal {
  background-color: #f5f5f5;
  color: #666;
}

/* 原始完整内容的样式 */
.full-content {
  background-color: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  margin-top: 8px;
  font-family: monospace;
  color: #666;
}
</style>
