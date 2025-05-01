<template>
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
          <v-text-field
            v-model="filter.branch"
            label="分支"
            placeholder="branch 名称"
            density="compact"
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
          >
            搜索
          </v-btn>
          <v-btn
            class="mr-4"
            color="grey"
            @click="resetFilter"
          >
            重置
          </v-btn>
        </v-col>
      </v-row>
    </v-form>

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
            <span v-bind="props" class="text-truncate" style="max-width: 15%;">{{ item.authorName }}</span>
          </template>
          <span>{{ item.authorName }}</span>
        </v-tooltip>
      </template>

      <!-- 邮箱 列 -->
      <template #item.authorEmail="{ item }">
        <v-tooltip interactive>
          <template #activator="{ props }">
            <span v-bind="props" class="text-truncate" style="max-width: 15%;">{{ omit(item.authorEmail, 25) }}</span>
          </template>
          <span>{{ item.authorEmail }}</span>
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
     <!-- 全局错误提示 -->
     <v-snackbar
       v-model="snackbar.show"
       :timeout="snackbar.timeout"
       color="error"
       top
     >
       {{ snackbar.message }}
     </v-snackbar>
  </v-card>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { listRepos, filterCommits } from '../service/api.js'
import {
  VCard,
  VForm,
  VRow,
  VCol,
  VSelect,
  VTextField,
  VBtn,
  VDataTable,
  VPagination,
  VSkeletonLoader,
  VTooltip,
} from 'vuetify/components'


 // 用来控制错误提示
 const snackbar = reactive({
   show: false as boolean,
   message: '' as string,
   timeout: 3000 as number,
 })

const repos = ref<Array<{ id: number; name: string }>>([])
const commits = ref<Array<{ hash: string; authorName: string; authorEmail: string; message: string; time: string }>>([])
const total = ref<number>(0)
const isLoading = ref(false)

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
  { title: '邮箱', key: 'authorEmail', width: '15%' },
  { title: '信息', key: 'message', width: '55%' },
]

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

onMounted(async () => {
  await fetchRepos()
  fetchCommits()
})
</script>

<style scoped>
</style>
