<template>
  <v-card class="mx-auto" max-width="900">
    <v-container fluid>
      <v-row>
        <!-- 左侧 50%：饼图展示区域 -->
        <v-col cols="12" md="6" class="d-flex justify-center align-center">
          <canvas ref="chartCanvas" width="400" height="400"></canvas>
        </v-col>

        <!-- 右侧 50%：选项卡切换显示比例信息和调整滑块 -->
        <v-col cols="12" md="6">
          <!-- 选项卡导航 -->
          <v-tabs v-model="activeTab" background-color="primary" dark>
            <v-tab value="0">比例信息</v-tab>
            <v-tab value="1">调整滑块</v-tab>
          </v-tabs>

          <!-- 选项卡内容区域，利用 v-window 实现切换效果 -->
          <v-window
            v-model="activeTab"
            transition="scale-transition"
            reverse-transition="scale-transition"
          >
            <!-- 面板1：比例信息 + 随机按钮 -->
            <v-window-item value="0">
              <v-card-text>
                <v-list>
                  <v-list-item v-for="(mode, index) in modeLabels" :key="index">
                    <v-list-item-title>
                      {{ mode }}: {{ segments[index] }}%
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
                <v-row justify="center" class="mt-4">
                  <v-btn color="primary" @click="randomizeThresholds">
                    随机AI语气
                  </v-btn>
                </v-row>
              </v-card-text>
            </v-window-item>

            <!-- 面板2：调整滑块 -->
            <v-window-item value="1">
              <v-card-text>
                <v-container>
                  <v-row
                    v-for="(threshold, index) in adjustableThresholds"
                    :key="index"
                    class="my-2"
                  >
                    <v-col cols="12">
                      <v-slider
                        v-model="adjustableThresholds[index]"
                        :min="index < adjustableThresholds.length - 1 ? adjustableThresholds[index + 1] : 0"
                        :max="index === 0 ? 100 : adjustableThresholds[index - 1]"
                        step="1"
                        thumb-label="always"
                      >
                        <template #append>
                          <span>{{ modeLabels[index] }}</span>
                        </template>
                      </v-slider>
                    </v-col>
                  </v-row>
                </v-container>
              </v-card-text>
            </v-window-item>
          </v-window>
        </v-col>
      </v-row>
    </v-container>
  </v-card>
</template>

<script>
import { defineComponent, ref, reactive, onMounted, watch } from "vue";
import { Chart } from "chart.js/auto";

// 简单的防抖函数，避免拖动过程中频繁触发图表更新
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

