<!-- CommitHistory.vue -->
<template>
  <div class="commit-history">
    <!-- 过滤表单 -->
    <form @submit.prevent="onSearch" class="filter-form">
      <label>
        仓库：
        <select v-model="filter.repoID">
          <option value="">请选择仓库</option>
          <option v-for="r in repos" :key="r.id" :value="r.id">
            {{ r.name }}
          </option>
        </select>
      </label>
      <label>
        分支：
        <input v-model="filter.branch" placeholder="branch 名称" />
      </label>
      <label>
        开始时间：
        <input type="datetime-local" v-model="filter.start" />
      </label>
      <label>
        结束时间：
        <input type="datetime-local" v-model="filter.end" />
      </label>
      <label>
        作者：
        <input v-model="filter.author" placeholder="author 名称" />
      </label>
      <button type="submit">搜索</button>
    </form>

    <!-- 提交列表 -->
    <table class="commit-table">
      <thead>
      <tr>
        <th>哈希</th>
        <th>作者</th>
        <th>邮箱</th>
        <th>信息</th>
        <th>时间</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="c in commits" :key="c.hash">
        <td>{{ c.hash }}</td>
        <td>{{ c.authorName }}</td>
        <td>{{ c.authorEmail }}</td>
        <td>{{ c.message }}</td>
        <td>{{ formatTime(c.time) }}</td>
      </tr>
      <tr v-if="!commits.length">
        <td colspan="5" class="no-data">暂无数据</td>
      </tr>
      </tbody>
    </table>

    <!-- 分页 -->
    <div class="pagination">
      <button :disabled="filter.page === 1" @click="changePage(filter.page - 1)">
        上一页
      </button>
      <span>第 {{ filter.page }} 页 / 共 {{ totalPages }} 页</span>
      <button
        :disabled="filter.page === totalPages"
        @click="changePage(filter.page + 1)"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import axios from 'axios'

/**
 * 如果后台接口尚未就绪，可以将 useMock 开为 true
 * 以便前端使用假数据模拟分页和过滤效果
 */
const useMock = true

// 仓库列表
const repos = ref([])
// 当前页提交记录
const commits = ref([])
// 总记录数，用于分页
const total = ref(0)

// 过滤器状态
const filter = reactive({
  repoID: '',        // 仓库 ID
  branch: '',        // 分支
  start: '',         // 开始时间 (ISO 字符串)
  end: '',           // 结束时间 (ISO 字符串)
  author: '',        // 作者名
  page: 1,           // 当前页
  pageSize: 10,      // 每页记录数
})

// 计算总页数
const totalPages = computed(() =>
  Math.ceil(total.value / filter.pageSize)
)

// 格式化 ISO 时间戳为本地可读字符串
function formatTime(iso) {
  return new Date(iso).toLocaleString()
}

// 模拟获取仓库列表
async function fetchRepos() {
  if (useMock) {
    repos.value = [
      { id: 1, name: 'Repo-A' },
      { id: 2, name: 'Repo-B' },
      { id: 3, name: 'Example-Project' },
    ]
  } else {
    const res = await axios.get('/api/repos')
    repos.value = res.data
  }
}

// 模拟后端分页 & 过滤返回假数据
function fetchMockCommits({ page, pageSize }) {
  const mock: any[] = []
  const startIdx = (page - 1) * pageSize + 1
  for (let i = 0; i < pageSize; i++) {
    const idx = startIdx + i
    mock.push({
      hash: `abcdef${idx.toString().padStart(4, '0')}`,
      authorName: `Author${(idx % 5) + 1}`,
      authorEmail: `author${(idx % 5) + 1}@example.com`,
      message: `模拟提交信息 #${idx}`,
      time: new Date(
        Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 7
      ).toISOString(),
    })
  }
  // 假设总共有 47 条记录
  return Promise.resolve({ data: mock, total: 47 })
}

// 真正调用接口或 Mock
async function fetchCommits() {
  const params = {
    repoID: filter.repoID,
    branch: filter.branch,
    start: filter.start,
    end: filter.end,
    author: filter.author,
    page: filter.page,
    size: filter.pageSize,
  }
  if (useMock) {
    const res = await fetchMockCommits(params)
    commits.value = res.data
    total.value = res.total
  } else {
    const res = await axios.get('/api/commits/filter', { params })
    // 假设后端返回 { data: CommitRecord[], total: number }
    commits.value = res.data.data
    total.value = res.data.total
  }
}

// 切换页码
function changePage(p: number) {
  filter.page = p
  fetchCommits()
}

// 点击“搜索”重置到第 1 页并拉数据
function onSearch() {
  filter.page = 1
  fetchCommits()
}

// 初始加载
onMounted(() => {
  fetchRepos()
  fetchCommits()
})
</script>

<style scoped>
.commit-history {
  padding: 16px;
}
.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.filter-form label {
  display: flex;
  flex-direction: column;
  font-size: 14px;
}
.filter-form input,
.filter-form select {
  margin-top: 4px;
  padding: 4px 8px;
  font-size: 14px;
}
.filter-form button {
  align-self: flex-end;
  padding: 6px 12px;
}
.commit-table {
  width: 100%;
  border-collapse: collapse;
}
.commit-table th,
.commit-table td {
  border: 1px solid #ccc;
  padding: 8px;
  font-size: 13px;
}
.no-data {
  text-align: center;
  color: #888;
}
.pagination {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
