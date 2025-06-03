<template>
  <v-container fluid>
    <!-- 顶部工具栏 -->
    <v-toolbar outlined>
      <v-toolbar-title>
        <v-icon>mdi-github</v-icon>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <!-- 快速导入 -->
      <v-tooltip bottom>
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            size="small"
            class="mr-2"
            variant="outlined"
            @click="openImportDialog"
          >
            <v-icon>mdi-download</v-icon>
            <span>从<v-icon>mdi-github</v-icon>快速导入仓库</span>
          </v-btn>
        </template>
        <span>从<v-icon>mdi-github</v-icon>快速导入仓库</span>
      </v-tooltip>
      <!-- 本地导入 -->
      <v-tooltip bottom>
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            size="small"
            class="mr-2"
            variant="outlined"
            @click="openLocalImportDialog"
          >
            <v-icon>mdi-folder-open</v-icon>
            <span>本地导入</span>
          </v-btn>
        </template>
        <span>从本地已有目录导入仓库</span>
      </v-tooltip>
      <v-tooltip bottom>
        <template #activator="{ props }">
          <v-btn v-bind="props" size="small" class="mr-2" variant="outlined" @click="fetchRepos">
            <v-icon>mdi-refresh</v-icon>
          </v-btn>
        </template>
        <span>刷新列表</span>
      </v-tooltip>
      <v-tooltip bottom>
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            size="small"
            class="mr-2"
            variant="outlined"
            @click="openNewRepoDialog"
          >
            <v-icon>mdi-plus</v-icon>
          </v-btn>
        </template>
        <span>新增仓库</span>
      </v-tooltip>
    </v-toolbar>

    <!-- 卡片式仓库列表 -->
    <v-row class="mt-4 mr-4" justify="center">
      <v-col v-for="repo in repos" :key="repo.id" cols="12" sm="6" md="6" lg="5">
        <v-card class="id-card" elevation="2" style="display: block">
          <div class="id-card-header">
            <span class="id-card-title">代码仓库身份证</span>
            <span class="id-card-subtitle">CODE REPOSITORY ID CARD</span>
          </div>
          <div class="id-card-content">
            <div class="id-card-left">
              <div class="avatar-icon" v-html="getAvatarIcon(repo.id)"></div>
              <div class="repo-name">{{ omit(repo.name, 20) }}</div>
            </div>
            <div class="id-card-right">
              <div class="info-item">
                <span class="label">仓库地址 / URL</span>
                <span class="value">{{ omit(repo.repo_url, 20) }}</span>
              </div>
              <div class="info-item">
                <span class="label">本地路径 / Local Path</span>
                <span class="value">{{ omit(repo.local_path, 20) }}</span>
              </div>
              <div class="info-item">
                <span class="label">描述 / Desc</span>
                <span class="value ellipsis">{{ omit(repo.desc, 14) }}</span>
              </div>
            </div>
          </div>
          <div class="id-card-footer">
            <div class="id-number">仓库ID:{{ repo.id }}</div>
            <div class="action-buttons">
              <v-btn
                small
                class="detail-btn mr-0"
                color="purple"
                variant="outlined"
                @click="jumpToFm"
              >
                <v-icon>mdi-flash</v-icon>
                索引
              </v-btn>
              <v-btn
                small
                class="preview-btn mr-0"
                color="warning"
                variant="outlined"
                @click="previewRepo(repo)"
              >
                <v-icon>mdi-eye</v-icon>
                详情
              </v-btn>
              <v-tooltip text="编辑">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    small
                    class="detail-btn mr-0"
                    color="primary"
                    variant="outlined"
                    @click="viewRepo(repo)"
                  >
                    <v-icon>mdi-pencil</v-icon>
                    编辑
                  </v-btn>
                </template>
              </v-tooltip>
              <v-tooltip text="删除仓库">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    small
                    class="delete-btn mr-0"
                    color="error"
                    variant="outlined"
                    @click="deleteRepoo(repo)"
                  >
                    <v-icon>mdi-delete</v-icon>
                    删除
                  </v-btn>
                </template>
              </v-tooltip>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- 弹出对话框：用于新增或编辑仓库 -->
    <v-dialog v-model="dialog" max-width="550" scrollable persistent>
      <v-card class="id-card-edit" elevation="2">
        <div class="id-card-header">
          <span class="id-card-title">{{ selectedRepo ? '编辑仓库' : '新增仓库' }}</span>
          <span class="id-card-subtitle">CODE REPOSITORY ID CARD</span>
        </div>
        <div class="id-card-content">
          <div class="id-card-left">
            <div
              class="avatar-icon"
              v-html="getAvatarIcon(selectedRepo ? selectedRepo.id : 'new')"
            ></div>
            <div class="repo-name">{{ repoForm.name || '新仓库' }}</div>
          </div>
          <div class="id-card-right edit-form-content">
            <v-form ref="form" v-model="formValid" class="edit-form">
              <div class="info-item">
                <span class="label">名称 / Name</span>
                <v-text-field
                  v-model="repoForm.name"
                  required
                  :disabled="selectedRepo !== null"
                  density="compact"
                  variant="outlined"
                  bg-color="rgba(255,255,255,0.7)"
                  hide-details
                  class="custom-field"
                />
              </div>
              <div class="info-item">
                <span class="label">仓库地址 / URL</span>
                <v-text-field
                  v-model="repoForm.repo_url"
                  required
                  density="compact"
                  variant="outlined"
                  bg-color="rgba(255,255,255,0.7)"
                  hide-details
                  class="custom-field"
                />
              </div>
              <div class="info-item">
                <div v-if="selectedRepo === null">
                  <span class="label">分支 / Branch</span>
                  <v-text-field
                    v-model="repoForm.branch"
                    required
                    density="compact"
                    variant="outlined"
                    bg-color="rgba(255,255,255,0.7)"
                    hide-details
                    class="custom-field"
                  />
                </div>
                <div v-else>
                  <v-select
                    v-model="repoForm.branch"
                    :items="branchOptions"
                    label="分支 / Branch"
                    density="compact"
                    variant="outlined"
                    bg-color="rgba(255,255,255,0.7)"
                    hide-details
                    class="custom-field"
                  />
                </div>
              </div>
              <div class="info-item">
                <span class="label">本地路径 / Local Path</span>
                <v-text-field
                  v-model="repoForm.local_path"
                  required
                  :disabled="selectedRepo !== null"
                  density="compact"
                  variant="outlined"
                  bg-color="rgba(255,255,255,0.7)"
                  hide-details
                  class="custom-field"
                  append-inner-icon="mdi-folder"
                  @click:append-inner="handleLocalPathClick"
                />
              </div>
              <div class="info-item">
                <span class="label">用户名 / Username (私有仓库需要填写)</span>
                <v-text-field
                  v-model="repoForm.username"
                  density="compact"
                  variant="outlined"
                  bg-color="rgba(255,255,255,0.7)"
                  hide-details
                  class="custom-field"
                />
              </div>
              <div class="info-item">
                <span class="label">密码 / Password (私有仓库需要填写)</span>
                <v-text-field
                  v-model="repoForm.password"
                  type="password"
                  density="compact"
                  variant="outlined"
                  bg-color="rgba(255,255,255,0.7)"
                  hide-details
                  class="custom-field"
                />
              </div>
              <div class="info-item">
                <span class="label">描述 / Description</span>
                <v-textarea
                  v-model="repoForm.desc"
                  density="compact"
                  variant="outlined"
                  bg-color="rgba(255,255,255,0.7)"
                  hide-details
                  rows="2"
                  class="custom-field"
                />
              </div>
            </v-form>
          </div>
        </div>
        <div class="id-card-footer">
          <div class="id-number">{{ selectedRepo ? '编辑' : '新增' }}</div>
          <div class="action-buttons">
            <v-btn
              small
              class="local-path-btn mr-0"
              color="success"
              size="small"
              variant="outlined"
              @click="openLocalPath(repoForm)"
            >
              <v-icon>mdi-folder-open</v-icon>
              打开本地路径
            </v-btn>
            <v-btn
              small
              class="git-link-btn mr-0"
              color="info"
              size="small"
              variant="outlined"
              @click="openGitLink(repoForm)"
            >
              <v-icon>mdi-github</v-icon>
              打开仓库链接
            </v-btn>
            <v-btn
              small
              size="small"
              color="primary"
              :disabled="!selectedRepo && (!repoForm.local_path || !localFolderValid)"
              @click="saveRepo"
            >
              <v-icon>mdi-content-save</v-icon>
              {{ selectedRepo ? '保存仓库' : '创建仓库' }}
            </v-btn>
            <v-btn small size="small" color="error" @click="closeDialog">
              <v-icon>mdi-close</v-icon>
              取消
            </v-btn>
          </div>
        </div>
      </v-card>
    </v-dialog>

    <!-- ========= 本地导入对话框 ========= -->
    <v-dialog v-model="localImportDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="text-h6">从本地导入已有仓库</v-card-title>
        <v-card-text>
          <v-form ref="localImportRef" v-model="localImportValid">
            <v-text-field
              v-model="localImportForm.local_path"
              label="本地仓库根目录"
              prepend-inner-icon="mdi-folder"
              placeholder="选择本地仓库路径"
              required
              append-inner-icon="mdi-folder"
              @click:append-inner="selectLocalRepoPath"
            />
            <v-text-field
              v-model="localImportForm.name"
              label="仓库名称"
              prepend-inner-icon="mdi-tag"
              required
            />
            <v-text-field
              v-model="localImportForm.branch"
              label="默认分支"
              prepend-inner-icon="mdi-source-branch"
              required
            />
            <v-textarea
              v-model="localImportForm.desc"
              label="描述"
              rows="2"
              prepend-inner-icon="mdi-text"
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn text @click="closeLocalImportDialog">取消</v-btn>
          <v-btn color="primary" :disabled="!localImportValid" @click="importLocalRepo">导入</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ========= 快速导入对话框 ========= -->
    <v-dialog v-model="importDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="text-h6">快速导入 GitHub 仓库</v-card-title>
        <v-card-text>
          <v-form ref="importFormRef" v-model="importFormValid">
            <v-text-field
              v-model="importForm.repo_url"
              label="GitHub 链接 (HTTPS)"
              placeholder="https://github.com/username/project"
              prepend-inner-icon="mdi-link"
              required
            />
            <v-text-field
              v-model="importForm.local_path"
              label="本地路径"
              placeholder="选择或输入本地目录"
              prepend-inner-icon="mdi-folder"
              required
              append-inner-icon="mdi-folder"
              @click:append-inner="selectImportLocalPath"
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn text @click="closeImportDialog">取消</v-btn>
          <v-btn color="primary" :disabled="!importFormValid" @click="importRepo"> 导入 </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>

    <!-- 进度条弹窗 -->
    <v-dialog v-model="progressDialog" persistent max-width="400">
      <v-card>
        <v-card-title class="text-center">{{ progressTitle }}</v-card-title>
        <v-card-text>
          <v-progress-linear :model-value="progress" color="primary" height="25" striped>
            <template #default="{ value }">
              <strong>{{ Math.ceil(value) }}%</strong>
            </template>
          </v-progress-linear>
          <div class="text-center mt-2">{{ progressMessage }}</div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- 删除确认对话框 -->
    <v-dialog v-model="deleteDialog" persistent max-width="450">
      <v-card>
        <v-card-title class="text-h5">确认删除仓库</v-card-title>
        <v-card-text>
          您确定要删除仓库 "{{ repoToDelete?.name }}" 吗？
          <v-checkbox
            v-model="deleteLocalDirectory"
            label="同时删除本地仓库目录？（此操作无法恢复）"
            color="error"
            class="mt-2"
          ></v-checkbox>
          <div
            v-if="deleteLocalDirectory && repoToDelete?.local_path"
            class="text-caption text-error"
          >
            本地目录: {{ repoToDelete.local_path }}
          </div>
          <div
            v-else-if="deleteLocalDirectory && !repoToDelete?.local_path"
            class="text-caption text-warning"
          >
            警告：未找到本地路径信息，无法删除本地目录。
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="closeDeleteDialog">取消</v-btn>
          <v-btn color="error darken-1" text @click="confirmDeleteRepo">确认删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
  <!-- 简单 v-for 渲染，absolute 堆叠在右下角 -->
  <v-snackbar
    v-for="(t, i) in toasts"
    :key="t.id"
    v-model="t.visible"
    :color="t.color"
    timeout="-1"
    absolute
    bottom
    right
    :style="{ marginBottom: i * 60 + 'px' }"
  >
    {{ t.message }}
  </v-snackbar>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import {
  listRepos,
  getRepo,
  createRepo,
  updateRepo,
  deleteRepo,
  listBranches,
  switchBranch
} from '../service/api'
import { omit } from '../service/str'
import { generateAvatar } from '../components/AvatarGenerator'
import { VSelect, VSnackbar } from 'vuetify/components'

