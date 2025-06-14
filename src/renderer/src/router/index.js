import { createRouter, createWebHashHistory } from 'vue-router'

// 创建路由实例（使用动态导入实现懒加载）
const router = createRouter({
  history: createWebHashHistory(),  // 使用 hash 模式
  routes: [
    { path: '/', redirect: '/start' },
    {
      path: '/onboarding',
      name: 'onboarding',
      meta: { title: '新手引导', standalone: true },
      component: () => import('../views3/OnboardingGuide.vue')
    },
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
      meta: { title: '模型配置' },
      component: () => import('../views3/ModelConfig.vue')
    },
    {
      path: '/agent',
      name: 'agent',
      meta: { title: '智能体配置' },
      component: () => import('../views3/AgentConfig.vue')
    },
    {
      path: '/diff/viewer',
      name: 'diffViewer',
      meta: { title: '代码审查' },
      component: () => import('../views3/DiffViewer.vue')
    },
    {
      path: '/diff/viewer/demo',
      name: 'diffViewerDemo',
      meta: { title: '代码审查详情' },
      component: () => import('../views/DiffViewerDemo.vue')
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
      meta: { title: '仓库智能索引' },
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
      meta: { title: '文件枢纽' },
      component: () => import('../views/GitResearch.vue')
    },
    {
      path: '/finder/:localPath?',
      name: 'finder',
      meta: { title: '代码视窗' },
      component: () => import('../views3/FileBrowser.vue'),
      props: route => ({
        localPath: route.params.localPath,
        rootPath: route.query.rootPath,
        forceReplace: route.query.forceReplace,
        forceDeep: route.query.forceDeep,
      })
    },
    {
      path: '/ide/:localPath?',
      name: 'ide',
      meta: {
        title: 'IDE',
        standalone: true
      },
      component: () => import('../views3/IDE.vue'),
      props: route => ({
        localPath: route.params.localPath,
        rootPath: route.query.rootPath,
        forceReplace: route.query.forceReplace,
        forceDeep: route.query.forceDeep,
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
    },
    {
      path: '/term',
      name: 'term',
      meta: { title: '虚拟终端' },
      component: () => import('../views/TerminalDemo.vue'),
    },
  ]
});

export default router;
