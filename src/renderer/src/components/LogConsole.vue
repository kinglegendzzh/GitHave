<template>
  <v-dialog
    v-model="show"
    hide-overlay
    transition="dialog-bottom-transition"
    max-width="1200"
    max-height="1000"
    content-class="log-console-dialog"
  >
    <v-card class="log-console-card">
      <v-toolbar dark color="thirdary" class="log-console-toolbar">
        <v-btn icon dark color="error" @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-btn icon dark @click="hide">
          <v-icon>mdi-window-minimize</v-icon>
        </v-btn>
        <v-toolbar-title>控制台</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-chip :color="isListening ? 'success' : 'default'" size="small" class="mr-2">
          {{ isListening ? '监听中' : '已停止' }}
        </v-chip>
        <v-btn icon @click="clearLogs">
          <v-icon>mdi-delete</v-icon>
        </v-btn>
        <v-btn icon @click="toggleListening">
          <v-icon>{{ isListening ? 'mdi-restart' : 'mdi-play' }}</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="log-console-content">
        <div class="log-filters mb-3">
          <v-chip-group v-model="selectedLogTypes" multiple>
            <v-chip filter outlined value="info" color="info"> 信息 </v-chip>
            <v-chip filter outlined value="success" color="success"> 成功 </v-chip>
            <v-chip filter outlined value="error" color="error"> 错误 </v-chip>
          </v-chip-group>

          <v-chip-group v-model="selectedServices" multiple>
            <v-chip filter outlined value="system" color="grey"> 系统日志 </v-chip>
            <v-chip filter outlined value="childProcess" color="deep-purple"> 子进程日志 </v-chip>
          </v-chip-group>
        </div>
        <!-- 自定义分页控制组件 -->
        <div class="custom-pagination">
          <div class="pagination-nav">
            <!-- 首页按钮 -->
            <button
              class="pagination-btn"
              :class="{ disabled: currentPage === 1 }"
              title="首页"
              @click="goToPage(1)"
            >
              <span class="pagination-icon">«</span>
            </button>

            <!-- 上一页按钮 -->
            <button
              class="pagination-btn"
              :class="{ disabled: currentPage === 1 }"
              title="上一页"
              @click="goToPage(currentPage - 1)"
            >
              <span class="pagination-icon">‹</span>
            </button>

            <!-- 页码信息 -->
            <div class="page-indicator">
              <span class="current-page">{{ currentPage }}</span>
              <span class="page-separator">/</span>
              <span class="total-pages">{{ totalPages }}</span>
            </div>

            <!-- 下一页按钮 -->
            <button
              class="pagination-btn"
              :class="{ disabled: currentPage >= totalPages }"
              title="下一页"
              @click="goToPage(currentPage + 1)"
            >
              <span class="pagination-icon">›</span>
            </button>

            <!-- 尾页按钮 -->
            <button
              class="pagination-btn"
              :class="{ disabled: currentPage >= totalPages }"
              title="尾页"
              @click="goToPage(totalPages)"
            >
              <span class="pagination-icon">»</span>
            </button>
          </div>

          <!-- 每页显示数量选择器 -->
          <div class="page-size-control">
            <span class="page-size-label">每页显示</span>
            <div class="custom-select">
              <select v-model="pageSize" @change="handlePageSizeChange">
                <option v-for="size in [20, 50, 100, 200, 500, 1000]" :key="size" :value="size">
                  {{ size }}
                </option>
              </select>
              <div class="select-arrow"></div>
            </div>
          </div>
        </div>
        <div ref="logsContainer" class="logs-container" @scroll="handleScroll">
          <!-- 使用简化的方法实现高效日志显示 -->
          <div v-if="filteredLogs.length === 0" class="empty-logs">暂无日志记录</div>

          <template v-else>
            <!-- 只渲染可见的日志项 -->
            <div v-for="(log, index) in paginatedLogs" :key="log.id" class="log-item">
              <!-- 日期分隔线 -->
              <div v-if="showDateDivider(log, index)" class="log-date-divider">
                {{ formatLogDate(log.timestamp) }}
              </div>

              <!-- 日志条目 -->
              <div class="log-entry" :class="`log-${log.type}`">
                <span class="log-time">{{ formatLogTime(log.timestamp) }}</span>
                <v-icon size="small" class="log-icon mr-2" :color="getLogColor(log.type)">
                  {{ getLogIcon(log.type) }}
                </v-icon>
                <span class="log-service">
                  [{{ getServiceDisplayName(log.serviceName || log.service) }}]
                </span>
                <span class="log-message">{{ log.message }}</span>
              </div>
            </div>

            <!-- 加载中提示 -->
            <div v-if="isLoading" class="loading-container">
              <v-progress-circular
                indeterminate
                color="primary"
                size="20"
                width="2"
              ></v-progress-circular>
              <span class="ml-2">加载中...</span>
            </div>
          </template>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'LogConsole',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    logs: {
      type: Array,
      default: () => []
    },
    maxLogEntries: {
      type: Number,
      default: 200
    }
  },
  data() {
    return {
      selectedLogTypes: ['info', 'success', 'error'],
      selectedServices: ['system', 'childProcess'],
      lastLogDate: null,
      isListening: false,
      serviceLogListener: null,
      winstonLogListener: null,
      childProcessLogListener: null,
      // 分页相关数据
      pageSize: 500, // 每页显示的日志数量
      currentPage: 1, // 当前页码
      isLoading: false, // 是否正在加载更多日志
      // 批量更新相关
      logBatch: [], // 日志批处理数组
      batchUpdateTimer: null, // 批处理定时器
      isScrolledToBottom: true // 是否滚动到底部
    }
  },
  computed: {
    show: {
      get() {
        return this.modelValue
      },
      set(value) {
        this.$emit('update:modelValue', value)
      }
    },
    filteredLogs() {
      // 使用记忆化过滤，减少不必要的计算
      // 先过滤，然后限制最大条目数
      const filtered = this.logs.filter((log) => {
        // 如果日志类型不在选中的类型中，则过滤掉
        if (!this.selectedLogTypes.includes(log.type)) return false

        // 处理服务名称，兼容不同的服务名称格式
        const serviceName = log.serviceName || log.service || 'system'
        return this.selectedServices.includes(serviceName)
      })

      // 如果超过最大条目数，只返回最新的日志
      if (filtered.length > this.maxLogEntries) {
        return filtered.slice(-this.maxLogEntries)
      }

      return filtered
    },
    // 分页显示的日志
    paginatedLogs() {
      const startIndex = (this.currentPage - 1) * this.pageSize
      const endIndex = this.currentPage * this.pageSize
      return this.filteredLogs.slice(startIndex, endIndex)
    },
    // 总页数
    totalPages() {
      return Math.max(1, Math.ceil(this.filteredLogs.length / this.pageSize))
    },
    // 是否还有更多日志可加载
    hasMoreLogs() {
      return this.currentPage < this.totalPages
    }
  },
  watch: {
    show(val) {
      if (val) {
        // 打开弹窗时自动跳转到最后一页并滚动到底部
        this.$nextTick(() => {
          this.currentPage = this.totalPages
          this.$nextTick(() => {
            this.scrollToBottom()
          })
        })
      }
    },
    logs() {
      // 当日志变化时，如果之前是在底部或在最后一页，则滚动到底部
      const wasAtLastPage = this.currentPage === this.totalPages

      // 如果在最后一页，保持在最后一页
      if (wasAtLastPage) {
        this.$nextTick(() => {
          // 更新到新的最后一页
          this.currentPage = this.totalPages

          if (this.isScrolledToBottom) {
            this.scrollToBottom()
          }
        })
      } else if (this.isScrolledToBottom) {
        this.$nextTick(() => {
          this.scrollToBottom()
        })
      }
    },
    filteredLogs() {
      // 记录当前页码和是否在最后一页
      const currentPageBefore = this.currentPage
      const wasAtLastPage = this.currentPage === this.totalPages
      const wasAtBottom = this.isScrolledToBottom

      this.$nextTick(() => {
        // 如果之前在最后一页，保持在最后一页
        if (wasAtLastPage) {
          this.currentPage = this.totalPages
        } else {
          // 否则尽量保持原来的页码，但不超过新的总页数
          this.currentPage = Math.min(currentPageBefore, this.totalPages)
        }

        // 如果之前在底部，则滚动到底部
        if (wasAtBottom) {
          this.scrollToBottom()
        }
      })
    }
  },
  mounted() {
    // 添加窗口大小变化监听
    window.addEventListener('resize', this.handleResize)
    this.startServiceLogListening()
    this.scrollToBottom()
  },
  async created() {
    await this.startServiceLogListening()
  },
  beforeUnmount() {
    // 清理批处理定时器
    if (this.batchUpdateTimer) {
      clearTimeout(this.batchUpdateTimer)
    }
    // 移除窗口大小变化监听
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    close() {
      // 关闭控制台时停止监听
      if (this.isListening) {
        console.log('停止服务日志监听')
        this.stopServiceLogListening()
      }
      this.show = false
    },
    hide() {
      this.show = false
    },
    clearLogs() {
      this.$emit('clear-logs')
    },
    async toggleListening() {
      await this.stopServiceLogListening()
      await this.startServiceLogListening()
    },

    // 设置服务日志监听器
    setupServiceLogListener() {
      // 清理之前的监听器
      this.cleanupLogListeners()

      // 设置服务日志监听器
      this.serviceLogListener = window.electron.onServiceLog((logData) => {
        this.addServiceLogEntry(logData)
      })

      // 设置Winston日志监听器
      this.winstonLogListener = window.electron.onWinstonLog((logData) => {
        this.addServiceLogEntry(logData)
      })

      // 设置子进程日志监听器
      this.childProcessLogListener = window.electron.onChildProcessLog((logData) => {
        // 标记为子进程日志
        logData.serviceName = 'childProcess'
        this.addServiceLogEntry(logData)
      })
    },

    // 清理所有日志监听器
    cleanupLogListeners() {
      if (this.serviceLogListener) {
        this.serviceLogListener()
        this.serviceLogListener = null
      }

      if (this.winstonLogListener) {
        this.winstonLogListener()
        this.winstonLogListener = null
      }

      if (this.childProcessLogListener) {
        this.childProcessLogListener()
        this.childProcessLogListener = null
      }
    },

    // 添加服务日志条目 - 使用批量更新
    addServiceLogEntry(logData) {
      // 为日志添加唯一ID并冻结对象
      const entry = Object.freeze({
        ...logData,
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      })

      // 添加到批处理数组
      this.logBatch.push(entry)

      // 如果没有定时器，创建一个
      if (!this.batchUpdateTimer) {
        this.batchUpdateTimer = setTimeout(() => {
          // 批量添加日志
          if (this.logBatch.length > 0) {
            // 检查是否需要滚动到底部
            const wasAtBottom = this.isScrolledToBottom

            // 批量添加日志
            this.logBatch.forEach((log) => {
              this.$emit('add-log', log)
            })

            // 清空批处理数组
            this.logBatch = []

            // 如果超过最大条目数，移除最旧的日志
            if (this.logs.length > this.maxLogEntries) {
              this.$emit('remove-oldest-log')
            }

            // 如果之前在底部，则滚动到底部
            if (wasAtBottom) {
              this.$nextTick(() => {
                this.scrollToBottom()
              })
            }
          }

          // 清除定时器
          this.batchUpdateTimer = null
        }, 100) // 100ms批处理间隔
      }
    },

    // 启动服务日志监听
    async startServiceLogListening() {
      try {
        this.isListening = true

        // 启动各类日志监听
        await window.electron.startServiceLog()
        await window.electron.startWinstonLog()
        await window.electron.startChildProcessLog()

        // 设置监听器
        this.setupServiceLogListener()

        console.log('所有日志监听已启动')
      } catch (error) {
        console.error('启动日志监听失败:', error)
        this.isListening = false
      }
    },

    // 停止服务日志监听
    async stopServiceLogListening() {
      try {
        this.isListening = false

        // 清理所有监听器
        this.cleanupLogListeners()

        // 停止各类日志监听
        if (window.electron.stopServiceLog) {
          await window.electron.stopServiceLog()
        }

        if (window.electron.stopWinstonLog) {
          await window.electron.stopWinstonLog()
        }

        if (window.electron.stopChildProcessLog) {
          await window.electron.stopChildProcessLog()
        }

        console.log('所有日志监听已停止')
      } catch (error) {
        console.error('停止日志监听失败:', error)
      }
    },
    formatLogTime(timestamp) {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    },

    // 格式化日志日期
    formatLogDate(timestamp) {
      const date = new Date(timestamp)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    },

    // 判断是否显示日期分隔线
    showDateDivider(log, index) {
      if (index === 0) {
        this.lastLogDate = this.formatLogDate(log.timestamp)
        return true
      }

      const currentDate = this.formatLogDate(log.timestamp)
      const prevLog = this.filteredLogs[index - 1]
      const prevDate = this.formatLogDate(prevLog.timestamp)

      if (currentDate !== prevDate) {
        this.lastLogDate = currentDate
        return true
      }

      return false
    },

    // 获取服务显示名称
    getServiceDisplayName(serviceName) {
      switch (serviceName) {
        case 'system':
          return '系统'
        case 'childProcess':
          return '子进程'
        default:
          return serviceName && serviceName.trim() ? serviceName : 'unknown'
      }
    },
    getLogColor(type) {
      switch (type) {
        case 'error':
          return 'error'
        case 'success':
          return 'success'
        default:
          return 'info'
      }
    },
    getLogIcon(type) {
      switch (type) {
        case 'error':
          return 'mdi-alert-circle'
        case 'success':
          return 'mdi-check-circle'
        default:
          return 'mdi-information'
      }
    },
    scrollToBottom() {
      if (this.$refs.logsContainer) {
        // 使用setTimeout确保在DOM完全更新后执行滚动
        setTimeout(() => {
          this.$refs.logsContainer.scrollTop = this.$refs.logsContainer.scrollHeight
          this.isScrolledToBottom = true
        }, 0)
      }
    },

    // 处理滚动事件
    handleScroll(event) {
      const container = event.target
      const scrollTop = container.scrollTop
      const scrollHeight = container.scrollHeight
      const clientHeight = container.clientHeight

      // 检查是否滚动到底部
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50
      this.isScrolledToBottom = isAtBottom

      // 如果滚动到底部且当前是最后一页，自动加载下一页
      if (
        isAtBottom &&
        this.hasMoreLogs &&
        !this.isLoading &&
        this.currentPage === this.totalPages
      ) {
        this.goToPage(this.currentPage + 1)
      }
    },

    // 跳转到指定页
    goToPage(page) {
      if (page < 1 || page > this.totalPages || page === this.currentPage) return

      this.isLoading = true

      // 模拟异步加载，避免界面卡顿
      setTimeout(() => {
        this.currentPage = page
        this.isLoading = false

        // 如果是跳转到最后一页，滚动到底部
        this.$nextTick(() => {
          if (page === this.totalPages) {
            this.scrollToBottom()
          } else {
            // 其他情况滚动到顶部
            this.scrollToTop()
          }
        })
      }, 100)
    },

    // 处理每页显示数量变化
    handlePageSizeChange() {
      // 重新计算当前页，保持大致的滚动位置
      const currentTopItem = (this.currentPage - 1) * this.pageSize
      this.currentPage = Math.floor(currentTopItem / this.pageSize) + 1

      // 确保当前页不超过总页数
      if (this.currentPage > this.totalPages) {
        this.currentPage = this.totalPages
      }
    },

    // 滚动到顶部
    scrollToTop() {
      if (this.$refs.logsContainer) {
        this.$refs.logsContainer.scrollTop = 0
      }
    },

    // 处理窗口大小变化
    handleResize() {
      // 窗口大小变化时保持滚动位置
      const wasAtBottom = this.isScrolledToBottom

      this.$nextTick(() => {
        if (wasAtBottom) {
          this.scrollToBottom()
        }
      })
    }
  }
}
</script>

