<template>
  <v-container fluid class="file-browser-container pa-0 ma-0" style="height: 100vh">
    <!-- 当 loading 为 true 时显示加载动画，反之显示主体页面 -->
    <v-row v-if="loading" align="center" justify="center" class="ma-0" style="height: 100vh">
      <v-col cols="12" class="text-center pa-0" style="display: block">
        <v-progress-circular indeterminate color="primary" size="70" />
      </v-col>
    </v-row>

    <div v-else class="file-browser-layout">
      <!-- 主内容区 -->
      <div class="toolbar-container">
        <v-toolbar density="compact" height="48" class="pa-0 pl-1 pr-1">
          <!-- 标题banner -->
          <!-- <div class="toolbar-title ml-4">
            <span class="text-h8 text-caption">代码视窗</span>
          </div> -->

          <v-spacer></v-spacer>

          <!-- 中间路径选择 -->
          <div class="toolbar-center">
            <span class="text-caption mr-2">选择代码仓库: </span>
            <a-select
              v-model:value="newRootPath"
              :options="pathSuggestions.map((item) => ({ label: item.title, value: item.value }))"
              placeholder="选择代码仓库"
              allow-clear
              show-search
              style="width: 500px"
              :filter-option="
                (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              "
              @focus="loadPathSuggestions"
              @change="onPathSelectionChanged"
            />
          </div>

          <v-spacer></v-spacer>

          <!-- 右侧操作区 -->
          <div class="toolbar-right d-flex align-center">
            <!-- 侧边栏控制按钮 -->
            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-btn
                  icon
                  size="small"
                  class="pa-1 ma-0 mr-1"
                  v-bind="props"
                  @click="toggleLeftPanel"
                >
                  <v-icon size="small" :class="{ 'icon-disabled': !showLeftPanel }"
                    >mdi-dock-left</v-icon
                  >
                </v-btn>
              </template>
              <span>{{ showLeftPanel ? '隐藏目录树' : '显示目录树' }}</span>
            </v-tooltip>

            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-btn
                  icon
                  size="small"
                  class="pa-1 ma-0 mr-2"
                  v-bind="props"
                  @click="toggleRightPanel"
                >
                  <v-icon size="small" :class="{ 'icon-disabled': !showRightPanel }"
                    >mdi-dock-right</v-icon
                  >
                </v-btn>
              </template>
              <span>{{ showRightPanel ? '隐藏索引列表' : '显示索引列表' }}</span>
            </v-tooltip>

            <!-- 主题选择器 -->
            <v-menu>
              <template #activator="{ props }">
                <v-btn
                  v-if="1 === 2"
                  text
                  size="small"
                  class="pa-1 ma-0 mr-2"
                  title="切换代码高亮主题"
                  v-bind="props"
                >
                  <v-icon size="small">mdi-palette</v-icon>
                  主题
                </v-btn>
              </template>
              <v-list density="compact">
                <v-list-subheader>亮色主题</v-list-subheader>
                <v-list-item
                  v-for="theme in lightThemes"
                  :key="theme.value"
                  :title="theme.title"
                  :active="highlightTheme === theme.value"
                  @click="changeHighlightTheme(theme.value)"
                >
                  <template #prepend>
                    <v-icon
                      :color="highlightTheme === theme.value ? 'primary' : undefined"
                      size="small"
                    >
                      {{ highlightTheme === theme.value ? 'mdi-check' : 'mdi-code-tags' }}
                    </v-icon>
                  </template>
                </v-list-item>
                <v-divider></v-divider>
                <v-list-subheader>暗色主题</v-list-subheader>
                <v-list-item
                  v-for="theme in darkThemes"
                  :key="theme.value"
                  :title="theme.title"
                  :active="highlightTheme === theme.value"
                  @click="changeHighlightTheme(theme.value)"
                >
                  <template #prepend>
                    <v-icon
                      :color="highlightTheme === theme.value ? 'primary' : undefined"
                      size="small"
                    >
                      {{ highlightTheme === theme.value ? 'mdi-check' : 'mdi-code-tags' }}
                    </v-icon>
                  </template>
                </v-list-item>
              </v-list>
            </v-menu>
            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-btn
                  icon
                  size="small"
                  class="pa-1 ma-0"
                  v-bind="props"
                  @click="changeHighlightTheme()"
                >
                  <v-icon size="small">mdi-palette</v-icon>
                </v-btn>
              </template>
              <span>切换代码高亮主题</span>
            </v-tooltip>

            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-btn icon size="small" class="pa-1 ma-0" v-bind="props" @click="pull()">
                  <v-icon size="small">mdi-git</v-icon>
                </v-btn>
              </template>
              <span>更新代码</span>
            </v-tooltip>

            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-btn
                  icon
                  size="small"
                  class="pa-1 ma-0"
                  v-bind="props"
                  @click="openOutside(breadcrumbs, true)"
                >
                  <v-icon size="small">mdi-folder-eye</v-icon>
                </v-btn>
              </template>
              <span>从文件夹打开</span>
            </v-tooltip>

            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-btn
                  icon
                  size="small"
                  class="pa-1 ma-0"
                  v-bind="props"
                  @click="openOutside(breadcrumbs, false)"
                >
                  <v-icon size="small">mdi-file-search-outline</v-icon>
                </v-btn>
              </template>
              <span>从应用程序打开</span>
            </v-tooltip>
          </div>
        </v-toolbar>
      </div>

      <div class="content-container">
        <!-- 左侧目录树 -->
        <div
          v-show="showLeftPanel"
          class="file-tree-panel"
          :style="{ width: leftPanelWidth + 'px' }"
        >
          <div outlined class="pa-1 file-tree-card">
            <v-divider></v-divider>
            <div class="file-tree-search-container pa-2">
              <el-input
                v-model="searchQuery"
                placeholder="搜索文件..."
                clearable
                :prefix-icon="Search"
                class="mb-2"
                @input="filterTree"
              />
              <!-- 搜索进度显示 -->
              <div v-if="searchConfig.isSearching" class="search-progress-container">
                <div class="search-progress-bar">
                  <div
                    class="search-progress-fill"
                    :style="{ width: searchConfig.searchProgress + '%' }"
                  ></div>
                </div>
                <span class="search-progress-text">
                  搜索中... {{ Math.round(searchConfig.searchProgress) }}%
                </span>
              </div>

              <!-- 添加路径导航输入框 -->
              <!-- <div class="path-navigation mt-2">
                <v-text-field
                  v-model="pathInput"
                  placeholder="输入路径..."
                  clearable
                  class="mb-1"
                  density="compact"
                  hide-details
                  append-inner-icon="mdi-crosshairs-gps"
                  @click:append-inner="expandToInputPath(pathInput)"
                ></v-text-field>
              </div> -->
            </div>
            <el-tree
              :key="treeKey"
              ref="treeRef"
              style="height: 78vh; overflow-y: scroll"
              :data="filteredTreeData"
              :props="{
                label: 'name',
                children: 'children',
                isLeaf: (data) => !data.isDirectory
              }"
              :expand-on-click-node="false"
              :default-expanded-keys="openNodes"
              node-key="path"
              :item-size="26"
              :empty-text="searchQuery ? '未找到匹配项' : '暂无文件'"
              virtual-scrolling
              :scroll="{ x: true, y: true }"
              @node-click="handleNodeClick"
              @node-expand="handleNodeExpand"
              @node-collapse="handleNodeCollapse"
              @node-contextmenu="handleNodeContextMenu"
            >
              <template #default="{ data }">
                <div
                  class="custom-tree-node"
                  :class="{ 'search-result-folder': data.isDirectory && data.hasSearchResults }"
                  @mouseenter="debouncedHoverHandler(data.path, $event)"
                  @mouseleave="hideHoverTooltip"
                  @click="handleSearchResultClick(data, $event)"
                >
                  <el-icon class="mr-1">
                    <Folder v-if="data.isDirectory" />
                    <Document v-else />
                  </el-icon>
                  <span class="node-label">{{ data.name }}</span>
                  <span v-if="data.isDirectory && data.hasSearchResults" class="search-expand-hint">
                    <el-icon class="ml-1" size="12">
                      <ArrowRight />
                    </el-icon>
                  </span>
                </div>
              </template>
            </el-tree>
          </div>
        </div>
        <!-- 左侧拖拽分隔条 -->
        <div
          v-show="showLeftPanel"
          class="resizer resizer-left"
          @mousedown="startResizing('left', $event)"
        ></div>

        <!-- 右侧文件预览和标签 -->
        <div class="file-content-panel">
          <div class="flex-shrink-0">
            <div class="tabs-container" style="flex-shrink: 0; overflow: hidden; max-width: 75%">
              <v-tabs
                v-if="tabs.length"
                v-model="activeTab"
                density="compact"
                height="32"
                scrollable
                show-arrows
                :slider-color="'primary'"
                class="tabs-wrapper"
              >
                <v-tab
                  v-for="(tab, index) in tabs"
                  :key="tab.path"
                  :value="index"
                  class="text-caption tab-item"
                  @click="selectTab(tab)"
                  @contextmenu="(e) => handleTabContextMenu(e, tab, index)"
                >
                  <span class="tab-text">{{ tab.name }}</span>
                  <v-btn
                    size="x-small"
                    variant="text"
                    class="tab-close-btn"
                    :title="`关闭 ${tab.name} (Ctrl+W)`"
                    @click.stop="removeTab(index)"
                  >
                    <v-icon size="12">mdi-close</v-icon>
                  </v-btn>
                </v-tab>
              </v-tabs>
            </div>
            <!-- 面包屑导航 -->
            <div class="breadcrumb-container">
              <v-breadcrumbs :items="breadcrumbs" class="pa-0" density="compact">
                <template #item="{ item }">
                  <v-breadcrumbs-item
                    :title="item.text"
                    class="text-caption"
                    @click="navigateTo(item.path)"
                  >
                    {{ item.text }}
                  </v-breadcrumbs-item>
                </template>
              </v-breadcrumbs>
            </div>
          </div>
          <v-divider></v-divider>

          <!-- 主要预览区域 -->
          <div class="d-flex flex-grow-1" style="height: 100%">
            <!-- 文件内容预览区域 -->
            <v-card
              tonal
              class="flex-grow-1 pa-0 main-preview"
              style="height: 100%; overflow-y: auto; min-width: 0"
            >
              <v-card-text class="pt-1 h-100 pb-2 mb-2">
                <div v-if="selectedFileName" class="preview-content">
                  <!-- 文件操作按钮 -->
                  <!-- 快速代码查找和函数操作按钮 -->
                  <div class="d-flex justify-space-between align-center mb-2">
                    <!-- 原有的函数操作按钮 -->
                    <div style="display: flex; gap: 8px">
                      <a-button
                        v-if="isCodeFile && codeIndex && codeIndex.functions"
                        size="small"
                        type="link"
                        ghost
                      >
                        <template #icon>
                          <function-outlined />
                        </template>
                        {{ codeIndex.total_function_count }} 个索引
                      </a-button>
                      <!-- 文件锁按钮 -->
                      <a-button
                        v-if="isCodeFile"
                        size="small"
                        :danger="fileEditLocked"
                        @click="toggleFileLock"
                      >
                        <template #icon>
                          <lock-outlined v-if="fileEditLocked" />
                          <unlock-outlined v-else />
                        </template>
                        {{ fileEditLocked ? '只读模式' : '编辑模式' }}
                      </a-button>
                      <!-- 时间线按钮 -->
                      <a-button
                        v-if="isCodeFile && !fileEditLocked"
                        size="small"
                        type="text"
                        ghost
                        @click="toggleTimeline"
                      >
                        <template #icon>
                          <history-outlined />
                        </template>
                        时间线
                      </a-button>
                      <!-- <a-button size="small" variant="outlined" ghost @click="openInIDE">
                        从IDE编辑
                      </a-button> -->

                      <!-- 编辑操作按钮组 -->
                      <template v-if="isCodeFile && !fileEditLocked">
                        <a-divider type="vertical" />

                        <!-- 保存按钮 -->
                        <a-button
                          size="small"
                          :type="hasUnsavedChanges ? 'primary' : 'default'"
                          :loading="isAutoSaving"
                          :title="'保存文件 (Ctrl+S)'"
                          @click="saveCurrentFile"
                        >
                          <template #icon>
                            <save-outlined />
                          </template>
                          {{ isAutoSaving ? '保存中...' : hasUnsavedChanges ? '保存*' : '保存' }}
                        </a-button>
                      </template>
                    </div>
                  </div>

                  <!-- PDF 预览 -->
                  <div v-if="isPDF(selectedFileName)">
                    <iframe
                      :src="getPDFUrl()"
                      style="width: 100%; height: 100%"
                      frameborder="0"
                    ></iframe>
                  </div>
                  <!-- DOCX 预览 -->
                  <div v-else-if="isDocx(selectedFileName)">
                    <div v-if="renderedDocx" v-html="renderedDocx"></div>
                    <div v-else>加载 DOCX 中...</div>
                  </div>
                  <!-- XLSX 预览 -->
                  <div v-else-if="isXlsx(selectedFileName)">
                    <div v-if="renderedXlsx" v-html="renderedXlsx"></div>
                    <div v-else>加载 XLSX 中...</div>
                  </div>
                  <!-- Markdown 预览 -->
                  <div
                    v-else-if="isMarkdown(selectedFileName)"
                    class="markdown-content pt-0 mt-0"
                    @click="handleLinkClick"
                    v-html="renderMarkdown(fileContent)"
                  ></div>
                  <!-- 代码文件预览 -->
                  <!-- <div v-else-if="isCodeFile" class="monaco-container"> -->
                  <div v-else class="monaco-container">
                    <MonacoEditor
                      v-model:value="fileContent"
                      :language="getFileLanguage(selectedFileName)"
                      :theme="currentTheme"
                      :options="monacoOptions"
                      @mount="onEditorMounted"
                    />
                  </div>
                  <!-- 其他文本文件预览 -->
                  <!-- <pre v-else>{{ fileContent }}</pre> -->
                </div>
                <div v-else style="text-align: center; padding-top: 20%"></div>
              </v-card-text>
            </v-card>

            <!-- 右侧拖拽分隔条（在主预览与索引侧之间） -->
            <div
              v-if="
                showRightPanel &&
                isCodeFile &&
                codeIndex &&
                Object.keys(codeIndex.functions || {}).length > 0
              "
              class="resizer resizer-right"
              @mousedown="startResizing('right', $event)"
            ></div>

            <!-- 代码索引侧边栏 -->
            <v-card
              v-if="
                (showRightPanel &&
                  isCodeFile &&
                  codeIndex &&
                  Object.keys(codeIndex.functions || {}).length > 0) ||
                showTimeline
              "
              class="mt-1 mb-1 code-index-sidebar"
              :style="{ width: rightPanelWidth + 'px', maxWidth: rightPanelWidth + 'px' }"
            >
              <!-- 时间线面板 -->
              <div v-if="showTimeline" class="timeline-panel" style="padding: 16px">
                <div
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 16px;
                  "
                >
                  <div style="font-size: 16px; font-weight: 600; color: #1890ff">
                    <history-outlined style="margin-right: 8px" />
                    文件历史
                  </div>
                  <a-button size="small" type="text" @click="showTimeline = false">
                    <template #icon>
                      <close-outlined />
                    </template>
                  </a-button>
                </div>

                <!-- 历史统计信息 -->
                <div
                  v-if="historyStats"
                  style="
                    margin-bottom: 12px;
                    padding: 8px;
                    background: rgba(0, 0, 0, 0.02);
                    border-radius: 4px;
                  "
                >
                  <div style="font-size: 12px; color: #666; margin-bottom: 4px">
                    <strong>历史统计:</strong> 总计 {{ historyStats.totalVersions }} 个版本
                    <span v-if="historyStats.totalVersions > 0">
                      | 平均大小: {{ formatFileSize(historyStats.averageSize) }}
                    </span>
                  </div>
                </div>

                <!-- 历史版本列表 -->
                <div class="timeline-list" style="max-height: 300px; overflow-y: auto">
                  <a-list v-if="fileHistory.length > 0" size="small">
                    <a-list-item
                      v-for="(item, index) in fileHistory"
                      :key="item.id"
                      :class="{ 'ant-list-item-selected': index === currentHistoryIndex }"
                      style="cursor: pointer; padding: 8px 12px"
                      @click="viewHistoryVersion(index)"
                    >
                      <a-list-item-meta>
                        <template #avatar>
                          <file-text-outlined v-if="item.isCurrent" style="color: #52c41a" />
                          <history-outlined v-else style="color: #1890ff" />
                        </template>
                        <template #title>
                          <span style="font-size: 12px">{{ item.description }}</span>
                        </template>
                        <template #description>
                          <div style="font-size: 12px; color: #666">
                            {{ new Date(item.timestamp).toLocaleString() }}
                            <a-tag size="small" style="margin-left: 8px">
                              {{ formatFileSize(item.size) }}
                            </a-tag>
                          </div>
                        </template>
                      </a-list-item-meta>

                      <template #actions>
                        <div v-if="!item.isCurrent" style="display: flex; gap: 4px">
                          <a-tooltip title="恢复到此版本">
                            <a-button
                              size="small"
                              type="text"
                              @click.stop="restoreToHistoryVersion(index)"
                            >
                              <template #icon>
                                <redo-outlined />
                              </template>
                            </a-button>
                          </a-tooltip>
                          <a-tooltip title="删除此版本">
                            <a-button
                              size="small"
                              type="text"
                              danger
                              @click.stop="deleteHistoryVersion(index)"
                            >
                              <template #icon>
                                <delete-outlined />
                              </template>
                            </a-button>
                          </a-tooltip>
                        </div>
                      </template>
                    </a-list-item>
                  </a-list>

                  <div v-else style="text-align: center; padding: 24px">
                    <history-outlined style="font-size: 48px; color: #d9d9d9" />
                    <p style="font-size: 12px; color: #999; margin-top: 8px">暂无历史记录</p>
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div style="display: flex; gap: 8px; margin-top: 16px">
                  <a-button size="small" type="primary" ghost @click="restoreCurrentVersion">
                    <template #icon>
                      <file-text-outlined />
                    </template>
                    当前版本
                  </a-button>

                  <a-button
                    v-if="selectedHistoryItem && !selectedHistoryItem.isCurrent"
                    size="small"
                    type="default"
                    @click="openDiffModal"
                  >
                    <template #icon>
                      <diff-outlined />
                    </template>
                    差异视图
                  </a-button>
                </div>

                <a-divider style="margin: 12px 0" />
              </div>

              <!-- 函数索引面板 -->
              <div
                v-if="codeIndex && Object.keys(codeIndex.functions || {}).length > 0"
                class="pa-3"
              >
                <!-- AI 描述区域 -->
                <div v-if="currentFileAiDescription" class="ai-description-section mb-3">
                  <div class="d-flex align-center mb-2">
                    <v-icon size="small" color="primary" class="mr-2">mdi-robot</v-icon>
                    <span class="text-subtitle-2 font-weight-medium">AI 描述</span>
                    <v-spacer></v-spacer>
                    <v-btn
                      v-if="isAiDescriptionOverflow"
                      size="x-small"
                      variant="text"
                      color="primary"
                      class="text-caption"
                      @click="toggleAiDescription"
                    >
                      <v-icon size="small" class="mr-1">
                        {{ aiDescriptionExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                      </v-icon>
                      {{ aiDescriptionExpanded ? '收起' : '展开' }}
                    </v-btn>
                  </div>
                  <v-card
                    variant="outlined"
                    class="pa-3"
                    style="background-color: rgba(var(--v-theme-primary), 0.05)"
                  >
                    <div
                      ref="aiDescriptionRef"
                      class="ai-description-content markdown-content"
                      :class="{
                        'ai-description-collapsed':
                          !aiDescriptionExpanded && isAiDescriptionOverflow
                      }"
                      :style="{
                        lineHeight: '1.5',
                        height:
                          !aiDescriptionExpanded && isAiDescriptionOverflow ? '200px' : 'auto',
                        overflow:
                          !aiDescriptionExpanded && isAiDescriptionOverflow ? 'hidden' : 'visible',
                        textOverflow: 'unset',
                        whiteSpace: 'normal',
                        transition: 'height 0.3s ease-in-out'
                      }"
                      v-html="
                        renderMarkdown(
                          aiDescriptionExpanded
                            ? currentFileAiDescription
                            : currentFileAiDescription.substring(0, aiDescriptionMaxLength) + '...'
                        )
                      "
                    ></div>
                  </v-card>
                </div>

                <!-- 代码结构搜索框 -->
                <div class="d-flex align-center mb-2" style="position: relative">
                  <div class="code-search-container" :class="{ 'dark-theme': isDarkTheme }">
                    <v-icon
                      size="small"
                      style="
                        position: absolute;
                        left: 22px;
                        top: 50%;
                        transform: translateY(-50%);
                        z-index: 1;
                      "
                      >mdi-magnify</v-icon
                    >
                    <input
                      v-model="codeStructureSearch"
                      type="text"
                      class="custom-search-input"
                      :placeholder="'搜索函数...'"
                      :style="{
                        paddingLeft: '32px',
                        width: '100%',
                        height: '36px',
                        border: '1px solid ' + (isDarkTheme ? '#4a5568' : '#d1d5db'),
                        borderRadius: '6px',
                        outline: 'none',
                        color: isDarkTheme ? '#e2e8f0' : 'inherit',
                        background: isDarkTheme ? '#1e1e1e' : 'white'
                      }"
                    />
                    <v-icon
                      v-if="codeStructureSearch"
                      size="small"
                      color="grey"
                      style="
                        position: absolute;
                        right: 24px;
                        top: 50%;
                        transform: translateY(-50%);
                        cursor: pointer;
                        z-index: 2;
                      "
                      @click="codeStructureSearch = ''"
                    >
                      mdi-close-circle
                    </v-icon>
                  </div>
                </div>
                <v-divider class="mb-3"></v-divider>

                <!-- 遍历每个文件 -->
                <div v-for="(functions, filePath) in codeIndex.functions" :key="filePath">
                  <div class="text-caption text-medium-emphasis mb-2">
                    <v-icon size="small" class="mr-1">mdi-file-code</v-icon>
                    {{ filePath }}
                  </div>

                  <!-- 遍历文件中的每个函数 (带搜索过滤) -->
                  <div
                    v-for="functionItem in filterFunctions(functions)"
                    :key="`${filePath}-${functionItem.name}`"
                    class="mb-3"
                  >
                    <v-card
                      variant="outlined"
                      class="pa-2 function-card"
                      :class="{ 'elevation-2': hoveredFunction === functionItem.name }"
                      style="cursor: pointer; transition: all 0.2s"
                      @mouseenter="
                        ((hoveredFunction = functionItem.name),
                        (hoveredFilePath = filePath),
                        handleFunctionMouseEnter($event, functionItem, filePath))
                      "
                      @mouseleave="
                        ((hoveredFunction = null),
                        (hoveredFilePath = null),
                        handleFunctionMouseLeave())
                      "
                    >
                      <div class="d-flex align-center mb-1">
                        <v-icon size="small" color="primary" class="mr-2"
                          >mdi-function-variant</v-icon
                        >
                        <span class="font-weight-medium text-primary">{{ functionItem.name }}</span>
                      </div>

                      <div class="text-caption text-medium-emphasis mb-1">
                        <v-icon size="x-small" class="mr-1">mdi-map-marker</v-icon>
                        行 {{ functionItem.start_line }} - {{ functionItem.end_line }}
                      </div>

                      <!-- 函数描述 -->
                      <template v-if="functionItem.description">
                        <div
                          v-if="getParsedDescription(functionItem.description).description"
                          class="text-caption description-text mb-2"
                        >
                          <strong>描述：</strong>
                          {{ getParsedDescription(functionItem.description).description }}
                        </div>

                        <!-- 处理流程 -->
                        <div
                          v-if="
                            getParsedDescription(functionItem.description).process &&
                            getParsedDescription(functionItem.description).process.length > 0
                          "
                          class="text-caption process-text"
                        >
                          <strong>处理流程：</strong>
                          <div
                            v-for="(step, index) in getParsedDescription(functionItem.description)
                              .process"
                            :key="index"
                            class="ml-2 mt-1"
                          >
                            <div class="d-flex">
                              <div class="mr-1">{{ index + 1 }}.</div>
                              <div>{{ step }}</div>
                            </div>
                          </div>
                        </div>
                      </template>

                      <div v-if="functionItem.package" class="text-caption text-success mt-1">
                        <v-icon size="x-small" class="mr-1">mdi-package-variant</v-icon>
                        {{ functionItem.package }}
                      </div>
                    </v-card>
                  </div>
                  <v-divider
                    v-if="Object.keys(codeIndex.functions).length > 1"
                    class="my-3"
                  ></v-divider>
                </div>
              </div>
            </v-card>
          </div>
        </div>
      </div>

      <!-- 悬停提示气泡 -->
      <div
        v-if="hoverTooltip.show"
        class="hover-tooltip"
        :style="{
          position: 'fixed',
          left: hoverTooltip.x + 'px',
          top: hoverTooltip.y + 'px',
          zIndex: 9999,
          pointerEvents: 'none'
        }"
      >
        <v-card
        variant="elevated"
        class="pa-3 hover-tooltip-card"
        style="max-width: 500px"
        >
          <div v-if="hoverTooltip.loading" class="d-flex align-center">
            <v-progress-circular indeterminate size="16" class="mr-2"></v-progress-circular>
            <span class="text-caption">{{ hoverTooltip.content }}</span>
          </div>
          <div v-else class="text-caption hover-tooltip-content" style="line-height: 1.4">
            <div v-html="renderMarkdown(hoverTooltip.content)"></div>
          </div>
        </v-card>
      </div>

      <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" class="ma-0">
        {{ snackbar.message }}
      </v-snackbar>
    </div>
    <!-- 进度条弹窗 -->
    <v-dialog v-model="progressDialog" persistent max-width="400">
      <v-card class="pa-2">
        <v-card-title class="text-center pa-1">{{ progressTitle }}</v-card-title>
        <v-card-text class="pa-2">
          <v-progress-linear
            :model-value="progress"
            color="primary"
            height="25"
            striped
            class="mb-1"
          >
            <template #default="{ value }">
              <strong>{{ Math.ceil(value) }}%</strong>
            </template>
          </v-progress-linear>
          <div class="text-center mt-1">{{ progressMessage }}</div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- 索引进度对话框（SpaceLens 同款） -->
    <v-dialog v-model="indexProgressVisible" persistent max-width="500">
      <v-card>
        <v-card-title class="text-h6"> 正在构建索引 </v-card-title>
        <v-card-text>
          <div class="mb-4">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <p>正在为项目构建索引，这可能需要一些时间...</p>
            <p v-if="indexProgressData.estimatedTime">
              预计还剩：{{ indexProgressData.estimatedTime }}
            </p>
          </div>

          <v-progress-linear
            :model-value="indexProgressData.progress"
            color="primary"
            height="8"
            rounded
          ></v-progress-linear>

          <div class="mt-2 text-center">
            <small>{{ indexProgressData.progress }}% 完成</small>
          </div>

          <div v-if="indexProgressData.currentFile" class="mt-3">
            <small class="text-grey">当前处理：{{ indexProgressData.currentFile }}</small>
          </div>
          <div v-if="indexProgressData.remainingFiles" class="mt-3">
            <small class="text-grey"
              >剩余索引文件数：{{ indexProgressData.remainingFiles }} /
              {{ indexProgressData.totalFiles }}</small
            >
          </div>
          <div v-if="indexProgressData.totalFunctions" class="mt-3">
            <small class="text-grey"
              >已索引的函数量：<strong style="color: #1976d2">{{
                indexProgressData.totalFunctions
              }}</strong></small
            >
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="hideIndexProcess"> 隐藏并后台运行 </v-btn>
          <v-btn color="red" variant="text" @click="cancelIndexProcess"> 取消 </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 代码分析/流程图弹窗（SpaceLens 同款） -->
    <AnalysisReportModal
      v-model="analysisReportDrawerVisible"
      :repo-i-d="modalRepoID"
      :target-path="modalTargetPath"
      :scope-text="modalScopeText"
      :whole-code="wholeCode"
      :api="apiType"
      :count="count"
      :config="weightConfig"
    />

    <!-- 新建文件对话框 -->
    <v-dialog v-model="newFileDialog" max-width="400">
      <v-card>
        <v-card-title>新建文件</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newFileName"
            label="文件名"
            placeholder="例如: index.js"
            variant="outlined"
            autofocus
            @keyup.enter="confirmCreateFile"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="newFileDialog = false">取消</v-btn>
          <v-btn color="primary" :disabled="!newFileName.trim()" @click="confirmCreateFile"
            >创建</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 新建文件夹对话框 -->
    <v-dialog v-model="newFolderDialog" max-width="400">
      <v-card>
        <v-card-title>新建文件夹</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newFolderName"
            label="文件夹名"
            placeholder="例如: components"
            variant="outlined"
            autofocus
            @keyup.enter="confirmCreateFolder"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="newFolderDialog = false">取消</v-btn>
          <v-btn color="primary" :disabled="!newFolderName.trim()" @click="confirmCreateFolder"
            >创建</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 重命名对话框 -->
    <v-dialog v-model="renameDialog" max-width="400">
      <v-card>
        <v-card-title>重命名</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="renameValue"
            label="新名称"
            variant="outlined"
            autofocus
            @keyup.enter="confirmRename"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="renameDialog = false">取消</v-btn>
          <v-btn color="primary" :disabled="!renameValue.trim()" @click="confirmRename"
            >重命名</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.show"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <div v-for="item in contextMenu.items" :key="item.id" class="context-menu-item">
        <div
          v-if="!item.separator"
          class="context-menu-option"
          :class="{ disabled: item.disabled }"
          @click="handleContextMenuAction(item.action)"
        >
          <div class="context-menu-icon">
            <svg v-if="item.icon" :viewBox="item.icon.viewBox" class="menu-icon">
              <path :d="item.icon.path" />
            </svg>
          </div>
          <span class="context-menu-text">{{ item.label }}</span>
          <span v-if="item.shortcut" class="context-menu-shortcut">{{ item.shortcut }}</span>
        </div>
        <div v-else class="context-menu-separator"></div>
      </div>
    </div>

    <!-- 右键菜单背景遮罩 -->
    <div
      v-if="contextMenu.show"
      class="context-menu-overlay"
      @click="hideContextMenu"
      @contextmenu.prevent="hideContextMenu"
    ></div>

    <!-- 差异视图弹窗 -->
    <a-modal
      v-model:open="showDiffModal"
      title="文件差异对比"
      width="90%"
      :footer="null"
      class="diff-modal"
      @cancel="closeDiffModal"
    >
      <template #title>
        <div style="display: flex; align-items: center; gap: 8px">
          <diff-outlined style="color: #1890ff" />
          <span>文件差异对比</span>
          <a-tag v-if="selectedHistoryItem" color="blue" size="small">
            {{ selectedHistoryItem.description }}
          </a-tag>
        </div>
      </template>

      <div class="diff-container">
        <!-- 差异编辑器容器 -->
        <div
          ref="diffModalContainer"
          class="diff-editor-container"
          style="height: 70vh; width: 100%; border: 1px solid #d9d9d9; border-radius: 6px"
        ></div>

        <!-- 操作按钮栏 -->
        <div class="diff-actions" style="margin-top: 16px; text-align: center">
          <a-space>
            <a-button
              v-if="selectedHistoryItem && !selectedHistoryItem.isCurrent"
              type="primary"
              :loading="isRestoringHistory"
              @click="restoreFromDiff"
            >
              <template #icon>
                <redo-outlined />
              </template>
              恢复到此版本
            </a-button>

            <a-button @click="closeDiffModal">
              <template #icon>
                <close-outlined />
              </template>
              关闭
            </a-button>
          </a-space>
        </div>
      </div>
    </a-modal>

    <!-- 函数详情气泡浮窗 -->
    <div
      v-if="functionTooltip.show"
      class="function-tooltip"
      :style="{ left: functionTooltip.x + 'px', top: functionTooltip.y + 'px' }"
    >
      <v-card class="pa-3" style="max-width: 400px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)">
        <div v-if="functionTooltip.loading" class="text-center">
          <v-progress-circular indeterminate size="24" class="mr-2"></v-progress-circular>
          <span class="text-caption">加载中...</span>
        </div>
        <div v-else-if="functionTooltip.data">
          <div class="d-flex align-center mb-2">
            <v-icon size="small" color="primary" class="mr-2">mdi-function-variant</v-icon>
            <span class="font-weight-bold text-primary">{{ functionTooltip.data.name }}</span>
            <v-chip
              v-if="functionTooltip.data.function_type"
              size="x-small"
              class="ml-2"
              color="info"
            >
              {{ functionTooltip.data.function_type }}
            </v-chip>
          </div>

          <div v-if="functionTooltip.data.package" class="text-caption text-success mb-1">
            <v-icon size="x-small" class="mr-1">mdi-package-variant</v-icon>
            {{ functionTooltip.data.package }}
          </div>

          <div class="text-caption text-medium-emphasis mb-1">
            <v-icon size="x-small" class="mr-1">mdi-file-code</v-icon>
            {{ functionTooltip.data.file }}
          </div>

          <div class="text-caption text-medium-emphasis mb-2">
            <v-icon size="x-small" class="mr-1">mdi-map-marker</v-icon>
            行 {{ functionTooltip.data.start_line }} - {{ functionTooltip.data.end_line }} ({{
              functionTooltip.data.lines
            }}
            行)
          </div>

          <div v-if="functionTooltip.data.description" class="text-caption mb-2">
            <strong>描述：</strong>{{ functionTooltip.data.description }}
          </div>

          <v-divider class="my-2"></v-divider>

          <div class="d-flex justify-space-between text-caption mb-1">
            <div><strong>复杂度：</strong>{{ functionTooltip.data.complexity || 'N/A' }}</div>
            <div><strong>深度：</strong>{{ functionTooltip.data.depth || 'N/A' }}</div>
          </div>

          <div class="d-flex justify-space-between text-caption mb-1">
            <div><strong>扇入：</strong>{{ functionTooltip.data.fan_in || 0 }}</div>
            <div><strong>扇出：</strong>{{ functionTooltip.data.fan_out || 0 }}</div>
          </div>

          <div class="text-caption mb-2">
            <strong>重要性评分：</strong>
            <v-chip
              size="x-small"
              :color="
                functionTooltip.data.score > 2
                  ? 'error'
                  : functionTooltip.data.score > 1
                    ? 'warning'
                    : 'success'
              "
            >
              {{ functionTooltip.data.score ? functionTooltip.data.score.toFixed(2) : 'N/A' }}
            </v-chip>
          </div>

          <div
            v-if="functionTooltip.data.imports && functionTooltip.data.imports.length > 0"
            class="mb-2"
          >
            <div class="text-caption font-weight-medium mb-1">
              <v-icon size="x-small" class="mr-1">mdi-import</v-icon>
              导入模块：
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ functionTooltip.data.imports.slice(0, 3).join(', ') }}
              <span v-if="functionTooltip.data.imports.length > 3"
                >等{{ functionTooltip.data.imports.length }}个</span
              >
            </div>
          </div>

          <div
            v-if="functionTooltip.data.calls && functionTooltip.data.calls.length > 0"
            class="mt-2"
          >
            <div class="text-caption font-weight-medium mb-1">
              <v-icon size="x-small" class="mr-1">mdi-call-made</v-icon>
              调用函数：
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ functionTooltip.data.calls.slice(0, 3).join(', ') }}
              <span v-if="functionTooltip.data.calls.length > 3"
                >等{{ functionTooltip.data.calls.length }}个</span
              >
            </div>
          </div>
        </div>
        <div v-else class="text-caption text-medium-emphasis">暂无详细信息</div>
      </v-card>
    </div>
  </v-container>
