<template>
  <v-container fluid class="cover-fill" style="height: 90vh">
    <!-- 当 loading 为 true 时显示加载动画，反之显示主体页面 -->
    <v-row v-if="loading" align="center" justify="center" style="height: 100vh;">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate color="primary" size="70"></v-progress-circular>
        <div class="mt-4" style="font-size: 1.2rem;">加载中...</div>
      </v-col>
    </v-row>

    <div v-else style="height: 90vh;">
      <!-- 主内容区 -->
      <v-row>
        <v-toolbar class="mb-1">
          <v-toolbar-title>
            <v-icon>mdi-code-block-tags</v-icon>
          </v-toolbar-title>
          <div class="d-flex align-center ml-auto">
            <v-autocomplete
              v-model="newRootPath"
              :items="pathSuggestions"
              label="选择访达路径..."
              outlined
              dense
              clearable
              item-title="title"
              item-value="value"
              @focus="loadPathSuggestions"
              color="success"
              class="mr-2"
              style="min-width: 400px;max-width: 400px;height: auto;"
              @update:menu="resetRoot"
            >
            </v-autocomplete>
            <v-btn title="从本地目录打开" @click="openOutside(breadcrumbs, true)" outlined plain class="mr-2">
              <v-icon>mdi-folder-eye</v-icon>
            </v-btn>
            <v-btn title="从本地应用程序打开" @click="openOutside(breadcrumbs, false)" outlined plain class="mr-2">
              <v-icon>mdi-file-search-outline</v-icon>
            </v-btn>
            <v-btn title="更多操作" outlined plain class="mr-2">
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </div>
        </v-toolbar>
      </v-row>

      <v-row style="display: flex; height: calc(100% - 80px);">
        <!-- 左侧目录树 -->
        <v-col cols="12" md="4" lg="3" class="mb-4" style="width: 300px; max-width: 300px; position: relative;">
          <v-card outlined class="pa-2 h-100" style="height: 100vh; overflow: auto;">
            <v-card-title class="subtitle-1">访达目录树</v-card-title>
            <v-divider></v-divider>
            <Treeselect
              v-model="treeselectValue"
              :options="treeData"
              :normalizer="nodeNormalizer"
              placeholder="选择目录树..."
              :item="['123', '321']"
              item-key="path"
              :load-options="loadDirectoryOptions"
              @click="handleOptionClick"
              :multiple="false"
              :searchable="true"
              :clearable="true"
              :auto-load-root-options="true"
              :always-open="true"
              class="mt-2"
              style="min-width: 800px;"
              :menuHeight="1000"
            >
            </Treeselect>
          </v-card>
        </v-col>

        <!-- 右侧文件预览和标签 -->
        <v-col cols="12" md="8" lg="9" style="width: 800px; max-width: 800px;" class="mb-4 d-flex flex-column h-100">
          <div class="flex-shrink-0">
            <!-- 顶部标签页 -->
            <v-tabs v-model="activeTab" class="mb-4">
              <v-tab v-for="(tab, index) in tabs" :key="tab.path" class="d-flex align-center">
                <v-icon class="ml-2" @click.stop="removeTab(index)" style="cursor: pointer;">mdi-close</v-icon>
                <span @click="selectTab(tab)" style="cursor: pointer;" class="text-blue-grey-darken-4">{{ tab.name }}</span>
              </v-tab>
            </v-tabs>
            <!-- 面包屑导航 -->
            <div class="breadcrumb-container">
              <v-breadcrumbs :items="breadcrumbs" class="pa-0">
                <template v-slot:item="{ item }">
                  <v-breadcrumbs-item @click="navigateTo(item.path)">{{ item.text }}</v-breadcrumbs-item>
                </template>
              </v-breadcrumbs>
            </div>
          </div>
          <v-divider></v-divider>
          <v-card tonal class="flex-grow-1" style="height: 100%; overflow-y: auto;">
            <v-card-text>
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
                <div
                  v-else-if="isMarkdown(selectedFileName)"
                  v-html="renderMarkdown(fileContent)"
                  @click="handleLinkClick">
                </div>
                <!-- 代码文件预览 -->
                <pre v-else-if="isCodeFile">
                  <code :class="`hljs ${path.extname(selectedFileName).slice(1)}`"
                        v-html="highlightCode(fileContent, path.extname(selectedFileName))"></code>
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
    </div>
  </v-container>
