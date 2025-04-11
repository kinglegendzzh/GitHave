<template>
  <v-app>
    <!-- 全局加载遮罩：在调用 IPC 时显示 -->
    <v-overlay :value="isProcessing" absolute>
      <v-progress-circular indeterminate color="purple" size="64"></v-progress-circular>
    </v-overlay>

    <v-container fluid>
      <v-row style="display: flex;">
        <v-col cols="12" style="display: flex;">
          <v-autocomplete
            v-model="lensPath"
            :items="pathSuggestions"
            label="选择透镜路径..."
            outlined
            dense
            clearable
            item-title="title"
            item-value="value"
            @focus="loadPathSuggestions"
            style="width: 80%"
            color="purple"
          ></v-autocomplete>
          <v-btn color="purple" @click="applyLensPath">
            <v-icon color="white">mdi-line-scan</v-icon>
            <span style="color: white">深度扫描</span>
          </v-btn>
        </v-col>
      </v-row>

      <!-- 顶部工具栏：面包屑导航 -->
      <v-row>
        <v-col cols="12">
          <v-toolbar flat color="transparent">
            <v-spacer></v-spacer>
            <v-breadcrumbs :items="breadcrumbs" divider="/">
              <template v-slot:item="{ item }">
                <v-breadcrumbs-item @click="navigateToBreadcrumb(item)">
                  {{ item.text }}
                </v-breadcrumbs-item>
              </template>
            </v-breadcrumbs>
          </v-toolbar>
        </v-col>
      </v-row>

      <!-- 主体内容：左侧图表、右侧目录列表 -->
      <v-row>
        <!-- 图表区域 -->
        <v-col cols="8">
          <div ref="chart" class="chart" :key="chartKey" style="position: relative;">
            <div v-if="initialLoad" style="text-align: center;">
              <img :src="placeholderImage" alt="Chart Placeholder" draggable="false"
                   style="max-width: 100%; max-height: 100%; display: block; margin: auto; user-select: none; pointer-events: none;"  />
              <h1 style="margin-top: 16px; user-select: none; pointer-events: none;">空间透镜</h1>
            </div>
            <v-overlay v-else :value="chartLoading">
              <v-progress-circular indeterminate size="64"></v-progress-circular>
            </v-overlay>
          </div>
        </v-col>

        <!-- 右侧目录列表 -->
        <v-col cols="4">
          <div class="text-center">
            <div class="bg-surface-variant rounded-lg mx-auto">
              <!-- 数据加载时显示骨架图 -->
              <v-skeleton-loader
                v-if="legendLoading"
                type="table"
                class="mx-2"
              ></v-skeleton-loader>
              <!-- 加载完成后显示列表 -->
              <v-list dense class="pa-0">
                <v-list-item
                  v-for="item in legendItems"
                  :key="item.name"
                  @click="onLegendItemClick($event, item)"
                  @contextmenu="showContextMenu($event, item)"
                  style="cursor: pointer;"
                >
                  <template #prepend>
                    <v-avatar size="32">
                      <v-icon :color="item.color" outlined>
                        {{ item.isDirectory ? item.icon : 'mdi-file-outline' }}
                      </v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title>{{ item.name }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- 新增：悬浮提示（微信聊天气泡样式） -->
      <div
        v-if="tooltipVisible"
        :style="{
          position: 'absolute',
          left: tooltipX + 'px',
          top: tooltipY + 'px',
          pointerEvents: 'none',
          zIndex: 1000
        }"
      >
        <v-card class="tooltip-card" outlined>
          <v-icon left>mdi-comment</v-icon>
          <span style="font-size: 18px; margin-left: 4px;">{{ tooltipContent }}</span>
        </v-card>
      </div>
    </v-container>

    <FileContextMenu ref="contextMenu" :menu-items="menuItems" />

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-app>
</template>

<script>
// 引入 d3 模块
import * as d3 from 'd3';
// 在 Electron 环境下可以直接使用 Node 内置模块
const fs = await window.electron.fs;
const path = await window.electron.path;
import grassSVG from '../assets/透镜.svg';
import FileContextMenu from '../components/FileContextMenu.vue';
import { listRepos } from '../service/api';