// 获取 Vuex store 与 Vue Router 实例
const store = useStore()
const router = useRouter()

// 新写法：简易 toast 列表
const toasts = ref([]) // [{ id, message, color, timeout, visible }]

function toast(message, color = 'info', timeout = 3000) {
  const id = Date.now() + Math.random() // 简单唯一 id
  toasts.value.push({ id, message, color, timeout, visible: true })
  setTimeout(() => {
    const item = toasts.value.find((t) => t.id === id)
    if (item) item.visible = false // 触发 v-snackbar 关闭
    // 再延迟一点点把对象从数组删掉
    setTimeout(() => {
      const idx = toasts.value.findIndex((t) => t.id === id)
      if (idx > -1) toasts.value.splice(idx, 1)
    }, 400)
  }, timeout)
}

// 方便调用
const toastError = (msg) => toast(msg, 'error')
const toastSuccess = (msg) => toast(msg, 'success')
const toastInfo = (msg) => toast(msg, 'info')
const toastWarning = (msg) => toast(msg, 'warning')

// 用来控制错误提示
const snackbar = reactive({
  show: false,
  message: '',
  timeout: 3000,
  color: 'info'
})
/** 队列：按先进先出依次展示 snackbar */
const snackbarQueue = ref([])

/** 入队并在空闲时立即播放 */
function enqueueSnackbar(msg, color = 'info', timeout = 3000) {
  snackbarQueue.value.push({ msg, color, timeout })
  if (!snackbar.show) playNextSnackbar()
}

