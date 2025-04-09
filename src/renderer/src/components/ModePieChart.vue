<template>
  <div class="pie-chart-container">
    <!-- <h3>{{ title }}</h3> -->
    <p style="user-select: none; pointer-events: none;">拖拽饼图边缘以调整比例</p>
    <div class="chart-wrapper">
      <canvas ref="pieChart"></canvas>
    </div>
    <div class="mode-list mt-3" style="user-select: none; pointer-events: none;">
      <v-row>
        <!-- 使用本地数据 localModeData 以避免直接操作 prop -->
        <v-col v-for="(item, index) in localModeData" :key="index" cols="12" md="4">
          <div class="mode-item">
            <span class="mode-name">{{ item.mode || ('模式 ' + (index + 1)) }}</span>：
            <span class="mode-value">{{ item.min }}%</span>
          </div>
        </v-col>
      </v-row>
    </div>
  </div>
</template>

<script>
import Chart from 'chart.js/auto'

export default {
  name: 'ModePieChart',
  props: {
    title: {
      type: String,
      default: '语气风格设定'
    },
    modeData: {
      type: Array,
      required: true
    },
    colorPalette: {
      type: Array,
      default: () => ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
    }
  },
  data() {
    return {
      // 创建 prop 的本地副本，后续操作都基于 localModeData
      localModeData: JSON.parse(JSON.stringify(this.modeData)),
      chart: null,
      // 自定义拖拽状态信息
      dragging: false,
      dragData: {
        boundaryIndex: null,     // 被拖拽的边界索引（左侧扇形 index）
        leftIndex: null,         // 左侧扇形索引
        rightIndex: null,        // 右侧扇形索引
        startDragEventAngle: null, // 鼠标按下时的角度
        startBoundaryAngle: null,  // 初始拖拽边界的角度
        leftStartAngle: null,      // 左侧扇形的起始角度
        allowedMin: null,          // 拖拽允许的最小边界角度
        allowedMax: null,          // 拖拽允许的最大边界角度
        totalSegment: null         // 左右两个扇形原始之和
      }
    }
  },
  watch: {
    // 当父组件传入的 modeData 变化时，更新本地副本并刷新图表
    modeData: {
      handler(newData) {
        this.localModeData = JSON.parse(JSON.stringify(newData))
        this.updateChart()
      },
      deep: true
    }
  },
  mounted() {
    this.initChart()
    // 给 canvas 添加 mousedown 事件，启动拖拽逻辑
    this.$refs.pieChart.addEventListener('mousedown', this.onCanvasMouseDown)
  },
  beforeDestroy() {
    if (this.chart) {
      this.chart.destroy()
    }
    if (this.$refs.pieChart) {
      this.$refs.pieChart.removeEventListener('mousedown', this.onCanvasMouseDown)
    }
    document.removeEventListener('mousemove', this.onCanvasMouseMove)
    document.removeEventListener('mouseup', this.onCanvasMouseUp)
  },
  methods: {
    initChart() {
      const ctx = this.$refs.pieChart.getContext('2d')

      // 确保有足够颜色
      const colors = [...this.colorPalette]
      while (colors.length < this.localModeData.length) {
        colors.push(this.getRandomColor())
      }

      const data = {
        labels: this.localModeData.map(item => item.mode),
        datasets: [{
          data: this.localModeData.map(item => item.min),
          backgroundColor: colors.slice(0, this.localModeData.length)
        }]
      }

      // 初始化图表，不使用 dragData 插件，而采用自定义拖拽逻辑
      this.chart = new Chart(ctx, {
        type: 'pie',
        data: data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  return `${label}: ${value}%`;
                }
              }
            }
          }
        }
      })
    },
    updateChart() {
      if (!this.chart) return;

      this.chart.data.labels = this.localModeData.map(item => item.mode);
      this.chart.data.datasets[0].data = this.localModeData.map(item => item.min);

      // 确保颜色数组足够
      const colors = [...this.colorPalette];
      while (colors.length < this.localModeData.length) {
        colors.push(this.getRandomColor());
      }
      this.chart.data.datasets[0].backgroundColor = colors.slice(0, this.localModeData.length);

      this.chart.update();
    },
    getRandomColor() {
      // 生成随机颜色
      return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    },
    onCanvasMouseDown(e) {
      const canvas = this.$refs.pieChart;
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      let clickAngle = Math.atan2(dy, dx);
      if (clickAngle < 0) clickAngle += 2 * Math.PI;

      // 计算当前所有扇形的边界角度（以 -π/2 为起始角，Chart.js 默认从顶端开始绘制）
      let total = this.localModeData.reduce((acc, item) => acc + item.min, 0);
      let boundaries = [];
      let currentAngle = -Math.PI / 2;
      if (currentAngle < 0) currentAngle += 2 * Math.PI;
      for (let i = 0; i < this.localModeData.length; i++) {
        currentAngle += (this.localModeData[i].min / total) * 2 * Math.PI;
        let normalizedAngle = currentAngle % (2 * Math.PI);
        boundaries.push(normalizedAngle);
      }

      // 选择离鼠标点击角度最近的边界，若误差小于某个阈值（例如 0.15 弧度）则认为点击在边界上
      let threshold = 0.15;
      let nearestBoundaryIndex = null;
      let minDiff = Infinity;
      boundaries.forEach((boundary, index) => {
        let diff = Math.abs(boundary - clickAngle);
        diff = Math.min(diff, 2 * Math.PI - diff);
        if (diff < threshold && diff < minDiff) {
          minDiff = diff;
          nearestBoundaryIndex = index;
        }
      });

      if (nearestBoundaryIndex === null) return; // 没有点击到边界，不做拖拽处理

      // 记录拖拽状态
      this.dragging = true;
      this.dragData.boundaryIndex = nearestBoundaryIndex;
      const leftIndex = nearestBoundaryIndex;
      const rightIndex = (nearestBoundaryIndex + 1) % this.localModeData.length;
      this.dragData.leftIndex = leftIndex;
      this.dragData.rightIndex = rightIndex;
      // 左侧扇形的起始角度
      let leftStartAngle;
      if (leftIndex === 0) {
        leftStartAngle = -Math.PI / 2;
        if (leftStartAngle < 0) leftStartAngle += 2 * Math.PI;
      } else {
        leftStartAngle = boundaries[leftIndex - 1];
      }
      this.dragData.leftStartAngle = leftStartAngle;
      const totalSegment = this.localModeData[leftIndex].min + this.localModeData[rightIndex].min;
      this.dragData.totalSegment = totalSegment;
      // 拖拽允许范围为：左侧扇形起始角 到 起始角 + 该两扇形所占总角度
      let segmentAngle = (totalSegment / total) * 2 * Math.PI;
      this.dragData.allowedMin = leftStartAngle;
      this.dragData.allowedMax = leftStartAngle + segmentAngle;

      this.dragData.startDragEventAngle = clickAngle;
      // 初始边界角度
      let startBoundaryAngle = boundaries[nearestBoundaryIndex];
      this.dragData.startBoundaryAngle = startBoundaryAngle;

      // 添加全局鼠标移动及释放事件监听
      document.addEventListener('mousemove', this.onCanvasMouseMove);
      document.addEventListener('mouseup', this.onCanvasMouseUp);
    },
    onCanvasMouseMove(e) {
      if (!this.dragging) return;
      const canvas = this.$refs.pieChart;
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      let currentAngle = Math.atan2(dy, dx);
      if (currentAngle < 0) currentAngle += 2 * Math.PI;

      // 计算拖拽开始以来的角度变化，处理角度循环
      let angleDiff = currentAngle - this.dragData.startDragEventAngle;
      if (angleDiff > Math.PI) {
        angleDiff -= 2 * Math.PI;
      } else if (angleDiff < -Math.PI) {
        angleDiff += 2 * Math.PI;
      }

      // 计算新的边界角度并限制在允许范围内
      let newBoundaryAngle = this.dragData.startBoundaryAngle + angleDiff;
      if (newBoundaryAngle < this.dragData.allowedMin) {
        newBoundaryAngle = this.dragData.allowedMin;
      }
      if (newBoundaryAngle > this.dragData.allowedMax) {
        newBoundaryAngle = this.dragData.allowedMax;
      }

      // 根据新的边界角度计算左侧扇形的新值，右侧扇形新值为总和减去左侧值
      const total = this.localModeData.reduce((acc, item) => acc + item.min, 0);
      let leftSliceNewValue = Math.round(
          ((newBoundaryAngle - this.dragData.leftStartAngle) / (2 * Math.PI)) * total
      );
      // 限制左侧值确保不超过两扇形总和
      leftSliceNewValue = Math.min(Math.max(leftSliceNewValue, 0), this.dragData.totalSegment);
      let rightSliceNewValue = this.dragData.totalSegment - leftSliceNewValue;

      // 更新本地副本 localModeData
      this.localModeData = this.localModeData.map((item, idx) => {
        if (idx === this.dragData.leftIndex) {
          return {...item, min: leftSliceNewValue};
        } else if (idx === this.dragData.rightIndex) {
          return {...item, min: rightSliceNewValue};
        }
        return item;
      });

      // 同步更新图表数据
      this.chart.data.datasets[0].data = this.localModeData.map(item => item.min);
      this.chart.data.labels = this.localModeData.map(item => item.mode);
      const colors = [...this.colorPalette];
      while (colors.length < this.localModeData.length) {
        colors.push(this.getRandomColor());
      }
      this.chart.data.datasets[0].backgroundColor = colors.slice(0, this.localModeData.length);
      this.chart.update();
    },
    onCanvasMouseUp() {
      if (!this.dragging) return;
      this.dragging = false;
      document.removeEventListener('mousemove', this.onCanvasMouseMove);
      document.removeEventListener('mouseup', this.onCanvasMouseUp);
      // 拖拽结束后，通过事件通知父组件更新数据
      this.$emit('update:mode-data', this.localModeData);
    }
  }
}
</script>

<style scoped>
.pie-chart-container {
  width: 100%;
  padding: 10px;
}

.chart-wrapper {
  height: 300px;
  position: relative;
}

.mode-item {
  padding: 5px;
  border-radius: 4px;
  margin-bottom: 5px;
}

.mode-name {
  font-weight: bold;
}

.mode-value {
  font-weight: normal;
}
</style>