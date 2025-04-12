<template>
  <v-container fluid>
    <!-- 顶部工具栏 -->
    <v-toolbar outlined>
      <v-toolbar-title>
        <v-icon>mdi-github</v-icon>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-tooltip bottom>
        <template #activator="{ props }">
          <v-btn v-bind="props" @click="fetchRepos" class="mr-2" variant="outlined">
            <v-icon>mdi-refresh</v-icon>
          </v-btn>
        </template>
        <span>刷新卡片列表</span>
      </v-tooltip>
      <v-tooltip bottom>
        <template #activator="{ props }">
          <v-btn v-bind="props" @click="openNewRepoDialog" class="mr-2" variant="outlined">
            <v-icon>mdi-plus</v-icon>
          </v-btn>
        </template>
        <span>新增仓库ID卡</span>
      </v-tooltip>
    </v-toolbar>

    <!-- 卡片式仓库列表 -->
    <v-row class="mt-4 mr-4" justify="center">
      <v-col cols="6" v-for="repo in repos" :key="repo.id">
        <v-card class="id-card" elevation="2" style="display: block; width: 550px;height: 380px">
          <div class="id-card-header">
            <span class="id-card-title">代码仓库身份证</span>
            <span class="id-card-subtitle">CODE REPOSITORY ID CARD</span>
          </div>
          <div class="id-card-content">
            <div class="id-card-left">
              <div class="avatar-icon" v-html="getAvatarIcon(repo.id)"></div>
              <div class="repo-name">{{ repo.name }}</div>
            </div>
            <div class="id-card-right">
              <div class="info-item">
                <span class="label">仓库地址 / URL</span>
                <span class="value">{{ repo.repo_url }}</span>
              </div>
              <div class="info-item">
                <span class="label">分支 / Branch</span>
                <span class="value">{{ repo.branch }}</span>
              </div>
              <div class="info-item">
                <span class="label">本地路径 / Local Path</span>
                <span class="value">{{ repo.local_path }}</span>
              </div>
            </div>
          </div>
          <div class="id-card-footer">
            <div class="id-number">仓库ID: {{ repo.id }}</div>
            <div class="action-buttons">
              <v-tooltip text="仓库详情">
                <template #activator="{ props }">
                  <v-btn v-bind="props" small class="detail-btn mr-2" color="primary" @click="viewRepo(repo)">
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                </template>
              </v-tooltip>
              <v-tooltip text="预览仓库内容">
                <template #activator="{ props }">
                  <v-btn v-bind="props" small class="preview-btn mr-2" color="warning" @click="previewRepo(repo)">
                    <v-icon>mdi-eye</v-icon>
                  </v-btn>
                </template>
              </v-tooltip>
              <v-tooltip text="删除仓库">
                <template #activator="{ props }">
                  <v-btn v-bind="props" small class="delete-btn mr-2" color="error" @click="deleteRepoo(repo)">
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </template>
              </v-tooltip>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- 弹出对话框：用于新增或编辑仓库 -->
    <v-dialog v-model="dialog" max-width="400" scrollable persistent>
      <v-card>
        <v-card-title>
          <span class="headline">{{ selectedRepo ? '编辑ID卡' : '新增仓库ID卡' }}</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="form" v-model="formValid">
            <v-text-field label="名称" v-model="repoForm.name" required :disabled="selectedRepo !== null" />
            <v-text-field label="仓库 URL" v-model="repoForm.repo_url" required :disabled="selectedRepo !== null" />
            <v-text-field label="分支" v-model="repoForm.branch" required />
            <v-text-field label="本地路径" v-model="repoForm.local_path" required :disabled="selectedRepo !== null" readonly @click="handleLocalPathClick" />
            <v-text-field label="用户名" v-model="repoForm.username" />
            <v-text-field label="密码" v-model="repoForm.password" type="password" />
            <v-textarea label="描述" v-model="repoForm.desc" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-tooltip text="取消">
            <template #activator="{ props }">
              <v-btn v-bind="props" text @click="closeDialog">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </template>
          </v-tooltip>
          <v-tooltip text="保存">
            <template #activator="{ props }">
              <v-btn v-bind="props" text @click="saveRepo" :disabled="!selectedRepo && (!repoForm.local_path || !localFolderValid)">
                <v-icon>mdi-content-save</v-icon>
              </v-btn>
            </template>
          </v-tooltip>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { listRepos, getRepo, createRepo, updateRepo, deleteRepo } from '../service/api'
