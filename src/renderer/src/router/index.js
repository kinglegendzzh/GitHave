import { createRouter, createWebHashHistory } from 'vue-router'

// 创建路由实例（使用动态导入实现懒加载）
const router = createRouter({
  history: createWebHashHistory(),  // 使用 hash 模式
  routes: [
    { path: '/', redirect: '/start' },
    {
      path: '/start',
      name: 'start',
      meta: { title: '快速开始' },
      component: () => import('../views/QuickStartTimeline.vue')
    },
    {
      path: '/repo',
      name: 'repo',
      meta: { title: '仓库身份证' },
      component: () => import('../views/CodeRepoManagement.vue')
    },
    {
      path: '/config',
      name: 'config',
      meta: { title: '系统配置' },
      component: () => import('../views/SystemConfig.vue')
    },
    {
      path: '/model',
      name: 'model',
      meta: { title: '模型管理' },
      component: () => import('../views/ModelConfig.vue')
    },
    {
      path: '/agent',
      name: 'agent',
      meta: { title: '智能体管理' },
      component: () => import('../views/AgentConfig.vue')
    },
    {
      path: '/commits',
      name: 'commits',
      meta: { title: '智能审查' },
      component: () => import('../views/DiffViewer.vue')
    },
    {
      path: '/sender',
      name: 'sender',
      meta: { title: '智能推送（企微｜邮件）' },
      component: () => import('../views/MsgSender.vue')
    },
    {
      path: '/scan',
      name: 'scan',
      meta: { title: '数据记忆卡' },
      component: () => import('../views/MemoryCard.vue')
    },
    {
      path: '/search',
      name: 'search',
      meta: { title: '深度搜索' },
      component: () => import('../views/DeepSearch.vue')
    },
    {
      path: '/report',
      name: 'report',
      meta: { title: '分析报告' },
      component: () => import('../views/GitResearch.vue')
    },
    {
      path: '/finder/:localPath?',
      name: 'finder',
      meta: { title: '代码详情' },
      component: () => import('../views/FileBrowser.vue'),
      props: route => ({
        localPath: route.params.localPath,
        forceReplace: route.params.forceReplace === 'true',
      })
    },
    {
      path: '/space/:localPath?',
      name: 'space',
      meta: { title: '空间透镜' },
      component: () => import('../views/SpaceLens.vue'),
      props: route => ({
        localPath: route.params.localPath,
      })
    },
  ]
});

export default router;
