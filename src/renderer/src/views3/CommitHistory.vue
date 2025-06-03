<template>
  <v-container>
    <v-card class="pa-2">
      <!-- 过滤表单 -->
      <v-form @submit.prevent="onSearch" class="mb-4">
        <v-row dense align="center" gutter="8">
          <v-col cols="12" sm="6" md="3">
            <v-autocomplete
              v-model="filter.repoID"
              :items="repos"
              :item-title="formatRepoTitle"
              item-value="id"
              label="仓库"
              :disabled="repos.length === 0"
              density="compact"
              hide-details
              @click="fetchRepos"
            />
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-select
              placeholder="branch 名称"
              v-model="filter.branch"
              :items="branchOptions"
              label="分支 / Branch"
              density="compact"
              variant="outlined"
              hide-details
            />
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="filter.start"
              label="开始时间"
              type="datetime-local"
              density="compact"
              hide-details
            />
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="filter.end"
              label="结束时间"
              type="datetime-local"
              density="compact"
              hide-details
            />
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="filter.author"
              label="作者"
              placeholder="author 名称"
              density="compact"
              hide-details
            />
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-btn
              class="mr-4"
              type="submit"
              :disabled="filter.repoID == null"
              color="primary"
              variant="outlined"
            >
              搜索
            </v-btn>
            <v-btn
              class="mr-4"
              color="grey"
              @click="resetFilter"
              variant="outlined"
            >
              重置
            </v-btn>
          </v-col>
        </v-row>
      </v-form>

      <v-row class="mb-4" align="center" justify="start">
        <v-col cols="auto">
          <v-btn
            color="primary"
            :disabled="selectedCommits.length === 0"
            @click="openCombinedDialog"
            density="compact"
            variant="outlined"
          >
            生成综合报告
          </v-btn>
        </v-col>
        <v-col cols="auto">
          <v-btn
            color="secondary"
            :disabled="selectedCommits.length === 0"
            @click="openCombinedDetailDialog"
            density="compact"
            variant="outlined"
          >
            生成综合明细
          </v-btn>
        </v-col>
        <v-col cols="auto">
          <v-btn
            color="black"
            @click="openMap1Dialog"
            :disabled="filter.repoID == null || isGeneratingChart"
            :loading="isGeneratingChart"
            density="compact"
            variant="outlined"
          >
            生成仓库提交贡献榜
          </v-btn>
        </v-col>
        <v-col cols="auto">
          <v-btn
            color="green"
            @click="openMap2Dialog"
            :disabled="filter.repoID == null || isGeneratingHeatmap"
            :loading="isGeneratingHeatmap"
            density="compact"
            variant="outlined"
          >
            生成提交活跃度·热力图
          </v-btn>
        </v-col>
        <v-col cols="auto">
          <v-tooltip bottom>
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                color="purple"
                @click="openAuthorMapDialog"
                density="compact"
                size="small"
                variant="outlined"
                icon="mdi-account-edit"
              >
              </v-btn>
            </template>
            <span>设置提交作者马甲</span>
          </v-tooltip>
        </v-col>
        <v-col cols="auto">
          <v-tooltip bottom>
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                color="orange"
                @click="clearCache"
                :disabled="filter.repoID == null"
                density="compact"
                size="small"
                variant="outlined"
                icon="mdi-cached"
              >
              </v-btn>
            </template>
            <span>清理该仓库的提交缓存（如果查询出现异常可尝试清理）</span>
          </v-tooltip>
        </v-col>
      </v-row>

      <!-- 提交列表 -->
      <v-data-table
        :headers="headers"
        :items="commits"
        :items-per-page="filter.pageSize"
        items-per-page-text="每页显示行数"
        :items-per-page-options="[20, 30, 50, 100, 150]"
        disable-items-per-page="false"
        class="elevation-1"
        density="compact"
        show-select
        v-model="selectedCommits"
        item-key="hash"
        return-object
      >
        <!-- Hash 列 -->
        <template #item.hash="{ item }">
          <v-tooltip interactive>
            <template #activator="{ props }">
              <span v-bind="props" class="text-truncate" style="max-width: 5%;">{{ omit(item.hash, 6) }}</span>
            </template>
            <span>{{ item.hash }}</span>
          </v-tooltip>
        </template>

        <!-- 时间 列 -->
        <template #item.time="{ item }">
          <v-tooltip interactive>
            <template #activator="{ props }">
              <span v-bind="props" class="text-truncate" style="max-width: 25%;">{{ formatTime(item.time) }}</span>
            </template>
            <span>{{ formatTime(item.time) }}</span>
          </v-tooltip>
        </template>

        <!-- 作者 列 -->
        <template #item.authorName="{ item }">
          <v-tooltip interactive>
            <template #activator="{ props }">
              <span v-bind="props" class="text-truncate" style="max-width: 15%;">{{ omit(formatAuthor(item.authorName, item.authorEmail), 10) }}</span>
            </template>
            <span>{{ formatAuthor(item.authorName, item.authorEmail) }}</span>
          </v-tooltip>
        </template>

        <!-- 信息 列 -->
        <template #item.message="{ item }">
          <v-tooltip interactive>
            <template #activator="{ props }">
              <span v-bind="props" class="text-truncate" style="max-width: 40%;">{{ omit(item.message,100) }}</span>
            </template>
            <span>{{ item.message }}</span>
          </v-tooltip>
        </template>
        <!-- 新增：actions 列 -->
        <template #item.actions="{ item }">
          <div style="display: flex;">
            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-btn v-bind="props" small variant="outlined"  color="success" class="mr-2" @click="checkCode(item)" density="compact" :loading="isCheckingCode === item.hash" :disabled="!!isCheckingCode && isCheckingCode !== item.hash">
                  查看代码
                </v-btn>
              </template>
              <span>查看并审查代码提交记录</span>
            </v-tooltip>
            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-btn v-bind="props" small variant="outlined" color="primary" class="mr-2" @click="openReportDialog(item)" density="compact">
                  生成报告
                </v-btn>
              </template>
              <span>生成提交记录分析报告，在 文件枢纽 中查看</span>
            </v-tooltip>
            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-btn v-bind="props" small variant="outlined" color="secondary" @click="openDetailDialog(item)" density="compact">
                  导出明细
                </v-btn>
              </template>
              <span>导出提交记录明细，在 文件枢纽 中查看</span>
            </v-tooltip>
          </div>
        </template> <!-- 新增 -->

        <!-- 无数据/加载骨架 -->
        <template #no-data>
          <div v-if="isLoading">
            <v-row class="mt-4" justify="center" style="display: block">
              <span class="text-grey text-h6">正在加载</span>
              <v-skeleton-loader
                type="list-item-three-line, list-item-three-line, list-item-three-line"
                style="width: 80%"
              />
            </v-row>
          </div>
          <div v-else>
            <v-row class="mt-4" justify="center" style="display: block; min-height: 100px;">
              <span class="text-grey text-h6">暂无数据</span>
            </v-row>
          </div>
        </template>
      </v-data-table>

      <!-- **** 批量确认对话框 **** -->
      <v-dialog v-model="confirmCombined" max-width="400">
        <v-card>
          <v-card-title class="text-h6">确认操作</v-card-title>
          <v-card-text>
            确定要为 <strong>{{ selectedCommits.length }}</strong> 条提交记录生成
            分析报告和修改明细吗？
          </v-card-text>
          <v-card-actions>
            <v-spacer/>
            <v-btn text @click="confirmCombined = false">取消</v-btn>
            <v-btn color="primary" text @click="handleCombinedConfirm">确认</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- **** 单条报告确认对话框 **** -->
      <v-dialog v-model="confirmReport" max-width="400">
        <v-card>
          <v-card-title class="text-h6">确认操作</v-card-title>
          <v-card-text>
            确定要为提交 <strong>{{ currentItem?.message }}</strong> 生成分析报告吗？
          </v-card-text>
          <v-card-actions>
            <v-spacer/>
            <v-btn text @click="confirmReport = false">取消</v-btn>
            <v-btn color="primary" text @click="handleReportConfirm">确认</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- **** 单条明细确认对话框 **** -->
      <v-dialog v-model="confirmDetail" max-width="400">
        <v-card>
          <v-card-title class="text-h6">确认操作</v-card-title>
          <v-card-text>
            确定要为提交 <strong>{{ currentItem?.message }}</strong> 生成修改明细吗？
          </v-card-text>
          <v-card-actions>
            <v-spacer/>
            <v-btn text @click="confirmDetail = false">取消</v-btn>
            <v-btn color="primary" text @click="handleDetailConfirm">确认</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- **** 批量明细确认对话框 **** -->
      <v-dialog v-model="confirmCombinedDetail" max-width="400">
        <v-card>
          <v-card-title class="text-h6">确认操作</v-card-title>
          <v-card-text>
            确定要为 <strong>{{ selectedCommits.length }}</strong> 条提交记录生成
            综合修改明细吗？
          </v-card-text>
          <v-card-actions>
            <v-spacer/>
            <v-btn text @click="confirmCombinedDetail = false">取消</v-btn>
            <v-btn color="primary" text @click="handleCombinedDetailConfirm">确认</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- **** 作者马甲设置对话框 **** -->
      <v-dialog v-model="showAuthorMapDialog" max-width="800">
        <v-card>
          <v-card-title class="text-h6 d-flex align-center">
            <v-icon class="mr-2">mdi-account-edit</v-icon>
            提交作者马甲设置
          </v-card-title>
          <v-card-text>
            <div class="mb-4">
              <v-row align="center">
                <v-col cols="5">
                  <v-text-field
                    v-model="newAuthorMapping.original"
                    label="原始作者名"
                    density="compact"
                    variant="outlined"
                    placeholder="输入原始作者名"
                  />
                </v-col>
                <v-col cols="5">
                  <v-text-field
                    v-model="newAuthorMapping.alias"
                    label="马甲名称"
                    density="compact"
                    variant="outlined"
                    placeholder="输入马甲名称"
                  />
                </v-col>
                <v-col cols="2">
                  <v-btn
                    color="primary"
                    @click="addAuthorMapping"
                    :disabled="!newAuthorMapping.original || !newAuthorMapping.alias"
                    density="compact"
                    variant="outlined"
                  >
                    添加
                  </v-btn>
                </v-col>
              </v-row>
            </div>
            
            <v-divider class="mb-4"></v-divider>
            
            <div v-if="Object.keys(authorNameMap).length === 0" class="text-center text-grey py-4">
              暂无作者马甲设置
            </div>
            
            <div v-else>
              <v-list density="compact">
                <v-list-item
                  v-for="(alias, original) in authorNameMap"
                  :key="original"
                  class="border mb-2 rounded"
                >
                  <template #prepend>
                    <v-icon>mdi-account</v-icon>
                  </template>
                  
                  <v-list-item-title>
                    <strong>{{ original }}</strong> → {{ alias }}
                  </v-list-item-title>
                  
                  <template #append>
                    <v-btn
                      icon="mdi-pencil"
                      size="small"
                      variant="text"
                      @click="editAuthorMapping(original, alias)"
                    ></v-btn>
                    <v-btn
                      icon="mdi-delete"
                      size="small"
                      variant="text"
                      color="error"
                      @click="deleteAuthorMapping(original)"
                    ></v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer/>
            <v-btn text @click="closeAuthorMapDialog">取消</v-btn>
            <v-btn color="primary" text @click="saveAuthorMap" :loading="isSavingAuthorMap">保存</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- **** 编辑作者马甲对话框 **** -->
      <v-dialog v-model="showEditAuthorDialog" max-width="400">
        <v-card>
          <v-card-title class="text-h6">编辑作者马甲</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="editingAuthor.original"
              label="原始作者名"
              density="compact"
              variant="outlined"
              readonly
              class="mb-3"
            />
            <v-text-field
              v-model="editingAuthor.alias"
              label="马甲名称"
              density="compact"
              variant="outlined"
              placeholder="输入新的马甲名称"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer/>
            <v-btn text @click="showEditAuthorDialog = false">取消</v-btn>
            <v-btn color="primary" text @click="updateAuthorMapping" :disabled="!editingAuthor.alias">更新</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- **** 热力图选择对话框 **** -->
      <v-dialog v-model="showHeatmapDialog" max-width="600">
        <v-card>
          <v-card-title class="text-h6 d-flex align-center">
            <v-icon class="mr-2">mdi-chart-box</v-icon>
            生成提交活跃度热力图
          </v-card-title>
          <v-card-text>
            <v-radio-group v-model="heatmapType" class="mb-4">
              <v-radio
                label="生成整个仓库所有提交人的热力图"
                value="all"
                color="primary"
              ></v-radio>
              <v-radio
                label="生成指定提交人的热力图"
                value="selected"
                color="primary"
              ></v-radio>
            </v-radio-group>
            
            <v-expand-transition>
              <div v-if="heatmapType === 'selected'">
                <v-divider class="mb-4"></v-divider>
                <v-chip-group
                  v-model="selectedHeatmapAuthors"
                  multiple
                  column
                  class="mb-4"
                >
                  <v-chip
                    v-for="author in heatmapAuthors"
                    :key="author"
                    :value="author"
                    filter
                    variant="outlined"
                    color="primary"
                  >
                    {{ authorNameMap[author] ? authorNameMap[author] + '(' + author + ')' : author }}
                  </v-chip>
                </v-chip-group>
                
                <v-alert
                  v-if="selectedHeatmapAuthors.length === 0"
                  type="info"
                  variant="tonal"
                  density="compact"
                  class="mb-4"
                >
                  请选择至少一个作者
                </v-alert>
                
                <v-alert
                  v-else
                  type="success"
                  variant="tonal"
                  density="compact"
                  class="mb-4"
                >
                  已选择 {{ selectedHeatmapAuthors.length }} 个作者：{{ selectedHeatmapAuthors.map(author => authorNameMap[author] || author).join('、') }}
                </v-alert>
              </div>
            </v-expand-transition>
          </v-card-text>
          <v-card-actions>
            <v-spacer/>
            <v-btn text @click="closeHeatmapDialog">取消</v-btn>
            <v-btn 
              color="primary" 
              text 
              @click="generateHeatmapWithOptions"
              :disabled="heatmapType === 'selected' && selectedHeatmapAuthors.length === 0"
              :loading="isGeneratingHeatmap"
            >
              生成热力图
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card>
    <DiffViewer
      v-model:visible="showDiffViewer"
      :commit-record="diffCommitRecord"
    />
    <AnalysisReportModal
      v-model="showAnalysisModal"
      :repo-i-d="String(filter.repoID)"
      :target-path="''"
      :scope-text="`提交记录 ${analysisCommitRecord?.[0]?.Hash?.substring(0, 8)} 分析报告`"
      :whole-repo="false"
      api="commitsResearch"
      :count="analysisCommitRecord?.[0]?.FileDiffs?.length || 0"
      :commit-record="analysisCommitRecord"
    />
    <v-snackbar
      v-model="snackbar.show"
      :timeout="snackbar.timeout"
      :color="snackbar.color"
      top
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { listRepos, filterCommits, listBranches, enrichFileDiffs, clearCommitsCache, exportCommitDetails, generateHeatmap, generateContributionChart, getConfig, updateConfig } from "../service/api.js";
import {
  VCard,
  VForm,
  VRow,
  VCol,
  VSelect,
  VTextField,
  VBtn,
  VDataTable,
  VSkeletonLoader,
  VTooltip,
  VSnackbar,
  VIcon,
} from 'vuetify/components'
import { useStore } from "vuex";
import DiffViewer from './DiffViewer.vue'
import AnalysisReportModal from '../components/ai/AnalysisReportModal.vue'
import { CommitRecord } from '../types/commit.js'
const showDiffViewer = ref(false)
const diffCommitRecord = ref<CommitRecord | null>(null)
const showAnalysisModal = ref(false)
// 将analysisCommitRecord的类型从CommitRecord | null改为CommitRecord[] | null
const analysisCommitRecord = ref<CommitRecord[] | null>(null)
const isCheckingCode = ref<string | null>(null) // 用于跟踪正在加载的 commit hash
const isGeneratingChart = ref(false) // 用于跟踪贡献榜生成状态
const isGeneratingHeatmap = ref(false) // 用于跟踪热力图生成状态


 // 用来控制错误提示
 const snackbar = reactive({
   show: false as boolean,
   message: '' as string,
   timeout: 3000 as number,
   color: 'info' as string,
 })

