<template>
  <v-container
    class="mt-4"
    style="display: flex; align-items: first baseline; justify-content: center"
  >
    <div v-cloak class="research-container">
      <!-- 初始加载状态 -->
      <div v-if="initialLoad && !files.length" class="text-center my-8">
        <img
          :src="placeholderImage"
          alt="Chart Placeholder"
          draggable="false"
          class="placeholder-image"
          style="max-width: 300px; opacity: 0.8"
        />
        <!--        <v-btn color="primary" class="mt-6 research-button" elevation="0" @click="selectDirectory">-->
        <!--          <v-icon left>mdi-folder-open</v-icon>-->
        <!--          初始化指定存储目录-->
        <!--        </v-btn>-->
      </div>

      <!-- 文件列表展示 -->
      <div v-else class="research-content">
        <div class="research-header">
          <h2>
            文件枢纽 <span class="subtitle">各个智能体和应用中心的洞见与分析报告都汇聚在这里...</span>
          </h2>
          <v-btn class="refresh-button" elevation="0" @click="fetchCodeReports">
            <v-icon left>mdi-refresh</v-icon>
            刷新
          </v-btn>
        </div>

        <!-- 文件类型标签页 -->
        <v-tabs v-model="activeTab" background-color="transparent" color="primary" class="mb-4">
          <v-tab value="codeReport">代码分析报告</v-tab>
          <v-tab value="contributionChart" disabled>仓库提交贡献榜</v-tab>
          <v-tab value="activityHeatmap" disabled>提交活跃度·热力图</v-tab>
          <v-tab value="weekly" disabled>代码仓库周刊</v-tab>
          <v-tab value="commitDetails" disabled>提交记录修改明细</v-tab>
          <v-tab value="commitAnalysis" disabled>提交记录分析报告</v-tab>
        </v-tabs>

        <v-card class="content-card" variant="flat">
          <v-card-text class="content-container">
            <!-- 代码分析报告 -->
            <div v-if="activeTab === 'codeReport'">
              <div v-if="!files.length" class="text-center py-4">
                <v-icon size="48" color="grey">mdi-file-document-outline</v-icon>
                <div class="text-body-1 mt-2">暂无代码分析报告</div>
              </div>
              <recycle-scroller
                v-else
                :items="files.slice(0, visibleCount)"
                :item-size="72"
                key-field="path"
                class="file-scroller"
              >
                <template #default="{ item: file }">
                  <v-list-item @click="previewFile(file)">
                    <template #prepend>
                      <v-icon :color="getFileIconColor(file.type)" size="large">
                        {{ getFileIcon(file.type) }}
                      </v-icon>
                    </template>
                    <v-list-item-title class="text-subtitle-1 font-weight-medium">
                      {{ file.name }}
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      <span class="text-caption">{{ formatDate(file.modifiedTime) }}</span>
                      <v-chip
                        size="x-small"
                        class="ml-2"
                        :color="getFileTypeColor(file.type)"
                        text-color="white"
                      >
                        {{ file.type.toUpperCase() || 'UNKNOWN' }}
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
                    <template #append>
                      <v-btn
                        icon="mdi-open-in-new"
                        variant="text"
                        size="small"
                        @click.stop="openFile(file)"
                      ></v-btn>
                      <v-btn
                        icon="mdi-delete"
                        variant="text"
                        size="small"
                        color="error"
                        @click.stop="removeFile(file)"
                      ></v-btn>
                    </template>
                  </v-list-item>
                </template>
              </recycle-scroller>
              <!-- 加载更多 -->
              <div v-if="files.length > visibleCount" class="text-center py-4">
                <v-btn
                  color="primary"
                  class="load-more-button"
                  variant="text"
                  elevation="0"
                  @click="visibleCount += 40"
                >
                  <v-icon left>mdi-arrow-down</v-icon>
                  加载更多
                </v-btn>
              </div>
            </div>
            <!-- 仓库提交贡献榜 -->
            <div v-else-if="activeTab === 'contributionChart'">
              <div v-if="contributionChartFiles.length === 0" class="text-center py-4">
                <v-icon size="48" color="grey">mdi-image-outline</v-icon>
                <div class="text-body-1 mt-2">暂无贡献榜图片</div>
              </div>
              <v-list v-else lines="one">
                <v-list-item
                  v-for="file in contributionChartFiles"
                  :key="file.path"
                  @click="previewFile(file)"
                >
                  <template #prepend>
                    <v-icon color="orange" size="large">mdi-image-outline</v-icon>
                  </template>
                  <v-list-item-title class="text-subtitle-1 font-weight-medium">{{
                    file.name
                  }}</v-list-item-title>
                  <v-list-item-subtitle>
                    <span class="text-caption">{{ formatDate(file.modifiedTime) }}</span>
                    <v-chip size="x-small" class="ml-2" color="orange" text-color="white"
                      >IMG</v-chip
                    >
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
                  <template #append>
                    <v-btn
                      icon="mdi-open-in-new"
                      variant="text"
                      size="small"
                      @click.stop="openFile(file)"
                    ></v-btn>
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
                <v-list-item
                  v-for="file in activityHeatmapFiles"
                  :key="file.path"
                  @click="previewFile(file)"
                >
                  <template #prepend>
                    <v-icon color="orange" size="large">mdi-image-outline</v-icon>
                  </template>
                  <v-list-item-title class="text-subtitle-1 font-weight-medium">{{
                    file.name
                  }}</v-list-item-title>
                  <v-list-item-subtitle>
                    <span class="text-caption">{{ formatDate(file.modifiedTime) }}</span>
                    <v-chip size="x-small" class="ml-2" color="orange" text-color="white"
                      >IMG</v-chip
                    >
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
                  <template #append>
                    <v-btn
                      icon="mdi-open-in-new"
                      variant="text"
                      size="small"
                      @click.stop="openFile(file)"
                    ></v-btn>
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
                <v-list-item
                  v-for="file in commitDetailFiles"
                  :key="file.path"
                  @click="previewFile(file)"
                >
                  <template #prepend>
                    <v-icon color="green" size="large">mdi-file-delimited-outline</v-icon>
                  </template>
                  <v-list-item-title class="text-subtitle-1 font-weight-medium">{{
                    file.name
                  }}</v-list-item-title>
                  <v-list-item-subtitle>
                    <span class="text-caption">{{ formatDate(file.modifiedTime) }}</span>
                    <v-chip size="x-small" class="ml-2" color="green" text-color="white"
                      >CSV</v-chip
                    >
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
                  <template #append>
                    <v-btn
                      icon="mdi-open-in-new"
                      variant="text"
                      size="small"
                      @click.stop="openFile(file)"
                    ></v-btn>
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
                <v-list-item
                  v-for="file in commitAnalysisFiles"
                  :key="file.path"
                  @click="previewFile(file)"
                >
                  <template #prepend>
                    <v-icon :color="getFileIconColor(file.type)" size="large">
                      {{ getFileIcon(file.type) }}
                    </v-icon>
                  </template>
                  <v-list-item-title class="text-subtitle-1 font-weight-medium">{{
                    file.name
                  }}</v-list-item-title>
                  <v-list-item-subtitle>
                    <span class="text-caption">{{ formatDate(file.modifiedTime) }}</span>
                    <v-chip
                      size="x-small"
                      class="ml-2"
                      :color="getFileTypeColor(file.type)"
                      text-color="white"
                    >
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
                  <template #append>
                    <v-btn
                      icon="mdi-open-in-new"
                      variant="text"
                      size="small"
                      @click.stop="openFile(file)"
                    ></v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </div>
          </v-card-text>
        </v-card>

        <!-- 文件预览对话框 -->
        <v-dialog v-model="previewDialog" max-width="98%">
          <v-card>
            <v-card-title class="d-flex align-center">
              <span>{{ selectedFile?.name || '文件预览' }}</span>
              <v-spacer></v-spacer>
              <v-btn icon="mdi-close" variant="text" @click="previewDialog = false"></v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text class="preview-content">
              <div v-if="fileContent" class="pa-2">
                <div
                  v-if="selectedFile.type === 'md'"
                  class="markdown-preview"
                  v-html="renderedMarkdown"
                ></div>
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
                <div v-else-if="['png', 'jpg', 'jpeg'].includes(selectedFile?.type)">
                  <img :src="fileContent" style="max-width: 100%" />
                </div>
                <div v-else-if="selectedFile?.type === 'docx'">
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
    </div>
  </v-container>
