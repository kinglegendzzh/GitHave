import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import { createVuetify } from 'vuetify'
import 'vuetify/styles'  // 引入 Vuetify 的样式
import '@mdi/font/css/materialdesignicons.css'  // 引入 Material Design Icons

// 创建 Vue 应用实例
const app = createApp(App)

// 创建 Vuetify 实例
const vuetify = createVuetify()

// 使用 Vuetify 插件、router 和 store
app.use(router)
app.use(store)
app.use(vuetify)

app.config.productionTip = false
app.mount('#app')