const repos = ref<Array<{ id: number; name: string }>>([])
const commits = ref<Array<{ hash: string; authorName: string; authorEmail: string; message: string; time: string }>>([])
const selectedCommits = ref<typeof commits.value>([])
const total = ref<number>(0)
const isLoading = ref(false)
const confirmCombined = ref(false)    // 批量确认框
const confirmReport   = ref(false)    // 单条报告确认框
const confirmDetail   = ref(false)    // 单条明细确认框
const confirmCombinedDetail = ref(false) // 批量明细确认框
const currentItem = ref<typeof commits.value[0] | null>(null) // 暂存当前行

const branchOptions = ref<string[]>([])

// 作者马甲相关变量
const showAuthorMapDialog = ref(false)
const showEditAuthorDialog = ref(false)
const authorNameMap = ref<Record<string, string>>({})
const isSavingAuthorMap = ref(false)
const newAuthorMapping = reactive({
  original: '',
  alias: ''
})
const editingAuthor = reactive({
  original: '',
  alias: ''
})

// 热力图选择相关变量
const showHeatmapDialog = ref(false)
const heatmapAuthors = ref<string[]>([])
const selectedHeatmapAuthors = ref<string[]>([])
const heatmapType = ref<'all' | 'selected'>('all')

const filter = reactive({
  repoID: null as number | null,
  branch: '' as string,
  start: '' as string,
  end: '' as string,
  author: '' as string,
  page: 1 as number,
  pageSize: 20 as number,
})

