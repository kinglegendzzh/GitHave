import { createRouter, createWebHashHistory } from 'vue-router'
import CodeRepoManagement from '../views/CodeRepoManagement.vue'
import QuickStartTimeline from '../views/QuickStartTimeline.vue'
import SystemConfig from '../views/SystemConfig.vue'
import DiffViewer from '../views/DiffViewer.vue'
import FileBrowser from '../views/FileBrowser.vue'
import SpaceLens from '../views/SpaceLens.vue'
import DeepSearch from '../views/DeepSearch.vue'
import GitResearch from '../views/GitResearch.vue'
import MsgSender from "../views/MsgSender.vue";
import MemoryCard from "../views/MemoryCard.vue";
import ModelConfig from "../views/ModelConfig.vue";
import AgentConfig from "../views/AgentConfig.vue";

// 创建路由实例
const router = createRouter({
  history: createWebHashHistory(),  // 使用 hash 模式
  routes: [
    { path: '/', redirect: '/start' },
    { path: '/start', name: 'start', meta: { title: '快速开始' }, component: QuickStartTimeline },
    { path: '/repo', name: 'repo', meta: { title: '仓库身份证' }, component: CodeRepoManagement },
    { path: '/config', name: 'config', meta: { title: '系统配置' }, component: SystemConfig },
    { path: '/model', name: 'model', meta: { title: '模型管理' }, component: ModelConfig },
    { path: '/agent', name: 'agent', meta: { title: '智能体管理' }, component: AgentConfig },
    { path: '/commits', name: 'commits', meta: { title: '智能审查' }, component: DiffViewer },
    { path: '/sender', name: 'sender', meta: { title: '智能推送（企微｜邮件）' }, component: MsgSender },
    {
      path: '/scan',
      name: 'scan',
      component: MemoryCard,
      meta: { title: '数据记忆卡' },
    },
    {
      path: '/search',
      name: 'search',
      component: DeepSearch,
      meta: { title: '深度搜索' },
    },
    {
      path: '/report',
      name: 'report',
      component: GitResearch,
      meta: { title: '分析报告' },
    },
    {
      path: '/finder/:localPath?',
      name: 'finder',
      component: FileBrowser,
      meta: { title: '代码视窗' },
      props: route => ({
        localPath: route.params.localPath,
        forceReplace: route.params.forceReplace === 'true',
      })
    },
    {
      path: '/space/:localPath?',
      name: 'space',
      component: SpaceLens,
      meta: { title: '空间透镜' },
      props: route => ({
        localPath: route.params.localPath
      })
    },
  ]
})

export default router