</template>

<script>
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import SVG from '../assets/report.svg'
import { deepResearchFiles, deleteFile } from '../service/api'
import MarkdownIt from 'markdown-it'
// 新增路径处理和自定义工具
import path from 'path-browserify'
import store from '../store'
import { mapState } from 'vuex'
import hljs from 'highlight.js'
import 'highlight.js/styles/docco.css'

export default {
  name: 'GitResearch',
  components: {
    RecycleScroller
  },
  data() {
    return {
      visibleCount: 10,
      initialLoad: true, // 初次加载标识
      placeholderImage: SVG, // 外部矢量图路径
      selectedDirectory: '', // 选中的目录路径
      files: [], // 所有文件列表
      activeTab: 'codeReport', // 当前活动的标签页
      previewDialog: false, // 预览对话框显示状态
      selectedFile: null, // 当前选中的文件
      fileContent: null, // 文件内容
      csvHeaders: [], // CSV文件表头
      csvData: [], // CSV文件数据
      md: new MarkdownIt({
        highlight: (str, lang) => {
          const validLang = hljs.getLanguage(lang) ? lang : 'plaintext'
          return hljs.highlight(str, { language: validLang }).value
        }
      }),
      renderedMarkdown: '',
      customAppMapping: {
        '.txt': { win32: 'notepad', linux: 'gedit' },
        '.java': { darwin: 'code', win32: 'code', linux: 'code' },
        '.js': { darwin: 'code', win32: 'code', linux: 'code' },
        '.vue': { darwin: 'code', win32: 'code', linux: 'code' },
        '.go': { darwin: 'code', win32: 'code', linux: 'code' },
        '.sh': { darwin: 'code', win32: 'notepad', linux: 'gedit' },
        '.md': { darwin: 'code', win32: 'notepad', linux: 'gedit' }, // todo Windows打开md文件报错修复一下
        '.markdown': { darwin: 'code', win32: 'notepad', linux: 'gedit' },
        '.yml': { darwin: 'code', win32: 'code', linux: 'code' },
        '.yaml': { darwin: 'code', win32: 'code', linux: 'code' },
        '.json': { darwin: 'code', win32: 'notepad', linux: 'gedit' },
        '.xml': { darwin: 'code', win32: 'notepad', linux: 'gedit' },
        '.html': { darwin: 'code', win32: 'notepad', linux: 'gedit' },
        '.css': { darwin: 'code', win32: 'notepad', linux: 'gedit' }
      }
    }
  },
  computed: {
    ...mapState({
      snackbar: (state) => state.snackbar
    }),
    // 代码分析报告（docx/md）
    codeReportFiles() {
      return this.files.filter((f) => f.category === 'codeReport')
    },
    // 仓库提交贡献榜（图片）
    contributionChartFiles() {
      return this.files.filter((f) => f.category === 'contributionChart')
    },
    // 提交活跃度热力图（图片）
    activityHeatmapFiles() {
      return this.files.filter((f) => f.category === 'activityHeatmap')
    },
    // 提交记录修改明细（csv）
    commitDetailFiles() {
      return this.files.filter((f) => f.category === 'commitDetails')
    },
    // 提交记录分析报告（docx/md）
    commitAnalysisFiles() {
      return this.files.filter((f) => f.category === 'commitAnalysis')
    }
  },
  created() {
    // this.loadMockData()
    this.fetchCodeReports()
  },
  methods: {
    async removeFile(file) {
      //二次确认
      if (confirm('确定要删除吗？')) {
        try {
          const res = await deleteFile(file.raw.id)
          this.files = this.files.filter((f) => f.raw.id !== file.raw.id)
          this.fetchCodeReports()
          this.$store.dispatch('snackbar/showSnackbar', {
            message: '删除成功',
            type: 'success'
          })
        } catch (error) {
          console.error('删除文件失败:', error)
          this.$store.dispatch('snackbar/showSnackbar', {
            message: '删除失败',
            type: 'error'
          })
        }
      }
    },
    async getAppPath(appName) {
      try {
        const appPath = await window.electron.getAppPathIPC(appName)
        if (!appPath) throw new Error(`获取的应用路径为空: ${appName}`)
        return appPath
      } catch (err) {
        console.error('获取应用路径失败:', err)
      }
    },
    async fetchCodeReports() {
      try {
        // 1. 先拿到静态示例文件列表
        const examples = await window.electron.getStaticFileList('static', 'deep_research')
        console.log('示例文件列表', examples)

        // 2. 再调用后端接口拿到实际报告
        const res = await deepResearchFiles()
        // 假设 res.data 就是文件数组
        let apiFiles = res.data.map((item) => {
          const extMatch = item.file_path.match(/\.([a-zA-Z0-9]+)$/)
          const ext = extMatch ? extMatch[1] : (item.file_type || '').toLowerCase()
          const tags = ext === 'md' ? ['可预览'] : []
          return {
            name: item.file_name,
            path: item.file_path,
            type: ext,
            modifiedTime: new Date(item.updated_at.Time),
            main_tags: ['来源于空间透镜'],
            tags,
            raw: item
          }
        })
        // 过滤掉状态不为success的文件
        apiFiles = apiFiles.filter((item) => item.raw.status === 'success')

        // 3. 把静态示例文件也映射成同样的结构
        const exampleFiles = examples.map((file) => {
          const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/)
          const ext = extMatch ? extMatch[1] : ''
          const tags = ext === 'md' ? ['可预览'] : []
          return {
            name: file.name,
            path: file.path,
            type: ext,
            modifiedTime: new Date(file.creationDate),
            main_tags: ['示例文件'], // 可以改成你需要的标签
            tags,
            raw: file
          }
        })

        // 4. 合并两部分到 this.files
        this.files = [...apiFiles, ...exampleFiles]
      } catch (error) {
        console.error('获取代码分析报告失败：', error)
      }
    },
    // 选择目录
    async selectDirectory() {
      try {
        // 调用Electron的对话框API选择目录
        const result = await window.electron.invoke('dialog:openDirectory', {
          title: '选择枢纽目录',
          properties: ['openDirectory']
        })

        if (!result.canceled && result.filePaths.length > 0) {
          this.selectedDirectory = result.filePaths[0]
          this.initialLoad = false
          await this.loadDirectoryFiles(this.selectedDirectory)
        }
      } catch (error) {
        console.error('选择目录失败:', error)
      }
    },

    // 加载目录中的文件
    async loadDirectoryFiles(dirPath) {
      try {
        // 使用IPC调用读取目录内容
        const fs = await window.electron.fs
        const path = await window.electron.path

        // 实际项目中应该使用以下代码读取目录
        // const files = await window.electron.readDirectory(dirPath);

        // 由于我们使用模拟数据，这里暂不实际调用
        console.log('读取目录:', dirPath)
        // 保持使用模拟数据
      } catch (error) {
        console.error('读取目录失败:', error)
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
      ]

      // 设置初始加载完成
      this.initialLoad = false
    },

    // 预览文件
    async previewFile(file) {
      this.selectedFile = file
      this.previewDialog = true
      this.fileContent = null
      this.renderedMarkdown = ''

      // 1. Markdown 文件：通过 IPC 读取并渲染
      if (file.type === 'md') {
        try {
          console.log('读取 Markdown 文件：', file.path)
          const raw = await window.electron.readFile(file.path)
          this.fileContent = raw
          this.renderedMarkdown = this.md.render(raw)
        } catch (err) {
          console.error('加载 Markdown 失败：', err)
        }
        return // 读取完就返回，不走后续模拟逻辑
      }

      // 2. 其它类型继续原有模拟逻辑
      setTimeout(() => {
        if (file.type === 'csv') {
          // … CSV 处理（保持原有代码）
        } else if (['png', 'jpg', 'jpeg'].includes(file.type)) {
          this.fileContent = file.path
        } else {
          this.fileContent = `无法读取${file.type}格式文件的内容，通过外部打开`
        }
      }, 500)
    },

    // 在外部打开文件
    async openFile(file) {
      // 1. 校验输入
      if (!file) {
        if (!confirm(`请选择一个文件`)) return
        return
      }

      // 2. 组装路径
      let url = file.path
      const platform = await window.electron.platform
      if (platform !== 'win32') {
        // 非 Windows 平台前面补 '/'
        url = '/' + url
      }
      // 目标总是文件本身
      const targetPath = url

      try {
        // 3. 检查路径是否存在
        const exists = await window.electron.checkPathExists(targetPath)
        if (!exists) {
          if (!confirm(`路径不存在: ${targetPath}`)) return
          return
        }

        // 4. 如果有自定义应用映射，优先调用指定应用打开
        // const ext = path.extname(targetPath).toLowerCase()
        // const mapping = this.customAppMapping[ext]
        // if (mapping) {
        //   const appName = mapping[platform]
        //   if (appName) {
        //     try {
        //       const appPath = await this.getAppPath(appName)
        //       const error = await window.electron.openPathWithApp(targetPath, appPath)
        //       if (error) {
        //         if (!confirm(`打开文件失败: ${error}`)) return
        //       }
        //       return
        //     } catch (err) {
        //       console.error('未找到应用程序:', appName, err)
        //     }
        //   }
        // }

        // 5. 默认调用系统方式打开
        console.log('targetPath', targetPath)
        const error = await window.electron.shell.openPath(targetPath)
        if (error) {
          if (!confirm(`打开文件失败: ${error}`)) return
        }
      } catch (err) {
        // 6. catch 所有校验、打开过程中抛出的异常
        if (!confirm(`路径验证失败: ${err.message}`)) return
      }
    },

    // 获取文件图标
    getFileIcon(type) {
      switch (type) {
        case 'md':
          return 'mdi-language-markdown-outline'
        case 'docx':
          return 'mdi-file-word-outline'
        case 'csv':
          return 'mdi-file-delimited-outline'
        case 'png':
        case 'jpg':
        case 'jpeg':
          return 'mdi-image-outline'
        default:
          return 'mdi-file-outline'
      }
    },

    // 获取文件图标颜色
    getFileIconColor(type) {
      switch (type) {
        case 'md':
          return 'blue'
        case 'docx':
          return 'indigo'
        case 'csv':
          return 'green'
        case 'png':
        case 'jpg':
        case 'jpeg':
          return 'orange'
        default:
          return 'grey'
      }
    },

    // 获取文件类型标签颜色
    getFileTypeColor(type) {
      switch (type) {
        case 'md':
          return 'blue'
        case 'docx':
          return 'indigo'
        case 'csv':
          return 'green'
        case 'png':
        case 'jpg':
        case 'jpeg':
          return 'orange'
        default:
          return 'grey'
      }
    },

    formatDate(date) {
      if (!date) return ''
      // 如果传入的是字符串，就转为 Date 对象
      const d = typeof date === 'string' ? new Date(date) : date

      // 使用 UTC 方法，直接取 2025-05-24T00:40:33Z 中的年月日时分
      const Y = d.getUTCFullYear()
      const M = String(d.getUTCMonth() + 1).padStart(2, '0')
      const D = String(d.getUTCDate()).padStart(2, '0')
      const h = String(d.getUTCHours()).padStart(2, '0')
      const m = String(d.getUTCMinutes()).padStart(2, '0')

      return `${Y}-${M}-${D} ${h}:${m}`
    }
  }
}
</script>