// 在 onMounted 中从 localStorage 初始化 repoID 和 branch
onMounted(() => {
  // 先检查新的localStorage结构
  let savedSelections = localStorage.getItem('repoSelections');
  let lastRepoID: number | null = null;
  
  // 如果没有新结构，检查旧的localStorage并迁移
  if (!savedSelections) {
    const oldSelection = localStorage.getItem('repoSelection');
    if (oldSelection) {
      try {
        const { repoID, branch } = JSON.parse(oldSelection);
        if (repoID) {
          // 迁移到新结构
          const newSelections = {};
          newSelections[repoID] = { repoID, branch: branch || '' };
          localStorage.setItem('repoSelections', JSON.stringify(newSelections));
          localStorage.removeItem('repoSelection'); // 清除旧数据
          savedSelections = JSON.stringify(newSelections);
          lastRepoID = repoID;
        }
      } catch (e) {
        console.error('迁移旧localStorage数据失败:', e);
        localStorage.removeItem('repoSelection');
      }
    }
  }
  
  if (savedSelections) {
    try {
      const repoSelections = JSON.parse(savedSelections);
      
      // 如果没有从迁移中获得lastRepoID，尝试从现有数据中找到最后使用的仓库
      if (!lastRepoID) {
        // 首先尝试从 lastUsedRepoID 中获取最后使用的仓库
        const savedLastRepoID = localStorage.getItem('lastUsedRepoID');
        if (savedLastRepoID) {
          const parsedLastRepoID = parseInt(savedLastRepoID, 10);
          // 确保这个仓库ID在repoSelections中存在
          if (repoSelections[parsedLastRepoID]) {
            lastRepoID = parsedLastRepoID;
          }
        }
        
        // 如果还是没有找到，则使用第一个找到的仓库作为fallback
        if (!lastRepoID) {
          const repoIDs = Object.keys(repoSelections);
          if (repoIDs.length > 0) {
            lastRepoID = parseInt(repoIDs[0], 10);
          }
        }
      }
      
      if (lastRepoID && repoSelections[lastRepoID]) {
        const { repoID, branch } = repoSelections[lastRepoID];
        filter.repoID = parseInt(repoID, 10);
        if (branch) {
          filter.branch = branch;
        }
        
        // 如果初始化了 repoID，则获取分支列表并获取提交记录
        fetchRepos().then(() => {
           ensureBranch(filter.repoID).then(() => {
              // 如果没有保存的分支，确保 ensureBranch 会设置一个默认分支
              // 如果有保存的分支，ensureBranch 内部逻辑会判断是否有效，无效则重置
              fetchCommits();
           });
        });
      } else {
        // 如果 localStorage 中没有有效的 repoID，则正常获取仓库列表
        fetchRepos();
      }
    } catch (e) {
      console.error('解析localStorage数据失败:', e);
      // 如果解析失败，清除无效数据并正常获取仓库列表
      localStorage.removeItem('repoSelections');
      localStorage.removeItem('repoSelection');
      fetchRepos();
    }
  } else {
    // 如果 localStorage 中没有保存数据，则正常获取仓库列表
    fetchRepos();
  }
  
  // 加载作者马甲配置
  loadAuthorNameMap();
});

