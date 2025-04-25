<template>
  <v-app>
    <!-- 侧边抽屉 -->
    <v-navigation-drawer
      v-model="drawer"
      app
      :rail="false"
      :dark="isDark"
      :color="isDark ? 'black' : 'white'"
      style="padding-top: 20px;"
      width="250"
      class="drag-region"
    >
      <v-list dense>
        <v-list-item class="drag-region">
          <template v-slot:prepend>
            <v-avatar>
              <v-img :src="bannerSrc"></v-img>
            </v-avatar>
          </template>
          <v-list-item-title
            :class="{ 'text-white': isDark, 'text-black': !isDark }"
            style="font-size: 1rem; user-select: none; pointer-events: none;"
          >
            <span v-if="!isDark">
              <v-img style="width: 110px; height: auto;" :src="titleSrc"></v-img>
            </span>
            <span v-else>
              <v-img style="width: 110px; height: auto;" :src="titleNSrc"></v-img>
            </span>
          </v-list-item-title>
        </v-list-item>

        <v-divider></v-divider>

        <!-- 遍历导航项 -->
        <template v-for="(item, index) in navItems" :key="item.title">
          <!-- 一级菜单项 -->
          <v-list-item
            class="no-drag-region"
            @click="ttt(item, index)"
            v-if="!item.children"
            :to="item.to"
            :prepend-icon="item.icon"
            :title="item.title"
            link
            :class="{ 'text-white': isDark, 'text-black': !isDark }"
            size="medium"
            active-class="active-link"
          ></v-list-item>

          <!-- 有子菜单时，使用 v-list-group -->
          <v-list-group
            class="no-drag-region"
            @click="ttt(item, index)"
            v-if="item.children"
            @update:value="updateGroupState(item, $event)"
            :prepend-icon="item.icon"
            :key="`${item.title}-group-${index}`"
            :id="`group-${item.title}-${index}`"
          >
            <template v-slot:activator="{ props }">
              <v-list-item
                class="no-drag-region"
                v-bind="props"
                :title="item.title"
                :class="{ 'text-white': isDark, 'text-black': !isDark }"
              ></v-list-item>
            </template>
            <!-- 遍历子菜单 -->
            <v-list-item
              class="no-drag-region"
              v-for="(child, i) in item.children"
              :key="`${item.title}-${i}`"
              :to="child.to"
              :prepend-icon="child.icon"
              :title="child.title"
              :class="{ 'text-white': isDark, 'text-black': !isDark }"
              size="medium"
              active-class="active-link"
            ></v-list-item>
          </v-list-group>
        </template>
      </v-list>
    </v-navigation-drawer>

    <!-- 顶部工具栏 -->
    <v-app-bar app :dark="isDark" class="drag-region">
      <v-tooltip class="no-drag-region" bottom>
        <template v-slot:activator="{ props }">
          <v-btn class="no-drag-region" icon v-bind="props" @click="drawer = !drawer">
            <v-icon>mdi-menu</v-icon>
          </v-btn>
        </template>
        <span>点击切换侧边栏</span>
      </v-tooltip>

      <v-toolbar-title style="user-select: none; pointer-events: none;">
        {{ currentTitle }}
      </v-toolbar-title>

      <!-- 健康状态显示 -->
      <v-chip
        :color="chipColor"
        text-color="white"
        small
        class="ml-4"
        style="font-weight: bold;"
      >
        <v-icon left small>
          {{ chipIcon }}
        </v-icon>
        {{ appHealthState }}
      </v-chip>

      <v-spacer></v-spacer>
      <v-switch
        v-model="isDark"
        class="ml-4 no-drag-region"
        @change="toggleTheme"
        hide-details
      >
        <template v-slot:append>
          <v-icon class="no-drag-region" v-if="isDark" :style="{ color: 'white' }">
            mdi-moon-waning-crescent
          </v-icon>
          <v-icon class="no-drag-region" v-else :style="{ color: '#FFD700' }">
            mdi-white-balance-sunny
          </v-icon>
        </template>
      </v-switch>
      <v-tooltip class="no-drag-region" bottom>
        <template v-slot:activator="{ props }">
          <!-- 重载当前页面按钮 -->
          <v-btn
            icon
            class="ml-4 no-drag-region"
            v-bind="props"
            @click="reloadPage"
          >
            <v-icon>mdi-refresh</v-icon>
          </v-btn>
        </template>
        <span>重载当前页面</span>
      </v-tooltip>
      <v-tooltip class="no-drag-region" bottom>
        <template v-slot:activator="{ props }">
          <!-- 切换核心服务状态的按钮 -->
          <v-btn
            icon
            class="ml-4 no-drag-region"
            v-bind="props"
            @click="toggleAppService"
            :disabled="appHealthState === '正在清理端口并重启核心服务' || appHealthState === '正在重启'"
          >
            <v-icon>mdi-laptop</v-icon>
          </v-btn>
        </template>
        <span>{{toggleAppTip}}</span>
      </v-tooltip>

    </v-app-bar>

    <!-- 主体区域：直接使用 router-view -->
    <v-main>
      <RouterView v-slot="{ Component }">
        <Suspense>
          <keep-alive :exclude="['FileBrowser', 'CodeRepoManagement', 'AgentConfig', 'ModelConfig']">
            <component :is="Component" />
          </keep-alive>
        </Suspense>
      </RouterView>
    </v-main>
  </v-app>