/** 将队首元素赋给 snackbar，触发显示 */
function playNextSnackbar() {
  if (snackbarQueue.value.length === 0) return
  const { msg, color, timeout } = snackbarQueue.value.shift()
  Object.assign(snackbar, { message: msg, color, timeout, show: true })
}

/** snackbar 消失以后（show=false）继续下一条 */
watch(
  () => snackbar.show,
  (val) => {
    if (!val) playNextSnackbar()
  }
)

const branchOptions = ref([])

// 组件状态
const repos = ref([])
const dialog = ref(false)
const formValid = ref(false)
const selectedRepo = ref(null)
const localFolderValid = ref(true)

// 删除确认对话框状态
const deleteDialog = ref(false)
const repoToDelete = ref(null)
const deleteLocalDirectory = ref(false)

// 进度条状态
const progressDialog = ref(false)
const progress = ref(0)
const progressTitle = ref('')
const progressMessage = ref('')
const progressTimer = ref(null)

// 仓库表单数据采用 reactive 管理
const repoForm = reactive({
  name: '',
  repo_url: '',
  branch: '',
  local_path: '',
  username: '',
  password: '',
  desc: ''
})

/* ───── 本地导入 ───── */
const localImportDialog = ref(false)
const localImportValid = ref(false)
const localImportRef = ref(null)
const localImportForm = reactive({
  local_path: '',
  name: '',
  branch: 'main',
  desc: ''
})