</template>

<script setup>
// 1) 导入 worker 构造器（路径视你的依赖版本和打包器语法而定）
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker.js?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker.js?worker'

// 2) 注入到全局
window.MonacoEnvironment = {
  getWorker: (_moduleId, label) => {
    if (label === 'json') {
      return new JsonWorker()
    }
    if (label === 'typescript' || label === 'javascript') {
      return new TsWorker()
    }
    // 默认就是编辑器本身的 worker
    return new EditorWorker()
  }
}
import 'highlight.js/styles/default.css'
import { ref, computed, onMounted, onUnmounted, onActivated, watch, nextTick, reactive } from 'vue'
import { useStore } from 'vuex'
import { isFilePath } from '../service/file'
import mammoth from 'mammoth'
// 使用 window.electron.path 替代 path-browserify
import { ElInput, ElIcon } from 'element-plus'
import { Folder, Document, Search, ArrowRight } from '@element-plus/icons-vue'
// Ant Design Vue 图标
import {
  FunctionOutlined,
  LockOutlined,
  UnlockOutlined,
  HistoryOutlined,
  CloseOutlined,
  FileTextOutlined,
  RedoOutlined,
  DeleteOutlined,
  DiffOutlined,
  SaveOutlined
} from '@ant-design/icons-vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import MonacoEditor from 'monaco-editor-vue3'

import fileHistoryDB from '../utils/fileHistoryDB.js'
import * as XLSX from 'xlsx'
import {
  listRepos,
  pullRepo,
  checkIndexApi,
  listGraph,
  resetIndexApi,
  deleteIndexSomeApi,
  getFunctionInfo
} from '../service/api.js'
import AnalysisReportModal from '../components/ai/AnalysisReportModal.vue'
import { omit } from '../service/str'
// router import removed as we're using IPC instead of direct routing
// Vuex store（假定已配置）
const store = useStore()
// computed 用于展现 snackbar 数据（减少不必要的更新）
const snackbar = computed(() => store.state.snackbar)

// AI 描述是否溢出（基于字符串长度）
const isAiDescriptionOverflow = computed(() => {
  if (!currentFileAiDescription.value) return false
  return currentFileAiDescription.value.length > aiDescriptionMaxLength
})

// 主题检测和高亮样式管理
const isDarkTheme = ref(false)
const highlightTheme = ref('github')

// MonacoEditor 相关配置
// 读取黑色主题偏好设置
// 修复点1：合理的默认值逻辑（无偏好时默认日间）
const savedHighlightPref = localStorage.getItem('fileBrowser.highlightDark')
const highlightThemeDark = ref(savedHighlightPref === null ? false : savedHighlightPref === 'true')
const currentTheme = ref(highlightThemeDark.value ? 'vs-dark' : 'vs-light') // Monaco编辑器主题

const monacoOptions = reactive({
  fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
  readOnly: true,
  automaticLayout: true,
  wordWrap: 'on',
  minimap: { enabled: true },
  theme: currentTheme.value,
  fontSize: 14
})

// Monaco编辑器实例和装饰引用
let monacoGlobal = null
let monacoInstance = null
let searchDecorations = [] // 搜索高亮装饰ID数组
let monacoReady = false // 标记Monaco编辑器是否完全初始化完成
let pendingScrollActions = [] // 缓存等待执行的滚动操作

// 文件编辑锁定状态
const fileEditLocked = ref(true) // 默认为只读模式
const hasUnsavedChanges = ref(false) // 是否有未保存的更改
const isAutoSaving = ref(false) // 是否正在自动保存

// 时间线功能相关状态
const showTimeline = ref(false)
const fileHistory = ref([]) // 文件历史记录
const currentHistoryIndex = ref(-1) // 当前查看的历史版本索引
const showDiffMode = ref(false) // 是否显示差异模式
const diffEditor = ref(null) // Monaco差异编辑器实例
const selectedHistoryItem = ref(null) // 当前选中的历史项
const originalContent = ref('') // 原始内容（用于差异对比）
const historyStats = ref(null) // 历史统计信息

// 差异视图弹窗相关状态
const showDiffModal = ref(false) // 是否显示差异弹窗
const diffModalEditor = ref(null) // 弹窗中的差异编辑器实例
const diffModalContainer = ref(null) // 弹窗中的编辑器容器引用

/* NEW ─ onEditorMounted：注册快捷键、补全、装饰 */
function onEditorMounted(editor) {
  console.log('Monaco编辑器正在挂载')
  // 获取Monaco全局对象和编辑器实例
  monacoGlobal = editor.$monaco
  monacoInstance = editor

  // 标记编辑器已就绪
  monacoReady = true
  console.log('Monaco编辑器初始化完成')

  // 修复点2：每次编辑器挂载时显式应用当前主题，避免重建后回落默认
  editor.updateOptions({
    theme: currentTheme.value,
    readOnly: fileEditLocked.value // 同步文件锁定状态
  })

  // 执行之前缓存的滚动操作
  if (pendingScrollActions.length > 0) {
    console.log(`执行 ${pendingScrollActions.length} 个缓存的滚动操作`)
    pendingScrollActions.forEach((action) => action())
    pendingScrollActions = []
  }

  // 添加内容变化监听
  setupContentChangeListener(editor)

  // 设置编辑器快捷键
  setupEditorShortcuts(editor)

  // 1. 强制开启触发字符补全和片段建议
  editor.updateOptions({
    suggestOnTriggerCharacters: true,
    snippetSuggestions: 'inline'
  })

  // 2. 获取当前模型的语言 ID
  const model = editor.getModel()
  const langId = model.getLanguageId()

  // 3. 针对当前语言注册补全 provider
  monacoGlobal.languages.registerCompletionItemProvider(langId, {
    triggerCharacters: ['.'],
    provideCompletionItems: () => {
      return {
        suggestions: [
          {
            label: 'helloWorld',
            kind: monacoGlobal.languages.CompletionItemKind.Snippet,
            insertText: 'console.log("Hello, Monaco!");',
            // 确保这是以 snippet 形式插入
            insertTextRules: monacoGlobal.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '打印 "Hello, Monaco!" 到控制台'
          }
        ]
      }
    }
  })

  // 3. 行高亮装饰示例
  const deco = editor.deltaDecorations(
    [],
    [
      {
        range: new monacoGlobal.Range(1, 1, 1, 1),
        options: { isWholeLine: true, className: 'myLineHighlight' }
      }
    ]
  )
  editor.onDidDispose(() => editor.deltaDecorations(deco, []))
}

/**
 * 通过文件扩展名推断 Monaco 语言
 */
const languageMap = {
  js: 'javascript',
  ts: 'typescript',
  vue: 'javascript',
  java: 'java',
  go: 'go',
  py: 'python',
  rb: 'ruby',
  c: 'c',
  h: 'c',
  glsl: 'c',
  cpp: 'cpp',
  html: 'html',
  css: 'css',
  json: 'json',
  xml: 'xml',
  sh: 'shell',
  php: 'php',
  sql: 'sql',
  md: 'markdown',
  yaml: 'yaml',
  yml: 'yaml',
  jsx: 'javascript',
  tsx: 'typescript'
}

// 设置编辑器快捷键
function setupEditorShortcuts(editor) {
  if (!editor || !monacoGlobal) return

  // Ctrl/Cmd + S: 保存文件
  editor.addCommand(monacoGlobal.KeyMod.CtrlCmd | monacoGlobal.KeyCode.KeyS, () => {
    saveCurrentFile()
  })

  // Ctrl/Cmd + Z: 撤销
  editor.addCommand(monacoGlobal.KeyMod.CtrlCmd | monacoGlobal.KeyCode.KeyZ, () => {
    if (!editor.hasTextFocus()) return
    editor.trigger('keyboard', 'undo', null)
  })

  // Ctrl/Cmd + Y 或 Ctrl/Cmd + Shift + Z: 重做
  editor.addCommand(monacoGlobal.KeyMod.CtrlCmd | monacoGlobal.KeyCode.KeyY, () => {
    if (!editor.hasTextFocus()) return
    editor.trigger('keyboard', 'redo', null)
  })

  editor.addCommand(
    monacoGlobal.KeyMod.CtrlCmd | monacoGlobal.KeyMod.Shift | monacoGlobal.KeyCode.KeyZ,
    () => {
      if (!editor.hasTextFocus()) return
      editor.trigger('keyboard', 'redo', null)
    }
  )

  // Ctrl/Cmd + A: 全选
  editor.addCommand(monacoGlobal.KeyMod.CtrlCmd | monacoGlobal.KeyCode.KeyA, () => {
    if (!editor.hasTextFocus()) return
    editor.trigger('keyboard', 'editor.action.selectAll', null)
  })

  // Ctrl/Cmd + F: 查找
  editor.addCommand(monacoGlobal.KeyMod.CtrlCmd | monacoGlobal.KeyCode.KeyF, () => {
    editor.trigger('keyboard', 'actions.find', null)
  })

  // Ctrl/Cmd + H: 替换
  editor.addCommand(monacoGlobal.KeyMod.CtrlCmd | monacoGlobal.KeyCode.KeyH, () => {
    editor.trigger('keyboard', 'editor.action.startFindReplaceAction', null)
  })

  // Ctrl/Cmd + D: 复制当前行
  editor.addCommand(monacoGlobal.KeyMod.CtrlCmd | monacoGlobal.KeyCode.KeyD, () => {
    editor.trigger('keyboard', 'editor.action.copyLinesDownAction', null)
  })

  // Alt + Shift + 上箭头: 向上复制行
  editor.addCommand(
    monacoGlobal.KeyMod.Alt | monacoGlobal.KeyMod.Shift | monacoGlobal.KeyCode.UpArrow,
    () => {
      editor.trigger('keyboard', 'editor.action.copyLinesUpAction', null)
    }
  )

  // Alt + Shift + 下箭头: 向下复制行
  editor.addCommand(
    monacoGlobal.KeyMod.Alt | monacoGlobal.KeyMod.Shift | monacoGlobal.KeyCode.DownArrow,
    () => {
      editor.trigger('keyboard', 'editor.action.copyLinesDownAction', null)
    }
  )

  console.log('编辑器快捷键设置完成')
}

// 保存当前文件
async function saveCurrentFile() {
  if (fileEditLocked.value || !selectedFileName.value || !fileContent.value) {
    store.dispatch('snackbar/showSnackbar', {
      message: '无法保存：文件处于只读模式或没有内容',
      color: 'warning'
    })
    return
  }

  try {
    isAutoSaving.value = true
    const currentFilePath = currentTab.value?.path || selectedFileName.value

    // 保存文件到磁盘
    await window.electron.saveFile(currentFilePath, fileContent.value, { encoding: 'utf-8' })

    // 保存到历史记录
    await saveToHistory(currentFilePath, fileContent.value, '手动保存')

    hasUnsavedChanges.value = false

    store.dispatch('snackbar/showSnackbar', {
      message: `文件已保存: ${window.electron.path.basename(currentFilePath)}`,
      color: 'success'
    })
  } catch (error) {
    console.error('保存文件失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: `保存失败：${error.message}`,
      color: 'error'
    })
  } finally {
    isAutoSaving.value = false
  }
}

// 根据文件扩展名获取语言类型
function getFileLanguage(filename) {
  if (!filename) return 'plaintext'

  const ext = window.electron.path.extname(filename).slice(1).toLowerCase()

  return languageMap[ext] || 'shell'
}

// 可选的亮色主题列表
const lightThemes = [
  { title: 'GitHub', value: 'github' },
  { title: 'Mono Blue', value: 'mono-blue' },
  { title: 'Docco', value: 'docco' },
  { title: 'Atom One Light', value: 'atom-one-light' },
  { title: 'VS', value: 'vs' },
  { title: 'Solarized Light', value: 'solarized-light' }
]

// 可选的暗色主题列表
const darkThemes = [
  { title: 'Gradient Dark', value: 'gradient-dark' },
  { title: 'Atom One Dark', value: 'atom-one-dark' },
  { title: 'Dracula', value: 'dracula' },
  { title: 'Monokai', value: 'monokai' },
  { title: 'Nord', value: 'nord' },
  { title: 'Tokyo Night Dark', value: 'tokyo-night-dark' }
]

// 默认主题设置
const darkHighlightTheme = 'gradient-dark' // 暗色主题默认值
const lightHighlightTheme = 'mono-blue' // 亮色主题默认值

// 用户自定义主题（从localStorage读取）

// 监听主题变化并加载对应的高亮样式
const loadHighlightTheme = (themeName) => {
  // 移除之前加载的样式
  const prevStyle = document.getElementById('highlight-theme-style')
  if (prevStyle) {
    console.log(`[FileBrowser] 已移除之前的高亮主题样式: ${prevStyle.href}`)
    prevStyle.remove()
  }

  // 创建并加载新样式
  const link = document.createElement('link')
  link.id = 'highlight-theme-style'
  link.rel = 'stylesheet'
  // 使用 public 目录下的主题样式
  link.href = `/hljs/${themeName}.css`
  document.head.appendChild(link)

  highlightTheme.value = themeName
  console.log(`[FileBrowser] 已加载高亮主题: ${themeName}`)

  // 强制重新渲染代码高亮
  nextTick(() => {
    if (fileContent.value && isCodeFile.value) {
      // 强制重新渲染代码高亮
      const tempContent = fileContent.value
      fileContent.value = ''
      nextTick(() => {
        fileContent.value = tempContent
        // 重新应用语法高亮
        setTimeout(() => {
          const codeBlocks = document.querySelectorAll('pre code')
          codeBlocks.forEach((block) => {
            hljs.highlightElement(block)
          })
        }, 100)
      })
    }
  })
}

// 检测当前主题
const checkTheme = () => {
  // 优先检测系统主题偏好
  const systemPrefersDark =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches

  // 检查 Vuetify 主题状态（如果存在）
  const vuetifyDark =
    document.body.classList.contains('v-theme--dark') ||
    document.documentElement.classList.contains('v-theme--dark')

  // 综合判断当前主题（优先系统设置，其次Vuetify状态）
  const isDark = systemPrefersDark || vuetifyDark
  isDarkTheme.value = isDark
  console.log(
    '[FileBrowser] 当前主题:',
    isDark ? '暗色' : '亮色',
    '(系统偏好:',
    systemPrefersDark,
    ', Vuetify:',
    vuetifyDark,
    ')'
  )

  // 根据主题加载对应的高亮样式
  const themeToUse = isDark
    ? localStorage.getItem('userDarkTheme') || darkHighlightTheme
    : localStorage.getItem('userLightTheme') || lightHighlightTheme

  loadHighlightTheme(themeToUse)

  // 更新各种输入框和选择器样式
  nextTick(() => {
    // 更新搜索框样式
    const searchInputs = document.querySelectorAll('.custom-search-input, .quick-find-input')
    searchInputs.forEach((input) => {
      if (isDark) {
        input.style.background = '#1e1e1e'
        input.style.color = '#e2e8f0'
        input.style.border = '1px solid #4a5568'
      } else {
        input.style.background = 'white'
        input.style.color = 'inherit'
        input.style.border = '1px solid #d1d5db'
      }
    })

    // 更新Ant Design选择器样式
    const antSelectors = document.querySelectorAll('.ant-select-selector')
    antSelectors.forEach((selector) => {
      if (isDark) {
        selector.style.background = '#1e1e1e !important'
        selector.style.borderColor = '#4a5568 !important'
        selector.style.color = '#e2e8f0 !important'
      } else {
        selector.style.background = 'white !important'
        selector.style.borderColor = '#d1d5db !important'
        selector.style.color = 'inherit !important'
      }
    })

    // 更新Ant Design下拉框样式
    const antDropdowns = document.querySelectorAll('.ant-select-dropdown')
    antDropdowns.forEach((dropdown) => {
      if (isDark) {
        dropdown.style.background = '#1e1e1e !important'
        dropdown.style.borderColor = '#4a5568 !important'
      } else {
        dropdown.style.background = 'white !important'
        dropdown.style.borderColor = '#d1d5db !important'
      }
    })

    // 更新Ant Design选项样式
    const antOptions = document.querySelectorAll('.ant-select-item')
    antOptions.forEach((option) => {
      if (isDark) {
        option.style.color = '#e2e8f0 !important'
        option.style.background = 'transparent !important'
      } else {
        option.style.color = 'inherit !important'
        option.style.background = 'transparent !important'
      }
    })
  })
}

// 设置主题变化的监听器
const setupThemeObserver = () => {
  // 使用 MutationObserver 监听 body 类变化
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        checkTheme()
      }
    })
  })

  observer.observe(document.body, { attributes: true })

  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleSystemThemeChange = (e) => {
    console.log('[FileBrowser] 系统主题变化:', e.matches ? '暗色' : '亮色')
    checkTheme()
  }

  // 添加系统主题变化监听器
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleSystemThemeChange)
  } else {
    // 兼容旧版浏览器
    mediaQuery.addListener(handleSystemThemeChange)
  }

  // 初始检查主题
  checkTheme()

  return { observer, mediaQuery, handleSystemThemeChange }
}

// 主题观察器实例
let themeObservers = null

// 组件挂载时初始化主题观察器
onMounted(() => {
  // 初始化主题观察器
  themeObservers = setupThemeObserver()
  console.log('[FileBrowser] 主题观察器已初始化')

  // 修复点3：如果没有用户偏好，则跟随系统/Vuetify 的暗/亮模式作为初始 Monaco 主题
  const saved = localStorage.getItem('fileBrowser.highlightDark')
  if (saved === null) {
    highlightThemeDark.value = isDarkTheme.value
    currentTheme.value = highlightThemeDark.value ? 'vs-dark' : 'vs-light'
    if (monacoInstance) {
      monacoInstance.updateOptions({ theme: currentTheme.value })
    }
  }
})

// 组件卸载时清理主题观察器
onUnmounted(() => {
  if (themeObservers) {
    // 清理DOM变化观察器
    if (themeObservers.observer) {
      themeObservers.observer.disconnect()
    }

    // 清理系统主题变化监听器
    if (themeObservers.mediaQuery && themeObservers.handleSystemThemeChange) {
      if (themeObservers.mediaQuery.removeEventListener) {
        themeObservers.mediaQuery.removeEventListener(
          'change',
          themeObservers.handleSystemThemeChange
        )
      } else {
        // 兼容旧版浏览器
        themeObservers.mediaQuery.removeListener(themeObservers.handleSystemThemeChange)
      }
    }

    themeObservers = null
    console.log('[FileBrowser] 主题观察器已清理')
  }
})