// 保存仓库和分支选择到 localStorage 的统一函数
function saveRepoSelection() {
  if (filter.repoID) {
    try {
      // 获取现有的所有仓库选择记录
      const existingData = localStorage.getItem('repoSelections');
      let repoSelections = {};
      
      if (existingData) {
        repoSelections = JSON.parse(existingData);
      }
      
      // 更新当前仓库的分支信息
      repoSelections[filter.repoID] = {
        repoID: filter.repoID,
        branch: filter.branch || ''
      };
      
      // 保存更新后的数据
      localStorage.setItem('repoSelections', JSON.stringify(repoSelections));
      
      // 记录最后使用的仓库ID
      localStorage.setItem('lastUsedRepoID', filter.repoID.toString());
    } catch (e) {
      console.error('保存仓库选择失败:', e);
    }
  }
}

// 监听 filter.repoID 的变化
watch(() => filter.repoID, (newRepoID, oldRepoID) => {
  if (newRepoID !== oldRepoID) {
    if (newRepoID !== null) {
      // 当仓库切换时，重置分支选择
      if (newRepoID !== oldRepoID) {
        filter.branch = ''; // 重置分支选择
      }
    }
  }
});

// 监听 filter.branch 的变化
watch(() => filter.branch, (newBranch, oldBranch) => {
  if (newBranch !== oldBranch && filter.repoID !== null) {
    // 当分支切换时，保存仓库和分支选择
    saveRepoSelection();
  }
});
const totalPages = computed(() => Math.ceil(total.value / filter.pageSize))

