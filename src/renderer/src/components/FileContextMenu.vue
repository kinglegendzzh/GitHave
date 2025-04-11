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
      this.x = event.clientX
      this.y = event.clientY
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
