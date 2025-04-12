<template>
  <v-app>
    <!-- 侧边抽屉 -->
    <v-navigation-drawer
      v-model="drawer"
      app
      :rail="false"
      :dark="isDark"
      :color="isDark ? 'black' : 'white'"
      style="padding-top: 10px;"
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
            GitGo
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
    <v-app-bar app :dark="isDark" class="drag-region" >
      <v-tooltip class="no-drag-region" bottom>
        <template v-slot:activator="{ props }">
          <v-btn class="no-drag-region" icon v-bind="props" @click="drawer = !drawer">
            <v-icon>mdi-menu</v-icon>
          </v-btn>
        </template>
        <span>点击切换侧边栏</span>
      </v-tooltip>

      <v-toolbar-title style="user-select: none; pointer-events: none;">{{ currentTitle }}</v-toolbar-title>

      <!-- 新增主题切换开关 -->
      <v-spacer></v-spacer>
      <v-switch v-model="isDark" class="ml-4 no-drag-region" @change="toggleTheme" hide-details>
        <template v-slot:append>
          <v-icon class="no-drag-region" v-if="isDark" :style="{ color: 'white' }">mdi-moon-waning-crescent</v-icon>
          <v-icon class="no-drag-region" v-else :style="{ color: '#FFD700' }">mdi-white-balance-sunny</v-icon>
        </template>
      </v-switch>
      <v-tooltip class="no-drag-region" bottom>
        <template v-slot:activator="{ props }">
          <v-btn  icon class="ml-4 no-drag-region" v-bind="props" @click="reloadPage">
            <v-icon>mdi-refresh</v-icon>
          </v-btn>
        </template>
        <span>重载当前页面</span>
      </v-tooltip>
    </v-app-bar>

    <!-- 主体区域：直接使用 router-view，子页面自行控制容器 -->
    <v-main>
      <RouterView  v-slot="{ Component }">
        <Suspense>
          <keep-alive :exclude="['FileBrowser', 'CodeRepoManagement']">
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
import { RouterView } from 'vue-router'


export default {
  name: "MainLayout",
  components: {
    RouterView
  },
  data() {
    return {
      bannerSrc,
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
    };
  },
  computed: {
    currentTitle() {
      return this.$route.meta.title || 'GitGo';
    }
  },
  async created() {
    this.detectSystemTheme();
  },
  methods: {
    ttt(it, idx) {
      console.log('11', it, idx)
    },
    reloadPage() {
      location.reload();
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
      console.log('upupup', item, state)
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
</style>
