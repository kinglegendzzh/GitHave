<template>
  <!-- 主内容区 -->
  <v-container fluid class="cover-fill" style="height: 100vh">
    <v-row>
      <v-toolbar title="Toolbar" class="mb-1">
        <v-toolbar-title>
          <v-icon>mdi-code-block-tags</v-icon>
        </v-toolbar-title>
        <div class="d-flex align-end bg-surface-variant ml-auto">
            <v-btn color="success" @click="resetRoot" class="mr-2" plain>
              <v-autocomplete
                  v-model="newRootPath"
                  :items="pathSuggestions"
                  label="选择访达路径..."
                  outlined
                  dense
                  clearable
                  @focus="loadPathSuggestions"
                  color="success"
                  class="mr-2"
                  style="min-width: 300px;max-width: 700px;height: 40px;"
              >
                <!-- 自定义下拉项显示 -->
                <template v-slot:item="data">
                  <div>
                    {{ data.item.value }} <span style="color: #666666">&lt;{{ data.item.description }}&gt;</span>
                  </div>
                </template>
                <!-- 自定义选中项显示 -->
                <template v-slot:selection="data">
                  <div>
                    {{ data.item.value }} <span style="color: #666666">&lt;{{ data.item.description }}&gt;</span>
                  </div>
                </template>
              </v-autocomplete>
              <v-icon>
                mdi-arrow-right
              </v-icon>
            </v-btn>
          <v-btn title="从本地目录打开" @click="openOutside(breadcrumbs, true)" outlined plain class="mr-2"><v-icon>mdi-folder-eye</v-icon></v-btn>
          <v-btn title="从本地应用程序打开" @click="openOutside(breadcrumbs, false)" outlined plain class="mr-2"><v-icon>mdi-file-search-outline</v-icon></v-btn>
          <v-btn title="更多操作" outlined plain class="mr-2"><v-icon >mdi-dots-vertical</v-icon></v-btn>
        </div>
      </v-toolbar>
    </v-row>
    <v-row style="display: flex; height: calc(100% - 80px);">
      <!-- 左侧 TreeView -->
      <v-col
          cols="12"
          md="4"
          lg="3"
          class="mb-4"
          style="width: 300px; max-width: 300px; position: relative;"
      >
        <v-card
            outlined
            class="pa-2 h-100"
            style="height: 100vh; overflow: auto;"
        >
          <v-card-title class="subtitle-1">
            访达目录树
          </v-card-title>
          <v-divider></v-divider>
          <v-treeview
              ref="treeview"
              class="mt-2"
              :items="treeData"
              item-key="path"
              activatable
              :open.sync="openNodes"
              :load-children="fetchChildren"
              lazy
              transition
              @update:active="handleNodeSelection"
              style="min-width: 1000px"
          >
            <!-- 自定义目录/文件图标 -->
            <template v-slot:prepend="{ item, open }">
              <v-icon v-if="item.isDirectory">
                {{ open ? 'mdi-folder-open' : 'mdi-folder' }}
              </v-icon>
              <v-icon v-else>
                mdi-file
              </v-icon>
            </template>
            <!-- 显示名称 -->
            <template v-slot:label="{ item }">
              <!-- 为每个节点添加唯一的 DOM id -->
              <span :id="'node-' + item.path.replace(/[^a-zA-Z0-9]/g, '-')"
                    style="font-size: 0.8rem">
                {{ item.name }}
              </span>
            </template>
          </v-treeview>
        </v-card>
      </v-col>

      <!-- 右侧文件内容预览 -->
      <v-col
          cols="12"
          md="8"
          lg="9"
          style="width: 800px; max-width: 800px;"
          class="mb-4 d-flex flex-column h-100"
      >
        <div class="flex-shrink-0">
          <!-- 顶部标签页 -->
          <v-tabs v-model="activeTab" class="mb-4">
            <v-tab
                v-for="(tab, index) in tabs"
                :key="tab.path"
                class="d-flex align-center"
            >
              <v-icon class="ml-2" @click.stop="removeTab(index)" style="cursor: pointer;">mdi-close</v-icon>
              <span @click="selectTab(tab)" style="cursor: pointer;">  {{ tab.name }}</span>
            </v-tab>
          </v-tabs>

          <!-- 面包屑导航 -->
          <v-breadcrumbs :items="breadcrumbs" class="pa-0">
            <template v-slot:item="{ item }">
              <v-breadcrumbs-item @click="navigateTo(item.path)">{{ item.text }}</v-breadcrumbs-item>
            </template>
          </v-breadcrumbs>
        </div>
        <v-divider></v-divider>
        <v-card
            tonal
            class="flex-grow-1"
            style="height: 100%; overflow-y: auto;"
        >
          <v-card-text>
            <!-- 新增：支持 PDF、DOCX 和 XLSX 预览 -->
            <div v-if="selectedFileName" class="preview-content">
              <!-- PDF 预览 -->
              <div v-if="isPDF(selectedFileName)">
                <iframe :src="getPDFUrl()" style="width: 100%; height: 100%;" frameborder="0"></iframe>
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
              <div v-else-if="isMarkdown(selectedFileName)" v-html="renderMarkdown(fileContent)"></div>
              <!-- 代码文件预览 -->
              <pre v-else-if="isCodeFile">
                  <code
                    :class="`hljs ${path.extname(selectedFileName).slice(1)}`"
                    v-html="highlightCode(fileContent, path.extname(selectedFileName))"
                  ></code>
                </pre>
              <!-- 其他文本文件预览 -->
              <pre v-else>{{ fileContent }}</pre>
            </div>
            <div v-else style="text-align: center;">
              <img :src="placeholderImage" alt="Chart Placeholder" draggable="false"
                   style="max-width: 100%; max-height: 100%; display: block; margin: auto; user-select: none; pointer-events: none;" />
              <h1 style="margin-top: 16px;user-select: none; pointer-events: none;">代码详情</h1>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import mammoth from "mammoth";

