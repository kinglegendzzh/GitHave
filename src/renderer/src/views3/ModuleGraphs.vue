<template>
  <div class="module-graphs-container">
    <!-- 通知消息 Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="snackbar.timeout">
      {{ snackbar.text }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">关闭</v-btn>
      </template>
    </v-snackbar>

    <!-- 确认对话框 Dialog -->
    <v-dialog v-model="dialog.show" max-width="500px" persistent>
      <v-card>
        <v-card-title>{{ dialog.title }}</v-card-title>
        <v-card-text>{{ dialog.message }}</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" variant="text" @click="cancelDialog">{{ dialog.cancelText }}</v-btn>
          <v-btn color="warning" variant="text" @click="stopDialog">{{ dialog.stopText }}</v-btn>
          <v-btn color="primary" variant="text" @click="confirmDialog">{{
            dialog.confirmText
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <div class="header-section">
      <div class="project-selector">
        <v-autocomplete
          v-model="projectDir"
          :items="pathSuggestions"
          :filter="queryPathSuggestions"
          placeholder="请输入或选择项目目录路径"
          no-data-text="暂无数据"
          class="project-input"
          item-title="title"
          item-value="value"
          density="compact"
          variant="outlined"
          min-width="500px"
          hide-details
          clearable
          return-object
          @update:model-value="handlePathSelect"
        >
          <template #item="{ item, props }">
            <v-list-item
              v-bind="props"
              :title="item.raw.title"
              :subtitle="item.raw.value"
            ></v-list-item>
          </template>
        </v-autocomplete>
        <v-btn
          class="ml-2"
          size="small"
          variant="plain"
          :loading="loading"
          @click="fetchModuleGraphs"
        >
          刷新
        </v-btn>
        <v-btn
          class="ml-2"
          size="small"
          variant="outlined"
          color="primary"
          :loading="updating"
          @click="updateModule"
        >
          <v-icon>mdi-robot-excited</v-icon>
          生成分析
        </v-btn>
        <v-btn
          class="ml-2"
          size="small"
          variant="outlined"
          color="error"
          :loading="updating"
          @click="deleteModule"
        >
          <v-icon>mdi-delete</v-icon>
          清除分析
        </v-btn>
        <v-tooltip location="bottom">
          <template #activator="{ props }">
            <v-icon
              v-bind="props"
              class="ml-2"
              color="grey-lighten-1"
              size="small"
              style="margin-top: -2px"
              @click="jumpToScan"
            >
              mdi-information-outline
            </v-icon>
          </template>
          <span>建议先为项目构建索引，再进行AI模块分析，可以大幅提升准确性</span>
        </v-tooltip>
      </div>
      <!-- 分析进度显示 -->
      <div v-if="analysisProgress.show" class="analysis-progress">
        <v-progress-linear
          v-model="analysisProgress.percent"
          color="primary"
          height="8"
          rounded
          striped
          class="progress-bar"
        ></v-progress-linear>
        <div class="progress-text">
          <span>分析进度: {{ analysisProgress.completed }}/{{ analysisProgress.total }}</span>
          <v-icon
            v-if="analysisProgress.status === 'running'"
            color="primary"
            size="small"
            class="ml-1 loading-icon"
          >
            mdi-loading mdi-spin
          </v-icon>
          <v-btn
            :loading="analysisProgress.stopLoading"
            color="error"
            variant="outlined"
            size="x-small"
            @click="stopAnalysisMonitoring"
            >停止</v-btn
          >
        </div>
      </div>
    </div>
    <el-tabs v-model="activeTab" class="graph-tabs">
      <el-tab-pane label="网络结构" name="network">
        <div class="graph-container">
          <div id="network-graph" class="graph-view"></div>
          <div
            style="
              position: absolute;
              top: 16px;
              right: 24px;
              z-index: 20;
              display: flex;
              align-items: center;
              gap: 16px;
            "
          >
            <!-- 节点阈值滑块 -->
            <div style="display: flex; align-items: center; gap: 8px; min-width: 160px">
              <el-slider
                v-model="nodeThreshold"
                :min="1"
                :max="maxNetworkNodes"
                :step="1"
                style="width: 250px"
                class="mr-4"
                @change="onThresholdChange"
              />
              <span style="font-size: 13px"
                >可见节点范围: {{ nodeThreshold }} / {{ maxNetworkNodes }}</span
              >
            </div>
            <!-- 搜索按钮 -->
            <button class="nav-search-btn" title="快速导航" @click="openNavDialog">
              <i class="el-icon-search"></i>
              <span>快速导航</span>
            </button>
            <!-- 自定义毛玻璃风格搜索弹窗 -->
            <Transition name="fade">
              <div v-if="navDialog" class="nav-dialog-backdrop" @click="closeNavDialog"></div>
            </Transition>
            <Transition name="slide-right">
              <div v-if="navDialog" class="nav-dialog-sidebar">
                <div class="nav-dialog">
                  <!-- 搜索框 -->
                  <div class="nav-search-header">
                    <input
                      v-model="navQuery"
                      class="nav-search-input"
                      placeholder="搜索节点..."
                      @input="updateNavResults"
                      @keyup.esc="closeNavDialog"
                    />
                    <button class="nav-close-btn" @click="closeNavDialog">
                      <i class="el-icon-close"></i>
                    </button>
                  </div>
                  <!-- 搜索结果 -->
                  <div class="nav-results-container">
                    <div v-if="navResults.length" class="nav-results-list">
                      <div
                        v-for="item in navResults"
                        :key="item.id"
                        class="nav-result-item"
                        @click="handleNavSelect(item)"
                      >
                        <div class="nav-result-name">{{ item.name || getNodeName(item.id) }}</div>
                        <div class="nav-result-path">{{ item.id }}</div>
                      </div>
                    </div>
                    <div v-else-if="navQuery" class="nav-no-results">未找到匹配的节点</div>
                    <div v-else class="nav-search-hint">输入关键词搜索节点</div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="目录树" name="flat">
        <v-skeleton-loader v-if="loading" type="table" class="skeleton-loader"></v-skeleton-loader>
        <div v-else class="graph-container" style="overflow: auto">
          <div
            v-if="flatData.length > 0"
            class="tree-container"
            style="height: 80vh; overflow: auto"
          >
            <el-tree
              :data="flatData"
              node-key="id"
              :default-expanded-keys="expandedKeys"
              :props="{ children: 'children', label: 'name' }"
              @node-expand="handleNodeExpand"
              @node-collapse="handleNodeCollapse"
            >
              <template #default="{ data }">
                <div
                  class="node-content"
                  :class="{
                    'llm-desc': data.hasDesc,
                    'no-llm-desc': !data.hasDesc
                  }"
                >
                  <span
                    :class="['module-name', data.type === 'file' ? 'file-node' : 'dir-node']"
                    :title="data.path"
                    @click.stop="showDirectoryDetails(data)"
                  >
                    <el-icon v-if="data.type === 'directory'"><Folder /></el-icon>
                    <el-icon v-else><Document /></el-icon>
                    {{ data.name || '根目录' }}
                    <el-tag
                      v-if="data.hasDesc"
                      size="small"
                      type="success"
                      class="meta-tag"
                      style="margin-left: 5px"
                      >已分析</el-tag
                    >
                    <el-tag
                      v-else
                      size="small"
                      type="info"
                      class="meta-tag"
                      style="margin-left: 5px"
                      >未分析</el-tag
                    >
                    <el-tag
                      v-if="data.hasIndex && data.type === 'file'"
                      size="small"
                      type="danger"
                      class="meta-tag"
                      style="margin-left: 5px"
                      >已索引</el-tag
                    >
                  </span>

                  <div class="node-path">
                    <el-tooltip :content="data.path" placement="top" :disabled="!data.path">
                      <span class="path-text">{{ data.path || '-' }}</span>
                    </el-tooltip>
                  </div>

                  <div class="node-meta">
                    <el-tag v-if="data.size" size="small" type="info" class="meta-tag">
                      {{ data.size }} 函数
                    </el-tag>
                    <el-tag v-if="data.childrenCount" size="small" type="success" class="meta-tag">
                      {{ data.childrenCount }} 子项
                    </el-tag>
                    <v-btn
                      type="primary"
                      size="x-small"
                      circle
                      :disabled="!data.hasDesc"
                      @click.stop="showDirectoryDetails(data)"
                    >
                      <v-icon size="small">mdi-information-outline</v-icon>
                      <span>查看详情</span>
                    </v-btn>
                  </div>
                </div>
              </template>
            </el-tree>
          </div>
          <div v-else class="no-data">
            <p>选择代码仓库后，点击刷新</p>
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane label="树状图" name="hierarchical">
        <div class="graph-container">
          <div id="hierarchical-graph" class="graph-view"></div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="旭日图" name="sunburst">
        <div class="graph-container">
          <div id="sunburst-graph" class="graph-view"></div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 目录详情弹窗 -->
    <el-dialog
      v-model="directoryDialogVisible"
      :title="selectedDirectory?.name || projectDir"
      width="80%"
      destroy-on-close
    >
      <div v-if="selectedDirectory" class="directory-details">
        <el-descriptions :title="selectedDirectory.path" :column="1" border>
          <el-descriptions-item label="类型">
            {{ selectedDirectory.type === 'directory' ? '目录' : '文件' }}
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedDirectory.description" label="AI分析摘要">
            <div
              class="markdown-content"
              style="word-break: break-all; padding-left: 10px; padding-right: 10px"
              v-html="computedMarkdown"
            />
          </el-descriptions-item>
          <el-descriptions-item
            v-if="selectedDirectory.functionCount !== undefined"
            label="索引函数数量"
          >
            {{ selectedDirectory.functionCount || 0 }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="selectedDirectory.fileCount !== undefined"
            label="索引文件数量"
          >
            {{ selectedDirectory.fileCount }}
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedDirectory.size" label="大小">
            {{ selectedDirectory.size }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 模块信息标签页 -->
        <el-tabs v-if="selectedDirectory.type === 'directory'" class="detail-tabs">
          <!-- 子目录/文件标签页 -->
          <el-tab-pane v-if="selectedDirectoryChildren.length > 0" label="子项">
            <el-tree
              :data="selectedDirectoryChildren"
              node-key="id"
              :props="{ children: 'children', label: 'name' }"
              :default-expanded-keys="selectedDirectory.id ? [selectedDirectory.id] : []"
              :expand-on-click-node="true"
            >
              <template #default="{ data }">
                <div class="custom-tree-node">
                  <el-icon v-if="data.type === 'directory'"><Folder /></el-icon>
                  <el-icon v-else><Document /></el-icon>
                  <span>{{ data.name }}</span>
                  <span class="node-info">
                    <el-tag size="small" :type="data.type === 'directory' ? 'primary' : 'info'">
                      {{ data.type === 'directory' ? '目录' : '文件' }}
                    </el-tag>
                    <span v-if="data.type === 'directory'" class="children-count">
                      {{ data.children?.length || 0 }} 个子项
                    </span>
                    <span v-if="data.size" class="size-info">{{ data.size }}</span>
                  </span>
                </div>
              </template>
            </el-tree>
          </el-tab-pane>

          <!-- 模块信息标签页 -->
          <el-tab-pane v-if="selectedModules && selectedModules.length > 0" label="模块信息">
            <el-table :data="selectedModules" style="width: 100%" border>
              <el-table-column prop="name" label="名称" width="150" />
              <el-table-column prop="type" label="类型" width="100" />
              <el-table-column prop="path" label="路径" />
              <el-table-column prop="function_count" label="索引函数数量" width="100" />
              <el-table-column prop="file_count" label="索引文件数量" width="100" />
              <el-table-column prop="description" label="AI分析摘要" show-overflow-tooltip />
              <el-table-column prop="updated_at" label="更新时间" width="180" />
            </el-table>
          </el-tab-pane>

          <!-- 函数信息标签页 -->
          <el-tab-pane
            v-if="
              selectedDirectory.type === 'file' && selectedFunctions && selectedFunctions.length > 0
            "
            label="函数信息"
          >
            <el-table :data="selectedFunctions" style="width: 100%" border>
              <el-table-column prop="name" label="函数名" width="150" />
              <el-table-column prop="package" label="包名" width="120" />
              <el-table-column prop="file" label="文件" show-overflow-tooltip />
              <el-table-column label="行号">
                <template #default="{ row }">{{ row.start_line }} - {{ row.end_line }}</template>
              </el-table-column>
              <el-table-column prop="description" label="AI分析摘要" show-overflow-tooltip />
            </el-table>
          </el-tab-pane>
        </el-tabs>

        <!-- 文件函数信息 (当选中的是文件时) -->
        <el-tabs
          v-if="
            selectedDirectory.type === 'file' && selectedFunctions && selectedFunctions.length > 0
          "
          class="detail-tabs"
        >
          <el-tab-pane label="函数信息">
            <el-table :data="selectedFunctions" style="width: 100%" border>
              <el-table-column prop="name" label="函数名" />
              <el-table-column label="行号">
                <template #default="{ row }">{{ row.start_line }} - {{ row.end_line }}</template>
              </el-table-column>
              <el-table-column prop="description" label="AI分析摘要" show-overflow-tooltip />
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="directoryDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
// import { ElMessage, ElMessageBox } from 'element-plus'
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import * as d3 from 'd3'
import { Document, Folder, InfoFilled } from '@element-plus/icons-vue'
import {
  getModuleGraphs,
  updateModuleGraphs,
  deleteModuleGraphs,
  checkIndexApi,
  listRepos,
  getModuleGraphTaskStatus,
  resetModuleGraphs
} from '../service/api'
import { useRouter } from 'vue-router'
import MarkdownIt from 'markdown-it'
import { onActivated } from 'vue'

export default {
  name: 'ModuleGraphs',
  components: {
    Document,
    Folder,
    InfoFilled
  },
  props: {
    repoPath: {
      type: String,
      required: false,
      default: ''
    }
  },
  setup(props) {
    const md = new MarkdownIt()
    const renderedDescription = ref('')
    const computedMarkdown = computed(() => {
      return md.render(renderedDescription.value)
    })
    // 节点阈值（支持滑块调整）
    const defaultNodeThreshold = 3000
    const nodeThreshold = ref(Number(localStorage.getItem('nodeThreshold')) || defaultNodeThreshold)
    // 滑块变更事件
    function onThresholdChange(val) {
      localStorage.setItem('nodeThreshold', val)
      // 仅在network tab下刷新
      if (activeTab.value === 'network') {
        refreshModuleGraphs()
      }
    }
    const maxNetworkNodes = ref(defaultNodeThreshold)
    const router = useRouter()
    router.beforeEach((to, from, next) => {
      console.log('beforeEach', to, from)
      loadPathSuggestions()
      next() // 跳转到下一个路由
    })
    const projectDir = ref(null)
    const activeTab = ref(localStorage.getItem('activeTab') || 'network')
    const loading = ref(false)
    const updating = ref(false)
    const graphData = ref({
      hierarchical: null,
      network: null,
      sunburst: null,
      flat: null
    })
    // 跟踪每个图表是否已渲染
    const graphsRendered = ref({
      hierarchical: false,
      network: false,
      sunburst: false,
      flat: false
    })
    const flatData = ref([])
    const pathSuggestions = ref([])
    const expandedKeys = ref([])
    const directoryDialogVisible = ref(false)
    const selectedDirectory = ref(null)
    const selectedDirectoryChildren = ref([])
    const selectedFunctions = ref([])
    const selectedModules = ref([])
    const taskCompleted = ref(0)
    const taskTotal = ref(0)

    // 定义 snackbar 状态
    const snackbar = ref({
      show: false,
      text: '',
      color: 'success',
      timeout: 3000
    })

    // 定义 dialog 状态
    const dialog = ref({
      show: false,
      title: '',
      message: '',
      confirmText: '确定',
      cancelText: '取消',
      resolvePromise: null,
      rejectPromise: null,
      type: 'info', // info, warning, error
      persistent: true
    })

    // 分析进度状态
    const analysisProgress = ref({
      show: false,
      status: '',
      percent: 0,
      total: 0,
      completed: 0,
      remaining: 0,
      taskId: '',
      stopLoading: false
    })

    // 显示消息的函数
    const showMessage = (text, type = 'success', timeout = 8000) => {
      snackbar.value.text = text
      snackbar.value.color = type
      snackbar.value.timeout = timeout
      snackbar.value.show = true
    }

    // 显示确认对话框的函数
    const showConfirmDialog = (message, title = '确认', options = {}) => {
      return new Promise((resolve, reject) => {
        dialog.value.title = title
        dialog.value.message = message
        dialog.value.confirmText = options.confirmButtonText || '确定'
        dialog.value.stopText = options.stopButtonText || '停止'
        dialog.value.cancelText = options.cancelButtonText || '取消'
        dialog.value.type = options.type || 'info'
        dialog.value.resolvePromise = resolve
        dialog.value.rejectPromise = reject
        dialog.value.show = true
      })
    }

    // 确认对话框
    const confirmDialog = () => {
      dialog.value.show = false
      if (dialog.value.resolvePromise) {
        dialog.value.resolvePromise(true)
      }
    }

    // 取消对话框
    const cancelDialog = () => {
      dialog.value.show = false
      if (dialog.value.rejectPromise) {
        dialog.value.rejectPromise(new Error('用户取消'))
      }
    }
    const stopDialog = async () => {
      dialog.value.show = false
      await resetModuleGraphs(projectDir.value)
      showMessage('已停止分析')
      if (dialog.value.rejectPromise) {
        dialog.value.rejectPromise(new Error('用户停止'))
      }
    }

    // 显示目录详情
    const showDirectoryDetail = async (nodeData) => {
      try {
        loading.value = true
        console.log('实时获取最新的模块和函数信息', nodeData)
        // 实时获取最新的模块和函数信息
        const nodePath = nodeData.path || ''
        const response = await checkIndexApi(projectDir.value, nodePath)

        if (response.data.code === 0) {
          const data = response.data.data
          // 合并原有数据和API返回的数据
          selectedDirectory.value = {
            ...nodeData,
            id: nodeData.path || nodeData.name || `node-${Date.now()}`,
            description: nodeData.description || '无描述',
            functionCount: data.total_function_count,
            fileCount: data.total_file_count,
            functions: data.functions,
            modules: data.modules
          }

          // 处理子节点
          if (nodeData.children && Array.isArray(nodeData.children)) {
            selectedDirectoryChildren.value = nodeData.children.map((child, index) => ({
              ...child,
              id: child.path || child.name || `${selectedDirectory.value.id}-child-${index}`
            }))
          } else {
            selectedDirectoryChildren.value = []
          }

          // 准备子节点数据用于展示
          selectedFunctions.value = []
          if (data.functions) {
            Object.keys(data.functions).forEach((filePath) => {
              data.functions[filePath].forEach((func) => {
                selectedFunctions.value.push({
                  ...func,
                  id: `${func.file}-${func.name}-${func.start_line}`,
                  filePath
                })
              })
            })
          }

          // 提取模块信息
          selectedModules.value = []
          if (data.modules) {
            Object.keys(data.modules).forEach((modulePath) => {
              data.modules[modulePath].forEach((module) => {
                selectedModules.value.push({
                  ...module,
                  id: `${module.path || module.name}-${Date.now()}`
                })
              })
            })
          }

          selectedDirectory.value.description =
            selectedModules.value.find((module) => module.path === nodePath)?.description ||
            '待分析'
          renderedDescription.value = selectedDirectory.value.description
          directoryDialogVisible.value = true
        } else {
          showMessage(`获取模块详情失败: ${response.data.message || '未知错误'}`)
          // 如果API调用失败，仍然显示基本信息
          selectedDirectory.value = {
            ...nodeData,
            id: nodeData.path || nodeData.name || `node-${Date.now()}`
          }
          if (nodeData.children && Array.isArray(nodeData.children)) {
            selectedDirectoryChildren.value = nodeData.children.map((child, index) => ({
              ...child,
              id: child.path || child.name || `${selectedDirectory.value.id}-child-${index}`
            }))
          } else {
            selectedDirectoryChildren.value = []
          }
          selectedFunctions.value = []
          selectedModules.value = []
          directoryDialogVisible.value = true
        }
      } catch (error) {
        console.error('显示目录详情时出错:', error)
        showMessage(`显示目录详情时出错: ${error.message}`)
        // 出错时仍然显示基本信息
        selectedDirectory.value = {
          ...nodeData,
          id: nodeData.path || nodeData.name || `node-${Date.now()}`
        }
        if (nodeData.children && Array.isArray(nodeData.children)) {
          selectedDirectoryChildren.value = nodeData.children.map((child, index) => ({
            ...child,
            id: child.path || child.name || `${selectedDirectory.value.id}-child-${index}`
          }))
        } else {
          selectedDirectoryChildren.value = []
        }
        selectedFunctions.value = []
        selectedModules.value = []
        directoryDialogVisible.value = true
      } finally {
        loading.value = false
      }
    }

    // 加载路径建议
    const loadPathSuggestions = async () => {
      try {
        const response = await listRepos()
        if (!response.data || !Array.isArray(response.data)) {
          return
        }
        // 按id降序排序
        const sortedData = [...response.data].sort((a, b) => b.id - a.id)

        pathSuggestions.value = sortedData.map((repo) => ({
          value: repo.local_path,
          // 如果desc为空则只显示name，否则显示desc(name)
          title: repo.desc ? `${omit(repo.desc, 40)}(${repo.name})` : repo.name,
          repo_url: repo.local_path,
          branch: repo.branch,
          local_path: repo.local_path,
          username: repo.username,
          password: repo.password,
          name: repo.name,
          desc: repo.desc
        }))
      } catch (err) {
        console.error('获取仓库数据失败:', err)
      }
    }

    // 截断长文本
    const omit = (text, maxLength) => {
      if (!text) return ''
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
    }

    // 查询路径建议
    const queryPathSuggestions = (items, query) => {
      if (!query) return items
      const lowerCaseQuery = query.toLowerCase()
      return items.filter(
        (item) =>
          item.value.toLowerCase().includes(lowerCaseQuery) ||
          item.title.toLowerCase().includes(lowerCaseQuery)
      )
    }

    // 处理路径选择
    const handlePathSelect = (item) => {
      if (item && item.value) {
        projectDir.value = item.value
      }
    }

    // 获取模块描述信息
    const fetchModuleDescription = async (nodePath) => {
      if (!projectDir.value) return null

      try {
        const response = await checkIndexApi(projectDir.value, nodePath)
        if (response.data.code === 0) {
          const data = response.data.data

          let description =
            selectedModules.value.find((module) => module.path === nodePath)?.description ||
            '待分析'

          renderedDescription.value = description
          return {
            description,
            functionCount: data.total_function_count,
            fileCount: data.total_file_count,
            functions: data.functions,
            modules: data.modules
          }
        }
      } catch (error) {
        console.error(`获取模块 ${nodePath} 描述信息出错:`, error)
      }
      return null
    }

    // 递归为节点添加描述信息
    const enrichNodesWithDescription = async (node) => {
      if (!node) return

      // 获取当前节点的描述信息
      if (node.path !== undefined) {
        const descInfo = await fetchModuleDescription(node.path)
        if (descInfo) {
          node.description = descInfo.description
          node.functionCount = descInfo.functionCount
          node.fileCount = descInfo.fileCount
        }
      }

      // 递归处理子节点
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          await enrichNodesWithDescription(child)
        }
      }
    }

    // 获取模块图谱数据
    const fetchModuleGraphs = async () => {
      if (!projectDir.value) {
        showMessage('请先选择项目目录')
        return
      }

      loading.value = true
      try {
        const updateResponse = await updateModuleGraphs(projectDir.value, true)
        if (updateResponse.data.code !== 0) {
          showMessage(updateResponse.data.message)
          return
        }
        // 冷却1秒
        await new Promise((resolve) => setTimeout(resolve, 1000))
        const response = await getModuleGraphs(projectDir.value)
        if (response.data.code === 0) {
          graphData.value = response.data.data
          console.log('获取模块图谱数据成功:', graphData.value)

          // 处理扁平列表数据
          if (activeTab.value === 'flat') {
            console.log('处理扁平列表数据')
            if (graphData.value.flat) {
              processFlatData()
            }
          }

          // 重置渲染状态
          Object.keys(graphsRendered.value).forEach((key) => {
            graphsRendered.value[key] = false
          })

          // 根据当前激活的标签页渲染对应图表
          renderActiveGraph()

          showMessage('模块图谱数据获取成功')
        } else {
          showMessage(response.data?.message || '获取模块图谱失败')
        }
      } catch (error) {
        showMessage('操作较为频繁，请再点击重试～')
      } finally {
        loading.value = false
      }
    }

    const refreshModuleGraphs = async () => {
      if (!projectDir.value) {
        showMessage('请先选择项目目录')
        return
      }
      const response = await getModuleGraphs(projectDir.value)
      if (response.data.code === 0) {
        graphData.value = response.data.data
        console.log('刷新模块图谱数据:', graphData.value)
        // 处理扁平列表数据
        if (activeTab.value === 'flat') {
          console.log('处理扁平列表数据')
          if (graphData.value.flat) {
            processFlatData()
          }
        }

        // 重置渲染状态
        Object.keys(graphsRendered.value).forEach((key) => {
          graphsRendered.value[key] = false
        })

        // 根据当前激活的标签页渲染对应图表
        renderActiveGraph()
      } else if (response.data.code === 3) {
        const res = await confirm(`项目${projectDir.value}模块图谱暂未初始化，是否进行初始化？`)
        if (!res) return
        loading.value = true
        const updateResponse = await updateModuleGraphs(projectDir.value, true)
        if (updateResponse.data.code !== 0) {
          showMessage(updateResponse.data.message)
          return
        }
        // 冷却1秒
        await new Promise((resolve) => setTimeout(resolve, 1000))
        loading.value = false
        refreshModuleGraphs()
      }
    }
    // 生成AI模块分析
    const updateModule = async () => {
      if (!projectDir.value) {
        showMessage('请先选择项目目录')
        return
      }
      try {
        updating.value = true
        const { indexing, hasDb } = await window.electron.checkMemoryFlashStatus(projectDir.value)
        const statusResp = await getModuleGraphTaskStatus('', projectDir.value)
        console.log('正在进行生成AI模块分析', statusResp)
        if (statusResp.data.code === 0 && statusResp.data.data.status === 'running') {
          const taskInfo = statusResp.data.data
          taskCompleted.value = taskInfo.completed
          taskTotal.value = taskInfo.total
          try {
            await showConfirmDialog(
              `项目${projectDir.value}正在进行AI模块分析，当前进度: ${taskCompleted.value}/${taskTotal.value}。是否强制重新分析？`,
              '任务进行中',
              {
                confirmButtonText: '强制重新分析',
                stopButtonText: '停止',
                cancelButtonText: '取消',
                type: 'info'
              }
            )
          } catch (error) {
            console.error('用户点击了取消', error)
            updating.value = false
            return
          }
          // resetIndex后冷却5秒
          await resetModuleGraphs(projectDir.value)
          await new Promise((resolve) => setTimeout(resolve, 5000))
        } else {
          // 二次确认
          const res = await confirm(
            `确定准备为项目${projectDir.value}生成AI模块分析吗？可能需要一些时间`
          )
          if (!res) return
        }
        if (hasDb && !indexing) {
          console.log('已构建索引，但是索引不完整')
        } else if (indexing) {
          console.log('正在构建索引')
          // 二次确认并跳转到构建索引页面
          try {
            const res = await confirm(
              `项目${projectDir.value}正在构建索引，需要等待索引构建完成后才能生成AI模块分析，是否跳转到构建索引页面查看索引构建状态？`
            )
            if (res) {
              router.push('/scan')
            }
          } catch (error) {
            // 用户点击了取消，不执行任何操作
          }
          updating.value = false
          return
        }

        const response = await updateModuleGraphs(projectDir.value)
        if (response.data && response.data.code === 0) {
          showMessage(`项目${projectDir.value}AI模块分析任务已启动`)
          startAnalysisMonitoring()
        } else {
          showMessage(response.data?.message || `项目${projectDir.value}AI模块分析失败`)
        }
      } catch (error) {
        showMessage(`项目${projectDir.value}AI模块分析失败: ` + error.message)
      } finally {
        updating.value = false
      }
    }

    const deleteModule = async () => {
      if (!projectDir.value) {
        showMessage('请先选择项目目录')
        return
      }
      try {
        // 二次确认
        const res = await confirm(`确定要清除项目${projectDir.value}的所有AI模块分析记录吗？`)
        if (!res) return
        updating.value = true
        await resetModuleGraphs(projectDir.value)
        const response = await deleteModuleGraphs(projectDir.value)
        if (response.data && response.data.code === 0) {
          showMessage(`项目${projectDir.value}AI模块分析记录删除成功`)
          // 冷却1秒
          await new Promise((resolve) => setTimeout(resolve, 1000))
          fetchModuleGraphs()
        } else {
          showMessage(response.data?.message || `项目${projectDir.value}AI模块分析记录删除失败`)
        }
      } catch (error) {
        showMessage(`项目${projectDir.value}AI模块分析记录删除失败: ` + error.message)
      } finally {
        updating.value = false
      }
    }

    const jumpToScan = () => {
      // 二次确认
      const res = confirm(`确定要跳转到构建索引页面吗？`)
      if (!res) return
      router.push('/scan')
    }

    // 处理扁平列表数据，转换为树形结构
    const processFlatData = () => {
      if (!graphData.value.flat || !Array.isArray(graphData.value.flat)) {
        flatData.value = []
        return
      }

      // 处理树形数据

      // 创建一个映射表，用于快速查找节点
      const nodeMap = {}

      // 首先创建所有节点的映射
      graphData.value.flat.forEach((item) => {
        if (item.id) {
          nodeMap[item.id] = {
            id: item.id,
            name: item.name || '',
            path: item.path || '',
            type: item.type || '未知',
            size: item.size || 0,
            depth: item.depth || 0,
            parent: item.parent || null,
            children: [],
            childrenCount: Array.isArray(item.children) ? item.children.length : 0,
            hasChildren: Array.isArray(item.children) && item.children.length > 0,
            hasDesc: item.hasDesc || false,
            hasIndex: item.hasIndex || false
          }
        }
      })

      // 构建树形结构
      const rootNodes = []

      // 将节点添加到其父节点的children数组中
      Object.values(nodeMap).forEach((node) => {
        if (node.parent && nodeMap[node.parent]) {
          // 如果有父节点，添加到父节点的children中
          nodeMap[node.parent].children.push(node)
        } else if (node.depth === 0 || node.depth === 1) {
          // 如果是根节点或顶层节点，添加到根节点列表
          rootNodes.push(node)
        }
      })

      // 处理children数组中的项
      graphData.value.flat.forEach((item) => {
        if (item.id && item.children && Array.isArray(item.children)) {
          item.children.forEach((childId) => {
            // 如果childId是字符串且在nodeMap中存在，将其添加到当前节点的children中
            if (
              typeof childId === 'string' &&
              nodeMap[childId] &&
              !nodeMap[item.id].children.includes(nodeMap[childId])
            ) {
              nodeMap[item.id].children.push(nodeMap[childId])
            }
          })
        }
      })

      // 按照深度和名称排序
      const sortNodes = (nodes) => {
        return nodes.sort((a, b) => {
          // 先按类型排序（目录在前，文件在后）
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1
          }
          // 再按名称排序
          return a.name.localeCompare(b.name)
        })
      }

      // 递归排序所有节点
      const sortAllNodes = (nodes) => {
        sortNodes(nodes)
        nodes.forEach((node) => {
          if (node.children && node.children.length > 0) {
            sortAllNodes(node.children)
          }
        })
        return nodes
      }

      // 排序并设置结果
      flatData.value = sortAllNodes(rootNodes)

      // 保持目录树的展开状态，不重置 expandedKeys
      // expandedKeys.value = []
    }

    // 处理树节点展开事件
    const handleNodeExpand = (data) => {
      if (!expandedKeys.value.includes(data.id)) {
        expandedKeys.value.push(data.id)
      }
    }

    // 处理树节点折叠事件
    const handleNodeCollapse = (data) => {
      const index = expandedKeys.value.indexOf(data.id)
      if (index !== -1) {
        expandedKeys.value.splice(index, 1)
      }
    }

    // 显示目录详情弹窗
    const showDirectoryDetails = async (row) => {
      console.log('showDirectoryDetails', row)

      try {
        // 实时获取最新的模块和函数信息
        const nodePath = row.path === projectDir.value ? '' : row.path
        const response = await checkIndexApi(projectDir.value, nodePath)

        if (response.data.code === 0) {
          const data = response.data.data
          // 合并原有数据和API返回的数据
          selectedDirectory.value = {
            ...row,
            id: row.path || row.name || `node-${Date.now()}`,
            functionCount: data.total_function_count,
            fileCount: data.total_file_count,
            functions: data.functions,
            modules: data.modules
          }

          // 处理子节点
          if (row.children && Array.isArray(row.children)) {
            selectedDirectoryChildren.value = row.children.map((child, index) => ({
              ...child,
              id: child.path || child.name || `${selectedDirectory.value.id}-child-${index}`
            }))
          } else {
            selectedDirectoryChildren.value = []
          }

          // 准备函数数据
          selectedFunctions.value = []
          if (data.functions) {
            Object.keys(data.functions).forEach((filePath) => {
              data.functions[filePath].forEach((func) => {
                selectedFunctions.value.push({
                  ...func,
                  id: `${func.file}-${func.name}-${func.start_line}`,
                  filePath
                })
              })
            })
          }

          // 准备模块信息
          selectedModules.value = []
          if (data.modules) {
            Object.keys(data.modules).forEach((modulePath) => {
              data.modules[modulePath].forEach((module) => {
                selectedModules.value.push({
                  ...module,
                  id: `${module.path || module.name}-${Date.now()}`
                })
              })
            })
          }
          selectedDirectory.value.description =
            selectedModules.value.find((module) => {
              console.log('module.path', module.path)
              console.log('nodePath', nodePath)
              return module.path === nodePath
            })?.description || '待分析'
          renderedDescription.value = selectedDirectory.value.description
          console.log('selectedDirectory.value', selectedDirectory.value)
          console.log('selectedDirectoryChildren.value', selectedDirectoryChildren.value)
          console.log('selectedFunctions.value', selectedFunctions.value)
          console.log('selectedModules.value', selectedModules.value)
        } else {
          showMessage(`获取模块详情失败: ${response.data.message || '未知错误'}`)
          // 如果API调用失败，仍然显示基本信息
          selectedDirectory.value = {
            ...row,
            id: row.path || row.name || `node-${Date.now()}`
          }
          selectedDirectoryChildren.value = row.children || []
          selectedFunctions.value = []
          selectedModules.value = []
        }
      } catch (error) {
        console.error('显示目录详情时出错:', error)
        showMessage(`显示目录详情时出错: ${error.message}`)
        // 出错时仍然显示基本信息
        selectedDirectory.value = {
          ...row,
          id: row.path || row.name || `node-${Date.now()}`
        }
        selectedDirectoryChildren.value = row.children || []
        selectedFunctions.value = []
        selectedModules.value = []
      } finally {
        // 显示弹窗
        directoryDialogVisible.value = true
      }
    }

    // 让层级树可拖拽缩放，并按节点尺寸动态计算画布大小
    const renderHierarchicalTree = () => {
      if (!graphData.value?.hierarchical) return

      // 1. 基础准备
      const container = d3.select('#hierarchical-graph')
      container.selectAll('*').remove()

      const viewW = container.node().getBoundingClientRect().width
      const viewH = container.node().getBoundingClientRect().height
      const PADDING_X = 50,
        PADDING_Y = 20 // 初始边距
      const NODE_V = 40 // 垂直间距
      const NODE_H_BASE = 100 // 基础水平间距

      // 2. 生成层级数据并根据最长文本动态调整水平间距
      const root = d3.hierarchy(graphData.value.hierarchical).sum((d) => d.size || 0)

      const longestLabel = d3.max(root.descendants(), (d) => d.data.name.length) || 0
      const NODE_H = NODE_H_BASE + longestLabel * 6 // 6≈每字符平均宽

      // 3. 用 nodeSize 而不是 size，让内部"画布"无限制延展
      const treeLayout = d3.tree().nodeSize([NODE_V, NODE_H])
      treeLayout(root)

      // 4. 计算整棵树实际宽高，用于 zoom 的 translateExtent
      const xExtent = d3.extent(root.descendants(), (d) => d.x)
      const yExtent = d3.extent(root.descendants(), (d) => d.y)
      const graphW = yExtent[1] - yExtent[0] + NODE_H * 2
      const graphH = xExtent[1] - xExtent[0] + NODE_V * 2
      // 5. 创建 SVG，并挂载 d3.zoom 处理拖拽与滚轮缩放
      const svg = container.append('svg').attr('width', viewW).attr('height', viewH)

      // 计算根节点居中所需的平移量
      const centerX = viewW / 2
      const centerY = viewH / 2
      const rootX = root.x
      const rootY = root.y
      const offsetX = centerX - rootY
      const offsetY = centerY - rootX
      const g = svg.append('g').attr('transform', `translate(0,0)`)

      // 缩放处理函数，支持自动隐藏文本
      const handleZoom = (event) => {
        const { transform } = event
        g.attr('transform', transform)

        const k = transform.k
        g.selectAll('circle')
          .attr('r', (d) => (d.data.type === 'directory' ? 14 : 10) / k)
          .attr('stroke-width', 3 / k)

        g.selectAll('text')
          .attr('x', (d) => (d.children ? -20 : 20) / k)
          .attr('y', (d) => (d.children ? -20 : 0) / k)
          .style('font-size', `${20 / k}px`)
          .style('display', k < 0.33 ? 'none' : null) // 缩放小于0.1时自动隐藏

        g.selectAll('.link').attr('stroke-width', 2 / k)
      }

      // 创建zoom行为
      const zoom = d3
        .zoom()
        .scaleExtent([0.001, 2])
        .translateExtent([
          [yExtent[0] - NODE_H, xExtent[0] - NODE_V],
          [yExtent[1] + NODE_H, xExtent[1] + NODE_V]
        ])
        .on('zoom', handleZoom)

      svg.call(zoom)
      // 设置初始transform（根节点居中）
      svg.call(zoom.transform, d3.zoomIdentity.translate(offsetX, offsetY))

      // 6. 画连线
      g.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr(
          'd',
          d3
            .linkHorizontal()
            .x((d) => d.y)
            .y((d) => d.x)
        )
        .attr('fill', 'none')
        .attr('stroke', '#888') // 颜色可略深
        .attr('stroke-width', 2) // 线条更粗

      // 7. 画节点
      const nodeGroups = g
        .selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', (d) => `translate(${d.y},${d.x})`)
        .on('mouseover', async (event, d) => handleMouseOver(event, d))
        .on('mouseout', handleMouseOut)
        .on('click', (event, d) => {
          console.log('点击层级节点', d)
          showDirectoryDetail(d.data)
        })

      nodeGroups
        .append('circle')
        .attr('r', (d) => (d.data.type === 'directory' ? 14 : 10)) // 圆圈更大
        .attr('fill', (d) => (d.data.type === 'directory' ? '#69b3a2' : '#3498db'))
        .attr('stroke', '#222') // 加粗描边
        .attr('stroke-width', 3)

      nodeGroups
        .append('text')
        .attr('dy', '0.36em')
        .attr('x', (d) => (d.children ? -20 : 20)) // 位置适当右移
        .attr('y', (d) => (d.children ? -20 : 0)) // 位置适当右移
        .attr('text-anchor', (d) => (d.children ? 'end' : 'start'))
        .text((d) => d.data.name)
        .style('font-size', '20px') // 字体更大
        .style('font-family', 'Arial')
        .style('font-weight', 'bold') // 加粗字体
        .style('fill', () =>
          window.matchMedia('(prefers-color-scheme: dark)').matches ? '#e6e6e6' : '#222'
        )

      // 8. 提示框（保持原来的逻辑）
      // 文本自动换行函数
      function wrapText(text, width) {
        if (!text) return ['']

        // 估算每个字符的平均宽度（以像素为单位）
        const avgCharWidth = 7 // 假设每个字符平均宽度为6像素（包括中文字符）
        const charsPerLine = Math.floor(width / avgCharWidth)

        // 如果文本小于行宽，直接返回
        if (text.length <= charsPerLine) return [text]

        // 分行处理
        const lines = []
        let currentLine = ''

        // 尝试在空格处分行
        const words = text.split(' ')

        for (const word of words) {
          // 如果当前行加上这个词还能放下
          if (currentLine.length + word.length + 1 <= charsPerLine) {
            currentLine += (currentLine ? ' ' : '') + word
          } else {
            // 如果这个词太长，需要单独分行处理
            if (currentLine) {
              lines.push(currentLine)
              currentLine = ''
            }

            // 如果单词超过一行长度，需要将其拆分
            if (word.length > charsPerLine) {
              let remainingWord = word
              while (remainingWord.length > 0) {
                const part = remainingWord.substring(0, charsPerLine)
                lines.push(part)
                remainingWord = remainingWord.substring(charsPerLine)
              }
            } else {
              currentLine = word
            }
          }
        }

        // 别忘了最后一行
        if (currentLine) {
          lines.push(currentLine)
        }

        return lines
      }

      async function handleMouseOver(event, d) {
        console.log('handleMouseOver', event, d)
        d3.select(this).style('opacity', 0.8)

        // 显示描述信息提示框
        // 基于指针在 SVG 中的坐标放置 tooltip，避免缩放导致位置错位
        const [pointerX, pointerY] = d3.pointer(event, svg.node())
        const tooltip = svg // 注意：将 tooltip 附加到 svg 而不是 g
          .append('g')
          .attr('class', 'tooltip')
          .attr('transform', `translate(${pointerX + 10},${pointerY + 10})`)

        // 定义固定宽度的提示框
        const tooltipWidth = 250 // 固定宽度

        // 创建背景矩形，稍后再调整高度
        const tooltipRect = tooltip
          .append('rect')
          .attr('x', 10)
          .attr('y', -50)
          .attr('width', tooltipWidth)
          .attr('height', 80) // 初始高度，后面会动态调整
          .attr('rx', 5)
          .attr('fill', 'rgba(0,0,0,0.7)')

        // 路径文本
        tooltip
          .append('text')
          .attr('class', 'tooltip-text')
          .attr('x', 20)
          .attr('y', -30)
          .attr('fill', 'white')
          .style('font-size', '10px')
          .text(d.data.path || projectDir.value)

        // 类型文本
        tooltip
          .append('text')
          .attr('class', 'tooltip-text')
          .attr('x', 20)
          .attr('y', -15)
          .attr('fill', 'white')
          .style('font-size', '10px')
          .text(d.data.type === 'directory' ? '目录' : `文件 (大小: ${d.data.size || 0})`)

        // 实时获取最新的模块和函数信息
        const nodePath = d.data.path || ''
        const response = await checkIndexApi(projectDir.value, nodePath)

        let description = ''
        let modulesList = []
        let functionsList = []

        if (response.data.code === 0) {
          const data = response.data.data

          // 处理模块信息，将对象转换为数组
          if (data.modules) {
            Object.keys(data.modules).forEach((modulePath) => {
              data.modules[modulePath].forEach((module) => {
                modulesList.push({
                  ...module,
                  id: `${module.path || module.name}-${Date.now()}`
                })
              })
            })
          }

          // 处理函数信息，将对象转换为数组
          if (data.functions) {
            Object.keys(data.functions).forEach((filePath) => {
              data.functions[filePath].forEach((func) => {
                functionsList.push({
                  ...func,
                  id: `${func.file}-${func.name}-${func.start_line}`,
                  filePath
                })
              })
            })
          }

          description =
            modulesList.find((module) => module.path === nodePath)?.description || '待分析'

          renderedDescription.value = description
        }

        // 创建外部容器用于描述文本
        const descContainer = tooltip.append('g').attr('class', 'desc-container')

        // 将描述文本分成多行
        const descriptionLines = wrapText(description, tooltipWidth - 100) // 留出左右边距

        // 添加每一行文本
        descriptionLines.forEach((line, i) => {
          descContainer
            .append('text')
            .attr('class', 'tooltip-text')
            .attr('x', 20)
            .attr('y', -5 + i * 15) // 每行间距15px
            .attr('fill', 'white')
            .style('font-size', '10px')
            .text(line)
        })

        // 显示函数和索引文件数量信息（如果有）
        if (modulesList.length > 0 || functionsList.length > 0) {
          // 计算应该放置的位置，在描述文本之后
          const yOffset = -5 + descriptionLines.length * 15 + 10 // 描述文本的高度 + 额外间距

          tooltip
            .append('text')
            .attr('class', 'tooltip-text')
            .attr('x', 20)
            .attr('y', yOffset)
            .attr('fill', 'white')
            .style('font-size', '10px')
            .text(`函数: ${functionsList.length || 0}, 文件: ${modulesList.length || 0}`)
        }

        // 动态计算和调整提示框高度
        setTimeout(() => {
          // 获取所有文本元素
          const textElements = tooltip.selectAll('.tooltip-text').nodes()
          let totalHeight = 0
          const padding = 40 // 添加一些填充空间

          // 计算最大高度
          textElements.forEach((textElement) => {
            const bbox = textElement.getBBox()
            // 计算元素的底部位置
            const bottom = parseFloat(d3.select(textElement).attr('y')) + bbox.height
            totalHeight = Math.max(totalHeight, bottom)
          })

          // 只调整背景矩形的高度，宽度保持固定
          tooltipRect.attr('height', totalHeight + padding)
        }, 0)
      }

      function handleMouseOut() {
        d3.select(this).style('opacity', 1)
        svg.selectAll('.tooltip').remove()
      }
    }

    // 渲染网络结构
    // 计算每个节点的深度（BFS）
    function computeNodeDepths(nodes, links, rootId) {
      const nodeMap = new Map(nodes.map((n) => [n.id, n]))
      nodes.forEach((n) => {
        n.depth = undefined
      })
      const queue = []
      if (!nodeMap.get(rootId)) return
      nodeMap.get(rootId).depth = 0
      queue.push(nodeMap.get(rootId))
      while (queue.length) {
        const node = queue.shift()
        links
          .filter((l) => {
            // 适配d3 forceLink的source/target为对象或id
            const srcId = typeof l.source === 'object' ? l.source.id : l.source
            return srcId === node.id
          })
          .forEach((l) => {
            const tgtId = typeof l.target === 'object' ? l.target.id : l.target
            const tgtNode = nodeMap.get(tgtId)
            if (tgtNode && tgtNode.depth === undefined) {
              tgtNode.depth = node.depth + 1
              queue.push(tgtNode)
            }
          })
      }
      // 未连接的节点depth设为0
      nodes.forEach((n) => {
        if (n.depth === undefined) n.depth = 0
      })
    }

    // 全局唯一的networkZoom实例
    let networkZoom = null
    const renderNetworkGraph = () => {
      if (!graphData.value.network) return
      // 若节点数超过100，需要自动裁剪叶子节点，直到满足最大限制为止
      const nodeCount = graphData.value.network.nodes.length
      maxNetworkNodes.value = nodeCount > defaultNodeThreshold ? defaultNodeThreshold : nodeCount
      if (nodeCount > nodeThreshold.value) {
        showMessage(
          `当前项目的网络图节点数量（${nodeCount}）超过可见节点范围（${nodeThreshold.value}），已自动裁剪边缘节点`
        )
        // 自动裁剪叶子节点，直到节点数≤100
        let nodes = graphData.value.network.nodes
        let links = graphData.value.network.links
        // 构建节点id集合
        const nodeIdSet = new Set(nodes.map((n) => n.id))
        // 副本用于裁剪
        nodes = [...nodes]
        links = [...links]
        // 反复裁剪直到节点数≤100或无可裁剪叶子
        // --- 优先裁剪叶子节点最多的子层 ---
        while (nodes.length > nodeThreshold.value) {
          // 统计所有有出边的节点id
          const sourceIds = new Set(
            links.map((l) => (typeof l.source === 'object' ? l.source.id : l.source))
          )
          // 叶子节点：没有出现在sourceIds中的节点
          const leafNodes = nodes.filter((n) => !sourceIds.has(n.id))
          if (!leafNodes.length) break // 没有叶子节点可裁剪

          // 统计每个叶子节点的层级（距离根节点最远的路径）
          // 1. 先找所有没有入边的节点作为根节点
          const targetIds = new Set(
            links.map((l) => (typeof l.target === 'object' ? l.target.id : l.target))
          )
          const rootNodes = nodes.filter((n) => !targetIds.has(n.id))
          // 2. 构建邻接表
          const childMap = new Map() // id -> [childId]
          for (const l of links) {
            const sid = typeof l.source === 'object' ? l.source.id : l.source
            const tid = typeof l.target === 'object' ? l.target.id : l.target
            if (!childMap.has(sid)) childMap.set(sid, [])
            childMap.get(sid).push(tid)
          }
          // 3. 计算每个节点的层级（BFS）
          const levelMap = new Map() // id -> level
          const queue = []
          for (const root of rootNodes) {
            levelMap.set(root.id, 0)
            queue.push({ id: root.id, level: 0 })
          }
          while (queue.length) {
            const { id, level } = queue.shift()
            const children = childMap.get(id) || []
            for (const cid of children) {
              if (!levelMap.has(cid)) {
                levelMap.set(cid, level + 1)
                queue.push({ id: cid, level: level + 1 })
              }
            }
          }
          // 4. 找出叶子节点中层级最大的层数
          let maxLevel = -1
          for (const n of leafNodes) {
            const lv = levelMap.get(n.id) ?? 0
            if (lv > maxLevel) maxLevel = lv
          }
          // 5. 优先裁剪最大层的叶子节点
          const maxLevelLeafNodes = leafNodes.filter((n) => (levelMap.get(n.id) ?? 0) === maxLevel)
          const toRemoveCount = Math.min(
            nodes.length - nodeThreshold.value,
            maxLevelLeafNodes.length
          )
          const toRemoveIds = new Set(maxLevelLeafNodes.slice(0, toRemoveCount).map((n) => n.id))
          // 移除nodes
          nodes = nodes.filter((n) => !toRemoveIds.has(n.id))
          // 移除与这些节点相关的边
          links = links.filter((l) => {
            const sid = typeof l.source === 'object' ? l.source.id : l.source
            const tid = typeof l.target === 'object' ? l.target.id : l.target
            return !toRemoveIds.has(sid) && !toRemoveIds.has(tid)
          })
        }
        // --- END ---
        // 用裁剪后的副本替换原数据
        graphData.value.network.nodes = nodes
        graphData.value.network.links = links
      }

      // 检查数据是否存在且格式正确
      if (
        !graphData.value.network.nodes ||
        !Array.isArray(graphData.value.network.nodes) ||
        graphData.value.network.nodes.length === 0 ||
        !graphData.value.network.links ||
        !Array.isArray(graphData.value.network.links)
      ) {
        showMessage('网络结构数据格式不正确或为空')
        return
      }

      try {
        const container = d3.select('#network-graph')
        container.selectAll('*').remove()

        const width = container.node().getBoundingClientRect().width
        const height = container.node().getBoundingClientRect().height

        const svg = container.append('svg').attr('width', width).attr('height', height)

        // 创建一个g元素用于承载所有图形，并应用缩放
        const g = svg.append('g')

        // 创建节点提示气泡
        let tooltip = container.select('.network-tooltip')
        if (tooltip.empty()) {
          tooltip = container
            .append('div')
            .attr('class', 'network-tooltip')
            .style('position', 'absolute')
            .style('pointer-events', 'none')
            .style('background', 'rgba(45, 45, 55, 0.96)')
            .style('color', '#fff')
            .style('padding', '12px 16px')
            .style('border-radius', '8px')
            .style('font-size', '14px')
            .style('box-shadow', '0 4px 16px rgba(0,0,0,0.25)')
            .style('z-index', 10)
            .style('display', 'none')
            .style('backdrop-filter', 'blur(4px)')
            .style('border', '1px solid rgba(255,255,255,0.1)')
            .style('transition', 'opacity 0.2s ease-in-out')
        }

        try {
          const treeLinks = graphData.value.network.links
          const nodes = graphData.value.network.nodes.map((d) => ({ ...d }))

          // === 1. 计算每个节点的深度及比例 ===
          const rootId = nodes[0]?.id // 默认第一个为根节点
          computeNodeDepths(nodes, treeLinks, rootId)
          const maxDepth = Math.max(...nodes.map((n) => n.depth))
          nodes.forEach((n) => {
            n.depthRatio = maxDepth > 0 ? n.depth / maxDepth : 0
          })

          // 创建力导向模拟
          const simulation = d3
            .forceSimulation(nodes)
            .force(
              'link',
              d3
                .forceLink(treeLinks)
                .id((d) => d.id)
                .distance((d) => {
                  // 取 source 和 target 的较小 depthRatio，越靠近根节点越大距离
                  const minDist = 40,
                    maxDist = 100
                  const depthRatio = Math.min(d.source.depthRatio, d.target.depthRatio)
                  return minDist + (maxDist - minDist) * (1 - depthRatio)
                })
            )
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius((d) => {
              // 碰撞半径与节点实际大小匹配
              const minR = 8, maxR = 32
              return (minR + (maxR - minR) * (1 - d.depthRatio)) + 2 // 加2px缓冲
            }).strength(0.8))

          // 添加连线
          const link = g // 将连线添加到g元素
            .append('g')
            .attr('stroke', '#999')
            .attr('stroke-opacity', 0.8)
            .selectAll('line')
            .data(treeLinks)
            .join('line')
            .attr('stroke-width', (d) => Math.sqrt(d.value || 2) * 4.8)

          // 添加节点
          const node = g // 将节点添加到g元素
            .append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(nodes)
            .enter()
            .append('g')
            .attr('class', 'node-group')
            .style('cursor', 'pointer')

          // 添加节点圆形
          // === 2. 节点圆形动态大小和颜色 ===
          const minR = 8,
            maxR = 32
          node
            .append('circle')
            .attr('r', (d) => minR + (maxR - minR) * (1 - d.depthRatio))
            .attr('fill', (d) =>
              d.type === 'directory'
                ? d3.interpolateBlues(1 - d.depthRatio)
                : d3.interpolateGreens(1 - d.depthRatio)
            )
            .attr('stroke', '#222')
            .attr('stroke-width', 2)
            .attr('class', 'node-circle')
            .style('transition', 'all 0.2s ease-in-out')

          // 添加节点文本标签
          node
            .append('text')
            .text((d) => d.name)
            .attr('dy', 40)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('fill', () =>
              window.matchMedia('(prefers-color-scheme: dark)').matches ? '#e6e6e6' : '#222'
            )
            .style('pointer-events', 'none')

          simulation.on('tick', () => {
            link
              .attr('x1', (d) => d.source.x)
              .attr('y1', (d) => d.source.y)
              .attr('x2', (d) => d.target.x)
              .attr('y2', (d) => d.target.y)

            node.attr('transform', (d) => `translate(${d.x},${d.y})`)
          })

          // 添加交互
          node
            .on('mouseover', async function (event, d) {
              // 高亮节点
              d3.select(this)
                .select('circle')
                .transition()
                .duration(200)
                .attr('stroke', '#409eff')
                .attr('stroke-width', 3)
                .style('filter', 'drop-shadow(0 0 8px rgba(64, 158, 255, 0.5))')

              // 显示提示气泡
              try {
                // 实时获取最新的模块和函数信息
                const nodePath =  d.id === projectDir.value ? '' : d.id
                const response = await checkIndexApi(projectDir.value, nodePath)

                let description = ''
                let functionCount = 0
                let fileCount = 0

                if (response.data.code === 0) {
                  const data = response.data.data

                  // 处理模块信息
                  let modulesList = []
                  if (data.modules) {
                    Object.keys(data.modules).forEach((modulePath) => {
                      data.modules[modulePath].forEach((module) => {
                        modulesList.push({
                          ...module,
                          id: `${module.path || module.name}-${Date.now()}`
                        })
                      })
                    })
                  }

                  // 处理函数信息
                  let functionsList = []
                  if (data.functions) {
                    Object.keys(data.functions).forEach((filePath) => {
                      data.functions[filePath].forEach((func) => {
                        functionsList.push({
                          ...func,
                          id: `${func.file}-${func.name}-${func.start_line}`,
                          filePath
                        })
                      })
                    })
                  }

                  description =
                    modulesList.find((module) => module.path === nodePath)?.description || ''
                  functionCount = data.total_function_count || 0
                  fileCount = data.total_file_count || 0
                }

                // 构建提示内容
                const tooltipContent = `
                  <div class="tooltip-header">
                    <div class="tooltip-title">${d.name || projectDir.value}</div>
                    <div class="tooltip-type">${d.type === 'directory' ? '目录' : '文件'}</div>
                  </div>
                  <div class="tooltip-path">${d.path || ''}</div>
                  ${description ? `<div class="tooltip-desc">${description}</div>` : ''}
                  <div class="tooltip-stats">
                    <div class="tooltip-stat">函数数量: ${functionCount}</div>
                    <div class="tooltip-stat">文件数量: ${fileCount}</div>
                    ${d.size ? `<div class="tooltip-stat">大小: ${d.size}</div>` : ''}
                  </div>
                  <div class="tooltip-hint">点击查看详情</div>
                `

                // 显示提示气泡
                tooltip
                  .html(tooltipContent)
                  .style('left', event.offsetX + 20 + 'px')
                  .style('top', event.offsetY - 20 + 'px')
                  .style('display', 'block')
                  .style('opacity', 0)
                  .transition()
                  .duration(200)
                  .style('opacity', 1)
              } catch (error) {
                console.error('获取节点信息失败:', error)
              }
            })
            .on('mousemove', function (event) {
              // 更新提示气泡位置
              tooltip
                .style('left', event.offsetX + 20 + 'px')
                .style('top', event.offsetY - 20 + 'px')
            })
            .on('mouseout', function () {
              // 取消高亮
              d3.select(this)
                .select('circle')
                .transition()
                .duration(200)
                .attr('stroke', '#222')
                .attr('stroke-width', 2)
                .style('filter', 'none')

              // 隐藏提示气泡
              tooltip
                .transition()
                .duration(200)
                .style('opacity', 0)
                .on('end', function () {
                  tooltip.style('display', 'none')
                })
            })
            .on('click', function (event, d) {
              // 点击节点显示详情弹窗
              d.path = d.id
              console.log('点击网络节点', d)
              showDirectoryDetails(d)
            })

          // 添加拖拽功能
          node.call(
            d3
              .drag()
              .on('start', (event, d) => {
                if (!event.active) simulation.alphaTarget(0.3).restart()
                d.fx = d.x
                d.fy = d.y
              })
              .on('drag', (event, d) => {
                d.fx = event.x
                d.fy = event.y
              })
              .on('end', (event, d) => {
                if (!event.active) simulation.alphaTarget(0)
                d.fx = null
                d.fy = null
              })
          )

          // 每次渲染都新建 zoom 实例并绑定当前svg
          networkZoom = d3.zoom().on('zoom', (event) => {
            g.attr('transform', event.transform)
          })
          svg.call(networkZoom)
          window.networkZoom = networkZoom // 让jumpToNode能访问当前实例
        } catch (innerError) {
          console.error('渲染网络结构时出错:', innerError)
          showMessage(`渲染网络结构时出错: ${innerError.message}`)
          // 在SVG中显示错误信息
          svg
            .append('text')
            .attr('x', width / 2)
            .attr('y', height / 2)
            .attr('text-anchor', 'middle')
            .style('fill', 'red')
            .text('数据格式错误，无法渲染图表')
        }
      } catch (error) {
        console.error('创建图表容器时出错:', error)
      }
    }
    // 渲染旭日图
    const renderSunburstChart = () => {
      if (!graphData.value.sunburst) return

      // 检查数据是否存在且格式正确
      if (!graphData.value.sunburst || typeof graphData.value.sunburst !== 'object') {
        showMessage('旭日图数据格式不正确或为空')
        return
      }

      try {
        const container = d3.select('#sunburst-graph')
        container.selectAll('*').remove()

        const width = container.node().getBoundingClientRect().width
        const height = container.node().getBoundingClientRect().height
        const radius = Math.min(width, height) / 2

        // 添加SVG和g主组
        const svg = container.append('svg').attr('width', width).attr('height', height)
        const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`)

        // 支持缩放和平移
        const zoom = d3.zoom().on('zoom', (event) => {
          g.attr('transform', event.transform)
        })
        svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2))
        svg.call(zoom)

        // 悬浮气泡
        let tooltip = container.select('.sunburst-tooltip')
        if (tooltip.empty()) {
          tooltip = container
            .append('div')
            .attr('class', 'sunburst-tooltip')
            .style('position', 'absolute')
            .style('pointer-events', 'none')
            .style('background', 'rgba(45, 45, 55, 0.96)')
            .style('color', '#fff')
            .style('padding', '8px 14px')
            .style('border-radius', '6px')
            .style('font-size', '13px')
            .style('box-shadow', '0 2px 12px rgba(0,0,0,0.25)')
            .style('z-index', 10)
            .style('display', 'none')
        }

        try {
          // 创建分区布局
          const partition = d3.partition().size([2 * Math.PI, radius])

          // 生成层级数据
          const root = d3
            .hierarchy(graphData.value.sunburst)
            .sum((d) => d.size || 1)
            .sort((a, b) => (b.value || 0) - (a.value || 0))

          partition(root)

          // 生成同色系色带
          const baseColor = d3.interpolateCubehelixLong('#7C4DFF', '#81D4FA')
          function assignColor(node, parentColor = null, mainIndex = 0, mainCount = 1) {
            if (node.depth === 0) {
              node.color = '#DAD8FF'
            } else if (node.depth === 1) {
              node.color = baseColor(mainCount === 1 ? 0.5 : mainIndex / (mainCount - 1))
            } else if (node.parent) {
              node.color = d3
                .color(node.parent.color)
                .brighter(0.8 - node.depth * 0.18)
                .formatHex()
            }
            if (node.children) {
              node.children.forEach((c, i) => assignColor(c, node.color, i, node.children.length))
            }
          }
          if (root.children) {
            root.children.forEach((c, i) => assignColor(c, null, i, root.children.length))
          }
          root.color = '#DAD8FF'

          // 创建弧生成器
          const arc = d3
            .arc()
            .startAngle((d) => d.x0)
            .endAngle((d) => d.x1)
            .innerRadius((d) => d.y0)
            .outerRadius((d) => d.y1)

          // 绘制所有弧，包括根节点
          const allNodes = root.descendants()
          const paths = g
            .selectAll('path')
            .data(allNodes)
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', (d) => d.color)
            .attr('cursor', 'pointer')
            .style('stroke', '#fff')
            .style('stroke-width', (d) => (d.depth === 0 ? 1.5 : 0.5))

          // 交互
          paths
            .on('mouseover', function (event, d) {
              d3.select(this).style('opacity', 0.8)
              tooltip
                .html(
                  `<div><strong>${d.data.name || '(无名模块)'}</strong></div>` +
                    (typeof d.data.type !== 'undefined'
                      ? `<div>类型: ${d.data.type == 'file' ? '文件' : '目录'}</div>`
                      : '') +
                    (typeof d.data.path !== 'undefined' ? `<div>路径: ${d.data.path}</div>` : '')
                )
                .style('left', event.offsetX + 18 + 'px')
                .style('top', event.offsetY + 12 + 'px')
                .style('display', 'block')
            })
            .on('mousemove', function (event) {
              tooltip
                .style('left', event.offsetX + 18 + 'px')
                .style('top', event.offsetY + 12 + 'px')
            })
            .on('mouseout', function () {
              d3.select(this).style('opacity', 1)
              tooltip.style('display', 'none')
            })
            .on('click', function (event, d) {
              // 所有节点，包括根节点都可点击
              if (d.data) {
                showDirectoryDetail(d.data)
              }
            })

          // 在中心添加根节点标签，并支持交互
          const centerNode = allNodes[0]
          const centerGroup = g
            .append('g')
            .attr('class', 'sunburst-center-label')
            .style('cursor', 'pointer')
            .on('mouseover', function () {
              d3.select(this).select('text').attr('fill', '#3b43a1')
            })
            .on('mouseout', function () {
              d3.select(this).select('text').attr('fill', '#4C4F74')
            })
            .on('click', function () {
              showDirectoryDetail(centerNode.data)
            })

          centerGroup
            .append('circle')
            .attr('r', Math.max(40, Math.min(radius * 0.18, 72)))
            .attr('fill', '#F6F5FE')
            .attr('stroke', '#DAD8FF')
            .attr('stroke-width', 2)

          centerGroup
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', 18)
            .attr('font-weight', 700)
            .attr('fill', '#4C4F74')
            .text(centerNode.data.name || '根目录')
        } catch (innerError) {
          console.error('渲染旭日图时出错:', innerError)
          showMessage(`渲染旭日图时出错: ${innerError.message}`)
          g.append('text')
            .attr('x', 0)
            .attr('y', 0)
            .attr('text-anchor', 'middle')
            .style('fill', 'red')
            .text('数据格式错误，无法渲染图表')
        }
      } catch (error) {
        console.error('创建图表容器时出错:', error)
      }
    }

    // 根据当前激活的标签页渲染对应图表
    const renderActiveGraph = () => {
      if (!graphData.value[activeTab.value]) return

      // 清除当前容器内容以避免重叠渲染
      switch (activeTab.value) {
        case 'hierarchical':
          d3.select('#hierarchical-graph').selectAll('*').remove()
          renderHierarchicalTree()
          graphsRendered.value.hierarchical = true
          break
        case 'network':
          d3.select('#network-graph').selectAll('*').remove()
          renderNetworkGraph()
          graphsRendered.value.network = true
          break
        case 'sunburst':
          d3.select('#sunburst-graph').selectAll('*').remove()
          renderSunburstChart()
          graphsRendered.value.sunburst = true
          break
        case 'flat':
          // 扁平列表已通过 el-table 渲染
          graphsRendered.value.flat = true
          break
      }
    }

    // 监听标签页切换，渲染对应图表（防多点，避免重复渲染）
    watch(activeTab, (newTab, oldTab) => {
      if (newTab !== oldTab && graphData.value[newTab]) {
        localStorage.setItem('activeTab', newTab)
        refreshModuleGraphs()
        renderActiveGraph()
      }
    })

    onActivated(() => {
      const cachedDir = localStorage.getItem('projectDir')
      if (cachedDir) {
        projectDir.value = cachedDir
      }
      refreshModuleGraphs()
      renderActiveGraph()
    })

    // 组件挂载后初始化
    onMounted(async () => {
      loadPathSuggestions()
      // 优先使用props传入的repoPath，其次从缓存中获取项目目录
      if (props.repoPath) {
        console.log('从props中获取项目目录', props.repoPath)
        projectDir.value = props.repoPath
      } else {
        const cachedDir = localStorage.getItem('projectDir')
        if (cachedDir) {
          console.log('从缓存中获取项目目录', cachedDir)
          projectDir.value = cachedDir
        }
      }
    })

    watch(projectDir, (newDir, oldDir) => {
      if (newDir !== oldDir) {
        console.log('projectDir changed from', oldDir, 'to', newDir)
        localStorage.setItem('projectDir', newDir)
        refreshModuleGraphs()
        startAnalysisMonitoring()
      }
    })

    // 监听props中的repoPath变化
    // watch(
    //   () => props.repoPath,
    //   (newPath, oldPath) => {
    //     if (newPath && newPath !== oldPath && newPath !== projectDir.value) {
    //       console.log('props repoPath changed from', oldPath, 'to', newPath)
    //       projectDir.value = newPath
    //     }
    //   }
    // )

    // 监控分析状态
    let monitorTimer = null
    const startAnalysisMonitoring = async () => {
      if (!projectDir.value) return
      console.log('项目正在分析，开始监控分析状态')
      // 清除之前的定时器
      if (monitorTimer) {
        console.log('清除之前的定时器')
        clearInterval(monitorTimer)
      }
      // 立即检查一次
      await checkAnalysisStatus()

      // 设置定时检查（每5秒）
      monitorTimer = setInterval(async () => {
        await checkAnalysisStatus()
      }, 5000)
    }

    // 停止监控
    const stopAnalysisMonitoring = () => {
      if (monitorTimer) {
        analysisProgress.value.stopLoading = true
        console.log('停止监控分析状态')
        resetModuleGraphs(projectDir.value)
        //冷却1秒
        setTimeout(() => {
          clearInterval(monitorTimer)
          monitorTimer = null
          analysisProgress.value = {
            show: false,
            status: '',
            total: 0,
            completed: 0,
            remaining: 0,
            percent: 0,
            taskId: '',
            stopLoading: false
          }
          alert('分析已停止')
        }, 1000)
        analysisProgress.value.stopLoading = false
      }
    }

    // 检查分析状态
    const checkAnalysisStatus = async () => {
      if (!projectDir.value) return

      try {
        const response = await getModuleGraphTaskStatus('', projectDir.value)
        if (response.data && response.data.code === 0 && response.data.data) {
          const taskData = response.data.data
          console.log('任务数据', taskData)

          if (
            taskData.status === 'running' &&
            // taskData.id === analysisProgress.value.taskId &&
            taskData.completed !== analysisProgress.value.completed &&
            activeTab.value === 'flat'
          ) {
            console.log('任务正在运行，刷新数据', taskData)
            refreshModuleGraphs()
          }

          // 如果状态从running变为completed，弹出提示
          if (
            taskData.id === analysisProgress.value.taskId &&
            taskData.status === 'completed' &&
            analysisProgress.value.status === 'running'
          ) {
            // 使用electron原生alert
            if (window.electron && window.electron.showMessageBox) {
              window.electron.showMessageBox({
                type: 'info',
                title: '分析完成',
                message: `项目 ${projectDir.value} 的模块分析已完成！`,
                buttons: ['确定']
              })
            } else {
              // 降级使用浏览器alert
              alert(`项目 ${projectDir.value} 的模块分析已完成！`)
            }

            // 刷新数据
            refreshModuleGraphs()

            clearInterval(monitorTimer)

            // 5秒后隐藏进度条
            setTimeout(() => {
              analysisProgress.value.show = false
            }, 5000)
          }

          // 更新进度信息
          analysisProgress.value = {
            show: true,
            status: taskData.status,
            total: taskData.total || 0,
            completed: taskData.completed || 0,
            remaining: taskData.completed || 0,
            percent:
              taskData.total > 0 ? Math.round((taskData.completed / taskData.total) * 100) : 0,
            taskId: taskData.id
          }

          // 如果状态为failed，显示错误
          if (taskData.status === 'failed') {
            showMessage(
              `项目 ${projectDir.value} 的模块分析失败: ${taskData.error_message || '未知错误'}`,
              'error'
            )
            // 隐藏进度条
            analysisProgress.value.show = false
            clearInterval(monitorTimer)
          }

          // 如果不是running状态，5秒后隐藏进度条
          if (taskData.status !== 'running') {
            setTimeout(() => {
              analysisProgress.value.show = false
              clearInterval(monitorTimer)
            }, 5000)
          }
        } else {
          // 接口返回异常或无数据，隐藏进度条
          analysisProgress.value.show = false
          clearInterval(monitorTimer)
        }
      } catch (error) {
        console.error('检查分析状态出错:', error)
      }
    }

    // ================== 快速导航弹窗相关 ==================
    const navDialog = ref(false)
    const navQuery = ref('')
    const navResults = computed(() => {
      if (!navQuery.value) return []
      if (!graphData.value.network) return []
      const q = navQuery.value.trim().toLowerCase()
      const nodes = graphData.value.network.nodes.map((d) => ({ ...d }))
      return nodes.filter(
        (n) =>
          (n.id && n.id.toLowerCase().includes(q)) || (n.path && n.path.toLowerCase().includes(q))
      )
    })

    function openNavDialog() {
      navDialog.value = true
      navResults.value = []
      // 自动聚焦搜索框
      setTimeout(() => {
        if (navDialog.value) {
          const searchInput = document.querySelector('.nav-search-input')
          if (searchInput) searchInput.focus()
        }
      }, 100)
    }

    // 从路径中提取节点名称
    function getNodeName(path) {
      if (!path) return '未命名'
      // 从路径中提取最后一个部分作为名称
      const parts = path.split('/')
      return parts[parts.length - 1] || path
    }

    // 更新搜索结果
    function updateNavResults() {
      if (!navQuery.value.trim()) {
        navResults.value = []
        return
      }
      const query = navQuery.value.toLowerCase()
      // 从网络图数据中筛选匹配的节点
      if (graphData.value?.network?.nodes) {
        navResults.value = graphData.value.network.nodes
          .filter((node) => {
            const id = (node.id || '').toLowerCase()
            const name = (node.name || '').toLowerCase()
            const path = (node.path || '').toLowerCase()
            return (
              id.includes(query) ||
              name.includes(query) ||
              path.includes(query) ||
              query.includes(id) ||
              query.includes(name) ||
              query.includes(path)
            )
          })
          .slice(0, 20) // 限制结果数量
      }
    }
    function closeNavDialog() {
      navDialog.value = false
    }
    function handleNavSelect(node) {
      // closeNavDialog()
      console.log('handleNavSelect', node)
      jumpToNode(node)
    }
    // d3平滑跳转到节点并高亮（自动放大适量比例，不保留当前缩放）
    function jumpToNode(node) {
      if (!node) return
      const svg = d3.select('#network-graph svg')
      const g = svg.select('g')
      // 用filter直接获取目标节点
      const nodeSelection = g.selectAll('.node-group').filter((d) => d.id === node.id)
      if (nodeSelection.empty()) return
      const realNode = nodeSelection.datum()
      if (!realNode || realNode.x == null || realNode.y == null) return
      const width = +svg.attr('width')
      const height = +svg.attr('height')
      // 设定一个自动放大的目标缩放比例（如2倍，或根据画布/节点布局动态确定）
      let targetScale = 2
      // 也可根据实际情况动态推算最大合适的缩放（避免超出边界），这里只用固定值
      const targetX = width / 2 - realNode.x * targetScale
      const targetY = height / 2 - realNode.y * targetScale
      const targetTransform = d3.zoomIdentity.translate(targetX, targetY).scale(targetScale)
      if (window.networkZoom) {
        svg
          .transition()
          .duration(800)
          .call(window.networkZoom.transform, targetTransform)
          .on('end', () => {
            svg.call(window.networkZoom)
          })
      }
      // 只高亮目标节点
      g.selectAll('.node-circle').attr('stroke', '#222').attr('stroke-width', 2)
      nodeSelection.select('circle').attr('stroke', '#ff9800').attr('stroke-width', 5)
      setTimeout(() => {
        nodeSelection.select('circle').attr('stroke', '#222').attr('stroke-width', 2)
      }, 1200)
    }
    return {
      computedMarkdown,
      defaultNodeThreshold,
      maxNetworkNodes,
      snackbar,
      dialog,
      projectDir,
      activeTab,
      loading,
      updating,
      flatData,
      graphData,
      pathSuggestions,
      queryPathSuggestions,
      directoryDialogVisible,
      expandedKeys,
      selectedDirectory,
      nodeThreshold,
      onThresholdChange,
      getNodeName,
      updateNavResults,
      selectedDirectoryChildren,
      selectedModules,
      selectedFunctions,
      analysisProgress,
      fetchModuleGraphs,
      refreshModuleGraphs,
      updateModule,
      deleteModule,
      handlePathSelect,
      jumpToScan,
      handleNodeExpand,
      handleNodeCollapse,
      showDirectoryDetails,
      navDialog,
      navQuery,
      navResults,
      openNavDialog,
      closeNavDialog,
      handleNavSelect,
      jumpToNode,
      confirmDialog,
      cancelDialog,
      stopDialog,
      startAnalysisMonitoring,
      stopAnalysisMonitoring
    }
  }
}
</script>

<style scoped>
:deep(.el-descriptions__content) {
  white-space: pre-wrap;
  word-break: break-all;
}
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.header-section .left {
  display: flex;
  align-items: center;
}

/* 分析进度样式 */
.analysis-progress {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 200px;
}
.progress-bar {
  width: 100%;
  margin-bottom: 4px;
}
.progress-text {
  font-size: 12px;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
}
.loading-icon {
  animation: spin 1.5s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.module-graphs-container {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.project-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-input {
  flex: 1;
}

.graph-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.graph-container {
  height: 80vh;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background-color: #fff;
  overflow: hidden;
}

.graph-view {
  width: 100%;
  height: 100%;
}

.no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #909399;
}

.module-name {
  display: flex;
  align-items: center;
  gap: 5px;
}

.file-node {
  color: #606266;
}

.dir-node {
  color: #409eff;
  font-weight: 500;
  cursor: pointer;
}

.path-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.directory-details {
  padding: 10px;
}

.directory-path {
  font-weight: bold;
  margin-bottom: 15px;
}

.node-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.module-name {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.meta-tag {
  margin-right: 5px;
  white-space: nowrap;
}

.node-path {
  font-size: 12px;
  color: #909399;
  margin-top: 3px;
  margin-left: 24px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 90%;
}

.path-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  max-width: 100%;
}

.tree-container {
  padding: 10px;
  height: 100%;
  overflow: auto;
}

.el-tree-node__content {
  height: auto !important;
  min-height: 26px;
}

.node-info {
  margin-left: 10px;
  color: #606266;
}

.children-count,
.size-info {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}

.detail-tabs {
  margin-top: 20px;
}

.el-descriptions {
  margin-bottom: 15px;
}

.el-table {
  margin-top: 10px;
}

.el-descriptions__title {
  font-weight: bold;
  word-break: break-all;
}

@media (prefers-color-scheme: dark) {
  .no-data {
    background-color: #1b1b1b;
    color: #fff;
  }
  #hierarchical-graph,
  #network-graph,
  #sunburst-graph {
    background-color: #1b1b1b;
    color: #fff;
  }
  :deep(.el-scrollbar .el-scrollbar__bar .el-scrollbar__thumb) {
    background-color: #333;
    color: #fff;
  }

  :deep(.el-autocomplete-suggestion__wrap .el-scrollbar__wrap .el-scrollbar__wrap--hidden-default) {
    background-color: #333;
    color: #fff;
  }
  :deep(.graph-container) {
    background-color: #191919;
    color: #fff;
  }

  :deep(.el-tree) {
    --el-tree-node-hover-bg-color: rgba(255, 255, 255, 0.1);
    --el-tree-text-color: rgb(235, 235, 235);
    --el-tree-expand-icon-color: rgb(180, 180, 180);
    --el-fill-color-light: rgba(255, 255, 255, 0.1);
    --el-fill-color-blank: rgb(30, 30, 30);
    background-color: rgb(30, 30, 30);
    color: rgb(235, 235, 235);
    border-radius: 4px;
  }

  :deep(.el-tree-v2) {
    background-color: rgb(30, 30, 30);
    color: rgb(235, 235, 235);
  }

  :deep(.el-input__wrapper) {
    background-color: rgb(30, 30, 30);
    color: rgb(235, 235, 235);
  }

  :deep(.el-tree-node__content) {
    height: 28px;
    line-height: 28px;
  }

  :deep(.el-tree-node__content:hover) {
    background-color: rgba(255, 255, 255, 0.1) !important;
  }

  :deep(.el-tree-node.is-current > .el-tree-node__content) {
    background-color: rgba(64, 158, 255, 0.2) !important;
    color: #409eff !important;
  }

  :deep(.el-tree-node__expand-icon) {
    color: rgb(180, 180, 180) !important;
  }

  :deep(.el-tree-node__label) {
    font-size: 0.9rem;
    color: rgb(235, 235, 235) !important;
  }

  :deep(.el-tree__empty-block) {
    background: #1b1b1b;
  }

  :deep(.el-tree-node__content:hover) {
    background-color: rgba(255, 255, 255, 0.1) !important;
  }

  :deep(.dir-node) {
    color: #565656 !important;
    font-weight: 500 !important;
    cursor: pointer !important;
  }

  :deep(.el-tag) {
    color: #cdd4db !important;
    background-color: #1b1b1b !important;
    font-weight: 500 !important;
    cursor: pointer !important;
  }

  :deep(.el-button) {
    background-color: #1b1b1b !important;
    color: #cdd4db !important;
    font-weight: 500 !important;
    cursor: pointer !important;
    :deep(.el-icon) {
      color: #cdd4db !important;
    }
  }
  :deep(.llm-desc) {
    background: none !important;
    color: inherit !important;
  }
  :deep(.el-dialog) {
    background-color: #1b1b1b !important;
    color: #fff !important;
  }
  :deep(.el-dialog__title) {
    color: #fff !important;
  }
  :deep(.el-descriptions__title) {
    color: #fff !important;
  }
  :deep(.el-descriptions) {
    :deep(.el-descriptions__label) {
      color: #fff !important;
    }
    :deep(.el-descriptions__content) {
      color: #fff !important;
    }
    --el-descriptions-bg-color: #1b1b1b;
    --el-descriptions-title-color: #e5eaf3;
    --el-descriptions-label-color: #a3a6ad;
    --el-descriptions-content-color: #cfd3dc;
    --el-descriptions-border-color: #4f4f4f;
  }
  :deep(.el-descriptions__label) {
    background-color: #1b1b1b !important;
  }
  :deep(.el-descriptions__content) {
    background-color: #1b1b1b !important;
  }
  :deep(.el-table) {
    --el-table-border-color: #4f4f4f;
    --el-table-text-color: #cfd3dc;
    --el-table-header-text-color: #e5eaf3;
    --el-table-row-hover-bg-color: #2a2a2e;
    --el-table-current-row-bg-color: #4a4a4a;
    --el-table-header-bg-color: #2c2c2c;
    --el-table-bg-color: #1b1b1b;
    --el-table-tr-bg-color: #1b1b1b;
    --el-table-expanded-cell-bg-color: #1b1b1b;
    background-color: #1b1b1b;
  }
  :deep(.el-table__row--striped) {
    background-color: #222225 !important;
  }
  :deep(.el-table th.el-table__cell),
  :deep(.el-table tr) {
    color: #cfd3dc;
    background-color: #1b1b1b;
  }
  :deep(.el-table--enable-row-hover .el-table__body tr:hover > td.el-table__cell) {
    background-color: var(--el-table-row-hover-bg-color);
  }
  :deep(.el-table__empty-block) {
    background: #1b1b1b;
  }
  :deep(.el-tabs__item) {
    color: #a3a6ad;
  }
  :deep(.el-tabs__item:hover) {
    color: #79bbff;
  }
  :deep(.el-tabs__item.is-active) {
    color: #409eff;
  }
  :deep(.el-tabs__nav-wrap::after) {
    background-color: #4f4f4f;
  }
  :deep(.el-tabs__active-bar) {
    background-color: #409eff;
  }
  :deep(.el-tabs__content) {
    color: #cfd3dc;
  }
  :deep(.suggestion-item) {
    color: #cfd3dc;
    background-color: #1b1b1b;
  }
  :deep(.suggestion-title) {
    color: #cfd3dc;
    background-color: #1b1b1b;
  }
  :deep(.suggestion-path) {
    color: #cfd3dc;
    background-color: #1b1b1b;
  }
  :deep(.el-popper.is-light) {
    background-color: #1b1b1b;
    color: #cfd3dc;
  }
  :deep(.el-button) {
    background-color: #1b1b1b !important;
    color: #fff !important;
  }
}
:deep(.el-descriptions__label) {
  width: 120px !important;
  white-space: normal;
}

.llm-desc {
  background: rgba(64, 158, 255, 0.08);
  color: inherit;
}
.no-llm-desc {
  opacity: 0.5;
  filter: grayscale(0.5);
}

/* 快速导航按钮样式 */
.nav-search-btn {
  min-width: 80px;
  height: 40px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #191919;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 16px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.nav-search-btn i {
  font-size: 18px;
}

.nav-search-btn span {
  font-size: 14px;
  font-weight: 500;
}

.nav-search-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

/* 弹窗背景遮罩 */
.nav-dialog-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 100;
}

/* 弹窗侧边栏 */
.nav-dialog-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 33.333%;
  min-width: 320px;
  max-width: 450px;
  z-index: 101;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 弹窗卡片 */
.nav-dialog {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border-radius: 0;
  border-left: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: -5px 0 30px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 暗黑模式适配 */
@media (prefers-color-scheme: dark) {
  .nav-dialog {
    background: rgba(30, 30, 35, 0.85);
    border-left: 1px solid rgba(255, 255, 255, 0.1);
  }

  .nav-search-btn {
    color: #fff;
    background: rgba(60, 60, 70, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .nav-search-btn:hover {
    background: rgba(70, 70, 80, 0.5);
  }
}

/* 搜索框区域 */
.nav-search-header {
  display: flex;
  align-items: center;
  padding: 20px 20px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding-top: 50px;
}

/* 搜索输入框 */
.nav-search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 16px;
  padding: 10px 0;
  outline: none;
  color: inherit;
  font-weight: 500;
}

/* 关闭按钮 */
.nav-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  cursor: pointer;
  margin-left: 12px;
  color: inherit;
  opacity: 0.6;
  transition: all 0.2s;
}

.nav-close-btn:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.1);
}

/* 搜索结果容器 */
.nav-results-container {
  flex: 1;
  overflow-y: auto;
}

/* 搜索结果列表 */
.nav-results-list {
  padding: 8px 0;
}

/* 搜索结果项 */
.nav-result-item {
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.nav-result-item:hover {
  background: rgba(0, 0, 0, 0.05);
  border-left: 3px solid #1976d2;
}

/* 结果项名称 */
.nav-result-name {
  font-weight: 500;
  margin-bottom: 2px;
}

/* 结果项路径 */
.nav-result-path {
  font-size: 12px;
  opacity: 0.6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 无结果提示 */
.nav-no-results,
.nav-search-hint {
  padding: 24px 16px;
  text-align: center;
  color: rgba(0, 0, 0, 0.4);
  font-size: 14px;
}

@media (prefers-color-scheme: dark) {
  .nav-no-results,
  .nav-search-hint {
    color: rgba(255, 255, 255, 0.4);
  }
  .nav-result-item:hover {
    background: rgba(255, 255, 255, 0.05);
    border-left: 3px solid #64b5f6;
  }
  .nav-close-btn {
    background: rgba(255, 255, 255, 0.1);
  }
  .nav-close-btn:hover {
    background: rgba(255, 255, 255, 0.15);
  }
  .nav-search-header {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
}

/* 动画效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-right-enter-from,
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

:deep(.markdown-content),
:deep([v-html]) {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
  line-height: 1.6 !important;
  color: inherit !important;
}

:deep(.markdown-content) h1,
:deep(.markdown-content) h2,
:deep(.markdown-content) h3,
:deep(.markdown-content) h4,
:deep(.markdown-content) h5,
:deep(.markdown-content) h6,
:deep([v-html]) h1,
:deep([v-html]) h2,
:deep([v-html]) h3,
:deep([v-html]) h4,
:deep([v-html]) h5,
:deep([v-html]) h6 {
  margin-top: 24px !important;
  margin-bottom: 16px !important;
  font-weight: 600 !important;
  line-height: 1.25 !important;
  color: inherit !important;
}

:deep(.markdown-content) h1,
:deep([v-html]) h1 {
  font-size: 2em !important;
  border-bottom: 1px solid #eaecef !important;
  padding-bottom: 0.3em !important;
}

:deep(.markdown-content) h2,
:deep([v-html]) h2 {
  font-size: 1.5em !important;
  border-bottom: 1px solid #eaecef !important;
  padding-bottom: 0.3em !important;
}

:deep(.markdown-content) h3,
:deep([v-html]) h3 {
  font-size: 1.25em !important;
}

:deep(.markdown-content) h4,
:deep([v-html]) h4 {
  font-size: 1em !important;
}

:deep(.markdown-content) a,
:deep([v-html]) a {
  color: #0366d6 !important;
  text-decoration: none !important;
}

:deep(.markdown-content) p,
:deep(.markdown-content) li,
:deep(.markdown-content) td,
:deep([v-html]) p,
:deep([v-html]) li,
:deep([v-html]) td {
  margin-bottom: 16px !important;
}

:deep(.markdown-content) th,
:deep([v-html]) th {
  background-color: #21262d !important;
  color: #ffffff !important;
}

:deep(.markdown-content) table,
:deep([v-html]) table {
  border-color: #30363d !important;
}

:deep(.markdown-content) th,
:deep(.markdown-content) td,
:deep([v-html]) th,
:deep([v-html]) td {
  border-color: #30363d !important;
}

:deep(.markdown-content) a,
:deep([v-html]) a {
  color: #58a6ff !important;
}

:deep(.markdown-content) a:hover,
:deep([v-html]) a:hover {
  color: #79c0ff !important;
}
:deep(.markdown-content) img,
:deep([v-html]) img {
  max-width: 100% !important;
}
</style>
