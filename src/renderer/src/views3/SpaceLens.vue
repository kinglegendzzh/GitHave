<template>
  <v-container class="cover-fill" style="height: 80vh">
    <!-- 全局加载遮罩：在调用 IPC 时显示 -->
    <v-overlay :value="isProcessing" absolute>
      <v-progress-circular indeterminate color="purple" size="64" />
    </v-overlay>

    <v-container fluid class="cover-fill" style="height: 80vh">
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
          />
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
            <v-spacer />
            <v-breadcrumbs :items="breadcrumbs" divider="/">
              <template #item="{ item }">
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
              <img
                :src="grassSVG"
                alt="Chart Placeholder"
                draggable="false"
                style="max-width: 100%; max-height: 100%; display: block; margin: auto; user-select: none; pointer-events: none;"
              />
              <h1 style="margin-top: 16px; user-select: none; pointer-events: none;">空间透镜</h1>
            </div>
            <v-overlay v-else :value="chartLoading">
              <v-progress-circular indeterminate size="64" />
            </v-overlay>
          </div>
        </v-col>

        <!-- 右侧目录列表 -->
        <v-col cols="4">
          <div class="text-center">
            <div class="bg-surface-variant rounded-lg mx-auto">
              <v-skeleton-loader v-if="legendLoading" type="table" />
              <v-list dense class="pa-0" v-else>
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
        <!-- 此处没有明确设置背景颜色，由 v-card 全局主题决定 -->
        <v-card class="tooltip-card theme--light" outlined>
          <v-icon left>mdi-comment</v-icon>
          <span style="font-size: 18px; margin-left: 4px;">{{ tooltipContent }}</span>
        </v-card>
      </div>
    </v-container>

    <FileContextMenu ref="contextMenu" :menu-items="menuItems" />

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import * as d3 from 'd3'
import FileContextMenu from '../components/FileContextMenu.vue'
import { listRepos } from '../service/api'
import grassSVG from '../assets/透镜.svg'

// Electron 内置模块（使用 top-level await）
const fs =  window.electron.fs
const path =  window.electron.path

// 状态管理
const isProcessing = ref(false)
const selectedFile = ref(null)
const fileTree = ref(null)
const legendItems = ref([])
const colorScale = ref(null)
const rootPath = ref('')
const chartLoading = ref(false)
const legendLoading = ref(false)
const root = ref(null)
const currentFocus = ref(null)
const tooltipVisible = ref(false)
const tooltipContent = ref('')
const tooltipX = ref(0)
const tooltipY = ref(0)
const lensPath = ref("")
const pathSuggestions = ref([])
const depth = ref(3)
const initialLoad = ref(true)
const chartKey = ref(0)
// 用于保存 d3 sunburst 更新函数（将在绘图函数中设置）
const updateSunburst = ref(null)

// FileContextMenu 引用
const contextMenu = ref(null)

// 路由与 store（假设项目中已配置 vue-router 与 vuex）
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
const router = useRouter()
const store = useStore()
const snackbar = computed(() => store.state.snackbar)

// menuItems 定义，同时引用下面定义的三个操作函数
const viewFileDetails = () => {
  if (selectedFile.value && selectedFile.value.fullPath) {
    console.log('跳转到文件浏览器页面，文件路径：', selectedFile.value.fullPath)
    router.push({
      name: 'finder',
      params: { localPath: selectedFile.value.fullPath, forceDeep: true, forceReplace: true }
    })
  }
}
const copyFilePath = async () => {
  if (selectedFile.value && selectedFile.value.fullPath) {
    try {
      await navigator.clipboard.writeText(selectedFile.value.fullPath)
      store.dispatch('snackbar/showSnackbar', {
        show: true,
        message: '路径已复制到剪贴板',
        color: 'success'
      })
    } catch (err) {
      console.error('复制失败:', err)
    }
  }
}
const openInFinder = async () => {
  if (selectedFile.value && selectedFile.value.fullPath) {
    await window.electron.shell.openPath(path.dirname(selectedFile.value.fullPath))
  }
}
const menuItems = ref([
  { title: '查看详情', icon: 'mdi-information', action: viewFileDetails },
  { title: '复制路径', icon: 'mdi-content-copy', action: copyFilePath },
  { title: '在本地目录中显示', icon: 'mdi-folder', action: openInFinder }
])

