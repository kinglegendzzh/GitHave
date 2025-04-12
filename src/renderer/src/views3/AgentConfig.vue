<template>
  <v-container>
    <!-- Card：企微推送智能体 -->
    <v-card outlined class="pa-4 mb-4">
      <v-card-title class="d-flex align-center justify-space-between">
        <span class="headline">📳 企微推送智能体</span>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="saveConfig">保存配置</v-btn>
        </v-card-actions>
      </v-card-title>
      <v-card-text>
        <v-form ref="form" v-model="valid">
          <v-expansion-panels multiple>
            <!-- 基本设置：新增 plugin_cron 支持 -->
            <v-expansion-panel>
              <v-expansion-panel-title>⚙️ 基本设置</v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-textarea
                  label="消息头 (Header Template)"
                  v-model="config.headerTemplate"
                  outlined
                  rows="5"
                ></v-textarea>
                <v-textarea
                  label="消息脚 (Footer Template)"
                  v-model="config.footerTemplate"
                  outlined
                  rows="3"
                ></v-textarea>
                <v-text-field
                  label="上下文智能截取 (Context Window)"
                  v-model="config.context_window"
                  outlined
                ></v-text-field>
                <!-- 新增：插件定时任务配置 -->
                <v-text-field
                  label="GitHunt 心跳频率"
                  v-model="config.plugin_cron.GitHunt"
                  outlined
                ></v-text-field>
                <v-text-field
                  label="GitSummary 代码周报定时任务"
                  v-model="config.plugin_cron.GitSummary"
                  outlined
                ></v-text-field>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <!-- 仓库配置 -->
            <v-expansion-panel>
              <v-expansion-panel-title>⏰ 轮询监听代码仓库</v-expansion-panel-title>
              <v-expansion-panel-text>
                <!-- 已配置仓库列表 -->
                <v-row>
                  <v-col
                    v-for="(repo, index) in config.repos"
                    :key="index"
                    cols="12"
                    md="6"
                  >
                    <v-card class="ma-2" style="max-width: 300px; min-width: 300px;">
                      <v-card-title>
                        {{ repo.Name || ('Repo ' + (index + 1)) }}
                      </v-card-title>
                      <v-card-subtitle>
                        {{ repo.RepoURL }}
                      </v-card-subtitle>
                      <v-card-actions>
                        <v-btn small text color="primary" @click="openRepoDialog(repo, index)">
                          详情
                        </v-btn>
                        <v-spacer></v-spacer>
                        <v-btn icon small color="red" @click="deleteRepo(index)">
                          <v-icon>mdi-delete</v-icon>
                        </v-btn>
                      </v-card-actions>
                    </v-card>
                  </v-col>
                </v-row>
                <!-- 导入与添加仓库按钮 -->
                <v-btn color="success" class="mt-3 mr-2" @click="openImportDialog" outlined>
                  💳 从仓库身份证一键导入
                </v-btn>
                <v-btn color="primary" class="mt-3" @click="addRepo" outlined>
                  添加仓库
                </v-btn>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <!-- 其它设定：AI评价语气风格设定 -->
            <v-expansion-panel>
              <v-expansion-panel-title>🤖 AI评价语气风格</v-expansion-panel-title>
              <v-expansion-panel-text>
                <Suspense>
                  <TonePieChart v-model="config.mode_ranges" />
                </Suspense>
                <!-- 新增：语气设置编辑区域 -->
                <v-divider class="my-3"></v-divider>
                <div>
                  <h3>编辑语气设置</h3>
                  <v-row v-for="(item, index) in config.mode_ranges" :key="index" class="mb-2">
                    <v-col cols="4">
                      <v-text-field
                        label="最小值"
                        v-model.number="config.mode_ranges[index].min"
                        type="number"
                      />
                    </v-col>
                    <v-col cols="8">
                      <v-text-field
                        label="语气描述"
                        v-model="config.mode_ranges[index].mode"
                      />
                    </v-col>
                  </v-row>
                </div>
                <v-btn color="primary" class="mt-3" @click="addModeRange" outlined>添加语气</v-btn>
                <v-btn color="error" class="mt-3" @click="removeModeRange" :disabled="config.mode_ranges.length <= 1"
                       outlined>删除语气
                </v-btn>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <!-- AI消息总结语气风格设定 -->
            <v-expansion-panel>
              <v-expansion-panel-title>👾 AI消息总结语气风格</v-expansion-panel-title>
              <v-expansion-panel-text>
                <Suspense>
                    <TonePieChart v-model="config.mode_ranges_second" />
                </Suspense>
                <!-- 新增：语气设置编辑区域 -->
                <v-divider class="my-3"></v-divider>
                <div>
                  <h3>编辑语气设置</h3>
                  <v-row v-for="(item, index) in config.mode_ranges_second" :key="index" class="mb-2">
                    <v-col cols="4">
                      <v-text-field
                        label="最小值"
                        v-model.number="config.mode_ranges_second[index].min"
                        type="number"
                      />
                    </v-col>
                    <v-col cols="8">
                      <v-text-field
                        label="语气描述"
                        v-model="config.mode_ranges_second[index].mode"
                      />
                    </v-col>
                  </v-row>
                </div>
                <v-btn color="primary" class="mt-3" @click="addModeRangeSecond" outlined>添加语气</v-btn>
                <v-btn color="error" class="mt-3" @click="removeModeRangeSecond"
                       :disabled="config.mode_ranges_second.length <= 1" outlined>删除语气
                </v-btn>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-form>
      </v-card-text>
    </v-card>

    <!-- Card：分析报告智能体 -->
    <v-card outlined class="pa-4">
      <v-card-title class="d-flex align-center justify-space-between">
        <v-card-title class="headline">📃 分析报告智能体</v-card-title>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="saveConfig">保存配置</v-btn>
        </v-card-actions>
      </v-card-title>
      <v-card-text>
        <v-form ref="reportForm" v-model="validReport">
          <v-textarea
            label="代码分析报告提示词"
            v-model="config.code_reports"
            outlined
            rows="5"
          />
        </v-form>
      </v-card-text>
    </v-card>

    <!-- 仓库详情弹窗 -->
    <v-dialog v-model="repoDialog" max-width="600px">
      <v-card>
        <v-card-title>
          <span class="headline">仓库详情</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="repoForm">
            <v-text-field label="名称" v-model="selectedRepo.Name" outlined />
            <v-text-field label="代码地址" v-model="selectedRepo.RepoURL" outlined />
            <v-text-field label="用户名" v-model="selectedRepo.Username" outlined />
            <v-text-field label="密码" v-model="selectedRepo.Password" outlined type="password" />
            <v-text-field label="分支" v-model="selectedRepo.Branch" outlined />
            <v-text-field label="本地路径" v-model="selectedRepo.LocalPath" outlined @click="handleLocalPathClick" />
            <v-text-field label="描述" v-model="selectedRepo.Desc" outlined />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn color="blue darken-1" text @click="closeRepoDialog">取消</v-btn>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="saveRepoDialog">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 仓库导入弹窗 -->
    <v-dialog v-model="importDialog" max-width="600px">
      <v-card width="800px">
        <v-card-title>
          <span class="headline">选择要导入的仓库</span>
        </v-card-title>
        <v-card-text>
          <v-list>
            <v-list-item
              v-for="item in importReposList"
              :key="item.id"
              class="d-flex justify-space-between align-center"
            >
              <!-- 左侧文本区域 -->
              <div class="text-body-1">
                {{ item.name || item.repo_url }} ({{ item.desc }})
              </div>
              <!-- 右侧操作区域：复选框 -->
              <div>
                <v-checkbox
                  v-model="selectedImportRepoIds"
                  :value="item.id"
                  hide-details
                />
              </div>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-btn text color="blue darken-1" @click="closeImportDialog">
            取消
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn text color="blue darken-1" @click="confirmImport">
            确定导入
          </v-btn>
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
import { getConfig, updateConfig, listRepos, getRepo } from '../service/api'
import { defineAsyncComponent } from 'vue';

