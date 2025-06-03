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
            文件枢纽
            <span class="subtitle">各个智能体和应用中心的洞见与分析报告都汇聚在这里...</span>
          </h2>
          <v-btn class="refresh-button" elevation="0" @click="refreshAllReports">
            <v-icon left>mdi-refresh</v-icon>
            刷新
          </v-btn>
        </div>

        <!-- 文件类型标签页 -->
        <v-tabs v-model="activeTab" background-color="transparent" color="primary" class="mb-4">
          <v-tab value="codeReport">代码分析报告</v-tab>
          <v-tab value="commitAnalysis">提交记录分析报告</v-tab>
          <v-tab value="commitDetails">提交记录修改明细</v-tab>
          <v-tab value="contributionChart">仓库提交贡献榜</v-tab>
          <v-tab value="activityHeatmap">提交活跃度·热力图</v-tab>
          <v-tab value="weekly" disabled>代码仓库周刊</v-tab>
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
                        icon="mdi-pencil"
                        variant="text"
                        size="small"
                        color="primary"
                        @click.stop="showRenameDialog(file)"
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
                    <v-btn
                      icon="mdi-pencil"
                      variant="text"
                      size="small"
                      color="primary"
                      @click.stop="showRenameDialog(file)"
                    ></v-btn>
                    <v-btn
                      icon="mdi-delete"
                      variant="text"
                      size="small"
                      color="error"
                      @click.stop="removeContributionChartFile(file)"
                    ></v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </div>
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
                    <v-btn
                      icon="mdi-pencil"
                      variant="text"
                      size="small"
                      color="primary"
                      @click.stop="showRenameDialog(file)"
                    ></v-btn>
                    <v-btn
                      icon="mdi-delete"
                      variant="text"
                      size="small"
                      color="error"
                      @click.stop="removeActivityHeatmapFile(file)"
                    ></v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </div>
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
                    <v-btn
                      icon="mdi-pencil"
                      variant="text"
                      size="small"
                      color="primary"
                      @click.stop="showRenameDialog(file)"
                    ></v-btn>
                    <v-btn
                      icon="mdi-delete"
                      variant="text"
                      size="small"
                      color="error"
                      @click.stop="removeCommitDetailsFile(file)"
                    ></v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </div>
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
                    <v-btn
                      icon="mdi-pencil"
                      variant="text"
                      size="small"
                      color="primary"
                      @click.stop="showRenameDialog(file)"
                    ></v-btn>
                    <v-btn
                      icon="mdi-delete"
                      variant="text"
                      size="small"
                      color="error"
                      @click.stop="removeCommitAnalysisFile(file)"
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
                <div v-if="selectedFile.type === 'md'" class="markdown-container">
                  <!-- 大文件导航控制 -->
                  <div v-if="isLargeFile && mdTotalChunks > 1" class="md-navigation sticky-md-nav">
                    <div class="md-info">
                      <v-chip size="small" color="info" variant="outlined">
                        <v-icon left size="small">mdi-file-document</v-icon>
                        大文件模式 ({{ Math.round(fileContent.length / 1024) }}KB)
                      </v-chip>
                      <v-chip size="small" color="primary" variant="outlined" class="ml-2">
                        第 {{ mdCurrentChunk + 1 }} / {{ mdTotalChunks }} 块
                      </v-chip>
                    </div>
                    <div class="md-controls mt-2 mb-2">
                      <v-btn
                        size="small"
                        variant="outlined"
                        :disabled="mdCurrentChunk === 0"
                        @click="mdCurrentChunk--"
                      >
                        <v-icon>mdi-chevron-left</v-icon>
                        上一块
                      </v-btn>
                      <v-btn
                        size="small"
                        variant="outlined"
                        class="ml-2"
                        :disabled="mdCurrentChunk >= mdTotalChunks - 1"
                        @click="mdCurrentChunk++"
                      >
                        下一块
                        <v-icon>mdi-chevron-right</v-icon>
                      </v-btn>
                    </div>
                  </div>

                  <!-- MD内容显示 -->
                  <div class="markdown-preview" v-html="displayedMarkdown"></div>

                  <!-- 加载状态 -->
                  <div v-if="mdLoading" class="text-center py-4">
                    <v-progress-circular
                      indeterminate
                      color="primary"
                      size="24"
                    ></v-progress-circular>
                    <div class="text-caption mt-2">加载中...</div>
                  </div>
                </div>
                <div v-if="selectedFile?.type === 'csv'" class="csv-container">
                  <!-- CSV信息栏 -->
                  <div class="csv-info-bar">
                    <div class="csv-stats">
                      <v-chip size="small" color="primary" variant="outlined">
                        <v-icon left size="small">mdi-table</v-icon>
                        {{ csvHeaders.length }} 列
                      </v-chip>
                      <v-chip size="small" color="success" variant="outlined" class="ml-2">
                        <v-icon left size="small">mdi-format-list-numbered</v-icon>
                        {{ csvData.length }} 行
                      </v-chip>
                      <v-chip
                        v-if="isLargeFile"
                        size="small"
                        color="warning"
                        variant="outlined"
                        class="ml-2"
                      >
                        <v-icon left size="small">mdi-flash</v-icon>
                        大文件模式
                      </v-chip>
                    </div>
                    <div class="csv-search">
                      <v-text-field
                        v-model="csvSearchText"
                        placeholder="搜索内容..."
                        density="compact"
                        variant="outlined"
                        hide-details
                        clearable
                        style="min-width: 500px"
                      >
                        <template #prepend-inner>
                          <v-icon size="small">mdi-magnify</v-icon>
                        </template>
                      </v-text-field>
                    </div>
                  </div>

                  <!-- CSV分页控制 -->
                  <div
                    v-if="isLargeFile && csvTotalPages > 1 && !csvSearchText"
                    class="csv-pagination"
                  >
                    <div class="pagination-info">
                      <span class="text-caption">
                        第 {{ (csvCurrentPage - 1) * csvPageSize + 1 }} -
                        {{ Math.min(csvCurrentPage * csvPageSize, csvData.length) }} 行， 共
                        {{ csvData.length }} 行
                      </span>
                    </div>
                    <div class="pagination-controls">
                      <v-btn
                        size="small"
                        variant="outlined"
                        :disabled="csvCurrentPage === 1"
                        @click="csvCurrentPage--"
                      >
                        <v-icon>mdi-chevron-left</v-icon>
                        上一页
                      </v-btn>
                      <span class="mx-3 text-caption">
                        {{ csvCurrentPage }} / {{ csvTotalPages }}
                      </span>
                      <v-btn
                        size="small"
                        variant="outlined"
                        :disabled="csvCurrentPage >= csvTotalPages"
                        @click="csvCurrentPage++"
                      >
                        下一页
                        <v-icon>mdi-chevron-right</v-icon>
                      </v-btn>
                    </div>
                  </div>

                  <!-- CSV表格 -->
                  <div class="csv-preview">
                    <!-- 加载状态 -->
                    <div v-if="csvLoading" class="text-center py-4">
                      <v-progress-circular
                        indeterminate
                        color="primary"
                        size="24"
                      ></v-progress-circular>
                      <div class="text-caption mt-2">加载中...</div>
                    </div>

                    <!-- 表格内容 -->
                    <div v-else-if="csvHeaders.length > 0" class="csv-table-container">
                      <table class="csv-table">
                        <thead>
                          <tr>
                            <th class="row-number-header">#</th>
                            <th v-for="(header, index) in csvHeaders" :key="index">{{ header }}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(row, rowIndex) in filteredCsvData" :key="rowIndex">
                            <td class="row-number">{{ getOriginalRowIndex(rowIndex) + 1 }}</td>
                            <td v-for="(cell, cellIndex) in row" :key="cellIndex" :title="cell">
                              <span v-html="highlightSearchText(cell)"></span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <!-- 无结果提示 -->
                    <div v-if="filteredCsvData.length === 0 && csvSearchText" class="no-results">
                      <v-icon color="grey">mdi-magnify</v-icon>
                      <div class="text-body-2 mt-2">未找到匹配的内容</div>
                    </div>

                    <!-- 空数据提示 -->
                    <div v-if="csvHeaders.length === 0 && !csvLoading" class="no-results">
                      <v-icon color="grey">mdi-table</v-icon>
                      <div class="text-body-2 mt-2">无法解析CSV数据</div>
                    </div>
                  </div>
                </div>
                <div
                  v-else-if="['png', 'jpg', 'jpeg'].includes(selectedFile?.type)"
                  class="image-container"
                >
                  <div
                    v-if="fileContent && !fileContent.startsWith('无法预览')"
                    class="image-preview"
                  >
                    <img
                      :src="fileContent"
                      :alt="selectedFile.name"
                      style="
                        max-width: 100%;
                        max-height: 80vh;
                        object-fit: contain;
                        display: block;
                        margin: 0 auto;
                      "
                      @error="handleImageError"
                      @load="handleImageLoad"
                    />
                    <div class="image-info mt-2 text-center">
                      <v-chip size="small" color="info" variant="outlined">
                        <v-icon left size="small">mdi-image</v-icon>
                        {{ selectedFile.name }}
                      </v-chip>
                    </div>
                  </div>
                  <div v-else class="text-center py-4">
                    <v-icon size="48" color="error">mdi-image-broken</v-icon>
                    <div class="text-body-1 mt-2 text-error">{{ fileContent }}</div>
                    <v-btn
                      color="primary"
                      variant="text"
                      class="mt-2"
                      @click="openFile(selectedFile)"
                    >
                      在外部打开
                    </v-btn>
                  </div>
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

        <!-- 重命名对话框 -->
        <v-dialog v-model="renameDialog" max-width="500px">
          <v-card>
            <v-card-title class="d-flex align-center">
              <v-icon left>mdi-pencil</v-icon>
              <span>重命名文件</span>
              <v-spacer></v-spacer>
              <v-btn icon="mdi-close" variant="text" @click="renameDialog = false"></v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text>
              <div class="mb-4">
                <div class="text-body-2 text-grey-darken-1 mb-2">当前文件名：</div>
                <div class="text-body-1">{{ renameFile?.name }}</div>
              </div>
              <v-text-field
                v-model="newFileName"
                label="新文件名"
                variant="outlined"
                density="comfortable"
                hide-details="auto"
                :rules="[(v) => !!v || '文件名不能为空']"
                @keyup.enter="handleRename"
              ></v-text-field>
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="grey" variant="text" @click="renameDialog = false"> 取消 </v-btn>
              <v-btn color="primary" variant="text" :disabled="!newFileName" @click="handleRename">
                确认重命名
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
import {
  deepResearchFiles,
  deleteFile,
  commitsResearchFiles,
  commitsDetailsFileList,
  renameFile,
  heatmapFiles,
  contributionChartFiles
} from '../service/api'
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
      commitAnalysisFiles: [], // 提交记录分析报告文件列表
      commitDetailFiles: [], // 提交记录明细文件列表
      activityHeatmapFiles: [], // 热力图文件列表
      contributionChartFiles: [], // 贡献图表文件列表
      activeTab: 'codeReport', // 当前活动的标签页
      previewDialog: false, // 预览对话框显示状态
      selectedFile: null, // 当前选中的文件
      fileContent: null, // 文件内容
      csvHeaders: [], // CSV文件表头
      csvData: [], // CSV文件数据
      csvSearchText: '', // CSV搜索文本
      csvFilteredIndexes: [], // 过滤后的行索引
      renameDialog: false, // 重命名对话框显示状态
      renameFile: null, // 当前要重命名的文件
      newFileName: '', // 新文件名
      // 性能优化相关
      csvPageSize: 100, // CSV分页大小
      csvCurrentPage: 1, // CSV当前页
      csvTotalRows: 0, // CSV总行数
      csvLoading: false, // CSV加载状态
      mdChunkSize: 50000, // MD文件分块大小（字符数）
      mdCurrentChunk: 0, // MD当前显示的块
      mdTotalChunks: 0, // MD总块数
      mdLoading: false, // MD加载状态
      isLargeFile: false, // 是否为大文件
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

    // 过滤后的CSV数据（分页优化）
    filteredCsvData() {
      if (!this.csvSearchText || !this.csvData.length) {
        this.csvFilteredIndexes = this.csvData.map((_, index) => index)
        // 对于大文件，只返回当前页的数据
        if (this.isLargeFile && this.csvData.length > this.csvPageSize) {
          const startIndex = (this.csvCurrentPage - 1) * this.csvPageSize
          const endIndex = Math.min(startIndex + this.csvPageSize, this.csvData.length)
          return this.csvData.slice(startIndex, endIndex)
        }
        return this.csvData
      }

      const searchText = this.csvSearchText.toLowerCase()
      const filtered = []
      const indexes = []

      this.csvData.forEach((row, index) => {
        const rowText = row.join(' ').toLowerCase()
        if (rowText.includes(searchText)) {
          filtered.push(row)
          indexes.push(index)
        }
      })

      this.csvFilteredIndexes = indexes
      return filtered
    },

    // CSV总页数
    csvTotalPages() {
      if (!this.isLargeFile) return 1
      return Math.ceil(this.csvData.length / this.csvPageSize)
    },

    // 当前显示的MD内容
    displayedMarkdown() {
      if (!this.isLargeFile || !this.fileContent) {
        return this.renderedMarkdown
      }

      // 对于大文件，只显示当前块的内容
      const startIndex = this.mdCurrentChunk * this.mdChunkSize
      const endIndex = Math.min(startIndex + this.mdChunkSize, this.fileContent.length)
      const chunk = this.fileContent.slice(startIndex, endIndex)
      return this.md.render(chunk)
    }
  },
  created() {
    // this.loadMockData()
    this.fetchCodeReports()
    this.fetchCommitAnalysisReports()
    this.fetchCommitDetailsFiles()
    this.fetchContributionChartFiles()
    this.fetchHeatmapFiles()
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
    async removeCommitAnalysisFile(file) {
      //二次确认
      if (confirm('确定要删除吗？')) {
        try {
          const res = await deleteFile(file.raw.id)
          this.commitAnalysisFiles = this.commitAnalysisFiles.filter(
            (f) => f.raw.id !== file.raw.id
          )
          this.fetchCommitAnalysisReports()
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
    async removeActivityHeatmapFile(file) {
      //二次确认
      if (confirm('确定要删除吗？')) {
        try {
          const res = await deleteFile(file.raw.id)
          this.activityHeatmapFiles = this.activityHeatmapFiles.filter(
            (f) => f.raw.id !== file.raw.id
          )
          this.fetchHeatmapFiles()
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
    async removeContributionChartFile(file) {
      //二次确认
      if (confirm('确定要删除吗？')) {
        try {
          const res = await deleteFile(file.raw.id)
          this.contributionChartFiles = this.contributionChartFiles.filter(
            (f) => f.raw.id !== file.raw.id
          )
          this.fetchContributionChartFiles()
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
    async removeCommitDetailsFile(file) {
      //二次确认
      if (confirm('确定要删除吗？')) {
        try {
          const res = await deleteFile(file.raw.id)
          // 从commitDetailFiles中移除
          this.commitDetailFiles = this.commitDetailFiles.filter((f) => f.raw.id !== file.raw.id)
          // 从总文件列表中移除
          this.files = this.files.filter((f) => f.raw?.id !== file.raw.id)
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
    // 显示重命名对话框
    showRenameDialog(file) {
      this.renameFile = file
      this.newFileName = file.name
      this.renameDialog = true
    },
    // 处理重命名
    async handleRename() {
      if (!this.newFileName || !this.renameFile) {
        return
      }

      try {
        await renameFile(this.renameFile.raw.id, this.newFileName)

        // 更新本地数据
        const updateFileName = (fileList) => {
          const fileIndex = fileList.findIndex((f) => f.raw.id === this.renameFile.raw.id)
          if (fileIndex !== -1) {
            fileList[fileIndex].name = this.newFileName
          }
        }

        // 更新各个文件列表中的文件名
        updateFileName(this.files)
        updateFileName(this.commitAnalysisFiles)
        updateFileName(this.commitDetailFiles)

        this.$store.dispatch('snackbar/showSnackbar', {
          message: '重命名成功',
          type: 'success'
        })

        this.renameDialog = false
        this.renameFile = null
        this.newFileName = ''
      } catch (error) {
        console.error('重命名文件失败:', error)
        this.$store.dispatch('snackbar/showSnackbar', {
          message: '重命名失败',
          type: 'error'
        })
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
    async fetchCommitAnalysisReports() {
      try {
        const res = await commitsResearchFiles()
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
            main_tags: ['提交记录分析'],
            tags,
            raw: item
          }
        })
        // 过滤掉状态不为success的文件
        apiFiles = apiFiles.filter((item) => item.raw.status === 'success')
        this.commitAnalysisFiles = apiFiles
      } catch (error) {
        console.error('获取提交记录分析报告失败：', error)
      }
    },
    async fetchCommitDetailsFiles() {
      try {
        const res = await commitsDetailsFileList()
        // 假设 res.data 就是文件数组
        let apiFiles = res.data.map((item) => {
          const extMatch = item.file_path.match(/\.([a-zA-Z0-9]+)$/)
          const ext = extMatch ? extMatch[1] : (item.file_type || '').toLowerCase()
          const tags = ext === 'csv' ? ['可预览'] : []

          // 处理时间字段，优先使用updated_at，如果无效则使用uploaded_at
          let timeValue = item.uploaded_at
          if (
            item.updated_at &&
            item.updated_at.Valid &&
            item.updated_at.Time !== '0001-01-01T00:00:00Z'
          ) {
            timeValue = item.updated_at.Time
          }

          return {
            name: item.file_name,
            path: item.file_path,
            type: ext,
            modifiedTime: new Date(timeValue),
            main_tags: ['提交记录明细'],
            tags,
            raw: item,
            category: 'commitDetails'
          }
        })
        // 过滤掉状态不为success的文件
        apiFiles = apiFiles.filter((item) => item.raw.status === 'success')
        // 将明细文件添加到总文件列表中
        this.files = this.files.filter((f) => f.category !== 'commitDetails').concat(apiFiles)
        this.commitDetailFiles = apiFiles
      } catch (error) {
        console.error('获取提交记录明细文件失败：', error)
      }
    },
    async fetchContributionChartFiles() {
      try {
        const res = await contributionChartFiles()
        // 假设 res.data 就是文件数组
        let apiFiles = res.data.map((item) => {
          const extMatch = item.file_path.match(/\.([a-zA-Z0-9]+)$/)
          const ext = extMatch ? extMatch[1] : (item.file_type || '').toLowerCase()
          const tags = ['图片文件']

          // 处理时间字段，优先使用updated_at，如果无效则使用uploaded_at
          let timeValue = item.uploaded_at
          if (
            item.updated_at &&
            item.updated_at.Valid &&
            item.updated_at.Time !== '0001-01-01T00:00:00Z'
          ) {
            timeValue = item.updated_at.Time
          }

          return {
            name: item.file_name,
            path: item.file_path,
            type: ext,
            modifiedTime: new Date(timeValue),
            main_tags: ['仓库提交贡献榜'],
            tags,
            raw: item,
            category: 'contributionChart'
          }
        })
        // 过滤掉状态不为success的文件
        apiFiles = apiFiles.filter((item) => item.raw.status === 'success')
        // 将贡献榜文件添加到总文件列表中
        this.files = this.files.filter((f) => f.category !== 'contributionChart').concat(apiFiles)
        this.contributionChartFiles = apiFiles
      } catch (error) {
        console.error('获取仓库提交贡献榜文件失败：', error)
      }
    },
    async fetchHeatmapFiles() {
      try {
        const res = await heatmapFiles()
        // 假设 res.data 就是文件数组
        let apiFiles = res.data.map((item) => {
          const extMatch = item.file_path.match(/\.([a-zA-Z0-9]+)$/)
          const ext = extMatch ? extMatch[1] : (item.file_type || '').toLowerCase()
          const tags = ['图片文件']

          // 处理时间字段，优先使用updated_at，如果无效则使用uploaded_at
          let timeValue = item.uploaded_at
          if (
            item.updated_at &&
            item.updated_at.Valid &&
            item.updated_at.Time !== '0001-01-01T00:00:00Z'
          ) {
            timeValue = item.updated_at.Time
          }

          return {
            name: item.file_name,
            path: item.file_path,
            type: ext,
            modifiedTime: new Date(timeValue),
            main_tags: ['提交活跃度·热力图'],
            tags,
            raw: item,
            category: 'activityHeatmap'
          }
        })
        // 过滤掉状态不为success的文件
        apiFiles = apiFiles.filter((item) => item.raw.status === 'success')
        // 将热力图文件添加到总文件列表中
        this.files = this.files.filter((f) => f.category !== 'activityHeatmap').concat(apiFiles)
        this.activityHeatmapFiles = apiFiles
      } catch (error) {
        console.error('获取提交活跃度·热力图文件失败：', error)
      }
    },
    refreshAllReports() {
      this.fetchCodeReports()
      this.fetchCommitAnalysisReports()
      this.fetchCommitDetailsFiles()
      this.fetchContributionChartFiles()
      this.fetchHeatmapFiles()
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
      this.isLargeFile = false
      this.csvCurrentPage = 1
      this.mdCurrentChunk = 0
      this.csvLoading = false
      this.mdLoading = false

      // 1. Markdown 文件：通过 IPC 读取并渲染
      if (file.type === 'md') {
        this.mdLoading = true
        try {
          console.log('读取 Markdown 文件：', file.path)
          const raw = await window.electron.readFile(file.path)
          this.fileContent = raw

          // 检测是否为大文件（超过50KB）
          if (raw.length > this.mdChunkSize) {
            this.isLargeFile = true
            this.mdTotalChunks = Math.ceil(raw.length / this.mdChunkSize)
            console.log(
              `大MD文件检测: ${Math.round(raw.length / 1024)}KB, 分为${this.mdTotalChunks}块`
            )
          } else {
            this.renderedMarkdown = this.md.render(raw)
          }
        } catch (err) {
          console.error('加载 Markdown 失败：', err)
          this.fileContent = `读取Markdown文件失败: ${err.message}`
        } finally {
          this.mdLoading = false
        }
        return
      } else if (file.type === 'docx') {
        if (confirm('是否在外部应用中打开Docx文档？')) {
          const appPath = await this.getAppPath('Microsoft Word')
          if (appPath) {
            window.electron.shell.openPath(appPath)
          } else {
            // 未找到，通过默认应用打开
            window.electron.shell.openPath(file.path)
          }
          this.fileContent = `无法读取${file.type}格式文件的内容，通过外部打开`
          return
        }
        this.previewDialog = false
        return
      }

      // 2. CSV 文件：通过 IPC 读取并解析
      if (file.type === 'csv') {
        this.csvLoading = true
        try {
          console.log('读取 CSV 文件：', file.path)
          const raw = await window.electron.readFile(file.path)
          this.fileContent = raw

          // 使用异步解析避免阻塞UI
          await this.parseCsvContentAsync(raw)
        } catch (err) {
          console.error('加载 CSV 失败：', err)
          this.fileContent = `读取CSV文件失败: ${err.message}`
        } finally {
          this.csvLoading = false
        }
        return
      }

      // 3. 图片文件：使用专门的图片读取接口
      if (['png', 'jpg', 'jpeg'].includes(file.type)) {
        try {
          // 使用新的readImageBlob接口读取图片
          const imageDataUrl = await window.electron.readImageBlob(file.path)
          if (imageDataUrl) {
            this.fileContent = imageDataUrl
            console.log('图片预览成功加载')
          } else {
            this.fileContent = '无法读取图片文件'
          }
        } catch (err) {
          console.error('读取图片文件失败：', err)
          this.fileContent = `无法预览图片: ${err.message}`
        }
        return
      }

      // 4. 其它类型继续原有模拟逻辑
      setTimeout(() => {
        this.fileContent = `无法读取${file.type}格式文件的内容，通过外部打开`
      }, 500)
    },

    // 图片加载成功处理
    handleImageLoad(event) {
      console.log('图片加载成功：', event.target.src)
    },
    // 图片加载错误处理
    handleImageError(event) {
      console.error('图片加载失败：', event.target.src)
      this.fileContent = '无法预览图片：图片文件可能已损坏或不存在'
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
    },

    // 解析CSV内容
    parseCsvContent(csvText) {
      if (!csvText || typeof csvText !== 'string') {
        this.csvHeaders = []
        this.csvData = []
        return
      }

      try {
        // 按行分割，过滤空行
        const lines = csvText.split('\n').filter((line) => line.trim())

        if (lines.length === 0) {
          this.csvHeaders = []
          this.csvData = []
          return
        }

        // 改进的CSV行解析函数，更好地处理引号和逗号
        const parseCSVLine = (line) => {
          const result = []
          let current = ''
          let inQuotes = false
          let i = 0

          while (i < line.length) {
            const char = line[i]

            if (char === '"') {
              if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                // 处理双引号转义 ("")
                current += '"'
                i += 2
                continue
              } else {
                // 切换引号状态
                inQuotes = !inQuotes
              }
            } else if (char === ',' && !inQuotes) {
              // 在引号外遇到逗号，分割字段
              result.push(current.trim())
              current = ''
            } else {
              current += char
            }
            i++
          }

          // 添加最后一个字段
          result.push(current.trim())

          // 清理字段值，移除首尾的引号
          return result.map((field) => {
            if (field.startsWith('"') && field.endsWith('"')) {
              return field.slice(1, -1)
            }
            return field
          })
        }

        // 第一行作为表头，确定总列数
        this.csvHeaders = parseCSVLine(lines[0])
        const totalColumns = this.csvHeaders.length
        console.log('CSV表头解析完成，总列数:', totalColumns)

        // 处理数据行，考虑行内换行的情况
        this.csvData = []
        let currentRow = []
        let lineIndex = 1 // 从第二行开始（跳过表头）

        while (lineIndex < lines.length) {
          // 解析当前行
          const parsedFields = parseCSVLine(lines[lineIndex])

          // 将解析出的字段添加到当前行
          currentRow = currentRow.concat(parsedFields)

          // 检查当前行是否已经达到或超过总列数
          if (currentRow.length >= totalColumns) {
            // 如果超出总列数，截断多余部分
            if (currentRow.length > totalColumns) {
              currentRow = currentRow.slice(0, totalColumns)
            }

            // 添加完整行到数据集
            this.csvData.push(currentRow)

            // 重置当前行，准备处理下一行数据
            currentRow = []
          }

          // 移动到下一行
          lineIndex++
        }

        // 处理最后一个不完整行（如果有）
        if (currentRow.length > 0) {
          // 填充不足的列
          while (currentRow.length < totalColumns) {
            currentRow.push('')
          }
          this.csvData.push(currentRow)
        }

        console.log('CSV解析完成:', {
          headers: this.csvHeaders,
          dataRows: this.csvData.length,
          sampleRow: this.csvData[0]
        })
      } catch (err) {
        console.error('CSV解析失败:', err)
        this.csvHeaders = ['解析错误']
        this.csvData = [[`CSV解析失败: ${err.message}`]]
      }
    },

    // 异步解析 CSV 内容（避免阻塞UI）
    async parseCsvContentAsync(csvText) {
      if (!csvText || typeof csvText !== 'string') {
        this.csvHeaders = []
        this.csvData = []
        this.csvTotalRows = 0
        return
      }

      try {
        // 按行分割，过滤空行
        const lines = csvText.split('\n').filter((line) => line.trim())

        if (lines.length === 0) {
          this.csvHeaders = []
          this.csvData = []
          this.csvTotalRows = 0
          return
        }

        // 解析表头
        this.csvHeaders = this.parseCSVLine(lines[0])
        this.csvData = []
        this.csvTotalRows = lines.length - 1

        // 检测是否为大文件（超过1000行）
        if (this.csvTotalRows > 1000) {
          this.isLargeFile = true
          console.log(`大CSV文件检测: ${this.csvTotalRows}行数据`)
        }

        // 分批解析数据行，避免阻塞UI
        const batchSize = 500
        const totalColumns = this.csvHeaders.length
        let currentRow = []
        let lineIndex = 1

        while (lineIndex < lines.length) {
          const batchEnd = Math.min(lineIndex + batchSize, lines.length)
          const batch = []

          for (let i = lineIndex; i < batchEnd; i++) {
            const parsedFields = this.parseCSVLine(lines[i])
            currentRow = currentRow.concat(parsedFields)

            if (currentRow.length >= totalColumns) {
              if (currentRow.length > totalColumns) {
                currentRow = currentRow.slice(0, totalColumns)
              }
              batch.push(currentRow)
              currentRow = []
            }
          }

          this.csvData.push(...batch)
          lineIndex = batchEnd

          // 让出控制权，避免阻塞UI
          if (lineIndex < lines.length) {
            await new Promise((resolve) => setTimeout(resolve, 10))
          }
        }

        // 处理最后一个不完整行
        if (currentRow.length > 0) {
          while (currentRow.length < totalColumns) {
            currentRow.push('')
          }
          this.csvData.push(currentRow)
        }

        console.log('CSV 异步解析完成：', {
          headers: this.csvHeaders.length,
          rows: this.csvData.length,
          totalRows: this.csvTotalRows
        })
      } catch (err) {
        console.error('CSV异步解析失败:', err)
        this.csvHeaders = ['解析错误']
        this.csvData = [[`CSV解析失败: ${err.message}`]]
      }
    },

    // CSV行解析辅助方法
    parseCSVLine(line) {
      const result = []
      let current = ''
      let inQuotes = false
      let i = 0

      while (i < line.length) {
        const char = line[i]

        if (char === '"') {
          if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
            current += '"'
            i += 2
            continue
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
        i++
      }

      result.push(current.trim())

      return result.map((field) => {
        if (field.startsWith('"') && field.endsWith('"')) {
          return field.slice(1, -1)
        }
        return field
      })
    },

    // MD文件分块导航
    prevMdChunk() {
      if (this.mdCurrentChunk > 0) {
        this.mdCurrentChunk--
      }
    },

    nextMdChunk() {
      if (this.mdCurrentChunk < this.mdTotalChunks - 1) {
        this.mdCurrentChunk++
      }
    },

    // CSV分页导航
    prevCsvPage() {
      if (this.csvCurrentPage > 1) {
        this.csvCurrentPage--
      }
    },

    nextCsvPage() {
      if (this.csvCurrentPage < this.csvTotalPages) {
        this.csvCurrentPage++
      }
    },

    // 获取原始行索引（用于显示行号）
    getOriginalRowIndex(filteredIndex) {
      return this.csvFilteredIndexes[filteredIndex] || filteredIndex
    },

    // 高亮搜索文本
    highlightSearchText(text) {
      if (!this.csvSearchText || !text) {
        return text
      }

      const searchText = this.csvSearchText.toLowerCase()
      const textLower = text.toLowerCase()

      if (!textLower.includes(searchText)) {
        return text
      }

      // 使用正则表达式进行大小写不敏感的替换
      const regex = new RegExp(
        `(${this.csvSearchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
        'gi'
      )
      return text.replace(
        regex,
        '<mark style="background-color: #ffeb3b; padding: 1px 2px; border-radius: 2px;">$1</mark>'
      )
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

.csv-preview {
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  width: 100%;
  max-width: 2500px;
  overflow-x: auto;
  overflow-y: auto;
}

.csv-table {
  width: 2500px;
  min-width: 2500px;
  border-collapse: collapse;
  font-size: 14px;
  background-color: white;
}

.csv-table th {
  background-color: #f8f9fa;
  color: #495057;
  font-weight: 600;
  padding: 12px 8px;
  text-align: left;
  border-bottom: 2px solid #dee2e6;
  border-right: 1px solid #dee2e6;
  position: sticky;
  top: 0;
  z-index: 1;
  white-space: pre-wrap;
  word-wrap: break-word;
  word-break: break-all;
  max-width: 200px;
  min-height: 20px;
  line-height: 1.4;
}

.csv-table td {
  padding: 10px 8px;
  border-bottom: 1px solid #e9ecef;
  border-right: 1px solid #dee2e6;
  vertical-align: top;
  word-break: break-word;
  white-space: pre-wrap;
  word-wrap: break-word;
  word-break: break-all;
  max-width: 200px;
  min-height: 20px;
  line-height: 1.4;
  span {
    color: #282c2f;
  }
}

.csv-table tbody tr:hover {
  background-color: #f8f9fa;
}

.csv-table tbody tr:nth-child(even) {
  background-color: #fdfdfd;
}

.csv-table tbody tr:nth-child(even):hover {
  background-color: #f8f9fa;
}

.csv-container {
  width: 100%;
}

.csv-info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  border-radius: 4px 4px 0 0;
}

.csv-stats {
  display: flex;
  align-items: center;
}

.csv-search {
  color: #6c757d;
  background-color: #f8f9fa;
  display: flex;
  align-items: center;
}

.row-number-header {
  width: 60px;
  min-width: 60px;
  background-color: #e9ecef !important;
  text-align: center;
  font-weight: 700;
}

.row-number {
  width: 60px;
  min-width: 60px;
  background-color: #f8f9fa;
  text-align: center;
  font-weight: 500;
  color: #6c757d;
  border-right: 1px solid #dee2e6;
}

.no-results {
  text-align: center;
  padding: 40px 20px;
  color: #6c757d;
  background-color: #f8f9fa;
}

.csv-preview {
  border-radius: 0 0 4px 4px;
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

.sticky-md-nav {
  position: sticky;
  top: 0;
  background-color: rgba(var(--v-theme-surface), 0.98);
  padding-top: 12px;
  padding-bottom: 12px;
  z-index: 10;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  margin-left: -24px; /* Adjust to counteract v-card-text padding */
  margin-right: -24px; /* Adjust to counteract v-card-text padding */
  padding-left: 24px;
  padding-right: 24px;
}
</style>