const showLocalSnackbar = (message, color) => toast(message, color)

const showErrorSnackbar = (message) => toastError(message)

/**
 * 拉取分支列表并写入 branchOptions。
 * 若当前 repoForm.branch 不在列表中则自动设为第一个分支。
 * @param {number} repoID
 */
async function ensureBranch(repoID) {
  try {
    const res = await listBranches(repoID)
    if (res.status === 200 && Array.isArray(res.data.data)) {
      branchOptions.value = res.data.data
      if (!branchOptions.value.includes(repoForm.branch)) {
        repoForm.branch = branchOptions.value[0] || ''
      }
    }
  } catch (e) {
    console.error('获取分支列表失败', e.response.data)
    showErrorSnackbar(e.response.data || e)
  }
}

/**
 * 尝试切换到 repoForm.branch。
 * 成功返回 true，失败返回 false（同时弹出错误提示），
 * 不向上传递异常，避免影响后续保存 / 创建逻辑。
 * @param {number} repoID
 * @returns {boolean}
 */
async function applyBranch(repoID) {
  if (!repoForm.branch) return true // 没选分支，直接视为成功
  try {
    await switchBranch(repoID, repoForm.branch)
    return true
  } catch (e) {
    console.error('切换分支失败', e.response.data)
    showErrorSnackbar(e.response.data || e)
    return false
  }
}

const openLocalImportDialog = () => {
  Object.assign(localImportForm, {
    local_path: '',
    name: '',
    branch: 'main',
    desc: ''
  })
  localImportDialog.value = true
}

const closeLocalImportDialog = () => {
  localImportDialog.value = false
}

const selectLocalRepoPath = async () => {
  try {
    const result = await window.electron.invoke('dialog:openDirectory', {
      defaultPath: localImportForm.local_path,
      properties: ['openDirectory']
    })
    if (!result.canceled && result.filePaths?.length > 0) {
      localImportForm.local_path = result.filePaths[0]
      // 默认仓库名取文件夹名
      const path = await window.electron.path
      localImportForm.name = path.basename(localImportForm.local_path)
    }
  } catch (e) {
    console.error(e)
  }
}

