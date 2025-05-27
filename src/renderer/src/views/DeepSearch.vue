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
          <v-btn value="semantic" class="type-btn"> 语义搜索 </v-btn>
          <v-btn value="keyword" class="type-btn"> 关键词搜索 </v-btn>
          <v-btn value="hybrid" class="type-btn"> 混合搜索 </v-btn>
        </v-btn-toggle>
      </div>

      <div class="search-input-container">
        <div class="search-input-wrapper">
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            class="search-input"
            :placeholder="placeholderText"
            @focus="handleFocus"
            @blur="handleBlur"
          />
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
          class="search-button"
          elevation="0"
          :disabled="isSearching"
          :class="{ pulse: isSearching }"
          @click="handleSearch"
        >
          <v-icon>mdi-keyboard-return</v-icon>
          {{ isSearching ? '正在搜索...' : '' }}
        </v-btn>
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
            <h3 class="result-name">{{ result.name }}</h3>
            <span class="result-score">{{ (result.score * 100).toFixed(1) }}%</span>
          </div>
          <p class="result-file">{{ result.package }} - {{ result.file }}</p>
          <p class="result-description">{{ result.truncatedDescription }}</p>
        </div>
      </div>

      <v-dialog
        v-model="dialog"
        max-width="800"
        transition="fade-transition"
        overlay-color="rgba(0, 0, 0, 0.5)"
      >
        <v-card class="pa-4" :style="{ 'min-height': '80vh' }">
          <v-card-title class="headline">
            <v-btn icon color="primary" variant="text" @click="viewFileDetails">
              <v-icon right>mdi-open-in-new</v-icon>
            </v-btn>
            {{ selectedResult.name }} —
            <span style="white-space: nowrap; overflow: visible; text-overflow: clip">
              {{ selectedResult.file }}
            </span>
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
    </div>
  </v-container>
</template>

<script>
import SVG from '../assets/search.svg'
import { listRepos, searchCode } from '../service/api'
import { omit } from '../service/str'
import hljs from 'highlight.js'
import 'highlight.js/styles/mono-blue.css'
import path from 'path-browserify'
import router from '../router'

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
      searchType: 'semantic',
      tags: []
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
          return '基于RAG檢索增強生成的混合搜索'
        default:
          return '基于向量检索的自然语义相似度搜索'
      }
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
    })
  },
  beforeUnmount() {
    // 卸载时移除监听
    window.removeEventListener('keydown', this.onKeydown)
  },
  created() {
    console.log('DeepSearch created')
    this.listRepos()
  },
  methods: {
    listRepos() {
      listRepos().then(async (res) => {
        if (res.status === 200 && res.data.length > 0) {
          for (const repo of res.data) {
            const { indexing, hasDb } = await window.electron.checkMemoryFlashStatus(repo.local_path)
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
          this.repositories = res.data
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
      const url = `${this.selectedRepo.local_path}/${this.selectedResult.file}`
      console.log('跳转到文件浏览器页面，文件路径：', url)
      router.push({
        name: 'finder',
        params: { localPath: url, forceDeep: true, forceReplace: 'true' }
      })
      this.dialog = false
    },
    highlightCode(code, ext) {
      const language = ext.slice(1)
      const validLang = hljs.getLanguage(language) ? language : 'plaintext'
      return hljs.highlight(code, { language: validLang }).value
    },
    onKeydown(event) {
      // 回车键触发搜索
      if (event.key === 'Enter') {
        this.$nextTick(() => {
          if (this.$refs.searchInput) {
            this.$refs.searchInput.focus()
          }
        })
        this.handleSearch()
      }
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
        } else if (event.key === '1') {
          console.log('切换搜索类型为语义搜索')
          this.searchType = 'semantic'
        } else if (event.key === '2') {
          console.log('切换搜索类型为关键词搜索')
          this.searchType = 'keyword'
        } else if (event.key === '3') {
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
            30
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

              try {
                const obj = JSON.parse(item.description)
                if (
                  obj &&
                  typeof obj === 'object' &&
                  'description' in obj
                ) {
                  // 不管process是数组还是对象都支持
                  isJson = true
                  descSummary = obj.description
                  // 如果是数组直接使用，如果是对象则包装成数组
                  processList = Array.isArray(obj.process)
                    ? obj.process
                    : [obj.process]
                }
                // eslint-disable-next-line no-unused-vars
              } catch (e) {
                console.log('解析 JSON 失败:', e)
                /* empty */
              }

              return {
                name: item.name,
                package: item.package,
                file: item.file,
                score: item.score,
                fullDescription: fullDesc,
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
    }
  }
}
</script>

<style scoped>
[v-cloak] {
  display: none;
}
.search-container {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: fadeIn 0.6s ease-out;
}

.search-header {
  text-align: center;
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
  height: 60px;
  padding: 0 60px 0 24px;
  background: transparent;
  border: none;
  outline: none;
  font-size: 1.05rem;
  font-weight: 400;
  letter-spacing: 0.01em;
  color: rgba(var(--v-theme-on-surface-rgb), 0.87);
}

.search-input::placeholder {
  color: rgba(159, 159, 159, 0.7);
  transition: opacity 0.3s ease;
}

.search-input:focus::placeholder {
  opacity: 0.7;
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
    height: 54px;
    font-size: 1rem;
    padding: 0 50px 0 20px;
  }

  .search-button {
    width: 46px;
    height: 46px;
    min-width: 46px;
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