<style scoped>
.log-console-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.log-console-toolbar {
  flex-shrink: 0;
}

.log-console-content {
  flex-grow: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.logs-container {
  flex-grow: 1;
  overflow-y: auto;
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
  border-radius: 8px;
  background-color: rgba(var(--v-theme-surface-variant), 0.05);
  padding: 8px 16px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  position: relative; /* 用于虚拟滚动定位 */
  height: 800px;
}

.custom-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  margin-bottom: 10px;
  background-color: rgba(var(--v-theme-surface-variant), 0.05);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.custom-pagination:hover {
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.pagination-nav {
  display: flex;
  align-items: center;
}

.pagination-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin: 0 2px;
  border: none;
  background-color: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--v-theme-primary);
  font-size: 16px;
  padding: 0;
  outline: none;
}

.pagination-btn:hover:not(.disabled) {
  background-color: rgba(var(--v-theme-primary), 0.1);
  transform: translateY(-1px);
}

.pagination-btn:active:not(.disabled) {
  transform: translateY(0);
}

.pagination-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination-icon {
  font-size: 18px;
  line-height: 1;
}

.page-indicator {
  display: flex;
  align-items: center;
  margin: 0 8px;
  font-size: 14px;
  min-width: 60px;
  justify-content: center;
}

.current-page {
  font-weight: bold;
  color: var(--v-theme-primary);
  min-width: 24px;
  text-align: center;
}