export default defineComponent({
  name: "TonePieChart",
  // 使用 v-model 时，默认 prop 为 modelValue，事件 update:modelValue
  props: {
    // modelValue: 父组件传入的语气配置，格式例如：
    // [
    //   { min: 90, mode: '无厘头' },
    //   { min: 80, mode: '搞笑' },
    //   { min: 60, mode: '悬疑' },
    //   { min: 40, mode: '黑色幽默' },
    //   { min: 20, mode: '浮夸' },
    //   { min: 0,  mode: '严肃' }
    // ]
    modelValue: {
      type: Array,
      required: true
    }
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    // 提取各项配置，将 modelValue 中每项的 min 值作为初始 thresholds
    const thresholds = reactive(props.modelValue.map((item) => item.min));
    // adjustableThresholds 用于绑定滑块（最后一项固定）
    const adjustableThresholds = ref(thresholds.slice(0, thresholds.length - 1));
    // modeLabels，建议设为响应式（若父组件传入的 mode 可能变动）
    const modeLabels = ref(props.modelValue.map((item) => item.mode));

    // 计算各模式比例：
    // 第一部分为 100 - thresholds[0]，后续为 thresholds[i-1] - thresholds[i]
    const segments = ref([]);
    const updateSegments = () => {
      const segs = [];
      segs.push(100 - thresholds[0]);
      for (let i = 1; i < thresholds.length; i++) {
        segs.push(thresholds[i - 1] - thresholds[i]);
      }
      segments.value = segs;
    };
    updateSegments();

    // Chart.js 相关变量及 Canvas 引用
    let chart = null;
    const chartCanvas = ref(null);

    // 新增响应式标识：组件是否正在初始化，以及初始化期间排队的更新（如拖动或随机操作）
    const isInitializing = ref(true);
    const pendingReinit = ref(null);

    // 初始化 Chart.js 饼图，并根据传入的 timeOverride 或当前状态设置动画时长
    const initChart = (timeOverride) => {
      const ctx = chartCanvas.value.getContext("2d");
      let duration = 0;
      // 如果组件处于初始化状态，初始动画时长设为 1000ms
      if (isInitializing.value) {
        duration = 1000;
      }
      // 如果有外部传入的动画时长（如内部操作需要500ms），则覆盖前者
      if (timeOverride !== undefined) {
        console.log("initChart timeOverride:", timeOverride)
        duration = timeOverride;
      }
      chart = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: modeLabels.value,
          datasets: [
            {
              data: segments.value,
              backgroundColor: [
                "#FF6384",
                "#36A2EB",
                "#FFCE56",
                "#4BC0C0",
                "#9966FF",
                "#FF9F40",
              ],
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: false, // 固定尺寸，不随父容器变化
          plugins: {
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || "";
                  const value = context.parsed;
                  return `${label}: ${value}%`;
                },
              },
            },
            legend: {
              display: true,
              position: "bottom",
            },
          },
          animation: {
            animateRotate: true,
            animateScale: true,
            duration: duration,
            // 在动画完成后，取消初始化状态，并检查是否存在待执行的更新
            onComplete: () => {
              if (isInitializing.value) {
                isInitializing.value = false;
              }
              if (pendingReinit.value !== null) {
                const t = pendingReinit.value;
                pendingReinit.value = null;
                reinitChart(t);
              }
            },
          },
        },
      });
    };

    // 重新初始化图表：若组件处于初始化状态，则保存待更新操作，待动画完成后统一执行
    const reinitChart = (time) => {
      if (isInitializing.value) {
        pendingReinit.value = time;
        return;
      }
      if (chart) {
        chart.destroy();
      }
      initChart(time);
    };

    // 将当前 thresholds 转换为更新后的语气配置，并回传给父组件
    const emitUpdatedToneConfig = () => {
      const updatedConfig = thresholds.map((minVal, idx) => {
        return { ...props.modelValue[idx], min: minVal };
      });
      emit("update:modelValue", updatedConfig);
    };

    // 根据最新滑块数值更新 thresholds、重新计算 segments 并刷新图表，同时回传更新给父组件
    const updateThresholdsFromSliders = () => {
      adjustableThresholds.value.forEach((val, i) => {
        thresholds[i] = val;
      });
      updateSegments();
      reinitChart(); // 默认外部触发时动画时长为 0
      emitUpdatedToneConfig();
    };

    // 利用防抖在用户停止操作一定时间后更新图表
    const debouncedUpdateThresholds = debounce(updateThresholdsFromSliders, 100);
    watch(
      () => adjustableThresholds.value,
      () => {
        debouncedUpdateThresholds();
      },
      { deep: true }
    );

    // 随机生成新的降序阈值并更新图表，同时回传更新给父组件
    // 此处内部触发使用动画时长 500ms
    const randomizeThresholds = () => {
      const count = adjustableThresholds.value.length;
      const randomValues = [];
      for (let i = 0; i < count; i++) {
        randomValues.push(Math.floor(Math.random() * 101));
      }
      randomValues.sort((a, b) => b - a);
      adjustableThresholds.value = randomValues;
      // 更新 thresholds 数组，同时最后一项固定为原值（通常为 0）
      for (let i = 0; i < count; i++) {
        thresholds[i] = randomValues[i];
      }
      thresholds[thresholds.length - 1] = props.modelValue[props.modelValue.length - 1].min;
      updateSegments();
      reinitChart(500);
      emitUpdatedToneConfig();
    };

    // 监听父组件传入的 modelValue 变化，若外部更新时同步内部数据（动画时长默认为 0）
    watch(
      () => props.modelValue,
      (newVal) => {
        const newThresholds = newVal.map((item) => item.min);
        thresholds.splice(0, thresholds.length, ...newThresholds);
        adjustableThresholds.value = newThresholds.slice(0, newThresholds.length - 1);
        modeLabels.value = newVal.map((item) => item.mode);
        updateSegments();
        reinitChart();
      },
      { deep: true }
    );

    // 当前激活的右侧选项卡，初始显示“比例信息”
    const activeTab = ref("0");

    onMounted(() => {
      // 首次调用 initChart 时 isInitializing 为 true，
      // 初始化结束后会通过 animation.onComplete 回调取消该状态
      initChart();
    });

    return {
      chartCanvas,
      adjustableThresholds,
      segments,
      modeLabels,
      randomizeThresholds,
      activeTab,
    };
  },
});
</script>

<style scoped>
.v-card {
  margin-top: 20px;
}
canvas {
  display: block;
}
</style>