// 定义 props（支持传入本地路径及一些控制参数）
const props = defineProps({
  localPath: {
    type: String,
    default: ''
  },
  forceReplace: {
    type: String,
    default: 'false'
  },
  forceDeep: {
    type: Boolean,
    default: false
  },
  rootPath: {
    type: String,
    default: ''
  }
})

// 响应式数据
const progressDialog = ref(false)
const progress = ref(0)
const progressTitle = ref('')
const progressMessage = ref('')
let progressTimer = null

// —— 索引进度（SpaceLens 同款）——
const indexProgressVisible = ref(false)
const indexProgressData = ref({
  progress: 0,
  totalFiles: 0,
  scannedFiles: 0,
  currentFile: '',
  remainingFiles: 0,
  totalFunctions: 0,
  estimatedTime: ''
})
let indexProgressTimer = null
const pendingReportAction = ref(null)

// —— 报告/流程图弹窗（SpaceLens 同款）——
const analysisReportDrawerVisible = ref(false)
const modalRepoID = ref('')
const modalTargetPath = ref('')
const modalScopeText = ref('')
const wholeCode = ref(false)
const apiType = ref('')
const count = ref(0)
// 轻量权重配置传递（沿用 SpaceLens 默认值）
const weightConfig = ref({ alpha: 0.2, beta: 0.2, gamma: 0.1, delta: 0.5 })

// 控制是否处于加载状态
const loading = ref(true)
const treeRef = ref(null) // Reference to the el-tree-v2 component
const searchQuery = ref('') // Search query for filtering the tree
const filteredTreeData = ref([]) // Filtered tree data based on search
const searchConfig = ref({
  maxResults: 100, // 最大搜索结果数量
  maxDepth: 5, // 最大搜索深度
  isSearching: false, // 是否正在搜索
  searchProgress: 0 // 搜索进度
})
const treeKey = ref(0) // 用于强制重新渲染树组件
const tabs = ref([])
const activeTab = ref(null)
const breadcrumbs = ref([])
const currentTab = ref(null)
const fileContent = ref('')
const selectedFileName = ref('')
const renderedDocx = ref('')
const renderedXlsx = ref('')
const selectedFileUrl = ref('')
const newRootPath = ref('')
const pathSuggestions = ref([])
const openNodes = ref([])
// 初始化时目录树为空，不自动加载根目录
const treeData = ref([])
const codeIndex = ref(null)
const hoveredFunction = ref(null)
// 代码结构搜索
const codeStructureSearch = ref('')
// AI 描述相关
const currentFileAiDescription = ref('')
const aiDescriptionCache = ref(new Map()) // 缓存 AI 描述，避免重复请求
const aiDescriptionDebounceTimer = ref(null) // 防抖定时器
const aiDescriptionExpanded = ref(false) // AI 描述是否展开
const aiDescriptionMaxLength = 200 // AI 描述最大字符长度
const aiDescriptionRef = ref(null) // AI 描述元素的引用
// 目录树悬停提示相关
const hoverTooltip = ref({
  show: false,
  content: '',
  x: 0,
  y: 0,
  loading: false
})
const hoverDebounceTimer = ref(null) // 悬停防抖定时器
// 快速查找代码
const quickFindText = ref('')
const findResults = ref([])
const findCurrentIndex = ref(-1)

// 函数详情气泡浮窗
const functionTooltip = ref({
  show: false,
  x: 0,
  y: 0,
  loading: false,
  data: null,
  functionName: '',
  packageName: ''
})

// 文件操作对话框状态
const newFileDialog = ref(false)
const newFileName = ref('')
const newFolderDialog = ref(false)
const newFolderName = ref('')
const renameDialog = ref(false)
const renameValue = ref('')
const renameTargetPath = ref('')

// 右键菜单状态
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  items: [],
  target: null,
  targetType: null // 'tab' | 'file' | 'folder'
})

// 剪贴板状态
const clipboard = ref({
  type: null, // 'copy' | 'cut'
  path: null
})

// 侧边栏显示状态
const showLeftPanel = ref(true)
const showRightPanel = ref(true)

// 面板宽度与拖拽状态
const leftPanelWidth = ref(parseInt(localStorage.getItem('fileBrowser.leftWidth') || '280', 10))
const rightPanelWidth = ref(parseInt(localStorage.getItem('fileBrowser.rightWidth') || '320', 10))
const resizing = ref(null) // 'left' | 'right' | null
let startX = 0
let startLeftWidth = 0
let startRightWidth = 0

function startResizing(side, e) {
  resizing.value = side
  startX = e.clientX
  startLeftWidth = leftPanelWidth.value
  startRightWidth = rightPanelWidth.value
  document.body.classList.add('resizing')
  window.addEventListener('mousemove', onResizing)
  window.addEventListener('mouseup', stopResizing)
  e.preventDefault()
}

function onResizing(e) {
  if (!resizing.value) return
  const dx = e.clientX - startX
  if (resizing.value === 'left') {
    let next = startLeftWidth + dx
    next = Math.max(180, Math.min(next, Math.floor(window.innerWidth * 0.6)))
    leftPanelWidth.value = next
  } else if (resizing.value === 'right') {
    let next = startRightWidth - dx
    next = Math.max(220, Math.min(next, 600))
    rightPanelWidth.value = next
  }
}

function stopResizing() {
  if (!resizing.value) return
  window.removeEventListener('mousemove', onResizing)
  window.removeEventListener('mouseup', stopResizing)
  document.body.classList.remove('resizing')
  localStorage.setItem('fileBrowser.leftWidth', String(leftPanelWidth.value))
  localStorage.setItem('fileBrowser.rightWidth', String(rightPanelWidth.value))
  resizing.value = null
}

// 右键菜单图标定义
const menuIcons = {
  open: {
    viewBox: '0 0 24 24',
    path: 'M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z'
  },
  folder: {
    viewBox: '0 0 24 24',
    path: 'M19,20H4C2.89,20 2,19.1 2,18V6C2,4.89 2.89,4 4,4H10L12,6H19A2,2 0 0,1 21,8H21L4,8V18L6.14,10H23.21L20.93,18.5C20.7,19.37 19.92,20 19,20Z'
  },
  copy: {
    viewBox: '0 0 24 24',
    path: 'M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z'
  },
  cut: {
    viewBox: '0 0 24 24',
    path: 'M9.64,7.64C10.37,6.91 10.37,5.73 9.64,5C8.91,4.27 7.73,4.27 7,5C6.27,5.73 6.27,6.91 7,7.64C7.73,8.37 8.91,8.37 9.64,7.64M21.64,2.64L10.5,13.78L9.64,12.92L20.78,1.78L21.64,2.64M12.92,9.64L14.5,11.22L2.64,23.08L1.78,22.22L12.92,9.64M17,14C17.73,14.27 18.27,14.73 18.64,15.36C19,16 19,16.73 18.64,17.36C18.27,18 17.73,18.45 17,18.73C16.27,19 15.45,19 14.73,18.73C14,18.45 13.55,18 13.27,17.36C13,16.73 13,16 13.27,15.36C13.55,14.73 14,14.27 14.73,14C15.45,13.73 16.27,13.73 17,14Z'
  },
  paste: {
    viewBox: '0 0 24 24',
    path: 'M19,20H5V4H7V7H17V4H19M12,2A1,1 0 0,1 13,3A1,1 0 0,1 12,4A1,1 0 0,1 11,3A1,1 0 0,1 12,2M19,2H14.82C14.4,0.84 13.3,0 12,0C10.7,0 9.6,0.84 9.18,2H5A2,2 0 0,0 3,4V20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V4A2,2 0 0,0 19,2Z'
  },
  newFile: {
    viewBox: '0 0 24 24',
    path: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z'
  },
  newFolder: {
    viewBox: '0 0 24 24',
    path: 'M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4M15,9V12H18V14H15V17H13V14H10V12H13V9H15Z'
  },
  copyPath: {
    viewBox: '0 0 24 24',
    path: 'M10.59,13.41C11,13.8 11,14.4 10.59,14.81C10.2,15.2 9.6,15.2 9.19,14.81L7.05,12.67C6.64,12.26 6.64,11.65 7.05,11.24L9.19,9.1C9.6,8.69 10.2,8.69 10.59,9.1C11,9.5 11,10.1 10.59,10.51L9.67,11.43H14.32L13.4,10.51C13,10.1 13,9.5 13.4,9.1C13.8,8.69 14.4,8.69 14.81,9.1L16.95,11.24C17.35,11.65 17.35,12.26 16.95,12.67L14.81,14.81C14.4,15.2 13.8,15.2 13.4,14.81C13,14.4 13,13.8 13.4,13.41L14.32,12.49H9.67L10.59,13.41M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z'
  },
  delete: {
    viewBox: '0 0 24 24',
    path: 'M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z'
  },
  refresh: {
    viewBox: '0 0 24 24',
    path: 'M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z'
  },
  rename: {
    viewBox: '0 0 24 24',
    path: 'M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z'
  },
  expand: {
    viewBox: '0 0 24 24',
    path: 'M16.59,8.59L12,13.17L7.41,8.59L6,10L12,16L18,10L16.59,8.59Z'
  },
  collapse: {
    viewBox: '0 0 24 24',
    path: 'M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z'
  },
  stats: {
    viewBox: '0 0 24 24',
    path: 'M22,21H2V3H4V19H6V17H10V19H12V16H16V19H18V17H22V21Z'
  }
}

// allowedExtensions 常量已删除，现在使用 checkIfTextFile 函数进行智能文件类型检测

// checkIfTextFile 函数：内容优先+mime兜底智能检测文本文件
async function checkIfTextFile(filePath) {
  try {
    // 目录直接返回 false
    try {
      const stats = await window.electron.getFileStats(filePath)
      if (stats && stats.isDirectory) return false
    } catch (error) {
      console.warn('获取文件状态失败:', error)
    }
    const isText = await window.electron.isText(filePath)
    console.log('isText', isText)
    return isText
  } catch (error) {
    console.error('检查文件类型失败:', error)
    return false
  }
}
const allowedFileName = [
  'Dockerfile',
  'README.md',
  'LICENSE',
  'CONTRIBUTING.md',
  'AUTHORS',
  'CHANGELOG.md',
  'HISTORY.md',
  'TODO.md',
  'FAQ.md',
  'README',
  'LICENSE',
  'CONTRIBUTING',
  'AUTHORS',
  'CHANGELOG',
  'HISTORY',
  'TODO',
  'FAQ'
]
const blacklistedExtensions = [
  '.zip',
  '.rar',
  '.7z',
  '.dmg',
  '.exe',
  '.tar',
  '.gz',
  '.iso',
  '.apk',
  '.jpg',
  '.png',
  '.gif',
  '.mp4',
  '.mp3',
  '.mpeg',
  '.mpg',
  '.avi',
  '.wmv',
  '.mov',
  '.flv',
  '.mkv',
  '.webm',
  '.ogg',
  '.ogv',
  '.ogm',
  '.ogx'
]
// Markdown 渲染器
const md = new MarkdownIt({
  linkify: true,
  // 代码高亮处理
  highlight: (str, lang) => {
    try {
      // 确保在高亮前已加载正确的主题样式
      nextTick(() => {
        // 如果当前没有加载主题，则检查并加载
        if (!document.getElementById('highlight-theme-style')) {
          checkTheme()
        }
      })

      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(str, { language: lang }).value
      } else {
        return hljs.highlightAuto(str).value
      }
    } catch (e) {
      console.error('代码高亮错误:', e)
      return str
    }
  }
}).use(function (md) {
  // 自定义链接渲染器，使所有链接在新窗口中打开
  const defaultRender =
    md.renderer.rules.link_open ||
    function (tokens, idx, options, env, renderer) {
      return renderer.renderToken(tokens, idx, options)
    }

  md.renderer.rules.link_open = function (tokens, idx, options, env, renderer) {
    const token = tokens[idx]
    const hrefIndex = token.attrIndex('href')

    if (hrefIndex >= 0) {
      // 添加 target="_blank" 和 rel="noopener noreferrer" 属性
      token.attrPush(['target', '_blank'])
      token.attrPush(['rel', 'noopener noreferrer'])
    }

    return defaultRender(tokens, idx, options, env, renderer)
  }

  // 自定义图片渲染器，处理本地图片路径
  const defaultImageRender =
    md.renderer.rules.image ||
    function (tokens, idx, options, env, renderer) {
      return renderer.renderToken(tokens, idx, options)
    }

  md.renderer.rules.image = function (tokens, idx, options, env, renderer) {
    const token = tokens[idx]
    const srcIndex = token.attrIndex('src')

    if (srcIndex >= 0) {
      const src = token.attrs[srcIndex][1]

      // 检查是否为本地路径（不是http/https/data协议）
      if (src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('//')) {
        // 使用占位符图片，避免CSP问题
        token.attrs[srcIndex][1] =
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y2ZjhmYSIgc3Ryb2tlPSIjZDFkOWUwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1kYXNoYXJyYXk9IjUsMTAiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzY1NmQ3NiIgZGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWKoOi9veS4rS4uLjwvdGV4dD48L3N2Zz4='
        token.attrPush(['data-original-src', src])
        token.attrPush(['class', 'local-image-placeholder'])
        token.attrPush(['alt', '正在加载本地图片...'])
      }
    }

    return defaultImageRender(tokens, idx, options, env, renderer)
  }
})

// 计算属性：是否为代码文件（非 Markdown）
const isCodeFile = ref(false)

// 更新isCodeFile状态的函数
async function updateIsCodeFile() {
  if (!selectedFileName.value) {
    isCodeFile.value = false
    return
  }
  // 1. 先尝试在 treeData 中查找对应的节点，获取完整路径
  let absPath = ''
  if (treeData.value && typeof findNodeByPath === 'function') {
    // 遍历 treeData，找到 name 匹配的节点
    const stack = Array.isArray(treeData.value) ? [...treeData.value] : [treeData.value]
    while (stack.length) {
      const node = stack.pop()
      if (node && node.name === selectedFileName.value) {
        absPath = node.path || node.fullPath || ''
        break
      }
      if (node && node.children && Array.isArray(node.children)) {
        stack.push(...node.children)
      }
    }
  }
  // 2. 如果 treeData 没查到，则拼接 newRootPath
  if (!absPath && newRootPath.value) {
    absPath = window.electron.path.resolve(newRootPath.value, selectedFileName.value)
  }
  const fileName = window.electron.path.basename(absPath || selectedFileName.value)
  console.log('[FileBrowser] selectedFileName:', selectedFileName.value, '完整路径:', absPath)
  const isTextFile = await checkIfTextFile(absPath)
  isCodeFile.value = (isTextFile || allowedFileName.includes(fileName)) && !isMarkdown(absPath)
}

// 以下为各个辅助方法，均使用 Composition API 写法

// 处理链接点击（支持 Electron 调用）
function handleLinkClick(event) {
  let target = event.target
  while (target && target !== event.currentTarget) {
    if (target.tagName === 'A') {
      event.preventDefault()
      const url = target.getAttribute('href')
      if (window.electron && typeof window.electron.openNewWindow === 'function') {
        window.electron.openNewWindow(url)
      } else {
        window.open(url, '_blank')
      }
      break
    }
    target = target.parentNode
  }
}

async function initializePage() {
  loading.value = true
  try {
    await initialize(props.localPath)
  } catch (e) {
    console.error('初始化过程出错：', e)
  } finally {
    loading.value = false
  }
}

async function initialize(initialPath) {
  let rootDir = ''
  // 对URL编码的路径进行解码
  const decodedInitialPath = initialPath ? decodeURIComponent(initialPath) : initialPath
  const decodedRootPath = props.rootPath ? decodeURIComponent(props.rootPath) : props.rootPath
  console.log('[FileBrowser] decodedInitialPath:', decodedInitialPath)
  console.log('[FileBrowser] decodedRootPath:', decodedRootPath)

  // 处理根路径的逻辑
  if (decodedRootPath) {
    // 如果提供了rootPath，取其上一层目录作为根路径
    rootDir = window.electron.path.dirname(decodedRootPath)
    console.log('[FileBrowser] 使用rootPath构建根路径:', rootDir)
    newRootPath.value = rootDir
  } else if (decodedInitialPath) {
    const ext = window.electron.path.extname(decodedInitialPath)
    const isFile = !!ext && ext !== ''
    rootDir = isFile ? window.electron.path.dirname(decodedInitialPath) : decodedInitialPath
    console.log('[FileBrowser] 使用initialPath构建根路径:', rootDir)
    newRootPath.value = rootDir
  }

  // 如果有有效的根目录，加载目录树
  if (rootDir) {
    fileContent.value = ''
    await resetTree(rootDir)
    if (initialPath) {
      console.log('有initialPath，展开到该路径:', initialPath)
      // 使用 window.electron.path.extname 判断是否为文件
      const ext = window.electron.path.extname(initialPath)
      const isFile = !!ext && ext !== ''

      if (isFile) {
        console.log('是文件，加载文件内容')
        await loadFileByType(initialPath)
        const breadcrumbPath = buildBreadcrumb(initialPath)
        addOrSwitchTab({
          path: initialPath,
          name: window.electron.path.basename(initialPath),
          breadcrumbs: breadcrumbPath
        })
      } else {
        console.log('不是文件，选择该路径')
        handleNodeSelection([initialPath])
      }
    } else {
      console.log('没有initialPath，选择根路径')
      handleNodeSelection([rootDir])
    }
  }

  resetRoot()
}

function resetRoot() {
  if (!newRootPath.value) return
  loadPathSuggestions()
  resetTree(newRootPath.value).then(() => {
    handleNodeSelection([newRootPath.value])
    tabs.value = []
    breadcrumbs.value = []
  })
}

// 处理路径选择变更，只在用户实际选择或清除路径时触发重置
function onPathSelectionChanged(newPath) {
  console.log('[FileBrowser] 路径选择变更：', newPath)
  // 如果用户选择了路径（新路径或者已有路径）
  if (newPath !== null && newPath !== undefined && newPath !== '') {
    // 更新标签页标题：代码视窗·{repo.name}
    try {
      const matched = pathSuggestions.value.find((i) => i.value === newPath)
      if (matched) {
        store.dispatch('tabs/setActiveTabTitle', `代码视窗·${matched.name || matched.title}`)
        // 使用正确的事件方式更新标签页标题
        const title = `代码视窗·${matched.name || matched.title}`
        window.dispatchEvent(
          new CustomEvent('tabs:set-title', {
            detail: { title }
          })
        )
      }
    } catch {
      // 忽略错误
    }
    // 更新目录树
    resetTree(newPath).then(() => {
      handleNodeSelection([newPath])
      tabs.value = []
      breadcrumbs.value = []
    })
    // 清空文件内容和预览区域，防止切换目录时残留上次的内容
    fileContent.value = ''
    renderedDocx.value = ''
    renderedXlsx.value = ''
    selectedFileUrl.value = ''
    selectedFileName.value = ''
    updateIsCodeFile() // 更新代码文件状态
  } else {
    // 用户清除了路径选择（包括 undefined/null/空字符串）
    tabs.value = []
    breadcrumbs.value = []
    fileContent.value = ''
    treeData.value = []
    renderedDocx.value = ''
    renderedXlsx.value = ''
    selectedFileUrl.value = ''
    selectedFileName.value = ''
    updateIsCodeFile() // 更新代码文件状态
  }
  showLeftPanel.value = true
  showRightPanel.value = true
}

function isPDF(fileName) {
  return window.electron.path.extname(fileName).toLowerCase() === '.pdf'
}
function isDocx(fileName) {
  return ['.doc', '.docx'].includes(window.electron.path.extname(fileName).toLowerCase())
}
function isXlsx(fileName) {
  return window.electron.path.extname(fileName).toLowerCase() === '.xlsx'
}
function isMarkdown(fileName) {
  const ext = window.electron.path.extname(fileName).toLowerCase()
  return ['.md', '.markdown'].includes(ext)
}
function getPDFUrl() {
  return selectedFileUrl.value
}

async function loadFileByType(selectedPath) {
  // —— 先判定是否目录 ——
  let isDir = false
  // 1. 如果树里已有这个节点，直接用它的 isDirectory
  const node = findNodeByPath(treeData.value, selectedPath)
  if (node) {
    isDir = node.isDirectory
  } else {
    // 2. 否则尝试用 readDirectory，如果能读通就是目录
    try {
      await window.electron.readDirectory(selectedPath)
      isDir = true
    } catch {
      isDir = false
    }
  }
  if (isDir) {
    console.log(`跳过目录读取：${selectedPath}`)
    return
  }

  // 早于任何读取操作新增：
  const extLower = window.electron.path.extname(selectedPath).toLowerCase()
  if (blacklistedExtensions.includes(extLower)) {
    store.dispatch('snackbar/showSnackbar', {
      message: `暂不支持在线预览 " ${extLower} " 文件`,
      type: 'warning'
    })
    return // ⛔ 直接跳过，绝不 readFile
  }

  // —— 真正开始按类型读取文件 ——
  try {
    if (isPDF(selectedPath)) {
      const buffer = await window.electron.readFile(selectedPath)
      const blob = new Blob([buffer], { type: 'application/pdf' })
      updateFileState(selectedPath, { selectedFileUrl: URL.createObjectURL(blob) })
    } else if (isDocx(selectedPath)) {
      const buffer = await window.electron.readFile(selectedPath)
      const arrayBuffer = convertBuffer(buffer)
      updateFileState(selectedPath, { renderedDocx: await renderDocx(arrayBuffer) })
    } else if (isXlsx(selectedPath)) {
      const buffer = await window.electron.readFile(selectedPath)
      const arrayBuffer = convertBuffer(buffer)
      updateFileState(selectedPath, { renderedXlsx: renderXlsx(arrayBuffer) })
    } else {
      // 判断文件大小，超过10MB则懒加载
      try {
        const stat = await window.electron.stat(selectedPath)
        const maxSize = 10 * 1024 * 1024
        if (stat.size > maxSize) {
          // 懒加载逻辑：先加载前100000行
          const stream = await window.electron.createReadStream(selectedPath, { encoding: 'utf-8' })
          let content = ''
          const maxLines = 100000
          for await (const chunk of stream) {
            content += chunk
            let lines = content.split(/\r?\n/)
            if (lines.length >= maxLines) {
              content = lines.slice(0, maxLines).join('\n') + '\n...\n(文件过大，仅显示前100000行)'
              break
            }
          }
          updateFileState(selectedPath, {
            fileContent: content,
            isLargeFile: true,
            loadedLines: maxLines,
            totalSize: stat.size
          })
        } else {
          const content = await window.electron.readFile(selectedPath, { encoding: 'utf-8' })
          updateFileState(selectedPath, { fileContent: content, isLargeFile: false })
        }
      } catch (err) {
        updateFileState(selectedPath, { fileContent: `读取文件失败：${err.message}` })
      }
    }
  } catch (err) {
    console.error('加载文件失败：', err)
    updateFileState(selectedPath, { fileContent: `读取文件失败：${err.message}` })
  }
}

function updateFileState(selectedPath, updates) {
  selectedFileName.value = window.electron.path.basename(selectedPath)
  updateIsCodeFile() // 更新代码文件状态
  Object.keys(updates).forEach((key) => {
    if (key === 'fileContent') {
      fileContent.value = updates[key]
    } else if (key === 'renderedDocx') {
      renderedDocx.value = updates[key]
    } else if (key === 'renderedXlsx') {
      renderedXlsx.value = updates[key]
    } else if (key === 'selectedFileUrl') {
      selectedFileUrl.value = updates[key]
    }
  })

  // 加载代码索引（异步执行，不阻塞界面）
  nextTick(() => {
    if (isCodeFile.value && selectedPath) {
      loadCodeIndex(selectedPath)
      // 同时加载 AI 描述
      debouncedLoadFileAiDescription(selectedPath)
    } else {
      codeIndex.value = null
      currentFileAiDescription.value = ''
    }
  })
}

function restoreState(tab) {
  selectedFileName.value = tab.selectedFileName || window.electron.path.basename(tab.path)
  updateIsCodeFile() // 更新代码文件状态
  fileContent.value = tab.fileContent || ''
  renderedDocx.value = tab.renderedDocx || ''
  renderedXlsx.value = tab.renderedXlsx || ''
  selectedFileUrl.value = tab.selectedFileUrl || ''
  breadcrumbs.value = tab.breadcrumbs || []

  // 如果是代码文件，加载代码索引和 AI 描述
  if (isCodeFile.value && tab.path) {
    loadCodeIndex(tab.path)
    debouncedLoadFileAiDescription(tab.path)
  }
}

function addOrSwitchTab(tabData) {
  let tab = tabs.value.find((t) => t.path === tabData.path)
  if (!tab) {
    tab = {
      fileContent: fileContent.value,
      renderedDocx: renderedDocx.value,
      renderedXlsx: renderedXlsx.value,
      selectedFileUrl: selectedFileUrl.value,
      selectedFileName: selectedFileName.value,
      ...tabData
    }
    tabs.value.push(tab)
  }
  activeTab.value = tabs.value.indexOf(tab)
  currentTab.value = tabs.value[activeTab.value]
  breadcrumbs.value = currentTab.value.breadcrumbs
}

// 处理文件节点选择
async function handleNodeSelection(filePath) {
  const node = findNodeByPath(treeData.value, filePath)
  if (!node) return

  // 只允许打开指定后缀的文件
  const fileName = window.electron.path.basename(node.name)
  const isTextFile = await checkIfTextFile(node.path)
  if (!isTextFile && !allowedFileName.includes(fileName)) {
    store.dispatch('snackbar/showSnackbar', {
      message: '该文件类型不支持预览',
      type: 'warning'
    })
    return
  }
  await loadFileByType(node.path)
  const breadcrumbPath = buildBreadcrumb(node.path)
  addOrSwitchTab({
    path: node.path,
    name: node.name,
    breadcrumbs: breadcrumbPath
  })

  // 如果是代码文件，加载代码索引和 AI 描述
  if (isCodeFile.value && node.path) {
    loadCodeIndex(node.path)
    debouncedLoadFileAiDescription(node.path)
  }
}

// 递归搜索文件和文件夹
// eslint-disable-next-line no-unused-vars
async function searchFileAndFolders(dir, query, maxDepth = 100, currentDepth = 0) {
  let results = []
  if (currentDepth > maxDepth) return results
  try {
    const children = await window.electron.readDirectory(dir)
    for (const child of children) {
      if (child.name.startsWith('.')) continue // 跳过隐藏文件夹
      const fullPath = child.fullPath || child.path || dir + '/' + child.name
      if (child.name.toLowerCase().includes(query.toLowerCase())) {
        results.push({
          path: fullPath,
          name: child.name,
          isDirectory: child.isDirectory
        })
      }
      if (child.isDirectory) {
        // 递归进入子目录
        const subResults = await searchFileAndFolders(fullPath, query, maxDepth, currentDepth + 1)
        results = results.concat(subResults)
      }
    }
  } catch {
    // 权限或其他错误跳过
  }
  return results
}
function findNodeByPath(nodes, targetPath) {
  for (const node of nodes) {
    if (node.path === targetPath) return node
    if (node.children) {
      const found = findNodeByPath(node.children, targetPath)
      if (found) return found
    }
  }
  return null
}