// 面包屑计算（使用 currentFocus 构建）
const breadcrumbs = computed(() => {
  const crumbs = []
  let node = currentFocus.value
  while (node) {
    crumbs.push({ text: node.data.name, path: node.data.fullPath })
    node = node.parent
  }
  return crumbs.reverse()
})

// 以下函数均为组件内业务逻辑

const showContextMenu = (event, item) => {
  console.log('右键菜单点击事件', event, item)
  contextMenu.value?.show(event)
  selectedFile.value = item
}

const navigateToBreadcrumb = (item) => {
  const target = root.value.descendants().find(n => n.data.fullPath === item.path)
  if (target && updateSunburst.value) {
    currentFocus.value = target
    updateSunburst.value(currentFocus.value)
  }
}

const applyLensPath = async () => {
  if (lensPath.value) {
    console.log(`用户输入的路径: ${lensPath.value}`)
    isProcessing.value = true
    try {
      // 规范路径格式
      lensPath.value = lensPath.value.replace(/\\/g, '/')
      const pathDepth = lensPath.value.split('/').filter(Boolean).length
      const adaptiveDepth = Math.floor((pathDepth - 3) / 0.3) + 3
      const scanDepth = Math.min(Math.max(adaptiveDepth, 3), 14)
      console.log(`路径深度: ${pathDepth}, 自适应扫描深度: ${adaptiveDepth}, 最终扫描深度: ${scanDepth}`)
      depth.value = adaptiveDepth
      rootPath.value = lensPath.value
      chartLoading.value = true
      legendLoading.value = true
      fileTree.value = await buildFileTreeAsync(rootPath.value, '', 0, scanDepth)
      drawChartWithAnimation()
    } catch (error) {
      console.error("扫描失败：", error)
      store.dispatch('snackbar/showSnackbar', {
        message: '扫描目录失败，请检查输入路径',
        color: 'error'
      })
      legendLoading.value = false
    } finally {
      isProcessing.value = false
      legendLoading.value = false
    }
  } else {
    console.log('输入为空，不进行扫描')
    depth.value = 3
    lensPath.value = ''
    rootPath.value = ''
    chartLoading.value = false
    legendLoading.value = false
    fileTree.value = null
    legendItems.value = []
    currentFocus.value = null
    chartKey.value++
    initialLoad.value = true
    d3.select(chart.value).selectAll("*").remove()
    initialLoad.value = true
  }
}

const onLegendItemClick = async (event, item) => {
  if (currentFocus.value && currentFocus.value.children) {
    const childNode = currentFocus.value.children.find(child => child.data.name === item.name)
    if (childNode) {
      if (childNode.data.isDirectory) {
        console.log("目录扫描不完整，准备重新扫描：", childNode.data.fullPath)
        isProcessing.value = true
        try {
          let additionalDepth = await rescanNode(childNode.data)
          fileTree.value = await buildFileTreeAsync(rootPath.value, '', 0, additionalDepth)
          root.value = d3.hierarchy(fileTree.value).sum(d => d.size)
          const newTarget = root.value.descendants().find(node => node.data.fullPath === childNode.data.fullPath)
          if (newTarget) {
            currentFocus.value = newTarget
          }
          updateSunburst.value && updateSunburst.value(currentFocus.value)
        } catch (error) {
          console.error("右侧目录扫描失败：", error)
          store.dispatch('snackbar/showSnackbar', {
            message: '扫描目录失败，请检查输入路径',
            color: 'error'
          })
        } finally {
          isProcessing.value = false
        }
      } else {
        showContextMenu(event, item)
      }
    }
  }
}

