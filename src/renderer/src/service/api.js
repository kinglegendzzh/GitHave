// api.js
import axios from 'axios'

// 创建一个 axios 实例
const instance = axios.create({
    baseURL: 'http://127.0.0.1:19151',
    timeout: 5000
})

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
    return instance.post('/repos', data)
}

// 更新仓库
export function updateRepo(id, data) {
    return instance.put(`/repos/update/${id}`, data)
}

// 删除仓库
export function deleteRepo(id) {
    return instance.delete(`/repos/delete/${id}`)
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
