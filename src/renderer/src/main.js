import { createApp, h, Transition } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import { createVuetify } from 'vuetify'
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
} from 'vuetify/components'
import { Ripple, Tooltip } from 'vuetify/directives'
import 'vuetify/styles'                // 仅引入必要的 Vuetify 样式
import '@mdi/font/css/materialdesignicons.css' // 图标字体
import mermaid from 'mermaid/dist/mermaid.esm.min.mjs';
document.addEventListener('DOMContentLoaded', () => {
  mermaid.initialize({ startOnLoad: false, theme: 'default' });

  document.querySelectorAll('.mermaid').forEach((block, idx) => {
    const code = block.textContent;
    // mermaid.render 会返回 SVG
    mermaid.render(`mermaid-${idx}`, code, (svgCode) => {
      block.innerHTML = svgCode;
    });
  });
});

// 创建 Vue 应用实例
const app = createApp(App)
// 注册内置 Transition 组件（确保库可以正确解析）
app.component('transition', Transition)
app.config.globalProperties.$createElement = h
// 创建 Vuetify 实例
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
  },
  directives: {
    Ripple,
    Tooltip
  }
})

// 注册插件、router 和 store
app.use(router)
app.use(store)
app.use(vuetify)

// 关闭生产模式 tip
app.config.productionTip = false

// 挂载应用
app.mount('#app')