function buildBreadcrumb(fullPath) {
  const parts = fullPath.split(window.electron.path.sep).filter((p) => p)
  let currentPath = ''
  return parts.map((part, index) => {
    currentPath += (index ? window.electron.path.sep : '') + part
    return { text: part, path: currentPath }
  })
}

function navigateTo(targetPath) {
  const node = findNodeByPath(treeData.value, targetPath)
  if (node) {
    openNodes.value = [targetPath]
    nextTick(() => {
      handleNodeSelection(targetPath)
    })
  }
}

function selectTab(tab) {
  addOrSwitchTab({
    path: tab.path,
    name: tab.name,
    breadcrumbs: tab.breadcrumbs
  })
  loadFileByType(tab.path)

  // 如果是代码文件，加载代码索引和 AI 描述
  if (isCodeFile.value && tab.path) {
    loadCodeIndex(tab.path)
    debouncedLoadFileAiDescription(tab.path)
  }
}

function removeTab(index) {
  if (activeTab.value === index) {
    activeTab.value = index > 0 ? index - 1 : tabs.value.length > 1 ? 0 : null
  }
  tabs.value.splice(index, 1)
  fileContent.value = ''
}

// eslint-disable-next-line no-unused-vars
function highlightCode(code, extension) {
  const language = extension ? extension.slice(1) : ''
  const validLang = hljs.getLanguage(language) ? language : 'plaintext'
  return hljs.highlight(code, { language: validLang }).value
}

function renderMarkdown(content) {
  const rendered = md.render(content)
  // 渲染完成后处理本地图片
  nextTick(() => {
    processLocalImages()
  })
  return rendered
}

// 处理本地图片加载
async function processLocalImages() {
  try {
    // 获取当前文件所在目录
    // const path = window.electron.path
    const currentFilePath = currentTab.value?.path
    if (!currentFilePath) return

    const markdownDir = window.electron.path.dirname(currentFilePath)

    // 查找所有标记为本地图片的元素
    await nextTick()

    // 使用setTimeout确保DOM已更新
    setTimeout(async () => {
      const localImages = document.querySelectorAll(
        'img[data-original-src].local-image-placeholder'
      )

      for (const img of localImages) {
        try {
          const originalSrc = img.getAttribute('data-original-src')
          if (!originalSrc) continue

          // 解析相对路径为绝对路径
          let imagePath
          if (window.electron.path.isAbsolute(originalSrc)) {
            imagePath = originalSrc
          } else {
            imagePath = window.electron.path.resolve(markdownDir, originalSrc)
          }

          console.log('加载本地图片:', imagePath)

          // 使用readImageBlob读取图片并转换为base64
          const imageDataUrl = await window.electron.readImageBlob(imagePath)

          if (imageDataUrl) {
            img.src = imageDataUrl
            img.removeAttribute('data-original-src')
            img.classList.remove('local-image-placeholder')
            console.log('本地图片加载成功:', originalSrc)
          } else {
            // 图片加载失败，显示占位符
            img.alt = `图片加载失败: ${originalSrc}`
            img.classList.add('local-image-error')
            console.warn('本地图片加载失败:', originalSrc)
          }
        } catch (error) {
          console.error('处理本地图片时出错:', error)
          img.alt = `图片加载出错: ${img.getAttribute('data-original-src')}`
          img.classList.add('local-image-error')
        }
      }
    }, 100)
  } catch (error) {
    console.error('处理本地图片时出错:', error)
  }
}

function convertBuffer(buffer) {
  if (buffer instanceof ArrayBuffer) return buffer
  if (buffer instanceof Uint8Array) return buffer.buffer
  if (buffer && buffer.data && Array.isArray(buffer.data)) return new Uint8Array(buffer.data).buffer
  if (buffer && buffer.buffer) {
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  }
  return buffer
}

async function renderDocx(buffer) {
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
    return result.value
  } catch (error) {
    console.error('DOCX 渲染失败：', error)
    return `<p>DOCX 渲染失败：${error.message}</p>`
  }
}

function renderXlsx(buffer) {
  try {
    const data = new Uint8Array(buffer)
    const workbook = XLSX.read(data, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    return XLSX.utils.sheet_to_html(worksheet)
  } catch (error) {
    console.error('XLSX 渲染失败：', error)
    return `<p>XLSX 渲染失败：${error.message}</p>`
  }
}

async function expandToPath(targetPath) {
  const homeDir = await window.electron.homeDir
  if (!targetPath.startsWith(homeDir)) return
  const relativePath = window.electron.path.relative(homeDir, targetPath)
  const segments = relativePath.split(window.electron.path.sep)
  let currentNode = treeData.value[0]
  let openPaths = [currentNode.path]
  for (const segment of segments) {
    // 由于我们已经一次性加载了所有目录树，不再需要懒加载逻辑
    // 直接查找子节点即可
    if (!currentNode.children || currentNode.children.length === 0) {
      // 如果没有子节点，则无法继续导航
      return
    }
    const child = currentNode.children.find((child) => child.name === segment)
    if (!child) return
    openPaths.push(child.path)
    currentNode = child
  }
  openNodes.value = openPaths
  nextTick(() => {
    const targetId = 'node-' + currentNode.path.replace(/[^a-zA-Z0-9]/g, '-')
    const targetEl = document.getElementById(targetId)
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
  handleNodeSelection([currentNode.path])
}

/**
 * 自动展开目录树到指定路径
 * @param {string} targetPath - 要展开到的目标路径
 * @param {boolean} selectNode - 是否选中该节点，默认为true
 * @returns {Promise<void>}
 */
async function autoExpandPath(targetPath, selectNode = true) {
  console.log('自动展开目录树到路径:', targetPath, treeData.value)

  if (!targetPath || !treeData.value || treeData.value.length === 0) {
    console.warn('无法展开路径: 目标路径为空或目录树未加载')
    return
  }

  // 查找路径对应的节点
  const node = findNodeByPath(targetPath, treeData.value)
  if (!node) {
    console.warn('无法找到路径对应的节点:', targetPath)
    return
  }

  // 构建路径层级
  const pathSegments = []
  let currentPath = targetPath

  // 递归构建父路径数组
  while (currentPath) {
    const parentPath = window.electron.path.dirname(currentPath)
    // 如果到达根路径或者父路径与当前路径相同，则结束
    if (parentPath === currentPath) break

    pathSegments.unshift(currentPath)
    currentPath = parentPath

    // 如果到达根目录，也添加到路径中
    if (treeData.value.some((node) => node.path === parentPath)) {
      pathSegments.unshift(parentPath)
      break
    }
  }

  // 更新展开节点数组
  openNodes.value = [...new Set([...openNodes.value, ...pathSegments])]

  // 等待DOM更新后滚动到节点并选中
  nextTick(() => {
    // 尝试滚动到节点
    const targetId = 'node-' + targetPath.replace(/[^a-zA-Z0-9]/g, '-')
    const targetEl = document.getElementById(targetId)
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    // 如果需要选中节点
    if (selectNode) {
      handleNodeSelection([targetPath])
    }
  })

  return node
}

async function openOutside(breadcrumbsArray, shouldFile) {
  if ((!breadcrumbsArray || breadcrumbsArray.length === 0) && !shouldFile) {
    store.dispatch('snackbar/showSnackbar', {
      message: '请先预览一个文件',
      type: 'error'
    })
    return
  }
  let url = breadcrumbsArray[breadcrumbsArray.length - 1].path
  if (url !== null) {
    const isFile = await isFilePath(url, null, allowedFileName, findNodeByPath, treeData.value)
    // 只有在非 Windows 上才加 " / "
    const platform = await window.electron.platform
    if (platform !== 'win32') {
      url = '/' + url
    }
    const targetPath = shouldFile ? (isFile ? window.electron.path.dirname(url) : url) : url
    await window.electron
      .checkPathExists(targetPath)
      .then(async (exists) => {
        if (exists) {
          if (!shouldFile) {
            // const ext = path.extname(targetPath).toLowerCase()
            // const mapping = customAppMapping[ext]
            // if (mapping) {
            //   const platform = await window.electron.platform
            //   const appName = mapping[platform]
            //   if (appName) {
            //     try {
            //       const appPath = await getAppPath(appName)
            //       await window.electron.openPathWithApp(targetPath, appPath).then((error) => {
            //         if (error) {
            //           store.dispatch('snackbar/showSnackbar', {
            //             message: `打开文件失败: ${error}`,
            //             type: 'error'
            //           })
            //         }
            //       })
            //       return
            //     } catch (error) {
            //       console.error('未找到应用程序:', appName, error)
            //     }
            //   }
            // }
          }
          await window.electron.shell.openPath(targetPath).then((error) => {
            if (error) {
              store.dispatch('snackbar/showSnackbar', {
                message: `打开文件失败: ${error}`,
                type: 'error'
              })
            }
          })
        } else {
          store.dispatch('snackbar/showSnackbar', {
            message: `路径不存在: ${targetPath}`,
            type: 'error'
          })
        }
      })
      .catch((err) => {
        store.dispatch('snackbar/showSnackbar', {
          message: `路径验证失败: ${err.message}`,
          type: 'error'
        })
      })
  }
}

// 使用导入的 isFilePath 函数判断文件路径，需要传入必要的参数

// 已移除最大递归深度限制，一次性加载所有目录结构

// 递归获取目录树，不带深度阈值，一次性加载全部内容
async function getDirectoryTree(targetPath) {
  let root
  try {
    root = await window.electron.readDirectory(targetPath)
  } catch {
    return [] // 目录不可读
  }
  console.log('[DEBUG] getDirectoryTree 原始子项数量:', root.length, '路径:', targetPath)
  const filteredRoot = root.filter((child) => !child.name.startsWith('.'))
  console.log('[DEBUG] 过滤隐藏文件后数量:', filteredRoot.length)
  // 先分组，再递归
  const directories = filteredRoot.filter((child) => child.isDirectory)
  const files = filteredRoot.filter((child) => !child.isDirectory)
  console.log('[DEBUG] 目录数量:', directories.length, '文件数量:', files.length)
  console.log(
    '[DEBUG] 目录名称:',
    directories.map((d) => d.name)
  )

  const dirNodes = await Promise.all(
    directories.map(async (child) => {
      const children = await getDirectoryTree(child.fullPath)
      return {
        name: child.name,
        path: child.fullPath,
        isDirectory: true,
        children: children
      }
    })
  )

  const fileNodes = files.map((child) => ({
    name: child.name,
    path: child.fullPath,
    isDirectory: false,
    children: undefined
  }))

  return [...dirNodes, ...fileNodes]
}

// 重置目录树：仅在用户选定路径后调用
async function resetTree(newPath) {
  console.log('[DEBUG] resetTree 开始执行，路径:', newPath)
  const targetPath = (await isFilePath(
    newPath,
    null,
    allowedFileName,
    findNodeByPath,
    treeData.value
  ))
    ? window.electron.path.dirname(newPath)
    : newPath
  console.log('[DEBUG] 目标路径确定为:', targetPath)
  try {
    const children = await getDirectoryTree(targetPath)
    console.log('[DEBUG] 获取到子目录数量:', children?.length || 0)
    treeData.value = [
      {
        name: window.electron.path.basename(targetPath),
        path: targetPath,
        isDirectory: true,
        children: children
      }
    ]
    // 默认展开前两层目录：根目录 + 所有一级子目录
    const level1DirPaths = (children || []).filter((c) => c.isDirectory).map((c) => c.path)
    console.log('[DEBUG] 一级子目录路径:', level1DirPaths)
    openNodes.value = Array.from(new Set([targetPath, ...level1DirPaths]))
    console.log('[DEBUG] 设置展开节点:', openNodes.value)
  } catch (e) {
    console.error('路径加载失败:', e)
  }
}
async function loadPathSuggestions() {
  await listRepos()
    .then((response) => {
      if (!response.data || !Array.isArray(response.data)) {
        return
      }
      // 按id降序排序
      const sortedData = [...response.data].sort((a, b) => b.id - a.id)

      pathSuggestions.value = sortedData.map((repo) => ({
        id: repo.id,
        value: repo.local_path,
        // 如果desc为空则只显示name，否则显示desc(name)
        title: repo.desc ? `${omit(repo.desc, 40)}(${repo.name})` : repo.name,
        repo_url: repo.local_path,
        branch: repo.branch,
        local_path: repo.local_path,
        username: repo.username,
        password: repo.password,
        name: repo.name,
        desc: repo.desc
      }))
    })
    .catch((err) => {
      console.error('获取仓库数据失败:', err)
    })
}
// ---------- 仓库拉取进度条 ----------
function startProgressSimulation(title = '正在拉取代码') {
  progress.value = 0
  progressTitle.value = title
  progressMessage.value = '正在初始化…'
  progressDialog.value = true

  if (progressTimer) clearInterval(progressTimer)
  progressTimer = setInterval(() => {
    if (progress.value < 90) {
      const inc = (90 - progress.value) / 10
      progress.value += Math.max(0.5, inc)
      progressMessage.value =
        progress.value < 30 ? '准备数据…' : progress.value < 60 ? '同步文件…' : '即将完成，请稍候…'
    }
  }, 200)
}

function completeProgress(success = true) {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
  if (success) {
    progress.value = 100
    progressMessage.value = '拉取完成！'
    setTimeout(() => {
      progressDialog.value = false
      progress.value = 0
    }, 800)
  } else {
    progressDialog.value = false
    progress.value = 0
  }
}

async function pull() {
  if (!pathSuggestions.value.length) return

  // ① 启动进度模拟
  startProgressSimulation()

  // ② 真正执行 pullRepo
  try {
    var repos = pathSuggestions.value
    for (const repo of repos) {
      if (newRootPath.value === repo.value) {
        console.log('拉取仓库：', repo)
        await pullRepo(repo)
      }
    }

    // ③ 成功：收尾
    completeProgress(true)
    store.dispatch('snackbar/showSnackbar', {
      message: '代码拉取成功',
      type: 'success'
    })

    await initializePage()
  } catch (err) {
    console.error('拉取失败:', err)
    completeProgress(false)
    const errorMsg =
      err.response?.data || err.message || (newRootPath.value ? '更新仓库失败' : '新增仓库失败')
    store.dispatch('snackbar/showSnackbar', {
      message: `拉取失败：${errorMsg}`,
      type: 'error'
    })
  }
}

// 预览仓库内容，使用 Vue Router 进行跳转
// eslint-disable-next-line no-unused-vars
const previewIde = (path) => {
  if (path) {
    // 构建路由参数
    const rootDir = path

    // 构建带参数的URL
    const url = `${window.location.origin}/#/ide/${encodeURIComponent(path)}?rootPath=${encodeURIComponent(rootDir)}`

    // 调用主进程打开新窗口
    window.electron.openNewWindowIDE(url)
  } else {
    alert('请先打开一个仓库')
  }
}

// 在IDE中打开当前文件或目录

// const openInIDE = async (filePath) => {
//   // 如果没有指定文件路径，则使用当前选中的文件或目录
//   const pathToOpen = filePath || (currentTab.value ? currentTab.value.path : newRootPath.value)

//   if (!pathToOpen) {
//     store.dispatch('snackbar/showSnackbar', {
//       message: '请先选择一个文件或目录',
//       type: 'warning'
//     })
//     return
//   }

//   // 构建路由参数
//   // rootDir 应该始终是文件树的根目录，即 newRootPath.value
//   let rootDir = newRootPath.value
//   // 如果rootDir是文件，则使用其所在的目录
//   if (await isFilePath(rootDir, null, allowedFileName, findNodeByPath, treeData.value)) {
//     rootDir = window.electron.path.dirname(rootDir)
//   }
//   console.log('openInIDE:', encodeURIComponent(pathToOpen), encodeURIComponent(rootDir))
//   // 构建带参数的URL
//   const url = `${window.location.origin}/#/ide/${encodeURIComponent(pathToOpen)}?rootPath=${encodeURIComponent(rootDir)}`

//   // 调用主进程打开新窗口，并传递URL参数
//   window.electron.openNewWindowIDE(url)
// }

watch(
  () => props.localPath,
  (newPath) => {
    // 清空文件内容和预览区域，防止切换目录时残留上次的内容
    fileContent.value = ''
    renderedDocx.value = ''
    renderedXlsx.value = ''
    selectedFileUrl.value = ''
    selectedFileName.value = ''
    updateIsCodeFile() // 更新代码文件状态

    if (newPath) {
      console.log('Loading file:', newPath)
      // 重置标签页和其他状态
      tabs.value = []
      activeTab.value = null

      initialize(newPath).finally(() => {
        loading.value = false
      })
    }
  }
)
watch(activeTab, (newIndex) => {
  if (tabs.value[newIndex]) {
    restoreState(tabs.value[newIndex])
    console.log('Restored state for:', tabs.value[newIndex].path)
    if (tabs.value[newIndex].path) {
      console.log('Loading code index for:', tabs.value[newIndex].path)
      loadCodeIndex(tabs.value[newIndex].path)
      // 同时加载 AI 描述
      debouncedLoadFileAiDescription(tabs.value[newIndex].path)
    }
  }
})

// 监听 newRootPath 变化，更新标签页标题
watch(newRootPath, (newPath) => {
  if (newPath) {
    // 调用原有的onPathSelectionChanged逻辑
    onPathSelectionChanged(newPath)
  } else {
    // 如果路径被清空，也需要调用onPathSelectionChanged
    onPathSelectionChanged(null)
  }
})
// Filter tree data based on search query
const filterTree = async () => {
  if (!searchQuery.value || searchQuery.value.trim() === '') {
    filteredTreeData.value = treeData.value
    // 清空搜索时重置展开状态
    openNodes.value = []
    searchConfig.value.isSearching = false
    searchConfig.value.searchProgress = 0
    return
  }

  const query = searchQuery.value.toLowerCase()
  const expandedPaths = new Set()
  let resultCount = 0
  searchConfig.value.isSearching = true
  searchConfig.value.searchProgress = 0

  const filter = async (nodes, query, depth = 0) => {
    if (!nodes || depth > searchConfig.value.maxDepth) return []
    if (resultCount >= searchConfig.value.maxResults) return []

    const results = []

    for (const node of nodes) {
      if (resultCount >= searchConfig.value.maxResults) break

      // Check if current node matches
      const matches = node.name.toLowerCase().includes(query)

      if (matches) {
        resultCount++
        results.push(node)
      }

      // If it has children, recursively filter them
      if (node.children && node.children.length > 0) {
        const filteredChildren = await filter(node.children, query, depth + 1)

        // 如果当前节点匹配或有匹配的子节点，添加到展开列表
        if (matches || filteredChildren.length > 0) {
          expandedPaths.add(node.path)
          // 为搜索到的文件夹添加可展开标记
          if (node.isDirectory) {
            node.hasSearchResults = true
            node.searchExpandable = true
          }
        }

        node.children = filteredChildren

        // Include this node if it matches or has matching children
        if (matches || filteredChildren.length > 0) {
          if (!matches) {
            results.push(node)
          }
        }
      }

      // 更新搜索进度
      searchConfig.value.searchProgress = Math.min(
        100,
        (resultCount / searchConfig.value.maxResults) * 100
      )

      // 如果结果数量达到限制，停止搜索
      if (resultCount >= searchConfig.value.maxResults) {
        break
      }
    }

    return results
  }

  try {
    // Create a deep copy of the tree data to avoid modifying the original
    const clonedData = JSON.parse(JSON.stringify(treeData.value))
    filteredTreeData.value = await filter(clonedData, query)

    // 自动展开所有匹配的路径
    openNodes.value = Array.from(expandedPaths)

    console.log(
      '[Search] 搜索完成，结果数量:',
      resultCount,
      '展开节点数量:',
      openNodes.value.length
    )
  } catch (error) {
    console.error('[Search] 搜索出错:', error)
  } finally {
    searchConfig.value.isSearching = false
    searchConfig.value.searchProgress = 100
  }
}

/**
 * 根据输入的路径自动展开目录树
 * 这是一个示例方法，展示如何使用autoExpandPath
 * @param {string} inputPath - 要展开到的路径
 */
// eslint-disable-next-line no-unused-vars
function expandToInputPath(inputPath) {
  if (!inputPath) return

  // 确保路径格式正确
  const normalizedPath = window.electron.path.normalize(inputPath)
  console.log('尝试展开到路径:', normalizedPath)

  // 调用自动展开方法
  autoExpandPath(normalizedPath, true).then((node) => {
    if (node) {
      console.log('成功展开到路径:', normalizedPath)
    } else {
      console.warn('无法展开到路径:', normalizedPath)
    }
  })
}

// Handle node click event
const handleNodeClick = (data) => {
  console.log('handleNodeClick:', data)
  if (!data.isDirectory) {
    // For files, load the file content
    handleNodeSelection(data.path)
  }
}

// Handle node expand event
const handleNodeExpand = (data) => {
  console.log('[DEBUG] 节点展开事件:', data.path)
  // 只保留核心功能：将展开节点添加到openNodes数组中
  if (!openNodes.value.includes(data.path)) {
    openNodes.value.push(data.path)
    console.log('[DEBUG] 添加到展开列表:', data.path)
  }
  // 已删除冗余的日志输出和注释，目录树现在一次性加载完成，不需要额外处理
}

// Handle node collapse event
const handleNodeCollapse = (data) => {
  console.log('[DEBUG] 节点折叠事件:', data.path)
  // 移除当前被折叠的节点
  const index = openNodes.value.indexOf(data.path)
  if (index !== -1) {
    openNodes.value.splice(index, 1)
    console.log('[DEBUG] 从展开列表移除:', data.path)
  }

  // 同时移除所有子节点的路径
  if (data.children && data.children.length > 0) {
    removeChildrenFromOpenNodes(data)
  }
}

// 递归移除所有子节点的路径
function removeChildrenFromOpenNodes(node) {
  if (!node.children) return

  for (const child of node.children) {
    const childIndex = openNodes.value.indexOf(child.path)
    if (childIndex !== -1) {
      openNodes.value.splice(childIndex, 1)
    }

    // 递归移除更深层级的子节点
    if (child.children && child.children.length > 0) {
      removeChildrenFromOpenNodes(child)
    }
  }
}

// 处理节点右键菜单事件
const handleNodeContextMenu = (event, data) => {
  // 阻止默认右键菜单
  event.preventDefault()
  console.log('[节点右键菜单]', data.path)

  // 显示右键菜单
  const menuType = data.isDirectory ? 'folder' : 'file'
  showContextMenu(event, menuType, { path: data.path, name: data.name })
}

// 处理搜索结果点击事件
const handleSearchResultClick = async (data, event) => {
  // 如果是搜索到的文件夹，展开/折叠它
  if (data.isDirectory && data.hasSearchResults) {
    event.stopPropagation()

    // 切换展开状态
    if (openNodes.value.includes(data.path)) {
      // 如果已展开，则折叠
      const index = openNodes.value.indexOf(data.path)
      if (index > -1) {
        openNodes.value.splice(index, 1)
      }
      console.log('[Search] 折叠搜索文件夹:', data.path)
    } else {
      // 如果未展开，则展开并加载子内容
      openNodes.value.push(data.path)
      console.log('[Search] 展开搜索文件夹:', data.path)

      // 如果文件夹没有子内容，尝试加载
      if (!data.children || data.children.length === 0) {
        try {
          await loadDirectoryChildren(data)
        } catch (error) {
          console.error('[Search] 加载文件夹子内容失败:', error)
        }
      }
    }

    // 强制刷新树组件
    nextTick(() => {
      // Element Plus Tree 组件通过 default-expanded-keys 属性控制展开状态
      // 不需要手动调用 setExpanded 方法
      console.log('[DEBUG] 节点展开状态已更新:', data.path, openNodes.value.includes(data.path))
    })
  } else {
    // 普通文件或文件夹，使用原有逻辑
    handleNodeClick(data)
  }
}

// 加载目录的子内容
async function loadDirectoryChildren(node) {
  try {
    const children = await window.electron.readDirectory(node.path)
    const childNodes = children.map((child) => ({
      name: child.name,
      path: window.electron.path.join(node.path, child.name),
      isDirectory: child.isDirectory,
      children: child.isDirectory ? [] : undefined
    }))

    // 更新节点数据
    node.children = childNodes

    // 更新过滤后的树数据
    const updateNodeInTree = (nodes) => {
      for (const n of nodes) {
        if (n.path === node.path) {
          n.children = childNodes
          return true
        }
        if (n.children) {
          if (updateNodeInTree(n.children)) {
            return true
          }
        }
      }
      return false
    }

    updateNodeInTree(filteredTreeData.value)

    console.log('[Search] 成功加载文件夹子内容:', node.path, childNodes.length)
  } catch (error) {
    console.error('[Search] 加载文件夹子内容失败:', error)
  }
}

// 全部展开功能
async function expandAllNodes(targetPath) {
  try {
    const allPaths = []

    // 递归加载并收集指定目录下的所有子目录路径
    const collectPathsRecursively = async (nodes, basePath) => {
      console.log('[ExpandAll] 开始收集路径，basePath:', basePath, 'nodes数量:', nodes.length)

      for (const node of nodes) {
        if (node.isDirectory) {
          console.log('[ExpandAll] 检查目录:', node.path, 'basePath:', basePath)

          // 判断是否应该处理这个目录
          let shouldProcess = false
          if (basePath === '') {
            // 根目录展开，处理所有目录
            shouldProcess = true
          } else if (node.path === basePath) {
            // 目标目录本身
            shouldProcess = true
          } else if (node.path.startsWith(basePath + '/')) {
            // 目标目录的子目录
            shouldProcess = true
          }

          console.log('[ExpandAll] 是否处理目录:', node.path, shouldProcess)

          if (shouldProcess) {
            allPaths.push(node.path)
            console.log('[ExpandAll] 添加路径到展开列表:', node.path)

            // 如果子目录还没有加载内容，先加载
            if (!node.children || node.children.length === 0) {
              try {
                console.log('[ExpandAll] 开始加载子目录内容:', node.path)
                const children = await window.electron.readDirectory(node.path)
                const childNodes = children.map((child) => ({
                  name: child.name,
                  path: window.electron.path.join(node.path, child.name),
                  isDirectory: child.isDirectory,
                  children: child.isDirectory ? [] : undefined
                }))

                // 更新节点数据
                node.children = childNodes

                // 更新过滤后的树数据
                const updateNodeInTree = (treeNodes) => {
                  for (const n of treeNodes) {
                    if (n.path === node.path) {
                      n.children = childNodes
                      return true
                    }
                    if (n.children) {
                      if (updateNodeInTree(n.children)) {
                        return true
                      }
                    }
                  }
                  return false
                }

                updateNodeInTree(filteredTreeData.value)

                console.log('[ExpandAll] 成功加载子目录:', node.path, childNodes.length)
              } catch (error) {
                console.error('[ExpandAll] 加载子目录失败:', node.path, error)
              }
            }

            // 递归处理子目录
            if (node.children && node.children.length > 0) {
              console.log(
                '[ExpandAll] 递归处理子目录:',
                node.path,
                '子目录数量:',
                node.children.length
              )
              await collectPathsRecursively(node.children, basePath)
            }
          }
        }
      }
    }

    // 使用原始树数据而不是过滤后的数据
    const treeDataToUse = searchQuery.value ? treeData.value : filteredTreeData.value

    // 如果指定了目标路径，只展开该目录下的子目录
    if (targetPath) {
      console.log('[ExpandAll] 目标路径:', targetPath)

      // 先确保目标目录本身被展开
      if (!openNodes.value.includes(targetPath)) {
        openNodes.value.push(targetPath)
      }

      // 找到目标目录在树数据中的位置
      const findTargetNode = (nodes, targetPath) => {
        for (const node of nodes) {
          if (node.path === targetPath) {
            return node
          }
          if (node.children) {
            const found = findTargetNode(node.children, targetPath)
            if (found) return found
          }
        }
        return null
      }

      const targetNode = findTargetNode(treeDataToUse, targetPath)
      if (targetNode) {
        console.log('[ExpandAll] 找到目标目录:', targetNode.path)
        // 从目标目录开始递归收集路径
        await collectPathsRecursively([targetNode], targetPath)
      } else {
        console.warn('[ExpandAll] 未找到目标目录:', targetPath)
        // 如果找不到目标目录，尝试从根节点开始查找
        await collectPathsRecursively(treeDataToUse, targetPath)
      }
    } else {
      // 如果没有指定目标路径，展开所有目录
      await collectPathsRecursively(treeDataToUse, '')
    }

    // 设置所有路径为展开状态
    openNodes.value = [...new Set([...openNodes.value, ...allPaths])]

    // 强制重新渲染树组件
    treeKey.value++

    const message = targetPath
      ? `已展开 ${allPaths.length} 个子目录`
      : `已展开 ${allPaths.length} 个目录`

    store.dispatch('snackbar/showSnackbar', {
      message,
      type: 'success'
    })

    console.log('[ExpandAll] 展开目录:', allPaths.length, '目标路径:', targetPath)
  } catch (error) {
    console.error('[ExpandAll] 展开失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: '展开失败',
      type: 'error'
    })
  }
}

// 全部折叠功能
async function collapseAllNodes(targetPath) {
  try {
    // 先保存当前展开的节点
    const currentExpandedKeys = [...openNodes.value]
    let pathsToCollapse = []

    if (targetPath) {
      // 只折叠指定目录下的子目录
      pathsToCollapse = currentExpandedKeys.filter(
        (path) => path !== targetPath && path.startsWith(targetPath + '/')
      )
      // 保留目标目录本身和其他不相关的目录
      openNodes.value = currentExpandedKeys.filter(
        (path) => path === targetPath || !path.startsWith(targetPath + '/')
      )
    } else {
      // 折叠所有目录
      pathsToCollapse = currentExpandedKeys
      openNodes.value = []
    }

    // 强制重新渲染树组件
    treeKey.value++

    const message = targetPath ? `已折叠 ${pathsToCollapse.length} 个子目录` : '已折叠所有目录'

    store.dispatch('snackbar/showSnackbar', {
      message,
      type: 'success'
    })

    console.log('[CollapseAll] 折叠目录:', pathsToCollapse.length, '目标路径:', targetPath)
  } catch (error) {
    console.error('[CollapseAll] 折叠失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: '折叠失败',
      type: 'error'
    })
  }
}

// 文件夹统计功能
async function showFolderStatistics(folderPath) {
  try {
    store.dispatch('snackbar/showSnackbar', {
      message: '正在统计文件夹信息...',
      type: 'info'
    })

    const stats = {
      totalFiles: 0,
      totalDirectories: 0,
      totalFunctions: 0,
      totalLines: 0,
      fileTypes: {},
      importantFiles: [],
      lastModified: null
    }

    // 递归统计文件夹信息
    const countFolderContents = async (dirPath, depth = 0) => {
      if (depth > 10) return // 防止无限递归

      try {
        const children = await window.electron.readDirectory(dirPath)

        for (const child of children) {
          const fullPath = window.electron.path.join(dirPath, child.name)

          if (child.isDirectory) {
            stats.totalDirectories++
            await countFolderContents(fullPath, depth + 1)
          } else {
            stats.totalFiles++

            // 统计文件类型
            const ext = window.electron.path.extname(child.name).toLowerCase()
            stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1

            // 统计代码行数（仅对文本文件）
            try {
              const content = await window.electron.readFile(fullPath, 'utf8')
              const lines = content.split('\n').length
              stats.totalLines += lines

              // 判断重要文件（基于文件名和内容）
              if (isImportantFile(child.name, content)) {
                stats.importantFiles.push({
                  name: child.name,
                  path: fullPath,
                  lines: lines,
                  reason: getImportanceReason(child.name, content)
                })
              }
            } catch {
              // 忽略无法读取的文件
            }

            // 更新最后修改时间
            if (child.mtime && (!stats.lastModified || child.mtime > stats.lastModified)) {
              stats.lastModified = child.mtime
            }
          }
        }
      } catch (error) {
        console.warn('[Stats] 无法访问目录:', dirPath, error)
      }
    }

    await countFolderContents(folderPath)

    // 获取函数统计（如果支持）
    try {
      const response = await checkIndexApi(newRootPath.value, folderPath)
      if (response.data && response.data.functions) {
        const functions = response.data.functions
        if (Array.isArray(functions)) {
          stats.totalFunctions = functions.length
        } else if (typeof functions === 'object') {
          stats.totalFunctions = Object.values(functions).flat().length
        }
      }
    } catch (error) {
      console.warn('[Stats] 无法获取函数统计:', error)
    }

    // 显示统计结果
    const statsMessage = `
文件夹统计结果：
📁 目录数量: ${stats.totalDirectories}
📄 文件数量: ${stats.totalFiles}
🔧 函数数量: ${stats.totalFunctions}
📝 总行数: ${stats.totalLines.toLocaleString()}
📅 最后修改: ${stats.lastModified ? new Date(stats.lastModified).toLocaleString() : '未知'}

文件类型分布：
${Object.entries(stats.fileTypes)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 10)
  .map(([ext, count]) => `${ext || '无扩展名'}: ${count}`)
  .join('\n')}

${
  stats.importantFiles.length > 0
    ? `\n重要文件 (${stats.importantFiles.length}):\n${stats.importantFiles
        .slice(0, 5)
        .map((f) => `• ${f.name} (${f.reason})`)
        .join('\n')}`
    : ''
}
    `.trim()

    // 复制到剪贴板
    await navigator.clipboard.writeText(statsMessage)

    store.dispatch('snackbar/showSnackbar', {
      message: `统计完成！结果已复制到剪贴板\n目录: ${stats.totalDirectories}, 文件: ${stats.totalFiles}, 函数: ${stats.totalFunctions}`,
      type: 'success',
      timeout: 5000
    })

    console.log('[Stats] 文件夹统计完成:', stats)
  } catch (error) {
    console.error('[Stats] 统计失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: '统计失败: ' + error.message,
      type: 'error'
    })
  }
}

