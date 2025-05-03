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
      component: () => import('../views3/QuickStartTimeline.vue')
    },
    {
      path: '/repo',
      name: 'repo',
      meta: { title: '仓库身份证' },
      component: () => import('../views3/CodeRepoManagement.vue')
    },
    {
      path: '/model',
      name: 'model',
      meta: { title: '模型与角色' },
      component: () => import('../views3/ModelConfig.vue')
    },
    {
      path: '/agent',
      name: 'agent',
      meta: { title: '智能体' },
      component: () => import('../views3/AgentConfig.vue')
    },
    {
      path: '/commits',
      name: 'commits',
      meta: { title: '代码审查' },
      component: () => import('../views/DiffViewer.vue')
    },
    {
      path: '/sender',
      name: 'sender',
      meta: { title: '推送机器人（企微｜邮件）' },
      component: () => import('../views/MsgSender.vue')
    },
    {
      path: '/scan',
      name: 'scan',
      meta: { title: '仓库记忆闪存' },
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
      meta: { title: '枢纽' },
      component: () => import('../views/GitResearch.vue')
    },
    {
      path: '/finder/:localPath?',
      name: 'finder',
      meta: { title: '代码预览' },
      component: () => import('../views3/FileBrowser.vue'),
      props: route => ({
        localPath: route.params.localPath,
        forceReplace: route.params.forceReplace === 'true',
      })
    },
    {
      path: '/ide/:localPath?',
      name: 'ide',
      meta: { title: 'IDE' },
      component: () => import('../views3/IDE.vue'),
      props: route => ({
        localPath: route.params.localPath,
        forceReplace: route.params.forceReplace === 'true',
      })
    },
    {
      path: '/space/:localPath?',
      name: 'space',
      meta: { title: '空间透镜' },
      component: () => import('../views3/SpaceLens.vue'),
      props: route => ({
        localPath: route.params.localPath,
      })
    },
    {
      path: '/commits/history',
      name: 'commitsHistory',
      meta: { title: '提交审查' },
      component: () => import('../views3/CommitHistory.vue'),
      props: route => ({
        localPath: route.params.localPath,
      })
    },
  ]
});

export default router;
