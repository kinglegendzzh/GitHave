<template>
  <v-container
    style="height: 50vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
    <div v-if="initialLoad" style="text-align: center;">
      <!-- 显示占位符图像 -->
      <img :src="placeholderImage" alt="Chart Placeholder" draggable="false"
           style="width: 200px; height: auto; display: block; margin-bottom: 20px; user-select: none; pointer-events: none;" />

      <!-- 仿 iOS 大开关 -->
      <v-switch
        v-model="isSwitched"
        class="mt-5"
        label="企业微信推送"
        style="transform: scale(2);"
        @change="handleSwitchChange"
        :color="isSwitched ? 'green' : 'grey'"
        :thumb-color="isSwitched ? 'white' : 'grey'"
      >
        <template v-slot:thumb>
          <!-- 自定义开关的图标，替换默认的滑块 -->
          <v-icon :color="isSwitched ? 'white' : 'grey'">mdi-power</v-icon>
        </template>
      </v-switch>

      <!-- 状态描述 -->
      <p v-if="botHealthState" style="margin-top: 20px;">
        当前状态：{{ botHealthState }}
      </p>
    </div>
  </v-container>
</template>

<script>
import SVG from '../assets/sender.svg';

export default {
  name: 'MsgSender',
  data() {
    return {
      initialLoad: true,   // 初次加载标识
      placeholderImage: SVG,  // 外部矢量图路径
      isSwitched: false,  // 开关状态，初始为关闭
      botHealthState: '',  // 当前 Bot 状态描述
    }
  },
  async mounted() {
    try {
      // 调用 check-bot-health 获取 Bot 的健康状态
      const result = await window.electron.checkBotHealth();
      if (result.state === '已启动') {
        this.isSwitched = true;
        this.botHealthState = '正在运行';
      } else if (result.state === '已关闭') {
        this.isSwitched = false;
        this.botHealthState = '已停止';
      } else {
        this.botHealthState = '正在检查状态...';
      }
    } catch (error) {
      this.botHealthState = '无法获取 Bot 状态';
      console.error('检查 Bot 健康状态失败:', error);
    }
  },
  methods: {
    handleSwitchChange() {
      // 触发开关状态变化时，调用相应的 IPC 方法
      if (this.isSwitched) {
        if (this.botHealthState === '已停止') {
          const sysConfigResp = window.electron.sysConfig();
          console.log('configPath:', sysConfigResp.configPath);
          window.electron.startBot(sysConfigResp.configPath);  // 启动 Bot
          this.botHealthState = '正在启动...';
          setTimeout(() => {
            this.botHealthState = '正在运行';
          }, 1000);
        }
      } else {
        if (this.botHealthState === '正在运行') {
          window.electron.stopBot();  // 停止 Bot
          this.botHealthState = '正在停止...';
          setTimeout(() => {
            this.botHealthState = '已停止';
          }, 1000);
        }
      }
    }
  }
}
</script>

<style scoped>
/* 根据需要调整样式 */
</style>