// 获取仓库列表（尽量用 async/await，提高可读性和错误处理能力）
const fetchRepos = async () => {
  try {
    const response = await listRepos()
    if (response.status === 200) {
      // 按照id降序排序后赋值
      repos.value = response.data.sort((a, b) => b.id - a.id)
    } else {
      // 处理非200状态码，从响应体中提取错误信息
      const errorMsg = response.data || '无法获取仓库列表'
      showErrorSnackbar(errorMsg)
    }
  } catch (err) {
    console.error('获取仓库列表错误:', err)
    // 捕获网络错误或其他异常
    const errorMsg = err.response?.data || err.message || '拉取仓库失败'
    showErrorSnackbar(errorMsg)
  }
}

// 预览仓库内容，使用 Vue Router 进行跳转
const previewRepo = (item) => {
  const localPath = item.local_path
  const rootPath = item.local_path
  const forceReplace = 'true'
  if (localPath) {
    router.push({
      name: 'finder',
      params: { localPath, forceReplace, rootPath }
    })
  } else {
    alert('该仓库未配置本地路径')
  }
}

const jumpToFm = () => {
  closeDialog()
  router.push({
    name: 'scan'
  })
}

// 打开本地路径
const openLocalPath = (repo) => {
  if (!repo.local_path) {
    toastWarning('该仓库未配置本地路径')
    return
  }

  // 使用electron的shell模块打开本地文件夹
  window.electron.shell.openPath(repo.local_path)
    .then(() => {
      toastSuccess('已打开本地路径')
    })
    .catch((error) => {
      toastError('打开本地路径失败：' + error.message)
    })
}

// 打开Git链接的小窗口
const openGitLink = (repo) => {
  if (!repo.repo_url) {
    toastWarning('该仓库未配置Git链接')
    return
  }

  // 优先使用 Electron 的 openNewWindow 方法
  if (window.electron && typeof window.electron.openNewWindow === 'function') {
    window.electron.openNewWindow(repo.repo_url)
  } else {
    // 降级到使用 window.open
    const gitWindow = window.open(
      repo.repo_url,
      'gitLink',
      'width=800,height=600,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no'
    )
    
    if (!gitWindow) {
      // 如果弹窗被阻止，提示用户
      toastError('弹窗被浏览器阻止，请允许弹窗或手动访问：' + repo.repo_url)
    }
  }
}

// 打开新增仓库对话框，同时重置表单
const openNewRepoDialog = () => {
  selectedRepo.value = null
  Object.assign(repoForm, {
    name: '',
    repo_url: '',
    branch: '',
    local_path: '',
    username: '',
    password: '',
    desc: ''
  })
  dialog.value = true
}

// 编辑仓库详情，从后端获取数据，并填充表单
const viewRepo = async (item) => {
  try {
    const response = await getRepo(item.id)
    selectedRepo.value = response.data
    Object.assign(repoForm, {
      name: response.data.name,
      repo_url: response.data.repo_url,
      branch: response.data.branch,
      local_path: response.data.local_path,
      username: response.data.username,
      password: response.data.password,
      desc: response.data.desc
    })
    await ensureBranch(response.data.id) // ⭐️ 这里拉取分支列表
    dialog.value = true
  } catch (err) {
    console.error('获取仓库详情错误:', err)
    const errorMsg = err.response?.data || err.message || '获取仓库详情失败'
    showErrorSnackbar(errorMsg)
  }
}

// 启动进度条模拟
const startProgressSimulation = () => {
  // 设置初始状态
  progress.value = 0
  progressTitle.value = selectedRepo.value ? '正在更新仓库' : '正在创建仓库'
  progressMessage.value = '正在初始化...'
  progressDialog.value = true

  // 清除可能存在的旧定时器
  if (progressTimer.value) {
    clearInterval(progressTimer.value)
  }

  // 创建新的定时器，模拟进度增长
  progressTimer.value = setInterval(() => {
    if (progress.value < 90) {
      // 非线性增长，开始快，接近90%时变慢
      const increment = (90 - progress.value) / 10
      progress.value += Math.max(0.5, increment)

      // 根据进度更新消息
      if (progress.value < 30) {
        progressMessage.value = '正在准备仓库数据...'
      } else if (progress.value < 60) {
        progressMessage.value = '正在处理仓库信息...'
      } else {
        progressMessage.value = '即将完成，请稍候...'
      }
    }
  }, 200) // 每200毫秒更新一次
}

