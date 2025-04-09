<template>
  <v-app>
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
              @focus="loadPathSuggestions"
              style="width: 80%"
              color="purple"
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
          <v-btn color="purple" @click="applyLensPath">
            <v-icon color="white">
              mdi-line-scan
            </v-icon>
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
              <h1 style="margin-top: 16px;user-select: none; pointer-events: none;">空间透镜</h1>
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
                  type="list-item-avatar-two-line"
                  class="mx-2"
              ></v-skeleton-loader>
              <!-- 加载完成后显示列表 -->
              <v-list v-else dense class="pa-0">
                <v-list-item
                    v-for="item in legendItems"
                    :key="item.name"
                    @click="onLegendItemClick($event, item)"
                    @contextmenu="showContextMenu($event, item)"
                    style="cursor: pointer;"

                >
                  <v-list-item-avatar>
                    <v-icon :color="item.color" outlined>{{ item.isDirectory ? item.icon : 'mdi-file-outline' }}</v-icon>
                  </v-list-item-avatar>
                  <v-list-item-content>
                    <v-list-item-title>{{ item.name }}</v-list-item-title>
                  </v-list-item-content>
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
    <FileContextMenu
      ref="contextMenu"
      :menu-items="menuItems"
    />
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-app>
</template>


<script>
const { shell } = window.require('electron');
// 引入 d3 模块
import * as d3 from 'd3';
// 在 Electron 环境下可以直接使用 Node 内置模块
const fs = require('fs');
const path = require('path');
import grassSVG from '../assets/透镜.svg';
import FileContextMenu from '../components/FileContextMenu.vue';