const headers = [
  { title: '哈希', key: 'hash', width: '7%' },
  { title: '时间', key: 'time', width: '13%' },
  { title: '作者', key: 'authorName', width: '10%' },
  { title: '信息', key: 'message', width: '52%' },
  { title: '操作', key: 'actions', width: '28%' }, // 新增
]

/**
 * 拉取分支列表并写入 branchOptions。
 * 若当前 repoForm.branch 不在列表中则自动设为第一个分支，
 * 然后立即刷新提交列表。
 */
 async function ensureBranch(repoID) {
  try {
    // 1️⃣ 先从 localStorage 中读取该仓库保存的分支信息
    const savedSelections = localStorage.getItem('repoSelections');
    let savedBranch: string | null = null;
    
    if (savedSelections) {
      try {
        const repoSelections = JSON.parse(savedSelections);
        if (repoSelections[repoID] && repoSelections[repoID].branch) {
          console.log('从 localStorage 获取的分支信息:', repoSelections[repoID].branch);
          savedBranch = repoSelections[repoID].branch;
        }
      } catch (e) {
        console.error('解析 localStorage 中的分支信息失败:', e);
      }
    }
    
    // 2️⃣ 调用后端接口获取该仓库的所有分支列表
    const res = await listBranches(repoID);
    if (res.status === 200 && Array.isArray(res.data.data)) {
      branchOptions.value = res.data.data;
      
      // 3️⃣ 如果缓存分支存在且在当前列表中，则直接使用缓存分支；否则回退到第一个分支
      if (savedBranch && branchOptions.value.includes(savedBranch)) {
        filter.branch = savedBranch;
      } else if (branchOptions.value.length > 0) {
        filter.branch = branchOptions.value[0];
      }
      
      // 4️⃣ 不论是“读取到缓存分支”还是“回退到列表第一个分支”，都要立刻保存到 localStorage
      saveRepoSelection();
    }
  } catch (e: any) {
    console.error('获取分支列表失败', e.response?.data || e);
    showLocalSnackbar((e.response?.data || e), 'error');
  }
}


function formatAuthor(authorName, authorEmail) {
  // 检查是否有马甲名称映射
  const aliasName = authorNameMap.value[authorName]
  const displayName = aliasName || authorName
  return `${displayName} <${authorEmail}>`
}

function showLocalSnackbar(message: string, color: string) { // 新增
  snackbar.message = message
  snackbar.color = color     // 需要在 snackbar 对象里补 color 字段
  snackbar.show = true
}


// ========= 打开对话框的触发函数 =========
function openCombinedDialog() {
  confirmCombined.value = true
}
function openCombinedDetailDialog() {
  confirmCombinedDetail.value = true
}
function openReportDialog(item) {
  currentItem.value = item
  confirmReport.value = true
}
function openDetailDialog(item) {
  currentItem.value = item
  confirmDetail.value = true
}

async function openMap1Dialog() {
  if (filter.repoID == null) {
    showLocalSnackbar('请先选择仓库', 'warning')
    return
  }
  
  isGeneratingChart.value = true
  try {
    if (!confirm(`确定要生成该仓库的提交贡献榜吗？（需要一点时间）`)) {
      return
    }
    showLocalSnackbar('正在生成仓库提交贡献榜...', 'info')
    const startTime = filter.start ? new Date(filter.start).toISOString().split('T')[0] : undefined
    const endTime = filter.end ? new Date(filter.end).toISOString().split('T')[0] : undefined
    const res = await generateContributionChart(filter.repoID!, startTime, endTime)
    if (res.status === 200) {
      showLocalSnackbar('仓库提交贡献榜生成成功，请在文件枢纽中查看', 'success')
    } else {
      showLocalSnackbar('生成贡献榜失败', 'error')
    }
  } catch (e: any) {
    console.error('生成贡献榜失败:', e)
    showLocalSnackbar(`生成贡献榜失败：${e.response?.data?.message || e.message || '未知错误'}`, 'error')
  } finally {
    isGeneratingChart.value = false
  }
}

async function openMap2Dialog() {
  if (filter.repoID == null) {
    showLocalSnackbar('请先选择仓库', 'warning')
    return
  }
  
  // 检查是否已有作者列表，如果没有则提示用户先加载提交记录
  if (heatmapAuthors.value.length === 0) {
    showLocalSnackbar('请先加载提交记录以获取作者列表', 'warning')
    return
  }
  
  // 重置选择状态
  heatmapType.value = 'all'
  selectedHeatmapAuthors.value = []
  
  // 打开选择对话框
  showHeatmapDialog.value = true
}

