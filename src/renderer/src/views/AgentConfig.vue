<template>
  <v-container>
<!--    <TonePieChart :mode-ranges="modeData"></TonePieChart>-->
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
                <TonePieChart v-model="config.mode_ranges"></TonePieChart>
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
                      ></v-text-field>
                    </v-col>
                    <v-col cols="8">
                      <v-text-field
                        label="语气描述"
                        v-model="config.mode_ranges[index].mode"
                      ></v-text-field>
                    </v-col>
                  </v-row>
                </div>
                <v-btn color="primary" class="mt-3" @click="addModeRange" outlined>添加语气</v-btn>
                <v-btn color="error" class="mt-3" @click="removeModeRange" :disabled="config.mode_ranges.length <= 1" outlined>删除语气</v-btn>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <!-- AI消息总结语气风格设定 -->
            <v-expansion-panel>
              <v-expansion-panel-title>👾 AI消息总结语气风格</v-expansion-panel-title>
              <v-expansion-panel-text>
                <TonePieChart v-model="config.mode_ranges_second"></TonePieChart>
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
                      ></v-text-field>
                    </v-col>
                    <v-col cols="8">
                      <v-text-field
                        label="语气描述"
                        v-model="config.mode_ranges_second[index].mode"
                      ></v-text-field>
                    </v-col>
                  </v-row>
                </div>
                <v-btn color="primary" class="mt-3" @click="addModeRangeSecond" outlined>添加语气</v-btn>
                <v-btn color="error" class="mt-3" @click="removeModeRangeSecond" :disabled="config.mode_ranges_second.length <= 1" outlined>删除语气</v-btn>
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
          ></v-textarea>
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
            <v-text-field label="名称" v-model="selectedRepo.Name" outlined></v-text-field>
            <v-text-field label="代码地址" v-model="selectedRepo.RepoURL" outlined></v-text-field>
            <v-text-field label="用户名" v-model="selectedRepo.Username" outlined></v-text-field>
            <v-text-field label="密码" v-model="selectedRepo.Password" outlined type="password"></v-text-field>
            <v-text-field label="分支" v-model="selectedRepo.Branch" outlined></v-text-field>
            <v-text-field label="本地路径" v-model="selectedRepo.LocalPath" outlined @click.native="handleLocalPathClick"></v-text-field>
            <v-text-field label="描述" v-model="selectedRepo.Desc" outlined></v-text-field>
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
                ></v-checkbox>
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

<script>
import { getConfig, updateConfig, listRepos, getRepo } from '../service/api.js'
import TonePieChart from '../components/TonePieChart.vue'