import { generateAvatar } from '../components/AvatarGenerator'

// 获取 Vuex store 与 Vue Router 实例
const store = useStore()
const router = useRouter()

// computed 用于展现 snackbar 数据（减少不必要的更新）
const snackbar = computed(() => store.state.snackbar)

// 组件状态
const repos = ref([])
const dialog = ref(false)
const formValid = ref(false)
const selectedRepo = ref(null)
const localFolderValid = ref(true)

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

// 获取仓库列表（尽量用 async/await，提高可读性和错误处理能力）
const fetchRepos = async () => {
  try {
    const response = await listRepos()
    repos.value = response.data
  } catch (err) {
    console.error('获取仓库列表错误:', err)
  }
}

// 预览仓库内容，使用 Vue Router 进行跳转
const previewRepo = (item) => {
  const localPath = item.local_path
  const forceReplace = 'true'
  if (localPath) {
    router.push({
      name: 'finder',
      params: { localPath, forceReplace }
    })
  } else {
    alert('该仓库未配置本地路径')
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
    dialog.value = true
  } catch (err) {
    console.error('获取仓库详情错误:', err)
  }
}

// 保存仓库（判断更新或新增）
const saveRepo = async () => {
  try {
    if (selectedRepo.value) {
      // 更新操作：仅更新部分字段
      await updateRepo(selectedRepo.value.id, {
        repo_url: repoForm.repo_url,
        branch: repoForm.branch,
        local_path: repoForm.local_path,
        username: repoForm.username,
        password: repoForm.password,
        name: repoForm.name,
        desc: repoForm.desc
      })
    } else {
      // 新增操作：发送完整数据
      await createRepo({
        repo_url: repoForm.repo_url,
        branch: repoForm.branch,
        local_path: repoForm.local_path,
        username: repoForm.username,
        password: repoForm.password,
        name: repoForm.name,
        desc: repoForm.desc
      })
    }
    dialog.value = false
    fetchRepos()
  } catch (err) {
    console.error(selectedRepo.value ? '更新仓库错误:' : '新增仓库错误:', err)
  }
}

// 删除仓库操作
const deleteRepoo = async (item) => {
  if (confirm(`确定删除仓库 ${item.name}?`)) {
    try {
      await deleteRepo(item.id)
      fetchRepos()
    } catch (err) {
      console.error('删除仓库错误:', err)
    }
  }
}

// 关闭对话框
const closeDialog = () => {
  dialog.value = false
}

// 获取头像图标（利用外部生成函数）
const getAvatarIcon = (repoId) => {
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
  console.log('Local Path Clicked')

  try {
    const result = await window.electron.invoke('dialog:openDirectory', {
      defaultPath: repoForm.local_path,
      properties: ['openDirectory']
    })
    if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0]
      const fs = await window.electron.fs
      const path = await window.electron.path
      if (!fs || !path) {
        console.error('无法加载 fs 或 path 模块')
        return
      }
      // 判断选中文件夹是否为空
      const folderContent = fs.readdirSync(selectedPath)
      if (folderContent.length === 0) {
        repoForm.local_path = selectedPath
        store.dispatch('snackbar/showSnackbar', {
          message: "选中的文件夹为空，直接使用该目录。",
          type: 'info'
        })
      } else {
        // 文件夹不为空，自动创建子文件夹
        const newFolderPath = path.join(selectedPath, repoForm.name)
        if (!fs.existsSync(newFolderPath)) {
          fs.mkdirSync(newFolderPath)
          store.dispatch('snackbar/showSnackbar', {
            message: "已自动创建 " + newFolderPath + " 文件夹",
            type: 'info'
          })
        }
        repoForm.local_path = newFolderPath
      }
      localFolderValid.value = true
    }
  } catch (err) {
    console.error(err)
  }
}

onMounted(() => {
  fetchRepos()
})
</script>

<style scoped>
/* 身份证卡片样式 */
.id-card {
  width: 600px;
  height: 360px;
  margin: 10px;
  padding: 20px;
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
  background: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%239C92AC' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E") repeat;
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
</style>