// 完成进度条
const completeProgress = (success = true) => {
  // 清除定时器
  if (progressTimer.value) {
    clearInterval(progressTimer.value)
    progressTimer.value = null
  }

  if (success) {
    // 成功完成，直接设置为100%
    progress.value = 100
    progressMessage.value = selectedRepo.value ? '仓库更新成功！' : '仓库创建成功！'

    // 短暂显示100%后关闭进度条
    setTimeout(() => {
      progressDialog.value = false
      // 重置进度
      progress.value = 0
    }, 1000)
  } else {
    // 失败，关闭进度条
    progressDialog.value = false
    // 重置进度
    progress.value = 0
  }
}

// 保存仓库（判断更新或新增）
const saveRepo = async () => {
  // 启动进度条模拟
  startProgressSimulation()
  try {
    if (selectedRepo.value) {
      console.log('now branch', repoForm.branch)
      const repo = await getRepo(selectedRepo.value.id)
      console.log('old branch', repo.data.branch)
      await updateRepo(selectedRepo.value.id, {
        repo_url: repoForm.repo_url,
        branch: repoForm.branch,
        local_path: repoForm.local_path,
        username: repoForm.username,
        password: repoForm.password,
        name: repoForm.name,
        desc: repoForm.desc,
        pull: false
      })
      // ② 只有分支真的改动才切换
      if (repo.data.branch !== repoForm.branch) {
        console.log('yes!')
        await applyBranch(selectedRepo.value.id)
      }
    } else {
      // 新增操作：发送完整数据
      await createRepo({
        repo_url: repoForm.repo_url,
        branch: repoForm.branch,
        local_path: repoForm.local_path,
        username: repoForm.username,
        password: repoForm.password,
        name: repoForm.name,
        desc: repoForm.desc,
        pull: true
      })
    }
    // 操作成功，完成进度条
    completeProgress(true)
    dialog.value = false
    await fetchRepos()

    // 显示成功提示
    showLocalSnackbar(selectedRepo.value ? '仓库更新成功' : '仓库创建成功', 'success')
  } catch (err) {
    console.error(selectedRepo.value ? '更新仓库错误:' : '新增仓库错误:', err)

    // 操作失败，停止进度条
    completeProgress(false)

    // 特殊处理超时错误
    if (err.code === 'ECONNABORTED' && err.message.includes('timeout')) {
      showErrorSnackbar('请求超时，服务器处理时间较长，请稍后刷新页面查看是否操作成功')
    } else {
      const errorMsg =
        err.response?.data || err.message || (selectedRepo.value ? '更新仓库失败' : '新增仓库失败')
      showErrorSnackbar(errorMsg)
    }
  }
}

// 删除仓库操作 - 打开确认对话框
const deleteRepoo = (item) => {
  repoToDelete.value = item
  deleteLocalDirectory.value = false // 重置复选框状态
  deleteDialog.value = true
}

// 确认删除仓库
const confirmDeleteRepo = async () => {
  if (!repoToDelete.value) return

  const repoId = repoToDelete.value.id
  const repoName = repoToDelete.value.name
  const shouldDeleteLocal = deleteLocalDirectory.value

  closeDeleteDialog() // 先关闭对话框

  try {
    // 调用后端删除接口，并根据复选框状态传递 deleteLocal 参数
    await deleteRepo(repoId, { deleteLocal: shouldDeleteLocal }) // 正确传递查询参数
    fetchRepos() // 重新获取列表
    showLocalSnackbar(
      `仓库 ${repoName} 删除成功` + (shouldDeleteLocal ? '（本地目录已删除）' : ''),
      'error'
    )
  } catch (err) {
    console.error('删除仓库错误:', err)
    const errorMsg = err.response?.data || err.message || '删除仓库失败'
    showErrorSnackbar(errorMsg)
  }
}

// 关闭删除确认对话框
const closeDeleteDialog = () => {
  deleteDialog.value = false
  repoToDelete.value = null // 清除待删除的仓库信息
}

// 关闭（新增/编辑）对话框
const closeDialog = () => {
  dialog.value = false
}

// 获取头像图标（利用外部生成函数）
const getAvatarIcon = (repoId) => {
  if (!repoId) {
    return '' // 如果 repoId 无效，则返回空字符串
  }
  // 当repoId为'new'或非数字时，使用固定的数值作为种子
  if (repoId === 'new' || isNaN(Number(repoId))) {
    return generateAvatar(12345) // 使用固定数值作为种子
  }
  return generateAvatar(repoId)
}

