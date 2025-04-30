<template>
  <v-menu
    v-model="showMenu"
    :position-x="x"
    :position-y="y"
    absolute
    attach="body"
    :style="{ top: y + 'px', left: x + 'px' }"
    transition="fab-transition"
  >
    <v-list dense>
      <v-list-item
        v-for="(item, index) in menuItems"
        :key="index"
        @click="handleItemClick(item)"
      >
        <template v-if="item.icon" #prepend>
          <v-icon>{{ item.icon }}</v-icon>
        </template>
        <v-list-item-title>{{ item.title }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script>
export default {
  name: 'FileContextMenu',
  props: {
    // 菜单项配置
    menuItems: {
      type: Array,
      required: true,
      default: () => []
    }
  },
  data() {
    return {
      showMenu: false,
      x: 0,
      y: 0
    }
  },
  methods: {
    // 显示菜单
    show(event) {
      event.preventDefault()
      // 获取窗口宽度和高度
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight
      // 计算菜单宽度和高度（估计值，可根据实际情况调整）
      const menuWidth = 200
      const menuHeight = 180
      // 计算X坐标，防止溢出右侧和左侧
      if (event.clientX + menuWidth > windowWidth) {
        this.x = Math.max(event.clientX - menuWidth, 0)
      } else {
        this.x = event.clientX
      }
      // 计算Y坐标，防止溢出下边缘和上边缘
      if (event.clientY + menuHeight > windowHeight) {
        this.y = Math.max(windowHeight - menuHeight, 0)
      } else {
        this.y = event.clientY
      }
      this.showMenu = true
      console.log('showMenu', this.x, this.y)
    },
    // 隐藏菜单
    hide() {
      this.showMenu = false
    },
    // 处理菜单项点击
    handleItemClick(item) {
      if (item.action && typeof item.action === 'function') {
        item.action()
      }
      this.hide()
    },
  }
}
</script>

<style scoped>
.v-menu {
  display: inline-block;
}
</style>