// 异步加载 TonePieChart 组件
const TonePieChart = defineAsyncComponent(() =>
  import('../components/TonePieChart.vue')
);

// 如果需要向父组件 emit 事件，可用 defineEmits
const emit = defineEmits(['config-saved'])

const store = useStore()
const snackbar = computed(() => store.state.snackbar)

const valid = ref(true)
const validReport = ref(true)
const repoDialog = ref(false)
const importDialog = ref(false)
const importReposList = ref([])
const selectedImportRepoIds = ref([])
const selectedRepo = ref({})
const selectedRepoIndex = ref(-1)

const config = reactive({
  webhook_url: '',
  key: '',
  listen_ip: '',
  listen_port: '',
  cron_spec: '',
  plugin_cron: {
    GitHunt: '',
    GitSummary: ''
  },
  headerTemplate: '',
  footerTemplate: '',
  repos: [],
  context_window: '',
  mode_ranges: [
    { min: 90, mode: '无厘头' },
    { min: 80, mode: '搞笑' },
    { min: 60, mode: '悬疑' },
    { min: 40, mode: '黑色幽默' },
    { min: 20, mode: '浮夸' },
    { min: 0, mode: '严肃' }
  ],
  message_templates: {},
  mode_ranges_second: [
    { min: 90, mode: '无厘头' },
    { min: 80, mode: '搞笑' },
    { min: 60, mode: '悬疑' },
    { min: 40, mode: '黑色幽默' },
    { min: 20, mode: '浮夸' },
    { min: 0, mode: '严肃' }
  ],
  code_reports: ''
})