// 处理本地路径选择（使用 Electron 的 IPC 调用）
const handleLocalPathClick = async () => {
  // 编辑时不允许更改
  if (selectedRepo.value !== null) return

  if (!repoForm.name || !repoForm.repo_url) {
    alert('请先填写名称和仓库 URL')
    return
  }

  try {
    const result = await window.electron.invoke('dialog:openDirectory', {
      defaultPath: repoForm.local_path,
      properties: ['openDirectory']
    })
    if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0]
      const fs = await window.electron.fs
      const path = await window.electron.path
      // 判断选中文件夹是否为空
      const folderContent = fs.readdirSync(selectedPath)
      if (folderContent.length === 0) {
        repoForm.local_path = selectedPath
        showLocalSnackbar('选中的文件夹为空，直接使用该目录。', 'info')
      } else {
        // 文件夹不为空，自动创建子文件夹，去掉名称里的所有点和.git后缀
        const rawName = repoForm.name
        const safeName = rawName.replace(/\./g, '').replace(/\.git$/, '')
        const newFolderPath = path.join(selectedPath, safeName)
        if (!fs.existsSync(newFolderPath)) {
          fs.mkdirSync(newFolderPath)
          showLocalSnackbar(`已自动创建 ${newFolderPath} 文件夹`, 'info')
        }
        repoForm.local_path = newFolderPath
      }
      localFolderValid.value = true
    }
  } catch (err) {
    console.error(err)
  }
}
// 选择本地路径（快速导入对话框中使用）
const selectImportLocalPath = async () => {
  try {
    const result = await window.electron.invoke('dialog:openDirectory', {
      defaultPath: importForm.local_path,
      properties: ['openDirectory']
    })
    if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0]
      const fs = await window.electron.fs
      const path = await window.electron.path
      // 判断选中文件夹是否为空
      const folderContent = fs.readdirSync(selectedPath)
      if (folderContent.length === 0) {
        importForm.local_path = selectedPath
        showLocalSnackbar('选中的文件夹为空，直接使用该目录。', 'info')
      } else {
        // 文件夹不为空，自动创建子文件夹，去掉名称里的所有点和.git后缀
        const rawRepoName = extractNameFromUrl(importForm.repo_url)
        const safeRepoName = rawRepoName.replace(/\./g, '').replace(/\.git$/, '')
        const newFolderPath = path.join(selectedPath, safeRepoName)
        if (!fs.existsSync(newFolderPath)) {
          fs.mkdirSync(newFolderPath)
          showLocalSnackbar(`已自动创建 ${newFolderPath} 文件夹`, 'info')
        }
        importForm.local_path = newFolderPath
      }
      localFolderValid.value = true
    }
  } catch (e) {
    console.error(e)
  }
}

// ================= 快速导入 =================
const importDialog = ref(false)
const importFormValid = ref(false)
const importFormRef = ref(null)
const importForm = reactive({
  repo_url: '',
  local_path: ''
})

// 监听 repo_url 变化，自动更新本地路径
watch(
  () => importForm.repo_url,
  async (newUrl) => {
    if (newUrl && newUrl.trim()) {
      const repoName = extractNameFromUrl(newUrl)
      if (repoName !== 'unknown') {
        // 获取当前基础路径（保留父目录）
        const homeDir = await window.electron.homeDir
        // 如果基础路径为空，则使用用户主目录
        const basePath = homeDir
        // 更新本地路径，使用仓库名作为文件夹名
        importForm.local_path = window.electron.path.join(basePath, 'githave', repoName)
      }
    }
  }
)

const openImportDialog = async () => {
  // 本地路径默认为用户主目录
  const homeDir = await window.electron.homeDir
  importForm.local_path = window.electron.path.join(homeDir, 'githave')
  importForm.repo_url = ''
  importDialog.value = true
}

const closeImportDialog = () => {
  importDialog.value = false
}

// 工具：从 git URL 提取仓库名作为默认名称
const extractNameFromUrl = (url) => {
  if (!url) return 'unknown'
  const match = url.match(/([^/]+?)(?:\.git)?(?:\/)?$/)
  return match ? match[1] : 'unknown'
}

const importRepo = async () => {
  if (!importFormValid.value) return

  // 显示进度条复用现有逻辑
  startProgressSimulation()
  const repoName = extractNameFromUrl(importForm.repo_url)

  try {
    await createRepo({
      name: repoName,
      repo_url: importForm.repo_url,
      branch: 'main', // 默认分支，可根据需要调整或让后端自动识别
      local_path: importForm.local_path,
      username: '',
      password: '',
      desc: '',
      pull: true // 克隆后立即拉取/校验
    })

    completeProgress(true)
    closeImportDialog()
    fetchRepos()
    showLocalSnackbar('仓库导入成功', 'success')
  } catch (err) {
    console.error('导入仓库失败:', err)
    completeProgress(false)
    const errorMsg = err.response?.data || err.message || '导入仓库失败'
    showErrorSnackbar(errorMsg)
  }
}