<style scoped>
[v-cloak] {
  display: none;
}

.research-container {
  width: 100%;
  max-width: 1000px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: fadeIn 0.6s ease-out;
}

.research-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  animation: slideDown 0.5s ease-out;
}

.research-header h2 {
  font-size: 1.6rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface-rgb), 0.87);
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 12px;
}

.subtitle {
  font-size: 1rem;
  font-weight: normal;
  color: rgba(var(--v-theme-on-surface-rgb), 0.6);
}

.research-button {
  background: rgba(var(--v-theme-primary-rgb), 0.9) !important;
  color: white;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary-rgb), 0.3);
}

.research-button:hover {
  background: rgba(var(--v-theme-primary-rgb), 1) !important;
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(var(--v-theme-primary-rgb), 0.4);
}

.refresh-button {
  background: rgba(var(--v-theme-surface-rgb), 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(var(--v-theme-on-surface-rgb), 0.08);
  transition: all 0.3s ease;
}

.refresh-button:hover {
  background: rgba(var(--v-theme-surface-rgb), 0.6);
  transform: scale(1.05);
}

.content-card {
  background: rgba(var(--v-theme-surface-rgb), 0.6);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface-rgb), 0.08);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.content-card:hover {
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12);
}

.content-container {
  padding: 24px;
}

