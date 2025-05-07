<template>
  <v-container
    class="mt-4"
    style="display: flex; align-items: first baseline; justify-content: center;"
  >
    <div v-cloak class="search-container">
      <div class="search-header">
        <h2>
          搜索关于
          <span class="repo-selector text-grey" @click="toggleRepoDropdown"
            >
            {{ selectedRepo.show }}
            <v-icon size="small" right>{{
              dropdownOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'
            }}</v-icon></span
          >
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
              {{repo.tag_label}}
            </span>
            {{ repo.show }}
          </div>
        </div>
      </div>

      <div class="search-input-container">
        <div class="search-input-wrapper">
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="你可以询问：寻找一段基于语义相似度搜索的方法，使用了Faiss库"
            @keyup.enter="handleSearch"
            @focus="handleFocus"
            @blur="handleBlur"
          />
          <div class="search-icon-container">
            <v-icon v-if="!isSearching" icon="mdi-magnify" class="search-icon"></v-icon>
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
          <v-icon>mdi-arrow-right</v-icon>
        </v-btn>
      </div>

      <!-- 搜索结果展示区域 -->
      <div v-if="searchResults.length > 0" class="search-results-container">
        <div
          v-for="(result, index) in searchResults"
          :key="index"
          class="search-result-item"
          :style="{ animationDelay: index * 0.1 + 's' }"
        >
          <div class="result-header">
            <h3 class="result-name">{{ result.name }}</h3>
            <span class="result-score">{{ (result.score * 100).toFixed(1) }}%</span>
          </div>
          <p class="result-file">{{ result.package }} - {{ result.file }}</p>
          <p class="result-description">{{ result.description }}</p>
        </div>
      </div>
    </div>

  </v-container>
</template>

<script>
import SVG from '../assets/search.svg'
import { listRepos, searchCode } from '../service/api'
import { omit } from '../service/str'

export default {
  name: 'DeepSearch',
  data() {
    return {
      initialLoad: true, // 初次加载标识
      placeholderImage: SVG, // 外部矢量图路径
      searchQuery: '', // 搜索查询
      isSearching: false, // 搜索状态
      isFocused: false, // 输入框聚焦状态
      dropdownOpen: false, // 下拉列表状态
      selectedRepo: '', // 当前选中的仓库
      repositories: [],
      searchResults: [] // 搜索结果
    }
  },
  created() {
    console.log('DeepSearch created')
    listRepos().then(async (res) => {
      if (res.status === 200 && res.data.length > 0) {
        for (const repo of res.data) {
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
          repo.show = `${repo.name}/${repo.branch}(${omit(repo.desc, 12)})`
        }
        this.repositories = res.data
        this.selectedRepo = this.repositories[0]
        console.log('repositories:', this.repositories)
      }
    })
  },
  methods: {
    // 处理搜索请求
    async handleSearch() {
      if (!this.searchQuery.trim()) return

      this.isSearching = true
      const { indexing, hasDb } = await window.electron.checkMemoryFlashStatus(
        this.selectedRepo.local_path
      )
      console.log('checkMemoryFlashStatus:', indexing, hasDb)
      if (hasDb && !indexing) {
        searchCode(this.selectedRepo.local_path, this.searchQuery, '', 10).then((res) => {
          this.searchResults = [] // 清空旧结果
          console.log('searchCode:', res.data)
          if (res.status === 200 && res.data.code === 0 && res.data.data.length > 0) {
            this.searchResults = res.data.data.map((item) => {
              this.isSearching = false
              return {
                name: item.name,
                package: item.package,
                file: item.file,
                score: item.score,
                description: omit(item.description, 30)
              }
            })
          }
        })
      } else if (indexing) {
        window.confirm(`${this.selectedRepo.show}正在构建索引，请稍后再试`)
        this.isSearching = false
      } else {
        window.confirm(`无法使用${this.selectedRepo.show}的搜索功能，请先构建此仓库的AI索引`)
        this.isSearching = false
      }
    },

    // 处理输入框聚焦
    handleFocus() {
      this.isFocused = true
    },

    // 处理输入框失焦
    handleBlur() {
      this.isFocused = false
    },

    // 切换仓库下拉列表显示状态
    toggleRepoDropdown() {
      this.dropdownOpen = !this.dropdownOpen

      // 添加点击外部关闭下拉列表的事件监听
      if (this.dropdownOpen) {
        setTimeout(() => {
          document.addEventListener('click', this.closeDropdownOnClickOutside)
        }, 0)
      }
    },

    // 选择仓库
    selectRepo(repo) {
      this.selectedRepo = repo
      this.dropdownOpen = false
      document.removeEventListener('click', this.closeDropdownOnClickOutside)
    },

    // 点击外部关闭下拉列表
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
  max-height: 200px;
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
  color: rgba(var(--v-theme-on-surface-rgb), 0.6);
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
  width: 52px;
  height: 52px;
  min-width: 52px;
  border-radius: 50%;
  background: rgba(var(--v-theme-primary-rgb), 0.9) !important;
  color: white;
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
</style>