// 判断重要文件
function isImportantFile(fileName, content) {
  const importantPatterns = [
    /package\.json$/i,
    /readme\.md$/i,
    /\.config\.(js|ts|json)$/i,
    /\.env$/i,
    /dockerfile$/i,
    /makefile$/i,
    /\.gitignore$/i,
    /\.eslintrc/i,
    /\.prettierrc/i,
    /tsconfig\.json$/i,
    /webpack\.config/i,
    /vite\.config/i,
    /\.lock$/i
  ]

  // 检查文件名模式
  if (importantPatterns.some((pattern) => pattern.test(fileName))) {
    return true
  }

  // 检查文件内容关键词
  const importantKeywords = [
    'main',
    'index',
    'app',
    'server',
    'client',
    'config',
    'setup',
    'init',
    'bootstrap',
    'entry',
    'entrypoint',
    'start'
  ]

  const lowerContent = content.toLowerCase()
  return importantKeywords.some(
    (keyword) => lowerContent.includes(keyword) && content.length < 10000 // 避免大文件误判
  )
}

// 获取重要性原因
function getImportanceReason(fileName, content) {
  if (/package\.json$/i.test(fileName)) return '项目配置'
  if (/readme\.md$/i.test(fileName)) return '项目文档'
  if (/\.config\./i.test(fileName)) return '配置文件'
  if (/\.env$/i.test(fileName)) return '环境配置'
  if (/dockerfile$/i.test(fileName)) return '容器配置'
  if (/makefile$/i.test(fileName)) return '构建配置'
  if (/\.gitignore$/i.test(fileName)) return 'Git配置'
  if (/\.lock$/i.test(fileName)) return '依赖锁定'

  const lowerContent = content.toLowerCase()
  if (lowerContent.includes('main') || lowerContent.includes('index')) return '入口文件'
  if (lowerContent.includes('config')) return '配置文件'
  if (lowerContent.includes('setup') || lowerContent.includes('init')) return '初始化文件'

  return '重要文件'
}

// 切换 AI 描述展开/折叠
function toggleAiDescription() {
  aiDescriptionExpanded.value = !aiDescriptionExpanded.value
}

// Initialize filteredTreeData with the original treeData
watch(
  treeData,
  (newVal) => {
    console.log('[DEBUG] treeData 变化，新数据长度:', newVal?.length || 0)
    filteredTreeData.value = newVal
    console.log('[DEBUG] filteredTreeData 设置完成，当前 openNodes:', openNodes.value)

    // 强制刷新 el-tree 展开状态
    nextTick(() => {
      console.log('[DEBUG] nextTick 中检查 treeRef:', treeRef.value)
      if (treeRef.value && openNodes.value.length > 0) {
        console.log('[DEBUG] 展开节点列表:', openNodes.value)
        // Element Plus Tree 组件通过 default-expanded-keys 属性控制展开状态
        // 不需要手动调用 setExpanded 方法
        console.log('[DEBUG] 展开状态已通过 default-expanded-keys 设置')
      }
    })

    // 当目录树加载完成后，自动查找并选择指定路径的节点
    if (newVal && newVal.length > 0 && props.localPath) {
      console.log('目录树加载完成，自动查找节点:', props.localPath)
      // 使用 nextTick 确保 DOM 已更新
      nextTick(async () => {
        if (isMarkdown(props.localPath)) {
          handleLinkClick(props.localPath)
          return
        }
        // 检查是否是文件路径
        const isFile = await window.electron.isText(props.localPath)

        if (isFile) {
          // 如果是文件，展开到该路径并选择该文件
          console.log('找到文件路径，自动选择:', props.localPath)
          expandToPath(props.localPath)
          handleNodeSelection(props.localPath)
          loadFileByType(props.localPath)
        }
      })
    }
  },
  { immediate: true }
)

// 监听 openNodes 变化
watch(
  openNodes,
  (newVal) => {
    console.log('[DEBUG] openNodes 变化:', newVal)
  },
  { deep: true }
)

// 生命周期挂载时执行初始化
let globalShortcutsCleanup = null

onMounted(async () => {
  // 初始化 IndexedDB
  try {
    await fileHistoryDB.init()
    console.log('IndexedDB 初始化成功')
  } catch (error) {
    console.error('IndexedDB 初始化失败:', error)
  }

  initializePage()

  // 设置全局快捷键
  globalShortcutsCleanup = setupGlobalShortcuts()

  // 从localStorage读取侧边栏显示偏好
  const savedLeftPanel = localStorage.getItem('fileBrowser.showLeftPanel')
  const savedRightPanel = localStorage.getItem('fileBrowser.showRightPanel')

  if (savedLeftPanel !== null) {
    showLeftPanel.value = savedLeftPanel === 'true'
  }

  if (savedRightPanel !== null) {
    showRightPanel.value = savedRightPanel === 'true'
  }

  // 添加全局点击事件监听，用于隐藏右键菜单
  document.addEventListener('click', hideContextMenu)

  // 添加全局鼠标移动监听，用于隐藏悬停提示
  document.addEventListener('mousemove', handleGlobalMouseMove)

  // 添加窗口大小改变监听器，用于重新布局差异编辑器
  window.addEventListener('resize', handleWindowResize)
})

// 组件卸载时清理
onUnmounted(() => {
  // 清理定时器
  if (saveHistoryTimer) {
    clearTimeout(saveHistoryTimer)
    saveHistoryTimer = null
  }

  // 清理全局快捷键
  if (globalShortcutsCleanup) {
    globalShortcutsCleanup()
    globalShortcutsCleanup = null
  }

  // 清理差异编辑器
  if (diffEditor.value) {
    diffEditor.value.dispose()
    diffEditor.value = null
  }

  // 清理弹窗差异编辑器
  if (diffModalEditor.value) {
    diffModalEditor.value.dispose()
    diffModalEditor.value = null
  }

  // 关闭 IndexedDB 连接
  fileHistoryDB.close()

  // 移除事件监听
  document.removeEventListener('click', hideContextMenu)
  document.removeEventListener('mousemove', handleGlobalMouseMove)
  window.removeEventListener('mousemove', onResizing)
  window.removeEventListener('mouseup', stopResizing)
  window.removeEventListener('resize', handleWindowResize)
})

// 组件激活时重新检查主题（解决返回页面时样式不一致的问题）
onActivated(() => {
  // 重新检查并加载正确的主题样式
  checkTheme()
  console.log('[FileBrowser] 组件激活，重新检查主题样式')
})

// 工具函数：将路径转换为Unix格式
const toUnixPath = (path) => {
  return path.replace(/\\/g, '/')
}

// —— 索引与分析功能（从 SpaceLens 迁移）——
const MIN_INDEX_TIME = 1
const MAX_INDEX_TIME = 6

function hideIndexProcess() {
  stopIndexProgressMonitoring()
  indexProgressVisible.value = false
  pendingReportAction.value = null
}

async function cancelIndexProcess() {
  if (!newRootPath.value || !indexProgressData.value.currentFile) return
  await resetIndexApi(
    newRootPath.value,
    window.electron.path.relative(newRootPath.value, indexProgressData.value.currentFile)
  )
  hideIndexProcess()
}

function startIndexProgressMonitoring(targetPath) {
  const checkProgress = async () => {
    try {
      const response = await checkIndexApi(
        newRootPath.value,
        window.electron.path.relative(newRootPath.value, targetPath)
      )
      const { real_file_count, total_file_count, total_function_count } = response.data.data

      const minSeconds = Math.ceil((real_file_count - total_file_count) * MIN_INDEX_TIME)
      const maxSeconds = Math.ceil((real_file_count - total_file_count) * MAX_INDEX_TIME)
      const formatTime = (seconds) => {
        if (seconds < 60) return `${seconds}秒`
        if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor(seconds % 60)
        const remainingSeconds = seconds % 60
        return `${hours}小时${minutes}分${remainingSeconds}秒`
      }
      const minTimeFormatted = formatTime(minSeconds)
      const maxTimeFormatted = formatTime(maxSeconds)

      const progress =
        real_file_count > 0 ? Math.round(((total_file_count - 1) / real_file_count) * 100) : 0
      indexProgressData.value.totalFiles = real_file_count
      indexProgressData.value.scannedFiles = total_file_count
      indexProgressData.value.currentFile = targetPath
      indexProgressData.value.remainingFiles = real_file_count - total_file_count
      indexProgressData.value.totalFunctions = total_function_count || 0
      indexProgressData.value.estimatedTime = `${minTimeFormatted}~${maxTimeFormatted}`
      indexProgressData.value.progress = progress
    } catch (e) {
      console.error('检查索引进度失败:', e)
    }
  }
  checkProgress()
  indexProgressTimer = setInterval(checkProgress, 2000)
}

function stopIndexProgressMonitoring() {
  if (indexProgressTimer) {
    clearInterval(indexProgressTimer)
    indexProgressTimer = null
  }
}

async function startIndexProcess4Toolbar(targetPath) {
  try {
    indexProgressVisible.value = true
    startIndexProgressMonitoring(targetPath)
    const response = await listGraph(
      newRootPath.value,
      window.electron.path.relative(newRootPath.value, targetPath)
    )
    if (response && response.data && response.data.code === 0) {
      stopIndexProgressMonitoring()
      indexProgressVisible.value = false

      const checkIndex = await checkIndexApi(
        newRootPath.value,
        window.electron.path.relative(newRootPath.value, targetPath)
      )
      const { total_file_count, total_function_count } = checkIndex.data.data
      let message = `索引状态检查完成\n`
      message += `函数索引量: ${total_function_count}\n`
      message += `总文件数量: ${total_file_count}`

      store.dispatch('snackbar/showSnackbar', {
        message,
        color: 'success',
        timeout: 8000
      })
    } else {
      store.dispatch('snackbar/showSnackbar', {
        message: `${targetPath} 的索引构建失败，错误信息：${response?.data?.message || '未知错误'}`,
        color: 'error'
      })
    }
  } catch (error) {
    console.error('启动索引进程失败:', error)
    stopIndexProgressMonitoring()
    indexProgressVisible.value = false
    store.dispatch('snackbar/showSnackbar', {
      message: '启动索引进程失败',
      color: 'error'
    })
    throw error
  }
}

async function startIndexProcess(targetPath) {
  try {
    indexProgressVisible.value = true
    startIndexProgressMonitoring(targetPath)
    const response = await listGraph(
      newRootPath.value,
      window.electron.path.relative(newRootPath.value, targetPath)
    )
    if (response && response.data && response.data.code === 0) {
      stopIndexProgressMonitoring()
      indexProgressVisible.value = false
      if (pendingReportAction.value) {
        const action = pendingReportAction.value
        pendingReportAction.value = null
        setTimeout(() => action(), 500)
      }
    } else {
      store.dispatch('snackbar/showSnackbar', {
        message: `${targetPath} 的索引构建失败，错误信息：${response?.data?.message || '未知错误'}`,
        color: 'error'
      })
    }
  } catch (error) {
    console.error('启动索引进程失败:', error)
    stopIndexProgressMonitoring()
    indexProgressVisible.value = false
    store.dispatch('snackbar/showSnackbar', {
      message: '启动索引进程失败',
      color: 'error'
    })
    throw error
  }
}

async function checkIndexStatus4Toolbar(targetPath) {
  try {
    const response = await checkIndexApi(
      newRootPath.value,
      window.electron.path.relative(newRootPath.value, targetPath)
    )
    const { real_file_count, total_file_count, total_function_count } = response.data.data
    const unindexedFiles = real_file_count - total_file_count
    if (unindexedFiles > 0) {
      const minSeconds = Math.ceil(unindexedFiles * MIN_INDEX_TIME)
      const maxSeconds = Math.ceil(unindexedFiles * MAX_INDEX_TIME)
      const formatTime = (seconds) => {
        if (seconds < 60) return `${seconds}秒`
        if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const remainingSeconds = seconds % 60
        return `${hours}小时${minutes}分${remainingSeconds}秒`
      }
      const minTimeFormatted = formatTime(minSeconds)
      const maxTimeFormatted = formatTime(maxSeconds)
      const confirmed = window.confirm(
        `检测到当前路径下有 ${unindexedFiles} 个文件未建立索引，\n` +
          `预计需要 ${minTimeFormatted}-${maxTimeFormatted}进行初始化索引。\n\n` +
          `确认继续吗？`
      )
      if (!confirmed) return false
      await startIndexProcess4Toolbar(targetPath)
      return true
    } else {
      // 使用 Electron 的 showMessageBox 进行二次确认
      const result = await window.electron.showMessageBox({
        type: 'question',
        title: '索引更新确认',
        message: '当前路径已经构建过索引',
        detail: `共索引 ${total_file_count}/${real_file_count} 个文件，共 ${total_function_count} 个函数。\n\n请选择索引更新方式：\n• 清除并重建：删除所有旧索引，重新构建完整索引\n• 增量更新：仅对新增或修改的文件进行索引\n• 取消：不进行任何操作`,
        buttons: ['取消', '增量更新索引', '清除并重建'],
        defaultId: 1,
        cancelId: 0
      })

      if (result.response === 0) {
        console.log('用户取消索引更新操作')
        return false
      }

      // 用户选择增量更新索引
      if (result.response === 1) {
        console.log('用户选择增量更新索引')
        await startIndexProcess4Toolbar(targetPath)
        return true
      }

      // 用户选择清除并重建
      if (result.response === 2) {
        console.log('用户选择清除并重建索引')
        if (window.electron.path.relative(newRootPath.value, targetPath) !== '') {
          console.log(
            `开始清除 ${window.electron.path.relative(newRootPath.value, targetPath)} 的旧索引`
          )
          await deleteIndexSomeApi(
            newRootPath.value,
            window.electron.path.relative(newRootPath.value, targetPath)
          )
          await store.dispatch('snackbar/showSnackbar', {
            message: `已清除 ${window.electron.path.relative(newRootPath.value, targetPath)} 的索引，开始重新索引`,
            color: 'warning'
          })
        }
        await startIndexProcess4Toolbar(targetPath)
        return true
      }

      return false
    }
  } catch (error) {
    console.error('检查索引状态失败:', error)
    return false
  }
}

async function checkIndexStatus(targetPath, onProceed) {
  try {
    const response = await checkIndexApi(
      newRootPath.value,
      window.electron.path.relative(newRootPath.value, targetPath)
    )
    const { real_file_count, total_file_count } = response.data.data
    const unindexedFiles = real_file_count - total_file_count
    if (unindexedFiles > 0) {
      const minSeconds = Math.ceil(unindexedFiles * MIN_INDEX_TIME)
      const maxSeconds = Math.ceil(unindexedFiles * MAX_INDEX_TIME)
      const formatTime = (seconds) => {
        if (seconds < 60) return `${seconds}秒`
        if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const remainingSeconds = seconds % 60
        return `${hours}小时${minutes}分${remainingSeconds}秒`
      }
      const minTimeFormatted = formatTime(minSeconds)
      const maxTimeFormatted = formatTime(maxSeconds)
      const confirmed = window.confirm(
        `检测到当前路径下有 ${unindexedFiles} 个文件未建立索引，\n` +
          `预计需要 ${minTimeFormatted}-${maxTimeFormatted}进行初始化索引。\n\n` +
          `确认继续吗？`
      )
      if (!confirmed) return false
      if (onProceed) {
        pendingReportAction.value = onProceed
      }
      await startIndexProcess(targetPath)
      return false
    }
    return true
  } catch (error) {
    console.error('检查索引状态失败:', error)
    return false
  }
}

async function generateAnalysisReportForPath(targetPath) {
  try {
    if (!newRootPath.value) return
    const selectedItem = pathSuggestions.value.find((item) => item.value === newRootPath.value)
    if (!selectedItem) {
      console.warn('未找到匹配的仓库路径')
      return
    }
    const { indexing, hasFullIndex } = await window.electron.checkMemoryFlashStatus(
      newRootPath.value
    )
    if (indexing) {
      window.alert(`检测到正在对 “${targetPath}” 构建索引，请等待索引构建完成后，再进行分析`)
      return
    }
    if (!hasFullIndex) {
      const indexCheckResult = await checkIndexStatus(targetPath, () =>
        generateAnalysisReportForPath(targetPath)
      )
      if (!indexCheckResult) return
    }
    modalRepoID.value = selectedItem.id?.toString?.() || ''
    modalTargetPath.value = targetPath
    modalScopeText.value = '单点文件集'
    apiType.value = 'deepResearch'
    // 仅单文件强制 wholeCode=true
    const stats = await window.electron.getFileStats(targetPath)
    wholeCode.value = !stats.isDirectory
    count.value = stats.isDirectory ? 0 : 1
    analysisReportDrawerVisible.value = true
    store.dispatch('snackbar/showSnackbar', {
      message: `正在为单点文件集生成代码分析报告，请稍等片刻后在'文件枢纽'中查看...`,
      color: 'info'
    })
  } catch (error) {
    console.error('生成代码分析报告失败:', error)
    store.dispatch('snackbar/showSnackbar', { message: '生成代码分析报告失败', color: 'error' })
  }
}

async function generateFlowchartForPath(targetPath) {
  try {
    if (!newRootPath.value) return
    const selectedItem = pathSuggestions.value.find((item) => item.value === newRootPath.value)
    if (!selectedItem) {
      console.warn('未找到匹配的仓库路径')
      return
    }
    const { indexing, hasFullIndex } = await window.electron.checkMemoryFlashStatus(
      newRootPath.value
    )
    if (indexing) {
      window.alert(`检测到正在对 “${targetPath}” 构建索引，请等待索引构建完成后，再进行分析`)
      return
    }
    if (!hasFullIndex) {
      const shouldProceed = await checkIndexStatus(targetPath, () =>
        generateFlowchartForPath(targetPath)
      )
      if (!shouldProceed) return
    }
    modalRepoID.value = selectedItem.id?.toString?.() || ''
    modalTargetPath.value = targetPath
    modalScopeText.value = '单点文件集'
    apiType.value = 'flowChart'
    // 仅单文件强制 wholeCode=true
    const stats = await window.electron.getFileStats(targetPath)
    wholeCode.value = !stats.isDirectory
    count.value = stats.isDirectory ? 0 : 1
    analysisReportDrawerVisible.value = true
  } catch (error) {
    console.error('生成流程图失败:', error)
    store.dispatch('snackbar/showSnackbar', { message: '生成流程图失败', color: 'error' })
  }
}

// 获取代码索引信息
async function loadCodeIndex(filePath) {
  if (!filePath) {
    console.log('No file path provided')
    codeIndex.value = null
    return
  }

  try {
    await loadPathSuggestions()
    console.log('Loading code index for:', filePath, newRootPath.value, pathSuggestions.value)
    const repoPath = pathSuggestions.value.find((item) => {
      return filePath.includes(item.value)
    }).value
    const response = await checkIndexApi(
      repoPath,
      toUnixPath(window.electron.path.relative(repoPath, filePath))
    )

    if (response && response.data.code === 0) {
      codeIndex.value = response.data.data
      console.log('Code index loaded:', codeIndex.value)
    } else {
      codeIndex.value = null
    }
  } catch (error) {
    console.error('Failed to load code index:', error)
    codeIndex.value = null
  }
}

// 获取文件 AI 描述
async function loadFileAiDescription(filePath) {
  if (!filePath || !newRootPath.value) {
    currentFileAiDescription.value = ''
    return
  }

  try {
    // 检查缓存
    const cacheKey = filePath
    if (aiDescriptionCache.value.has(cacheKey)) {
      currentFileAiDescription.value = aiDescriptionCache.value.get(cacheKey)
      return
    }

    await loadPathSuggestions()
    const repoPath = pathSuggestions.value.find((item) => {
      return filePath.includes(item.value)
    })?.value

    if (!repoPath) {
      currentFileAiDescription.value = ''
      return
    }

    const response = await checkIndexApi(
      repoPath,
      toUnixPath(window.electron.path.relative(repoPath, filePath))
    )

    if (response && response.data.code === 0) {
      const data = response.data.data
      // 从返回的数据中提取描述信息
      let description = ''

      // 优先使用模块描述
      if (data.modules && data.modules.current && data.modules.current.length > 0) {
        description = data.modules.current[0].description || ''
      }

      // 如果没有模块描述，尝试从函数描述中提取
      if (!description && data.functions && Object.keys(data.functions).length > 0) {
        // 获取第一个文件的函数列表
        const firstFileFunctions = Object.values(data.functions)[0]
        if (firstFileFunctions && firstFileFunctions.length > 0) {
          const functionDescriptions = firstFileFunctions
            .map((func) => {
              const parsed = getParsedDescription(func.description)
              return parsed.description
            })
            .filter((desc) => desc && desc.trim())
            .slice(0, 3) // 只取前3个函数的描述

          if (functionDescriptions.length > 0) {
            description = functionDescriptions.join('；')
          }
        }
      }

      // 如果还是没有描述，使用默认文本
      if (!description) {
        description = '暂无 AI 描述信息'
      }

      currentFileAiDescription.value = description
      // 缓存结果
      aiDescriptionCache.value.set(cacheKey, description)
    } else {
      currentFileAiDescription.value = '暂无 AI 描述信息'
    }
  } catch (error) {
    console.error('Failed to load AI description:', error)
    currentFileAiDescription.value = '获取 AI 描述失败'
  }
}