export default {
  name: 'SpaceLens',
  components: {
    FileContextMenu
  },
  data() {
    return {
      selectedFile: null,
      // 存储目录树结构数据
      fileTree: null,
      // 图例数据（顶级目录名称及对应颜色）
      legendItems: [],
      // d3 颜色映射
      colorScale: null,
      // 指定需要读取的目录（请替换为实际目录路径）
      rootPath: '',
      // 新增加载状态
      chartLoading: false,
      legendLoading: true,
      // 当前 d3 层级根节点与聚焦节点
      root: null,
      currentFocus: null,
      // 新增 tooltip 状态
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
      // 右键菜单配置
      menuItems: [
        { title: '查看详情', icon: 'mdi-information', action: () => this.viewFileDetails() },
        { title: '复制路径', icon: 'mdi-content-copy', action: () => this.copyFilePath() },
        { title: '在本地目录中显示', icon: 'mdi-folder', action: () => this.openInFinder() }
      ]
    };
  },
  props: {
    // 接收父组件传递的目录路径
    dirPath: {
      type: String,
      default: null
    }
  },
  created() {
    if (this.dirPath != null) {
      // 仅填充输入框，不自动扫描
      this.lensPath = this.dirPath;
      this.rootPath = this.dirPath;
    }
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
    },
  },
  methods: {
    // 显示右键菜单
    showContextMenu(event, item) {
      console.log('右键菜单点击事件', event, item)
      this.$refs.contextMenu.show(event);
      // 保存当前选中的文件项，供菜单操作使用
      this.selectedFile = item;
    },

    // 查看文件详情
    viewFileDetails() {
      if (this.selectedFile && this.selectedFile.fullPath) {
        console.log('跳转到文件浏览器页面，文件路径：', this.selectedFile.fullPath);
        this.$router.push({
          name: 'finder',
          params: { localPath: this.selectedFile.fullPath }
        });
      }
    },

    // 复制文件路径
    copyFilePath() {
      if (this.selectedFile && this.selectedFile.fullPath) {
        navigator.clipboard.writeText(this.selectedFile.fullPath)
          .then(() => {
            this.$store.commit('setSnackbar', {
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

    // 在访达中显示
    openInFinder() {
      if (this.selectedFile && this.selectedFile.fullPath) {
        shell.showItemInFolder(this.selectedFile.fullPath);
      }
    },

    openFile(filePath) {
      shell.openPath(filePath).then(error => {
        if (error) {
          console.error("打开文件失败:", error);
        }
      })
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
      // 在 d3 的层级结构（this.root）中查找匹配 fullPath 的节点
      const target = this.root.descendants().find(n => n.data.fullPath === item.path);
      if (target && this.updateSunburst) {
        this.currentFocus = target;
        this.updateSunburst(target);
      }
    },
    // 新增/修改：用户点击确认按钮时触发扫描
    async applyLensPath() {
      if (this.lensPath) {
        try {
          // 规范路径格式（将反斜杠替换为正斜杠）
          this.lensPath = this.lensPath.replace(/\\/g, '/');
          // 计算路径深度并设置扫描深度
          const pathDepth = this.lensPath.split('/').filter(Boolean).length;
          // 计算自适应扫描深度：从根目录开始每n层增加1层扫描深度
          const adaptiveDepth = Math.floor((pathDepth - 3) / this.n) + this.minDepth;
          // 确保扫描深度在minDepth和maxDepth之间
          const scanDepth = Math.min(Math.max(adaptiveDepth, this.minDepth), this.maxDepth);
          console.log(`路径深度: ${pathDepth}, 自适应扫描深度: ${adaptiveDepth}, 最终扫描深度: ${scanDepth}`);
          this.depth = adaptiveDepth;
          // 将用户输入的路径设置为根目录
          this.rootPath = this.lensPath;
          // 显示加载状态
          this.chartLoading = true;
          this.legendLoading = true;
          // 异步构建目录树（使用计算得到的扫描深度）
          this.fileTree = await this.buildFileTreeAsync(this.rootPath, '', 0, scanDepth);
          // 绘制图表
          this.drawChartWithAnimation();
        } catch (error) {
          console.error("扫描失败：", error);
          this.$store.dispatch('snackbar/showSnackbar', {
            message: '扫描目录失败，请检查输入路径',
            color: 'error',
          });
        }
      } else {
        // 当输入框为空时，重置状态，确保显示占位图及标题
        // 当输入为空时，重置状态
        this.depth = 3;
        this.lensPath = '';
        this.rootPath = '';
        this.chartLoading = false;
        this.legendLoading = true;
        this.fileTree = null;
        this.legendItems = [];
        this.currentFocus = null;
        // 强制重渲染 chart 区域
        this.chartKey++;
        this.initialLoad = true;
        d3.select(this.$refs.chart).selectAll("*").remove();
        this.initialLoad = true;  // 标记为初次加载
      }
    },
    onLegendItemClick($event, item) {
      if (this.currentFocus && this.currentFocus.children) {
        const childNode = this.currentFocus.children.find(child => child.data.name === item.name);
        if (childNode) {
          if (childNode.data.isDirectory) {
            console.log('点击了文件夹：', childNode.data.name)
            this.currentFocus = childNode;
            if (this.updateSunburst) {
              this.updateSunburst(this.currentFocus);
            }
          } else {
            this.showContextMenu(event, item);
          }
        }
      }
    },
    /**
     * 递归构建目录树结构
     * @param {string} dirPath 目录路径
     * @param {string} parentName 父目录名称（用于填充 group 字段）
     * @returns {Object} 目录节点结构 { name, size, group, children }
     */
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
            // 递归构建子目录
            const subtree = this.buildFileTree(fullPath, name);
            children.push(subtree);
            totalSize += subtree.size;
          } else if (stats.isFile()) {
            // 对于文件，转换大小（字节转换为 MB，向上取整）
            const fileSizeMB = Math.ceil(stats.size / 1024 / 1024);
            children.push({
              name: file,
              size: fileSizeMB,
              group: name,
              fullPath: fullPath,    // 新增：保存文件的完整路径
              isDirectory: false,    // 新增：标识为文件
              children: []           // 文件节点children可保持空数组
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
        fullPath: dirPath,     // 新增：保存目录的完整路径
        isDirectory: true,     // 新增：标识为目录
        children
      };
    },
    // 新增：重新扫描某个目录节点（以更高 maxDepth 扩展该节点）
    async rescanNode(nodeData) {
      // 计算当前节点层级（忽略空字符串）
      const currentDepth = nodeData.fullPath.split(path.sep).filter(Boolean).length;
      // 计算用户输入路径的层级
      const targetDepth = this.lensPath.split(path.sep).filter(Boolean).length;
      // 如果用户目标路径更深，则额外扩展的层级为两者之差；否则使用默认值
      let additionalDepth = this.depth;
      if (targetDepth < currentDepth) {
        additionalDepth +=  (currentDepth - targetDepth);
      }
      console.log(`重新扫描目录 ${nodeData.fullPath}，当前层级 ${currentDepth}，目标层级 ${targetDepth}，额外扩展深度 ${additionalDepth}`);
      try {
        // 使用额外扩展的深度进行重新扫描
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
// 新增/修改：限制扫描深度的版本
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
          this.$store.commit('setSnackbar', {
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
      // 当达到最大扫描深度时，返回时附加 incomplete 标志
      if (depth >= maxDepth) {
        console.log(`达到最大扫描深度 ${maxDepth}，返回时附加 incomplete 标志`)
        return {
          name,
          size: 0,
          group: parentName,
          fullPath: dirPath,
          isDirectory: true,
          children: [],
          incomplete: true  // 表示当前目录未扫描完整
        };
      }
      const results = await Promise.all(files.map(async file => {
        const fullPath = path.join(dirPath, file);
        try {
          await fs.promises.access(fullPath, fs.constants.F_OK);
          const stats = await fs.promises.stat(fullPath);
          if (stats.isDirectory()) {
            const subtree = await this.buildFileTreeAsync(fullPath, name, depth + 1, maxDepth);
            totalSize += subtree.size;
            return subtree;
          } else if (stats.isFile()) {
            const fileSizeKB = Math.ceil(stats.size / 1024);
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
    // 根据 rootPath 加载目录结构
    loadDirectory() {
      this.fileTree = this.buildFileTree(this.rootPath);
    },
    async loadDirectoryAsync() {
      this.fileTree = await this.buildFileTreeAsync(this.rootPath);
    },
    drawChartWithAnimation() {
      if (!this.fileTree) return;
      this.initialLoad = false;
      // 清空之前的图表内容
      d3.select(this.$refs.chart).selectAll("*").remove();
      const self = this; // 保存 this 的引用
      // 太阳耀斑图的尺寸设置
      const width = 600;
      const height = 600;
      const radius = Math.min(width, height) / 2;
      const innerRadius = 60;  // 中心空白圆半径

      // 为顶层目录准备颜色比例尺
      const topLevelNames = this.fileTree.children ? this.fileTree.children.map(d => d.name) : [];
      this.colorScale = d3.scaleOrdinal().domain(topLevelNames).range(d3.schemeCategory10);

      // 构建图例项（名称和对应颜色）
      this.legendItems = topLevelNames.map(name => ({
        name: name,
        color: this.colorScale(name),
        fullPath: this.fileTree.children.find(child => child.name === name)?.fullPath || ''
      }));

      // 创建 SVG 容器
      const svg = d3.select(this.$refs.chart)
          .append('svg')
          .attr('width', width)
          .attr('height', height);

      // 图表组，居中于 SVG 中心
      const g = svg.append('g')
          .attr('transform', `translate(${width / 2}, ${height / 2})`);

      // 示例：一个单张 grass.svg 填充圆形，且可随鼠标移动
      const diameter = innerRadius * 2.5;

// 创建 <defs>
      const defs = svg.append("defs");

// 定义 pattern，只渲染一次图像
      const pattern = defs.append("pattern")
          .attr("id", "minecraftGlassPattern")
          .attr("width", diameter)      // 与圆直径相同
          .attr("height", diameter)     // 与圆直径相同
          .attr("x", innerRadius * 1.25)
          .attr("y", innerRadius * 1.25)
          .attr("patternUnits", "userSpaceOnUse")
          .attr("patternRepeat", "no-repeat");  // 只显示一次，无平铺

      pattern.append("image")
          .attr("xlink:href", grassSVG)
          .attr("width", diameter)
          .attr("height", diameter);

// 用该 pattern 填充圆
      const lensCircle = g.append('circle')
          .attr('r', innerRadius)
          .attr('fill', 'url(#minecraftGlassPattern)')
          .style('cursor', 'pointer')
          .on('click', () => {
            // 如果需要点击返回上一级
            if (this.currentFocus && this.currentFocus.parent) {
              this.currentFocus = this.currentFocus.parent;
              updateSunburst(this.currentFocus);
            }
          })
          .on('mousemove', event => {
            // 获取鼠标在圆内的相对坐标
            const [mx, my] = d3.pointer(event, lensCircle.node());

            // 随鼠标小幅平移图像 (系数可自行调节)
            const shiftX = mx * 0.3;
            const shiftY = my * 0.3;

            // 应用到 patternTransform
            pattern.attr("patternTransform", `translate(${shiftX}, ${shiftY})`);
          })
          .on('mouseout', () => {
            // 鼠标离开后恢复默认位置
            pattern.attr("patternTransform", null);
          });


      // 中心文本显示当前文件夹名称
      // eslint-disable-next-line no-unused-vars
      const centerText = g.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .style('pointer-events', 'none')
          .style('font-size', '14px')
          .style('font-weight', 'bold')
          .style('fill', '#3B00EB')
          .style('text-shadow', '2px 2px 4px rgba(0, 0, 0, 0.5)');

      // 构造根层级结构并初始化聚焦节点
      this.root = d3.hierarchy(this.fileTree);
      this.root.each(node => {
        if (node.data.isDirectory) {
          // 仅计算直接子项数量
          node.value = node.data.children ? node.data.children.length : 0;
        } else {
          // 文件节点：保持文件大小计算
          node.value = node.data.size;  // 这里 fileTree 中的 size 已经按 KB 或 MB 计算好了
        }
      });

      this.currentFocus = this.root;  // 初始聚焦为根节点

      // 右键菜单处理函数
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


      // 定义一个辅助函数，只取构造弧形所需的属性
      function getArcData(d) {
        return { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 };
      }


      // 更新或渲染太阳耀斑图，添加动画过渡效果
      const updateSunburst = (focusNode) => {
        if (!focusNode) return;
        this.updateSunburst = updateSunburst;
        // 生成当前聚焦节点的子树结构
        const rootHierarchy = d3.hierarchy(focusNode.data).sum(d => d.size);
        // 计算分区布局
        d3.partition().size([2 * Math.PI, rootHierarchy.height + 1])(rootHierarchy);
        // 计算各层环的厚度
        const focusDepth = focusNode.height;
        const ringThickness = (radius - innerRadius) / (focusDepth > 0 ? focusDepth : 1);

        // 更新中心文本显示当前目录名称
        // centerText.text(focusNode.data.name);

        // 定义弧生成器
        const arcGen = d3.arc()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .innerRadius(d => innerRadius + (d.y0 - 1) * ringThickness)
            .outerRadius(d => innerRadius + (d.y1 - 1) * ringThickness);

        // 数据绑定时使用唯一 key（这里建议加上层级以避免重名冲突）
        const arcs = g.selectAll('path').data(
            rootHierarchy.descendants().filter(d => d.depth > 0),
            d => d.data.name + '-' + d.depth
        );

// 退出旧节点：缩小至极小角度后移除
        arcs.exit()
            .transition()
            .duration(750)
            .attrTween("d", function(d) {
              // 只取关键属性进行插值
              const current = this._current ? getArcData(this._current) : getArcData(d);
              const target = { x0: d.x0, x1: d.x0, y0: d.y0, y1: d.y1 };
              const i = d3.interpolate(current, target);
              return t => arcGen(i(t));
            })
            .remove();

        // 更新现有节点：平滑过渡到新状态
        arcs.transition()
            .duration(750)
            .attrTween("d", function(d) {
              const current = this._current ? getArcData(this._current) : getArcData(d);
              const target = getArcData(d);
              const i = d3.interpolate(current, target);
              this._current = i(0);  // 更新 _current 为插值初值
              return t => arcGen(i(t));
            });
        // 更新颜色比例尺和图例列表（基于当前聚焦节点的子节点）
        if (focusNode.children && focusNode.children.length > 0) {
          const childrenNames = focusNode.children.map(child => child.data.name);
          self.colorScale = d3.scaleOrdinal().domain(childrenNames).range(d3.schemeCategory10);
          // 将子节点分为目录和文件两组
          const directories = focusNode.children.filter(child => child.data.isDirectory);
          const files = focusNode.children.filter(child => !child.data.isDirectory);

          // 构建图例项，目录在前，文件在后
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
        // 进入新节点：初始状态设置为目标状态的起点，然后过渡到正常状态
        const newArcs = arcs.enter().append('path')
            .attr('fill', d => {
              // 如果节点在当前层级（depth === 1），直接用自己的名字做映射
              if (d.depth === 1) {
                return self.colorScale(d.data.name);
              } else {
                // 对于更深层级，使用最近的 depth===1 的祖先节点的名称来确定颜色
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
              // 初始化 _current 仅保存所需属性
              this._current = getArcData(d);
            })
            .on('click', async (event, d) => {
              if (d.data.isDirectory) {
                // 如果该目录扫描结果不完整，则重新扫描以扩展深度
                console.log("目录扫描不完整，准备重新扫描：", d.data.fullPath);
                let additionalDepth = await self.rescanNode(d.data);  // 内部会动态计算 additionalDepth
                // 重新构建整个文件树和 hierarchy（也可以只更新该节点，这里简单全量刷新）
                self.fileTree = await self.buildFileTreeAsync(self.rootPath, '', 0, additionalDepth);
                self.root = d3.hierarchy(self.fileTree).sum(d => d.size);
                // 在新 hierarchy 中查找当前节点
                const newTarget = self.root.descendants().find(node => node.data.fullPath === d.data.fullPath);
                if (newTarget) {
                  self.currentFocus = newTarget;
                }
                updateSunburst(self.currentFocus);
              }
              event.stopPropagation();
            })
            .on('contextmenu', handleContextMenu)
            // 新增 tooltip 事件：
            .on('mouseover', (event, d) => {
              if (d.data.isDirectory) {
                // 显示目录直接子项数量
                const count = d.value;  // 这里 d.value 为直接子项数量
                self.tooltipContent = `${d.data.name}: ${count} 个子项`;
              } else {
                // 对于文件，显示文件大小（调用格式化函数）
                self.tooltipContent = `${d.data.name}: ${formatSize(d.value)}`;
              }
              self.tooltipVisible = true;
            })
            .on('mousemove', (event) => {
              // 根据鼠标事件更新 tooltip 的位置（可根据需要调整偏移量）
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
        // 图表更新完成后关闭载入状态
        self.chartLoading = false;
      };

      // 初始渲染
      updateSunburst(this.currentFocus);
    },
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
    }
  },
  async mounted() {
    // 异步加载目录数据后再绘制图表
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
  /* 确保图表区域有最小高度，便于显示载入动画 */
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
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
</style>