export default {
  name: 'SpaceLens',
  components: {
    FileContextMenu
  },
  props: {
    // 接收父组件传递的目录路径
    dirPath: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      // 全局加载状态，在调用 IPC 时显示全局加载遮罩
      isProcessing: false,
      selectedFile: null,
      fileTree: null,
      legendItems: [],
      colorScale: null,
      rootPath: '',
      chartLoading: false,
      legendLoading: false,
      root: null,
      currentFocus: null,
      tooltipVisible: false,
      tooltipContent: '',
      tooltipX: 0,
      tooltipY: 0,
      lensPath: "",
      pathSuggestions: [],
      n: 0.3,                // 扫描系数：每n层路径深度增加1层扫描深度
      minDepth: 3,         // 最小扫描深度
      maxDepth: 14,         // 最大扫描深度
      depth: 3,
      initialLoad: true,   // 新增：初次加载标识
      placeholderImage: grassSVG,  // 新增：外部矢量图路径
      chartKey: 0,
      menuItems: [
        { title: '查看详情', icon: 'mdi-information', action: () => this.viewFileDetails() },
        { title: '复制路径', icon: 'mdi-content-copy', action: () => this.copyFilePath() },
        { title: '在本地目录中显示', icon: 'mdi-folder', action: () => this.openInFinder() }
      ]
    };
  },
  computed: {
    breadcrumbs() {
      let node = this.currentFocus;
      const crumbs = [];
      while (node) {
        crumbs.push({ text: node.data.name, path: node.data.fullPath });
        node = node.parent;
      }
      return crumbs.reverse();
    },
    snackbar() {
      return this.$store.state.snackbar;
    }
  },
  created() {
    if (this.dirPath != null) {
      // 仅填充输入框，不自动扫描
      this.lensPath = this.dirPath;
      this.rootPath = this.dirPath;
    }
  },
  methods: {
    showContextMenu(event, item) {
      console.log('右键菜单点击事件', event, item);
      this.$refs.contextMenu.show(event);
      this.selectedFile = item;
    },
    viewFileDetails() {
      if (this.selectedFile && this.selectedFile.fullPath) {
        console.log('跳转到文件浏览器页面，文件路径：', this.selectedFile.fullPath);
        this.$router.push({
          name: 'finder',
          params: { localPath: this.selectedFile.fullPath, forceDeep: true, forceReplace: true }
        });
      }
    },
    copyFilePath() {
      if (this.selectedFile && this.selectedFile.fullPath) {
        navigator.clipboard.writeText(this.selectedFile.fullPath)
          .then(() => {
            this.$store.dispatch('snackbar/showSnackbar', {
              show: true,
              message: '路径已复制到剪贴板',
              color: 'success'
            });
          })
          .catch(err => {
            console.error('复制失败:', err);
          });
      }
    },
    async openInFinder() {
      console.log('在访达中显示', this.selectedFile.fullPath);
      if (this.selectedFile && this.selectedFile.fullPath) {
        await window.electron.shell.openPath(path.dirname(this.selectedFile.fullPath));
      }
    },
    async openFile(filePath) {
      await window.electron.shell.openPath(filePath).then(error => {
        if (error) {
          console.error("打开文件失败:", error);
        }
      });
    },
    expandToPath(targetPath) {
      if (!this.root) {
        console.error("d3 层级结构未构建");
        return;
      }
      const targetNode = this.root.descendants().find(node => node.data.fullPath === targetPath);
      if (targetNode) {
        this.currentFocus = targetNode;
        if (this.updateSunburst) {
          this.updateSunburst(targetNode);
        } else {
          console.error("updateSunburst 未定义");
        }
      } else {
        console.error("未找到目标节点:", targetPath);
      }
    },
    navigateToBreadcrumb(item) {
      const target = this.root.descendants().find(n => n.data.fullPath === item.path);
      if (target && this.updateSunburst) {
        this.currentFocus = target;
        this.updateSunburst(target);
      }
    },
    // 点击扫描按钮时，设定全局加载状态 isProcessing 为 true，整个扫描过程全局显示加载遮罩
    async applyLensPath() {
      if (this.lensPath) {
        console.log(`用户输入的路径: ${this.lensPath}`);
        // 设置全局加载状态，显示全屏遮罩
        this.isProcessing = true;
        try {
          // 规范路径格式
          this.lensPath = this.lensPath.replace(/\\/g, '/');
          const pathDepth = this.lensPath.split('/').filter(Boolean).length;
          const adaptiveDepth = Math.floor((pathDepth - 3) / this.n) + this.minDepth;
          const scanDepth = Math.min(Math.max(adaptiveDepth, this.minDepth), this.maxDepth);
          console.log(`路径深度: ${pathDepth}, 自适应扫描深度: ${adaptiveDepth}, 最终扫描深度: ${scanDepth}`);
          this.depth = adaptiveDepth;
          this.rootPath = this.lensPath;
          // 显示局部加载状态（图表和图例区域）
          this.chartLoading = true;
          this.legendLoading = true;
          // 异步构建目录树（调用 IPC）
          this.fileTree = await this.buildFileTreeAsync(this.rootPath, '', 0, scanDepth);
          // 绘制图表
          this.drawChartWithAnimation();
        } catch (error) {
          console.error("扫描失败：", error);
          this.$store.dispatch('snackbar/showSnackbar', {
            message: '扫描目录失败，请检查输入路径',
            color: 'error'
          });
          this.legendLoading = false;
        } finally {
          // 完成后取消全局加载状态
          this.isProcessing = false;
          this.legendLoading = false;
        }
      } else {
        console.log('输入为空，不进行扫描');
        this.depth = 3;
        this.lensPath = '';
        this.rootPath = '';
        this.chartLoading = false;
        this.legendLoading = false;
        this.fileTree = null;
        this.legendItems = [];
        this.currentFocus = null;
        this.chartKey++;
        this.initialLoad = true;
        d3.select(this.$refs.chart).selectAll("*").remove();
        this.initialLoad = true;
      }
    },
// 修改后的 onLegendItemClick 方法示例：
    async onLegendItemClick($event, item) {
      // 假设 currentFocus 为当前 d3 层级结构节点，
      // 并在其 children 中查找与 legend 列表点击项匹配的节点
      if (this.currentFocus && this.currentFocus.children) {
        const childNode = this.currentFocus.children.find(child => child.data.name === item.name);
        if (childNode) {
          // 当点击项为文件夹时，采用与饼图点击时相同的重新扫描逻辑
          if (childNode.data.isDirectory) {
            console.log("目录扫描不完整，准备重新扫描：", childNode.data.fullPath);
            // 全局加载，避免阻塞其他操作
            this.isProcessing = true;
            try {
              // 调用重新扫描方法，根据文件夹完整性确定是否需要扩展扫描深度
              let additionalDepth = await this.rescanNode(childNode.data);
              // 重新构建整个文件树（或仅更新该节点也可，此处采用全量刷新方式）
              this.fileTree = await this.buildFileTreeAsync(this.rootPath, '', 0, additionalDepth);
              // 使用新的目录树构建 d3 层级结构
              this.root = d3.hierarchy(this.fileTree).sum(d => d.size);
              // 在新的层级结构中找到当前点击的目录节点
              const newTarget = this.root.descendants().find(node => node.data.fullPath === childNode.data.fullPath);
              if (newTarget) {
                this.currentFocus = newTarget;
              }
              // 调用和饼图点击时同样的函数更新 sunburst 图
              if (this.updateSunburst) {
                this.updateSunburst(this.currentFocus);
              }
            } catch (error) {
              console.error("右侧目录扫描失败：", error);
              this.$store.dispatch('snackbar/showSnackbar', {
                message: '扫描目录失败，请检查输入路径',
                color: 'error'
              });
            } finally {
              // 操作完成后取消全局加载状态
              this.isProcessing = false;
            }
          } else {
            // 如果点击项非文件夹，则执行其他操作，如显示右键菜单
            this.showContextMenu($event, item);
          }
        }
      }
    },

    buildFileTree(dirPath, parentName = '') {
      const name = path.basename(dirPath);
      let totalSize = 0;
      let children = [];
      let files;
      try {
        files = fs.readdirSync(dirPath).filter(file => !file.startsWith('.'));
      } catch (err) {
        console.error("读取目录失败：", err);
        return { name, size: 0, group: parentName, children: [] };
      }
      files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        try {
          const stats = fs.statSync(fullPath);
          if (stats.isDirectory()) {
            const subtree = this.buildFileTree(fullPath, name);
            children.push(subtree);
            totalSize += subtree.size;
          } else if (stats.isFile()) {
            const fileSizeMB = Math.ceil(stats.size / 1024 / 1024);
            children.push({
              name: file,
              size: fileSizeMB,
              group: name,
              fullPath: fullPath,
              isDirectory: false,
              children: []
            });
            totalSize += fileSizeMB;
          }
        } catch (err) {
          console.error("处理文件失败：", fullPath, err);
        }
      });
      return {
        name,
        size: totalSize,
        group: parentName,
        fullPath: dirPath,
        isDirectory: true,
        children
      };
    },
    async rescanNode(nodeData) {
      const currentDepth = nodeData.fullPath.split(path.sep).filter(Boolean).length;
      const targetDepth = this.lensPath.split(path.sep).filter(Boolean).length;
      let additionalDepth = this.depth;
      if (targetDepth < currentDepth) {
        additionalDepth += (currentDepth - targetDepth);
      }
      console.log(`重新扫描目录 ${nodeData.fullPath}，当前层级 ${currentDepth}，目标层级 ${targetDepth}，额外扩展深度 ${additionalDepth}`);
      try {
        const newSubtree = await this.buildFileTreeAsync(nodeData.fullPath, nodeData.group || nodeData.name, 0, additionalDepth);
        nodeData.children = newSubtree.children;
        nodeData.size = newSubtree.size;
        nodeData.incomplete = newSubtree.incomplete;
        console.log(`节点 ${nodeData.fullPath} 已更新扫描数据`);
        return additionalDepth;
      } catch (error) {
        console.error("重新扫描节点失败：", nodeData.fullPath, error);
      }
    },
    async buildFileTreeAsync(dirPath, parentName = '', depth = 0, maxDepth = this.depth) {
      const name = path.basename(dirPath);
      let totalSize = 0;
      let children = [];
      let files;
      try {
        files = (await fs.promises.readdir(dirPath)).filter(file => !file.startsWith('.'));
      } catch (err) {
        if (err.code === 'EPERM') {
          console.warn(`权限不足，跳过目录：${dirPath}`);
          this.$store.dispatch('snackbar/showSnackbar', {
            show: true,
            message: `权限不足，已跳过目录：${path.basename(dirPath)}`,
            color: 'warning'
          });
          return {
            name,
            size: 0,
            group: parentName,
            fullPath: dirPath,
            isDirectory: true,
            children: [],
            inaccessible: true
          };
        }
        console.error(`读取目录失败：${dirPath}`, err);
        return {
          name,
          size: 0,
          group: parentName,
          fullPath: dirPath,
          isDirectory: true,
          children: []
        };
      }
      if (depth >= maxDepth) {
        console.log(`达到最大扫描深度 ${maxDepth}，返回时附加 incomplete 标志`);
        return {
          name,
          size: 0,
          group: parentName,
          fullPath: dirPath,
          isDirectory: true,
          children: [],
          incomplete: true
        };
      }
      const results = await Promise.all(files.map(async file => {
        const fullPath = path.join(dirPath, file);
        try {
          await fs.promises.access(fullPath, fs.constants.F_OK);
          const statData = await window.electron.getFileStats(fullPath);
          if (statData.isDirectory) {
            const subtree = await this.buildFileTreeAsync(fullPath, name, depth + 1, maxDepth);
            totalSize += subtree.size;
            return subtree;
          } else if (statData.isFile) {
            const fileSizeKB = Math.ceil(statData.size / 1024);
            totalSize += fileSizeKB;
            return {
              name: file,
              size: fileSizeKB,
              group: name,
              fullPath: fullPath,
              isDirectory: false,
              children: [],
              incomplete: false
            };
          }
        } catch (err) {
          if (err.code === 'ENOENT') {
            console.warn(`文件不存在，跳过：${fullPath}`);
            return null;
          } else if (err.code === 'EACCES') {
            console.warn(`权限不足，跳过：${fullPath}`);
            return null;
          } else {
            console.error("处理文件失败：", fullPath, err);
            return null;
          }
        }
      }));
      children = results.filter(item => item !== null);
      return {
        name,
        size: totalSize,
        group: parentName,
        fullPath: dirPath,
        isDirectory: true,
        children,
        incomplete: false
      };
    },
    loadDirectory() {
      this.fileTree = this.buildFileTree(this.rootPath);
    },
    async loadDirectoryAsync() {
      this.fileTree = await this.buildFileTreeAsync(this.rootPath);
    },
    drawChartWithAnimation() {
      if (!this.fileTree) return;
      this.initialLoad = false;
      d3.select(this.$refs.chart).selectAll("*").remove();
      const self = this;
      const width = 600;
      const height = 600;
      const radius = Math.min(width, height) / 2;
      const innerRadius = 60;
      const topLevelNames = this.fileTree.children ? this.fileTree.children.map(d => d.name) : [];
      this.colorScale = d3.scaleOrdinal().domain(topLevelNames).range(d3.schemeCategory10);
      this.legendItems = topLevelNames.map(name => ({
        name: name,
        color: this.colorScale(name),
        fullPath: this.fileTree.children.find(child => child.name === name)?.fullPath || ''
      }));
      const svg = d3.select(this.$refs.chart)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
      const g = svg.append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);
      const diameter = innerRadius * 2.5;
      const defs = svg.append("defs");
      const pattern = defs.append("pattern")
        .attr("id", "minecraftGlassPattern")
        .attr("width", diameter)
        .attr("height", diameter)
        .attr("x", innerRadius * 1.25)
        .attr("y", innerRadius * 1.25)
        .attr("patternUnits", "userSpaceOnUse")
        .attr("patternRepeat", "no-repeat");
      pattern.append("image")
        .attr("xlink:href", grassSVG)
        .attr("width", diameter)
        .attr("height", diameter);
      const lensCircle = g.append('circle')
        .attr('r', innerRadius)
        .attr('fill', 'url(#minecraftGlassPattern)')
        .style('cursor', 'pointer')
        .on('click', () => {
          if (this.currentFocus && this.currentFocus.parent) {
            this.currentFocus = this.currentFocus.parent;
            updateSunburst(this.currentFocus);
          }
        })
        .on('mousemove', event => {
          const [mx, my] = d3.pointer(event, lensCircle.node());
          const shiftX = mx * 0.3;
          const shiftY = my * 0.3;
          pattern.attr("patternTransform", `translate(${shiftX}, ${shiftY})`);
        })
        .on('mouseout', () => {
          pattern.attr("patternTransform", null);
        });
      const centerText = g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .style('pointer-events', 'none')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#3B00EB')
        .style('text-shadow', '2px 2px 4px rgba(0, 0, 0, 0.5)');
      this.root = d3.hierarchy(this.fileTree);
      this.root.each(node => {
        if (node.data.isDirectory) {
          node.value = node.data.children ? node.data.children.length : 0;
        } else {
          node.value = node.data.size;
        }
      });
      this.currentFocus = this.root;
      const handleContextMenu = (event, d) => {
        event.preventDefault();
        event.stopPropagation();
        this.selectedFile = {
          name: d.data.name,
          fullPath: d.data.fullPath,
          isDirectory: d.data.isDirectory
        };
        this.showContextMenu(event, this.selectedFile);
      };

      function getArcData(d) {
        return { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 };
      }

      const updateSunburst = (focusNode) => {
        if (!focusNode) return;
        self.updateSunburst = updateSunburst;
        const rootHierarchy = d3.hierarchy(focusNode.data).sum(d => d.size);
        d3.partition().size([2 * Math.PI, rootHierarchy.height + 1])(rootHierarchy);
        const focusDepth = focusNode.height;
        const ringThickness = (radius - innerRadius) / (focusDepth > 0 ? focusDepth : 1);
        const arcGen = d3.arc()
          .startAngle(d => d.x0)
          .endAngle(d => d.x1)
          .innerRadius(d => innerRadius + (d.y0 - 1) * ringThickness)
          .outerRadius(d => innerRadius + (d.y1 - 1) * ringThickness);
        const arcs = g.selectAll('path').data(
          rootHierarchy.descendants().filter(d => d.depth > 0),
          d => d.data.name + '-' + d.depth
        );
        arcs.exit()
          .transition()
          .duration(750)
          .attrTween("d", function(d) {
            const current = this._current ? getArcData(this._current) : getArcData(d);
            const target = { x0: d.x0, x1: d.x0, y0: d.y0, y1: d.y1 };
            const i = d3.interpolate(current, target);
            return t => arcGen(i(t));
          })
          .remove();
        arcs.transition()
          .duration(750)
          .attrTween("d", function(d) {
            const current = this._current ? getArcData(this._current) : getArcData(d);
            const target = getArcData(d);
            const i = d3.interpolate(current, target);
            this._current = i(0);
            return t => arcGen(i(t));
          });
        if (focusNode.children && focusNode.children.length > 0) {
          const childrenNames = focusNode.children.map(child => child.data.name);
          self.colorScale = d3.scaleOrdinal().domain(childrenNames).range(d3.schemeCategory10);
          const directories = focusNode.children.filter(child => child.data.isDirectory);
          const files = focusNode.children.filter(child => !child.data.isDirectory);
          self.legendItems = [
            ...directories.map(dir => ({
              name: dir.data.name,
              color: self.colorScale(dir.data.name),
              fullPath: dir.data.fullPath,
              isDirectory: true,
              icon: 'mdi-folder'
            })),
            ...files.map(file => ({
              name: file.data.name,
              color: self.colorScale(file.data.name),
              fullPath: file.data.fullPath,
              isDirectory: false
            }))
          ];
        } else {
          self.legendItems = [];
        }
        self.legendLoading = false;
        const formatSize = value => {
          return value >= 1024 ? (value / 1024).toFixed(1) + ' MB' : value + ' KB';
        };
        const newArcs = arcs.enter().append('path')
          .attr('fill', d => {
            if (d.depth === 1) {
              return self.colorScale(d.data.name);
            } else {
              let ancestor = d;
              while (ancestor.depth > 1) {
                ancestor = ancestor.parent;
              }
              const baseColor = d3.color(self.colorScale(ancestor.data.name));
              const lighten = (d.depth - 1) * 0.2;
              return baseColor.brighter(lighten).toString();
            }
          })
          .attr('stroke', '#fff')
          .attr('stroke-width', 1)
          .each(function(d) {
            this._current = getArcData(d);
          })
          .on('click', async (event, d) => {
            if (d.data.isDirectory) {
              console.log("目录扫描不完整，准备重新扫描：", d.data.fullPath);
              let additionalDepth = await self.rescanNode(d.data);
              self.fileTree = await self.buildFileTreeAsync(self.rootPath, '', 0, additionalDepth);
              self.root = d3.hierarchy(self.fileTree).sum(d => d.size);
              const newTarget = self.root.descendants().find(node => node.data.fullPath === d.data.fullPath);
              if (newTarget) {
                self.currentFocus = newTarget;
              }
              updateSunburst(self.currentFocus);
            }
            event.stopPropagation();
          })
          .on('contextmenu', handleContextMenu)
          .on('mouseover', (event, d) => {
            if (d.data.isDirectory) {
              const count = d.value;
              self.tooltipContent = `${d.data.name}: ${count} 个子项`;
            } else {
              self.tooltipContent = `${d.data.name}: ${formatSize(d.value)}`;
            }
            self.tooltipVisible = true;
          })
          .on('mousemove', (event) => {
            self.tooltipX = event.pageX + 10;
            self.tooltipY = event.pageY + 10;
          })
          .on('mouseout', () => {
            self.tooltipVisible = false;
          });
        newArcs.append('title')
          .text(d => `${d.data.name}: ${d.value}`);
        newArcs.transition()
          .duration(750)
          .attrTween("d", function(d) {
            const current = this._current;
            const target = getArcData(d);
            const i = d3.interpolate(current, target);
            this._current = i(0);
            return t => arcGen(i(t));
          });
        self.chartLoading = false;
      };
      updateSunburst(this.currentFocus);
    },
    loadPathSuggestions() {
      listRepos().then(response => {
        console.log('loadPathSuggestions', JSON.stringify(response.data));
        if (!response.data || !Array.isArray(response.data)) {
          return;
        }
        this.pathSuggestions = response.data.map(repo => {
          return {
            value: repo.local_path,
            title: `${repo.desc}(${repo.name})`
          };
        });
      }).catch(err => {
        console.error("获取仓库数据失败:", err);
      });
    }
  },
  async mounted() {
    // 如有需要，可在 mounted 时加载初始目录数据并绘制图表
    // await this.loadDirectoryAsync();
    // this.drawChartWithAnimation();
  }
};
</script>

<style scoped>
.space-lens-container {
  max-width: 600px;
  margin: 0 auto;
}

.chart {
  text-align: center;
  min-height: 600px;
  position: relative;
}

.legend-list {
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
}

.legend-list li {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.legend-color-block {
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 8px;
}

.tooltip-card {
  background-color: #fff;
  padding: 8px;
  border-radius: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
</style>