export default {
  name: 'AgentConfig',
  components: {
    TonePieChart,
  },
  computed: {
    snackbar() {
      return this.$store.state.snackbar;
    },
  },
  data() {
    return {
      modeData: [
        { min: 90, mode: '无厘头' },
        { min: 80, mode: '搞笑' },
        { min: 60, mode: '悬疑' },
        { min: 40, mode: '黑色幽默' },
        { min: 20, mode: '浮夸' },
        { min: 0, mode: '严肃' }
      ],
      valid: true,
      validReport: true,
      repoDialog: false,
      importDialog: false,          // 控制仓库导入弹窗
      importReposList: [],          // 存储从 API 获取的仓库列表
      selectedImportRepoIds: [],    // 存储用户选择的仓库 ID 数组
      selectedRepo: {},
      selectedRepoIndex: -1,
      config: {
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
        // AI评价语气风格设定
        mode_ranges: [
          { min: 90, mode: '无厘头' },
          { min: 80, mode: '搞笑' },
          { min: 60, mode: '悬疑' },
          { min: 40, mode: '黑色幽默' },
          { min: 20, mode: '浮夸' },
          { min: 0, mode: '严肃' }
        ],
        message_templates: {},
        // AI消息总结语气风格设定
        mode_ranges_second: [
          { min: 90, mode: '无厘头' },
          { min: 80, mode: '搞笑' },
          { min: 60, mode: '悬疑' },
          { min: 40, mode: '黑色幽默' },
          { min: 20, mode: '浮夸' },
          { min: 0, mode: '严肃' }
        ],
        code_reports: ''
      }
    }
  },
  mounted() {
    this.fetchConfig()
  },
  methods: {
    fetchConfig() {
      getConfig()
        .then(response => {
          this.config = response.data
          // 初始化配置项
          this.config.repos = this.config.repos || []
          this.config.plugin_cron = this.config.plugin_cron || { GitHunt: '', GitSummary: '' }
          this.config.mode_ranges = (this.config.mode_ranges && this.config.mode_ranges.length)
            ? this.config.mode_ranges
            : [
              { min: 90, mode: '无厘头' },
              { min: 80, mode: '搞笑' },
              { min: 60, mode: '悬疑' },
              { min: 40, mode: '黑色幽默' },
              { min: 20, mode: '浮夸' },
              { min: 0, mode: '严肃' }
            ]
          this.config.message_templates = this.config.message_templates || {}
          this.config.mode_ranges_second = (this.config.mode_ranges_second && this.config.mode_ranges_second.length)
            ? this.config.mode_ranges_second
            : [
              { min: 90, mode: '无厘头' },
              { min: 80, mode: '搞笑' },
              { min: 60, mode: '悬疑' },
              { min: 40, mode: '黑色幽默' },
              { min: 20, mode: '浮夸' },
              { min: 0, mode: '严肃' }
            ]
        })
        .catch(error => {
          console.error('获取配置失败：', error)
        })
    },
    saveConfig() {
      updateConfig(this.config)
        .then(() => {
          this.$emit('config-saved')
          alert('配置已保存！')
          this.fetchConfig()
        })
        .catch(error => {
          console.error('保存配置失败：', error)
        })
    },
    // 仓库操作
    addRepo() {
      this.config.repos.push({
        RepoURL: '',
        Username: '',
        Password: '',
        Branch: '',
        LocalPath: '',
        Name: '',
        Desc: ''
      })
    },
    deleteRepo(index) {
      if (confirm(`是否确认删除该仓库?`)) {
        this.config.repos.splice(index, 1)
      }
    },
    openRepoDialog(repo, index) {
      this.selectedRepo = Object.assign({}, repo)
      this.selectedRepoIndex = index
      this.repoDialog = true
    },
    closeRepoDialog() {
      this.repoDialog = false
      this.selectedRepo = {}
      this.selectedRepoIndex = -1
    },
    saveRepoDialog() {
      this.config.repos.splice(this.selectedRepoIndex, 1, this.selectedRepo)
      this.closeRepoDialog()
    },
    // AI评价语气风格设定操作
    addModeRange() {
      this.config.mode_ranges.push({ min: 50, mode: '新模式' })
    },
    removeModeRange() {
      if (this.config.mode_ranges.length > 1) {
        this.config.mode_ranges.pop()
      }
    },
    addModeRangeSecond() {
      this.config.mode_ranges_second.push({ min: 50, mode: '新模式' })
    },
    removeModeRangeSecond() {
      if (this.config.mode_ranges_second.length > 1) {
        this.config.mode_ranges_second.pop()
      }
    },
    updateModeRanges(newData) {
      this.config.mode_ranges = newData
    },
    updateModeRangesSecond(newData) {
      this.config.mode_ranges_second = newData
    },
    async handleLocalPathClick() {
      //todo 自动判断，如果目录为空，则自动创建‘仓库名称’文件夹；如果目录不为空，则视为该文件夹内存在代码分支记录，不进行如何处理
      if (!this.selectedRepo.Name || !this.selectedRepo.RepoURL) {
        alert('请先填写名称和仓库 URL');
        return;
      }
      console.log('Local Path Clicked');

      // 通过 IPC 调用主进程中的 'dialog:openDirectory' 接口
      await window.electron.invoke('dialog:openDirectory', {
        defaultPath: this.selectedRepo.LocalPath,
        properties: ['openDirectory']
      }).then(async result => {
        if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
          const selectedPath = result.filePaths[0];
          const fs = await window.electron.fs;
          const path = await window.electron.path;
          if (!fs || !path) {
            console.error('无法加载 fs 或 path 模块');
            return;
          }
          const folderContent = fs.readdirSync(selectedPath);
          if (folderContent.length === 0) {
            // 文件夹为空，不自动创建子文件夹，直接使用当前选择的路径
            this.selectedRepo.LocalPath = selectedPath;
            this.$store.dispatch('snackbar/showSnackbar', {
              message: "选中的文件夹为空，直接使用该目录。",
              type: 'info'
            });
          } else {
            const newFolderPath = path.join(selectedPath, this.selectedRepo.Name);
            if (!fs.existsSync(newFolderPath)) {
              fs.mkdirSync(newFolderPath);
              this.$store.dispatch('snackbar/showSnackbar', {
                message: "已自动创建 " + newFolderPath + " 文件夹",
                type: 'info'
              });
            }
            this.selectedRepo.LocalPath = newFolderPath;
          }
        }
      }).catch(err => {
        console.error(err);
      });
    },
    // 新增：打开仓库导入弹窗，并加载仓库列表
    openImportDialog() {
      listRepos()
        .then(response => {
          this.importReposList = response.data || []
          // 初始化已选中的仓库
          this.selectedImportRepoIds = []
          // 显示导入弹窗
          this.importDialog = true
        })
        .catch(error => {
          console.error("获取仓库列表失败：", error)
        })
    },
    closeImportDialog() {
      this.importDialog = false
    },
    // 用户确认后导入选中的仓库
    confirmImport() {
      // 对每个选中的仓库调用 getRepo 获取详情，然后添加到 config.repos
      this.selectedImportRepoIds.forEach(id => {
        getRepo(id)
          .then(async resp => {
            const data = resp.data;
            const userDataPath = await window.electron.getUserDataPath();
            const localPath = await window.electron.path.join(userDataPath, data.name)
            console.log('create User Data Path:', localPath);
            const mappedRepo = {
              RepoURL: data.repo_url,
              Branch: data.branch,
              LocalPath: localPath,
              Username: data.username,
              Password: data.password,
              Name: data.name,
              Desc: data.desc
            };
            this.config.repos.push(mappedRepo);
          })
          .catch(err => {
            console.error("获取仓库详情失败:", err);
          })
      });
      // 关闭导入弹窗
      this.importDialog = false;
    }
  }
}
</script>

<style scoped>
.v-expansion-panel-title {
  font-weight: 500;
}
.v-card-title.headline {
  font-size: 24px;
}
</style>