.v-list-item {
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.3s ease;
  animation: fadeInUp 0.5s ease-out forwards;
}

.v-list-item:hover {
  background: rgba(var(--v-theme-surface-rgb), 0.8);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideDown {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 暗色模式适配 */
.v-theme--dark .content-card {
  background: rgba(30, 30, 30, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.v-theme--dark .v-list-item:hover {
  background: rgba(40, 40, 40, 0.8);
}

.v-theme--dark .refresh-button {
  background: rgba(40, 40, 40, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.v-theme--dark .refresh-button:hover {
  background: rgba(40, 40, 40, 0.6);
}
</style>

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
  max-height: 75vh;
  overflow-y: auto;
}

.csv-table {
  width: 100%;
  border-collapse: collapse;
}

.csv-table th,
.csv-table td {
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
  font-family: 'Roboto Mono', monospace;
  word-wrap: normal; /* 禁用单词换行 */
  word-break: normal; /* 禁用任意字符换行 */

  /* 横向滚动条，超出宽度时显示 */
  overflow-x: auto;
  overflow-y: hidden; /* 可选：隐藏垂直滚动条 */

  font-size: 0.8rem;
}

pre {
  font-size: 0.9rem;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
/* 默认（亮色模式）的样式 */
.hljs {
  background-color: #f5f5f5; /* 亮色背景 */
  color: #333333; /* 亮色文本 */
}

.hljs-keyword {
  color: #1a73e8; /* 亮色模式下关键字颜色 */
}

.hljs-string {
  color: #d14; /* 亮色模式下字符串颜色 */
}

.hljs-comment {
  color: #888; /* 亮色模式下注释颜色 */
}

/* 暗黑模式的样式 */
@media (prefers-color-scheme: dark) {
  .hljs {
    background-color: #000000; /* 暗色背景 */
    color: #dcdcdc; /* 暗色文本 */
  }

  .hljs-keyword {
    color: #ff6347; /* 暗色模式下关键字颜色 */
  }

  .hljs-string {
    color: #32cd32; /* 暗色模式下字符串颜色 */
  }

  .hljs-comment {
    color: #808080; /* 暗色模式下注释颜色 */
  }
}
.preview-content code.hljs {
  white-space: pre !important;
}
.research-container {
  animation: fadeIn 1.5s ease-in-out;
}
</style>
