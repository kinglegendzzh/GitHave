<template>
    <v-container style="height: 50vh; display: flex; align-items: center; justify-content: center;">
      <div v-if="initialLoad" style="text-align: center;">
        <img :src="placeholderImage" alt="Chart Placeholder" draggable="false"
              style="width: 250px; height: auto; display: block; margin: auto; user-select: none; pointer-events: none;"  />
      </div>
    </v-container>
</template>

<script>
import SVG from '../assets/report.svg';

export default {
  name: 'GitResearch',
  data() {
    return {
      initialLoad: true,   // 初次加载标识
      placeholderImage: SVG,  // 外部矢量图路径
    }
  },
  created() {

  },
  methods: {

  }
}
</script>

<style scoped>
/* 根据需要调整样式 */
</style>