.page-separator {
  margin: 0 4px;
  opacity: 0.6;
}

.total-pages {
  opacity: 0.8;
  min-width: 24px;
  text-align: center;
}

.page-size-control {
  display: flex;
  align-items: center;
}

.page-size-label {
  margin-right: 8px;
  font-size: 14px;
  white-space: nowrap;
  opacity: 0.8;
}

.custom-select {
  position: relative;
  width: 70px;
}

.custom-select select {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  padding: 4px 8px;
  padding-right: 24px;
  border-radius: 4px;
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
  background-color: transparent;
  font-size: 14px;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
}

.custom-select select:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
}

.custom-select select:focus {
  border-color: var(--v-theme-primary);
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.2);
}

.select-arrow {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid rgba(var(--v-theme-on-surface), 0.6);
  pointer-events: none;
  transition: transform 0.2s ease;
}

.custom-select select:focus + .select-arrow {
  transform: translateY(-50%) rotate(180deg);
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px 0;
}

.log-entry {
  display: flex;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.1);
}

.log-entry:last-child {
  border-bottom: none;
}

.log-time {
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 11px;
  min-width: 60px;
  flex-shrink: 0;
}

.log-service {
  font-weight: bold;
  margin-right: 8px;
  min-width: 40px;
}

.log-message {
  flex: 1;
  word-break: break-word;
}

.log-info .log-message {
  color: rgb(var(--v-theme-info));
}

.log-error .log-message {
  color: rgb(var(--v-theme-error));
}

.log-success .log-message {
  color: rgb(var(--v-theme-success));
}

.log-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.log-date-divider {
  text-align: center;
  padding: 4px 0;
  margin: 8px 0;
  font-size: 12px;
  font-weight: bold;
  color: rgba(var(--v-theme-on-surface), 0.7);
  border-bottom: 1px dashed rgba(var(--v-theme-outline), 0.3);
}

.empty-logs {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

/* 滚动条样式 */
.logs-container::-webkit-scrollbar {
  width: 6px;
}

.logs-container::-webkit-scrollbar-track {
  background: rgba(var(--v-theme-outline), 0.1);
  border-radius: 3px;
}

.logs-container::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-outline), 0.3);
  border-radius: 3px;
}

.logs-container::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-outline), 0.5);
}
</style>
