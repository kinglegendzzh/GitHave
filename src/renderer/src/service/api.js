// api.js
import axios from 'axios'

// 创建一个 axios 实例
const instance = axios.create({
  baseURL: 'http://127.0.0.1:19151',
  timeout: 15000
})

const instance_long = axios.create({
  baseURL: 'http://127.0.0.1:19151',
  timeout: 6 * 60 * 60 * 1000
})

const fm = axios.create({
  baseURL: 'http://127.0.0.1:5532/api',
  timeout: 6 * 60 * 60 * 1000
})

const fm_long = axios.create({
  baseURL: 'http://127.0.0.1:5532/api',
  timeout: 6 * 60 * 60 * 1000
})

const fm_config = axios.create({
  baseURL: 'http://127.0.0.1:5532/c',
  timeout: 10000
})

const faiss = axios.create({
  baseURL: 'http://127.0.0.1:5533',
  timeout: 10000
})

export function pullRepo(data) {
  return instance_long.post('/repos/pull', data)
}

// 获取仓库列表
export function listRepos() {
  return instance.get('/repos/list')
}

// 获取单个仓库
export function getRepo(id) {
  return instance.get(`/repos/${id}`)
}

// 创建仓库
export function createRepo(data) {
  return instance_long.post('/repos', data)
}

// 更新仓库
export function updateRepo(id, data) {
  return instance_long.put(`/repos/update/${id}`, data)
}

// 删除仓库
export function deleteRepo(id, params) {
  return instance.delete(`/repos/delete/${id}`, { params })
}

// 获取系统数据
export function fetchData() {
  return instance.get('/api/data')
}

// 获取配置（GET /config）
export function getConfig() {
  return instance.get('/config')
}

// 更新配置（PUT /config）
export function updateConfig(data) {
  return instance.put('/config', data)
}

/**
 * 获取某仓库的所有分支列表
 * GET /commits/branches?repoID=123
 */
export function listBranches(repoID) {
  return instance.get('/commits/branches', {
    params: { repoID }
  })
}

/**
 * 切换仓库分支
 * POST /commits/switch-branch
 * body: { repoID, branch }
 */
export async function switchBranch(repoID, branch) {
  const data = new URLSearchParams()
  data.append('repoID', repoID)
  data.append('branch', branch)
  return instance_long.post('/commits/switch-branch', data)
}

/**
 * 获取提交记录（带筛选和分页）
 * GET /commits/filter?repoID=…&branch=…&start=…&end=…&author=…&page=…&size=…
 */
export function filterCommits(params) {
  return instance_long.get('/commits/filter', { params })
}

/**
 * 补全提交记录的文件差异详情
 * POST /commits/enrich-file-diffs
 * body: { repo_id: number, commit: object }
 */
export function enrichFileDiffs(repoID, commit) {
  return instance_long.post('/commits/enrich', {
    repo_id: repoID,
    commit: commit
  })
}

/* -------------------------- 代码搜索服务 -------------------------- */
/**
 * 深度搜索
 * @param project_dir
 * @param query
 * @param search_mode
 * @param limit
 */
export function searchCode(project_dir, query, search_mode, limit) {
  return fm_long.post('/search', {
    project_dir: project_dir,
    query: query,
    search_mode: search_mode,
    limit: limit,
    faiss: true
  })
}

/**
 * 列出函数
 * @param project_dir
 * @param scan
 */
export function listFunctions(project_dir, scan = false) {
  return fm_long.post('/functions', {
    project_dir: project_dir,
    scan: scan
  })
}

/**
 * 全量构建AI索引
 * @param project_dir
 * @param relative_dir
 */
export function buildIndex(project_dir, relative_dir) {
  return fm_long.post('/index', {
    project_dir: project_dir,
    relative_dir: relative_dir,
    faiss: true
  })
}

/**
 * 删除AI索引
 * @param project_dir
 */
export function deleteIndexApi(project_dir) {
  // axios.delete 不支持直接传 body，需要使用 data 字段
  return fm_long.delete('/index', {
    data: {
      project_dir: project_dir // 必填
      // relative_dir: 'sub/dir',             // 可选
    }
  })
}

/**
 * 重置AI索引
 * @param project_dir
 */
export function resetIndexApi(project_dir) {
  // axios.delete 不支持直接传 body，需要使用 data 字段
  return fm_long.delete('/index/reset', {
    data: {
      project_dir: project_dir // 必填
      // relative_dir: 'sub/dir',             // 可选
    }
  })
}

/**
 * 增量更新AI索引
 * @param project_dir
 * @param branch
 * @param commit
 */
export function incrementalIndex(project_dir, branch, commit) {
  return fm_long.post('/index/incremental', {
    project_dir: project_dir,
    branch: branch,
    commit: commit,
    faiss: true
  })
}

export function getExcludeApi(project_dir) {
  return fm_long.post('/exclude/read', {
    project_dir: project_dir
  })
}

export function updateExcludeApi(project_dir, exclude_array) {
  return fm_long.post('/exclude', {
    project_dir: project_dir,
    exclude: exclude_array
  })
}

export function getFmConfig() {
  return fm_config.get('/config')
}

export function updateFmConfig(data) {
  return fm_config.put('/config', data)
}

/* -------------------------- AI服务 -------------------------- */

export function deepResearch(repo_id, path, without_code, stream) {
  return fetch('http://127.0.0.1:19151/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      {
        repo_id: repo_id,
        path: path,
        without_code: without_code,
        stream: stream,
      }
    ),
  })
}

export function flowChart(repo_id, path, without_code, stream) {
  return fetch('http://127.0.0.1:19151/flowchart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      {
        repo_id: repo_id,
        path: path,
        without_code: without_code,
        stream: stream,
      }
    ),
  })
}

/* -------------------------- 文件操作 -------------------------- */
// 删除文件
export function deleteFile(id) {
  return instance.delete(`/files/${id}`)
}
// 获取文件列表
export function files(id) {
  return instance.get(`/files`)
}
// 获取分析报告文件列表
export function deepResearchFiles(id) {
  return instance.get(`/deep-research-files`)
}
// 获取流程图文件列表
export function flowChartFiles(id) {
  return instance.get(`/flow-chart-files`)
}

/* -------------------------- 健康检查 -------------------------- */
export function appHealthCheck() {
  return instance.get('/health')
}

export function faissHealthCheck() {
  return faiss.get('/health')
}

export function fmHealthCheck() {
  return fm.get('/health')
}
