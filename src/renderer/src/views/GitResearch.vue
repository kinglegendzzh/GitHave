<template>
  <v-container class="git-research-container">
    <!-- 初始加载状态 -->
    <div v-if="initialLoad && !files.length" class="text-center my-8">
      <img :src="placeholderImage" alt="Chart Placeholder" draggable="false"
           class="placeholder-image" />
      <v-btn color="primary" class="mt-4" @click="selectDirectory">
        <v-icon left>mdi-folder-open</v-icon>
        选择研究目录
      </v-btn>
    </div>

    <!-- 文件列表展示 -->
    <div v-else>
      <div class="d-flex align-center mb-4">
        <h2 class="text-h5 font-weight-bold">研究报告</h2>
        <v-spacer></v-spacer>
        <v-btn color="primary" size="small" @click="selectDirectory">
          <v-icon left>mdi-refresh</v-icon>
          刷新
        </v-btn>
      </div>

      <!-- 文件类型标签页 -->
      <v-tabs v-model="activeTab" background-color="transparent" color="primary" class="mb-4">
        <v-tab value="codeReport">代码分析报告</v-tab>
        <v-tab value="contributionChart">仓库提交贡献榜</v-tab>
        <v-tab value="activityHeatmap">提交活跃度·热力图</v-tab>
        <v-tab value="commitDetails">提交记录修改明细</v-tab>
        <v-tab value="commitAnalysis">提交记录分析报告</v-tab>
      </v-tabs>

      <v-card class="mb-4" variant="outlined">
        <v-card-text>
          <!-- 代码分析报告 -->
          <div v-if="activeTab === 'codeReport'">
            <div v-if="codeReportFiles.length === 0" class="text-center py-4">
              <v-icon size="48" color="grey">mdi-file-document-outline</v-icon>
              <div class="text-body-1 mt-2">暂无代码分析报告</div>
            </div>
            <v-list v-else lines="two">
              <v-list-item v-for="file in codeReportFiles" :key="file.path" @click="previewFile(file)">
                <template v-slot:prepend>
                  <v-icon :color="getFileIconColor(file.type)" size="large">
                    {{ getFileIcon(file.type) }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-subtitle-1 font-weight-medium">{{ file.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  <span class="text-caption">{{ formatDate(file.modifiedTime) }}</span>
                  <v-chip size="x-small" class="ml-2" :color="getFileTypeColor(file.type)" text-color="white">
                    {{ file.type.toUpperCase() }}
                  </v-chip>
                  <v-chip
                    v-for="(main_tag, tIndex) in file.main_tags"
                    :key="'tag-' + tIndex"
                    size="x-small"
                    class="ml-2"
                    color="green"
                    text-color="white"
                  >
                    {{ main_tag }}
                  </v-chip>
                  <v-chip
                    v-for="(tag, tIndex) in file.tags"
                    :key="'tag-' + tIndex"
                    size="x-small"
                    class="ml-2"
                    color="grey"
                    text-color="white"
                  >
                    {{ tag }}
                  </v-chip>
                </v-list-item-subtitle>
                <template v-slot:append>
                  <v-btn icon="mdi-open-in-new" variant="text" size="small" @click.stop="openFile(file)"></v-btn>
                </template>
              </v-list-item>
            </v-list>
          </div>

          <!-- 仓库提交贡献榜 -->
          <div v-else-if="activeTab === 'contributionChart'">
            <div v-if="contributionChartFiles.length === 0" class="text-center py-4">
              <v-icon size="48" color="grey">mdi-image-outline</v-icon>
              <div class="text-body-1 mt-2">暂无贡献榜图片</div>
            </div>
            <v-list v-else lines="one">
              <v-list-item v-for="file in contributionChartFiles" :key="file.path" @click="previewFile(file)">
                <template v-slot:prepend>
                  <v-icon color="orange" size="large">mdi-image-outline</v-icon>
                </template>
                <v-list-item-title class="text-subtitle-1 font-weight-medium">{{ file.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  <span class="text-caption">{{ formatDate(file.modifiedTime) }}</span>
                  <v-chip size="x-small" class="ml-2" color="orange" text-color="white">IMG</v-chip>
                  <v-chip
                    v-for="(main_tag, tIndex) in file.main_tags"
                    :key="'tag-' + tIndex"
                    size="x-small"
                    class="ml-2"
                    color="green"
                    text-color="white"
                  >
                    {{ main_tag }}
                  </v-chip>
                  <v-chip
                    v-for="(tag, tIndex) in file.tags"
                    :key="'tag-' + tIndex"
                    size="x-small"
                    class="ml-2"
                    color="grey"
                    text-color="white"
                  >
                    {{ tag }}
                  </v-chip>
                </v-list-item-subtitle>
                <template v-slot:append>
                  <v-btn icon="mdi-open-in-new" variant="text" size="small" @click.stop="openFile(file)"></v-btn>
                </template>
              </v-list-item>
            </v-list>
          </div>

          <!-- 提交活跃度热力图 -->
          <div v-else-if="activeTab === 'activityHeatmap'">
            <div v-if="activityHeatmapFiles.length === 0" class="text-center py-4">
              <v-icon size="48" color="grey">mdi-image-outline</v-icon>
              <div class="text-body-1 mt-2">暂无活跃度热力图</div>
            </div>
            <v-list v-else lines="one">
              <v-list-item v-for="file in activityHeatmapFiles" :key="file.path" @click="previewFile(file)">
                <template v-slot:prepend>
                  <v-icon color="orange" size="large">mdi-image-outline</v-icon>
                </template>
                <v-list-item-title class="text-subtitle-1 font-weight-medium">{{ file.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  <span class="text-caption">{{ formatDate(file.modifiedTime) }}</span>
                  <v-chip size="x-small" class="ml-2" color="orange" text-color="white">IMG</v-chip>
                  <v-chip
                    v-for="(main_tag, tIndex) in file.main_tags"
                    :key="'tag-' + tIndex"
                    size="x-small"
                    class="ml-2"
                    color="green"
                    text-color="white"
                  >
                    {{ main_tag }}
                  </v-chip>
                  <v-chip
                    v-for="(tag, tIndex) in file.tags"
                    :key="'tag-' + tIndex"
                    size="x-small"
                    class="ml-2"
                    color="grey"
                    text-color="white"
                  >
                    {{ tag }}
                  </v-chip>
                </v-list-item-subtitle>
                <template v-slot:append>
                  <v-btn icon="mdi-open-in-new" variant="text" size="small" @click.stop="openFile(file)"></v-btn>
                </template>
              </v-list-item>
            </v-list>
          </div>

          <!-- 提交记录修改明细 -->
          <div v-else-if="activeTab === 'commitDetails'">
            <div v-if="commitDetailFiles.length === 0" class="text-center py-4">
              <v-icon size="48" color="grey">mdi-file-delimited-outline</v-icon>
              <div class="text-body-1 mt-2">暂无提交记录明细</div>
            </div>
            <v-list v-else lines="two">
              <v-list-item v-for="file in commitDetailFiles" :key="file.path" @click="previewFile(file)">
                <template v-slot:prepend>
                  <v-icon color="green" size="large">mdi-file-delimited-outline</v-icon>
                </template>
                <v-list-item-title class="text-subtitle-1 font-weight-medium">{{ file.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  <span class="text-caption">{{ formatDate(file.modifiedTime) }}</span>
                  <v-chip size="x-small" class="ml-2" color="green" text-color="white">CSV</v-chip>
                  <v-chip
                    v-for="(main_tag, tIndex) in file.main_tags"
                    :key="'tag-' + tIndex"
                    size="x-small"
                    class="ml-2"
                    color="green"
                    text-color="white"
                  >
                    {{ main_tag }}
                  </v-chip>
                  <v-chip
                    v-for="(tag, tIndex) in file.tags"
                    :key="'tag-' + tIndex"
                    size="x-small"
                    class="ml-2"
                    color="grey"
                    text-color="white"
                  >
                    {{ tag }}
                  </v-chip>
                </v-list-item-subtitle>
                <template v-slot:append>
                  <v-btn icon="mdi-open-in-new" variant="text" size="small" @click.stop="openFile(file)"></v-btn>
                </template>
              </v-list-item>
            </v-list>
          </div>

          <!-- 提交记录分析报告 -->
          <div v-else-if="activeTab === 'commitAnalysis'">
            <div v-if="commitAnalysisFiles.length === 0" class="text-center py-4">
              <v-icon size="48" color="grey">mdi-file-document-outline</v-icon>
              <div class="text-body-1 mt-2">暂无提交记录分析报告</div>
            </div>
            <v-list v-else lines="two">
              <v-list-item v-for="file in commitAnalysisFiles" :key="file.path" @click="previewFile(file)">
                <template v-slot:prepend>
                  <v-icon :color="getFileIconColor(file.type)" size="large">
                    {{ getFileIcon(file.type) }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-subtitle-1 font-weight-medium">{{ file.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  <span class="text-caption">{{ formatDate(file.modifiedTime) }}</span>
                  <v-chip size="x-small" class="ml-2" :color="getFileTypeColor(file.type)" text-color="white">
                    {{ file.type.toUpperCase() }}
                  </v-chip>
                  <v-chip
                    v-for="(main_tag, tIndex) in file.main_tags"
                    :key="'tag-' + tIndex"
                    size="x-small"
                    class="ml-2"
                    color="green"
                    text-color="white"
                  >
                    {{ main_tag }}
                  </v-chip>
                  <v-chip
                    v-for="(tag, tIndex) in file.tags"
                    :key="'tag-' + tIndex"
                    size="x-small"
                    class="ml-2"
                    color="grey"
                    text-color="white"
                  >
                    {{ tag }}
                  </v-chip>
                </v-list-item-subtitle>
                <template v-slot:append>
                  <v-btn icon="mdi-open-in-new" variant="text" size="small" @click.stop="openFile(file)"></v-btn>
                </template>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>
      </v-card>

      <!-- 文件预览对话框 -->
      <v-dialog v-model="previewDialog" max-width="800">
        <v-card>
          <v-card-title class="d-flex align-center">
            <span>{{ selectedFile?.name || '文件预览' }}</span>
            <v-spacer></v-spacer>
            <v-btn icon="mdi-close" variant="text" @click="previewDialog = false"></v-btn>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="preview-content">
            <div v-if="fileContent" class="pa-2">
              <div v-if="selectedFile?.type === 'csv'" class="csv-preview">
                <table class="csv-table">
                  <thead>
                    <tr>
                      <th v-for="(header, index) in csvHeaders" :key="index">{{ header }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, rowIndex) in csvData" :key="rowIndex">
                      <td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else-if="['png','jpg','jpeg'].includes(selectedFile?.type)">
                <img :src="fileContent" style="max-width: 100%;" />
              </div>
              <div v-else class="markdown-preview">
                {{ fileContent }}
              </div>
            </div>
            <div v-else class="d-flex justify-center align-center" style="height: 200px">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" variant="text" @click="openFile(selectedFile)">
              在外部打开
              <v-icon right>mdi-open-in-new</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </v-container>
</template>

<script>
import SVG from '../assets/report.svg';

export default {
  name: 'GitResearch',
  data() {
    return {
      initialLoad: true,   // 初次加载标识
      placeholderImage: SVG,  // 外部矢量图路径
      selectedDirectory: '',  // 选中的目录路径
      files: [],             // 所有文件列表
      activeTab: 'codeReport',   // 当前活动的标签页
      previewDialog: false,   // 预览对话框显示状态
      selectedFile: null,     // 当前选中的文件
      fileContent: null,      // 文件内容
      csvHeaders: [],         // CSV文件表头
      csvData: []             // CSV文件数据
    }
  },
  computed: {
    // 代码分析报告（docx/md）
    codeReportFiles() {
      return this.files.filter(f => f.category === 'codeReport');
    },
    // 仓库提交贡献榜（图片）
    contributionChartFiles() {
      return this.files.filter(f => f.category === 'contributionChart');
    },
    // 提交活跃度热力图（图片）
    activityHeatmapFiles() {
      return this.files.filter(f => f.category === 'activityHeatmap');
    },
    // 提交记录修改明细（csv）
    commitDetailFiles() {
      return this.files.filter(f => f.category === 'commitDetails');
    },
    // 提交记录分析报告（docx/md）
    commitAnalysisFiles() {
      return this.files.filter(f => f.category === 'commitAnalysis');
    },
  },
  created() {
    // 组件创建时加载模拟数据
    this.loadMockData();
  },
  methods: {
    // 选择目录
    async selectDirectory() {
      try {
        // 调用Electron的对话框API选择目录
        const result = await window.electron.invoke('dialog:openDirectory', {
          title: '选择研究报告目录',
          properties: ['openDirectory']
        });

        if (!result.canceled && result.filePaths.length > 0) {
          this.selectedDirectory = result.filePaths[0];
          this.initialLoad = false;
          await this.loadDirectoryFiles(this.selectedDirectory);
        }
      } catch (error) {
        console.error('选择目录失败:', error);
      }
    },

    // 加载目录中的文件
    async loadDirectoryFiles(dirPath) {
      try {
        // 使用IPC调用读取目录内容
        const fs = await window.electron.fs;
        const path = await window.electron.path;

        // 实际项目中应该使用以下代码读取目录
        // const files = await window.electron.readDirectory(dirPath);

        // 由于我们使用模拟数据，这里暂不实际调用
        console.log('读取目录:', dirPath);
        // 保持使用模拟数据
      } catch (error) {
        console.error('读取目录失败:', error);
      }
    },

    // 加载模拟数据
    loadMockData() {
      // 模拟文件数据
      this.files = [
        {
          name: '项目架构分析报告.md',
          path: '/path/to/项目架构分析报告.md',
          type: 'md',
          size: 1024 * 15,
          category: 'codeReport',
          main_tags: ['智能体自动生成'],
          tags: ['来自张三', '长文本', '支持推送'],
          modifiedTime: new Date(2023, 9, 15, 14, 30)
        },
        {
          name: '代码质量评估.docx',
          path: '/path/to/代码质量评估.docx',
          type: 'docx',
          size: 1024 * 45,
          category: 'codeReport',
          main_tags: ['用户手动生成'],
          tags: ['来自李四', '支持推送'],
          modifiedTime: new Date(2023, 9, 16, 9, 15)
        },
        {
          name: '性能优化建议.md',
          path: '/path/to/性能优化建议.md',
          type: 'md',
          size: 1024 * 8,
          category: 'codeReport',
          main_tags: ['智能体自动生成'],
          modifiedTime: new Date(2023, 9, 17, 11, 45)
        },
        {
          name: '代码修改明细_2023-10-15.csv',
          path: '/path/to/代码修改明细_2023-10-15.csv',
          type: 'csv',
          size: 1024 * 12,
          category: 'commitDetails',
          tags: [],
          modifiedTime: new Date(2023, 9, 15, 18, 20)
        },
        {
          name: '代码修改明细_2023-10-16.csv',
          path: '/path/to/代码修改明细_2023-10-16.csv',
          type: 'csv',
          size: 1024 * 9,
          category: 'commitDetails',
          main_tags: [],
          tags: [],
          modifiedTime: new Date(2023, 9, 16, 17, 30)
        },
        {
          name: '仓库提交贡献榜.png',
          path: '/path/to/仓库提交贡献榜.png',
          type: 'png',
          size: 1024 * 120,
          category: 'contributionChart',
          main_tags: [],
          tags: [],
          modifiedTime: new Date(2023, 9, 18, 10, 0)
        },
        {
          name: '提交活跃度热力图.png',
          path: '/path/to/提交活跃度热力图.png',
          type: 'png',
          size: 1024 * 95,
          category: 'activityHeatmap',
          main_tags: [],
          tags: [],
          modifiedTime: new Date(2023, 9, 18, 11, 30)
        },
        {
          name: '提交记录分析报告.docx',
          path: '/path/to/提交记录分析报告.docx',
          type: 'docx',
          size: 1024 * 30,
          category: 'commitAnalysis',
          main_tags: [],
          tags: ['支持推送'],
          modifiedTime: new Date(2023, 9, 18, 15, 45)
        }
      ];

      // 设置初始加载完成
      this.initialLoad = false;
    },

    // 预览文件
    async previewFile(file) {
      this.selectedFile = file;
      this.previewDialog = true;
      this.fileContent = null;

      // 模拟加载文件内容
      setTimeout(() => {
        if (file.type === 'csv') {
          // 模拟CSV数据
          this.csvHeaders = ['文件路径', '修改类型', '修改行数', '修改时间', '提交者'];
          this.csvData = [
            ['/src/components/App.vue', '修改', '15', '2023-10-15 10:30', '张三'],
            ['/src/utils/helpers.js', '新增', '42', '2023-10-15 11:15', '李四'],
            ['/src/api/index.js', '删除', '8', '2023-10-15 14:20', '王五'],
            ['/src/styles/main.css', '修改', '23', '2023-10-15 16:45', '张三']
          ];
        } else if (['png', 'jpg', 'jpeg'].includes(file.type)) {
          // 图片文件直接预览
          this.fileContent = file.path;
        } else {
          // 模拟Markdown/文档内容
          this.fileContent = `# 项目分析报告

## 概述
这是一份项目分析报告的示例内容。在实际应用中，这里将显示从文件中读取的真实内容。

## 主要发现
- 代码结构合理，但部分模块耦合度较高
- 测试覆盖率需要提高
- 性能瓶颈主要在数据处理模块

## 建议
1. 重构数据处理模块，提高性能
2. 增加单元测试覆盖率
3. 优化构建流程`;
        }
      }, 500);
    },

    // 在外部打开文件
    async openFile(file) {
      if (!file) return;

      try {
        // 实际项目中应该使用以下代码打开文件
        // await window.electron.shell.openPath(file.path);

        // 由于我们使用模拟数据，这里只打印信息
        console.log('打开文件:', file.path);
        alert(`将在外部打开文件: ${file.name}`);
      } catch (error) {
        console.error('打开文件失败:', error);
      }
    },

    // 获取文件图标
    getFileIcon(type) {
      switch (type) {
        case 'md':
          return 'mdi-language-markdown-outline';
        case 'docx':
          return 'mdi-file-word-outline';
        case 'csv':
          return 'mdi-file-delimited-outline';
        case 'png':
        case 'jpg':
        case 'jpeg':
          return 'mdi-image-outline';
        default:
          return 'mdi-file-outline';
      }
    },

    // 获取文件图标颜色
    getFileIconColor(type) {
      switch (type) {
        case 'md':
          return 'blue';
        case 'docx':
          return 'indigo';
        case 'csv':
          return 'green';
        case 'png':
        case 'jpg':
        case 'jpeg':
          return 'orange';
        default:
          return 'grey';
      }
    },

    // 获取文件类型标签颜色
    getFileTypeColor(type) {
      switch (type) {
        case 'md':
          return 'blue';
        case 'docx':
          return 'indigo';
        case 'csv':
          return 'green';
        case 'png':
        case 'jpg':
        case 'jpeg':
          return 'orange';
        default:
          return 'grey';
      }
    },

    // 格式化日期
    formatDate(date) {
      if (!date) return '';
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
  }
}
</script>

<style scoped>
.git-research-container {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

.placeholder-image {
  width: 250px;
  height: auto;
  display: block;
  margin: auto;
  user-select: none;
  pointer-events: none;
}

.preview-content {
  max-height: 500px;
  overflow-y: auto;
}

.csv-table {
  width: 100%;
  border-collapse: collapse;
}

.csv-table th, .csv-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.csv-table th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.csv-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

.markdown-preview {
  white-space: pre-wrap;
  font-family: 'Roboto Mono', monospace;
}
</style>