// ========= 清理缓存功能 =========
async function clearCache() {
  if (filter.repoID == null) {
    showLocalSnackbar('请先选择仓库', 'warning')
    return
  }
  
  // 二次确认
  const confirmed = confirm('确定要清理该仓库的提交缓存吗？\n\n清理后将重新从远程获取提交记录，可能需要一些时间。')
  if (!confirmed) {
    return
  }
  
  try {
    showLocalSnackbar('正在清理缓存...', 'info')
    await clearCommitsCache(filter.repoID)
    showLocalSnackbar('缓存清理成功，正在重新查询...', 'success')
    // 清理缓存后重新查询
    await fetchCommits()
  } catch (e: any) {
    showLocalSnackbar(`清理缓存失败：${e.response?.data || e}`, 'error')
  }
}

// ========= 确认后的实际执行 =========
function handleCombinedConfirm() {
  confirmCombined.value = false
  generateCombinedReport()
}
function handleCombinedDetailConfirm() {
  confirmCombinedDetail.value = false
  generateCombinedDetail()
}
function handleReportConfirm() {
  confirmReport.value = false
  if (currentItem.value) generateAnalysisReport(currentItem.value)
}
function handleDetailConfirm() {
  confirmDetail.value = false
  if (currentItem.value) generateDetailReport(currentItem.value)
}

async function generateAnalysisReport(item: typeof commits.value[0]) {
  try {
    const preload = {
      Hash: item.hash,
      AuthorName: item.authorName,
      AuthorEmail: item.authorEmail,
      Message: item.message,
      Time: item.time,
    }
    const res = await enrichFileDiffs(filter.repoID!, preload)
    const enriched = res.data.data
    // 设置完整的提交记录并打开分析报告弹窗
    analysisCommitRecord.value = [enriched]
    showAnalysisModal.value = true
  } catch (e: any) {
    showLocalSnackbar(`加载提交详情失败：${e.response?.data || e}`, 'error')
  }
}
async function generateDetailReport(item: typeof commits.value[0]) {
  try {
    showLocalSnackbar('正在生成提交明细...', 'info')
    
    const payload = {
      Hash: item.hash,
      AuthorName: item.authorName,
      AuthorEmail: item.authorEmail,
      Message: item.message,
      Time: item.time,
    }
    const res = await enrichFileDiffs(filter.repoID!, payload)
    const enriched = res.data.data
    
    // 调用导出接口
    const exportRes = await exportCommitDetails([enriched])
    
    // // 处理文件下载
    // const blob = new Blob([exportRes.data], { type: 'text/csv;charset=utf-8' })
    // const url = window.URL.createObjectURL(blob)
    // const link = document.createElement('a')
    // link.href = url
    
    // // 从响应头获取文件名，如果没有则使用默认名称
    // const contentDisposition = exportRes.headers['content-disposition']
    // let filename = `提交明细_${item.hash.substring(0, 8)}.csv`
    // if (contentDisposition) {
    //   const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
    //   if (filenameMatch) {
    //     filename = filenameMatch[1]
    //   }
    // }
    
    // link.download = filename
    // document.body.appendChild(link)
    // link.click()
    // document.body.removeChild(link)
    // window.URL.revokeObjectURL(url)
    
    showLocalSnackbar('提交明细已生成并下载，请前往文件枢纽查看', 'success')
  
    
  } catch (e: any) {
    showLocalSnackbar(`生成提交明细失败：${e.response?.data || e}`, 'error')
  }
}
async function generateCombinedReport() {
  const commitsPayload = selectedCommits.value.map(item => ({
    Hash: item.hash,
    AuthorName: item.authorName,
    AuthorEmail: item.authorEmail,
    Message: item.message,
    Time: item.time,
  }))
  try {
    showLocalSnackbar('正在加载提交详情...', 'info')
    // 并行获取所有选中提交的完整 commitRecords
    const promises = commitsPayload.map(c =>
      enrichFileDiffs(filter.repoID!, c)
    )
    const results = await Promise.all(promises)
    // 收集所有完整的commitRecords成一个list
    const commitRecords = results.map(r => r.data.data)
    
    // 直接将commitRecords列表传给analysisCommitRecord
    analysisCommitRecord.value = commitRecords
    showAnalysisModal.value = true
    
    showLocalSnackbar(`已加载 ${commitRecords.length} 条提交记录，正在生成分析报告...`, 'success')
  } catch (error) {
    console.error('生成综合报告失败:', error)
    showLocalSnackbar('生成综合报告失败', 'error')
  }
}
async function generateCombinedDetail() {
  const commitsPayload = selectedCommits.value.map(item => ({
    Hash: item.hash,
    AuthorName: item.authorName,
    AuthorEmail: item.authorEmail,
    Message: item.message,
    Time: item.time,
  }))
  try {
    showLocalSnackbar('正在加载提交详情...', 'info')
    // 并行获取所有选中提交的完整 commitRecords
    const promises = commitsPayload.map(c =>
      enrichFileDiffs(filter.repoID!, c)
    )
    const results = await Promise.all(promises)
    // 收集所有完整的commitRecords成一个list
    const commitRecords = results.map(r => r.data.data)
    
    // 调用导出接口生成综合明细
    const exportRes = await exportCommitDetails(commitRecords)
    
    showLocalSnackbar(`已生成 ${commitRecords.length} 条提交记录的综合明细，请前往文件枢纽查看`, 'success')
  } catch (error) {
    console.error('生成综合明细失败:', error)
    showLocalSnackbar('生成综合明细失败', 'error')
  }
}
async function checkCode(item: typeof commits.value[0]) {
  isCheckingCode.value = item.hash
  try {
    const payload = {
      Hash: item.hash,
      AuthorName: item.authorName,
      AuthorEmail: item.authorEmail,
      Message: item.message,
      Time: item.time,
    }
    const res = await enrichFileDiffs(filter.repoID!, payload)
    diffCommitRecord.value = res.data.data
    showDiffViewer.value = true    // ← 打开弹窗
  } catch (e: any) {
    showLocalSnackbar(`加载提交详情失败：${e.response?.data || e}`, 'error')
  } finally {
    isCheckingCode.value = null
  }
}


