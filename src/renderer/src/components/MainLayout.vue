<template>
  <v-app>
    <!-- 侧边抽屉 -->
    <v-navigation-drawer
        v-model="drawer"
        app
        rail
        :dark="isDark"
        :color="isDark ? 'black' : 'white'"
        class="drag-region"
        style="padding-top: 10px;"
    >
      <v-list dense>
        <v-list-item>
          <v-list-item-avatar>
            <v-img :src="bannerSrc"></v-img>
          </v-list-item-avatar>
          <v-list-item-content>
            <v-list-item-title
                :class="{ 'white--text': isDark, 'black--text': !isDark }"
                style="font-size: 1rem;user-select: none; pointer-events: none;"
            >
              GitGo
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-divider></v-divider>
        <template v-for="(item, index) in navItems" :key="index">
          <!-- 如果有子菜单，用 v-list-group -->
          <v-list-group
            v-if="item.children"
            no-action
            :prepend-icon="item.icon"
            active-class="active-link"
            v-model="item.expanded"
          >
            <template v-slot:activator>
              <v-list-item-content>
                <v-list-item-title
                  :class="{ 'white--text': isDark, 'black--text': !isDark }"
                  style="user-select: none; pointer-events: none;"
                >
                  {{ item.title }}
                </v-list-item-title>
              </v-list-item-content>
            </template>
            <!-- 遍历子项 -->
            <v-list-item
              v-for="(child, i) in item.children"
              :key="i"
              :to="child.to"
              link
              active-class="active-link"
            >
              <v-list-item-content>
                <v-list-item-title
                  :class="{ 'white--text': isDark, 'black--text': !isDark }"
                  style="user-select: none; pointer-events: none;"
                >
                  <v-icon size="medium">{{ child.icon }}</v-icon> {{ child.title }}
                </v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list-group>
          <!-- 如果没有子菜单，直接用 v-list-item -->
          <v-list-item
            v-else
            :key="index"
            :to="item.to"
            link
            active-class="active-link"
          >
            <v-list-item-content>
              <v-list-item-title
                :class="{ 'white--text': isDark, 'black--text': !isDark }"
              >
                <v-icon size="medium">{{ item.icon }}</v-icon> {{ item.title }}
              </v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </template>
      </v-list>
    </v-navigation-drawer>

    <!-- 顶部工具栏 -->
    <v-app-bar app :dark="isDark" class="drag-region" style="padding-top: 10px;">
      <v-tooltip bottom>
        <template v-slot:activator="{ on, attrs }">
          <v-btn icon v-bind="attrs" v-on="on" @click="drawer = !drawer">
            <v-icon>mdi-menu</v-icon>
          </v-btn>
        </template>
        <span>点击切换侧边栏</span>
      </v-tooltip>

      <v-toolbar-title style="user-select: none; pointer-events: none;">{{ currentTitle }}</v-toolbar-title>

      <!-- 新增主题切换开关 -->
      <v-spacer></v-spacer>
      <v-switch v-model="isDark" class="ml-4" @change="toggleTheme" hide-details>
        <template v-slot:append>
          <v-icon v-if="isDark" :style="{ color: 'white' }">mdi-moon-waning-crescent</v-icon>  <!-- 为夜间图标添加白色颜色 -->
          <v-icon v-else :style="{ color: '#FFD700' }">mdi-white-balance-sunny</v-icon>  <!-- 为白天图标添加金色颜色 -->
        </template>
      </v-switch>
      <v-tooltip bottom>
        <template v-slot:activator="{ on, attrs }">
          <v-btn icon class="ml-4" v-bind="attrs" v-on="on" @click="reloadPage">
            <v-icon>mdi-refresh</v-icon>
          </v-btn>
        </template>
        <span>重载当前页面</span>
      </v-tooltip>
    </v-app-bar>

    <!-- 主体区域：直接使用 router-view，子页面自行控制容器 -->
    <v-main>
      <keep-alive :exclude="['FileBrowser']">
        <router-view></router-view>
      </keep-alive>
    </v-main>
  </v-app>
</template>

<script>
import _ from 'lodash';
import bannerSrc from '../assets/banner.svg';

export default {
  name: "MainLayout",
  data() {
    return {
      bannerSrc,
      drawer: true,
      navItems: [
        { title: "快速开始", to: "/start", icon: "mdi-home" },
        {
          title: "AI智能",
          icon: "mdi-robot",
          expanded: true,
          children: [
            { title: "深度搜索", to: "/search", icon: "mdi-book-search" },
            { title: "分析报告", to: "/report", icon: "mdi-microsoft-word" },
            { title: "代码审查", to: "/commits", icon: "mdi-robot-angry" },
            { title: "智能推送（邮件｜企微）", to: "/sender", icon: "mdi-send" },
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
            { title: "数据记忆卡", to: "/scan", icon: "mdi-credit-card-scan" },
          ]
        },
        {
          title: "AI配置",
          icon: "mdi-cogs",
          expanded: false,
          children: [
            { title: "模型管理", to: "/model", icon: "mdi-cards-playing-club-multiple-outline" },
            { title: "智能体管理", to: "/agent", icon: "mdi-robot-happy-outline" },
            { title: "其他", to: "/config", icon: "mdi-cog" },
          ]
        },
      ],
      isDark: false,
    };
  },
  computed: {
    currentTitle() {
      return this.$route.meta.title || 'GitGo';
    }
  },
  created() {
    this.detectSystemTheme();
  },
  methods: {
    reloadPage() {
      location.reload();
    },
    toggleTheme() {
      this.$vuetify.theme.dark = this.isDark;
      localStorage.setItem('isDark', this.isDark); // 将昼夜模式存储在localStorage中
    },
    // 新增：检测系统主题
    detectSystemTheme() {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isDark = isDarkMode;
      this.$vuetify.theme.dark = isDarkMode;
      console.log('detectSystemTheme', isDarkMode)
      localStorage.setItem('isDark', this.isDark);
    },
    // 新增：保存导航栏状态
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
  mounted() {
    const storedTheme = localStorage.getItem('isDark');
    if (storedTheme !== null) {
      this.isDark = storedTheme === 'true';
      this.$vuetify.theme.dark = this.isDark;
    } else {
      this.detectSystemTheme();
    }

    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      this.detectSystemTheme();
    });

    // 恢复导航栏状态
    const storedNavState = localStorage.getItem('navState');
    console.log('storedNavState', storedNavState)
    if (storedNavState) {
      const navState = JSON.parse(storedNavState);
      this.navItems.forEach(item => {
        // eslint-disable-next-line no-prototype-builtins
        if (item.children && navState.hasOwnProperty(item.title)) {
          item.expanded = navState[item.title];
        }
      });
    }
  }
};
</script>

<style scoped>
.active-link ::v-deep {
  background-color: v-bind('isDark ? "#343541" : "#e0e0e0"') !important;
  color: v-bind('isDark ? "white" : "black"') !important;
}
.drag-region {
  -webkit-app-region: drag;
  height: 30px;
  /* 其他样式 */
}
</style>
