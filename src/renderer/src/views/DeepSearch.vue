<template>
  <v-container
    class="mt-4"
    style="display: flex; align-items: first baseline; justify-content: center"
  >
    <div v-cloak class="search-container">
      <div class="search-header">
        <h2 style="user-select: none">
          搜索关于
          <span class="repo-selector text-grey" @click="toggleRepoDropdown">
            {{ selectedRepo.show }}
            <v-icon size="small" right>{{
              dropdownOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'
            }}</v-icon>
          </span>
          仓库的代码
        </h2>
        <div
          v-tooltip="'有异常？点我重置索引'"
          class="reset-index-icon-container"
          @click="handleResetIndex"
        >
          <v-icon color="grey" icon="mdi-backspace-outline" class="reset-index-icon"></v-icon>
        </div>
        <div v-if="dropdownOpen" class="repo-dropdown">
          <div
            v-for="(repo, index) in repositories"
            :key="index"
            class="repo-item"
            :class="{ active: repo.show === selectedRepo.show }"
            @click="selectRepo(repo)"
          >
            <span :style="{ color: repo.color }" class="text-h7">
              {{ repo.tag_label }}
            </span>
            {{ repo.show }}
          </div>
        </div>
      </div>

      <!-- 搜索类型选择 -->
      <div class="search-type-selector" :class="{ animate: true }">
        <v-btn-toggle v-model="searchType" mandatory class="type-toggle" rounded elevation="0">
          <v-btn value="hybrid" class="type-btn"> 混合增强搜索 </v-btn>
          <v-btn value="keyword" class="type-btn"> 意图精确搜索 </v-btn>
          <v-btn value="semantic" class="type-btn"> 语义向量检索 </v-btn>
        </v-btn-toggle>
      </div>

      <div class="search-input-container">
        <!-- 严格模式开关 - 紧凑版 -->
        <div
          v-tooltip="'【即将上线】严格模式：使用更精确的匹配算法，减少误匹配但可能降低召回率'"
          class="strict-mode-compact"
        >
          <v-icon
            :color="strictMode ? 'primary' : 'grey'"
            size="small"
            class="strict-mode-icon-compact"
          >
            mdi-shield-check
          </v-icon>
          <v-switch
            v-model="strictMode"
            color="primary"
            density="compact"
            hide-details
            class="strict-mode-switch-compact"
            :ripple="false"
            :disabled="true"
          ></v-switch>
        </div>

        <div class="search-input-wrapper">
          <textarea
            ref="searchInput"
            v-model="searchQuery"
            class="search-input"
            :placeholder="placeholderText"
            rows="1"
            @focus="handleFocus"
            @blur="handleBlur"
            @keydown="handleKeydown"
          ></textarea>
          <div
            v-if="searchQuery"
            v-tooltip="'清除搜索内容'"
            class="clear-icon-container"
            @click="clearSearch"
          >
            <v-icon color="grey" icon="mdi-close-circle" class="clear-icon"></v-icon>
          </div>
          <div class="search-icon-container">
            <v-icon
              v-if="!isSearching"
              icon="mdi-magnify"
              class="search-icon"
              @click="handleSearch"
            ></v-icon>
            <v-progress-circular
              v-else
              indeterminate
              size="20"
              width="2"
              color="primary"
            ></v-progress-circular>
          </div>
        </div>
        <v-btn
          class="search-button mr-0 pr-0"
          elevation="0"
          :disabled="isSearching"
          :class="{ pulse: isSearching }"
          @click="handleSearch"
        >
          <span v-if="isSearching" class="mr-2" style="color: grey">正在搜索...</span>
          <span v-else>
            <v-icon class="mr-2" color="grey">mdi-keyboard-return</v-icon>
          </span>
        </v-btn>

        <div
          v-tooltip="'不知道怎么问？点我获取提示'"
          class="search-button ml-0 pl-0"
          @click="showHelpDialog"
        >
          <v-icon color="primary" icon="mdi-lightbulb-outline" class="help-icon"></v-icon>
        </div>
      </div>

      <!-- 猜你所想 标签区 -->
      <div v-if="tags.length" class="tags-container">
        <v-chip
          v-for="(tag, idx) in tags"
          :key="idx"
          class="tag-chip"
          :style="{ animationDelay: idx * 0.1 + 's' }"
          outlined
          small
        >
          {{ tag }}
        </v-chip>
      </div>

      <!-- 搜索结果展示区域 -->
      <div v-if="searchResults.length" class="search-results-container">
        <div
          v-for="(result, index) in searchResults"
          :key="index"
          class="search-result-item"
          :style="{ animationDelay: index * 0.1 + 's' }"
          @click="openDialog(result)"
        >
          <div class="result-header">
            <h3 class="result-name">{{ result.name }} - {{ result.shortFilePath }}</h3>
            <span class="result-score">{{ (result.score * 100).toFixed(1) }}%</span>
          </div>
          <p class="result-file text-grey">{{ result.package }}</p>
          <p class="result-description">{{ result.parsedDescription }}</p>
        </div>
      </div>

      <v-dialog
        v-model="dialog"
        max-width="1200"
        max-height="90vh"
        transition="fade-transition"
        overlay-color="rgba(0, 0, 0, 0.5)"
      >
        <v-card class="pa-4 pt-2 pb-2 pl-2 pr-2" :style="{ 'min-height': '80vh' }">
          <v-card-title class="headline">
            <v-btn icon color="primary" variant="text" @click="viewFileDetails">
              <v-icon right>mdi-open-in-new</v-icon>
            </v-btn>
            {{ selectedResult.name }} —
            <span style="white-space: nowrap; overflow: visible; text-overflow: clip">
              {{ selectedResult.file }}
            </span>
            <!-- Header -->
            <div style="position: absolute; top: 12px; right: 16px; z-index: 10">
              <v-btn size="small" class="text-gray-500 hover:text-gray-800" @click="dialog = false">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </div>
          </v-card-title>
          <v-card-text>
            <div v-if="selectedResult.isJsonDesc" class="detail-section">
              <h3>总体功能</h3>
              <p>{{ selectedResult.descSummary }}</p>

              <h3>执行流程</h3>
              <ol class="process-list">
                <li v-for="(step, idx) in selectedResult.processList" :key="idx">
                  {{ step }}
                </li>
              </ol>
            </div>

            <div v-else class="detail-section">
              <h3>描述</h3>
              <p>{{ selectedResult.fullDescription }}</p>
            </div>

            <div v-if="selectedResult.code_snippet" class="detail-section">
              <h3>代码片段</h3>
              <pre>
                  <code
                    :class="`hljs ${path.extname(selectedResult.file).slice(1)}`"
                    v-html="highlightCode(selectedResult.code_snippet, path.extname(selectedResult.file))"></code>
                </pre>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn text @click="dialog = false">关闭</v-btn>
            <v-btn color="primary" variant="outlined" size="small" @click="viewFileDetails">
              <v-icon left>mdi-file-document</v-icon>
              查看代码文件详情
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- 虚拟助手对话窗口 -->
      <v-dialog
        v-model="helpDialog"
        max-width="500"
        transition="slide-x-transition"
        overlay-color="rgba(0, 0, 0, 0.3)"
        :style="{ position: 'fixed', right: '20px', top: '50%', transform: 'translateY(-50%)' }"
      >
        <v-card class="help-dialog-card" elevation="8">
          <v-card-title class="help-dialog-title">
            <v-icon color="primary" class="mr-2">mdi-robot-happy</v-icon>
            搜索助手
            <v-spacer></v-spacer>
            <!-- Header -->
            <div style="position: absolute; top: 12px; right: 16px; z-index: 10">
              <v-btn
                icon
                size="small"
                variant="text"
                class="text-gray-500 hover:text-gray-800"
                @click="closeHelpDialog"
              >
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </div>
          </v-card-title>

          <v-card-text class="help-dialog-content">
            <div class="assistant-message">
              <div class="message-avatar">
                <v-icon color="primary">mdi-robot</v-icon>
              </div>
              <div class="message-content">
                <p class="greeting-text">👋 不知道怎么问？试试这些搜索示例：</p>

                <div class="example-list">
                  <div
                    v-for="(example, index) in searchExamples"
                    :key="index"
                    class="example-item"
                    :style="{ animationDelay: index * 0.1 + 's' }"
                    @click="useExample(example.query)"
                  >
                    <v-icon size="small" color="primary" class="example-icon">{{
                      example.icon
                    }}</v-icon>
                    <div class="example-text">
                      <div class="example-title">{{ example.title }}</div>
                      <div class="example-query">"{{ example.query }}"</div>
                    </div>
                  </div>
                </div>

                <div class="tips-section">
                  <p class="tips-title">💡 搜索小贴士：</p>
                  <ul class="tips-list">
                    <li>描述你想要的功能，而不是具体的代码</li>
                    <li>可以使用自然语言描述业务场景</li>
                    <li>尝试不同的搜索类型获得更好的结果</li>
                  </ul>
                </div>
              </div>
            </div>
          </v-card-text>

          <v-card-actions class="help-dialog-actions">
            <v-spacer></v-spacer>
            <v-btn text color="grey" @click="closeHelpDialog">知道了</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </v-container>