// 防抖获取 AI 描述
function debouncedLoadFileAiDescription(filePath) {
  // 清除之前的定时器
  if (aiDescriptionDebounceTimer.value) {
    clearTimeout(aiDescriptionDebounceTimer.value)
  }

  // 设置新的定时器
  aiDescriptionDebounceTimer.value = setTimeout(() => {
    loadFileAiDescription(filePath)
  }, 500) // 500ms 防抖延迟
}

// 获取悬停节点的 AI 描述
async function loadHoverAiDescription(filePath, event) {
  if (!filePath || !newRootPath.value) {
    return
  }

  try {
    // 检查缓存
    const cacheKey = filePath
    if (aiDescriptionCache.value.has(cacheKey)) {
      const description = aiDescriptionCache.value.get(cacheKey)
      showHoverTooltip(event, description)
      return
    }

    hoverTooltip.value.loading = true
    showHoverTooltip(event, '正在加载 AI 描述...')

    await loadPathSuggestions()
    const repoPath = pathSuggestions.value.find((item) => {
      return filePath.includes(item.value)
    })?.value

    if (!repoPath) {
      showHoverTooltip(event, '暂无 AI 描述信息')
      return
    }

    // 判断是否为根目录
    const relativePath = toUnixPath(window.electron.path.relative(repoPath, filePath))
    const isRootDirectory = relativePath === '' || relativePath === '.' || filePath === repoPath

    const response = await checkIndexApi(repoPath, relativePath)

    if (response && response.data.code === 0) {
      const data = response.data.data
      let description = ''

      // 如果是根目录，从 modules.root 中查找
      if (
        isRootDirectory &&
        data.modules &&
        data.modules.root &&
        Array.isArray(data.modules.root)
      ) {
        const rootModule = data.modules.root.find(
          (module) => module.parent_path === '' && module.path === ''
        )
        if (rootModule && rootModule.description) {
          description = rootModule.description
        }
      } else {
        // 非根目录，使用原有逻辑
        // 优先使用模块描述
        if (data.modules && data.modules.current && data.modules.current.length > 0) {
          description = data.modules.current[0].description || ''
        }

        // 如果没有模块描述，尝试从函数描述中提取
        if (!description && data.functions && Object.keys(data.functions).length > 0) {
          // 获取第一个文件的函数列表
          const firstFileFunctions = Object.values(data.functions)[0]
          if (firstFileFunctions && firstFileFunctions.length > 0) {
            const functionDescriptions = firstFileFunctions
              .map((func) => {
                const parsed = getParsedDescription(func.description)
                return parsed.description
              })
              .filter((desc) => desc && desc.trim())
              .slice(0, 2) // 悬停提示只取前2个函数的描述

            if (functionDescriptions.length > 0) {
              description = functionDescriptions.join('；')
            }
          }
        }
      }

      // 如果还是没有描述，使用默认文本
      if (!description) {
        description = '暂无 AI 描述信息'
      }

      // 缓存结果
      aiDescriptionCache.value.set(cacheKey, description)
      showHoverTooltip(event, description)
    } else {
      showHoverTooltip(event, '暂无 AI 描述信息')
    }
  } catch (error) {
    console.error('Failed to load hover AI description:', error)
    showHoverTooltip(event, '获取 AI 描述失败')
  } finally {
    hoverTooltip.value.loading = false
  }
}

// 显示悬停提示
function showHoverTooltip(event, content) {
  hoverTooltip.value.show = true
  hoverTooltip.value.content = content
  hoverTooltip.value.x = event.clientX + 10
  hoverTooltip.value.y = event.clientY - 10
}

// 隐藏悬停提示
function hideHoverTooltip() {
  // 清除防抖定时器
  if (hoverDebounceTimer.value) {
    clearTimeout(hoverDebounceTimer.value)
    hoverDebounceTimer.value = null
  }

  hoverTooltip.value.show = false
  hoverTooltip.value.content = ''
  hoverTooltip.value.loading = false
}

// 全局鼠标移动处理
function handleGlobalMouseMove(event) {
  // 如果悬停提示正在显示，检查鼠标是否还在目录树区域内
  if (hoverTooltip.value.show) {
    const treeContainer = document.querySelector('.el-tree')
    if (treeContainer && !treeContainer.contains(event.target)) {
      hideHoverTooltip()
    }
  }
}

// 防抖悬停处理
function debouncedHoverHandler(filePath, event) {
  // 清除之前的定时器
  if (hoverDebounceTimer.value) {
    clearTimeout(hoverDebounceTimer.value)
  }

  // 设置新的定时器
  hoverDebounceTimer.value = setTimeout(() => {
    loadHoverAiDescription(filePath, event)
  }, 300) // 300ms 防抖延迟
}

// 复制AI描述到剪贴板
async function copyAiDescriptionToClipboard(filePath) {
  if (!filePath || !newRootPath.value) {
    store.dispatch('snackbar/showSnackbar', {
      message: '无法获取文件路径',
      color: 'error'
    })
    return
  }

  try {
    await loadPathSuggestions()
    const repoPath = pathSuggestions.value.find((item) => {
      return filePath.includes(item.value)
    })?.value

    if (!repoPath) {
      store.dispatch('snackbar/showSnackbar', {
        message: '无法找到对应的仓库路径',
        color: 'error'
      })
      return
    }

    // 判断是否为根目录
    const relativePath = toUnixPath(window.electron.path.relative(repoPath, filePath))
    const isRootDirectory = relativePath === '' || relativePath === '.' || filePath === repoPath

    const response = await checkIndexApi(repoPath, relativePath)

    if (response && response.data.code === 0) {
      const data = response.data.data
      let description = ''

      // 如果是根目录，从 modules.root 中查找
      if (
        isRootDirectory &&
        data.modules &&
        data.modules.root &&
        Array.isArray(data.modules.root)
      ) {
        const rootModule = data.modules.root.find(
          (module) => module.parent_path === '' && module.path === ''
        )
        if (rootModule && rootModule.description) {
          description = rootModule.description
        }
      } else {
        // 非根目录，使用原有逻辑
        // 优先使用模块描述
        if (data.modules && data.modules.current && data.modules.current.length > 0) {
          description = data.modules.current[0].description || ''
        }

        // 如果没有模块描述，尝试从函数描述中提取
        if (!description && data.functions && Object.keys(data.functions).length > 0) {
          // 获取第一个文件的函数列表
          const firstFileFunctions = Object.values(data.functions)[0]
          if (firstFileFunctions && firstFileFunctions.length > 0) {
            const functionDescriptions = firstFileFunctions
              .map((func) => {
                const parsed = getParsedDescription(func.description)
                return parsed.description
              })
              .filter((desc) => desc && desc.trim())
              .slice(0, 5) // 复制时取前5个函数的描述

            if (functionDescriptions.length > 0) {
              description = functionDescriptions.join('\n\n')
            }
          }
        }
      }

      if (description && description !== '暂无 AI 描述信息') {
        await navigator.clipboard.writeText(description)
        store.dispatch('snackbar/showSnackbar', {
          message: 'AI描述已复制到剪贴板',
          color: 'success'
        })
      } else {
        store.dispatch('snackbar/showSnackbar', {
          message: '该文件暂无AI描述信息',
          color: 'warning'
        })
      }
    } else {
      store.dispatch('snackbar/showSnackbar', {
        message: '获取AI描述失败',
        color: 'error'
      })
    }
  } catch (error) {
    console.error('复制AI描述失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: '复制AI描述失败',
      color: 'error'
    })
  }
}

// 过滤函数列表（用于代码结构搜索）
function filterFunctions(functions) {
  if (!codeStructureSearch.value || codeStructureSearch.value.trim() === '') {
    return functions
  }

  const searchTerm = codeStructureSearch.value.toLowerCase()
  return functions.filter((func) => {
    // 搜索函数名
    if (func.name.toLowerCase().includes(searchTerm)) {
      return true
    }

    // 搜索函数描述
    const parsedDesc = getParsedDescription(func.description)
    if (parsedDesc.description && parsedDesc.description.toLowerCase().includes(searchTerm)) {
      return true
    }

    // 搜索处理流程
    if (
      parsedDesc.process &&
      parsedDesc.process.some((step) => step.toLowerCase().includes(searchTerm))
    ) {
      return true
    }

    return false
  })
}

// 获取函数详细信息
async function fetchFunctionDetails(functionName, packageName, filePath) {
  try {
    functionTooltip.value.loading = true

    // 根据newRootPath从pathSuggestions中找到对应的项目路径
    let repoPath = newRootPath.value
    if (newRootPath.value && pathSuggestions.value.length > 0) {
      // 遍历pathSuggestions，找到包含newRootPath的项目
      const matchedRepo = pathSuggestions.value.find((repo) => {
        // 检查newRootPath是否包含于或等于repo的local_path
        return (
          newRootPath.value.includes(repo.local_path) || repo.local_path.includes(newRootPath.value)
        )
      })

      if (matchedRepo) {
        repoPath = matchedRepo.local_path
        console.log('[DEBUG] 找到匹配的项目路径:', {
          newRootPath: newRootPath.value,
          matchedRepoPath: matchedRepo.local_path,
          repoName: matchedRepo.name
        })
      } else {
        console.warn('[DEBUG] 未找到匹配的项目路径，使用newRootPath:', newRootPath.value)
      }
    }

    // filePath 已经是相对路径，直接使用
    console.log('[DEBUG] 获取函数详情:', { functionName, packageName, filePath, repoPath })

    const response = await getFunctionInfo(repoPath, filePath, packageName, functionName)

    console.log('[DEBUG] 函数详情响应:', response)

    if (response && response.data && response.data.code === 0) {
      functionTooltip.value.data = response.data.data.functions[0] || null
      console.log('[DEBUG] 设置函数详情数据:', functionTooltip.value.data)
    } else {
      functionTooltip.value.data = null
      console.log('[DEBUG] 函数详情响应无效或为空')
    }
  } catch {
    console.error('获取函数详情失败')
    functionTooltip.value.data = null
  } finally {
    functionTooltip.value.loading = false
  }
}

// 切换文件编辑锁定状态
async function toggleFileLock() {
  fileEditLocked.value = !fileEditLocked.value

  // 更新Monaco编辑器的只读状态
  monacoOptions.readOnly = fileEditLocked.value

  if (monacoInstance) {
    monacoInstance.updateOptions({ readOnly: fileEditLocked.value })
  }

  // 如果切换到编辑模式，保存当前文件状态到历史
  if (!fileEditLocked.value && selectedFileName.value && fileContent.value) {
    const currentFilePath = currentTab.value?.path || selectedFileName.value
    await saveToHistory(currentFilePath, fileContent.value, '切换到编辑模式')
  }
}

// 切换时间线显示
async function toggleTimeline() {
  showTimeline.value = !showTimeline.value

  if (showTimeline.value && selectedFileName.value && fileContent.value) {
    // 获取当前文件的完整路径
    const currentFilePath = currentTab.value?.path || selectedFileName.value
    await loadFileHistory(currentFilePath)
  } else {
    // 退出差异模式
    if (showDiffMode.value) {
      exitDiffMode()
    }
  }
}

// 保存文件到历史记录 - 使用 IndexedDB
async function saveToHistory(filePath, content, description = '') {
  try {
    // 检查是否为重复内容
    const isDuplicate = await fileHistoryDB.isDuplicateContent(filePath, content)
    if (isDuplicate) {
      // 根据描述类型提供不同的日志信息
      if (description.includes('恢复到')) {
        console.log(`恢复操作：内容与历史记录重复，无需保存 - ${description}`)
      } else {
        console.log(`跳过保存重复内容 - ${description}`)
      }
      return null // 返回 null 表示没有保存
    }

    // 获取文件语言类型
    const language = getFileLanguage(selectedFileName.value)

    // 保存到 IndexedDB
    const historyItem = await fileHistoryDB.saveHistory(
      filePath,
      content,
      description || `编辑于 ${new Date().toLocaleString()}`,
      { language }
    )

    // 清理过期版本（保留最近 20 个版本）
    await fileHistoryDB.cleanupHistory(filePath, 20)

    console.log('文件历史保存成功:', historyItem)

    // 如果当前正在查看该文件的时间线，刷新历史列表
    if (showTimeline.value && selectedFileName.value === window.electron.path.basename(filePath)) {
      await loadFileHistory(filePath)
    }

    return historyItem
  } catch (error) {
    console.error('保存文件历史失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: `保存历史失败：${error.message}`,
      color: 'error'
    })
    throw error // 重新抛出错误以便调用者处理
  }
}

// 加载文件历史记录 - 使用 IndexedDB
async function loadFileHistory(filePath) {
  try {
    // 从 IndexedDB 加载历史记录
    const history = await fileHistoryDB.getFileHistory(filePath, 50)

    // 转换为组件需要的格式
    fileHistory.value = history.map((item) => ({
      id: item.id,
      filename: window.electron.path.basename(filePath),
      content: item.content,
      timestamp: new Date(item.timestamp),
      size: item.size,
      description: item.description,
      metadata: item.metadata,
      hash: item.hash
    }))

    // 添加当前版本到历史（如果有内容）
    if (fileContent.value) {
      const currentItem = {
        id: 'current',
        filename: window.electron.path.basename(filePath),
        content: fileContent.value,
        timestamp: new Date(),
        size: fileContent.value.length,
        description: '当前版本',
        isCurrent: true
      }
      fileHistory.value.unshift(currentItem) // 添加到最前面
    }

    currentHistoryIndex.value = 0 // 默认选中当前版本
    originalContent.value = fileContent.value // 保存原始内容

    // 加载统计信息
    historyStats.value = await fileHistoryDB.getHistoryStats(filePath)

    console.log(`加载文件历史成功: ${fileHistory.value.length} 个版本`)
  } catch (error) {
    console.error('加载文件历史失败:', error)
    fileHistory.value = []
    currentHistoryIndex.value = -1

    store.dispatch('snackbar/showSnackbar', {
      message: `加载历史失败：${error.message}`,
      color: 'error'
    })
  }
}

// 查看历史版本 - 支持差异模式
async function viewHistoryVersion(index) {
  if (index >= 0 && index < fileHistory.value.length) {
    const historyItem = fileHistory.value[index]
    currentHistoryIndex.value = index
    selectedHistoryItem.value = historyItem

    // 切换到差异模式
    if (!historyItem.isCurrent && originalContent.value) {
      showDiffMode.value = true
      await createDiffEditor(originalContent.value, historyItem.content)
    } else {
      // 如果是当前版本，使用普通编辑器
      showDiffMode.value = false
      if (monacoInstance) {
        monacoInstance.setValue(historyItem.content)
      }
    }
  }
}

// 创建 Monaco 差异编辑器
async function createDiffEditor(originalContent, modifiedContent) {
  try {
    if (!monacoGlobal) {
      console.warn('Monaco 编辑器尚未初始化')
      return
    }

    // 获取编辑器容器 - 直接查询DOM元素
    const mainContainer = document.querySelector('.monaco-container')
    if (!mainContainer) {
      console.warn('Monaco 容器未找到')
      return
    }

    // 清空容器
    mainContainer.innerHTML = ''

    // 确保容器有足够的尺寸
    mainContainer.style.height = '100%'
    mainContainer.style.width = '100%'
    mainContainer.style.minHeight = '400px'

    // 创建差异编辑器
    diffEditor.value = monacoGlobal.editor.createDiffEditor(mainContainer, {
      theme: currentTheme.value,
      readOnly: true,
      automaticLayout: true,
      renderSideBySide: true,
      ignoreTrimWhitespace: false,
      renderOverviewRuler: true,
      diffWordWrap: 'on',
      originalEditable: false,
      modifiedEditable: false,
      scrollBeyondLastLine: false,
      minimap: { enabled: false },
      contextmenu: false
    })

    // 创建模型
    const language = getFileLanguage(selectedFileName.value)
    const originalModel = monacoGlobal.editor.createModel(originalContent, language)
    const modifiedModel = monacoGlobal.editor.createModel(modifiedContent, language)

    // 设置模型
    diffEditor.value.setModel({
      original: originalModel,
      modified: modifiedModel
    })

    // 强制布局更新 - 多次尝试确保正确显示
    setTimeout(() => {
      if (diffEditor.value) {
        diffEditor.value.layout()
        // 再次强制更新布局
        setTimeout(() => {
          if (diffEditor.value) {
            diffEditor.value.layout()
          }
        }, 200)
      }
    }, 100)

    console.log('差异编辑器创建成功')
  } catch (error) {
    console.error('创建差异编辑器失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: `差异显示失败：${error.message}`,
      color: 'error'
    })
  }
}

// 退出差异模式
function exitDiffMode() {
  showDiffMode.value = false

  if (diffEditor.value) {
    diffEditor.value.dispose()
    diffEditor.value = null
  }

  // 恢复普通编辑器
  nextTick(() => {
    if (originalContent.value && selectedFileName.value) {
      // 重新设置文件内容到 Monaco 编辑器
      fileContent.value = originalContent.value
    }
  })
}

// 设置全局快捷键监听
function setupGlobalShortcuts() {
  const handleKeydown = (event) => {
    // 检查是否在编辑模式下
    if (!isCodeFile.value) return

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const ctrlCmd = isMac ? event.metaKey : event.ctrlKey

    // Ctrl/Cmd + S: 保存（需要检查只读状态）
    if (ctrlCmd && event.key === 's') {
      if (fileEditLocked.value) return
      event.preventDefault()
      saveCurrentFile()
      return
    }
  }

  // 添加全局键盘监听
  document.addEventListener('keydown', handleKeydown)

  // 返回清理函数
  return () => {
    document.removeEventListener('keydown', handleKeydown)
  }
}
// 打开差异视图弹窗
function openDiffModal() {
  if (selectedHistoryItem.value && !selectedHistoryItem.value.isCurrent) {
    showDiffModal.value = true
    // 等待DOM更新后创建差异编辑器
    nextTick(() => {
      createDiffModalEditor(originalContent.value, selectedHistoryItem.value.content)
    })
  }
}

// 关闭差异视图弹窗
function closeDiffModal() {
  showDiffModal.value = false
  // 清理差异编辑器实例
  if (diffModalEditor.value) {
    diffModalEditor.value.dispose()
    diffModalEditor.value = null
  }
}

// 在弹窗中创建 Monaco 差异编辑器
async function createDiffModalEditor(originalContent, modifiedContent) {
  try {
    if (!monacoGlobal) {
      console.warn('Monaco 编辑器尚未初始化')
      return
    }

    // 获取弹窗中的编辑器容器
    if (!diffModalContainer.value) {
      console.warn('差异弹窗容器未找到')
      return
    }

    // 清空容器
    diffModalContainer.value.innerHTML = ''

    // 确保容器有足够的尺寸
    diffModalContainer.value.style.height = '70vh'
    diffModalContainer.value.style.width = '100%'
    diffModalContainer.value.style.minHeight = '500px'

    // 创建差异编辑器
    diffModalEditor.value = monacoGlobal.editor.createDiffEditor(diffModalContainer.value, {
      theme: currentTheme.value,
      readOnly: true,
      automaticLayout: true,
      renderSideBySide: true,
      ignoreTrimWhitespace: false,
      renderOverviewRuler: true,
      diffWordWrap: 'on',
      originalEditable: false,
      modifiedEditable: false,
      scrollBeyondLastLine: false,
      minimap: { enabled: true },
      contextmenu: true,
      lineNumbers: 'on',
      glyphMargin: true,
      folding: true
    })

    // 创建模型
    const language = getFileLanguage(selectedFileName.value)
    const originalModel = monacoGlobal.editor.createModel(originalContent, language)
    const modifiedModel = monacoGlobal.editor.createModel(modifiedContent, language)

    // 设置模型
    diffModalEditor.value.setModel({
      original: originalModel,
      modified: modifiedModel
    })

    // 强制布局更新 - 多次尝试确保正确显示
    setTimeout(() => {
      if (diffModalEditor.value) {
        diffModalEditor.value.layout()
        // 再次强制更新布局
        setTimeout(() => {
          if (diffModalEditor.value) {
            diffModalEditor.value.layout()
          }
        }, 200)
      }
    }, 100)

    console.log('弹窗差异编辑器创建成功')
  } catch (error) {
    console.error('创建弹窗差异编辑器失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: `差异显示失败：${error.message}`,
      color: 'error'
    })
  }
}

// 从差异视图中恢复版本
async function restoreFromDiff() {
  if (selectedHistoryItem.value && !selectedHistoryItem.value.isCurrent) {
    // 关闭差异弹窗
    closeDiffModal()
    // 执行恢复操作
    await restoreToHistoryVersion(currentHistoryIndex.value)
  }
}

// 监听窗口大小改变，重新布局差异编辑器
function handleWindowResize() {
  if (diffModalEditor.value && showDiffModal.value) {
    // 延迟重新布局，等待窗口大小改变完成
    setTimeout(() => {
      if (diffModalEditor.value) {
        diffModalEditor.value.layout()
      }
    }, 100)
  }
}
function restoreCurrentVersion() {
  if (fileContent.value && monacoInstance) {
    monacoInstance.setValue(fileContent.value)
    currentHistoryIndex.value = fileHistory.value.length - 1

    store.dispatch('snackbar/showSnackbar', {
      message: '已恢复到当前版本',
      color: 'success'
    })
  }
}

// 恢复到某个历史版本
async function restoreToHistoryVersion(index) {
  if (index >= 0 && index < fileHistory.value.length) {
    const historyItem = fileHistory.value[index]

    if (confirm(`确定要恢复到 "${historyItem.description}" 吗？这将会替换当前的文件内容。`)) {
      try {
        // 设置恢复标志，防止触发自动保存
        isRestoringHistory = true

        // 清除任何挂起的自动保存定时器
        if (saveHistoryTimer) {
          clearTimeout(saveHistoryTimer)
          saveHistoryTimer = null
        }

        // 更新文件内容
        fileContent.value = historyItem.content

        // 更新Monaco编辑器内容（不触发变化事件）
        if (monacoInstance) {
          // 临时移除内容变化监听器
          const model = monacoInstance.getModel()
          if (model) {
            // 使用 pushEditOperations 来设置内容，这样不会触发变化事件
            const fullRange = model.getFullModelRange()
            monacoInstance.executeEdits('restore-history', [
              {
                range: fullRange,
                text: historyItem.content
              }
            ])
          } else {
            monacoInstance.setValue(historyItem.content)
          }
        }

        // 只有在内容确实不同时才保存到历史
        const currentFilePath = currentTab.value?.path || selectedFileName.value

        // 检查是否真的需要保存（避免重复内容）
        const isDuplicate = await fileHistoryDB.isDuplicateContent(
          currentFilePath,
          historyItem.content
        )
        if (!isDuplicate) {
          await saveToHistory(
            currentFilePath,
            historyItem.content,
            `恢复到: ${historyItem.description}`
          )
        } else {
          console.log('恢复的内容与历史记录重复，跳过保存')
        }

        // 退出差异模式
        if (showDiffMode.value) {
          exitDiffMode()
        }

        // 更新原始内容引用
        originalContent.value = historyItem.content

        // 标记为已保存状态
        hasUnsavedChanges.value = false

        store.dispatch('snackbar/showSnackbar', {
          message: `已恢复到: ${historyItem.description}`,
          color: 'success'
        })
      } catch (error) {
        console.error('恢复历史版本失败:', error)
        store.dispatch('snackbar/showSnackbar', {
          message: `恢复失败：${error.message}`,
          color: 'error'
        })
      } finally {
        // 延迟重置恢复标志，确保所有相关操作完成
        setTimeout(() => {
          isRestoringHistory = false
          console.log('恢复历史版本操作完成')
        }, 1000)
      }
    }
  }
}

// 删除历史版本 - 使用 IndexedDB
async function deleteHistoryVersion(index) {
  if (index >= 0 && index < fileHistory.value.length) {
    const historyItem = fileHistory.value[index]

    // 不能删除当前版本
    if (historyItem.isCurrent) {
      store.dispatch('snackbar/showSnackbar', {
        message: '不能删除当前版本',
        color: 'warning'
      })
      return
    }

    if (confirm('确定要删除这个历史版本吗？')) {
      try {
        // 从 IndexedDB 中删除
        await fileHistoryDB.deleteHistory(historyItem.id)

        // 从本地列表中移除
        fileHistory.value.splice(index, 1)

        // 调整 currentHistoryIndex
        if (currentHistoryIndex.value > index) {
          currentHistoryIndex.value--
        } else if (currentHistoryIndex.value === index) {
          currentHistoryIndex.value = Math.min(
            currentHistoryIndex.value,
            fileHistory.value.length - 1
          )
        }

        // 如果当前在差异模式且删除的是选中的项，退出差异模式
        if (showDiffMode.value && selectedHistoryItem.value?.id === historyItem.id) {
          exitDiffMode()
        }

        store.dispatch('snackbar/showSnackbar', {
          message: '历史版本已删除',
          color: 'success'
        })
      } catch (error) {
        console.error('删除历史版本失败:', error)
        store.dispatch('snackbar/showSnackbar', {
          message: `删除失败：${error.message}`,
          color: 'error'
        })
      }
    }
  }
}

// 获取文件大小的友好显示
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 监听文件内容变化，自动保存到历史（防抖）
let saveHistoryTimer = null
let isRestoringHistory = false // 添加标志位，防止恢复时触发自动保存

async function handleContentChange() {
  // 如果正在恢复历史版本，跳过自动保存
  if (isRestoringHistory || (!fileEditLocked.value && selectedFileName.value)) {
    if (isRestoringHistory) {
      console.log('正在恢复历史版本，跳过自动保存')
      return
    }

    // 标记有未保存的更改
    hasUnsavedChanges.value = true

    // 清除之前的定时器
    if (saveHistoryTimer) {
      clearTimeout(saveHistoryTimer)
    }

    // 设置新的定时器，3秒后保存
    saveHistoryTimer = setTimeout(async () => {
      if (fileContent.value && !isRestoringHistory) {
        const currentFilePath = currentTab.value?.path || selectedFileName.value
        await saveToHistory(currentFilePath, fileContent.value, '自动保存')
        // 自动保存后仍然有未保存的更改（只是保存到历史，未保存到磁盘）
        // hasUnsavedChanges.value = true 保持为 true
      }
    }, 3000)
  }
}

// 在onEditorMounted中添加内容变化监听
function setupContentChangeListener(editor) {
  if (editor && editor.onDidChangeModelContent) {
    editor.onDidChangeModelContent(() => {
      handleContentChange()
    })
  }
}