const { ipcRenderer, shell, openPathWithApp } = window.electron
import path from 'path-browserify'

import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import * as XLSX from "xlsx";
import codeSVG from "../assets/code.svg";
export default {
  name: 'FileBrowser',
  props: {
    localPath: {
      type: String,
      default: ''
    },
    forceReplace: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      tabs: [],
      activeTab: null,
      breadcrumbs: [],
      currentTab: null,
      path: path,
      md: new MarkdownIt({
        highlight: (str, lang) => {
          const validLang = hljs.getLanguage(lang) ? lang : 'plaintext'
          return hljs.highlight(str, { language: validLang }).encoded
        }
      }),
      drawer: false,
      treeData: [],
      openNodes: [],
      selectedFileName: '',
      fileContent: '',
      renderedDocx: '',      // 新增：用于存储 DOCX 转换后的 HTML 内容
      renderedXlsx: '',      // 新增：用于存储 XLSX 转换后的 HTML 内容
      selectedFilePath: '',  // 新增：用于存储 PDF 文件的完整路径
      initialLoad: true,           // 新增：初次加载标识
      placeholderImage: codeSVG,  // 新增：外部矢量图路径
      allowedExtensions: [
        '.txt', '.js', '.java', '.go', '.md', '.markdown',
        '.yml', '.yaml', '.json', '.xml', '.html', '.css',
        '.c', '.cpp', '.vue', '.ts', '.sh', '.bash', '.php',
        '.py', '.rb', '.pl', '.erb', '.tsx', '.jsx', '.log',
        '.pdf', 'xls', '.xlsx', '.doc', '.docx',
        '.sql',
      ],
      newRootPath: "",
      // 新增：下拉提示数据（模拟 API 返回数据）
      pathSuggestions: [],
      selectedFileUrl: '',  // 用于存储 PDF 的 Blob URL
      // 跨平台自定义应用映射，可动态调整
      customAppMapping: {
        '.txt': {
          win32: 'notepad',
          linux: 'gedit'
        },
        '.java': {
          darwin: 'code',
          win32: 'code',
          linux: 'code'
        },
        '.js': {
          darwin: 'code',
          win32: 'code',
          linux: 'code'
        },
        '.vue': {
          darwin: 'code',
          win32: 'code',
          linux: 'code'
        },
        '.go': {
          darwin: 'code',
          win32: 'code',
          linux: 'code'
        },
        '.sh': {
          darwin: 'code',
          win32: 'notepad',
          linux: 'gedit'
        },
        '.md': {
          darwin: 'code',
          win32: 'notepad',
          linux: 'gedit'
        },
        '.markdown': {
          darwin: 'code',
          win32: 'notepad',
          linux: 'gedit'
        },
        '.yml': {
          darwin: 'code',
          win32: 'code',
          linux: 'code'
        },
        '.yaml': {
          darwin: 'code',
          win32: 'code',
          linux: 'code'
        },
        '.json': {
          darwin: 'code',
          win32: 'notepad',
          linux: 'gedit'
        },
        '.xml': {
          darwin: 'code',
          win32: 'notepad',
          linux: 'gedit'
        },
        '.html': {
          darwin: 'code',
          win32: 'notepad',
          linux: 'gedit'
        },
        '.css': {
          darwin: 'code',
          win32: 'notepad',
          linux: 'gedit'
        },
      },
    }
  },
  created() {
    let rootDir = "";
    if (this.forceReplace && this.localPath) {
      rootDir = this.isFilePath(this.localPath) ? path.dirname(this.localPath) : this.localPath;
    } else {
      rootDir = window.electron ? window.electron.homeDir : '';
    }
    if (rootDir) {
      this.resetTree(rootDir).then(() => {
        if (this.localPath) {
          if (this.forceReplace) {
            if (this.isFilePath(this.localPath)) {
              this.expandToPath(this.localPath);
            } else {
              this.handleNodeSelection([rootDir]);
            }
          } else {
            this.expandToPath(this.localPath);
          }
          if (this.isFilePath(this.localPath)) {
            this.selectedFileName = path.basename(this.localPath);
            // 根据文件类型调用 loadFile 方法
            this.loadFile(this.localPath);
            const breadcrumbPath = this.buildBreadcrumb(this.localPath);
            this.tabs.push({
              path: this.localPath,
              name: path.basename(this.localPath),
              content: this.fileContent,
              breadcrumbs: breadcrumbPath
            });
            this.activeTab = this.tabs.length - 1;
            this.currentTab = this.tabs[this.activeTab];
            this.breadcrumbs = this.currentTab.breadcrumbs;
          }
        }
      });
    }
  },
  watch: {
    localPath(newPath) {
      if (newPath) {
        let rootDir = "";
        if (this.forceReplace && newPath) {
          rootDir = this.isFilePath(newPath) ? path.dirname(newPath) : newPath;
        } else {
          rootDir = window.electron ? window.electron.homeDir : '';
        }
        this.resetTree(rootDir).then(() => {
          if (this.forceReplace) {
            if (this.isFilePath(newPath)) {
              this.expandToPath(newPath);
            } else {
              this.handleNodeSelection([rootDir]);
            }
          } else {
            this.expandToPath(newPath);
          }
          if (this.isFilePath(newPath)) {
            this.selectedFileName = path.basename(newPath);
            // 根据文件类型调用 loadFile 方法
            this.loadFile(newPath);
            const breadcrumbPath = this.buildBreadcrumb(newPath);
            this.tabs.push({
              path: newPath,
              name: path.basename(newPath),
              content: this.fileContent,
              breadcrumbs: breadcrumbPath
            });
            this.activeTab = this.tabs.length - 1;
            this.currentTab = this.tabs[this.activeTab];
            this.breadcrumbs = this.currentTab.breadcrumbs;
          }
        });
      }
    }
  },
  computed: {
    isCodeFile() {
      const ext = path.extname(this.selectedFileName).toLowerCase()
      return this.allowedExtensions.includes(ext) && !this.isMarkdown(this.selectedFileName)
    },
    snackbar() {
      return this.$store.state.snackbar;
    },
  },
  methods: {
    /**
     * 根据应用名称查找其在当前系统下的可执行文件路径
     */
    async getAppPath(appName) {
      try {
        const path = await window.electron.getAppPath(appName)
        console.log('应用路径:', path)
      } catch (err) {
        console.error('获取应用路径失败:', err)
      }
    },
    openOutside(breadcrumbs, shouldFile) {
      if (breadcrumbs && breadcrumbs.length > 0) {
        let url = breadcrumbs[breadcrumbs.length - 1].path;
        if (url !== null) {
          // 如果是文件，则取其所在目录
          const isFile = this.isFilePath(url);
          url = '/' + url;
          let targetPath = shouldFile ? (isFile ? path.dirname(url) : url) : url;
          console.log('外部打开', targetPath);

          ipcRenderer.invoke('check-path-exists', targetPath).then(async exists => {
            if (exists) {
              // 当 shouldFile 为 false 时，尝试使用指定软件打开
              if (!shouldFile) {
                const ext = this.path.extname(targetPath).toLowerCase();
                const mapping = this.customAppMapping[ext];
                if (mapping) {
                  const platform = process.platform;
                  const appName = mapping[platform];
                  if (appName) {
                    try {
                      const appPath = await this.getAppPath(appName);
                      openPathWithApp(targetPath, appPath).then(error => {
                        if (error) {
                          console.error("打开文件失败:", error);
                          this.$store.dispatch('snackbar/showSnackbar', {
                            message: `打开文件失败: ${error}`,
                            type: 'error'
                          });
                        }
                      });
                      return; // 成功调用后，后续不再执行默认打开逻辑
                    } catch (error) {
                      console.error("未找到应用程序:", appName, error);
                    }
                  }
                }
              }
              // 默认使用系统打开方式
              shell.openPath(targetPath).then(error => {
                if (error) {
                  console.error("打开文件失败:", error);
                  this.$store.dispatch('snackbar/showSnackbar', {
                    message: `打开文件失败: ${error}`,
                    type: 'error'
                  });
                }
              });
            } else {
              console.error("路径不存在:", targetPath);
              this.$store.dispatch('snackbar/showSnackbar', {
                message: `路径不存在: ${targetPath}`,
                type: 'error'
              });
            }
          }).catch(err => {
            console.error("路径验证失败:", err);
            this.$store.dispatch('snackbar/showSnackbar', {
              message: `路径验证失败: ${err.message}`,
              type: 'error'
            });
          });
        }
      } else {
        console.error("无效的面包屑路径");
        this.$store.dispatch('snackbar/showSnackbar', {
          message: '请先预览一个文件',
          type: 'error'
        });
      }
    },
    // 新增：判断是否为 PDF 文件
    isPDF(fileName) {
      return this.path.extname(fileName).toLowerCase() === '.pdf';
    },
// 新增：判断是否为 DOCX 文件（也支持 .doc 后缀）
    isDocx(fileName) {
      return ['.doc', '.docx'].includes(this.path.extname(fileName).toLowerCase());
    },
// 新增：判断是否为 XLSX 文件
    isXlsx(fileName) {
      return this.path.extname(fileName).toLowerCase() === '.xlsx';
    },
    // 新增：构造 PDF 的 file:// 链接
    getPDFUrl() {
      return this.selectedFileUrl;
    },
// 新增：利用 Mammoth.js 将 DOCX ArrayBuffer 转换为 HTML
    async renderDocx(buffer) {
      try {
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
        return result.value;
      } catch (error) {
        console.error("DOCX 渲染失败：", error);
        return `<p>DOCX 渲染失败：${error.message}</p>`;
      }
    },
    // 新增：利用 SheetJS 将 XLSX ArrayBuffer 转换为 HTML
    renderXlsx(buffer) {
      try {
        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        return XLSX.utils.sheet_to_html(worksheet);
      } catch (error) {
        console.error("XLSX 渲染失败：", error);
        return `<p>XLSX 渲染失败：${error.message}</p>`;
      }
    },
    // 新增：根据文件后缀决定文件读取方式
    async loadFile(selectedPath) {
      // eslint-disable-next-line no-unused-vars
      const ext = this.path.extname(selectedPath).toLowerCase();
      if (this.isPDF(selectedPath)) {
        // PDF 文件：读取为二进制数据，生成 Blob URL
        try {
          const buffer = await ipcRenderer.invoke('read-file', selectedPath);
          const blob = new Blob([buffer], { type: 'application/pdf' });
          this.selectedFileUrl = URL.createObjectURL(blob);
          this.selectedFileName = this.path.basename(selectedPath);
        } catch (err) {
          console.error("读取 PDF 文件失败：", err);
          this.fileContent = `读取 PDF 文件失败：${err.message}`;
        }
      } else if (this.isDocx(selectedPath)) {
        // DOCX 文件：二进制读取，再利用 Mammoth 转换为 HTML
        try {
          const buffer = await ipcRenderer.invoke('read-file', selectedPath);
          const arrayBuffer = this.convertBuffer(buffer);
          this.selectedFileName = this.path.basename(selectedPath);
          this.renderedDocx = await this.renderDocx(arrayBuffer);
        } catch (err) {
          console.error("读取 DOCX 文件失败：", err);
          this.fileContent = `读取 DOCX 文件失败：${err.message}`;
        }
      } else if (this.isXlsx(selectedPath)) {
        // XLSX 文件：二进制读取，再利用 SheetJS 转换为 HTML
        try {
          const buffer = await ipcRenderer.invoke('read-file', selectedPath);
          const arrayBuffer = this.convertBuffer(buffer);
          this.selectedFileName = this.path.basename(selectedPath);
          this.renderedXlsx = this.renderXlsx(arrayBuffer);
        } catch (err) {
          console.error("读取 XLSX 文件失败：", err);
          this.fileContent = `读取 XLSX 文件失败：${err.message}`;
        }
      } else {
        // 其他文件：采用 UTF-8 文本读取
        try {
          const content = await ipcRenderer.invoke('read-file', selectedPath, { encoding: 'utf-8' });
          this.selectedFileName = this.path.basename(selectedPath);
          this.fileContent = content;
        } catch (err) {
          console.error("读取文件失败：", err);
          this.selectedFileName = this.path.basename(selectedPath);
          this.fileContent = `读取文件失败：${err.message}`;
        }
      }
    },
    resetRoot() {
      if (!this.newRootPath) {
        console.error("请输入一个有效的路径");
        return;
      }
      this.resetTree(this.newRootPath).then(() => {
        this.handleNodeSelection([this.newRootPath]);
        this.tabs = [];
        this.breadcrumbs = [];
      });
    },
    async expandToPath(targetPath) {
      const homeDir = window.electron ? window.electron.homeDir : '';
      if (!targetPath.startsWith(homeDir)) {
        console.error("目标路径不在用户根目录下:", targetPath);
        return;
      }
      const relativePath = this.path.relative(homeDir, targetPath);
      const segments = relativePath.split(this.path.sep);
      let currentNode = this.treeData[0];
      let openPaths = [currentNode.path];
      for (const segment of segments) {
        if (!currentNode.children || currentNode.children.length === 0) {
          await this.fetchChildren(currentNode);
        }
        const child = currentNode.children.find(child => child.name === segment);
        if (!child) {
          console.error("在路径", currentNode.path, "下未找到:", segment);
          return;
        }
        openPaths.push(child.path);
        currentNode = child;
      }
      this.openNodes = openPaths;
      this.handleNodeSelection([currentNode.path]);
      this.$nextTick(() => {
        const targetId = 'node-' + currentNode.path.replace(/[^a-zA-Z0-9]/g, '-');
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    },
    isFilePath(filePath) {
      return this.allowedExtensions.includes(this.path.extname(filePath).toLowerCase());
    },
    async resetTree(newPath) {
      const targetPath = this.isFilePath(newPath) ? this.path.dirname(newPath) : newPath;
      try {
        const root = await ipcRenderer.invoke('read-directory', targetPath);
        root.sort((a, b) => b.mtime - a.mtime);
        const filteredRoot = root.filter(child => !child.name.startsWith('.'));
        this.treeData = [{
          name: this.path.basename(targetPath),
          path: targetPath,
          isDirectory: true,
          children: filteredRoot.map(child => ({
            name: child.name,
            path: child.fullPath,
            isDirectory: child.isDirectory,
            children: child.isDirectory ? null : undefined
          }))
        }];
        this.openNodes = [targetPath];
      } catch (e) {
        console.error('路径加载失败:', e);
      }
    },
    buildBreadcrumb(fullPath) {
      const parts = fullPath.split(this.path.sep).filter(p => p);
      const breadcrumbs = [];
      let currentPath = '';
      parts.forEach((part, index) => {
        currentPath += (index ? this.path.sep : '') + part;
        breadcrumbs.push({
          text: part,
          path: currentPath
        });
      });
      return breadcrumbs;
    },
    navigateTo(targetPath) {
      const node = this.findNodeByPath(this.treeData, targetPath);
      if (node) {
        this.openNodes = [targetPath];
        this.$nextTick(() => {
          this.handleNodeSelection([targetPath]);
        });
      }
    },
    selectTab(tab) {
      this.currentTab = tab;
      this.breadcrumbs = tab.breadcrumbs;
      this.fileContent = tab.content;
    },
    removeTab(index) {
      // 如果删除的是当前激活的 tab，选择其他 tab
      if (this.activeTab === index) {
        // 这里可以选择激活前一个或后一个 tab
        if (index > 0) {
          this.activeTab = index - 1;
        } else if (this.tabs.length > 1) {
          this.activeTab = 0;
        } else {
          this.activeTab = null;
        }
      }
      // 从数组中移除该 tab
      this.tabs.splice(index, 1);
      this.fileContent = '';
    },
    highlightCode(code, lang) {
      const language = lang.slice(1)
      const validLang = hljs.getLanguage(language) ? language : 'plaintext'
      return hljs.highlight(code, { language: validLang }).value
    },
    isMarkdown(fileName) {
      const ext = this.path.extname(fileName).toLowerCase();
      return ['.md', '.markdown'].includes(ext);
    },
    renderMarkdown(content) {
      return this.md.render(content)
    },
    async fetchChildren(item) {
      if (!item.isDirectory) return [];
      try {
        const children = await ipcRenderer.invoke('read-directory', item.path);
        children.sort((a, b) => b.mtime - a.mtime);
        let map = children.map(child => ({
          name: child.name,
          path: child.fullPath,
          isDirectory: child.isDirectory,
          children: child.isDirectory ? null : undefined
        }));
        map = map.filter(item => !item.name.startsWith('.'));
        map = map.filter(item => {
          if (item.isDirectory) return true;
          const ext = this.path.extname(item.path).toLowerCase();
          return this.allowedExtensions.includes(ext);
        });
        item.children = map;
        return map;
      } catch (err) {
        console.error('加载子目录失败：', item.path, err);
        return [];
      }
    },
    findNodeByPath(nodes, targetPath) {
      for (const node of nodes) {
        if (node.path === targetPath) return node
        if (node.children) {
          const found = this.findNodeByPath(node.children, targetPath)
          if (found) return found
        }
      }
      return null
    },
    async handleNodeSelection(activeItems) {
      if (!activeItems.length) return;
      const selectedPath = activeItems[activeItems.length - 1];
      const node = this.findNodeByPath(this.treeData, selectedPath);
      if (node) {
        if (node.isDirectory) {
          if (node.children === null) {
            await this.fetchChildren(node);
          }
        } else {
          if (!this.allowedExtensions.includes(this.path.extname(node.name).toLowerCase())) {
            console.log('不支持的文件类型：', node.name)
            this.$store.dispatch('snackbar/showSnackbar', {
              message: '不支持的文件类型：' + node.name,
              type: 'error'
            });
            return
          }
          // 根据文件后缀采用不同的读取和渲染逻辑
          if (this.isPDF(node.name)) {
            // PDF 文件：读取为二进制数据，生成 Blob URL
            try {
              const buffer = await ipcRenderer.invoke('read-file', node.path);
              const blob = new Blob([buffer], { type: 'application/pdf' });
              this.selectedFilePath = node.path;
              this.selectedFileName = node.name;
              this.selectedFileUrl = URL.createObjectURL(blob);
              this.selectedFileName = this.path.basename(node.path);
            } catch (err) {
              console.error("读取 PDF 文件失败：", err);
              this.fileContent = `读取 PDF 文件失败：${err.message}`;
            }
          } else if (this.isDocx(node.name)) {
            try {
              const buffer = await ipcRenderer.invoke('read-file', selectedPath, null);
              const arrayBuffer = this.convertBuffer(buffer);
              this.selectedFileName = node.name;
              this.renderedDocx = await this.renderDocx(arrayBuffer);
            } catch (err) {
              this.selectedFileName = node.name;
              this.fileContent = `读取 DOCX 文件失败：${err.message}`;
            }
          } else if (this.isXlsx(node.name)) {
            try {
              const buffer = await ipcRenderer.invoke('read-file', selectedPath);
              const arrayBuffer = this.convertBuffer(buffer);
              this.selectedFileName = node.name;
              this.renderedXlsx = this.renderXlsx(arrayBuffer);
            } catch (err) {
              this.selectedFileName = node.name;
              this.fileContent = `读取 XLSX 文件失败：${err.message}`;
            }
          } else {
            try {
              const content = await ipcRenderer.invoke('read-file', selectedPath, { encoding: 'utf-8' });
              this.selectedFileName = node.name;
              this.fileContent = content;
            } catch (err) {
              this.selectedFileName = node.name;
              this.fileContent = `读取文件失败：${err.message}`;
            }
          }
        }
      }
      if (node && !node.isDirectory) {
        const tab = this.tabs.find(t => t.path === selectedPath);
        if (!tab) {
          const breadcrumbPath = this.buildBreadcrumb(node.path);
          this.tabs.push({
            path: selectedPath,
            name: node.name,
            content: this.fileContent,
            breadcrumbs: breadcrumbPath
          });
          this.activeTab = this.tabs.length - 1;
        } else {
          this.activeTab = this.tabs.indexOf(tab);
        }
        this.currentTab = this.tabs[this.activeTab];
        this.breadcrumbs = this.currentTab.breadcrumbs;
      }
    },

    // 模拟 API 调用，加载下拉提示数据
    loadPathSuggestions() {
      // 此处可以调用实际接口获取数据，这里用模拟数据示例
      this.pathSuggestions = [
        { value: '/Users/apple/Public/generates-git/repo_pinkstone', description: '算网编排中心' },
        { value: '/Users/apple/Public/generates-git/repo_eino', description: 'AI智能体编排框架' },
        { value: '/Users/apple', description: '根目录' },
        { value: '/Users/apple/Documents', description: '我的文档' },
        { value: '/Users/apple/Public', description: '我的公共' },
        { value: '/Users/apple/Downloads', description: '我的下载' },
      ];
    },

    convertBuffer(buffer) {
      // 如果已经是 ArrayBuffer，则直接返回
      if (buffer instanceof ArrayBuffer) {
        return buffer;
      }
      // 如果是 Uint8Array，则返回其 underlying ArrayBuffer
      if (buffer instanceof Uint8Array) {
        return buffer.buffer;
      }
      // 有时 Buffer 会以 { data: [...] } 形式传输
      if (buffer && buffer.data && Array.isArray(buffer.data)) {
        return new Uint8Array(buffer.data).buffer;
      }
      // 如果 buffer 对象中包含 buffer 属性，则提取有效数据
      if (buffer && buffer.buffer) {
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      }
      return buffer;
    },

  }
}
</script>

<style scoped>
pre {
  font-size: 0.9rem;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
.v-breadcrumbs ::v-deep {
  padding: 0;
}
.v-card ::v-deep {
  min-height: 200px;
}
.v-tabs ::v-deep {
  background: white;
}
.v-application ::v-deep {
  height: 100%;
}
html, body {
  height: 100%;
  overflow: hidden;
}
</style>