const buildFileTree = (dirPath, parentName = '') => {
  const name = path.basename(dirPath)
  let totalSize = 0
  let children = []
  let files
  try {
    files = fs.readdirSync(dirPath).filter(file => !file.startsWith('.'))
  } catch (err) {
    console.error("读取目录失败：", err)
    return { name, size: 0, group: parentName, children: [] }
  }
  files.forEach(file => {
    const fullPath = path.join(dirPath, file)
    try {
      const stats = fs.statSync(fullPath)
      if (stats.isDirectory()) {
        const subtree = buildFileTree(fullPath, name)
        children.push(subtree)
        totalSize += subtree.size
      } else if (stats.isFile()) {
        const fileSizeMB = Math.ceil(stats.size / 1024 / 1024)
        children.push({
          name: file,
          size: fileSizeMB,
          group: name,
          fullPath,
          isDirectory: false,
          children: []
        })
        totalSize += fileSizeMB
      }
    } catch (err) {
      console.error("处理文件失败：", fullPath, err)
    }
  })
  return {
    name,
    size: totalSize,
    group: parentName,
    fullPath: dirPath,
    isDirectory: true,
    children
  }
}

const rescanNode = async (nodeData) => {
  const currentDepth = nodeData.fullPath.split(path.sep).filter(Boolean).length
  const targetDepth = lensPath.value.split(path.sep).filter(Boolean).length
  let additionalDepth = depth.value
  if (targetDepth < currentDepth) {
    additionalDepth += (currentDepth - targetDepth)
  }
  console.log(`重新扫描目录 ${nodeData.fullPath}，当前层级 ${currentDepth}，目标层级 ${targetDepth}，额外扩展深度 ${additionalDepth}`)
  try {
    const newSubtree = await buildFileTreeAsync(nodeData.fullPath, nodeData.group || nodeData.name, 0, additionalDepth)
    nodeData.children = newSubtree.children
    nodeData.size = newSubtree.size
    nodeData.incomplete = newSubtree.incomplete
    console.log(`节点 ${nodeData.fullPath} 已更新扫描数据`)
    return additionalDepth
  } catch (error) {
    console.error("重新扫描节点失败：", nodeData.fullPath, error)
  }
}

const buildFileTreeAsync = async (dirPath, parentName = '', d = 0, maxDepth = depth.value) => {
  const name = path.basename(dirPath)
  let totalSize = 0
  let children = []
  let files
  try {
    files = (await fs.promises.readdir(dirPath)).filter(file => !file.startsWith('.'))
  } catch (err) {
    if (err.code === 'EPERM') {
      console.warn(`权限不足，跳过目录：${dirPath}`)
      store.dispatch('snackbar/showSnackbar', {
        show: true,
        message: `权限不足，已跳过目录：${path.basename(dirPath)}`,
        color: 'warning'
      })
      return {
        name,
        size: 0,
        group: parentName,
        fullPath: dirPath,
        isDirectory: true,
        children: [],
        inaccessible: true
      }
    }
    console.error(`读取目录失败：${dirPath}`, err)
    return {
      name,
      size: 0,
      group: parentName,
      fullPath: dirPath,
      isDirectory: true,
      children: []
    }
  }
  if (d >= maxDepth) {
    console.log(`达到最大扫描深度 ${maxDepth}，返回时附加 incomplete 标志`)
    return {
      name,
      size: 0,
      group: parentName,
      fullPath: dirPath,
      isDirectory: true,
      children: [],
      incomplete: true
    }
  }
  const results = await Promise.all(files.map(async file => {
    const fullPath = path.join(dirPath, file)
    try {
      await fs.promises.access(fullPath, fs.constants.F_OK)
      const statData = await window.electron.getFileStats(fullPath)
      if (statData.isDirectory) {
        const subtree = await buildFileTreeAsync(fullPath, name, d + 1, maxDepth)
        totalSize += subtree.size
        return subtree
      } else if (statData.isFile) {
        const fileSizeKB = Math.ceil(statData.size / 1024)
        totalSize += fileSizeKB
        return {
          name: file,
          size: fileSizeKB,
          group: name,
          fullPath,
          isDirectory: false,
          children: [],
          incomplete: false
        }
      }
    } catch (err) {
      if (err.code === 'ENOENT' || err.code === 'EACCES') {
        console.warn(`跳过文件：${fullPath}`)
        return null
      } else {
        console.error("处理文件失败：", fullPath, err)
        return null
      }
    }
  }))
  children = results.filter(item => item !== null)
  return {
    name,
    size: totalSize,
    group: parentName,
    fullPath: dirPath,
    isDirectory: true,
    children,
    incomplete: false
  }
}