// 处理函数卡片鼠标进入事件
function handleFunctionMouseEnter(event, functionItem, filePath) {
  const rect = event.target.getBoundingClientRect()
  // 确保气泡浮窗不会超出屏幕边界
  const tooltipWidth = 400 // 气泡浮窗最大宽度
  let x = rect.right + 10
  let y = rect.top

  // 如果右侧空间不够，显示在左侧
  if (x + tooltipWidth > window.innerWidth) {
    x = rect.left - tooltipWidth - 10
  }

  // 如果下方空间不够，向上调整
  if (y + 200 > window.innerHeight) {
    y = Math.max(10, y - 200)
  }

  functionTooltip.value.x = x
  functionTooltip.value.y = y
  functionTooltip.value.functionName = functionItem.name
  functionTooltip.value.packageName = functionItem.package || ''
  functionTooltip.value.show = true

  console.log('[DEBUG] 鼠标进入函数卡片:', { functionItem, filePath })
  console.log('[DEBUG] 设置气泡浮窗显示:', functionTooltip.value)
  console.log('[DEBUG] 气泡浮窗位置:', {
    x,
    y,
    rect,
    windowSize: { width: window.innerWidth, height: window.innerHeight }
  })

  // 延迟获取详细信息，避免频繁请求
  setTimeout(() => {
    if (functionTooltip.value.show && functionTooltip.value.functionName === functionItem.name) {
      // filePath 在这里是相对路径，直接传递给 fetchFunctionDetails
      fetchFunctionDetails(functionItem.name, functionItem.package || '', filePath)
    }
  }, 300)
}

// 处理函数卡片鼠标离开事件
function handleFunctionMouseLeave() {
  functionTooltip.value.show = false
  functionTooltip.value.data = null
  functionTooltip.value.loading = false
}

// 在代码中查找文本
// eslint-disable-next-line no-unused-vars
function findInCode() {
  if (!quickFindText.value || !fileContent.value || !monacoInstance) {
    findResults.value = []
    findCurrentIndex.value = -1
    return
  }

  const searchTerm = quickFindText.value

  // 清除之前的搜索装饰
  if (searchDecorations.length) {
    monacoInstance.deltaDecorations(searchDecorations, [])
    searchDecorations = []
  }

  // 使用Monaco的搜索API
  const model = monacoInstance.getModel()
  const matches = model.findMatches(
    searchTerm,
    false, // 不想要搜索整个单词
    false, // 支持正则表达式
    true, // 区分大小写
    null, // 跳过单词分隔符
    true // 支持回滚(可以在前开始)
  )

  findResults.value = matches
  findCurrentIndex.value = findResults.value.length > 0 ? 0 : -1

  // 创建搜索高亮装饰
  if (matches.length > 0) {
    const decorations = matches.map((match) => ({
      range: match.range,
      options: {
        inlineClassName: 'monaco-search-highlight',
        stickiness: monacoGlobal.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
      }
    }))

    // 添加装饰并保存装饰ID
    searchDecorations = monacoInstance.deltaDecorations([], decorations)

    // 当前选中项特殊高亮
    jumpToResult(findCurrentIndex.value)
  }

  // 显示搜索结果数量
  if (findResults.value.length > 0) {
    store.dispatch('snackbar/showSnackbar', {
      message: `找到 ${findResults.value.length} 个匹配结果`,
      color: 'info'
    })
  } else {
    store.dispatch('snackbar/showSnackbar', {
      message: '未找到匹配结果',
      color: 'warning'
    })
  }
}

// 跳转到特定的搜索结果
function jumpToResult(index) {
  if (index < 0 || index >= findResults.value.length) return

  // 如果Monaco实例未初始化，将操作加入等待队列
  if (!monacoReady) {
    console.log(`Monaco编辑器尚未准备好，缓存跳转操作到索引 ${index}`)
    pendingScrollActions.push(() => jumpToResult(index))
    return
  }

  // 再次检查实例
  if (!monacoInstance) {
    console.warn('Monaco编辑器实例仍未初始化，无法跳转到搜索结果')
    return
  }

  // 获取当前选中的结果
  const match = findResults.value[index]

  // 滚动到匹配位置
  monacoInstance.revealRangeInCenter(match.range)

  // 选中文本
  monacoInstance.setSelection(match.range)
}

// 查找下一个结果
// eslint-disable-next-line no-unused-vars
function findNext() {
  if (findResults.value.length === 0) return

  findCurrentIndex.value = (findCurrentIndex.value + 1) % findResults.value.length
  jumpToResult(findCurrentIndex.value)
}

// 查找上一个结果
// eslint-disable-next-line no-unused-vars
function findPrevious() {
  if (findResults.value.length === 0) return

  findCurrentIndex.value =
    (findCurrentIndex.value - 1 + findResults.value.length) % findResults.value.length
  jumpToResult(findCurrentIndex.value)
}

// 切换Monaco编辑器主题
function changeHighlightTheme() {
  highlightThemeDark.value = !highlightThemeDark.value

  // 存储用户的主题偏好
  localStorage.setItem('fileBrowser.highlightDark', highlightThemeDark.value ? 'true' : 'false')

  // 为Monaco编辑器切换主题
  currentTheme.value = highlightThemeDark.value ? 'vs-dark' : 'vs-light'

  // 更新Monaco编辑器选项并应用新主题
  if (monacoInstance) {
    monacoInstance.updateOptions({ theme: currentTheme.value })
  }
}

// 切换左侧面板显示状态
function toggleLeftPanel() {
  showLeftPanel.value = !showLeftPanel.value

  // 存储用户偏好
  localStorage.setItem('fileBrowser.showLeftPanel', showLeftPanel.value.toString())
}

// 切换右侧面板显示状态
function toggleRightPanel() {
  showRightPanel.value = !showRightPanel.value

  // 存储用户偏好
  localStorage.setItem('fileBrowser.showRightPanel', showRightPanel.value.toString())
}

// 解析函数描述
function getParsedDescription(description) {
  if (!description) return { description: '', process: [] }

  try {
    // 尝试解析为JSON对象
    const parsed = JSON.parse(description)

    // 提取描述和处理流程
    return {
      description: parsed.description || '',
      process: Array.isArray(parsed.process) ? parsed.process : []
    }
  } catch {
    // 解析失败，返回原始描述
    return { description: description, process: [] }
  }
}

// 文件操作功能
function createNewFile() {
  newFileName.value = ''
  newFileDialog.value = true
}

function createNewFolder() {
  newFolderName.value = ''
  newFolderDialog.value = true
}

async function confirmCreateFile() {
  if (!newFileName.value.trim()) return

  try {
    // 确定创建目录：优先使用右键菜单的目标路径，其次使用当前选中路径的目录，最后使用根路径
    let currentDir
    if (contextMenu.value.target?.path) {
      // 从右键菜单触发，检查目标是文件还是文件夹
      const targetPath = contextMenu.value.target.path
      try {
        const stats = await window.electron.getFileStats(targetPath)
        currentDir = stats.isDirectory ? targetPath : window.electron.path.dirname(targetPath)
      } catch {
        currentDir = window.electron.path.dirname(targetPath)
      }
    } else {
      // 从其他方式触发（如快捷键）
      currentDir = currentTab.value?.path
        ? window.electron.path.dirname(currentTab.value.path)
        : newRootPath.value
    }

    const newFilePath = window.electron.path.join(currentDir, newFileName.value)

    await window.electron.saveFile(newFilePath, '', { encoding: 'utf-8' })

    // 直接添加新文件节点到目录树
    const newFileNode = {
      name: newFileName.value,
      path: newFilePath,
      isDirectory: false,
      children: undefined
    }
    addNodeToTree(currentDir, newFileNode)

    // 打开新创建的文件
    await loadFileByType(newFilePath)
    const breadcrumbPath = buildBreadcrumb(newFilePath)
    addOrSwitchTab({
      path: newFilePath,
      name: newFileName.value,
      breadcrumbs: breadcrumbPath
    })

    newFileDialog.value = false
    store.dispatch('snackbar/showSnackbar', {
      message: `文件 ${newFileName.value} 创建成功`,
      type: 'success'
    })
  } catch (err) {
    store.dispatch('snackbar/showSnackbar', {
      message: `创建文件失败：${err.message}`,
      type: 'error'
    })
  }
}

async function confirmCreateFolder() {
  if (!newFolderName.value.trim()) return

  try {
    // 确定创建目录：优先使用右键菜单的目标路径，其次使用当前选中路径的目录，最后使用根路径
    let currentDir
    if (contextMenu.value.target?.path) {
      // 从右键菜单触发，检查目标是文件还是文件夹
      const targetPath = contextMenu.value.target.path
      try {
        const stats = await window.electron.getFileStats(targetPath)
        currentDir = stats.isDirectory ? targetPath : window.electron.path.dirname(targetPath)
      } catch {
        currentDir = window.electron.path.dirname(targetPath)
      }
    } else {
      // 从其他方式触发（如快捷键）
      currentDir = currentTab.value?.path
        ? window.electron.path.dirname(currentTab.value.path)
        : newRootPath.value
    }

    const newFolderPath = window.electron.path.join(currentDir, newFolderName.value)

    await window.electron.createDirectory(newFolderPath)

    // 直接添加新文件夹节点到目录树
    const newFolderNode = {
      name: newFolderName.value,
      path: newFolderPath,
      isDirectory: true,
      children: [] // 新建的空文件夹，子内容为空数组
    }
    addNodeToTree(currentDir, newFolderNode)

    newFolderDialog.value = false
    store.dispatch('snackbar/showSnackbar', {
      message: `文件夹 ${newFolderName.value} 创建成功`,
      type: 'success'
    })
  } catch (err) {
    store.dispatch('snackbar/showSnackbar', {
      message: `创建文件夹失败：${err.message}`,
      type: 'error'
    })
  }
}

// 重命名文件/文件夹
async function renameFile(filePath) {
  renameTargetPath.value = filePath
  renameValue.value = window.electron.path.basename(filePath)
  renameDialog.value = true
}

// 确认重命名
async function confirmRename() {
  if (!renameValue.value.trim() || !renameTargetPath.value) return

  try {
    const oldPath = renameTargetPath.value
    const newPath = window.electron.path.join(
      window.electron.path.dirname(oldPath),
      renameValue.value
    )

    // 检查新文件名是否与原文件名相同
    if (oldPath === newPath) {
      renameDialog.value = false
      return
    }

    // 检查新文件是否已存在
    try {
      await window.electron.getFileStats(newPath)
      store.dispatch('snackbar/showSnackbar', {
        message: '文件名已存在，请选择其他名称',
        type: 'error'
      })
      return
    } catch {
      // 文件不存在，可以继续重命名
    }

    // 使用move接口进行重命名
    await window.electron.moveFile(oldPath, newPath)

    // 如果重命名的是当前打开的文件，更新标签页
    const tabIndex = tabs.value.findIndex((tab) => tab.path === oldPath)
    if (tabIndex !== -1) {
      tabs.value[tabIndex].path = newPath
      tabs.value[tabIndex].name = window.electron.path.basename(newPath)
      if (activeTab.value === tabIndex) {
        // 更新当前选中的文件路径
        if (currentTab.value) {
          currentTab.value.path = newPath
        }
      }
    }

    // 直接更新目录树中的节点
    updateNodeInTree(oldPath, newPath)

    renameDialog.value = false
    store.dispatch('snackbar/showSnackbar', {
      message: `重命名成功`,
      type: 'success'
    })
  } catch (err) {
    store.dispatch('snackbar/showSnackbar', {
      message: `重命名失败：${err.message}`,
      type: 'error'
    })
  }
}

// 直接操作树节点的函数
function addNodeToTree(parentPath, newNode) {
  const parentNode = findNodeByPath(treeData.value, parentPath)
  if (parentNode && parentNode.isDirectory) {
    if (!parentNode.children) {
      parentNode.children = []
    }
    // 检查节点是否已存在
    const existingIndex = parentNode.children.findIndex((child) => child.path === newNode.path)
    if (existingIndex === -1) {
      // 插入新节点并保持排序（目录在前，文件在后，按名称排序）
      const insertIndex = parentNode.children.findIndex((child) => {
        if (newNode.isDirectory && !child.isDirectory) return true
        if (!newNode.isDirectory && child.isDirectory) return false
        return newNode.name.localeCompare(child.name) < 0
      })
      if (insertIndex === -1) {
        parentNode.children.push(newNode)
      } else {
        parentNode.children.splice(insertIndex, 0, newNode)
      }
    }
  }
}

function removeNodeFromTree(nodePath) {
  const parentPath = window.electron.path.dirname(nodePath)
  const parentNode = findNodeByPath(treeData.value, parentPath)
  if (parentNode && parentNode.children) {
    const nodeIndex = parentNode.children.findIndex((child) => child.path === nodePath)
    if (nodeIndex !== -1) {
      parentNode.children.splice(nodeIndex, 1)
    }
  }
}

function updateNodeInTree(oldPath, newPath) {
  const node = findNodeByPath(treeData.value, oldPath)
  if (node) {
    node.path = newPath
    node.name = window.electron.path.basename(newPath)
    // 如果节点有子节点，需要递归更新所有子节点的路径
    if (node.children) {
      updateChildrenPaths(node.children, oldPath, newPath)
    }
  }
}

function updateChildrenPaths(children, oldParentPath, newParentPath) {
  children.forEach((child) => {
    const relativePath = window.electron.path.relative(oldParentPath, child.path)
    child.path = window.electron.path.join(newParentPath, relativePath)
    if (child.children) {
      updateChildrenPaths(child.children, oldParentPath, newParentPath)
    }
  })
}

// 删除文件
async function deleteFileByPath(filePath) {
  const confirmed = await window.electron.showMessageBox({
    type: 'warning',
    buttons: ['删除', '取消'],
    defaultId: 1,
    message: `确定要删除 "${window.electron.path.basename(filePath)}" 吗？`,
    detail: '此操作不可撤销。'
  })

  if (confirmed.response === 0) {
    try {
      await window.electron.deleteFile(filePath)

      // 关闭对应的标签页
      const tabIndex = tabs.value.findIndex((tab) => tab.path === filePath)
      if (tabIndex !== -1) {
        removeTab(tabIndex)
      }

      // 直接从目录树中删除节点
      removeNodeFromTree(filePath)

      store.dispatch('snackbar/showSnackbar', {
        message: '文件删除成功',
        type: 'success'
      })
    } catch (err) {
      store.dispatch('snackbar/showSnackbar', {
        message: `删除文件失败：${err.message}`,
        type: 'error'
      })
    }
  }
}

// 右键菜单功能
function showContextMenu(event, type, target = null) {
  event.preventDefault()
  event.stopPropagation()

  const items = getContextMenuItems(type, target)

  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    items,
    target,
    targetType: type
  }

  // 确保菜单不会超出屏幕边界
  nextTick(() => {
    const menu = document.querySelector('.context-menu')
    if (menu) {
      const rect = menu.getBoundingClientRect()
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight

      if (rect.right > windowWidth) {
        contextMenu.value.x = windowWidth - rect.width - 10
      }
      if (rect.bottom > windowHeight) {
        contextMenu.value.y = windowHeight - rect.height - 10
      }
    }
  })
}

function hideContextMenu() {
  contextMenu.value.show = false
}

function getContextMenuItems(type) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const cmdOrCtrl = isMac ? 'Cmd' : 'Ctrl'

  if (type === 'tab') {
    return [
      {
        id: 'open-in-folder',
        label: '在文件夹中显示',
        icon: menuIcons.folder,
        action: 'openInFolder'
      },
      { separator: true },
      {
        id: 'copy-path',
        label: '复制路径',
        icon: menuIcons.copyPath,
        action: 'copyPath'
      },
      { separator: true },
      {
        id: 'close-tab',
        label: '关闭',
        shortcut: `${cmdOrCtrl}+W`,
        action: 'closeTab'
      },
      {
        id: 'close-other-tabs',
        label: '关闭其他标签页',
        action: 'closeOtherTabs'
      },
      {
        id: 'close-all-tabs',
        label: '关闭所有标签页',
        action: 'closeAllTabs'
      }
    ]
  }

  if (type === 'file') {
    return [
      {
        id: 'build-index',
        label: '构建索引',
        action: 'buildIndex'
      },
      {
        id: 'analysis-report',
        label: '生成代码分析报告',
        action: 'analysisReport'
      },
      {
        id: 'generate-flowchart',
        label: '解释并生成流程图',
        action: 'generateFlowchart'
      },
      {
        id: 'copy-ai-description',
        label: '复制AI描述',
        action: 'copyAiDescription'
      },
      { separator: true },
      {
        id: 'open',
        label: '打开',
        icon: menuIcons.open,
        action: 'openFile'
      },
      {
        id: 'open-in-folder',
        label: '在文件夹中显示',
        icon: menuIcons.folder,
        action: 'openInFolder'
      },
      { separator: true },
      {
        id: 'copy',
        label: '复制',
        icon: menuIcons.copy,
        shortcut: `${cmdOrCtrl}+C`,
        action: 'copyFile'
      },
      {
        id: 'cut',
        label: '剪切',
        icon: menuIcons.cut,
        shortcut: `${cmdOrCtrl}+X`,
        action: 'cutFile'
      },
      {
        id: 'paste',
        label: '粘贴',
        icon: menuIcons.paste,
        shortcut: `${cmdOrCtrl}+V`,
        action: 'pasteFile',
        disabled: !clipboard.value.path
      },
      { separator: true },
      {
        id: 'new-file',
        label: '新建文件',
        icon: menuIcons.newFile,
        shortcut: `${cmdOrCtrl}+N`,
        action: 'newFile'
      },
      {
        id: 'new-folder',
        label: '新建文件夹',
        icon: menuIcons.newFolder,
        action: 'newFolder'
      },
      { separator: true },
      {
        id: 'rename',
        label: '重命名',
        icon: menuIcons.rename,
        shortcut: 'F2',
        action: 'renameFile'
      },
      {
        id: 'copy-path',
        label: '复制路径',
        icon: menuIcons.copyPath,
        action: 'copyPath'
      },
      { separator: true },
      {
        id: 'delete',
        label: '删除',
        icon: menuIcons.delete,
        shortcut: 'Delete',
        action: 'deleteFile'
      }
    ]
  }

  if (type === 'folder') {
    return [
      {
        id: 'expand-all',
        label: '全部展开',
        icon: menuIcons.expand,
        action: 'expandAll'
      },
      {
        id: 'collapse-all',
        label: '全部折叠',
        icon: menuIcons.collapse,
        action: 'collapseAll'
      },
      { separator: true },
      {
        id: 'folder-stats',
        label: '文件夹统计',
        icon: menuIcons.stats,
        action: 'showFolderStats'
      },
      { separator: true },
      {
        id: 'build-index',
        label: '构建索引',
        action: 'buildIndex'
      },
      {
        id: 'analysis-report',
        label: '生成代码分析报告',
        action: 'analysisReport'
      },
      {
        id: 'generate-flowchart',
        label: '解释并生成流程图',
        action: 'generateFlowchart'
      },
      {
        id: 'copy-ai-description',
        label: '复制AI描述',
        action: 'copyAiDescription'
      },
      { separator: true },
      {
        id: 'open-in-folder',
        label: '在文件夹中显示',
        icon: menuIcons.folder,
        action: 'openInFolder'
      },
      { separator: true },
      {
        id: 'copy',
        label: '复制',
        icon: menuIcons.copy,
        shortcut: `${cmdOrCtrl}+C`,
        action: 'copyFile'
      },
      {
        id: 'cut',
        label: '剪切',
        icon: menuIcons.cut,
        shortcut: `${cmdOrCtrl}+X`,
        action: 'cutFile'
      },
      {
        id: 'paste',
        label: '粘贴',
        icon: menuIcons.paste,
        shortcut: `${cmdOrCtrl}+V`,
        action: 'pasteFile',
        disabled: !clipboard.value.path
      },
      { separator: true },
      {
        id: 'new-file',
        label: '新建文件',
        icon: menuIcons.newFile,
        shortcut: `${cmdOrCtrl}+N`,
        action: 'newFile'
      },
      {
        id: 'new-folder',
        label: '新建文件夹',
        icon: menuIcons.newFolder,
        action: 'newFolder'
      },
      { separator: true },
      {
        id: 'rename',
        label: '重命名',
        icon: menuIcons.rename,
        shortcut: 'F2',
        action: 'renameFile'
      },
      {
        id: 'copy-path',
        label: '复制路径',
        icon: menuIcons.copyPath,
        action: 'copyPath'
      },
      { separator: true },
      {
        id: 'delete',
        label: '删除',
        icon: menuIcons.delete,
        shortcut: 'Delete',
        action: 'deleteFile'
      }
    ]
  }

  return []
}

// 标签页右键菜单处理
function handleTabContextMenu(event, tab, index) {
  showContextMenu(event, 'tab', { tab, index })
}

// 右键菜单动作处理
async function handleContextMenuAction(action) {
  const target = contextMenu.value.target
  hideContextMenu()

  try {
    switch (action) {
      case 'buildIndex':
        if (target?.path) {
          await checkIndexStatus4Toolbar(target.path)
        }
        break

      case 'analysisReport':
        if (target?.path) {
          await generateAnalysisReportForPath(target.path)
        }
        break

      case 'generateFlowchart':
        if (target?.path) {
          await generateFlowchartForPath(target.path)
        }
        break

      case 'copyAiDescription':
        if (target?.path) {
          await copyAiDescriptionToClipboard(target.path)
        }
        break

      case 'expandAll':
        await expandAllNodes(target?.path)
        break

      case 'collapseAll':
        await collapseAllNodes(target?.path)
        break

      case 'showFolderStats':
        if (target?.path) {
          await showFolderStatistics(target.path)
        }
        break

      case 'openFile':
        if (target?.path) {
          await loadFileByType(target.path)
          const breadcrumbPath = buildBreadcrumb(target.path)
          addOrSwitchTab({
            path: target.path,
            name: window.electron.path.basename(target.path),
            breadcrumbs: breadcrumbPath
          })
        }
        break

      case 'openInFolder': {
        const pathToShow = target?.tab?.path || target?.path
        if (pathToShow) {
          await window.electron.showItemInFolder(pathToShow)
        }
        break
      }

      case 'copyFile':
        if (target?.path || target?.tab?.path) {
          clipboard.value = {
            type: 'copy',
            path: target?.path || target?.tab?.path
          }
          store.dispatch('snackbar/showSnackbar', {
            message: '已复制到剪贴板',
            type: 'success'
          })
        }
        break

      case 'cutFile':
        if (target?.path || target?.tab?.path) {
          clipboard.value = {
            type: 'cut',
            path: target?.path || target?.tab?.path
          }
          store.dispatch('snackbar/showSnackbar', {
            message: '已剪切到剪贴板',
            type: 'success'
          })
        }
        break

      case 'pasteFile':
        if (clipboard.value.path) {
          await handlePasteFile(target?.path || newRootPath.value)
        }
        break

      case 'copyPath': {
        const pathToCopy = target?.tab?.path || target?.path
        if (pathToCopy) {
          await navigator.clipboard.writeText(pathToCopy)
          store.dispatch('snackbar/showSnackbar', {
            message: '路径已复制到剪贴板',
            type: 'success'
          })
        }
        break
      }

      case 'closeTab':
        if (target?.index !== undefined) {
          removeTab(target.index)
        }
        break

      case 'closeOtherTabs':
        closeOtherTabs()
        break

      case 'closeAllTabs':
        closeAllTabs()
        break

      case 'newFile':
        createNewFile()
        break

      case 'newFolder':
        createNewFolder()
        break

      case 'renameFile': {
        const pathToRename = target?.path || target?.tab?.path
        if (pathToRename) {
          await renameFile(pathToRename)
        }
        break
      }

      case 'deleteFile': {
        const pathToDelete = target?.path || target?.tab?.path
        if (pathToDelete) {
          await deleteFileByPath(pathToDelete)
        }
        break
      }
    }
  } catch (error) {
    store.dispatch('snackbar/showSnackbar', {
      message: `操作失败：${error.message}`,
      type: 'error'
    })
  }
}

// 粘贴文件处理
async function handlePasteFile(targetDir) {
  if (!clipboard.value.path) return

  const sourcePath = clipboard.value.path
  const fileName = window.electron.path.basename(sourcePath)

  // 检查目标路径是否为目录，如果是文件则使用其父目录
  let actualTargetDir = targetDir
  try {
    const stats = await window.electron.getFileStats(targetDir)
    if (!stats.isDirectory) {
      actualTargetDir = window.electron.path.dirname(targetDir)
    }
  } catch (error) {
    // 如果获取文件状态失败，假设是目录
    console.warn('无法获取目标路径状态，假设为目录:', error)
  }

  // 检查actualTargetDir，如果与sourcePath属于同级目录，则忽略操作
  if (window.electron.path.dirname(sourcePath) === actualTargetDir) {
    store.dispatch('snackbar/showSnackbar', {
      message: '无法将文件移动到自身',
      type: 'warning'
    })
    return
  }
  const targetPath = window.electron.path.join(actualTargetDir, fileName)

  try {
    if (clipboard.value.type === 'copy') {
      await window.electron.copyFile(sourcePath, targetPath)

      // 直接添加复制的文件/文件夹节点到目标目录
      const stats = await window.electron.getFileStats(targetPath)
      const newNode = {
        name: fileName,
        path: targetPath,
        isDirectory: stats.isDirectory,
        children: stats.isDirectory ? null : undefined
      }
      addNodeToTree(actualTargetDir, newNode)

      store.dispatch('snackbar/showSnackbar', {
        message: '文件复制成功',
        type: 'success'
      })
    } else if (clipboard.value.type === 'cut') {
      await window.electron.moveFile(sourcePath, targetPath)

      // 从原位置删除节点
      removeNodeFromTree(sourcePath)

      // 在目标位置添加节点
      const stats = await window.electron.getFileStats(targetPath)
      const newNode = {
        name: fileName,
        path: targetPath,
        isDirectory: stats.isDirectory,
        children: stats.isDirectory ? null : undefined
      }
      addNodeToTree(actualTargetDir, newNode)

      clipboard.value = { type: null, path: null } // 清空剪贴板
      store.dispatch('snackbar/showSnackbar', {
        message: '文件移动成功',
        type: 'success'
      })
    }
  } catch (error) {
    store.dispatch('snackbar/showSnackbar', {
      message: `操作失败：${error.message}`,
      type: 'error'
    })
  }
}

// 标签页操作函数
function closeOtherTabs() {
  if (tabs.value.length <= 1) return

  const currentTab = tabs.value[activeTab.value]
  tabs.value = [currentTab]
  activeTab.value = 0
}

function closeAllTabs() {
  tabs.value = []
  activeTab.value = -1
  fileContent.value = ''
  selectedFileName.value = ''
}
</script>

<style scoped>
.monaco-container {
  width: 100%;
  height: 100%;
}
.code-container {
  position: relative;
  width: 100%;
  overflow: auto;
  max-height: calc(100vh - 150px);
}

.code-table {
  width: 100%;
  border-collapse: collapse;
  font-family: monospace;
}

