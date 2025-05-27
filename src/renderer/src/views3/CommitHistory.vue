<template>
  <v-container>
    <v-card class="pa-2">
      <!-- 过滤表单 -->
      <v-form @submit.prevent="onSearch" class="mb-4">
        <v-row dense align="center" gutter="8">
          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="filter.repoID"
              :items="repos"
              :item-title="formatRepoTitle"
              item-value="id"
              label="仓库"
              :disabled="repos.length === 0"
              density="compact"
              hide-details
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
            生成综合报告和明细
          </v-btn>
        </v-col>
        <v-col cols="auto">
          <v-btn
            color="black"
            @click=""
            density="compact"
            variant="outlined"
          >
            生成仓库提交贡献榜
          </v-btn>
        </v-col>
        <v-col cols="auto">
          <v-btn
            color="green"
            @click=""
            density="compact"
            variant="outlined"
          >
            生成提交活跃度·热力图
          </v-btn>
        </v-col>
      </v-row>

      <!-- 提交列表 -->
      <v-data-table
        :headers="headers"
        :items="commits"
        :items-per-page="filter.pageSize"
        items-per-page-text="每页显示行数"
        :items-per-page-options="[10, 20, 50, 100]"
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
              <span v-bind="props" class="text-truncate" style="max-width: 40%;">{{ omit(item.message,40) }}</span>
            </template>
            <span>{{ item.message }}</span>
          </v-tooltip>
        </template>
        <!-- 新增：actions 列 -->
        <template #item.actions="{ item }">
          <div style="display: flex;">
            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-btn v-bind="props" small variant="outlined"  color="success" class="mr-2" @click="checkCode(item)" density="compact">
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
              <span>生成提交记录分析报告，在 ‘枢纽’ 中查看</span>
            </v-tooltip>
            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-btn v-bind="props" small variant="outlined" color="secondary" @click="openDetailDialog(item)" density="compact">
                  生成明细
                </v-btn>
              </template>
              <span>生成提交记录明细，在 ‘枢纽’ 中查看</span>
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
            <v-row class="mt-4" justify="center" style="display: block">
              <span class="text-grey text-h6">暂无数据</span>
              <v-skeleton-loader
                type="list-item-two-line"
                style="width: 60%"
              />
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
    </v-card>
    <DiffViewer
      v-model:visible="showDiffViewer"
      :commit-record="diffCommitRecord"
      persistent
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
import { listRepos, filterCommits, listBranches, enrichFileDiffs } from "../service/api.js";
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
} from 'vuetify/components'
import { useStore } from "vuex";
import DiffViewer from './DiffViewer.vue'
import { CommitRecord } from '../types/commit.js'
const showDiffViewer = ref(false)
const diffCommitRecord = ref<CommitRecord | null>(null)


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
const currentItem = ref<typeof commits.value[0] | null>(null) // 暂存当前行

const branchOptions = ref([])

const filter = reactive({
  repoID: null as number | null,
  branch: '' as string,
  start: '' as string,
  end: '' as string,
  author: '' as string,
  page: 1 as number,
  pageSize: 10 as number,
})

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
    const res = await listBranches(repoID)
    if (res.status === 200 && Array.isArray(res.data.data)) {
      branchOptions.value = res.data.data
      // 如果当前选中的分支不在新列表中，则重置为第一个
      if (!branchOptions.value.includes(filter.branch)) {
        filter.branch = branchOptions.value[0] || ''
      }
    }
  } catch (e) {
    console.error('获取分支列表失败', e.response?.data || e)
    showLocalSnackbar((e.response?.data || e), 'error')
  }
}