</template>

<script>
import SVG from '../assets/search.svg'
import { listRepos, searchCode, resetIndexApi } from '../service/api'
import { omit } from '../service/str'
import hljs from 'highlight.js'
import 'highlight.js/styles/mono-blue.css'
import path from 'path-browserify'
import router from '../router'
import { onBeforeRouteLeave } from 'vue-router'

export default {
  name: 'DeepSearch',
  data() {
    return {
      initialLoad: true,
      placeholderImage: SVG,
      searchQuery: '',
      isSearching: false,
      isFocused: false,
      dropdownOpen: false,
      selectedRepo: '',
      repositories: [],
      searchResults: [],
      dialog: false,
      selectedResult: {},
      searchType: 'hybrid',
      strictMode: false,
      tags: [],
      helpDialog: false,
      inactivityTimer: null,
      lastActivityTime: Date.now(),
      searchExamples: [
        {
          title: '资源管理',
          query: '我要查找关于资源操作的代码片段，可以支持对资源进行自动退订续订操作',
          icon: 'mdi-cog'
        },
        {
          title: 'AI模型调用',
          query: '关于调用openai大模型的工具函数',
          icon: 'mdi-brain'
        },
        {
          title: '图形渲染',
          query: '查找关于使用opengl核心方法实现投影矩阵的代码',
          icon: 'mdi-cube-outline'
        },
        {
          title: '数据库操作',
          query: '数据库连接池管理和事务处理的相关代码',
          icon: 'mdi-database'
        },
        {
          title: '网络请求',
          query: 'HTTP客户端封装和异步请求处理的实现',
          icon: 'mdi-web'
        },
        {
          title: '文件处理',
          query: '文件上传下载和批量处理的功能模块',
          icon: 'mdi-file-multiple'
        }
      ]
    }
  },
  computed: {
    path() {
      return path
    },
    placeholderText() {
      switch (this.searchType) {
        case 'keyword':
          return '基于大模型意图识别关键词的精确搜索'
        case 'hybrid':
          return '基于RAG检索增強生成的混合搜索'
        default:
          return '基于向量检索的自然语义相似度搜索'
      }
    }
  },
  watch: {
    // 监听严格模式变化，自动保存到localStorage
    strictMode(newValue) {
      this.saveStrictModePreference()
    }
  },
  mounted() {
    // 全局监听键盘
    window.addEventListener('keydown', this.onKeydown)
    // 页面载入后自动聚焦
    this.$nextTick(() => {
      if (this.$refs.searchInput) {
        this.$refs.searchInput.focus()
      }
      this.adjustTextareaHeight()
    })
    // 初始化用户活动监听
    this.initActivityTracking()
    // 从localStorage读取严格模式设置
    this.loadStrictModePreference()
  },
  activated() {
    // keep-alive组件被激活时重新添加监听器
    window.addEventListener('keydown', this.onKeydown)
    document.addEventListener('click', this.closeDropdownOnClickOutside)
    // 重新聚焦搜索框
    this.$nextTick(() => {
      if (this.$refs.searchInput) {
        this.$refs.searchInput.focus()
      }
    })
  },
  beforeUnmount() {
    // 卸载时移除监听
    window.removeEventListener('keydown', this.onKeydown)
    // 移除document点击监听器
    document.removeEventListener('click', this.closeDropdownOnClickOutside)
    // 清理非活动计时器 - 方法已被注释，暂时移除调用
    // this.clearInactivityTimer()
    // 移除用户活动监听
    this.removeActivityTracking()
  },
  created() {
    console.log('DeepSearch created')
    this.listRepos()

    // 使用路由守卫监听路由离开事件
    onBeforeRouteLeave((to, from, next) => {
      // 路由离开时清理所有监听器
      window.removeEventListener('keydown', this.onKeydown)
      document.removeEventListener('click', this.closeDropdownOnClickOutside)
      next()
    })
  },
  methods: {
    // 从localStorage加载严格模式偏好
    loadStrictModePreference() {
      try {
        const savedStrictMode = localStorage.getItem('deepSearchStrictMode')
        if (savedStrictMode !== null) {
          this.strictMode = JSON.parse(savedStrictMode)
          console.log('已加载严格模式偏好:', this.strictMode)
        }
      } catch (error) {
        console.warn('加载严格模式偏好失败:', error)
        this.strictMode = false
      }
    },
    // 保存严格模式偏好到localStorage
    saveStrictModePreference() {
      try {
        localStorage.setItem('deepSearchStrictMode', JSON.stringify(this.strictMode))
        console.log('已保存严格模式偏好:', this.strictMode)
      } catch (error) {
        console.warn('保存严格模式偏好失败:', error)
      }
    },
    listRepos() {
      listRepos().then(async (res) => {
        if (res.status === 200 && res.data.length > 0) {
          // 按id降序排序
          const sortedData = res.data.sort((a, b) => b.id - a.id)

          for (const repo of sortedData) {
            const { indexing, hasDb } = await window.electron.checkMemoryFlashStatus(
              repo.local_path
            )
            if (hasDb && !indexing) {
              repo.tag = 'yes'
              repo.tag_label = ''
              repo.color = 'green'
            } else if (indexing) {
              repo.tag = 'ing'
              repo.tag_label = '(正在构建索引..)'
              repo.color = 'orange'
            } else {
              repo.tag = 'no'
              repo.tag_label = '(未构建索引)'
              repo.color = 'grey'
            }
            if (repo.desc === '' || repo.desc === null) {
              repo.show = `${repo.name}/${repo.branch}`
            } else {
              repo.show = `${repo.name}/${repo.branch}(${omit(repo.desc, 12)})`
            }
          }
          this.repositories = sortedData
          const lsRepo = localStorage.getItem('selectedRepo')
          console.log('lsRepo:', JSON.stringify(lsRepo))
          if (lsRepo) {
            var find = this.repositories.find((repo) => repo.local_path === lsRepo)
            this.selectedRepo = find === undefined ? this.repositories[0] : find
          } else {
            this.selectedRepo = this.repositories[0]
          }
          console.log('repositories:', this.repositories)
        }
      })
    },
    viewFileDetails() {
      console.log('viewFileDetails', this.selectedRepo.local_path, this.selectedResult.file)
      const url = path.join(this.selectedRepo.local_path, this.selectedResult.file)
      console.log('跳转到文件浏览器页面，文件路径：', url)
      router.push({
        name: 'finder',
        params: { localPath: url, rootPath: this.selectedRepo.local_path }
      })
      this.dialog = false
    },
    highlightCode(code, ext) {
      const language = ext.slice(1)
      const validLang = hljs.getLanguage(language) ? language : 'plaintext'
      return hljs.highlight(code, { language: validLang }).value
    },
    onKeydown(event) {
      // Cmd + 1/2/3 切换搜索类型
      if (event.metaKey) {
        if (
          event.key === 'I' ||
          event.key === 'i' ||
          event.key === 'F' ||
          event.key === 'f' ||
          event.key === 'K' ||
          event.key === 'k'
        ) {
          console.log('聚焦搜索')
          this.$nextTick(() => {
            if (this.$refs.searchInput) {
              this.$refs.searchInput.focus()
            }
          })
        } else if (event.key === '3') {
          console.log('切换搜索类型为语义搜索')
          this.searchType = 'semantic'
        } else if (event.key === '2') {
          console.log('切换搜索类型为关键词搜索')
          this.searchType = 'keyword'
        } else if (event.key === '1') {
          console.log('切换搜索类型为混合搜索')
          this.searchType = 'hybrid'
        }
      }
    },
    openDialog(result) {
      this.selectedResult = result
      this.dialog = true
    },
    async handleSearch() {
      if (!this.searchQuery.trim()) return

      this.isSearching = true
      const { indexing, hasDb } = await window.electron.checkMemoryFlashStatus(
        this.selectedRepo.local_path
      )
      if (hasDb && !indexing) {
        try {
          const res = await searchCode(
            this.selectedRepo.local_path,
            this.searchQuery,
            this.searchType, // 使用动态搜索类型
            50,
            this.strictMode // 传递严格模式参数
          )
          this.isSearching = false
          if (res.status === 200 && res.data.code === 0) {
            this.tags = res.data.data.tags || []
            console.log('猜你所想:', this.tags)
            if (res.data.data.func_res === null || res.data.data.func_res.length === 0) {
              this.searchResults = []
            }
            this.searchResults = res.data.data.func_res.map((item) => {
              let isJson = false
              let descSummary = ''
              let processList = []
              const fullDesc = item.description
              let parsedDescription = fullDesc

              try {
                const obj = JSON.parse(item.description)
                if (obj && typeof obj === 'object' && 'description' in obj) {
                  // 不管process是数组还是对象都支持
                  isJson = true
                  descSummary = obj.description
                  parsedDescription = descSummary
                  // 如果是数组直接使用，如果是对象则包装成数组
                  processList = Array.isArray(obj.process) ? obj.process : [obj.process]
                }
              } catch (e) {
                console.log('解析 JSON 失败:', e)
                /* empty */
              }

              // 处理文件路径，如果过长则省略中间部分
              const filePath = item.file
              let shortFilePath = filePath
              if (filePath.length > 30) {
                const parts = filePath.split('/')
                if (parts.length > 3) {
                  shortFilePath = parts[0] + '/.../' + parts[parts.length - 1]
                }
              }

              return {
                name: item.name,
                package: item.package,
                file: item.file,
                shortFilePath: shortFilePath,
                score: item.score,
                fullDescription: fullDesc,
                parsedDescription: parsedDescription,
                truncatedDescription: omit(fullDesc, 30),
                code_snippet: item.code_snippet || '',
                isJsonDesc: isJson,
                descSummary,
                processList
              }
            })
          }
        } catch (e) {
          this.isSearching = false
        }
      } else {
        this.isSearching = false
        const msg = indexing
          ? `${this.selectedRepo.show} 正在构建索引，请稍后再试。`
          : `无法使用 ${this.selectedRepo.show} 的搜索功能，请先构建索引。`
        // 如果用户点击确定
        if (window.confirm(msg)) {
          console.log('跳转到扫描页面')
          router.push({
            name: 'scan'
          })
        }
      }
    },
    handleFocus() {
      this.isFocused = true
    },
    handleBlur() {
      this.isFocused = false
    },
    clearSearch() {
      this.searchQuery = ''
      this.searchResults = []
      this.tags = []
      this.$nextTick(() => {
        if (this.$refs.searchInput) {
          this.$refs.searchInput.focus()
          this.adjustTextareaHeight()
        }
      })
    },
    handleKeydown(event) {
      // Enter键触发搜索
      if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        this.handleSearch()
        return
      }

      // Cmd+Enter (Mac) 或 Ctrl+Enter (Windows/Linux) 换行
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault()
        // 在光标位置插入换行符
        const textarea = event.target
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const value = textarea.value
        this.searchQuery = value.substring(0, start) + '\n' + value.substring(end)

        // 恢复光标位置
        this.$nextTick(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1
          this.adjustTextareaHeight()
        })
        return
      }

      // 自动调整textarea高度
      this.$nextTick(() => {
        this.adjustTextareaHeight()
      })
    },
    adjustTextareaHeight() {
      const textarea = this.$refs.searchInput
      if (textarea) {
        // 重置高度以获取正确的scrollHeight
        textarea.style.height = 'auto'
        // 设置最小高度为60px，最大高度为200px
        const minHeight = 60
        const maxHeight = 200
        const scrollHeight = Math.max(minHeight, Math.min(maxHeight, textarea.scrollHeight))
        textarea.style.height = scrollHeight + 'px'
      }
    },
    toggleRepoDropdown() {
      this.dropdownOpen = !this.dropdownOpen
      if (this.dropdownOpen) {
        console.log('toggleRepoDropdown')
        this.listRepos()
        setTimeout(() => {
          document.addEventListener('click', this.closeDropdownOnClickOutside)
        }, 0)
      }
    },
    selectRepo(repo) {
      if (this.selectedRepo === repo) return
      this.selectedRepo = repo
      localStorage.setItem('selectedRepo', repo.local_path)
      this.dropdownOpen = false
      this.selectedResult = {}
      this.searchResults = []
      document.removeEventListener('click', this.closeDropdownOnClickOutside)
    },
    closeDropdownOnClickOutside(event) {
      const dropdown = document.querySelector('.repo-dropdown')
      const selector = document.querySelector('.repo-selector')
      if (dropdown && !dropdown.contains(event.target) && !selector.contains(event.target)) {
        this.dropdownOpen = false
        document.removeEventListener('click', this.closeDropdownOnClickOutside)
      }
    },
    async handleResetIndex() {
      if (!this.selectedRepo || !this.selectedRepo.local_path) {
        // window.alert('请先选择一个仓库')
        return
      }

      if (
        window.confirm(`确定要重置 ${this.selectedRepo.show} 的索引吗？
      (重置不会删除你的索引内容。)`)
      ) {
        try {
          this.isSearching = true
          const res = await resetIndexApi(this.selectedRepo.local_path)
          this.isSearching = false

          if (res.status === 200) {
            window.alert('索引重置成功。')
            // 刷新仓库状态
            this.listRepos()
          } else {
            window.alert('索引重置失败，请稍后再试。')
          }
        } catch (error) {
          this.isSearching = false
          console.error('重置索引出错:', error)
          window.alert('重置索引出错，请稍后再试。')
        }
      }
    },
    // 虚拟助手对话窗口相关方法
    showHelpDialog() {
      this.helpDialog = true
      // this.resetInactivityTimer()
    },
    closeHelpDialog() {
      this.helpDialog = false
      // this.resetInactivityTimer()
    },
    useExample(query) {
      this.searchQuery = query
      this.helpDialog = false
      this.$nextTick(() => {
        if (this.$refs.searchInput) {
          this.$refs.searchInput.focus()
        }
      })
      // this.resetInactivityTimer()
    },
    // 用户活动跟踪相关方法
    initActivityTracking() {
      // 监听各种用户活动
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
      events.forEach((event) => {
        document.addEventListener(event, this.onUserActivity, true)
      })
      // 启动非活动计时器
      // this.resetInactivityTimer()
    },
    removeActivityTracking() {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
      events.forEach((event) => {
        document.removeEventListener(event, this.onUserActivity, true)
      })
    }
    // onUserActivity() {
    //   this.lastActivityTime = Date.now()
    //   this.resetInactivityTimer()
    // },
    // resetInactivityTimer() {
    //   this.clearInactivityTimer()
    //   // 30秒无操作后显示帮助对话框
    //   this.inactivityTimer = setTimeout(() => {
    //     if (!this.helpDialog && !this.dialog && !this.dropdownOpen) {
    //       this.showHelpDialog()
    //     }
    //   }, 30000) // 30秒
    // },
    // clearInactivityTimer() {
    //   if (this.inactivityTimer) {
    //     clearTimeout(this.inactivityTimer)
    //     this.inactivityTimer = null
    //   }
    // }
  }
}
</script>