.line-number {
  color: #999;
  font-size: 0.85rem;
  line-height: 1.5;
  padding: 0 0.5rem;
  text-align: right;
  user-select: none;
  background: rgb(var(--v-theme-on-tertiary));
  border-right: 1px solid rgb(var(--v-theme-on-tertiary));
  min-width: 4rem;
  vertical-align: top;
  white-space: nowrap;
}

.code-line {
  padding-left: 0.5rem;
  white-space: pre;
  width: 100%;
}

.code-line code {
  display: block;
  font-family: monospace;
  min-height: 1.5em; /* 确保空白行也有最小高度 */
}

.highlighted-line {
  background-color: rgba(255, 215, 0, 0.3);
  font-weight: bold;
  color: #333;
}

/* 搜索结果高亮 */
.search-highlight {
  background-color: rgba(255, 165, 0, 0.4);
  border-radius: 2px;
  padding: 1px;
}

/* 搜索结果文件夹样式 */
.search-result-folder {
  background-color: rgba(64, 158, 255, 0.1);
  border-radius: 4px;
  padding: 2px 4px;
  margin: 1px 0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-result-folder:hover {
  background-color: rgba(64, 158, 255, 0.2);
}

.search-expand-hint {
  color: #409eff;
  font-size: 12px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.search-result-folder:hover .search-expand-hint {
  opacity: 1;
}

/* 搜索进度样式 */
.search-progress-container {
  margin-top: 8px;
  padding: 8px;
  background-color: rgba(64, 158, 255, 0.05);
  border-radius: 4px;
  border: 1px solid rgba(64, 158, 255, 0.2);
}

.search-progress-bar {
  width: 100%;
  height: 4px;
  background-color: rgba(64, 158, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.search-progress-fill {
  height: 100%;
  background-color: #409eff;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.search-progress-text {
  font-size: 12px;
  color: #409eff;
  font-weight: 500;
}

/* AI 描述 markdown 样式 */
.ai-description-content {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: inherit;
}

.ai-description-content h1,
.ai-description-content h2,
.ai-description-content h3,
.ai-description-content h4,
.ai-description-content h5,
.ai-description-content h6 {
  margin-top: 16px;
  margin-bottom: 8px;
  font-weight: 600;
  line-height: 1.25;
  color: inherit;
}

.ai-description-content h1 {
  font-size: 1.5em;
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.2);
  padding-bottom: 0.3em;
}

.ai-description-content h2 {
  font-size: 1.25em;
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.2);
  padding-bottom: 0.3em;
}

.ai-description-content h3 {
  font-size: 1.1em;
}

.ai-description-content p {
  margin-bottom: 12px;
}

.ai-description-content ul,
.ai-description-content ol {
  margin-bottom: 12px;
  padding-left: 20px;
}

.ai-description-content li {
  margin-bottom: 4px;
}

.ai-description-content code {
  background-color: rgba(var(--v-theme-primary), 0.1);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9em;
}

.ai-description-content pre {
  background-color: rgba(var(--v-theme-primary), 0.05);
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin-bottom: 12px;
}

.ai-description-content pre code {
  background-color: transparent;
  padding: 0;
}

.ai-description-content blockquote {
  border-left: 4px solid rgba(var(--v-theme-primary), 0.3);
  margin: 12px 0;
  padding-left: 16px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.ai-description-content a {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.ai-description-content a:hover {
  text-decoration: underline;
}

/* 悬停提示气泡样式 */
.hover-tooltip-card {
  background-color: rgba(0, 0, 0, 0.9) !important;
  color: white !important;
}

/* 日间模式下的悬停提示气泡样式 */
.v-theme--light .hover-tooltip-card {
  background-color: #f3f3f3 !important;
  color: #616161 !important;
}

/* 悬停提示 markdown 样式 */
.hover-tooltip-content {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.4;
  color: white;
}

.hover-tooltip-content h1,
.hover-tooltip-content h2,
.hover-tooltip-content h3,
.hover-tooltip-content h4,
.hover-tooltip-content h5,
.hover-tooltip-content h6 {
  margin-top: 8px;
  margin-bottom: 4px;
  font-weight: 600;
  line-height: 1.2;
  color: white;
  font-size: 0.9em;
}

/* 日间模式下的文字颜色 */
.v-theme--light .hover-tooltip-content {
  color: #616161 !important;
}

.v-theme--light .hover-tooltip-content h1,
.v-theme--light .hover-tooltip-content h2,
.v-theme--light .hover-tooltip-content h3,
.v-theme--light .hover-tooltip-content h4,
.v-theme--light .hover-tooltip-content h5,
.v-theme--light .hover-tooltip-content h6 {
  color: #616161 !important;
}

.hover-tooltip-content p {
  margin-bottom: 6px;
  font-size: 0.8em;
}

.hover-tooltip-content ul,
.hover-tooltip-content ol {
  margin-bottom: 6px;
  padding-left: 16px;
  font-size: 0.8em;
}

.hover-tooltip-content li {
  margin-bottom: 2px;
}

.hover-tooltip-content code {
  background-color: rgba(255, 255, 255, 0.2);
  padding: 1px 3px;
  border-radius: 2px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.75em;
}

.hover-tooltip-content a {
  color: #79c0ff;
  text-decoration: none;
}

.hover-tooltip-content a:hover {
  text-decoration: underline;
}

/* 日间模式下的代码块和链接颜色 */
.v-theme--light .hover-tooltip-content code {
  background-color: rgba(97, 97, 97, 0.15);
  color: #616161;
}

.v-theme--light .hover-tooltip-content a {
  color: #1976d2;
}

.v-theme--light .hover-tooltip-content a:hover {
  color: #1565c0;
}

/* AI 描述折叠样式 */
.ai-description-collapsed {
  position: relative;
}

/* 修改tr被选中时的样式 */
.code-table tr:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.description-text {
  max-height: 100px;
  white-space: normal;
  line-height: 1.4;
  overflow-y: auto;
}

.process-text {
  max-height: 150px;
  overflow-y: auto;
  white-space: normal;
  line-height: 1.4;
  background-color: rgb(var(--v-theme-on-surface-variant));
  color: rgb(var(--v-theme-surface-variant));
  padding: 6px;
  border-radius: 4px;
  margin-top: 4px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}
pre {
  font-size: 0.9rem;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
:deep(.v-card) {
  min-height: 200px;
}
:deep(.v-application) {
  height: 100%;
}
html,
body {
  height: 100%;
  overflow: hidden;
}
/* El-tree-v2 styles with theme support */
@media (prefers-color-scheme: dark) {
  :deep(.el-tree) {
    --el-tree-node-hover-bg-color: rgba(255, 255, 255, 0.1);
    --el-tree-text-color: rgb(235, 235, 235);
    --el-tree-expand-icon-color: rgb(180, 180, 180);
    --el-fill-color-light: rgba(255, 255, 255, 0.1);
    --el-fill-color-blank: rgb(30, 30, 30);
    background-color: rgb(30, 30, 30);
    color: rgb(235, 235, 235);
    border-radius: 4px;
  }

  :deep(.el-tree-v2) {
    background-color: rgb(30, 30, 30);
    color: rgb(235, 235, 235);
  }

  :deep(.el-input__wrapper) {
    background-color: rgb(30, 30, 30);
    color: rgb(235, 235, 235);
  }

  :deep(.el-tree-node__content) {
    height: 28px;
    line-height: 28px;
  }

  :deep(.el-tree-node__content:hover) {
    background-color: rgba(255, 255, 255, 0.1) !important;
  }

  :deep(.el-tree-node.is-current > .el-tree-node__content) {
    background-color: rgba(64, 158, 255, 0.2) !important;
    color: #409eff !important;
  }

  :deep(.el-tree-node__expand-icon) {
    color: rgb(180, 180, 180) !important;
  }

  :deep(.el-tree-node__label) {
    font-size: 0.9rem;
    color: rgb(235, 235, 235) !important;
  }

  :deep(.el-tree__empty-block) {
    background-color: #111 !important;
    border-radius: 4px;
  }

  :deep(.el-tree-node__content:hover) {
    background-color: #111 !important;
  }
}
.breadcrumb-container {
  overflow-x: auto;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  max-width: 100%;
}
.breadcrumb-container::-webkit-scrollbar {
  height: 0px;
}
.breadcrumb-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.breadcrumb-container::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 2px;
}
:deep(.v-breadcrumbs) {
  flex-wrap: nowrap;
  min-width: min-content;
}
/* 动态加载容器 */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

/* 动态加载SVG（也可增加动画效果） */
.loading-svg {
  width: 80px;
  height: auto;
}

/* 文件浏览器主布局 */
.file-browser-layout {
  display: flex;
  flex-direction: column;
  height: 94vh;
  overflow: hidden;
}

/* 工具栏容器 */
.toolbar-container {
  flex: 0 0 auto;
}

/* 内容容器 */
.content-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  height: calc(100vh - 48px);
}

/* 左侧文件树面板 */
.file-tree-panel {
  flex: 0 0 auto;
  height: 100%;
  overflow: auto;
  padding: 4px;
}

/* 拖拽分隔条 */
.resizer {
  width: 6px;
  cursor: col-resize;
  background: transparent;
  position: relative;
}
.resizer::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 1px;
  right: 1px;
  border-left: 1px solid rgba(0, 0, 0, 0.06);
  border-right: 1px solid rgba(0, 0, 0, 0.06);
}
.resizer:hover::after,
body.resizing .resizer::after {
  border-left-color: rgba(0, 0, 0, 0.15);
  border-right-color: rgba(0, 0, 0, 0.15);
}
.resizer-left {
  flex: 0 0 auto;
}
.resizer-right {
  flex: 0 0 auto;
}

.file-tree-card {
  height: 100%;
  overflow-y: hidden;
  overflow-x: auto;
}

/* 右侧文件内容面板 */
.file-content-panel {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 4px;
}

/* 代码索引侧边栏 */
.code-index-sidebar {
  max-height: calc(100vh - 150px);
  overflow-y: auto;
  padding: 8px;
  flex: 0 0 auto;
}

/* 文件预览卡片 */
.file-preview-card {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 150px);
  overflow: hidden;
}

.file-preview-container {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
:deep(.v-slide-group__container, .v-tabs) {
  /* 确保标签栏不滚动 */
  overflow: hidden;
}
/* El-tree-v2 selected node style */
:deep(.el-tree-node.is-selected > .el-tree-node__content) {
  background: rgb(var(--v-theme-on-surface-variant)) !important;
  color: rgb(var(--v-theme-surface-variant)) !important;
}
/* 默认（亮色模式）的样式 */
.hljs {
  background-color: #f5f5f5; /* 亮色背景 */
  color: #333333; /* 亮色文本 */
}

/* 暗黑模式的样式 */
@media (prefers-color-scheme: dark) {
  .hljs {
    background-color: #000000; /* 暗色背景 */
    color: #dcdcdc; /* 暗色文本 */
  }
}
.preview-content {
  height: 80vh;
}
.preview-content pre {
  /* 保持原有空格格式，不自动换行 */
  white-space: pre; /* 强制按照原始空白和换行显示 */
  word-wrap: normal; /* 禁用单词换行 */
  word-break: normal; /* 禁用任意字符换行 */

  /* 横向滚动条，超出宽度时显示 */
  overflow-x: auto;
  overflow-y: hidden; /* 可选：隐藏垂直滚动条 */

  font-size: 0.8rem;
}
.preview-content code.hljs {
  white-space: pre !important;
}
:deep(.v-input__control) {
  height: 50px;
  width: auto;
}

/* 强制覆盖markdown内容样式 - 使用:deep()穿透 */
:deep(.markdown-content),
:deep([v-html]) {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
  line-height: 1.6 !important;
  color: inherit !important;
}

:deep(.markdown-content) h1,
:deep(.markdown-content) h2,
:deep(.markdown-content) h3,
:deep(.markdown-content) h4,
:deep(.markdown-content) h5,
:deep(.markdown-content) h6,
:deep([v-html]) h1,
:deep([v-html]) h2,
:deep([v-html]) h3,
:deep([v-html]) h4,
:deep([v-html]) h5,
:deep([v-html]) h6 {
  margin-top: 24px !important;
  margin-bottom: 16px !important;
  font-weight: 600 !important;
  line-height: 1.25 !important;
  color: inherit !important;
}

:deep(.markdown-content) h1,
:deep([v-html]) h1 {
  font-size: 2em !important;
  border-bottom: 1px solid #eaecef !important;
  padding-bottom: 0.3em !important;
}

:deep(.markdown-content) h2,
:deep([v-html]) h2 {
  font-size: 1.5em !important;
  border-bottom: 1px solid #eaecef !important;
  padding-bottom: 0.3em !important;
}

:deep(.markdown-content) h3,
:deep([v-html]) h3 {
  font-size: 1.25em !important;
}

:deep(.markdown-content) h4,
:deep([v-html]) h4 {
  font-size: 1em !important;
}

:deep(.markdown-content) a,
:deep([v-html]) a {
  color: #0366d6 !important;
  text-decoration: none !important;
}

:deep(.markdown-content) p,
:deep(.markdown-content) li,
:deep(.markdown-content) td,
:deep([v-html]) p,
:deep([v-html]) li,
:deep([v-html]) td {
  margin-bottom: 16px !important;
}

:deep(.markdown-content) th,
:deep([v-html]) th {
  background-color: #21262d !important;
  color: #ffffff !important;
}

:deep(.markdown-content) table,
:deep([v-html]) table {
  border-color: #30363d !important;
}

:deep(.markdown-content) th,
:deep(.markdown-content) td,
:deep([v-html]) th,
:deep([v-html]) td {
  border-color: #30363d !important;
}

:deep(.markdown-content) a,
:deep([v-html]) a {
  color: #58a6ff !important;
}

:deep(.markdown-content) a:hover,
:deep([v-html]) a:hover {
  color: #79c0ff !important;
}
:deep(.markdown-content) img,
:deep([v-html]) img {
  max-width: 100% !important;
}
:deep(.v-field__input) {
  font-size: 0.8em !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  margin-top: 4px !important;
}
:deep(.v-autocomplete__selection) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}
.tab-item {
  max-width: 300px !important;
}
.tabs-wrapper {
  overflow-x: auto !important;
}

/* Code search container styles */
.code-search-container {
  position: fixed;
  top: 80px;
  right: 36px;
  z-index: 20;
  width: 250px;
  height: 40px;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.13);
  border-radius: 8px;
  padding: 14px 18px;
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
}

.code-search-container.dark-theme {
  background: rgba(30, 30, 30, 0.99) !important;
  border: 1px solid #383838 !important;
  color: #e2e8f0 !important;
}

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  background: rgba(var(--v-theme-surface), 1);
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  min-width: 200px;
  padding: 4px 0;
  backdrop-filter: blur(8px);
}

.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: transparent;
}

.context-menu-option {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.context-menu-option:hover:not(.disabled) {
  background: rgba(var(--v-theme-primary), 0.1);
}

.context-menu-option.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.context-menu-icon {
  width: 16px;
  height: 16px;
  margin-right: 12px;
  flex-shrink: 0;
}

.menu-icon {
  width: 100%;
  height: 100%;
  fill: currentColor;
}

.context-menu-text {
  flex: 1;
  white-space: nowrap;
}

.context-menu-shortcut {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-left: 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.context-menu-separator {
  height: 1px;
  background: rgba(var(--v-theme-outline), 0.1);
  margin: 4px 0;
}

/* Ant Design 组件深度样式覆盖 */
:deep(.ant-select-selector) {
  transition: all 0.3s ease !important;
}

/* 暗色主题下的 Ant Design 选择器样式 */
.v-theme--dark :deep(.ant-select-selector) {
  background-color: #1e1e1e !important;
  border-color: #4a5568 !important;
  color: #e2e8f0 !important;
}

.v-theme--dark :deep(.ant-select-selector:hover) {
  border-color: #6b7280 !important;
}

.v-theme--dark :deep(.ant-select-selector:focus) {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
}

/* 暗色主题下的下拉框样式 */
.v-theme--dark :deep(.ant-select-dropdown) {
  background-color: #1e1e1e !important;
  border-color: #4a5568 !important;
}

.v-theme--dark :deep(.ant-select-item) {
  color: #e2e8f0 !important;
  background-color: transparent !important;
}

.v-theme--dark :deep(.ant-select-item:hover) {
  background-color: #374151 !important;
}

.v-theme--dark :deep(.ant-select-item-option-selected) {
  background-color: #3b82f6 !important;
  color: white !important;
}

/* 亮色主题下的 Ant Design 选择器样式 */
.v-theme--light :deep(.ant-select-selector) {
  background-color: white !important;
  border-color: #d1d5db !important;
  color: inherit !important;
}

.v-theme--light :deep(.ant-select-selector:hover) {
  border-color: #9ca3af !important;
}

.v-theme--light :deep(.ant-select-selector:focus) {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
}

/* 亮色主题下的下拉框样式 */
.v-theme--light :deep(.ant-select-dropdown) {
  background-color: white !important;
  border-color: #d1d5db !important;
}

.v-theme--light :deep(.ant-select-item) {
  color: inherit !important;
  background-color: transparent !important;
}

.v-theme--light :deep(.ant-select-item:hover) {
  background-color: #f3f4f6 !important;
}

.v-theme--light :deep(.ant-select-item-option-selected) {
  background-color: #3b82f6 !important;
  color: white !important;
}

/* 图标禁用状态样式 */
.icon-disabled {
  opacity: 0.4 !important;
  filter: grayscale(100%) !important;
}

/* 时间线相关样式 */
.ant-list-item-selected {
  background-color: rgba(24, 144, 255, 0.1) !important;
  border-left: 3px solid #1890ff;
}

.v-theme--dark .ant-list-item-selected {
  background-color: rgba(24, 144, 255, 0.15) !important;
}

.timeline-panel {
  background: rgba(var(--v-theme-surface), 1);
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
}

/* 编辑按钮组样式适配 */
.v-theme--dark :deep(.ant-btn) {
  background-color: #1f1f1f !important;
  border-color: #434343 !important;
  color: #e0e0e0 !important;
}

.v-theme--dark :deep(.ant-btn:hover) {
  background-color: #2a2a2a !important;
  border-color: #595959 !important;
  color: #ffffff !important;
}

.v-theme--dark :deep(.ant-btn-primary) {
  background-color: #1890ff !important;
  border-color: #1890ff !important;
  color: #ffffff !important;
}

.v-theme--dark :deep(.ant-btn-primary:hover) {
  background-color: #40a9ff !important;
  border-color: #40a9ff !important;
}

.v-theme--dark :deep(.ant-btn-primary.ant-btn-ghost) {
  background-color: transparent !important;
  border-color: #1890ff !important;
  color: #1890ff !important;
}

.v-theme--dark :deep(.ant-btn-primary.ant-btn-ghost:hover) {
  background-color: rgba(24, 144, 255, 0.1) !important;
  border-color: #40a9ff !important;
  color: #40a9ff !important;
}

.v-theme--dark :deep(.ant-btn.ant-btn-dangerous) {
  background-color: transparent !important;
  border-color: #ff4d4f !important;
  color: #ff4d4f !important;
}

.v-theme--dark :deep(.ant-btn.ant-btn-dangerous:hover) {
  background-color: rgba(255, 77, 79, 0.1) !important;
  border-color: #ff7875 !important;
  color: #ff7875 !important;
}

/* 时间线列表深色主题适配 */
.v-theme--dark :deep(.ant-list) {
  background-color: #1f1f1f !important;
  color: #e0e0e0 !important;
}

.v-theme--dark :deep(.ant-list-item) {
  border-bottom-color: #434343 !important;
  color: #e0e0e0 !important;
}

.v-theme--dark :deep(.ant-list-item:hover) {
  background-color: #2a2a2a !important;
}

.v-theme--dark :deep(.ant-list-item-meta-title) {
  color: #ffffff !important;
}

.v-theme--dark :deep(.ant-list-item-meta-description) {
  color: #a0a0a0 !important;
}

.v-theme--dark :deep(.ant-tag) {
  background-color: #434343 !important;
  border-color: #595959 !important;
  color: #e0e0e0 !important;
}

.v-theme--dark :deep(.ant-divider) {
  border-color: #434343 !important;
}

.v-theme--dark :deep(.ant-tooltip) {
  background-color: #1f1f1f !important;
}

.v-theme--dark :deep(.ant-tooltip .ant-tooltip-inner) {
  background-color: #1f1f1f !important;
  color: #e0e0e0 !important;
}

.v-theme--dark :deep(.ant-tooltip .ant-tooltip-arrow::before) {
  background-color: #1f1f1f !important;
}

/* 编辑按钮组的特殊状态样式 */
.v-theme--dark .edit-button-group .ant-btn {
  background-color: #2a2a2a !important;
  border-color: #434343 !important;
  color: #e0e0e0 !important;
}

.v-theme--dark .edit-button-group .ant-btn:hover {
  background-color: #3a3a3a !important;
  border-color: #595959 !important;
  color: #ffffff !important;
}

.v-theme--dark .edit-button-group .ant-btn-primary {
  background-color: #1890ff !important;
  border-color: #1890ff !important;
  color: #ffffff !important;
}

.v-theme--dark .edit-button-group .ant-btn-primary:hover {
  background-color: #40a9ff !important;
  border-color: #40a9ff !important;
}

/* 保存状态指示器 */
.v-theme--dark .edit-button-group .save-button-unsaved {
  background-color: #1890ff !important;
  border-color: #1890ff !important;
  color: #ffffff !important;
  box-shadow: 0 0 6px rgba(24, 144, 255, 0.3) !important;
}

.v-theme--dark .edit-button-group .save-button-saving {
  background-color: #52c41a !important;
  border-color: #52c41a !important;
  color: #ffffff !important;
}

/* 函数详情气泡浮窗样式 */
.function-tooltip {
  position: fixed;
  z-index: 10000;
  pointer-events: none;
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 深色主题下的时间线和编辑按钮增强样式 */
.v-theme--dark :deep(.ant-btn-text) {
  background-color: transparent !important;
  border-color: transparent !important;
  color: #e0e0e0 !important;
}

.v-theme--dark :deep(.ant-btn-text:hover) {
  background-color: rgba(255, 255, 255, 0.1) !important;
  border-color: transparent !important;
  color: #ffffff !important;
}

/* 时间线标题和操作按钮 */
.v-theme--dark .timeline-panel {
  background-color: #1f1f1f !important;
  border-color: #434343 !important;
}

.v-theme--dark .timeline-panel > div:first-child {
  color: #e0e0e0 !important;
}

/* 编辑按钮组容器 */
.v-theme--dark .edit-buttons-container {
  background-color: transparent !important;
}

/* 保存按钮在有未保存更改时的样式 */
.v-theme--dark :deep(.ant-btn-primary.save-button-changed) {
  background-color: #ff9500 !important;
  border-color: #ff9500 !important;
  color: #ffffff !important;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 149, 0, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 149, 0, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 149, 0, 0);
  }
}

/* 功能按钮图标适配 */
.v-theme--dark :deep(.anticon) {
  color: inherit !important;
}

/* 历史统计信息区域 */
.v-theme--dark .history-stats {
  background-color: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid #434343 !important;
  color: #a0a0a0 !important;
}

/* 历史版本项hover效果增强 */
.v-theme--dark :deep(.ant-list-item:hover) {
  background-color: rgba(255, 255, 255, 0.08) !important;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

/* 时间线面板分隔线 */
.v-theme--dark .timeline-panel :deep(.ant-divider-horizontal) {
  border-top-color: #434343 !important;
}

/* 操作按钮组 */
.v-theme--dark .timeline-actions {
  border-top: 1px solid #434343 !important;
  padding-top: 12px !important;
}

/* 确保Ant Design表单控件在深色主题下的可见性 */
.v-theme--dark :deep(.ant-input) {
  background-color: #1f1f1f !important;
  border-color: #434343 !important;
  color: #e0e0e0 !important;
}

.v-theme--dark :deep(.ant-input:hover) {
  border-color: #595959 !important;
}

.v-theme--dark :deep(.ant-input:focus) {
  border-color: #1890ff !important;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
}

/* 时间线列表选中项优化 */
.v-theme--dark .ant-list-item-selected {
  background-color: rgba(24, 144, 255, 0.2) !important;
  border-left-color: #40a9ff !important;
  border-radius: 0 4px 4px 0;
}

/* 按钮加载状态 */
.v-theme--dark :deep(.ant-btn-loading) {
  color: #e0e0e0 !important;
}

.v-theme--dark :deep(.ant-btn-loading .anticon) {
  color: #e0e0e0 !important;
}

/* 差异编辑器容器适配 */
.v-theme--dark .monaco-container {
  border: 1px solid #434343 !important;
  border-radius: 4px;
}

/* 确保所有文本在深色主题下可见 */
.v-theme--dark .timeline-panel,
.v-theme--dark .timeline-panel * {
  color: #e0e0e0 !important;
}

.v-theme--dark .timeline-panel strong {
  color: #ffffff !important;
}

/* 面包屑导航深色适配 */
.v-theme--dark :deep(.v-breadcrumbs) {
  color: #e0e0e0 !important;
}

.v-theme--dark :deep(.v-breadcrumbs-item) {
  color: #a0a0a0 !important;
}

.v-theme--dark :deep(.v-breadcrumbs-item:hover) {
  color: #ffffff !important;
}

/* 代码搜索框深色适配 */
.v-theme--dark .code-search-container .custom-search-input {
  background-color: #1f1f1f !important;
  border-color: #434343 !important;
  color: #e0e0e0 !important;
}

.v-theme--dark .code-search-container .custom-search-input:focus {
  border-color: #1890ff !important;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
}

/* Monaco 编辑器主题同步 */
.v-theme--dark .monaco-editor {
  background-color: #1e1e1e !important;
}

/* 确保所有图标在深色主题下可见 */
.v-theme--dark .timeline-panel .anticon {
  color: #a0a0a0 !important;
}

.v-theme--dark .timeline-panel .anticon:hover {
  color: #ffffff !important;
}

/* 差异视图弹窗样式 */
.diff-modal {
  z-index: 2000;
}

.diff-modal :deep(.ant-modal-content) {
  height: 80vh;
  display: flex;
  flex-direction: column;
}

.diff-modal :deep(.ant-modal-body) {
  flex: 1;
  padding: 16px;
  overflow: hidden;
}

.diff-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.diff-editor-container {
  flex: 1;
  position: relative;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  overflow: hidden;
}

/* 深色主题下的差异弹窗样式 */
.v-theme--dark .diff-modal :deep(.ant-modal-content) {
  background-color: #1f1f1f !important;
  color: #e0e0e0 !important;
}

.v-theme--dark .diff-modal :deep(.ant-modal-header) {
  background-color: #1f1f1f !important;
  border-bottom-color: #434343 !important;
}

.v-theme--dark .diff-modal :deep(.ant-modal-title) {
  color: #e0e0e0 !important;
}

.v-theme--dark .diff-modal :deep(.ant-modal-close) {
  color: #a0a0a0 !important;
}

.v-theme--dark .diff-modal :deep(.ant-modal-close:hover) {
  color: #ffffff !important;
}

.v-theme--dark .diff-editor-container {
  border-color: #434343 !important;
  background-color: #1e1e1e !important;
}
</style>