const importLocalRepo = async () => {
  if (!localImportValid.value) return

  startProgressSimulation()
  try {
    await createRepo({
      name: localImportForm.name,
      repo_url: '', // 本地仓库无需远程 URL
      branch: localImportForm.branch,
      local_path: localImportForm.local_path,
      username: '',
      password: '',
      desc: localImportForm.desc,
      pull: false // 不执行克隆
    })

    completeProgress(true)
    closeLocalImportDialog()
    fetchRepos()
    showLocalSnackbar('本地仓库导入成功', 'success')
  } catch (err) {
    console.error('本地导入失败:', err)
    completeProgress(false)
    const errorMsg = err.response?.data || err.message || '本地导入失败'
    showErrorSnackbar(errorMsg)
  }
}

onMounted(() => {
  fetchRepos()
})
</script>

<style scoped>
/* 身份证卡片样式 */
.id-card {
  width: 100%;
  height: 100%;
  margin: 10px 10px;
  padding: 20px 20px 40px;
  font-size: calc(14px + 0.3vw); /* 随屏幕宽度变化字体大小 */
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7eb 100%);
  position: relative;
  border-radius: 10px;
  overflow: hidden;
}

.id-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%239C92AC' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E")
    repeat;
  opacity: 0.3;
  z-index: 0;
}

.id-card-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

.id-card-title {
  font-size: 24px;
  font-weight: bold;
  color: #1a237e;
  margin-bottom: 5px;
}

.id-card-subtitle {
  font-size: 14px;
  color: #5c6bc0;
}

.id-card-content {
  display: flex;
  position: relative;
  z-index: 1;
}

.id-card-left {
  flex: 0 0 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-right: 20px;
  border-right: 2px solid rgba(0, 0, 0, 0.1);
}

.avatar-icon {
  color: #1a237e;
  margin-bottom: 15px;
}

.repo-name {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  color: #1a237e;
  word-break: break-word;
}

.id-card-right {
  flex: 1;
  padding-left: 20px;
}

.info-item {
  margin-bottom: 15px;
}

.label {
  display: block;
  font-size: 12px;
  color: #5c6bc0;
  margin-bottom: 3px;
}

.value {
  display: block;
  font-size: 14px;
  color: #1a237e;
  word-break: break-word;
}

.id-card-footer {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1;
}

.id-number {
  font-family: 'Courier New', monospace;
  font-size: 16px;
  color: #1a237e;
  letter-spacing: 1px;
}

.action-buttons {
  display: flex;
  gap: 5px;
}

/* 设置容器垂直滚动 */
.v-container {
  padding: 0;
  height: calc(100vh - 150px);
  overflow-y: auto;
}

/* 确保卡片居中排列 */
.v-row {
  justify-content: center;
}
/* 身份证卡片编辑样式 */
.id-card-edit {
  width: 650px; /* 与列表卡片宽度一致 */
  height: 680px; /* 与列表卡片高度一致 */
  margin: 10px;
  padding: 20px;
  padding-bottom: 60px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7eb 100%);
  position: relative;
  border-radius: 10px; /* 圆角与列表卡片一致 */
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1); /* 与列表卡片一致的阴影 */
  overflow: hidden;
}

/* 添加与列表卡片一致的背景图案 */
.id-card-edit::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.343 4-4s-1.343-4-4-4-4 1.79-4 4 1.343 3 3 3zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%239C92AC' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E")
    repeat;
  opacity: 0.3;
  z-index: 0;
}

/* 编辑表单内容区域 */
.edit-form-content {
  flex-direction: column;
  overflow-y: auto;
  max-height: 260px;
  padding-right: 10px;
  position: relative;
  z-index: 1;
}

.edit-form {
  width: 100%;
}

/* 自定义表单字段样式 */
.custom-field {
  margin-bottom: 5px;
  font-size: 14px;
  color: #1a237e;
}

/* 表单项样式 */
.info-item {
  margin-bottom: 10px;
}

/* 保存按钮样式 */
.save-btn {
  min-width: 36px;
  height: 36px;
}

/* 取消按钮样式 */
.cancel-btn {
  min-width: 36px;
  height: 36px;
}

/* 单行、超出 20 个字符时显示省略号 */
.ellipsis {
  display: inline-block;
  max-width: 80ch;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
