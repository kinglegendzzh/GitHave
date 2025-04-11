<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" app>
      <v-list>
        <v-list-item prepend-avatar="https://randomuser.me/api/portraits/men/78.jpg" title="John Doe">
          <template v-slot:append>
            <v-btn variant="text" icon="mdi-chevron-left" @click="drawer = !drawer"></v-btn>
          </template>
        </v-list-item>

        <v-divider></v-divider>

        <v-list-group v-for="item in navItems" :key="item.title" :value="item.expanded">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" :prepend-icon="item.icon" :title="item.title"></v-list-item>
          </template>

          <v-list-item v-for="child in item.children" :key="child.title" :title="child.title" :prepend-icon="child.icon">
          </v-list-item>
        </v-list-group>
      </v-list>

      <template v-slot:append>
        <div class="pa-2">
          <v-switch v-model="isDark" hide-details color="primary" @change="toggleTheme">
            <template v-slot:append>
              <v-icon v-if="isDark">mdi-moon-waning-crescent</v-icon>
              <v-icon v-else>mdi-white-balance-sunny</v-icon>
            </template>
          </v-switch>
        </div>
      </template>
    </v-navigation-drawer>

    <v-app-bar app>
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-app-bar-title>导航示例</v-app-bar-title>
    </v-app-bar>

    <v-main class="d-flex align-center justify-center">
      <v-sheet width="400" class="mx-auto pa-4 text-center">
        <h2 class="text-h4 mb-4">欢迎使用导航示例</h2>
        <p class="text-body-1">这是一个简单的导航抽屉示例，展示了基本的交互功能。</p>
      </v-sheet>
    </v-main>
  </v-app>
</template>

<script>
export default {
  name: "NavList",
  data() {
    return {
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
  methods: {
    toggleTheme() {
      this.$vuetify.theme.global.name = this.isDark ? 'dark' : 'light';
    }
  },
}
</script>

<style scoped>
.v-list-item {
  min-height: 44px;
}
.v-list-group__items .v-list-item {
  padding-left: 16px;
}
</style>