function resetFilter() {
  filter.start = ''
  filter.end = ''
  filter.author = ''
  filter.page = 1
  filter.pageSize = 20
  total.value = 0
  commits.value = []
  selectedCommits.value = [] // 清理多选状态
  isLoading.value = false
  fetchCommits()
}

function omit(str, limit) {
  if (str.length > limit) {
    return `${str.substring(0, limit)}...`
  }
  return str
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString()
}

function formatRepoTitle(item) {
  if (!item.desc) {
    return item.name;
  } else {
    return `${omit(item.desc, 15)}（${item.name}）`;
  }
}

async function fetchRepos() {
  try {
    const res = await listRepos()
    const list = Array.isArray(res.data) ? res.data : res.data.data
    
    // 将列表按id降序排序
    const sortedList = list.filter(repo => repo.repo_url !== null && repo.repo_url !== "")
    .sort((a, b) => b.id - a.id)
    
    repos.value = sortedList.map(repo => ({
      id: repo.id,
      name: repo.name,
      branch: repo.branch, 
      local_path: repo.local_path,
      username: repo.username,
      password: repo.password,
      desc: repo.desc,
      repo_url: repo.repo_url,
    }))

    // 如果有仓库且未选择仓库ID,设置第一个仓库为默认值
    if (repos.value.length > 0 && filter.repoID == null) {
      filter.repoID = repos.value[0].id
      await ensureBranch(filter.repoID)
    }
  } catch (err: any) {
    // 捕获接口错误并弹出提示
    snackbar.message = `加载仓库列表失败：${err.response.data || err}`
    snackbar.show = true
  }
}

async function fetchCommits() {
  if (filter.repoID == null) {
    commits.value = []
    selectedCommits.value = [] // 清理多选状态
    total.value = 0
    heatmapAuthors.value = [] // 清理作者列表
    return
  }
  isLoading.value = true
  selectedCommits.value = [] // 清理多选状态
  const startTime = filter.start ? new Date(filter.start).toISOString().split('T')[0] : undefined
  const endTime = filter.end ? new Date(filter.end).toISOString().split('T')[0] : undefined
  const params = {
    repoID: String(filter.repoID),
    branch: filter.branch || undefined,
    start: startTime,
    end: endTime,
    author: filter.author || undefined,
    page: filter.page,
    size: filter.pageSize,
  }
  try {
    const res = await filterCommits(params)
    const raw = res.data.data
    total.value = res.data.total
    commits.value = Array.isArray(raw)
      ? raw.map(item => ({
        hash: item.Hash,
        authorName: item.AuthorName,
        authorEmail: item.AuthorEmail,
        message: item.Message,
        time: item.Time,
      }))
      : []
    
    // 提取作者列表用于热力图功能
    if (Array.isArray(raw) && raw.length > 0) {
      const authors = [...new Set(raw.map(item => item.AuthorName))]
      heatmapAuthors.value = authors.sort()
      console.log('从提交记录中提取作者列表:', heatmapAuthors.value)
    } else {
      heatmapAuthors.value = []
    }
  } catch (err: any) {
    // 捕获 500 / 其他错误
    snackbar.message = `加载提交记录失败：${err.response?.status || ''} ${err.response.data || err}`
    snackbar.show = true
    heatmapAuthors.value = [] // 出错时清理作者列表
  } finally {
    isLoading.value = false
  }
}

function changePage(p: number) {
  filter.page = p
  fetchCommits()
}

function onSearch() {
  console.log('onSearch');
  filter.page = 1
  total.value = 0
  commits.value = []
  isLoading.value = false
  fetchCommits()
  saveRepoSelection();
}

// ========= 作者马甲相关函数 =========
// 加载作者马甲配置
async function loadAuthorNameMap() {
  try {
    const response = await getConfig()
    if (response.status === 200 && response.data && response.data.authorNameMap) {
      authorNameMap.value = response.data.authorNameMap
    }
  } catch (error) {
    console.error('加载作者马甲配置失败:', error)
    showLocalSnackbar('加载作者马甲配置失败', 'error')
  }
}

// 打开作者马甲设置对话框
function openAuthorMapDialog() {
  showAuthorMapDialog.value = true
}

// 关闭作者马甲设置对话框
function closeAuthorMapDialog() {
  showAuthorMapDialog.value = false
  // 重置新增表单
  newAuthorMapping.original = ''
  newAuthorMapping.alias = ''
}

// 添加作者马甲映射
function addAuthorMapping() {
  if (!newAuthorMapping.original || !newAuthorMapping.alias) {
    showLocalSnackbar('请填写完整的作者名和马甲名称', 'warning')
    return
  }
  
  if (authorNameMap.value[newAuthorMapping.original]) {
    showLocalSnackbar('该作者已存在马甲设置，请使用编辑功能', 'warning')
    return
  }
  
  authorNameMap.value[newAuthorMapping.original] = newAuthorMapping.alias
  
  // 重置表单
  newAuthorMapping.original = ''
  newAuthorMapping.alias = ''
  
  showLocalSnackbar('添加成功', 'success')
}

// 编辑作者马甲映射
function editAuthorMapping(original: string, alias: string) {
  editingAuthor.original = original
  editingAuthor.alias = alias
  showEditAuthorDialog.value = true
}

