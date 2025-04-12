<template>
  <div class="pie-chart-container">
    <!-- 修改提示文本 -->
    <p>调整下方滑动条以设定各个语气的比例</p>
    <div class="chart-wrapper">
      <canvas ref="pieChart"></canvas>
    </div>
    <div class="mode-list mt-3">
      <v-row>
        <v-col v-for="(item, index) in localModeData" :key="index" cols="12" md="4">
          <div class="mode-item">
            <span class="mode-name">{{ item.mode || ('模式 ' + (index + 1)) }}</span>
            <!-- 添加滑动条，绑定数值，滑动结束后调用updateChart -->
            <v-slider v-model="item.min" :max="100" step="1" @change="updateChart" hide-details />
            <span class="mode-value">{{ item.min }}%</span>
          </div>
        </v-col>
      </v-row>
    </div>
    <v-row justify="center" class="mt-3">
      <v-col cols="auto">
        <v-btn color="primary" @click="randomizeModes">随机语气</v-btn>
      </v-col>
    </v-row>
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
      // 初始时复制 prop 数据，此后内部管理，不再监听外部数据变化
      localModeData: JSON.parse(JSON.stringify(this.modeData)),
      chart: null
    }
  },
  async mounted() {
    this.initChart()
  },
  beforeDestroy() {
    if (this.chart) {
      this.chart.destroy()
    }
  },
  methods: {
    initChart() {
      const ctx = this.$refs.pieChart.getContext('2d')
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
      this.chart = new Chart(ctx, {
        type: 'pie',
        data: data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            // 禁用内置图例
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || ''
                  const value = context.raw || 0
                  return `${label}: ${value}%`
                }
              }
            }
          }
        }
      })
    },
    updateChart() {
      if (!this.chart) return
      this.chart.data.labels = this.localModeData.map(item => item.mode)
      this.chart.data.datasets[0].data = this.localModeData.map(item => item.min)
      const colors = [...this.colorPalette]
      while (colors.length < this.localModeData.length) {
        colors.push(this.getRandomColor())
      }
      this.chart.data.datasets[0].backgroundColor = colors.slice(0, this.localModeData.length)
      this.$nextTick(() => {
        this.chart.update()
      })
    },
    getRandomColor() {
      return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
    },
    randomizeModes() {
      const len = this.localModeData.length
      if (len === 0) return

      let randomValues = []
      for (let i = 0; i < len; i++) {
        randomValues.push(Math.random())
      }
      let totalRandom = randomValues.reduce((acc, val) => acc + val, 0)
      let percentages = randomValues.map(value => Math.floor((value / totalRandom) * 100))
      let totalPercentage = percentages.reduce((acc, val) => acc + val, 0)
      let remainder = 100 - totalPercentage
      let i = 0
      while (remainder > 0) {
        percentages[i] += 1
        remainder--
        i = (i + 1) % len
      }
      this.localModeData = this.localModeData.map((item, index) => {
        return { ...item, min: percentages[index] }
      })
      this.updateChart()
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
