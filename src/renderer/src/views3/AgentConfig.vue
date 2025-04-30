<template>
  <v-container>
    <v-container>
      <div class="news-tips">
        <tip-banner
          v-for="(item, idx) in messages"
          :key="idx"
          class="mt-2"
          :date="item.date"
          :message="item.message"
          :href="item.href"
        />
      </div>
    </v-container>
    <!-- 智能体卡片列表 -->
    <v-row class="mt-4 mr-4" justify="center">
      <!-- 企微提交记录推送智能体 -->
      <v-col cols="12" md="4">
        <v-card
          outlined
          class="agent-card mb-4"
          :elevation="hoveredCard === 'wechat' ? 8 : 2"
          @click="openAgentDialog('wechat')"
          @mouseover="hoveredCard = 'wechat'"
          @mouseleave="hoveredCard = null"
        >
          <v-card-title class="d-flex align-center">
            <v-icon large color="amber" class="mr-2">mdi-bell-ring</v-icon>
            <span class="headline">📳 企微提交记录推送智能体</span>
          </v-card-title>
          <v-card-subtitle>实时推送提交记录到企业微信群</v-card-subtitle>
          <v-card-text class="text-body-2">
            <div><strong>Webhook URL:</strong> {{ config.webhook_url ? '已配置' : '未配置' }}</div>
            <div><strong>仓库数量:</strong> {{ config.repos.length }}</div>
            <div><strong>心跳频率:</strong> {{ config.plugin_cron.GitHunt || '未设置' }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- 提交记录分析智能体 -->
      <v-col cols="12" md="4">
        <v-card
          outlined
          class="agent-card mb-4"
          :elevation="hoveredCard === 'analysis' ? 8 : 2"
          @click="openAgentDialog('analysis')"
          @mouseover="hoveredCard = 'analysis'"
          @mouseleave="hoveredCard = null"
        >
          <v-card-title class="d-flex align-center">
            <v-icon large color="grey" class="mr-2">mdi-file-document</v-icon>
            <span class="headline">📃 提交记录分析智能体</span>
          </v-card-title>
          <v-card-subtitle>对提交记录生成分析报告</v-card-subtitle>
          <v-card-text class="text-body-2">
            <div>
              <strong>报告路径:</strong> {{ config.reports_file_path ? '已配置' : '未配置' }}
            </div>
            <div><strong>CSV模板:</strong> {{ config.csv_file_template || '未设置' }}</div>
            <div><strong>报告模板:</strong> {{ config.doc_file_template || '未设置' }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- 仓库周刊智能体 -->
      <v-col cols="12" md="4">
        <v-card
          outlined
          class="agent-card mb-4"
          :elevation="hoveredCard === 'weekly' ? 8 : 2"
          @click="openAgentDialog('weekly')"
          @mouseover="hoveredCard = 'weekly'"
          @mouseleave="hoveredCard = null"
        >
          <v-card-title class="d-flex align-center">
            <v-icon large color="pink lighten-2" class="mr-2">mdi-calendar-text</v-icon>
            <span class="headline">📆 仓库周刊智能体</span>
          </v-card-title>
          <v-card-subtitle>生成仓库周报/周刊</v-card-subtitle>
          <v-card-text class="text-body-2">
            <div><strong>仓库数量:</strong> {{ config.repos_daily.length }}</div>
            <div><strong>周报频率:</strong> {{ config.plugin_cron.GitSummary || '未设置' }}</div>
            <div><strong>提示词:</strong> {{ config.prompt_daily ? '已配置' : '未配置' }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- 智能体配置对话框 -->
    <v-dialog v-model="agentDialog" max-width="900px" scrollable persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <span class="headline">{{ currentAgentTitle }}</span>
          <v-btn icon @click="agentDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider></v-divider>

        <v-card-text class="pt-4">
          <!-- 企微提交记录推送智能体配置 -->
          <div v-if="currentAgent === 'wechat'">
            <v-form ref="form" v-model="valid">
              <span class="text-h5 border-b mt-4 mr-4">工作流程</span>
              <EnterpriseAgent></EnterpriseAgent>
              <span class="text-h5 border-b mt-4 mr-4">智能体配置</span>
              <v-expansion-panels multiple>
                <!-- 基本设置：新增 plugin_cron 支持 -->
                <v-expansion-panel>
                  <v-expansion-panel-title>⚙️ 基本设置</v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-text-field
                      v-model="config.webhook_url"
                      label="企业微信机器人的WebhookUrl"
                      outlined
                    ></v-text-field>
                    <v-text-field
                      v-model="config.key"
                      label="企业微信机器人的Key(WebhookUrl后面的key=?)"
                      outlined
                    ></v-text-field>
                    <v-textarea
                      v-model="config.headerTemplate"
                      label="消息头 (Header Template)"
                      outlined
                      rows="5"
                    ></v-textarea>
                    <v-textarea
                      v-model="config.footerTemplate"
                      label="消息脚 (Footer Template)"
                      outlined
                      rows="3"
                    ></v-textarea>
                    <v-text-field
                      v-model="config.context_window"
                      label="上下文智能截取 (Context Window)"
                      outlined
                    ></v-text-field>
                    <!-- 新增：插件定时任务配置 -->
                    <v-text-field
                      v-model="config.plugin_cron.GitHunt"
                      label="GitHunt 心跳频率"
                      outlined
                    ></v-text-field>
                    <v-text-field
                      v-model="config.plugin_cron.GitSummary"
                      label="GitSummary 代码周报定时任务"
                      outlined
                    ></v-text-field>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <!-- 新增：文件消息发送设置 面板（改造版） -->
                <v-expansion-panel>
                  <v-expansion-panel-title>📁 文件消息发送设置</v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-row>
                      <!-- 贡献热力图 -->
                      <v-col cols="12" sm="4">
                        <v-menu
                          v-model="menu.heatmap"
                          offset-y
                          transition="scale-transition"
                          max-width="200"
                        >
                          <!-- 激活器：显示名称 + 当前状态 -->
                          <template #activator="{ props }">
                            <v-btn v-bind="props" variant="outlined" class="w-100 justify-start">
                              🔥 贡献热力图
                              <v-icon small class="ml-auto">
                                {{ config.files.send_wechat.heatmap ? 'mdi-bell' : 'mdi-bell-off' }}
                              </v-icon>
                              <v-icon small class="ml-1">
                                {{
                                  config.files.save.heatmap
                                    ? 'mdi-content-save'
                                    : 'mdi-content-save-off'
                                }}
                              </v-icon>
                            </v-btn>
                          </template>

                          <!-- 浮层内容：两个开关 -->
                          <v-card class="pa-3" flat>
                            <v-switch
                              v-model="config.files.send_wechat.heatmap"
                              label="是否发送至企业微信"
                            />
                            <v-switch
                              v-model="config.files.save.heatmap"
                              label="保存备份到'研究报告'"
                            />
                          </v-card>
                        </v-menu>
                      </v-col>

                      <!-- 提交分析报告（文档） -->
                      <v-col cols="12" sm="4">
                        <v-menu
                          v-model="menu.research"
                          offset-y
                          transition="scale-transition"
                          max-width="200"
                        >
                          <template #activator="{ props }">
                            <v-btn v-bind="props" variant="outlined" class="w-100 justify-start">
                              📄 分析报告
                              <v-icon small class="ml-auto">
                                {{
                                  config.files.send_wechat.research ? 'mdi-bell' : 'mdi-bell-off'
                                }}
                              </v-icon>
                              <v-icon small class="ml-1">
                                {{
                                  config.files.save.research
                                    ? 'mdi-content-save'
                                    : 'mdi-content-save-off'
                                }}
                              </v-icon>
                            </v-btn>
                          </template>
                          <v-card class="pa-3" flat>
                            <v-switch
                              v-model="config.files.send_wechat.research"
                              label="是否发送至企业微信"
                            />
                            <v-switch
                              v-model="config.files.save.research"
                              label="保存备份到'研究报告'"
                            />
                          </v-card>
                        </v-menu>
                      </v-col>

                      <!-- 提交修改明细（表格） -->
                      <v-col cols="12" sm="4">
                        <v-menu
                          v-model="menu.csv"
                          offset-y
                          transition="scale-transition"
                          max-width="200"
                        >
                          <template #activator="{ props }">
                            <v-btn v-bind="props" variant="outlined" class="w-100 justify-start">
                              📊 修改明细
                              <v-icon small class="ml-auto">
                                {{ config.files.send_wechat.csv ? 'mdi-bell' : 'mdi-bell-off' }}
                              </v-icon>
                              <v-icon small class="ml-1">
                                {{
                                  config.files.save.csv
                                    ? 'mdi-content-save'
                                    : 'mdi-content-save-off'
                                }}
                              </v-icon>
                            </v-btn>
                          </template>
                          <v-card class="pa-3" flat>
                            <v-switch
                              v-model="config.files.send_wechat.csv"
                              label="是否发送至企业微信"
                            />
                            <v-switch
                              v-model="config.files.save.csv"
                              label="保存备份到'研究报告'"
                            />
                          </v-card>
                        </v-menu>
                      </v-col>
                    </v-row>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <!-- 仓库配置 -->
                <v-expansion-panel>
                  <v-expansion-panel-title>⏰ 轮询监听代码仓库</v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <!-- 已配置仓库列表 -->
                    <v-row>
                      <v-col v-for="(repo, index) in config.repos" :key="index" cols="12" md="6">
                        <v-card class="ma-2" style="max-width: 300px; min-width: 300px">
                          <v-card-title>
                            {{ repo.Name || 'Repo ' + (index + 1) }}
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
                    <v-btn color="success" class="mt-3 mr-2" outlined @click="openImportDialog">
                      💳 从仓库身份证一键导入
                    </v-btn>
                    <v-btn color="primary" class="mt-3" outlined @click="addRepo"> 添加仓库 </v-btn>
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
                            v-model.number="config.mode_ranges[index].min"
                            label="最小值"
                            type="number"
                          />
                        </v-col>
                        <v-col cols="8">
                          <v-text-field v-model="config.mode_ranges[index].mode" label="语气描述" />
                        </v-col>
                      </v-row>
                    </div>
                    <v-btn color="primary" class="mt-3" outlined @click="addModeRange"
                      >添加语气</v-btn
                    >
                    <v-btn
                      color="error"
                      class="mt-3"
                      :disabled="config.mode_ranges.length <= 1"
                      outlined
                      @click="removeModeRange"
                      >删除语气
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
                      <v-row
                        v-for="(item, index) in config.mode_ranges_second"
                        :key="index"
                        class="mb-2"
                      >
                        <v-col cols="4">
                          <v-text-field
                            v-model.number="config.mode_ranges_second[index].min"
                            label="最小值"
                            type="number"
                          />
                        </v-col>
                        <v-col cols="8">
                          <v-text-field
                            v-model="config.mode_ranges_second[index].mode"
                            label="语气描述"
                          />
                        </v-col>
                      </v-row>
                    </div>
                    <v-btn color="primary" class="mt-3" outlined @click="addModeRangeSecond"
                      >添加语气</v-btn
                    >
                    <v-btn
                      color="error"
                      class="mt-3"
                      :disabled="config.mode_ranges_second.length <= 1"
                      outlined
                      @click="removeModeRangeSecond"
                      >删除语气
                    </v-btn>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-form>
          </div>

          <!-- 提交记录分析智能体配置 -->
          <div v-if="currentAgent === 'analysis'">
            <v-form ref="reportForm" v-model="validReport">
              <span class="text-h5 border-b mt-4 mr-4">工作流程</span>
              <SubmitAnalysisAgent></SubmitAnalysisAgent>
              <span class="text-h5 border-b mt-4 mr-4">智能体配置</span>
              <v-textarea
                v-model="config.code_reports"
                label="提交记录分析报告提示词"
                outlined
                rows="5"
              />
              <v-text-field
                v-model="config.reports_file_path"
                label="文件备份路径"
                @click="handleFileLocalPathClick"
              />
              <v-text-field v-model="config.csv_file_template" label="提交记录修改明细文件名" />
              <v-text-field v-model="config.doc_file_template" label="提交记录分析报告文件名" />
            </v-form>
          </div>

          <!-- 仓库周刊智能体配置 -->
          <div v-if="currentAgent === 'weekly'">
            <v-form ref="weeklyForm" v-model="validWeekly">
              <!-- 周刊提示词 -->
              <v-textarea
                v-model="config.prompt_daily"
                label="周刊提示词 (Prompt)"
                outlined
                rows="4"
              />

              <!-- 周刊仓库列表（结构与 config.repos 完全一致） -->
              <v-row>
                <v-col
                  v-for="(repo, index) in config.repos_daily"
                  :key="'weekly-' + index"
                  cols="12"
                  md="6"
                >
                  <v-card class="ma-2" style="max-width: 300px; min-width: 300px">
                    <v-card-title>
                      {{ repo.Name || 'Repo ' + (index + 1) }}
                    </v-card-title>
                    <v-card-subtitle>
                      {{ repo.RepoURL }}
                    </v-card-subtitle>
                    <v-card-actions>
                      <v-btn small text color="primary" @click="openWeeklyRepoDialog(repo, index)">
                        详情
                      </v-btn>
                      <v-spacer></v-spacer>
                      <v-btn icon small color="red" @click="deleteWeeklyRepo(index)">
                        <v-icon>mdi-delete</v-icon>
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-col>
              </v-row>
              <v-btn
                color="error"
                class="mt-3 mr-2"
                outlined
                @click="openImportDialog('repos_daily')"
              >
                💳 从仓库身份证一键订阅周刊
              </v-btn>
              <v-btn color="warning" class="mt-3" outlined @click="addWeeklyRepo"> 手动订阅 </v-btn>
            </v-form>
          </div>
        </v-card-text>

        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="saveConfig">保存配置</v-btn>
          <v-btn text @click="agentDialog = false">关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 仓库详情弹窗 -->
    <v-dialog v-model="repoDialog" max-width="600px" scrollable persistent>
      <v-card>
        <v-card-title>
          <span class="headline">仓库详情</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="repoForm">
            <v-text-field v-model="selectedRepo.Name" label="名称" outlined />
            <v-text-field v-model="selectedRepo.RepoURL" label="代码地址" outlined />
            <v-text-field v-model="selectedRepo.Username" label="用户名" outlined />
            <v-text-field v-model="selectedRepo.Password" label="密码" outlined type="password" />
            <v-text-field v-model="selectedRepo.Branch" label="分支" outlined />
            <v-text-field
              v-model="selectedRepo.LocalPath"
              label="本地路径"
              outlined
              @click="handleLocalPathClick"
            />
            <v-text-field v-model="selectedRepo.Desc" label="描述" outlined />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn color="blue darken-1" text @click="closeRepoDialog">取消</v-btn>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="saveRepoDialog">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 共享导入弹窗（常规仓库 & 周报仓库复用） -->
    <v-dialog
      v-model="importDialog"
      max-width="640px"
      transition="dialog-bottom-transition"
      scrollable
      persistent
    >
      <v-card class="rounded-xl elevation-3">
        <!-- 顶部标题工具栏 -->
        <v-toolbar flat color="primary" class="rounded-t-xl">
          <v-toolbar-title class="text-h6 font-weight-medium white--text"
            >选择要导入的仓库</v-toolbar-title
          >
          <v-spacer></v-spacer>
          <v-btn icon dark @click="closeImportDialog">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>

        <!-- 可滚动列表区域 -->
        <v-card-text class="py-0">
          <v-list class="dialog-list">
            <v-list-item v-for="item in importReposList" :key="item.id" three-line class="border-b">
              <v-list-item>
                <v-list-item-title class="text-body-1 font-weight-medium">
                  {{ item.name || item.repo_url }}
                </v-list-item-title>
                <v-list-item-subtitle class="mt-1 text--secondary">
                  {{ item.desc || '暂无描述' }}
                </v-list-item-subtitle>
              </v-list-item>
              <!-- 右侧复选框 -->
              <v-list-item-action>
                <v-checkbox
                  v-model="selectedImportRepoIds"
                  :value="item.id"
                  hide-details
                  color="primary"
                />
              </v-list-item-action>
            </v-list-item>
          </v-list>
        </v-card-text>

        <!-- 底部按钮 -->
        <v-card-actions class="justify-end px-6 pb-4 pt-2">
          <v-btn text color="primary" @click="closeImportDialog">取消</v-btn>
          <v-btn color="primary" dark @click="confirmImport">确定导入</v-btn>
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
import { defineAsyncComponent } from 'vue'
import TipBanner from '../components/TipBanner.vue'
import EnterpriseAgent from '../components/flow/EnterpriseAgent.vue'
import SubmitAnalysisAgent from "../components/flow/SubmitAnalysisAgent.vue";
// 新增 —— 请在同一 import 之后立刻加上
const agentDialog = ref(false) // 控制弹窗显隐
const currentAgent = ref('') // 记录当前选中的卡片 key
const hoveredCard = ref(null) // 控制卡片悬浮阴影

const currentAgentTitle = computed(() => {
  switch (currentAgent.value) {
    case 'wechat':
      return '企微提交记录推送智能体'
    case 'analysis':
      return '提交记录分析智能体'
    case 'weekly':
      return '仓库周刊智能体'
    default:
      return ''
  }
})
const menu = reactive({
  heatmap: false, // 控制热力图配置菜单
  research: false, // 控制分析报告配置菜单
  csv: false // 控制修改明细配置菜单
})

function openAgentDialog(agentKey) {
  currentAgent.value = agentKey
  agentDialog.value = true
}

// 异步加载 TonePieChart 组件
const TonePieChart = defineAsyncComponent(() => import('../components/TonePieChart.vue'))

// 如果需要向父组件 emit 事件，可用 defineEmits
const emit = defineEmits(['config-saved'])

const store = useStore()
const snackbar = computed(() => store.state.snackbar)

const valid = ref(true)
const validReport = ref(true)
const validWeekly = ref(true)
const repoDialog = ref(false)
const importDialog = ref(false)
const importReposList = ref([])
const selectedImportRepoIds = ref([])
const importTarget = ref('repos') // 'repos' | 'repos_daily'

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
  files: {
    send_wechat: {
      heatmap: true, // 是否发送贡献热力图
      research: true, // 是否发送提交分析报告
      csv: true // 是否发送提交修改明细
    },
    save: {
      heatmap: true, // 是否发送贡献热力图
      research: true, // 是否发送提交分析报告
      csv: true // 是否发送提交修改明细
    }
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
  code_reports: '',
  reports_file_path: '',
  csv_file_template: '',
  doc_file_template: '',
  repos_daily: [],
  prompt_daily: ''
})

/**
 * messages 数组现在包含：
 * - date: 独立时间字段
 * - message: 纯文本内容
 * - href: 跳转链接
 */
const messages = ref([
  {
    date: '2025.4.29',
    message:
      '📰 仓库周刊智能体现已上线，每周精选动态自动推送，不错过任何亮点，快为你的代码仓库订阅一份吧！',
    href: 'https://your.link/3'
  },
  {
    date: '2025.4.14',
    message: '📊 一键生成分析报告，快速洞察提交趋势！',
    href: 'https://your.link/2'
  },
  {
    date: '2025.4.1',
    message: '🚀 企微提交记录推送智能体已上线，提升团队协作效率，随时掌握最新代码动态！',
    href: 'https://your.link/1'
  }
])

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
      config.mode_ranges =
        data.mode_ranges && data.mode_ranges.length
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
      config.mode_ranges_second =
        data.mode_ranges_second && data.mode_ranges_second.length
          ? data.mode_ranges_second
          : [
              { min: 90, mode: '无厘头' },
              { min: 80, mode: '搞笑' },
              { min: 60, mode: '悬疑' },
              { min: 40, mode: '黑色幽默' },
              { min: 20, mode: '浮夸' },
              { min: 0, mode: '严肃' }
            ]
      ;(config.code_reports = data.code_reports || ''),
        (config.reports_file_path = data.reports_file_path || ''),
        (config.files = data.files || {})
      config.files.send_wechat = {
        heatmap: data.files?.send_wechat?.heatmap ?? false,
        research: data.files?.send_wechat?.research ?? false,
        csv: data.files?.send_wechat?.csv ?? false
      }
      config.files.save = {
        heatmap: data.files?.save?.heatmap ?? false,
        research: data.files?.save?.research ?? false,
        csv: data.files?.save?.csv ?? false
      }
      ;(config.csv_file_template = data.csv_file_template || ''),
        (config.doc_file_template = data.doc_file_template || ''),
        (config.repos_daily = data.repos_daily || [])
      config.prompt_daily = data.prompt_daily || ''
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

/* —— 仓库周刊智能体：仓库操作 —— */
const addWeeklyRepo = () => {
  config.repos_daily.push({
    RepoURL: '',
    Username: '',
    Password: '',
    Branch: '',
    LocalPath: '',
    Name: '',
    Desc: ''
  })
}

const deleteWeeklyRepo = (index) => {
  if (confirm(`是否确认删除该周刊仓库?`)) {
    config.repos_daily.splice(index, 1)
  }
}

/* 如需详情弹窗，可沿用同一个 repoDialog，示例： */
const openWeeklyRepoDialog = (repo, index) => {
  selectedRepo.value = { ...repo }
  selectedRepoIndex.value = index
  // 复用现有 Dialog
  repoDialog.value = true
}

const handleFileLocalPathClick = async () => {
  console.log('Local Path Clicked')
  try {
    const result = await window.electron.invoke('dialog:openDirectory', {
      defaultPath: config.reports_file_path,
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
      config.reports_file_path = selectedPath
    }
  } catch (err) {
    console.error(err)
  }
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
          message: '选中的文件夹为空，直接使用该目录。',
          type: 'info'
        })
      } else {
        const newFolderPath = path.join(selectedPath, selectedRepo.value.Name)
        if (!fs.existsSync(newFolderPath)) {
          fs.mkdirSync(newFolderPath)
          store.dispatch('snackbar/showSnackbar', {
            message: '已自动创建 ' + newFolderPath + ' 文件夹',
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

const openImportDialog = async (target = 'repos') => {
  try {
    const response = await listRepos()
    importReposList.value = response.data || []
    selectedImportRepoIds.value = []
    importTarget.value = target // 新增：记录导入目标
    importDialog.value = true
  } catch (e) {
    console.error('获取仓库列表失败：', e)
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
      const localPath = await window.electron.path.join(userDataPath, 'imports', data.name)
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
      if (importTarget.value === 'repos') {
        config.repos.push(mappedRepo) // 常规仓库
      } else {
        config.repos_daily.push(mappedRepo) // 周报仓库
      }
    } catch (err) {
      console.error('获取仓库详情失败:', err)
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

/* 新增：导入弹窗列表滚动 & 分隔线 */
.dialog-list {
  max-height: 420px;
  overflow-y: auto;
}
.border-b {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
/* 调整按钮圆角和间距 */
.v-card-actions > .v-btn + .v-btn {
  margin-left: 8px;
}
</style>
