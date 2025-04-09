<template>
    <v-app data-app>
      <div class="sunburst-container" style="display: flex">
        <!-- 图表容器 -->
        <div ref="chart" class="chart"></div>
        <!-- 图例：显示顶级目录名称和对应颜色 -->
        <ul class="legend-list" style="display: block; min-width: 200px">
          <li v-for="item in legendItems" :key="item.name">
            <span class="legend-color-block" :style="{ backgroundColor: item.color }"></span>
            {{ item.name }}
          </li>
        </ul>
      </div>
    </v-app>
</template>

<script>
import * as d3 from 'd3';

// 生成随机嵌套目录数据的函数
function generateRandomData(maxDepth = 3, maxChildren = 5) {
  let count = 0;
  // 递归辅助函数用于创建节点（文件夹或文件）
  function createNode(currentDepth) {
    count++;
    const node = { name: `Folder ${count}` };
    if (currentDepth < maxDepth && Math.random() < 0.7) {
      // 如果未达到最大深度且概率满足，则创建子节点
      const numChildren = Math.floor(Math.random() * (maxChildren - 2 + 1)) + 2;
      node.children = [];
      for (let i = 0; i < numChildren; i++) {
        node.children.push(createNode(currentDepth + 1));
      }
    } else {
      // 叶子节点（文件）设置随机大小
      node.size = Math.floor(Math.random() * 500) + 10;
    }
    return node;
  }
  // 根节点表示磁盘
  const root = { name: 'Disk', children: [] };
  // 生成随机数量的顶层文件夹
  const topCount = Math.floor(Math.random() * (maxChildren - 3 + 1)) + 3;
  for (let i = 0; i < topCount; i++) {
    root.children.push(createNode(1));
  }
  return root;
}

// 为每个节点分配 `group` 属性，等于其顶层文件夹名称
function assignGroupNames(root) {
  if (!root.children) return;
  root.children.forEach(child => {
    // 使用子节点名称作为组名及其所有后代的组名
    const groupName = child.name;
    function propagateGroup(node) {
      node.group = groupName;
      if (node.children) {
        node.children.forEach(c => propagateGroup(c));
      }
    }
    propagateGroup(child);
  });
}

export default {
  name: 'SpaceLensss',
  data() {
    // 生成随机数据并分配组名用于颜色映射
    const data = generateRandomData();
    assignGroupNames(data);
    console.log('lens: ', JSON.stringify(data))
    return {
      chartData: data,
      legendItems: []  // will be populated in mounted
    };
  },
  mounted() {
    // 太阳耀斑图的尺寸设置
    const width = 600;
    const height = 600;
    const radius = Math.min(width, height) / 2;
    const innerRadius = 60;  // radius of the inner blank circle (creates donut hole)

    // 为顶层目录准备颜色比例尺
    const topLevelNames = this.chartData.children ? this.chartData.children.map(d => d.name) : [];
    this.colorScale = d3.scaleOrdinal().domain(topLevelNames).range(d3.schemeCategory10);

    // 构建图例项（名称和对应颜色）
    this.legendItems = topLevelNames.map(name => ({
      name: name,
      color: this.colorScale(name)
    }));

    // 创建 SVG 容器
    const svg = d3.select(this.$refs.chart)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // 图表组，居中于 SVG 中心
    const g = svg.append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // 在中心添加一个透明圆圈用于缩放（返回）交互
    // eslint-disable-next-line no-unused-vars
    const centerCircle = g.append('circle')
      .attr('r', innerRadius)
      .attr('fill', '#fff')
      .attr('opacity', 0)            // invisible, but will capture clicks
      .style('pointer-events', 'all')
      .on('click', () => {
        // 点击时缩放回父目录（如果存在）
        if (this.currentFocus && this.currentFocus.parent) {
          this.currentFocus = this.currentFocus.parent;
          updateSunburst(this.currentFocus);
        }
      });

    // 中心文本显示当前文件夹名称
    const centerText = g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('pointer-events', 'none')
      .style('font-size', '14px');

    // 创建根层级结构并初始化聚焦
    this.root = d3.hierarchy(this.chartData).sum(d => d.size);
    this.currentFocus = this.root;  // start focused on root (whole disk)

    // 函数用于格式化大小值（MB/GB）
    const formatSize = value => {
      if (value >= 1024) {
        return (value / 1024).toFixed(1) + ' GB';
      } else {
        return value + ' MB';
      }
    };

    // 绘制或更新太阳耀斑图的函数
    const updateSunburst = (focusNode) => {
      if (!focusNode) return;
      // 生成聚焦节点子树的层级结构
      const rootHierarchy = d3.hierarchy(focusNode.data).sum(d => d.size);
      // 计算子树的分区布局（径向坐标）
      d3.partition().size([2 * Math.PI, rootHierarchy.height + 1])(rootHierarchy);
      // 计算太阳耀斑中每个环（层级）的厚度
      const focusDepth = focusNode.height;  // number of levels below focus
      const ringThickness = (radius - innerRadius) / (focusDepth > 0 ? focusDepth : 1);

      // 更新中心文本为当前文件夹名称
      centerText.text(focusNode.data.name);

      // 选择所有现有弧形路径并移除（清除旧状态）
      g.selectAll('path').remove();

      // 绘制所有节点的弧形路径（跳过聚焦节点本身）
      const arcs = g.selectAll('path')
        .data(rootHierarchy.descendants().filter(d => d.depth > 0))
        .enter()
        .append('path')
        .attr('d', d3.arc()
          .startAngle(d => d.x0)
          .endAngle(d => d.x1)
          .innerRadius(d => innerRadius + (d.y0 - 1) * ringThickness)
          .outerRadius(d => innerRadius + (d.y1 - 1) * ringThickness)
        )
        .attr('fill', d => {
          // 根据顶层组名确定基础颜色
          const baseColor = d3.color(this.colorScale(d.data.group));
          // 深度超过1时调亮颜色
          if (d.depth > 1) {
            const lighten = (d.depth - 1) * 0.2;
            return baseColor.brighter(lighten).toString();
          }
          return baseColor.toString();
        })
        .attr('stroke', '#fff')   // white stroke to separate segments
        .attr('stroke-width', 1)
        .on('click', (event, d) => {
          // 点击时缩放进入点击的段落（如果有子节点，即为文件夹）
          // 通过数据引用在原始层级结构中找到对应的节点
          if (d.children) {
            const targetNode = this.root.descendants().find(node => node.data === d.data);
            if (targetNode) {
              this.currentFocus = targetNode;
              updateSunburst(this.currentFocus);
            }
          }
          // 如果没有子节点（文件），点击时不做任何操作
          event.stopPropagation();
        });

      // 添加悬停提示：文件夹名称和大小
      arcs.append('title')
        .text(d => `${d.data.name}: ${formatSize(d.value)}`);
    };

    // 初始渲染太阳耀斑图
    updateSunburst(this.currentFocus);
  }
};
</script>

<style scoped>
.sunburst-container {
  max-width: 600px;
  margin: 0 auto;
}
.chart {
  /* Container for SVG chart, center alignment */
  text-align: center;
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
</style>