const fetchConfig = async () => {
  try {
    const response = await getConfig()
    if (response && response.data) {
      const data = response.data
      config.webhook_url = data.webhook_url || ''
      config.key = data.key || ''
      config.listen_ip = data.listen_ip || ''
      config.listen_port = data.listen_port || ''
      config.cron_spec = data.cron_spec || ''
      config.plugin_cron = data.plugin_cron || { GitHunt: '', GitSummary: '' }
      config.headerTemplate = data.headerTemplate || ''
      config.footerTemplate = data.footerTemplate || ''
      config.repos = data.repos || []
      config.context_window = data.context_window || ''
      config.mode_ranges = (data.mode_ranges && data.mode_ranges.length)
        ? data.mode_ranges
        : [
          { min: 90, mode: '无厘头' },
          { min: 80, mode: '搞笑' },
          { min: 60, mode: '悬疑' },
          { min: 40, mode: '黑色幽默' },
          { min: 20, mode: '浮夸' },
          { min: 0, mode: '严肃' }
        ]
      config.message_templates = data.message_templates || {}
      config.mode_ranges_second = (data.mode_ranges_second && data.mode_ranges_second.length)
        ? data.mode_ranges_second
        : [
          { min: 90, mode: '无厘头' },
          { min: 80, mode: '搞笑' },
          { min: 60, mode: '悬疑' },
          { min: 40, mode: '黑色幽默' },
          { min: 20, mode: '浮夸' },
          { min: 0, mode: '严肃' }
        ]
      config.code_reports = data.code_reports || ''
    }
  } catch (error) {
    console.error('获取配置失败：', error)
  }
}

const saveConfig = async () => {
  try {
    await updateConfig(config)
    emit('config-saved')
    alert('配置已保存！')
    await fetchConfig()
  } catch (error) {
    console.error('保存配置失败：', error)
  }
}

const addRepo = () => {
  config.repos.push({
    RepoURL: '',
    Username: '',
    Password: '',
    Branch: '',
    LocalPath: '',
    Name: '',
    Desc: ''
  })
}

const deleteRepo = (index) => {
  if (confirm(`是否确认删除该仓库?`)) {
    config.repos.splice(index, 1)
  }
}

const openRepoDialog = (repo, index) => {
  selectedRepo.value = { ...repo }
  selectedRepoIndex.value = index
  repoDialog.value = true
}

const closeRepoDialog = () => {
  repoDialog.value = false
  selectedRepo.value = {}
  selectedRepoIndex.value = -1
}

const saveRepoDialog = () => {
  config.repos.splice(selectedRepoIndex.value, 1, selectedRepo.value)
  closeRepoDialog()
}

const addModeRange = () => {
  config.mode_ranges.push({ min: 50, mode: '新模式' })
}

const removeModeRange = () => {
  if (config.mode_ranges.length > 1) {
    config.mode_ranges.pop()
  }
}

const addModeRangeSecond = () => {
  config.mode_ranges_second.push({ min: 50, mode: '新模式' })
}

const removeModeRangeSecond = () => {
  if (config.mode_ranges_second.length > 1) {
    config.mode_ranges_second.pop()
  }
}

const updateModeRanges = (newData) => {
  config.mode_ranges = newData
}

const updateModeRangesSecond = (newData) => {
  config.mode_ranges_second = newData
}

const handleLocalPathClick = async () => {
  if (!selectedRepo.value.Name || !selectedRepo.value.RepoURL) {
    alert('请先填写名称和仓库 URL')
    return
  }
  console.log('Local Path Clicked')
  try {
    const result = await window.electron.invoke('dialog:openDirectory', {
      defaultPath: selectedRepo.value.LocalPath,
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
      const folderContent = fs.readdirSync(selectedPath)
      if (folderContent.length === 0) {
        selectedRepo.value.LocalPath = selectedPath
        store.dispatch('snackbar/showSnackbar', {
          message: "选中的文件夹为空，直接使用该目录。",
          type: 'info'
        })
      } else {
        const newFolderPath = path.join(selectedPath, selectedRepo.value.Name)
        if (!fs.existsSync(newFolderPath)) {
          fs.mkdirSync(newFolderPath)
          store.dispatch('snackbar/showSnackbar', {
            message: "已自动创建 " + newFolderPath + " 文件夹",
            type: 'info'
          })
        }
        selectedRepo.value.LocalPath = newFolderPath
      }
    }
  } catch (err) {
    console.error(err)
  }
}

const openImportDialog = async () => {
  try {
    const response = await listRepos()
    importReposList.value = response.data || []
    selectedImportRepoIds.value = []
    importDialog.value = true
  } catch (error) {
    console.error("获取仓库列表失败：", error)
  }
}

const closeImportDialog = () => {
  importDialog.value = false
}

const confirmImport = async () => {
  for (const id of selectedImportRepoIds.value) {
    try {
      const resp = await getRepo(id)
      const data = resp.data
      const userDataPath = await window.electron.getUserDataPath()
      const localPath = await window.electron.path.join(userDataPath, data.name)
      console.log('create User Data Path:', localPath)
      const mappedRepo = {
        RepoURL: data.repo_url,
        Branch: data.branch,
        LocalPath: localPath,
        Username: data.username,
        Password: data.password,
        Name: data.name,
        Desc: data.desc
      }
      config.repos.push(mappedRepo)
    } catch (err) {
      console.error("获取仓库详情失败:", err)
    }
  }
  importDialog.value = false
}

onMounted(() => {
  fetchConfig()
})
</script>

<style scoped>
.v-expansion-panel-title {
  font-weight: 500;
}

.v-card-title.headline {
  font-size: 24px;
}
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}
.loading-svg {
  width: 80px;
  height: auto;
}
</style>
