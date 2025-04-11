import { createApp, h, Transition } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import { createVuetify } from 'vuetify'
import 'vuetify/styles'  // 引入 Vuetify 的样式
import '@mdi/font/css/materialdesignicons.css' // Ensure you are using css-loader
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// 创建 Vue 应用实例
const app = createApp(App)
// 注册内置 Transition 组件（确保库可以正确解析）
app.component('transition', Transition)
app.config.globalProperties.$createElement = h
// 创建 Vuetify 实例
const vuetify = createVuetify({
  // icons: {
  //   defaultSet: 'mdi', // This is already the default value - only for display purposes
  // },
  // components,
  // directives,
})

// 使用 Vuetify 插件、router 和 store
app.use(router)
app.use(store)
app.use(vuetify)

app.config.productionTip = false
app.mount('#app')
