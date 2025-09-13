import { createApp, h, Transition, nextTick } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import { createVuetify } from 'vuetify'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'

import {
  VApp,
  VCard,
  VBtn,
  VTabs,
  VTab,
  VContainer,
  VRow,
  VCol,
  VSlider,
  VWindow,
  VWindowItem,
  VList,
  VListItem,
  VListItemTitle,
  VCardText,
  VDivider,
  VCardActions,
  VImg,
  VAvatar,
  VListGroup,
  VNavigationDrawer,
  VIcon,
  VTooltip,
  VToolbarTitle,
  VSpacer,
  VSwitch,
  VAppBar,
  VMain,
  VCardTitle,
  VStepper,
  VStepperItem,
  VStepperHeader,
  VTimeline,
  VTimelineItem,
  VSnackbar,
  VMenu,
  VProgressCircular,
  VOverlay,
  VAutocomplete,
  VBreadcrumbsItem,
  VBreadcrumbs,
  VToolbar,
  VSkeletonLoader,
  VTextField,
  VTextarea,
  VForm,
  VDialog,
  VExpansionPanelTitle,
  VProgressLinear,
  VExpansionPanelText,
  VExpansionPanels,
  VExpansionPanel,
  VCardSubtitle,
  VCheckbox,
  VChip,
  VListItemSubtitle,
  VRadio,
  VRadioGroup,
  VHover,
  VSheet,
  VListItemAction,
  VBadge,
  VBottomNavigation,
  VBtnToggle,
  VSelect,
  VAlert,
  VChipGroup,
  VExpandTransition,
  VTabsWindowItem,
  VTabsWindow,
  VCombobox,
  VListSubheader
} from 'vuetify/components'
import { Ripple, Tooltip } from 'vuetify/directives'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

import mermaid from 'mermaid/dist/mermaid.esm.min.mjs'

// ---------- 创建 Vue 应用 ----------
const app = createApp(App)
app.component('Transition', Transition)
app.config.globalProperties.$createElement = h

const vuetify = createVuetify({
  components: {
    VApp,
    VCard,
    VBtn,
    VTabs,
    VTab,
    VContainer,
    VRow,
    VCol,
    VSlider,
    VWindow,
    VWindowItem,
    VList,
    VListItem,
    VListItemTitle,
    VCardText,
    VDivider,
    VCardActions,
    VImg,
    VAvatar,
    VListGroup,
    VNavigationDrawer,
    VIcon,
    VTooltip,
    VToolbarTitle,
    VSpacer,
    VSwitch,
    VAppBar,
    VMain,
    VCardTitle,
    VStepper,
    VStepperItem,
    VStepperHeader,
    VTimeline,
    VTimelineItem,
    VSnackbar,
    VMenu,
    VProgressCircular,
    VOverlay,
    VAutocomplete,
    VBreadcrumbsItem,
    VBreadcrumbs,
    VToolbar,
    VSkeletonLoader,
    VTextField,
    VTextarea,
    VForm,
    VDialog,
    VExpansionPanelTitle,
    VProgressLinear,
    VExpansionPanelText,
    VExpansionPanels,
    VExpansionPanel,
    VCardSubtitle,
    VCheckbox,
    VChip,
    VListItemSubtitle,
    VRadio,
    VRadioGroup,
    VHover,
    VSheet,
    VListItemAction,
    VBadge,
    VBottomNavigation,
    VBtnToggle,
    VSelect,
    VAlert,
    VChipGroup,
    VExpandTransition,
    VTabsWindowItem,
    VTabsWindow,
    VCombobox,
    VListSubheader
  },
  directives: { Ripple, Tooltip }
})

app.use(router)
app.use(store)
app.use(vuetify)
app.use(ElementPlus)
app.use(Antd)

// Vue3 已无 productionTip，但保留不报错
app.config.productionTip = false

// ---------- Mermaid：增量渲染与动态侦听 ----------
function setupMermaidOnce() {
  if (setupMermaidOnce._installed) return
  setupMermaidOnce._installed = true

  mermaid.initialize({ startOnLoad: false, theme: 'default' })

  const renderedSet = new WeakSet()

  const renderBlock = async (block, id) => {
    if (!block || renderedSet.has(block)) return
    const code = block.textContent || ''
    if (!code.trim()) return
    try {
      // mermaid@10+：render 返回 {svg, bindFunctions}
      const { svg } = await mermaid.render(`mermaid-${id}`, code)
      block.innerHTML = svg
      renderedSet.add(block)
    } catch (e) {
      console.warn('[Mermaid] render error:', e)
    }
  }

  const scanAndRenderAll = () => {
    const blocks = document.querySelectorAll('.mermaid')
    let idx = 0
    blocks.forEach((b) => renderBlock(b, idx++))
  }

  // 首次全量渲染（等 DOM 稳定后）
  nextTick().then(() => {
    scanAndRenderAll()
  })

  // 动态监听：对新增/变更的 .mermaid 节点做增量渲染
  const mo = new MutationObserver((muts) => {
    let need = false
    for (const m of muts) {
      if (m.addedNodes && m.addedNodes.length) {
        need = true
        break
      }
      if (m.type === 'childList' || m.type === 'characterData') {
        need = true
        break
      }
    }
    if (need) scanAndRenderAll()
  })
  mo.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true
  })
}

// ---------- 深链（githave://）处理 ----------
function parseAndRouteDeeplink(raw) {
  if (!raw || typeof raw !== 'string') return
  try {
    const u = new URL(raw)
    // 例：githave://open?repo=foo
    if (u.protocol === 'githave:' && (u.hostname === 'open' || u.host === 'open')) {
      const repo = u.searchParams.get('repo')
      // 若你已有 /open 路由，可直达
      router.push({ path: '/open', query: { repo: repo || '' } }).catch(() => {})
    } else {
      // 未知路径：先缓存到 localStorage，供业务组件自行消费
      localStorage.setItem('pendingDeeplink', raw)
    }
  } catch (e) {
    console.warn('[Deeplink] invalid url:', raw, e)
    localStorage.setItem('pendingDeeplink', raw)
  }
}

function setupDeeplinkOnce() {
  if (setupDeeplinkOnce._installed) return
  setupDeeplinkOnce._installed = true

  // 由 preload 暴露的接口（见我之前给的 main.ts/preload.ts）
  if (window.deeplink && typeof window.deeplink.on === 'function') {
    window.deeplink.on((url) => {
      parseAndRouteDeeplink(url)
    })
  }

  // 冷启动/热重载：处理尚未消费的深链
  const pending = localStorage.getItem('pendingDeeplink')
  if (pending) {
    parseAndRouteDeeplink(pending)
    localStorage.removeItem('pendingDeeplink')
  }

  // 提供浏览器端一键拉起（带回退）的工具（可在你的下载页按钮中直接调用）
  window.launchGitHave = (url, fallback = 'https://githave.com/download') => {
    try {
      const t0 = Date.now()
      window.location.href = url
      setTimeout(() => {
        // 简单“是否成功”启发式：若协议未被系统接管，浏览器通常不会切走当前页
        if (Date.now() - t0 < 2000) {
          window.location.href = fallback
        }
      }, 1800)
    } catch {
      window.location.href = fallback
    }
  }
}

// ---------- 挂载并初始化增强 ----------
app.mount('#app')

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  setupMermaidOnce()
  setupDeeplinkOnce()
}