<style scoped>
[v-cloak] {
  display: none;
}
.search-container {
  width: 100%;
  max-width: 1800px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: fadeIn 0.6s ease-out;
}

.search-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  animation: slideDown 0.5s ease-out;
  position: relative;
}

.search-header h2 {
  font-size: 1.6rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface-rgb), 0.87);
  letter-spacing: -0.01em;
}

.repo-selector {
  position: relative;
  display: inline-flex;
  align-items: center;
  color: rgba(var(--v-theme-primary-rgb), 0.9);
  font-weight: 500;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.repo-selector:hover {
  background: rgba(var(--v-theme-primary-rgb), 0.1);
}

.repo-dropdown {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 450px;
  max-height: 500px;
  overflow-y: auto;
  margin-top: 8px;
  background: rgba(var(--v-theme-surface-rgb), 0.95);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 100;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(var(--v-theme-on-surface-rgb), 0.08);
  animation: fadeIn 0.2s ease-out;
}

.repo-item {
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.95rem;
}

.repo-item:hover {
  background: rgba(var(--v-theme-primary-rgb), 0.1);
}

.repo-item.active {
  background: rgba(var(--v-theme-primary-rgb), 0.15);
  color: rgba(var(--v-theme-primary-rgb), 1);
  font-weight: 500;
}

.search-input-container {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 16px;
  animation: slideUp 0.5s ease-out;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  border-radius: 20px;
  background: rgba(var(--v-theme-surface-rgb), 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(var(--v-theme-on-surface-rgb), 0.08);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.search-input-wrapper:focus-within {
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(var(--v-theme-primary-rgb), 0.6);
  transform: translateY(-2px);
}

.search-input {
  width: 100%;
  min-height: 60px;
  max-height: 200px;
  padding: 18px 90px 18px 24px;
  background: transparent;
  border: none;
  outline: none;
  font-size: 1.05rem;
  font-weight: 400;
  letter-spacing: 0.01em;
  color: rgba(var(--v-theme-on-surface-rgb), 0.87);
  resize: none;
  line-height: 1.4;
  font-family: inherit;
  overflow-y: auto;
}

.search-input::placeholder {
  color: rgba(159, 159, 159, 0.7);
  transition: opacity 0.3s ease;
}

.search-input:focus::placeholder {
  opacity: 0.7;
}

.clear-icon-container {
  position: absolute;
  right: 80px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  transition: all 0.2s ease;
  z-index: 2;
  opacity: 0.7;
}

.clear-icon-container:hover {
  background: rgba(var(--v-theme-error-rgb), 0.1);
  transform: translateY(-50%) scale(1.1);
  opacity: 1;
}

.clear-icon {
  font-size: 18px !important;
  transition: all 0.2s ease;
}

.help-icon-container {
  position: absolute;
  right: 50px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s ease;
  z-index: 2;
}

.help-icon-container:hover {
  background: rgba(var(--v-theme-primary-rgb), 0.1);
  transform: translateY(-50%) scale(1.1);
}

.help-icon {
  font-size: 20px !important;
  transition: all 0.2s ease;
}

.help-icon-container:hover .help-icon {
  transform: rotate(15deg);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideDown {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.pulse {
  animation: pulse 1.5s infinite ease-in-out;
}

/* 虚拟助手对话窗口样式 */
.help-dialog-card {
  border-radius: 16px !important;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    rgba(var(--v-theme-surface-rgb), 0.95) 0%,
    rgba(var(--v-theme-surface-rgb), 0.98) 100%
  );
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(var(--v-theme-primary-rgb), 0.2);
  animation: slideInRight 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.help-dialog-title {
  background: linear-gradient(
    135deg,
    rgba(var(--v-theme-primary-rgb), 0.1) 0%,
    rgba(var(--v-theme-primary-rgb), 0.05) 100%
  );
  border-bottom: 1px solid rgba(var(--v-theme-on-surface-rgb), 0.08);
  font-weight: 600;
  font-size: 1.1rem;
  padding: 16px 20px;
}

.help-dialog-content {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
}

.assistant-message {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    rgba(var(--v-theme-primary-rgb), 0.1) 0%,
    rgba(var(--v-theme-primary-rgb), 0.2) 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  animation: pulse 2s infinite;
}

.message-content {
  flex: 1;
  animation: fadeInUp 0.5s ease-out;
}

.greeting-text {
  font-size: 1rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface-rgb), 0.87);
  margin-bottom: 16px;
  line-height: 1.5;
}

.example-list {
  margin-bottom: 20px;
}

.example-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 12px;
  background: rgba(var(--v-theme-surface-rgb), 0.6);
  border: 1px solid rgba(var(--v-theme-on-surface-rgb), 0.08);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  animation: slideInLeft 0.5s ease-out;
  animation-fill-mode: both;
}

.example-item:hover {
  background: rgba(var(--v-theme-primary-rgb), 0.08);
  border-color: rgba(var(--v-theme-primary-rgb), 0.3);
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary-rgb), 0.15);
}