const loadPathSuggestions = async () => {
  try {
    const response = await listRepos()
    console.log('loadPathSuggestions', JSON.stringify(response.data))
    if (!response.data || !Array.isArray(response.data)) return
    pathSuggestions.value = response.data.map(repo => ({
      value: repo.local_path,
      title: `${repo.desc}(${repo.name})`
    }))
  } catch (err) {
    console.error("获取仓库数据失败:", err)
  }
}

// 绘制图表并添加动画与交互
const chart = ref(null)
const drawChartWithAnimation = () => {
  if (!fileTree.value) return
  initialLoad.value = false
  d3.select(chart.value).selectAll("*").remove()
  const width = 600, height = 600
  const radius = Math.min(width, height) / 2
  const innerRadius = 60
  const topLevelNames = fileTree.value.children ? fileTree.value.children.map(d => d.name) : []
  colorScale.value = d3.scaleOrdinal().domain(topLevelNames).range(d3.schemeCategory10)
  legendItems.value = topLevelNames.map(name => {
    const child = fileTree.value.children.find(child => child.name === name)
    return {
      name,
      color: colorScale.value(name),
      fullPath: child?.fullPath || ''
    }
  })
  const svg = d3.select(chart.value)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
  const g = svg.append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`)
  const diameter = innerRadius * 2.5
  const defs = svg.append("defs")
  const pattern = defs.append("pattern")
    .attr("id", "minecraftGlassPattern")
    .attr("width", diameter)
    .attr("height", diameter)
    .attr("x", innerRadius * 1.25)
    .attr("y", innerRadius * 1.25)
    .attr("patternUnits", "userSpaceOnUse")
    .attr("patternRepeat", "no-repeat")
  pattern.append("image")
    .attr("xlink:href", grassSVG)
    .attr("width", diameter)
    .attr("height", diameter)
  const lensCircle = g.append('circle')
    .attr('r', innerRadius)
    .attr('fill', 'url(#minecraftGlassPattern)')
    .style('cursor', 'pointer')
    .on('click', () => {
      if (currentFocus.value && currentFocus.value.parent) {
        currentFocus.value = currentFocus.value.parent
        if (updateSunburst.value) {
          updateSunburst.value(currentFocus.value)
        }
      }
    })
    .on('mousemove', event => {
      const [mx, my] = d3.pointer(event, lensCircle.node())
      const shiftX = mx * 0.3
      const shiftY = my * 0.3
      pattern.attr("patternTransform", `translate(${shiftX}, ${shiftY})`)
    })
    .on('mouseout', () => {
      pattern.attr("patternTransform", null)
    })
  g.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .style('pointer-events', 'none')
    .style('font-size', '14px')
    .style('font-weight', 'bold')
    .style('fill', '#3B00EB')
    .style('text-shadow', '2px 2px 4px rgba(0, 0, 0, 0.5)')
  root.value = d3.hierarchy(fileTree.value)
  root.value.each(node => {
    if (node.data.isDirectory) {
      node.value = node.data.children ? node.data.children.length : 0
    } else {
      node.value = node.data.size
    }
  })
  currentFocus.value = root.value

  const handleContextMenu = (event, d) => {
    event.preventDefault()
    event.stopPropagation()
    selectedFile.value = {
      name: d.data.name,
      fullPath: d.data.fullPath,
      isDirectory: d.data.isDirectory
    }
    showContextMenu(event, selectedFile.value)
  }
  const getArcData = d => ({ x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 })

  const updateSunburstFunc = focusNode => {
    if (!focusNode) return
    updateSunburst.value = updateSunburstFunc
    const rootHierarchy = d3.hierarchy(focusNode.data).sum(d => d.size)
    d3.partition().size([2 * Math.PI, rootHierarchy.height + 1])(rootHierarchy)
    const focusDepth = focusNode.height
    const ringThickness = (radius - innerRadius) / (focusDepth > 0 ? focusDepth : 1)
    const arcGen = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => innerRadius + (d.y0 - 1) * ringThickness)
      .outerRadius(d => innerRadius + (d.y1 - 1) * ringThickness)
    const arcs = g.selectAll('path').data(
      rootHierarchy.descendants().filter(d => d.depth > 0),
      d => d.data.name + '-' + d.depth
    )
    arcs.exit()
      .transition()
      .duration(750)
      .attrTween("d", function(d) {
        const current = this._current ? getArcData(this._current) : getArcData(d)
        const target = { x0: d.x0, x1: d.x0, y0: d.y0, y1: d.y1 }
        const i = d3.interpolate(current, target)
        return t => arcGen(i(t))
      })
      .remove()
    arcs.transition()
      .duration(750)
      .attrTween("d", function(d) {
        const current = this._current ? getArcData(this._current) : getArcData(d)
        const target = getArcData(d)
        const i = d3.interpolate(current, target)
        this._current = i(0)
        return t => arcGen(i(t))
      })
    if (focusNode.children && focusNode.children.length > 0) {
      const childrenNames = focusNode.children.map(child => child.data.name)
      colorScale.value = d3.scaleOrdinal().domain(childrenNames).range(d3.schemeCategory10)
      const directories = focusNode.children.filter(child => child.data.isDirectory)
      const files = focusNode.children.filter(child => !child.data.isDirectory)
      legendItems.value = [
        ...directories.map(dir => ({
          name: dir.data.name,
          color: colorScale.value(dir.data.name),
          fullPath: dir.data.fullPath,
          isDirectory: true,
          icon: 'mdi-folder'
        })),
        ...files.map(file => ({
          name: file.data.name,
          color: colorScale.value(file.data.name),
          fullPath: file.data.fullPath,
          isDirectory: false
        }))
      ]
    } else {
      legendItems.value = []
    }
    legendLoading.value = false
    const formatSize = value => value >= 1024 ? (value / 1024).toFixed(1) + ' MB' : value + ' KB'
    const newArcs = arcs.enter().append('path')
      .attr('fill', d => {
        if (d.depth === 1) {
          return colorScale.value(d.data.name)
        } else {
          let ancestor = d
          while (ancestor.depth > 1) {
            ancestor = ancestor.parent
          }
          const baseColor = d3.color(colorScale.value(ancestor.data.name))
          const lighten = (d.depth - 1) * 0.2
          return baseColor.brighter(lighten).toString()
        }
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .each(function(d) { this._current = getArcData(d) })
      .on('click', async (event, d) => {
        if (d.data.isDirectory) {
          console.log("目录扫描不完整，准备重新扫描：", d.data.fullPath)
          let additionalDepth = await rescanNode(d.data)
          fileTree.value = await buildFileTreeAsync(rootPath.value, '', 0, additionalDepth)
          root.value = d3.hierarchy(fileTree.value).sum(d => d.size)
          const newTarget = root.value.descendants().find(node => node.data.fullPath === d.data.fullPath)
          if (newTarget) {
            currentFocus.value = newTarget
          }
          updateSunburstFunc(currentFocus.value)
        }
        event.stopPropagation()
      })
      .on('contextmenu', handleContextMenu)
      .on('mouseover', (event, d) => {
        if (d.data.isDirectory) {
          tooltipContent.value = `${d.data.name}: ${d.value} 个子项`
        } else {
          tooltipContent.value = `${d.data.name}: ${formatSize(d.value)}`
        }
        tooltipVisible.value = true
      })
      .on('mousemove', event => {
        tooltipX.value = event.pageX + 10
        tooltipY.value = event.pageY + 10
      })
      .on('mouseout', () => {
        tooltipVisible.value = false
      })
    newArcs.append('title').text(d => `${d.data.name}: ${d.value}`)
    newArcs.transition()
      .duration(750)
      .attrTween("d", function(d) {
        const current = this._current
        const target = getArcData(d)
        const i = d3.interpolate(current, target)
        this._current = i(0)
        return t => arcGen(i(t))
      })
    legendLoading.value = false
    chartLoading.value = false
  }
  updateSunburstFunc(currentFocus.value)
}

onMounted(() => {
  // 如有需要，可在 mounted 时做额外初始化（例如自动加载默认数据）
})
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
.tooltip-card span {
  color: #454545 !important;
}
</style>