</template>

<script>
import _ from 'lodash';
import bannerSrc from '../assets/banner.svg';
import titleSrc from '../assets/title.svg';
import titleNSrc from '../assets/title-night.svg';
import { RouterView } from 'vue-router';

export default {
  name: "MainLayout",
  components: {
    RouterView
  },
  data() {
    return {
      // 健康状态枚举：支持 "正在重启"、"已关闭"、"已启动"
      toggleAppTip: '关闭核心服务',
      appHealthState: '已启动',
      bannerSrc,
      titleSrc,
      titleNSrc,
      drawer: true,
      navItems: [
        { title: "快速开始", to: "/start", icon: "mdi-home" },
        {
          title: "AI智能",
          icon: "mdi-robot",
          expanded: false,
          children: [
            { title: "智能推送", to: "/sender", icon: "mdi-send" },
            { title: "空间透镜", to: "/space", icon: "mdi-telescope" },
            { title: "代码详情", to: "/finder", icon: "mdi-code-block-tags" },
          ]
        },
        {
          title: "仓库配置",
          icon: "mdi-source-repository",
          expanded: false,
          children: [
            { title: "仓库身份证", to: "/repo", icon: "mdi-github" },
          ]
        },
        {
          title: "AI配置",
          icon: "mdi-cogs",
          expanded: false,
          children: [
            { title: "模型管理", to: "/model", icon: "mdi-cards-playing-club-multiple-outline" },
            { title: "智能体管理", to: "/agent", icon: "mdi-robot-happy-outline" },
          ]
        },
        {
          title: "正在开发中...",
          icon: "mdi-account-hard-hat-outline",
          expanded: false,
          children: [
            { title: "分析报告", to: "/report", icon: "mdi-microsoft-word" },
            { title: "深度搜索", to: "/search", icon: "mdi-book-search" },
            { title: "代码审查", to: "/commits", icon: "mdi-robot-angry" },
            { title: "数据记忆卡", to: "/scan", icon: "mdi-credit-card-scan" },
          ]
        },
      ],
      isDark: false,
      healthInterval: null
    };
  },
  computed: {
    currentTitle() {
      return this.$route.meta.title || 'GitHave';
    },
    chipColor() {
      if (this.appHealthState === '正在重启') return 'orange';
      if (this.appHealthState === '正在清理端口并重启核心服务') return 'orange';
      else if (this.appHealthState === '已启动') return 'green';
      else if (this.appHealthState === '已关闭') return 'grey';
      else return 'grey';
    },
    chipIcon() {
      if (this.appHealthState === '正在重启') return 'mdi-progress-clock';
      if (this.appHealthState === '正在清理端口并重启核心服务') return 'mdi-progress-clock';
      else if (this.appHealthState === '已启动') return 'mdi-check-circle';
      else if (this.appHealthState === '已关闭') return 'mdi-close-circle';
      else return 'mdi-help-circle';
    }
  },
  async created() {
    this.detectSystemTheme();
    try {
      const result = await window.electron.checkAppHealth();
      if (result && result.state) {
        this.appHealthState = result.state;
      } else {
        this.appHealthState = '已关闭';
      }
    } catch (err) {
      console.error('检测 app 健康状态失败：', err);
      this.appHealthState = '已关闭';
    }
    this.changeTip(this.appHealthState)
    console.log('appHealthState:', this.appHealthState)
    // 定时器每 5 秒轮询检测 app 服务健康状态
    this.healthInterval = setInterval(async () => {
      try {
        const result = await window.electron.checkAppHealth();
        if (result && result.state) {
          this.appHealthState = result.state;
        } else {
          this.appHealthState = '已关闭';
        }
        this.changeTip(this.appHealthState)
      } catch (err) {
        console.error('检测 app 健康状态失败：', err);
        this.appHealthState = '已关闭';
      }
    }, 5000);
  },
  beforeDestroy() {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
    }
  },
  methods: {
    changeTip(state){
      switch (state) {
        case '正在重启':
          this.toggleAppTip = '正在重启';
          break;
        case '正在清理端口并重启核心服务':
        case '已关闭':
          this.toggleAppTip = '启动核心服务';
          break;
        case '已启动':
          this.toggleAppTip = '关闭核心服务';
          break;
        default:
          this.toggleAppTip = '操作核心服务';
      }
    },
    ttt(item, idx) {
      console.log('点击导航项：', item, idx);
    },
    reloadPage() {
      location.reload();
    },
    async toggleAppService() {
      try {
        // 获取系统配置路径，注意启动服务需要配置路径，停止服务则不需要
        const sysConfigResp = await window.electron.sysConfig();
        console.log('configPath:', sysConfigResp.configPath);
        if (this.appHealthState === '已关闭' || this.appHealthState === '未启动') {
          console.log('当前状态为已关闭（未启动），开始启动 app 服务...');
          // 调用启动接口启动 app 服务
          const startResult = await window.electron.startApp(sysConfigResp.configPath);
          if (!startResult.started) {
            console.error('启动 app 服务失败:', startResult.error);
            return;
          }
          console.log('app 服务启动成功，新 pid:', startResult.pid);
          this.appHealthState = '已启动';
        } else if (this.appHealthState === '已启动') {
          console.log('当前状态为已启动，开始停止 app 服务...');
          // 调用停止接口停止 app 服务
          const stopResult = await window.electron.stopApp();
          if (!stopResult.stopped) {
            console.error('停止 app 服务失败:', stopResult.error);
            return;
          }
          console.log('app 服务已停止');
          this.appHealthState = '已关闭';
        }
      } catch (error) {
        console.error('切换 app 服务状态失败:', error);
      }
    },
    toggleTheme() {
      this.$vuetify.theme.global.name = this.isDark ? 'dark' : 'light';
      localStorage.setItem('isDark', this.isDark);
    },
    detectSystemTheme() {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isDark = isDarkMode;
      this.$vuetify.theme.global.name = isDarkMode ? 'dark' : 'light';
      localStorage.setItem('isDark', this.isDark);
    },
    updateGroupState(item, state) {
      console.log('更新组状态：', item, state);
      item.expanded = state;
    },
    saveNavState: _.debounce(function() {
      const navState = this.navItems
        .filter(item => item.children)
        .reduce((acc, item) => {
          acc[item.title] = item.expanded;
          return acc;
        }, {});
      localStorage.setItem('navState', JSON.stringify(navState));
    }, 300),
  },
  watch: {
    navItems: {
      handler: 'saveNavState',
      deep: true
    }
  },
  async mounted() {
    const storedTheme = localStorage.getItem('isDark');
    if (storedTheme !== null) {
      this.isDark = storedTheme === 'true';
      this.$vuetify.theme.global.name = this.isDark ? 'dark' : 'light';
    } else {
      this.detectSystemTheme();
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      this.detectSystemTheme();
    });

    const storedNavState = localStorage.getItem('navState');
    if (storedNavState) {
      const navState = JSON.parse(storedNavState);
      this.navItems.forEach(item => {
        if (item.children && navState.hasOwnProperty(item.title)) {
          item.expanded = navState[item.title];
        }
      });
    }
  }
};
</script>

<style scoped>
.drag-region {
  -webkit-app-region: drag;
  .no-drag-region, v-tooltip, v-switch, v-btn {
    -webkit-app-region: no-drag;
  }
}

.v-list-group__items .v-list-item {
  padding-left: 32px !important;
}

.active-link {
  background-color: rgba(var(--v-theme-primary), 0.12);
}

:deep(.v-navigation-drawer .v-list-item-title) {
  font-size: 0.8rem !important;
}
</style>