.example-icon {
  background: rgba(var(--v-theme-primary-rgb), 0.1);
  border-radius: 8px;
  padding: 8px;
  flex-shrink: 0;
}

.example-text {
  flex: 1;
}

.example-title {
  font-weight: 600;
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface-rgb), 0.87);
  margin-bottom: 4px;
}

.example-query {
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface-rgb), 0.6);
  font-style: italic;
  line-height: 1.4;
}

.tips-section {
  background: rgba(var(--v-theme-warning-rgb), 0.05);
  border: 1px solid rgba(var(--v-theme-warning-rgb), 0.2);
  border-radius: 12px;
  padding: 16px;
  animation: fadeInUp 0.6s ease-out;
}

.tips-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: rgba(var(--v-theme-on-surface-rgb), 0.87);
  margin-bottom: 8px;
}

.tips-list {
  margin: 0;
  padding-left: 20px;
}

.tips-list li {
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface-rgb), 0.7);
  line-height: 1.5;
  margin-bottom: 4px;
}

.help-dialog-actions {
  padding: 12px 20px;
  border-top: 1px solid rgba(var(--v-theme-on-surface-rgb), 0.08);
  background: rgba(var(--v-theme-surface-rgb), 0.5);
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideInLeft {
  from {
    transform: translateX(-20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes fadeInUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

:deep(.v-overlay__scrim) {
  background: rgba(var(--v-theme-on-surface-rgb), 0.3);
}
/* 响应式设计 */
@media (max-width: 600px) {
  .search-container {
    max-width: 90%;
    padding: 0 16px;
  }

  .search-header h2 {
    font-size: 1.3rem;
  }

  .search-input {
    min-height: 54px;
    max-height: 150px;
    font-size: 1rem;
    padding: 15px 70px 15px 20px;
  }

  .search-button {
    width: 46px;
    height: 46px;
    min-width: 46px;
  }

  .search-input-wrapper {
    margin-bottom: 12px;
  }

  .search-button {
    width: 100%;
    height: 48px;
  }

  .search-results-container {
    margin-top: 16px;
  }

  .search-result-item {
    padding: 12px;
  }

  .result-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .result-name {
    font-size: 0.9rem;
  }

  .result-score {
    font-size: 0.8rem;
  }

  .clear-icon-container {
    right: 60px;
  }

  .help-icon-container {
    right: 35px;
    padding: 6px;
  }

  .help-dialog-card {
    margin: 16px;
    max-width: calc(100vw - 32px);
  }

  .help-dialog-content {
    padding: 16px;
    max-height: 60vh;
  }

  .example-item {
    padding: 10px 12px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .example-text {
    width: 100%;
  }

  .example-title {
    font-size: 0.85rem;
  }

  .example-query {
    font-size: 0.8rem;
  }

  .tips-section {
    padding: 12px;
  }

  .assistant-message {
    flex-direction: column;
    gap: 8px;
  }

  .message-avatar {
    align-self: center;
  }
}

.search-icon-container {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(var(--v-theme-on-surface-rgb), 0.6);
  width: 24px;
  height: 24px;
}

.reset-index-icon-container {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.reset-index-icon-container:hover {
  background: rgba(var(--v-theme-primary-rgb), 0.1);
  transform: translateY(-50%) scale(1.1);
}

.reset-index-icon {
  font-size: 20px;
  color: rgba(var(--v-theme-on-surface-rgb), 0.6);
}

.search-button {
  border-radius: 10px;
  background: rgba(var(--v-theme-primary-rgb), 0.9) !important;
  color: rgba(var(--v-theme-primary-rgb), 0.5) !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary-rgb), 0.3);
}

.search-button:hover {
  background: rgba(var(--v-theme-primary-rgb), 1) !important;
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(var(--v-theme-primary-rgb), 0.4);
}

/* 暗色模式适配 */
.v-theme--dark .search-input-wrapper {
  background: rgba(30, 30, 30, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
}

.v-theme--dark .search-input {
  color: rgba(255, 255, 255, 0.87);
}

.v-theme--dark .search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.v-theme--dark .search-input:focus::placeholder {
  opacity: 0.8;
}

.v-theme--dark .search-icon-container {
  color: rgba(255, 255, 255, 0.6);
}

.v-theme--dark .search-button {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.v-theme--dark .search-button:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
}

.v-theme--dark .repo-dropdown {
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.v-theme--dark .repo-selector {
  color: rgba(var(--v-theme-primary-rgb), 1);
}

.v-theme--dark .repo-selector:hover {
  background: rgba(var(--v-theme-primary-rgb), 0.15);
}

.v-theme--dark .repo-item:hover {
  background: rgba(var(--v-theme-primary-rgb), 0.15);
}

.v-theme--dark .repo-item.active {
  background: rgba(var(--v-theme-primary-rgb), 0.2);
}

/* 搜索结果样式 */
.search-results-container {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-result-item {
  background: rgba(var(--v-theme-surface-rgb), 0.6);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(var(--v-theme-on-surface-rgb), 0.08);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.5s ease-out forwards;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.search-result-item:hover {
  transform: translateY(-3px) scale(1.01);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.result-name {
  font-size: 1.15rem;
  font-weight: 600;
  color: rgba(var(--v-theme-primary-rgb), 0.95);
}

.result-score {
  font-size: 0.9rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface-rgb), 0.7);
  background: rgba(var(--v-theme-primary-rgb), 0.1);
  padding: 4px 8px;
  border-radius: 16px;
}

.result-file {
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface-rgb), 0.65);
  margin-bottom: 10px;
  word-break: break-all;
}

.result-description {
  font-size: 0.95rem;
  color: rgba(var(--v-theme-on-surface-rgb), 0.8);
  line-height: 1.6;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 暗色模式适配搜索结果 */
.v-theme--dark .search-result-item {
  background: rgba(40, 40, 40, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
}

.v-theme--dark .search-result-item:hover {
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.3);
}

.v-theme--dark .result-name {
  color: rgba(var(--v-theme-primary-rgb), 1);
}

.v-theme--dark .result-score {
  color: rgba(255, 255, 255, 0.75);
  background: rgba(var(--v-theme-primary-rgb), 0.2);
}

.v-theme--dark .result-file {
  color: rgba(255, 255, 255, 0.6);
}

.v-theme--dark .result-description {
  color: rgba(255, 255, 255, 0.85);
}

.search-result-item {
  cursor: pointer; /* 鼠标样式提示可点击 */
}
/* 弹窗中完整内容滚动 */
.full-content-container {
  max-height: 60vh;
  overflow-y: auto;
  background: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
}
.detail-section {
  margin-bottom: 24px;
}
.detail-section h3 {
  font-size: 1.2rem;
  margin-bottom: 8px;
  color: rgba(var(--v-theme-on-surface-rgb), 0.87);
  border-left: 4px solid rgba(var(--v-theme-primary-rgb), 0.8);
  padding-left: 8px;
}
.detail-section p {
  line-height: 1.6;
  color: rgba(var(--v-theme-on-surface-rgb), 0.75);
}
.detail-section pre {
  background: rgba(var(--v-theme-surface-rgb), 0.9);
  border-radius: 6px;
  padding: 16px;
  overflow-x: auto;
  font-family: 'Source Code Pro', monospace;
  font-size: 0.95rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
.search-type-selector {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
  opacity: 0;
  animation: fadeIn 0.4s ease-out forwards;
}
.type-toggle {
  background: rgba(var(--v-theme-surface-rgb), 0.4);
  backdrop-filter: blur(20px);
  border-radius: 24px;
}
.type-btn {
  text-transform: none;
  font-weight: 500;
  transition: transform 0.3s ease;
}
.type-btn.v-btn--active {
  transform: translateY(-2px);
  background: rgba(var(--v-theme-primary-rgb), 0.9) !important;
  color: rgba(var(--v-theme-on-primary-rgb), 0.9) !important;
}
.type-btn:not(.v-btn--active):hover {
  background: rgba(var(--v-theme-primary-rgb), 0.15) !important;
}
@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

/* 严格模式开关 - 紧凑版样式 */
.strict-mode-compact {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  margin: 0 4px;
  background: rgba(var(--v-theme-surface-rgb), 0.4);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-radius: 20px;
  border: 1px solid rgba(var(--v-theme-on-surface-rgb), 0.08);
  transition: all 0.3s ease;
  cursor: pointer;
}

.strict-mode-compact:hover {
  background: rgba(var(--v-theme-surface-rgb), 0.6);
  border-color: rgba(var(--v-theme-primary-rgb), 0.2);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.strict-mode-icon-compact {
  transition: color 0.3s ease;
}

.strict-mode-switch-compact {
  margin: 0;
  transform: scale(0.8);
}

/* 暗色模式适配 */
.v-theme--dark .strict-mode-compact {
  background: rgba(40, 40, 40, 0.6);
  border-color: rgba(255, 255, 255, 0.1);
}

.v-theme--dark .strict-mode-compact:hover {
  background: rgba(40, 40, 40, 0.8);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
/* 猜你所想 标签区 */
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background: rgba(var(--v-theme-surface-rgb), 0.4);
  padding: 8px 16px;
  border-radius: 24px;
  animation: fadeIn 0.4s ease-out forwards;
}
.tag-chip {
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.5s ease-out forwards;
}
.detail-section pre {
  /* 保持原有空格格式，不自动换行 */
  white-space: pre; /* 强制按照原始空白和换行显示 */
  word-wrap: normal; /* 禁用单词换行 */
  word-break: normal; /* 禁用任意字符换行 */

  /* 横向滚动条，超出宽度时显示 */
  overflow-x: auto;
  overflow-y: hidden; /* 可选：隐藏垂直滚动条 */

  font-size: 0.8rem;
  background: #f5f5f5;
}
.detail-section code.hljs {
  white-space: pre !important;
}
.headline {
  overflow-x: auto;
  word-break: break-all;
}
:deep(.v-card-title) {
  text-overflow: clip;
}
</style>