function formatAuthor(authorName, authorEmail) {
  return `${authorName} <${authorEmail}>`
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
function openReportDialog(item) {
  currentItem.value = item
  confirmReport.value = true
}
function openDetailDialog(item) {
  currentItem.value = item
  confirmDetail.value = true
}

// ========= 确认后的实际执行 =========
function handleCombinedConfirm() {
  confirmCombined.value = false
  generateCombinedReport()
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
    // TODO: 用 enriched 生成分析报告，比如传给“枢纽”组件展示
    showLocalSnackbar(`提交 ${item.hash} 的文件差异已加载，正在生成分析报告至“枢纽”…`, 'info')
  } catch (e: any) {
    showLocalSnackbar(`加载提交详情失败：${e.response?.data || e}`, 'error')
  }
}
async function generateDetailReport(item: typeof commits.value[0]) {
  try {
    const payload = {
      Hash: item.hash,
      AuthorName: item.authorName,
      AuthorEmail: item.authorEmail,
      Message: item.message,
      Time: item.time,
    }
    const res = await enrichFileDiffs(filter.repoID!, payload)
    const enriched = res.data.data
    // TODO: 用 enriched.FileDiffs 在“枢纽”里渲染修改明细
    showLocalSnackbar(`提交 ${item.hash} 的文件差异已加载，正在生成修改明细至“枢纽”…`, 'info')
  } catch (e: any) {
    showLocalSnackbar(`加载提交详情失败：${e.response?.data || e}`, 'error')
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
    // 并行获取所有选中提交的 FileDiffs
    const promises = commitsPayload.map(c =>
      enrichFileDiffs(filter.repoID!, c)
    )
    const results = await Promise.all(promises)
    const enrichedCommits = results.map(r => r.data.data)
    // TODO: 把 enrichedCommits 传给“枢纽”一次性批量生成
    showLocalSnackbar(`已加载 ${enrichedCommits.length} 条提交的差异，正在生成综合报告和修改明细至“枢纽”…`, 'info')
  } catch (e: any) {
    showLocalSnackbar(`批量加载提交详情失败：${e.response?.data || e}`, 'error')
  }
}
async function checkCode(item: typeof commits.value[0]) {
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
  }
}


function resetFilter() {
  filter.branch = ''
  filter.start = ''
  filter.end = ''
  filter.author = ''
  filter.page = 1
  filter.pageSize = 10
  total.value = 0
  commits.value = []
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
    return `${item.desc}（${item.name}）`;
  }
}

async function fetchRepos() {
  try {
    const res = await listRepos()
    const list = Array.isArray(res.data) ? res.data : res.data.data
    repos.value = list.map(repo => ({
      id: repo.id,
      name: repo.name,
      branch: repo.branch,
      local_path: repo.local_path,
      username: repo.username,
      password: repo.password,
      desc: repo.desc,
      repo_url: repo.repo_url,
    }))
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
    total.value = 0
    return
  }
  isLoading.value = true
  const startISO = filter.start ? new Date(filter.start).toISOString() : undefined
  const endISO = filter.end ? new Date(filter.end).toISOString() : undefined
  const params = {
    repoID: String(filter.repoID),
    branch: filter.branch || undefined,
    start: startISO,
    end: endISO,
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
  } catch (err: any) {
    // 捕获 500 / 其他错误
    snackbar.message = `加载提交记录失败：${err.response?.status || ''} ${err.response.data || err}`
    snackbar.show = true
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
}

// ========= 监听仓库变更，拉分支并刷新列表 =========
watch(
  () => filter.repoID,
  async (newRepoID, oldRepoID) => {
    if (newRepoID !== oldRepoID && newRepoID != null) {
      filter.page = 1
      filter.pageSize = 10
      total.value = 0
      commits.value = []
      isLoading.value = false
      // 每次选仓库都刷新分支列表
      await ensureBranch(newRepoID)
      // 可选：切换仓库后自动触发一次搜索，重置页码
    }
  }
)

// ========= 监听分支变更，重置页码并刷新列表 =========
watch(
  () => filter.branch,
  (newBranch, oldBranch) => {
    if (newBranch && newBranch !== oldBranch) {
      filter.page = 1
      filter.pageSize = 10
      total.value = 0
      commits.value = []
      isLoading.value = false
      fetchCommits()
    }
  }
)

onMounted(async () => {
  await fetchRepos()
})
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