// 更新作者马甲映射
function updateAuthorMapping() {
  if (!editingAuthor.alias) {
    showLocalSnackbar('请填写马甲名称', 'warning')
    return
  }
  
  authorNameMap.value[editingAuthor.original] = editingAuthor.alias
  showEditAuthorDialog.value = false
  
  // 重置编辑表单
  editingAuthor.original = ''
  editingAuthor.alias = ''
  
  showLocalSnackbar('更新成功', 'success')
}

// 删除作者马甲映射
function deleteAuthorMapping(original: string) {
  delete authorNameMap.value[original]
  showLocalSnackbar('删除成功', 'success')
}

// 保存作者马甲配置
async function saveAuthorMap() {
  isSavingAuthorMap.value = true
  try {
    // 先获取当前配置
    const currentConfigResponse = await getConfig()
    let currentConfig = {}
    
    if (currentConfigResponse.status === 200 && currentConfigResponse.data) {
      currentConfig = currentConfigResponse.data
    }
    
    // 更新authorNameMap
    const updatedConfig = {
      ...currentConfig,
      authorNameMap: authorNameMap.value
    }
    
    // 保存配置
    const response = await updateConfig(updatedConfig)
    
    if (response.status === 200) {
      showLocalSnackbar('保存成功', 'success')
      closeAuthorMapDialog()
    } else {
      showLocalSnackbar('保存失败', 'error')
    }
  } catch (error) {
    console.error('保存作者马甲配置失败:', error)
    showLocalSnackbar('保存失败', 'error')
  } finally {
    isSavingAuthorMap.value = false
  }
}

// ========= 热力图相关函数 =========
// 注意：作者列表现在在fetchCommits函数中自动提取，不再需要单独调用此函数
// 保留此函数以防需要手动刷新作者列表
async function loadHeatmapAuthors() {
  console.log('loadHeatmapAuthors已被优化，作者列表现在在fetchCommits中自动提取')
  // 如果确实需要重新加载作者列表，可以调用fetchCommits
  if (filter.repoID) {
    await fetchCommits()
  }
}

// 生成热力图
async function generateHeatmapWithOptions() {
  if (filter.repoID == null) {
    showLocalSnackbar('请先选择仓库', 'warning')
    return
  }
  
  if (heatmapType.value === 'selected' && selectedHeatmapAuthors.value.length === 0) {
    showLocalSnackbar('请选择至少一个作者', 'warning')
    return
  }
  
  isGeneratingHeatmap.value = true
  showHeatmapDialog.value = false
  
  try {
    showLocalSnackbar('正在生成提交活跃度热力图...', 'info')
    const repoId = filter.repoID
    
    // 根据选择类型确定作者参数
    let authorName: string | undefined = undefined
    if (heatmapType.value === 'selected') {
      // 如果只选择了一个作者，传递单个作者名
      // 如果选择了多个作者，这里可能需要调整API来支持多个作者
      authorName = selectedHeatmapAuthors.value.length === 1 
        ? selectedHeatmapAuthors.value[0] 
        : selectedHeatmapAuthors.value.join(',')
    }
    
    const repoName = repos.value.find(r => r.id === filter.repoID)?.name || '仓库'
    const title = heatmapType.value === 'all' 
      ? `${repoName} 提交活跃度热力图（所有作者）`
      : `${repoName} 提交活跃度热力图（${selectedHeatmapAuthors.value.join('、')}）`
    
    const startTime = filter.start ? new Date(filter.start).toISOString().split('T')[0] : undefined
    const endTime = filter.end ? new Date(filter.end).toISOString().split('T')[0] : undefined
    
    const res = await generateHeatmap(repoId, authorName || '', title, undefined, undefined, startTime, endTime)
    
    if (res.status === 200) {
      showLocalSnackbar('提交活跃度热力图生成成功，请在文件枢纽中查看', 'success')
    } else {
      showLocalSnackbar('生成热力图失败', 'error')
    }
  } catch (e: any) {
    console.error('生成热力图失败:', e)
    showLocalSnackbar(`生成热力图失败：${e.response?.data?.message || e.message || '未知错误'}`, 'error')
  } finally {
    isGeneratingHeatmap.value = false
  }
}

// 关闭热力图选择对话框
function closeHeatmapDialog() {
  showHeatmapDialog.value = false
  selectedHeatmapAuthors.value = []
  heatmapType.value = 'all'
}

// ========= 监听仓库变更，拉分支并刷新列表 =========
watch(
  () => filter.repoID,
  async (newRepoID, oldRepoID) => {
    if (newRepoID !== oldRepoID && newRepoID != null) {
      filter.page = 1
      filter.pageSize = 20
      total.value = 0
      commits.value = []
      selectedCommits.value = [] // 清理多选状态
      isLoading.value = false
      // 每次选仓库都刷新分支列表
      await ensureBranch(newRepoID)
      // 可选：切换仓库后自动触发一次搜索，重置页码
    }
  }
)

// ========= 监听分支变更，重置页码并刷新列表 =========
/* 1️⃣  watch 分支变化时立即持久化  */
watch(
  () => filter.branch,
  (newBranch, oldBranch) => {
    if (newBranch && newBranch !== oldBranch) {
      filter.page = 1
      filter.pageSize = 20
      total.value = 0
      commits.value = []
      selectedCommits.value = []
      isLoading.value = false
      fetchCommits()
    }
  }
)


</script>

<style scoped>
.v-container {
  margin: auto;
  width: 100%;
}

@media (min-width: 1280px) {
  .v-container {
    max-width: 2200px;
  }
}
</style>