</template>

<script>
import mammoth from "mammoth";
import { LOAD_ROOT_OPTIONS, LOAD_CHILDREN_OPTIONS, ASYNC_SEARCH } from 'vue3-treeselect';
import path from 'path-browserify'
import Treeselect from 'vue3-treeselect'
import 'vue3-treeselect/dist/vue3-treeselect.css'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import * as XLSX from "xlsx";
import codeSVG from "../assets/code.svg";
import { listRepos } from '../service/api.js'

export default {
  name: 'FileBrowser',
  components: { Treeselect },
  props: {
    localPath: {
      type: String,
      default: ''
    },
    forceReplace: {
      type: Boolean,
      default: false
    },
    forceDeep: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      loading: true, // 新增 loading 状态
      treeselectValue: null,
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
      renderedDocx: '',
      renderedXlsx: '',
      selectedFileUrl: '',
      placeholderImage: codeSVG,
      allowedExtensions: [
        '.txt', '.js', '.java', '.go', '.md', '.markdown', '.yml', '.yaml', '.json', '.xml',
        '.html', '.css', '.c', '.cpp', '.vue', '.ts', '.sh', '.bash', '.php', '.py', '.rb', '.pl',
        '.erb', '.tsx', '.jsx', '.log', '.pdf', 'xls', '.xlsx', '.doc', '.docx', '.sql',
      ],
      newRootPath: "",
      pathSuggestions: [],
      customAppMapping: {
        '.txt': { win32: 'notepad', linux: 'gedit' },
        '.java': { darwin: 'code', win32: 'code', linux: 'code' },
        '.js': { darwin: 'code', win32: 'code', linux: 'code' },
        '.vue': { darwin: 'code', win32: 'code', linux: 'code' },
        '.go': { darwin: 'code', win32: 'code', linux: 'code' },
        '.sh': { darwin: 'code', win32: 'notepad', linux: 'gedit' },
        '.md': { darwin: 'code', win32: 'notepad', linux: 'gedit' },
        '.markdown': { darwin: 'code', win32: 'notepad', linux: 'gedit' },
        '.yml': { darwin: 'code', win32: 'code', linux: 'code' },
        '.yaml': { darwin: 'code', win32: 'code', linux: 'code' },
        '.json': { darwin: 'code', win32: 'notepad', linux: 'gedit' },
        '.xml': { darwin: 'code', win32: 'notepad', linux: 'gedit' },
        '.html': { darwin: 'code', win32: 'notepad', linux: 'gedit' },
        '.css': { darwin: 'code', win32: 'notepad', linux: 'gedit' },
      },
    }
  },
  async created() {
    // 使用包装后的初始化方法
    await this.initializePage();
  },
  watch: {
    localPath(newPath) {
      if (newPath) {
        this.initialize(newPath).finally(() => {
          this.loading = false;
        });
      }
    },
    activeTab(newIndex) {
      if (this.tabs[newIndex]) {
        this.restoreState(this.tabs[newIndex]);
      }
    },
    treeselectValue(newVal) {
      if (newVal) {
        this.handleNodeSelection([newVal]);
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
    async handleLinkClick(event) {
      console.log("点击目标：", event.target);
      let target = event.target;
      while (target && target !== event.currentTarget) {
        if (target.tagName === 'A') {
          event.preventDefault();  // 阻止默认链接行为
          const url = target.getAttribute('href');
          console.log("捕获到链接点击，链接为：", url);
          // 调用 Electron API 打开新窗口
          if (window.electron && typeof window.electron.openNewWindow === 'function') {
            window.electron.openNewWindow(url);
          } else {
            window.open(url, '_blank');
          }
          break;
        }
        target = target.parentNode;
      }
    },
    // 包装后的初始化方法，控制 loading 状态
    async initializePage() {
      this.loading = true;
      try {
        await this.initialize(this.localPath);
      } catch (e) {
        console.error("初始化过程出错：", e);
      } finally {
        this.loading = false;
      }
    },

    // 原有初始化逻辑
    async initialize(initialPath) {
      let rootDir = "";
      if (this.forceReplace && initialPath) {
        this.newRootPath = initialPath;
        rootDir = this.isFilePath(initialPath) ? path.dirname(initialPath) : initialPath;
      } else {
        rootDir = await window.electron.homeDir;
      }
      if (rootDir) {
        await this.resetTree(rootDir);
        if (initialPath) {
          if (this.forceReplace) {
            this.isFilePath(initialPath)
              ? this.expandToPath(initialPath)
              : this.handleNodeSelection([rootDir]);
          } else {
            this.expandToPath(initialPath);
          }
          if (this.isFilePath(initialPath)) {
            await this.loadFileByType(initialPath);
            const breadcrumbPath = this.buildBreadcrumb(initialPath);
            this.addOrSwitchTab({
              path: initialPath,
              name: path.basename(initialPath),
              breadcrumbs: breadcrumbPath
            });
          }
        }
      }
      this.newRootPath = initialPath;
      this.resetRoot();
    },

    // 重置根目录及树结构
    resetRoot() {
      if (!this.newRootPath) return;
      this.resetTree(this.newRootPath).then(() => {
        this.handleNodeSelection([this.newRootPath]);
        this.tabs = [];
        this.breadcrumbs = [];
      });
    },

    // 文件类型判断工具
    isPDF(fileName) {
      return this.path.extname(fileName).toLowerCase() === '.pdf';
    },
    isDocx(fileName) {
      return ['.doc', '.docx'].includes(this.path.extname(fileName).toLowerCase());
    },
    isXlsx(fileName) {
      return this.path.extname(fileName).toLowerCase() === '.xlsx';
    },
    isMarkdown(fileName) {
      const ext = this.path.extname(fileName).toLowerCase();
      return ['.md', '.markdown'].includes(ext);
    },
    getPDFUrl() {
      return this.selectedFileUrl;
    },
    async loadFileByType(selectedPath) {
      const ext = this.path.extname(selectedPath).toLowerCase();
      try {
        if (this.isPDF(selectedPath)) {
          const buffer = await window.electron.readFile(selectedPath);
          const blob = new Blob([buffer], { type: 'application/pdf' });
          this.updateFileState(selectedPath, { selectedFileUrl: URL.createObjectURL(blob) });
        } else if (this.isDocx(selectedPath)) {
          const buffer = await window.electron.readFile(selectedPath);
          const arrayBuffer = this.convertBuffer(buffer);
          this.updateFileState(selectedPath, { renderedDocx: await this.renderDocx(arrayBuffer) });
        } else if (this.isXlsx(selectedPath)) {
          const buffer = await window.electron.readFile(selectedPath);
          const arrayBuffer = this.convertBuffer(buffer);
          this.updateFileState(selectedPath, { renderedXlsx: this.renderXlsx(arrayBuffer) });
        } else {
          const content = await window.electron.readFile(selectedPath, { encoding: 'utf-8' });
          this.updateFileState(selectedPath, { fileContent: content });
        }
      } catch (err) {
        console.error("加载文件失败：", err);
        this.updateFileState(selectedPath, { fileContent: `读取文件失败：${err.message}` });
      }
    },
    updateFileState(selectedPath, updates) {
      const fileName = this.path.basename(selectedPath);
      this.selectedFileName = fileName;
      Object.keys(updates).forEach(key => {
        this[key] = updates[key];
      });
    },
    restoreState(tab) {
      this.selectedFileName = tab.selectedFileName || this.path.basename(tab.path);
      this.fileContent = tab.fileContent || '';
      this.renderedDocx = tab.renderedDocx || '';
      this.renderedXlsx = tab.renderedXlsx || '';
      this.selectedFileUrl = tab.selectedFileUrl || '';
      this.breadcrumbs = tab.breadcrumbs || [];
    },
    addOrSwitchTab(tabData) {
      let tab = this.tabs.find(t => t.path === tabData.path);
      if (!tab) {
        tab = Object.assign({
          fileContent: this.fileContent,
          renderedDocx: this.renderedDocx,
          renderedXlsx: this.renderedXlsx,
          selectedFileUrl: this.selectedFileUrl,
          selectedFileName: this.selectedFileName,
        }, tabData);
        this.tabs.push(tab);
      }
      this.activeTab = this.tabs.indexOf(tab);
      this.currentTab = this.tabs[this.activeTab];
      this.breadcrumbs = this.currentTab.breadcrumbs;
    },
    loadDirectoryOptions({ action, parentNode, searchQuery, callback }) {
      if (action === LOAD_ROOT_OPTIONS) {
        this.fetchChildren(this.rootPath || '/')
          .then(children => {
            this.treeOptions = children;
            callback();
          })
          .catch(error => callback(error));
      } else if (action === LOAD_CHILDREN_OPTIONS) {
        this.fetchChildren(parentNode)
          .then(children => {
            parentNode.children = children;
            callback();
          })
          .catch(error => callback(error));
      } else if (action === ASYNC_SEARCH) {
        fetchPathSuggestions(searchQuery)
          .then(results => {
            const suggestions = results.map(p => ({
              id: p,
              label: p,
              children: null
            }));
            callback(null, suggestions);
          })
          .catch(error => callback(error));
      }
    },
    nodeNormalizer(node) {
      return {
        id: node.path,
        label: node.name,
        children: node.children,
        isLeaf: !node.isDirectory,
      };
    },
    handleOptionClick(option) {
      console.log('handleOptionClick', JSON.stringify(option))
    },
    findNodeByPath(nodes, targetPath) {
      for (const node of nodes) {
        if (node.path === targetPath) return node;
        if (node.children) {
          const found = this.findNodeByPath(node.children, targetPath);
          if (found) return found;
        }
      }
      return null;
    },
    async handleNodeSelection(activeItems) {
      if (!activeItems.length) return;
      const selectedPath = activeItems[activeItems.length - 1];
      const node = this.findNodeByPath(this.treeData, selectedPath);
      if (!node) return;
      if (node.isDirectory) {
        if (node.children === null) {
          await this.fetchChildren(node);
        }
      } else {
        if (!this.allowedExtensions.includes(this.path.extname(node.name).toLowerCase())) {
          this.$store.dispatch('snackbar/showSnackbar', {
            message: '不支持的文件类型：' + node.name,
            type: 'error'
          });
          return;
        }
        await this.loadFileByType(node.path);
        const breadcrumbPath = this.buildBreadcrumb(node.path);
        this.addOrSwitchTab({
          path: node.path,
          name: node.name,
          breadcrumbs: breadcrumbPath,
        });
      }
    },
    buildBreadcrumb(fullPath) {
      const parts = fullPath.split(this.path.sep).filter(p => p);
      let currentPath = '';
      return parts.map((part, index) => {
        currentPath += (index ? this.path.sep : '') + part;
        return { text: part, path: currentPath };
      });
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
      this.addOrSwitchTab({
        path: tab.path,
        name: tab.name,
        breadcrumbs: tab.breadcrumbs,
      });
      this.loadFileByType(tab.path);
    },
    removeTab(index) {
      if (this.activeTab === index) {
        this.activeTab = index > 0 ? index - 1 : (this.tabs.length > 1 ? 0 : null);
      }
      this.tabs.splice(index, 1);
      this.fileContent = '';
    },
    highlightCode(code, lang) {
      const language = lang.slice(1);
      const validLang = hljs.getLanguage(language) ? language : 'plaintext';
      return hljs.highlight(code, { language: validLang }).value;
    },
    renderMarkdown(content) {
      return this.md.render(content);
    },
    async fetchChildren(item) {
      if (!item.isDirectory) return [];
      try {
        const children = await window.electron.readDirectory(item.path);
        children.sort((a, b) => b.mtime - a.mtime);
        let map = children.map(child => ({
          name: child.name,
          path: child.fullPath,
          isDirectory: child.isDirectory,
          children: child.isDirectory ? null : undefined,
        })).filter(child => !child.name.startsWith('.'));
        return map.filter(child => child.isDirectory ||
          this.allowedExtensions.includes(this.path.extname(child.path).toLowerCase()));
      } catch (err) {
        console.error('加载子目录失败：', item.path, err);
        return [];
      }
    },
    convertBuffer(buffer) {
      if (buffer instanceof ArrayBuffer) return buffer;
      if (buffer instanceof Uint8Array) return buffer.buffer;
      if (buffer && buffer.data && Array.isArray(buffer.data)) return new Uint8Array(buffer.data).buffer;
      if (buffer && buffer.buffer) {
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      }
      return buffer;
    },
    async renderDocx(buffer) {
      try {
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
        return result.value;
      } catch (error) {
        console.error("DOCX 渲染失败：", error);
        return `<p>DOCX 渲染失败：${error.message}</p>`;
      }
    },
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
    async expandToPath(targetPath) {
      const homeDir = await window.electron.homeDir;
      if (!targetPath.startsWith(homeDir)) return;
      const relativePath = this.path.relative(homeDir, targetPath);
      const segments = relativePath.split(this.path.sep);
      let currentNode = this.treeData[0];
      let openPaths = [currentNode.path];
      for (const segment of segments) {
        if (!currentNode.children || currentNode.children.length === 0) {
          await this.fetchChildren(currentNode);
        }
        const child = currentNode.children.find(child => child.name === segment);
        if (!child) return;
        openPaths.push(child.path);
        currentNode = child;
      }
      this.openNodes = openPaths;
      this.$nextTick(() => {
        const targetId = 'node-' + currentNode.path.replace(/[^a-zA-Z0-9]/g, '-');
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      this.handleNodeSelection([currentNode.path]);
    },
    async getAppPath(appName) {
      try {
        const appPath = await window.electron.getAppPathIPC(appName);
        if (!appPath) throw new Error(`获取的应用路径为空: ${appName}`);
        return appPath;
      } catch (err) {
        console.error('获取应用路径失败:', err);
      }
    },
    async openOutside(breadcrumbs, shouldFile) {
      if (!breadcrumbs || breadcrumbs.length === 0) {
        this.$store.dispatch('snackbar/showSnackbar', {
          message: '请先预览一个文件',
          type: 'error'
        });
        return;
      }
      let url = breadcrumbs[breadcrumbs.length - 1].path;
      if (url !== null) {
        const isFile = this.isFilePath(url);
        url = '/' + url;
        const targetPath = shouldFile ? (isFile ? path.dirname(url) : url) : url;
        await window.electron.checkPathExists(targetPath).then(async exists => {
          if (exists) {
            if (!shouldFile) {
              const ext = this.path.extname(targetPath).toLowerCase();
              const mapping = this.customAppMapping[ext];
              if (mapping) {
                const platform = await window.electron.platform;
                const appName = mapping[platform];
                if (appName) {
                  try {
                    const appPath = await this.getAppPath(appName);
                    await window.electron.openPathWithApp(targetPath, appPath)
                      .then(error => {
                        if (error) {
                          this.$store.dispatch('snackbar/showSnackbar', {
                            message: `打开文件失败: ${error}`,
                            type: 'error'
                          });
                        }
                      });
                    return;
                  } catch (error) {
                    console.error("未找到应用程序:", appName, error);
                  }
                }
              }
            }
            await window.electron.shell.openPath(targetPath)
              .then(error => {
                if (error) {
                  this.$store.dispatch('snackbar/showSnackbar', {
                    message: `打开文件失败: ${error}`,
                    type: 'error'
                  });
                }
              });
          } else {
            this.$store.dispatch('snackbar/showSnackbar', {
              message: `路径不存在: ${targetPath}`,
              type: 'error'
            });
          }
        }).catch(err => {
          this.$store.dispatch('snackbar/showSnackbar', {
            message: `路径验证失败: ${err.message}`,
            type: 'error'
          });
        });
      }
    },
    isFilePath(filePath) {
      return this.allowedExtensions.includes(this.path.extname(filePath).toLowerCase());
    },
    async resetTree(newPath) {
      const targetPath = this.isFilePath(newPath) ? this.path.dirname(newPath) : newPath;
      try {
        const root = await window.electron.readDirectory(targetPath);
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
    async loadPathSuggestions() {
      await listRepos().then(response => {
        if (!response.data || !Array.isArray(response.data)) {
          return;
        }
        this.pathSuggestions = response.data.map(repo => ({
          value: repo.local_path,
          title: `${repo.desc}(${repo.name})`
        }));
      }).catch(err => {
        console.error("获取仓库数据失败:", err);
      });
    }
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
:deep(.v-card) {
  min-height: 200px;
}
:deep(.v-tabs) {
  background: white;
}
:deep(.v-application) {
  height: 100%;
}
html, body {
  height: 100%;
  overflow: hidden;
}
:deep(.vue-treeselect__menu) {
  height: 1000px !important;
  max-height: 1000px !important;
  overflow: auto;
}
.breadcrumb-container {
  overflow-x: auto;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  max-width: 100%;
}

.breadcrumb-container::-webkit-scrollbar {
  height: 4px;
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
</style>
