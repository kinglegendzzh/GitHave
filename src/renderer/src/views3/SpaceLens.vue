<template>
  <v-container class="cover-fill space-lens-container-modern" style="overflow-y: unset">
    <!-- 全局加载遮罩：在调用 IPC 时显示 -->
    <v-overlay :value="isProcessing" absolute class="modern-overlay">
      <v-progress-circular indeterminate color="purple" size="64" />
    </v-overlay>

    <v-container fluid class="cover-fill">
      <v-row style="display: block">
        <div style="display: flex">
          <v-autocomplete
            v-model="lensPath"
            :items="pathSuggestions"
            label="选择代码仓库..."
            dense
            variant="solo-filled"
            flat
            clearable
            item-title="title"
            item-value="value"
            style="width: 55%"
            color="purple"
            @focus="loadPathSuggestions"
            @click="loadPathSuggestions"
          >
            <template #item="{ item, props }">
              <v-list-item v-bind="props">
                <template #title>
                  <span style="display: flex; align-items: center">
                    <span>{{ item.raw.title }}</span>
                  </span>
                </template>
                <template #subtitle>
                  <span>{{ item.raw.value }}</span>
                </template>
              </v-list-item>
            </template>
            <template #append-inner>
              <!-- <v-chip v-if="lensPath" color="purple" size="x-small">已全量构建索引</v-chip> -->
            </template>
          </v-autocomplete>
          <v-btn color="purple" class="ml-2 mt-2 modern-btn" elevation="0" @click="applyLensPath">
            <v-icon color="white">mdi-line-scan</v-icon>
            <span style="color: white">深度扫描</span>
          </v-btn>
          <v-switch
            v-model="fullScan"
            label="全量扫描"
            color="purple"
            class="ml-2 pb-7"
            density="compact"
            hide-details
            style="width: 110px"
          />
          <v-tooltip bottom>
            <template #activator="{ props }">
              <v-icon v-bind="props" color="grey" size="small" class="ml-0 mt-2 pt-2">
                mdi-information-outline
              </v-icon>
            </template>
            <span
            >开启全量扫描可获得更精确的文件类型分布信息，<br />但会增加扫描时间和性能消耗</span
            >
          </v-tooltip>
        </div>

        <div
          class="button-group-modern"
          style="
            width: 45%;
            height: 55px;
            font-size: 18px;
            display: flex;
            align-items: center;
            margin-top: 0px;
            gap: 8px;
          "
        >
          <v-btn
            ref="buildIndexBtn"
            variant="outlined"
            color="orange"
            class="modern-btn"
            elevation="0"
            @click="toggleBuildIndexDialog"
          >
            <v-icon>mdi-database-plus</v-icon>
            <span>构建索引</span>
          </v-btn>
          <v-btn
            ref="codeViewBtn"
            variant="outlined"
            color="thirdary"
            class="modern-btn"
            elevation="0"
            @click="toggleCodeViewDrawer"
          >
            <v-icon>mdi-code-braces</v-icon>
            <span>从代码视窗查看</span>
          </v-btn>
          <v-btn
            ref="architectureBtn"
            variant="outlined"
            color="teal"
            elevation="0"
            @click="toggleArchitectureDrawer"
          >
            <v-icon>mdi-sitemap</v-icon>
            <span>解释并生成流程图</span>
          </v-btn>
          <v-btn
            ref="analysisBtn"
            variant="outlined"
            color="indigo"
            elevation="0"
            @click="toggleAnalysisDrawer"
          >
            <v-icon>mdi-file-document</v-icon>
            <span>生成代码分析报告</span>
          </v-btn>

          <!-- 权重配置按钮 -->
          <div v-if="showAiReferenceSwitch" class="weight-config-button ml-0">
            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  size="small"
                  variant="outlined"
                  color="primary"
                  @click="weightConfigDialog = true"
                >
                  <v-icon size="16">mdi-tune</v-icon>
                  AI分析场景权重配置
                </v-btn>
              </template>
              <span>
                配置不同分析场景的权重<br />
                可以根据分析需求调整各维度的重要性
              </span>
            </v-tooltip>
          </div>

          <!-- AI参考信息选择开关 -->
          <div v-if="showAiReferenceSwitch" class="ai-reference-switch ml-2">
            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-switch
                  v-bind="props"
                  v-model="aiReferenceChoice"
                  color="deep-purple"
                  density="compact"
                  hide-details
                  @click="toggleAiReference"
                >
                  <template #label>
                    <span class="text-caption" style="min-width: 150px">
                      <v-icon size="14" class="mr-1">mdi-brain</v-icon>
                      {{ aiReferenceChoice ? 'AI参考索引+源码' : 'AI仅参考索引' }}
                    </span>
                  </template>
                </v-switch>
              </template>
              <span>
                控制AI分析时的参考信息范围<br />
                开启：索引和源代码（给AI提供更详细的参考信息，适合中小型项目，或者专项分析少量代码文件的场景）<br />
                关闭：仅索引（推荐用于扫描大型项目和复杂代码库，或者层级目录代码文件较多的场景，避免信息过载）
              </span>
            </v-tooltip>
          </div>
        </div>
      </v-row>
      <!--      <v-row>-->
      <!--        <div class="p-6">-->
      <!--          <h2 class="text-2xl mb-4">调试：代码分析报告弹窗</h2>-->
      <!--          <v-btn @click="openModal">-->
      <!--            打开调试弹窗-->
      <!--          </v-btn>-->

      <!--          &lt;!&ndash; 直接传入模拟数据 &ndash;&gt;-->
      <!--          <AnalysisReportModal-->
      <!--            v-model="isModalVisible"-->
      <!--            :repo-i-d="dummyRepoID"-->
      <!--            :target-path="dummyTargetPath"-->
      <!--            :scope-text="dummyScopeText"-->
      <!--          />-->
      <!--        </div>-->
      <!--      </v-row>-->

      <!-- 新增：文件类型统计展示区域 -->
      <v-row v-if="showFileTypeStats">
        <v-col cols="12" style="padding-top: 0px; margin-top: 0px; max-height: 80px; z-index: 99">
          <!-- 紧凑模式：显示前4个类型 + Other -->
          <div
            v-if="!fileTypeStatsExpanded"
            class="file-type-compact-stats"
            @click="fileTypeStatsExpanded = true"
          >
            <div class="compact-header">
              <div class="compact-title">
                <v-icon color="primary" size="14" class="mr-1">mdi-chart-donut</v-icon>
                <span class="text-caption font-weight-medium">文件类型分布</span>
                <v-chip color="primary" variant="outlined" size="x-small" class="ml-1">
                  {{ fileTypeStats.length }} 种
                </v-chip>
              </div>
              <v-btn
                size="x-small"
                variant="text"
                color="primary"
                @click="fileTypeStatsExpanded = true"
              >
                详情
                <v-icon size="12" class="ml-1">mdi-chevron-down</v-icon>
              </v-btn>
            </div>
            <div class="compact-bars">
              <!-- 统一比例条 -->
              <div class="unified-progress-bar">
                <div
                  v-for="(type, index) in getCompactFileTypes"
                  :key="type.extension"
                  class="progress-segment"
                  :style="{
                    width: type.percentage + '%',
                    backgroundColor: getTypeColor(index)
                  }"
                  :title="`${type.extension}: ${type.percentage}%`"
                ></div>
              </div>
              <!-- 图例 -->
              <div class="compact-legend">
                <div
                  v-for="(type, index) in getCompactFileTypes"
                  :key="type.extension"
                  class="legend-item"
                >
                  <div class="legend-color" :style="{ backgroundColor: getTypeColor(index) }"></div>
                  <span class="legend-text text-caption">{{ type.extension }}</span>
                  <span class="legend-percentage text-caption font-weight-bold"
                  >{{ type.percentage }}%</span
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- 展开模式：显示所有类型 -->
          <v-card v-else class="file-type-stats-card modern-surface" elevation="2">
            <v-card-title class="d-flex align-center" @click="fileTypeStatsExpanded = false">
              <v-icon color="primary" class="mr-2">mdi-chart-pie</v-icon>
              <span>代码文件类型分布</span>
              <v-spacer />
              <v-btn
                size="small"
                variant="text"
                color="primary"
                @click="fileTypeStatsExpanded = false"
              >
                收起
                <v-icon size="16" class="ml-1">mdi-chevron-up</v-icon>
              </v-btn>
            </v-card-title>
            <v-card-text>
              <v-row>
                <!-- 左侧：饼图 -->
                <v-col cols="5">
                  <div class="file-type-chart-container">
                    <div id="file-type-chart" :key="fileTypeChartKey"></div>
                  </div>
                </v-col>
                <!-- 右侧：详细列表 -->
                <v-col cols="7">
                  <div class="file-type-list">
                    <div
                      v-for="(type, index) in fileTypeStats"
                      :key="type.extension"
                      class="file-type-item"
                      :style="{ animationDelay: `${index * 100}ms` }"
                    >
                      <div class="file-type-info">
                        <v-avatar size="32" class="mr-3">
                          <v-icon :color="getTypeColorName(index)" size="20">{{
                            type.icon
                            }}</v-icon>
                        </v-avatar>
                        <div class="file-type-details">
                          <div class="file-type-name">{{ type.extension }}</div>
                          <div class="file-type-stats-text">{{ type.count }} 个文件</div>
                        </div>
                        <div class="file-type-percentage">
                          <v-chip
                            :color="getTypeColorName(index)"
                            variant="flat"
                            size="small"
                            class="percentage-chip"
                          >
                            {{ type.percentage }}%
                          </v-chip>
                        </div>
                      </div>
                      <v-progress-linear
                        :model-value="type.percentage"
                        :color="getTypeColorName(index)"
                        height="4"
                        rounded
                        class="mt-2"
                      ></v-progress-linear>
                    </div>
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- 顶部工具栏：面包屑导航 -->
      <v-row>
        <v-col cols="12">
          <v-toolbar flat color="transparent" density="compact">
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
      <!-- 色卡模板弹窗 -->
      <v-dialog v-model="showPaletteDialog" max-width="480">
        <v-card>
          <v-card-title>选择配色方案</v-card-title>
          <v-card-text>
            <!-- 配色模式选择 -->
            <div class="mb-4">
              <v-card-subtitle class="px-0 pb-2 pt-0">配色模式</v-card-subtitle>
              <v-btn-toggle
                v-model="colorMode"
                mandatory
                color="primary"
                density="comfortable"
                class="mb-3"
              >
                <v-btn value="horizontal" prepend-icon="mdi-view-parallel">
                  <span class="text-body-2">同层级渐变</span>
                </v-btn>
                <v-btn value="vertical" prepend-icon="mdi-view-sequential">
                  <span class="text-body-2">垂直子层级渐变</span>
                </v-btn>
              </v-btn-toggle>
              <v-divider class="mb-3"></v-divider>
            </div>
            <!-- 预设色卡 -->
            <v-card-subtitle class="px-0 pb-2 pt-0">预设色卡</v-card-subtitle>
            <div style="display: flex; flex-wrap: wrap; gap: 16px">
              <div
                v-for="(palette, idx) in presetPalettes"
                :key="idx"
                style="cursor: pointer"
                @click="applyPalette(palette)"
              >
                <div
                  style="
                    display: flex;
                    gap: 0;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 2px solid #eee;
                  "
                >
                  <div
                    v-for="(color, i) in palette"
                    :key="i"
                    :style="{ width: '32px', height: '32px', background: color }"
                  ></div>
                </div>
              </div>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn text @click="showPaletteDialog = false">关闭</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- 主体内容：左侧图表、右侧目录列表 -->
      <v-row>
        <!-- 图表区域 -->
        <v-col cols="8">
          <div style="display: flex; align-items: center; margin-bottom: 8px">
            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-icon v-bind="props" small class="ml-1">mdi-help-circle-outline</v-icon>
              </template>
              <span>
                1. 透镜路径：选择要分析的代码仓库路径，点击按钮，开始扫描代码。<br />
                2.
                与左侧多级饼图交互：可以直观地查看代码仓库的结构，以及文件分布，也可以快速跳转到任意目录；点击饼图的中心图标返回上一级目录；右键点击饼图部分，通过弹出菜单项对文件进行操作。<br />
                3.
                与右侧目录列表交互：通过面包屑导航快速跳转到任意目录；右键点击文件夹或左键点击代码文件，通过弹出菜单项对文件进行操作。<br />
                4.
                【弹出菜单项】你可以预览代码详情、复制路径、在本地目录打开、生成分析报告、生成流程图。
              </span>
            </v-tooltip>
            <v-btn-toggle
              v-model="renderMode"
              variant="outlined"
              mandatory
              density="compact"
              color="purple"
              class="ml-2 mr-2"
            >
              <v-btn value="count">按子数量展示</v-btn>
              <v-btn value="size">按文件大小展示</v-btn>
            </v-btn-toggle>
            <!-- 新增：色系选择器和色卡模板按钮 -->
            <div style="display: flex; align-items: center; gap: 12px" class="mr-2 ml-2">
              <v-btn
                size="small"
                color="primary"
                variant="outlined"
                class="mr-2"
                @click="showPaletteDialog = true"
              >配色</v-btn
              >
              <input
                v-model="colorRange[0]"
                type="color"
                style="width: 32px; height: 32px; border: none; background: none"
              />
              <span>→</span>
              <input
                v-model="colorRange[1]"
                type="color"
                style="width: 32px; height: 32px; border: none; background: none"
              />
              <span>→</span>
              <input
                v-model="colorRange[2]"
                type="color"
                style="width: 32px; height: 32px; border: none; background: none"
              />
              <v-btn icon size="small" variant="plain" @click="refreshChart">
                <v-icon>mdi-refresh</v-icon>
              </v-btn>
            </div>
          </div>
          <div ref="chart" :key="chartKey" class="chart" style="position: relative">
            <div v-if="initialLoad" style="text-align: center">
              <img
                :src="grassSVG"
                alt="Chart Placeholder"
                draggable="false"
                style="
                  max-width: 100%;
                  max-height: 100%;
                  display: block;
                  margin: auto;
                  user-select: none;
                  pointer-events: none;
                "
              />
              <h1 style="margin-top: 16px; user-select: none; pointer-events: none">空间透镜</h1>
            </div>
            <v-overlay v-else :value="chartLoading">
              <v-progress-circular indeterminate size="64" />
            </v-overlay>
          </div>
        </v-col>

        <!-- 右侧目录列表 -->
        <v-col cols="4">
          <div class="text-center">
            <v-skeleton-loader v-if="legendLoading" type="table" />
            <div v-else class="modern-surface rounded-lg mx-auto directory-list-container">
              <v-list dense class="pa-0 directory-list modern-list">
                <v-list-item
                  v-for="item in legendItems"
                  :key="item.name"
                  style="cursor: pointer"
                  class="modern-list-item"
                  @click="onLegendItemClick($event, item)"
                  @contextmenu="showContextMenu($event, item)"
                >
                  <template #prepend>
                    <v-avatar
                      size="32"
                      @mouseenter="onItemMouseEnter($event, item)"
                      @mouseleave="onItemMouseLeave"
                      @mousemove="onItemMouseMove($event, item)"
                    >
                      <v-icon :color="item.color">
                        {{ item.isDirectory ? item.icon : 'mdi-file-outline' }}
                      </v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title
                    @mouseenter="onItemMouseEnter($event, item)"
                    @mouseleave="onItemMouseLeave"
                    @mousemove="onItemMouseMove($event, item)"
                  >{{ item.name }}</v-list-item-title
                  >
                  <v-list-item-subtitle
                    class="text-caption"
                    @mouseenter="onItemMouseEnter($event, item)"
                    @mouseleave="onItemMouseLeave"
                    @mousemove="onItemMouseMove($event, item)"
                  >
                    {{
                    renderMode === 'size'
                    ? item.size
                    ? item.size >= 1024
                    ? (item.size / 1024).toFixed(1) + ' MB'
                    : item.size + ' KB'
                    : '0 KB'
                    : item.count && item.isDirectory
                    ? item.count + ' 项'
                    : ''
                    }}
                  </v-list-item-subtitle>
                  <template #append>
                    <v-tooltip location="bottom">
                      <template #activator="{ props }">
                        <v-btn
                          v-bind="props"
                          icon
                          size="small"
                          variant="text"
                          :title="'更多操作'"
                          style="margin-left: 8px"
                          @click.stop="showContextMenu($event, item)"
                        >
                          <v-icon color="grey">mdi-auto-fix</v-icon>
                        </v-btn>
                      </template>
                      <span>更多操作</span>
                    </v-tooltip>
                  </template>
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
        <v-card class="tooltip-card-modern theme--light" elevation="2">
          <v-icon left>mdi-comment</v-icon>
          <span style="font-size: 18px; margin-left: 4px">{{ tooltipContent }}</span>
        </v-card>
      </div>

      <!-- 实时回显气泡 -->
      <div
        v-if="hoverBubbleVisible"
        :style="{
          position: 'fixed',
          left: hoverBubbleX + 'px',
          top: hoverBubbleY + 'px',
          pointerEvents: 'none',
          zIndex: 2000,
          maxWidth: '300px'
        }"
      >
        <v-card class="hover-bubble-card" elevation="8">
          <v-card-text class="pa-3">
            <div v-if="hoverBubbleLoading" class="d-flex align-center">
              <v-progress-circular size="16" width="2" indeterminate color="primary" class="mr-2" />
              <span class="text-caption">加载中...</span>
            </div>
            <div v-else class="hover-bubble-content">
              <pre class="bubble-text">{{ hoverBubbleContent }}</pre>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </v-container>

    <FileContextMenu ref="contextMenu" :menu-items="menuItems" />

    <!-- 代码分析报告抽屉 -->
    <div
      v-if="analysisDrawerVisible"
      class="modern-drawer analysis-drawer"
      :style="analysisDrawerStyle"
    >
      <v-card class="drawer-card-modern" elevation="2">
        <v-card-text>
          <div class="drawer-title">选择分析范围</div>
          <v-radio-group v-model="analysisScope" column dense>
            <v-radio value="current" label="当前层级" color="indigo"></v-radio>
            <v-radio value="all" label="整个仓库" color="indigo"></v-radio>
          </v-radio-group>
          <div class="drawer-actions">
            <v-btn color="indigo" variant="flat" small @click="generateAnalysisReport">确认</v-btn>
            <v-btn variant="text" small @click="analysisDrawerVisible = false">取消</v-btn>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- 流程图抽屉 -->
    <div
      v-if="architectureDrawerVisible"
      class="modern-drawer architecture-drawer"
      :style="architectureDrawerStyle"
    >
      <v-card class="drawer-card-modern" elevation="2">
        <v-card-text>
          <div class="drawer-title">选择分析范围</div>
          <v-radio-group v-model="architectureScope" column dense>
            <v-radio value="current" label="当前层级" color="teal"></v-radio>
            <v-radio value="all" label="整个仓库" color="teal"></v-radio>
          </v-radio-group>
          <div class="drawer-actions">
            <v-btn color="teal" variant="flat" small @click="generateArchitectureMap">确认</v-btn>
            <v-btn variant="text" small @click="architectureDrawerVisible = false">取消</v-btn>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- 代码视窗查看抽屉 -->
    <div
      v-if="codeViewDrawerVisible"
      class="modern-drawer code-view-drawer"
      :style="codeViewDrawerStyle"
    >
      <v-card class="drawer-card-modern" elevation="2">
        <v-card-text>
          <div class="drawer-title">选择查看范围</div>
          <v-radio-group v-model="codeViewScope" column dense>
            <v-radio value="current" label="当前层级" color="thirdary"></v-radio>
            <v-radio value="all" label="整个仓库" color="thirdary"></v-radio>
          </v-radio-group>
          <div class="drawer-actions">
            <v-btn color="thirdary" variant="flat" small @click="openCodeView">确认</v-btn>
            <v-btn variant="text" small @click="codeViewDrawerVisible = false">取消</v-btn>
          </div>
        </v-card-text>
      </v-card>
    </div>
    <!-- 引入弹窗 -->
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

    <!-- AI参考信息选择对话框 -->
    <v-dialog v-model="aiReferenceDialog" max-width="500" persistent>
      <v-card class="modern-surface" elevation="8">
        <v-card-title class="d-flex align-center">
          <v-icon color="deep-purple" class="mr-2">mdi-brain</v-icon>
          <span>AI分析参考信息设置</span>
        </v-card-title>
        <v-card-text>
          <div class="mb-4">
            <p class="text-body-2 mb-3">
              请选择您希望AI在分析代码时参考哪些信息（新手建议仅索引）：
            </p>
            <v-radio-group v-model="aiReferenceChoice" column>
              <v-radio :value="false" color="deep-purple">
                <template #label>
                  <div>
                    <div class="font-weight-medium">仅索引</div>
                    <div class="text-caption text-grey-600">
                      推荐用于扫描大型项目和复杂代码库，或者层级目录代码文件较多的场景，避免信息过载
                    </div>
                  </div>
                </template>
              </v-radio>
              <v-radio :value="true" color="deep-purple">
                <template #label>
                  <div>
                    <div class="font-weight-medium">索引和源代码</div>
                    <div class="text-caption text-grey-600">
                      提供更详细的分析结果，适合中小型项目，或者专项分析少量代码文件的场景
                    </div>
                  </div>
                </template>
              </v-radio>
            </v-radio-group>
            <v-alert type="info" variant="tonal" class="mt-3">
              <v-icon>mdi-information</v-icon>
              此设置会保存到本地，后续可通过右上角开关随时调整
            </v-alert>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="deep-purple"
            variant="flat"
            :disabled="aiReferenceChoice === null"
            @click="saveAiReferenceChoice(aiReferenceChoice)"
          >
            确认设置
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 权重配置对话框 -->
    <v-dialog v-model="weightConfigDialog" max-width="600" persistent>
      <v-card class="modern-surface" elevation="8">
        <v-card-title class="d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-tune</v-icon>
          <span>分析场景权重配置</span>
        </v-card-title>
        <v-card-text>
          <div class="mb-4">
            <p class="text-body-2 mb-3">请选择您的分析偏好，不同场景会影响AI分析的重点：</p>

            <!-- 预设配置选择 -->
            <v-radio-group v-model="selectedPreset" column @update:model-value="applyPresetConfig">
              <v-radio
                v-for="(preset, key) in presetConfigs"
                :key="key"
                :value="key"
                color="primary"
              >
                <template #label>
                  <div>
                    <div class="font-weight-medium">{{ preset.name }}</div>
                    <div class="text-caption text-grey-600">{{ preset.description }}</div>
                  </div>
                </template>
              </v-radio>
            </v-radio-group>

            <!-- 权重详情显示 -->
            <v-card variant="outlined" class="mt-4">
              <v-card-subtitle>当前权重维度配置</v-card-subtitle>
              <v-card-text>
                <div v-if="!isCustomConfig" class="weight-display">
                  <div class="weight-item">
                    <span class="weight-label">被引用次数：</span>
                    <span class="weight-value">{{ (weightConfig.alpha * 100).toFixed(0) }}%</span>
                  </div>
                  <div class="weight-item">
                    <span class="weight-label">扇出数：</span>
                    <span class="weight-value">{{ (weightConfig.beta * 100).toFixed(0) }}%</span>
                  </div>
                  <div class="weight-item">
                    <span class="weight-label">调用层级深度：</span>
                    <span class="weight-value">{{ (weightConfig.gamma * 100).toFixed(0) }}%</span>
                  </div>
                  <div class="weight-item">
                    <span class="weight-label">代码复杂度：</span>
                    <span class="weight-value">{{ (weightConfig.delta * 100).toFixed(0) }}%</span>
                  </div>
                </div>

                <!-- 自定义权重输入 -->
                <div v-else class="custom-weight-inputs">
                  <v-text-field
                    v-model.number="weightConfig.alpha"
                    label="被引用次数权重"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    density="compact"
                    variant="outlined"
                    @input="updateCustomWeight"
                  >
                    <template #append-inner>
                      <span class="text-caption">{{ (weightConfig.alpha * 100).toFixed(0) }}%</span>
                    </template>
                  </v-text-field>

                  <v-text-field
                    v-model.number="weightConfig.beta"
                    label="扇出数权重"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    density="compact"
                    variant="outlined"
                    @input="updateCustomWeight"
                  >
                    <template #append-inner>
                      <span class="text-caption">{{ (weightConfig.beta * 100).toFixed(0) }}%</span>
                    </template>
                  </v-text-field>

                  <v-text-field
                    v-model.number="weightConfig.gamma"
                    label="调用层级深度权重"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    density="compact"
                    variant="outlined"
                    @input="updateCustomWeight"
                  >
                    <template #append-inner>
                      <span class="text-caption">{{ (weightConfig.gamma * 100).toFixed(0) }}%</span>
                    </template>
                  </v-text-field>

                  <v-text-field
                    v-model.number="weightConfig.delta"
                    label="代码复杂度权重"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    density="compact"
                    variant="outlined"
                    @input="updateCustomWeight"
                  >
                    <template #append-inner>
                      <span class="text-caption">{{ (weightConfig.delta * 100).toFixed(0) }}%</span>
                    </template>
                  </v-text-field>

                  <v-alert
                    :type="
                      Math.abs(
                        weightConfig.alpha +
                          weightConfig.beta +
                          weightConfig.gamma +
                          weightConfig.delta -
                          1
                      ) < 0.01
                        ? 'success'
                        : 'warning'
                    "
                    variant="tonal"
                    density="compact"
                    class="mt-2"
                  >
                    权重总和：{{
                    (
                    (weightConfig.alpha +
                    weightConfig.beta +
                    weightConfig.gamma +
                    weightConfig.delta) *
                    100
                    ).toFixed(1)
                    }}%
                    {{
                    Math.abs(
                    weightConfig.alpha +
                    weightConfig.beta +
                    weightConfig.gamma +
                    weightConfig.delta -
                    1
                    ) < 0.01
                    ? '✓'
                    : '(需要等于100%)'
                    }}
                  </v-alert>
                </div>
              </v-card-text>
            </v-card>

            <v-alert type="info" variant="tonal" class="mt-3">
              我会记住你的偏好设置，后续可以随时调整
            </v-alert>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="saveWeightConfig"> 确认设置 </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 构建索引抽屉 -->
    <div
      v-if="buildIndexDialog"
      class="modern-drawer build-index-drawer"
      :style="buildIndexDrawerStyle"
    >
      <v-card class="drawer-card-modern" elevation="2">
        <v-card-text>
          <div class="drawer-title">选择索引构建范围</div>
          <v-radio-group v-model="indexBuildScope" column dense>
            <v-radio value="current" label="当前层级" color="orange"></v-radio>
            <v-radio value="repository" label="整个仓库" color="orange"></v-radio>
          </v-radio-group>
          <div class="drawer-actions">
            <v-btn color="orange" variant="flat" small @click="startBuildIndex">开始构建</v-btn>
            <v-btn variant="text" small @click="buildIndexDialog = false">取消</v-btn>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="8000" elevation="2">
      {{ snackbar.message }}
    </v-snackbar>

    <!-- 索引进度对话框 -->
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
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as d3 from 'd3'
import FileContextMenu from '../components/FileContextMenu.vue'
import {
  listRepos,
  checkIndexApi,
  listGraph,
  resetIndexApi,
  deleteIndexSomeApi
} from '../service/api'
import grassSVG from '../assets/透镜.svg'
import { omit } from '../service/str'

// —— 平台检测 ——
const isMacOS = ref(navigator.platform.toUpperCase().indexOf('MAC') >= 0)

// 父组件内部 state
const analysisReportDrawerVisible = ref(false)
const modalRepoID = ref('')
const modalTargetPath = ref('')
const modalScopeText = ref('')
const wholeCode = ref(false)
const apiType = ref('')
const count = ref(0)

// AI参考信息选择相关状态
const aiReferenceDialog = ref(false)
const aiReferenceChoice = ref(null) // null表示未选择，true表示索引和源代码，false表示仅索引
const showAiReferenceSwitch = ref(false) // 控制开关显示
const pendingAction = ref(null) // 保存待执行的操作

// 权重配置相关状态
const weightConfigDialog = ref(false)
const weightConfig = ref({
  alpha: 0.2,
  beta: 0.2,
  gamma: 0.1,
  delta: 0.5
})
const weightPendingAction = ref(null) // 保存待执行的操作
const isCustomConfig = ref(false) // 是否为自定义配置

// 预设权重配置
const presetConfigs = {
  coreDependency: {
    name: '核心依赖分析',
    description: '重点关注核心依赖关系和模块间的耦合度，推荐用于库分析',
    config: { alpha: 0.6, beta: 0.1, gamma: 0.2, delta: 0.1 }
  },
  businessComplexity: {
    name: '业务复杂度分析',
    description: '重点关注业务逻辑的复杂度和代码质量，推荐用于业务代码分析',
    config: { alpha: 0.2, beta: 0.2, gamma: 0.1, delta: 0.5 }
  },
  callHierarchy: {
    name: '调用层次分析',
    description: '重点关注函数调用关系和代码执行流程，推荐用于架构分析',
    config: { alpha: 0.2, beta: 0.2, gamma: 0.5, delta: 0.1 }
  },
  balanced: {
    name: '均衡分析',
    description: '各个维度均衡考虑，适合全面分析',
    config: { alpha: 0.4, beta: 0.2, gamma: 0.2, delta: 0.2 }
  },
  custom: {
    name: '自定义配置',
    description: '根据需要自定义各维度权重',
    config: { alpha: 0.25, beta: 0.25, gamma: 0.25, delta: 0.25 }
  }
}
const selectedPreset = ref('businessComplexity')

// 控制弹窗显隐
const isModalVisible = ref(false)

// 索引状态相关
const indexStatusMap = ref(new Map()) // 存储文件路径对应的索引状态
const indexStatusLoading = ref(false) // 索引状态检查加载状态

// 索引进度相关状态
const indexProgressVisible = ref(false) // 索引进度对话框显示状态
const indexProgressData = ref({
  totalFiles: 0,
  scannedFiles: 0,
  remainingFiles: 0,
  totalFunctions: 0,
  progress: 0,
  estimatedTime: '',
  currentFile: ''
}) // 索引进度数据
const indexProgressTimer = ref(null) // 索引进度定时器
const pendingReportAction = ref(null) // 待执行的报告生成操作

// 构建索引对话框相关状态
const buildIndexDialog = ref(false) // 构建索引对话框显示状态
const indexBuildScope = ref('current') // 索引构建范围：current(当前层级) 或 repository(整个仓库)

// 模拟传给子组件的 props
const dummyRepoID = ref('demo-repo-123')
const dummyTargetPath = ref('/src/components')
const dummyScopeText = ref('调试模式')

// 打开弹窗
function openModal() {
  // 你也可以在这里先改 markdownContent 进行更灵活的模拟
  isModalVisible.value = true
}

// 初始化AI参考信息选择
const initAiReferenceChoice = () => {
  const saved = localStorage.getItem('aiReferenceChoice')
  if (saved !== null) {
    aiReferenceChoice.value = saved === 'true'
    showAiReferenceSwitch.value = true
  } else {
    // 第一次使用，显示开关但不设置默认值，让用户在需要时选择
    showAiReferenceSwitch.value = true
  }
}

// 初始化权重配置
const initWeightConfig = () => {
  const saved = localStorage.getItem('analysisWeightConfig')
  const savedPreset = localStorage.getItem('analysisWeightPreset')

  if (saved !== null) {
    try {
      weightConfig.value = JSON.parse(saved)
      // 找到匹配的预设
      for (const [key, preset] of Object.entries(presetConfigs)) {
        const config = preset.config
        if (
          Math.abs(config.alpha - weightConfig.value.alpha) < 0.01 &&
          Math.abs(config.beta - weightConfig.value.beta) < 0.01 &&
          Math.abs(config.gamma - weightConfig.value.gamma) < 0.01 &&
          Math.abs(config.delta - weightConfig.value.delta) < 0.01
        ) {
          selectedPreset.value = key
          break
        }
      }
    } catch (e) {
      console.error('解析权重配置失败:', e)
      // 使用默认配置
      weightConfig.value = presetConfigs.businessComplexity.config
      selectedPreset.value = 'businessComplexity'
    }
  }

  if (savedPreset) {
    selectedPreset.value = savedPreset
    isCustomConfig.value = savedPreset === 'custom'
  }
}

// 保存AI参考信息选择
const saveAiReferenceChoice = (choice) => {
  aiReferenceChoice.value = choice
  localStorage.setItem('aiReferenceChoice', choice.toString())
  showAiReferenceSwitch.value = true
  aiReferenceDialog.value = false

  // 如果有待执行的操作，继续执行
  if (pendingAction.value) {
    const action = pendingAction.value
    pendingAction.value = null
    action()
  }
}

// 保存权重配置
const saveWeightConfig = () => {
  // 验证权重总和是否为1
  const total =
    weightConfig.value.alpha +
    weightConfig.value.beta +
    weightConfig.value.gamma +
    weightConfig.value.delta
  if (Math.abs(total - 1) > 0.01) {
    ElMessage.warning('权重总和必须等于1，当前总和为：' + total.toFixed(2))
    return
  }

  localStorage.setItem('analysisWeightConfig', JSON.stringify(weightConfig.value))
  localStorage.setItem('analysisWeightPreset', selectedPreset.value)
  weightConfigDialog.value = false

  ElMessage.success('权重配置已保存')

  // 如果有待执行的操作，继续执行
  if (weightPendingAction.value) {
    const action = weightPendingAction.value
    weightPendingAction.value = null
    action()
  }
}

// 应用预设配置
const applyPresetConfig = () => {
  if (selectedPreset.value && presetConfigs[selectedPreset.value]) {
    weightConfig.value = { ...presetConfigs[selectedPreset.value].config }
    isCustomConfig.value = selectedPreset.value === 'custom'
  }
}

// 更新自定义权重
const updateCustomWeight = () => {
  if (selectedPreset.value === 'custom') {
    presetConfigs.custom.config = { ...weightConfig.value }
  }
}

// 检查权重配置是否已初始化
const checkWeightConfig = (callback) => {
  const saved = localStorage.getItem('analysisWeightConfig')
  if (saved === null) {
    weightPendingAction.value = callback
    weightConfigDialog.value = true
    return false // 需要等待用户选择
  }
  return true // 可以继续执行
}

// 检查是否需要显示AI参考信息选择对话框
const checkAiReferenceChoice = (callback) => {
  if (aiReferenceChoice.value === null) {
    pendingAction.value = callback
    aiReferenceDialog.value = true
    return false // 需要等待用户选择
  }
  return true // 可以继续执行
}

// 切换AI参考信息选择
const toggleAiReference = () => {
  const newChoice = !aiReferenceChoice.value
  saveAiReferenceChoice(newChoice)
}

const MIN_INDEX_TIME = 1
const MAX_INDEX_TIME = 6

// 检查索引状态并处理
const checkIndexStatus4Toolbar = async (targetPath) => {
  try {
    const response = await checkIndexApi(rootPath.value, path.relative(rootPath.value, targetPath))

    const { real_file_count, total_file_count, total_function_count } = response.data.data
    const unindexedFiles = real_file_count - total_file_count
    if (unindexedFiles > 0) {
      // 计算预估时间
      const minSeconds = Math.ceil(unindexedFiles * MIN_INDEX_TIME) // 最少1秒每文件
      const maxSeconds = Math.ceil(unindexedFiles * MAX_INDEX_TIME) // 最多6秒每文件

      // 转换时间显示格式
      const formatTime = (seconds) => {
        if (seconds < 60) {
          return `${seconds}秒`
        } else if (seconds < 3600) {
          return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
        } else {
          const hours = Math.floor(seconds / 3600)
          const minutes = Math.floor((seconds % 3600) / 60)
          const remainingSeconds = seconds % 60
          return `${hours}小时${minutes}分${remainingSeconds}秒`
        }
      }

      const minTimeFormatted = formatTime(minSeconds)
      const maxTimeFormatted = formatTime(maxSeconds)

      const confirmed = window.confirm(
        `检测到当前路径下有 ${unindexedFiles} 个文件未建立索引，\n` +
        `预计需要 ${minTimeFormatted}-${maxTimeFormatted}进行初始化索引。\n\n` +
        `确认继续吗？`
      )

      if (!confirmed) {
        return false
      }

      // 开始索引进程
      await startIndexProcess4Toolbar(targetPath)
      return true
    } else {
      const confirmed = window.confirm(
        `当前路径已经构建过索引，共索引 ${total_file_count}/${real_file_count} 个文件，共 ${total_function_count} 个函数，确定继续并更新索引？`
      )

      if (!confirmed) {
        return false
      }
      console.log('path.relative(rootPath.value, targetPath)', path.relative(rootPath.value, targetPath))
      // 删除部分索引
      if (path.relative(rootPath.value, targetPath) !== '') {
        const deleteIndexSomeResponse = await deleteIndexSomeApi(
          rootPath.value,
          path.relative(rootPath.value, targetPath)
        )
        console.log('deleteIndexSomeResponse', deleteIndexSomeResponse)
        await store.dispatch('snackbar/showSnackbar', {
          message: `已清除 ${path.relative(rootPath.value, targetPath)} 的索引，开始重新索引`,
          color: 'warning'
        })
      }

      // 开始索引进程
      await startIndexProcess4Toolbar(targetPath)
      return true
    }
  } catch (error) {
    console.error('检查索引状态失败:', error)
    return false
  }
}

// 检查索引状态并处理
const checkIndexStatus = async (targetPath) => {
  try {
    const response = await checkIndexApi(rootPath.value, path.relative(rootPath.value, targetPath))

    const { real_file_count, total_file_count, total_function_count } = response.data.data
    const unindexedFiles = real_file_count - total_file_count

    if (unindexedFiles > 0) {
      // 计算预估时间
      const minSeconds = Math.ceil(unindexedFiles * MIN_INDEX_TIME) // 最少1秒每文件
      const maxSeconds = Math.ceil(unindexedFiles * MAX_INDEX_TIME) // 最多6秒每文件

      // 转换时间显示格式
      const formatTime = (seconds) => {
        if (seconds < 60) {
          return `${seconds}秒`
        } else if (seconds < 3600) {
          return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
        } else {
          const hours = Math.floor(seconds / 3600)
          const minutes = Math.floor((seconds % 3600) / 60)
          const remainingSeconds = seconds % 60
          return `${hours}小时${minutes}分${remainingSeconds}秒`
        }
      }

      const minTimeFormatted = formatTime(minSeconds)
      const maxTimeFormatted = formatTime(maxSeconds)

      const confirmed = window.confirm(
        `检测到当前路径下有 ${unindexedFiles} 个文件未建立索引，\n` +
        `预计需要 ${minTimeFormatted}~${maxTimeFormatted} 进行初始化索引。\n\n` +
        `确认继续吗？`
      )

      if (!confirmed) {
        return false
      }

      // 开始索引进程
      await startIndexProcess(targetPath)
      return true
    } else {
      console.log('当前路径已经构建过索引')
      return true
    }
  } catch (error) {
    console.error('检查索引状态失败:', error)
    return false
  }
}

// 开始索引进程
const startIndexProcess4Toolbar = async (targetPath) => {
  try {
    // 显示进度对话框
    indexProgressVisible.value = true

    // 开始监控索引进度
    startIndexProgressMonitoring(targetPath)

    // 调用listGraph接口开始索引
    const response = await listGraph(rootPath.value, path.relative(rootPath.value, targetPath))
    console.log('startIndexProcess4Toolbar ', response)
    // 检查listGraph是否完成
    if (response && response.data && response.data.code === 0) {
      // 索引完成，停止监控
      stopIndexProgressMonitoring()
      indexProgressVisible.value = false

      const checkIndex = await checkIndexApi(
        rootPath.value,
        path.relative(rootPath.value, targetPath)
      )
      const { real_file_count, total_file_count, total_function_count, functions } =
        checkIndex.data.data
      alert(
        `已完成索引，共 ${real_file_count} 个文件，已建立索引 ${total_file_count} 个文件，共 ${total_function_count} 个函数`
      )
      let message = `索引状态检查完成\n`
      message += `函数索引量: ${total_function_count}\n`
      message += `总文件数量: ${total_file_count}`

      message += `\n\n该路径已建立索引`

      // 显示函数详情(最多显示5条)
      if (functions && Object.keys(functions).length > 0) {
        message += `\n\n函数详情:`
        let count = 0
        for (const [filePath, funcs] of Object.entries(functions)) {
          message += `\n📁 ${filePath}:`
          for (const func of funcs) {
            if (count >= 5) {
              message += `\n  • ...`
              break
            }
            message += `\n  • ${func.name} (${func.start_line}-${func.end_line}行)`
            count++
          }
          if (count >= 5) break
        }
      }
      store.dispatch('snackbar/showSnackbar', {
        message: message,
        color: 'success',
        timeout: 8000
      })
    } else {
      await store.dispatch('snackbar/showSnackbar', {
        message: `${targetPath} 的索引构建失败，错误信息：${response.data.message}`,
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

// 开始索引进程
const startIndexProcess = async (targetPath) => {
  try {
    // 显示进度对话框
    indexProgressVisible.value = true

    // 开始监控索引进度
    startIndexProgressMonitoring(targetPath)

    // 调用listGraph接口开始索引
    const response = await listGraph(rootPath.value, path.relative(rootPath.value, targetPath))
    console.log('startIndexProcess ', response)
    // 检查listGraph是否完成
    if (response && response.data && response.data.code === 0) {
      // 索引完成，停止监控
      stopIndexProgressMonitoring()
      indexProgressVisible.value = false

      // 立即执行待执行的报告生成操作
      if (pendingReportAction.value) {
        const action = pendingReportAction.value
        pendingReportAction.value = null
        setTimeout(() => action(), 500) // 稍微延迟执行
      }
    } else {
      await store.dispatch('snackbar/showSnackbar', {
        message: `${targetPath} 的索引构建失败，错误信息：${response.data.message}`,
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

// 监控索引进度
const startIndexProgressMonitoring = (targetPath) => {
  const checkProgress = async () => {
    try {
      const response = await checkIndexApi(
        rootPath.value,
        path.relative(rootPath.value, targetPath)
      )
      console.log('检查索引进度:', response.data.data)
      const { real_file_count, total_file_count, total_function_count } = response.data.data

      // 计算预估时间
      const minSeconds = Math.ceil((real_file_count - total_file_count) * MIN_INDEX_TIME) // 最少1秒每文件
      const maxSeconds = Math.ceil((real_file_count - total_file_count) * MAX_INDEX_TIME) // 最多6秒每文件

      // 转换时间显示格式
      const formatTime = (seconds) => {
        if (seconds < 60) {
          return `${seconds}秒`
        } else if (seconds < 3600) {
          return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
        } else {
          const hours = Math.floor(seconds / 3600)
          const minutes = Math.floor((seconds % 3600) / 60)
          const remainingSeconds = seconds % 60
          return `${hours}小时${minutes}分${remainingSeconds}秒`
        }
      }

      const minTimeFormatted = formatTime(minSeconds)
      const maxTimeFormatted = formatTime(maxSeconds)

      // 计算进度百分比
      const progress =
        real_file_count > 0 ? Math.round(((total_file_count - 1) / real_file_count) * 100) : 0
      indexProgressData.value.totalFiles = real_file_count
      indexProgressData.value.scannedFiles = total_file_count
      indexProgressData.value.currentFile = path.relative(rootPath.value, targetPath)
      indexProgressData.value.remainingFiles = real_file_count - total_file_count
      indexProgressData.value.totalFunctions = total_function_count || 0
      indexProgressData.value.estimatedTime = `${minTimeFormatted}~${maxTimeFormatted}`
      indexProgressData.value.progress = progress
    } catch (error) {
      console.error('检查索引进度失败:', error)
    }
  }

  // 立即检查一次
  checkProgress()

  // 每2秒检查一次进度
  indexProgressTimer.value = setInterval(checkProgress, 2000)
}

// 停止索引进度监控
const stopIndexProgressMonitoring = () => {
  if (indexProgressTimer.value) {
    clearInterval(indexProgressTimer.value)
    indexProgressTimer.value = null
  }
  // 清除缓存API中存储的索引统计信息
  hoverApiCache.value.clear()
  indexStatusMap.value = new Map()
}

// 打开构建索引对话框
const toggleBuildIndexDialog = () => {
  if (!rootPath.value) {
    store.dispatch('snackbar/showSnackbar', {
      message: '请先选择一个目录并进行扫描',
      color: 'warning'
    })
    return
  }
  // 关闭其他抽屉
  analysisDrawerVisible.value = false
  architectureDrawerVisible.value = false
  codeViewDrawerVisible.value = false
  // 切换当前抽屉
  buildIndexDialog.value = !buildIndexDialog.value
  indexBuildScope.value = 'current' // 默认选择当前层级
}

// 开始构建索引
const startBuildIndex = async () => {
  try {
    buildIndexDialog.value = false

    let targetPath
    if (indexBuildScope.value === 'repository') {
      // 构建整个函数索引
      targetPath = rootPath.value
    } else {
      // 构建当前层级索引
      targetPath = currentFocus.value?.data?.fullPath || rootPath.value
    }

    // 如果是整个仓库，则要求用户跳转至函数索引页面自行操作
    if (targetPath === rootPath.value) {
      const confirmed = confirm('若要全量构建整个仓库，请跳转至函数索引页面自行操作')
      if (!confirmed) {
        return
      }
      router.push({
        name: 'scan'
      })
      return
    }

    // 调用checkIndexStatus方法开始索引
    await checkIndexStatus4Toolbar(targetPath)
  } catch (error) {
    console.error('构建索引失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: '构建索引失败',
      color: 'error'
    })
  }
}

// 取消索引进程
const cancelIndexProcess = async () => {
  console.log('取消索引进程', indexProgressData.value.currentFile)
  await resetIndexApi(
    rootPath.value,
    path.relative(rootPath.value, indexProgressData.value.currentFile)
  )
  hideIndexProcess()
}

// 隐藏索引进程
const hideIndexProcess = () => {
  stopIndexProgressMonitoring()
  indexProgressVisible.value = false
  pendingReportAction.value = null
  // 清除缓存API中存储的索引统计信息
  hoverApiCache.value.clear()
}

// Electron 内置模块（使用 top-level await）
const fs = window.electron.fs
const path = window.electron.path

// 状态管理
const isProcessing = ref(false)
const selectedFile = ref(null)
const fileTree = ref(null)
const legendItems = ref([])
const rootPath = ref('')
const chartLoading = ref(false)
const legendLoading = ref(false)
const root = ref(null)
const currentFocus = ref(null)
const tooltipVisible = ref(false)
const tooltipContent = ref('')
const tooltipX = ref(0)
const tooltipY = ref(0)

// 实时回显气泡相关状态
const hoverBubbleVisible = ref(false)
const hoverBubbleContent = ref('')
const hoverBubbleX = ref(0)
const hoverBubbleY = ref(0)
const hoverBubbleLoading = ref(false)
const currentHoverItem = ref(null)
const hoverApiCache = ref(new Map()) // 缓存API响应结果
const lensPath = ref('')
const pathSuggestions = ref([])
const depth = ref(20)
const fullScan = ref(false) // 全量扫描模式
const initialLoad = ref(true)
const chartKey = ref(0)
// 用于保存 d3 sunburst 更新函数（将在绘图函数中设置）
const updateSunburst = ref(null)

// 文件类型统计相关状态
const fileTypeStats = ref([])
const showFileTypeStats = ref(false)
const fileTypeChartKey = ref(0)
const fileTypeStatsExpanded = ref(false)

// 抽屉状态管理
const analysisScope = ref('current')
const architectureScope = ref('current')
const codeViewScope = ref('current')
const analysisDrawerVisible = ref(false)
const architectureDrawerVisible = ref(false)
const codeViewDrawerVisible = ref(false)
const analysisBtn = ref(null)
const architectureBtn = ref(null)
const codeViewBtn = ref(null)
const buildIndexBtn = ref(null)

// 抽屉位置计算
const analysisDrawerStyle = computed(() => {
  if (!analysisBtn.value) return {}
  const rect = analysisBtn.value.$el.getBoundingClientRect()
  return {
    position: 'absolute',
    top: `${rect.bottom + 5}px`,
    left: `${rect.left}px`,
    zIndex: 100,
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1)'
  }
})

const architectureDrawerStyle = computed(() => {
  if (!architectureBtn.value) return {}
  const rect = architectureBtn.value.$el.getBoundingClientRect()
  return {
    position: 'absolute',
    top: `${rect.bottom + 5}px`,
    left: `${rect.left}px`,
    zIndex: 100,
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1)'
  }
})

const codeViewDrawerStyle = computed(() => {
  if (!codeViewBtn.value) return {}
  const rect = codeViewBtn.value.$el.getBoundingClientRect()
  return {
    position: 'absolute',
    top: `${rect.bottom + 5}px`,
    left: `${rect.left}px`,
    zIndex: 100,
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1)'
  }
})

const buildIndexDrawerStyle = computed(() => {
  if (!buildIndexBtn.value) return {}
  const rect = buildIndexBtn.value.$el.getBoundingClientRect()
  return {
    position: 'absolute',
    top: `${rect.bottom + 5}px`,
    left: `${rect.left}px`,
    zIndex: 100,
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1)'
  }
})

// FileContextMenu 引用
const contextMenu = ref(null)

// 路由与 store（假设项目中已配置 vue-router 与 vuex）
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import AnalysisReportModal from '../components/ai/AnalysisReportModal.vue'
import { loadRepoProgress } from '../storage/progress-storage'
const router = useRouter()
const store = useStore()
const snackbar = computed(() => store.state.snackbar)

// menuItems 定义，同时引用下面定义的三个操作函数
const viewFileDetails = () => {
  if (selectedFile.value && selectedFile.value.fullPath) {
    console.log('跳转到文件浏览器页面，文件路径：', selectedFile.value.fullPath, rootPath.value)
    router.push({
      name: 'finder',
      params: {
        localPath: selectedFile.value.fullPath,
        rootPath: rootPath
      }
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
// 为文件夹生成代码分析报告
const generateFileAnalysisReport = async () => {
  if (selectedFile.value && selectedFile.value.fullPath) {
    analysisDrawerVisible.value = false
    isProcessing.value = true
    try {
      const targetPath = selectedFile.value.fullPath
      const scopeText = '单点文件集'

      // 检查是否为单个文件分析
      let isAnalyzingSingleFile = false
      // 判断targetPath是否为文件
      if (!selectedFile.value.isDirectory) {
        isAnalyzingSingleFile = true
        console.log('当前焦点是否为文件：', isAnalyzingSingleFile, aiReferenceChoice.value)
      }

      console.log(
        `生成文件代码分析报告，范围：${scopeText}，路径：${targetPath}，单文件分析：${isAnalyzingSingleFile}`
      )

      // 这里可以调用后端API生成报告
      const selectedItem = pathSuggestions.value.find((item) => item.value === rootPath.value)
      if (selectedItem) {
        const repoID = selectedItem.id
        console.log('找到匹配的仓库ID:', repoID, targetPath)

        const { indexing, hasDb, hasFullIndex } = await window.electron.checkMemoryFlashStatus(
          rootPath.value
        )
        if (indexing) {
          window.alert(`检测到正在对 “${targetPath}” 构建索引，请等待索引构建完成后，再进行分析`)
          return
        }

        if (!hasFullIndex) {
          console.log('未构建全量索引')
          // 检查索引状态
          const indexCheckResult = await checkIndexStatus(targetPath)
          if (!indexCheckResult) {
            return // 用户取消或索引检查失败
          }

          // 如果正在进行索引，设置待执行操作并返回
          if (indexProgressVisible.value) {
            pendingReportAction.value = () =>
              generateFileAnalysisReportInternal(
                selectedItem,
                targetPath,
                scopeText,
                isAnalyzingSingleFile
              )
            return
          }
        }

        // 给 ref 赋值，Vue 才能通知模板更新 props
        modalRepoID.value = selectedItem.id.toString()
        modalTargetPath.value = targetPath
        modalScopeText.value = scopeText
        apiType.value = 'deepResearch'
        // 根据用户选择设置wholeCode参数，如果未选择则使用false作为默认值
        wholeCode.value = aiReferenceChoice.value !== null ? aiReferenceChoice.value : false
        if (isAnalyzingSingleFile) {
          wholeCode.value = true
          console.log('已为单文件分析设置wholeCode为true')
        }
        // 设置文件数量
        if (selectedFile.value && selectedFile.value.isDirectory && selectedFile.value.count) {
          count.value = selectedFile.value.count
        } else {
          count.value = 1 // 单文件分析
        }
        // 再打开弹窗，AnalysisReportModal 会收到最新的 props & visible=true
        analysisReportDrawerVisible.value = true

        console.log(
          'yep',
          modalRepoID,
          modalTargetPath,
          modalScopeText,
          analysisReportDrawerVisible
        )

        store.dispatch('snackbar/showSnackbar', {
          message: `正在为${scopeText}生成代码分析报告，请稍等片刻后在'文件枢纽'中查看...`,
          color: 'info'
        })
      } else {
        console.warn('未找到匹配的仓库路径')
      }
    } catch (error) {
      console.error('生成代码分析报告失败:', error)
      store.dispatch('snackbar/showSnackbar', {
        message: '生成代码分析报告失败',
        color: 'error'
      })
    } finally {
      isProcessing.value = false
    }
  }
}

// 内部报告生成逻辑
const generateFileAnalysisReportInternal = async (
  selectedItem,
  targetPath,
  scopeText,
  isAnalyzingSingleFile
) => {
  stopIndexProgressMonitoring()
  indexProgressVisible.value = false
  try {
    const repoID = selectedItem.id
    console.log('执行内部报告生成逻辑:', repoID, targetPath)

    const { indexing, hasDb } = await window.electron.checkMemoryFlashStatus(rootPath.value)
    if (indexing) {
      window.alert(`检测到正在对 "${targetPath}" 构建索引，请等待索引构建完成后，再进行分析`)
      return
    }

    // 给 ref 赋值，Vue 才能通知模板更新 props
    modalRepoID.value = selectedItem.id.toString()
    modalTargetPath.value = targetPath
    modalScopeText.value = scopeText
    apiType.value = 'deepResearch'
    // 根据用户选择设置wholeCode参数，如果未选择则使用false作为默认值
    wholeCode.value = aiReferenceChoice.value !== null ? aiReferenceChoice.value : false
    if (isAnalyzingSingleFile) {
      wholeCode.value = true
      console.log('已为单文件分析设置wholeCode为true')
    }
    // 设置文件数量
    if (selectedFile.value && selectedFile.value.isDirectory && selectedFile.value.count) {
      count.value = selectedFile.value.count
    } else {
      count.value = 1 // 单文件分析
    }
    // 再打开弹窗，AnalysisReportModal 会收到最新的 props & visible=true
    analysisReportDrawerVisible.value = true

    console.log('yep', modalRepoID, modalTargetPath, modalScopeText, analysisReportDrawerVisible)

    store.dispatch('snackbar/showSnackbar', {
      message: `正在为${scopeText}生成代码分析报告，请稍等片刻后在'文件枢纽'中查看...`,
      color: 'info'
    })
  } catch (error) {
    console.error('生成代码分析报告失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: '生成代码分析报告失败',
      color: 'error'
    })
  }
}

// 异步检查指定路径的索引状态
const checkIndexStatusForPath = async (itemPath) => {
  if (!rootPath.value) return

  try {
    indexStatusLoading.value = true
    const projectDir = rootPath.value
    const relativePath = itemPath.replace(rootPath.value, '').replace(/^[\/\\]/, '')

    console.log('异步检查索引状态，项目路径：', projectDir, '相对路径：', relativePath)

    const response = await checkIndexApi(projectDir, relativePath)

    if (response.data.code === 0) {
      const data = response.data.data
      const totalFunctions = data.total_function_count || 0
      const totalFiles = data.total_file_count || 0
      const realFiles = data.real_file_count || 0
      const hasIndex = totalFunctions > 0 || totalFiles > 0

      console.log('API响应数据:', {
        totalFunctions,
        totalFiles,
        realFiles,
        hasIndex,
        itemPath,
        response: data
      })

      // 存储索引状态
      indexStatusMap.value.set(itemPath, {
        hasIndex,
        totalFunctions,
        totalFiles,
        realFiles,
        functions: data.functions || {}
      })

      console.log('存储的索引状态:', indexStatusMap.value.get(itemPath))
    } else {
      // 检查失败，标记为未索引
      indexStatusMap.value.set(itemPath, {
        hasIndex: false,
        totalFunctions: 0,
        totalFiles: 0,
        realFiles: 0,
        functions: {},
        error: response.message
      })
    }
  } catch (error) {
    console.error('异步检查索引状态失败:', error)
    // 检查失败，标记为未索引
    indexStatusMap.value.set(itemPath, {
      hasIndex: false,
      totalFunctions: 0,
      totalFiles: 0,
      realFiles: 0,
      functions: {},
      error: error.message
    })
  } finally {
    indexStatusLoading.value = false
  }
}

// 检查索引状态（点击菜单项时显示详细信息）
const checkIndexStatusForMenu = async () => {
  console.log('检查索引状态...123')
  if (selectedFile.value && selectedFile.value.fullPath) {
    const itemPath = selectedFile.value.fullPath
    const indexStatus = indexStatusMap.value.get(itemPath)

    if (indexStatus) {
      await checkIndexStatus4Toolbar(itemPath)
      // 如果已经有缓存的状态，直接显示
      let message = `索引状态检查完成\n`
      message += `函数索引量: ${indexStatus.totalFunctions}\n`
      message += `总文件数量: ${indexStatus.totalFiles}`

      console.log(message)

      // store.dispatch('snackbar/showSnackbar', {
      //   message: message,
      //   color: indexStatus.hasIndex ? 'success' : 'warning',
      //   timeout: 8000
      // })
    } else {
      // 如果没有缓存状态，重新检查
      isProcessing.value = true
      await checkIndexStatusForPath(itemPath)
      isProcessing.value = false

      // 递归调用显示结果
      checkIndexStatusForMenu()
    }
  } else {
    store.dispatch('snackbar/showSnackbar', {
      message: '请先选择一个文件或文件夹',
      color: 'warning'
    })
  }
}

// 为文件夹生成流程图
const generateFolderArchitectureMap = async () => {
  if (
    selectedFile.value &&
    selectedFile.value.fullPath
    // selectedFile.value.isDirectory
  ) {
    architectureDrawerVisible.value = false
    isProcessing.value = true
    try {
      const targetPath = selectedFile.value.fullPath
      const scopeText = '单点文件集'

      // 检查是否为单个文件分析
      let isAnalyzingSingleFile = false
      // 判断targetPath是否为文件
      if (!selectedFile.value.isDirectory) {
        isAnalyzingSingleFile = true
        console.log('当前焦点是否为文件：', isAnalyzingSingleFile, aiReferenceChoice.value)
      }

      console.log(
        `生成流程图，范围：${scopeText}，路径：${targetPath}，单文件分析：${isAnalyzingSingleFile}`
      )

      // 这里可以调用后端API生成架构图
      const selectedItem = pathSuggestions.value.find((item) => item.value === rootPath.value)
      if (selectedItem) {
        const repoID = selectedItem.id
        console.log('找到匹配的仓库ID:', repoID, targetPath)

        const { indexing, hasDb, hasFullIndex } = await window.electron.checkMemoryFlashStatus(
          rootPath.value
        )
        if (indexing) {
          window.alert(`检测到正在对 “${targetPath}” 构建索引，请等待索引构建完成后，再进行分析`)
          return
        }
        if (!hasFullIndex) {
          console.log('未构建全量索引')
          // 检查索引状态
          const shouldProceed = await checkIndexStatus(targetPath, () => {
            pendingReportAction.value = () =>
              generateFolderArchitectureMapInternal(
                selectedItem,
                targetPath,
                scopeText,
                isAnalyzingSingleFile
              )
          })
          if (!shouldProceed) {
            return
          }
        }

        // 给 ref 赋值，Vue 才能通知模板更新 props
        modalRepoID.value = selectedItem.id.toString()
        modalTargetPath.value = targetPath
        modalScopeText.value = scopeText
        apiType.value = 'flowChart'
        // 根据用户选择设置wholeCode参数，如果未选择则使用false作为默认值
        wholeCode.value = aiReferenceChoice.value !== null ? aiReferenceChoice.value : false
        if (isAnalyzingSingleFile) {
          wholeCode.value = true
          console.log('已为单文件分析设置wholeCode为true')
        }
        // 设置文件数量
        if (selectedFile.value && selectedFile.value.isDirectory && selectedFile.value.count) {
          count.value = selectedFile.value.count
        } else {
          count.value = 1 // 单文件分析
        }
        // 再打开弹窗，AnalysisReportModal 会收到最新的 props & visible=true
        analysisReportDrawerVisible.value = true
        store.dispatch('snackbar/showSnackbar', {
          message: `正在为文件夹梳理流程图，请稍等片刻后在'文件枢纽'中查看...`,
          color: 'info'
        })
      } else {
        console.warn('未找到匹配的仓库路径')
      }
    } catch (error) {
      console.error('生成流程图失败:', error)
      store.dispatch('snackbar/showSnackbar', {
        message: '生成流程图失败',
        color: 'error'
      })
    } finally {
      isProcessing.value = false
    }
  }
}

// 内部文件夹流程图生成逻辑
const generateFolderArchitectureMapInternal = async (
  selectedItem,
  targetPath,
  scopeText,
  isAnalyzingSingleFile
) => {
  stopIndexProgressMonitoring()
  indexProgressVisible.value = false
  try {
    const repoID = selectedItem.id
    console.log('执行内部文件夹流程图生成逻辑:', repoID, targetPath)

    const { indexing, hasDb } = await window.electron.checkMemoryFlashStatus(rootPath.value)
    if (indexing) {
      window.alert(`检测到正在对 "${targetPath}" 构建索引，请等待索引构建完成后，再进行分析`)
      return
    }

    // 给 ref 赋值，Vue 才能通知模板更新 props
    modalRepoID.value = selectedItem.id.toString()
    modalTargetPath.value = targetPath
    modalScopeText.value = scopeText
    apiType.value = 'flowChart'
    // 根据用户选择设置wholeCode参数，如果未选择则使用false作为默认值
    wholeCode.value = aiReferenceChoice.value !== null ? aiReferenceChoice.value : false
    if (isAnalyzingSingleFile) {
      wholeCode.value = true
      console.log('已为单文件分析设置wholeCode为true')
    }
    // 设置文件数量
    if (selectedFile.value && selectedFile.value.isDirectory && selectedFile.value.count) {
      count.value = selectedFile.value.count
    } else {
      count.value = 1 // 单文件分析
    }
    // 再打开弹窗，AnalysisReportModal 会收到最新的 props & visible=true
    analysisReportDrawerVisible.value = true
    store.dispatch('snackbar/showSnackbar', {
      message: `正在为文件夹梳理流程图，请稍等片刻后在'文件枢纽'中查看...`,
      color: 'info'
    })
  } catch (error) {
    console.error('生成流程图失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: '生成流程图失败',
      color: 'error'
    })
  }
}

// 动态菜单项，根据选中项是文件还是文件夹显示不同的菜单
const menuItems = computed(() => {
  const baseItems = []

  // 添加索引状态检测选项
  const indexStatus = selectedFile.value
    ? indexStatusMap.value.get(selectedFile.value.fullPath)
    : null
  const isLoading = indexStatusLoading.value

  console.log('菜单项显示逻辑:', {
    selectedFilePath: selectedFile.value?.fullPath,
    indexStatus,
    isLoading,
    indexStatusMapSize: indexStatusMap.value.size
  })

  let indexTitle = '检查索引状态'
  let indexIcon = 'mdi-database-search'
  let indexClass = ''

  if (isLoading) {
    indexTitle = '检查索引状态 (检查中...)'
    indexIcon = 'mdi-loading mdi-spin'
  } else if (indexStatus) {
    console.log('索引状态详情:', indexStatus)
    if (indexStatus.hasIndex) {
      indexTitle = `索引状态: 已索引 (${indexStatus.totalFunctions}个函数, ${indexStatus.totalFiles}个文件)`
      indexIcon = 'mdi-database-check'
      indexClass = 'text-success'
    } else {
      indexTitle = '索引状态: 未索引'
      indexIcon = 'mdi-database-remove'
      indexClass = 'text-warning'
    }
  }

  baseItems.push({
    title: indexTitle,
    icon: indexIcon,
    color: 'purple',
    class: indexClass,
    action: checkIndexStatusForMenu
  })

  // 非 (Windows平台且选中的是文件）时，添加预览代码选项
  // if (selectedFile.value && (isMacOS.value || (!isMacOS.value && selectedFile.value.isDirectory))) {
  baseItems.push({
    title: '从代码视窗查看',
    icon: 'mdi-information',
    action: viewFileDetails
  })
  // }

  // 添加生成代码分析报告选项（对文件和文件夹都可用）
  baseItems.push({
    title: '生成代码分析报告',
    icon: 'mdi-file-document-outline',
    action: generateFileAnalysisReport
  })

  // 如果是文件夹，添加生成流程图选项
  // if (selectedFile.value && selectedFile.value.isDirectory) {
  baseItems.push({
    title: '解释并生成流程图',
    icon: 'mdi-sitemap',
    action: generateFolderArchitectureMap
  })

  baseItems.push(
    { title: '复制路径', icon: 'mdi-content-copy', action: copyFilePath },
    { title: '从文件夹打开', icon: 'mdi-folder', action: openInFinder }
  )
  return baseItems
})

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

// 紧凑模式文件类型计算（前4个 + Other）
const getCompactFileTypes = computed(() => {
  if (!fileTypeStats.value || fileTypeStats.value.length === 0) return []

  const stats = [...fileTypeStats.value]
  if (stats.length <= 4) {
    return stats
  }

  // 取前4个类型
  const top4 = stats.slice(0, 4)
  // 计算其余类型的总和
  const others = stats.slice(4)
  const otherCount = others.reduce((sum, type) => sum + type.count, 0)
  const otherSize = others.reduce((sum, type) => sum + type.size, 0)
  const otherPercentage = others.reduce((sum, type) => sum + parseFloat(type.percentage || 0), 0)

  // 如果有其他类型，添加Other项
  if (others.length > 0) {
    top4.push({
      extension: 'Other',
      icon: 'mdi-file-multiple',
      count: otherCount,
      size: otherSize,
      percentage: Math.round(otherPercentage * 10) / 10
    })
  }

  return top4
})

// 以下函数均为组件内业务逻辑

const showContextMenu = async (event, item) => {
  console.log('右键菜单点击事件', event, item)
  // 先设置选中的文件，这样computed的menuItems才能根据文件类型显示正确的菜单项
  selectedFile.value = item

  // 在显示菜单时异步检查索引状态
  if (item && rootPath.value) {
    const itemPath = item.fullPath
    if (!indexStatusMap.value.has(itemPath)) {
      // 如果还没有检查过这个路径的索引状态，则异步检查
      checkIndexStatusForPath(itemPath)
    }
  }

  // 然后显示上下文菜单
  contextMenu.value?.show(event)
}

const navigateToBreadcrumb = (item) => {
  const target = root.value.descendants().find((n) => n.data.fullPath === item.path)
  if (target && updateSunburst.value) {
    currentFocus.value = target
    updateSunburst.value(currentFocus.value)
  }
}

// 切换代码分析报告抽屉
const toggleAnalysisDrawer = () => {
  if (!rootPath.value) {
    store.dispatch('snackbar/showSnackbar', {
      message: '请先选择一个目录并进行扫描',
      color: 'warning'
    })
    return
  }
  // 关闭其他抽屉
  buildIndexDialog.value = false
  architectureDrawerVisible.value = false
  codeViewDrawerVisible.value = false
  // 切换当前抽屉
  analysisDrawerVisible.value = !analysisDrawerVisible.value
}

// 切换流程图抽屉
const toggleArchitectureDrawer = () => {
  if (!rootPath.value) {
    store.dispatch('snackbar/showSnackbar', {
      message: '请先选择一个目录并进行扫描',
      color: 'warning'
    })
    return
  }
  // 关闭其他抽屉
  buildIndexDialog.value = false
  analysisDrawerVisible.value = false
  codeViewDrawerVisible.value = false
  // 切换当前抽屉
  architectureDrawerVisible.value = !architectureDrawerVisible.value
}

// 切换代码视窗查看抽屉
const toggleCodeViewDrawer = () => {
  if (!rootPath.value) {
    store.dispatch('snackbar/showSnackbar', {
      message: '请先选择一个目录并进行扫描',
      color: 'warning'
    })
    return
  }
  // 关闭其他抽屉
  buildIndexDialog.value = false
  analysisDrawerVisible.value = false
  architectureDrawerVisible.value = false
  // 切换当前抽屉
  codeViewDrawerVisible.value = !codeViewDrawerVisible.value
}

// 打开代码视窗查看
const openCodeView = () => {
  codeViewDrawerVisible.value = false

  let targetPath = rootPath.value

  // 根据选择的范围确定路径
  if (codeViewScope.value === 'current' && currentFocus.value && currentFocus.value.data.fullPath) {
    targetPath = currentFocus.value.data.fullPath
  }

  if (targetPath) {
    console.log('跳转到代码视窗查看，路径：', targetPath, rootPath.value)
    router.push({
      name: 'finder',
      params: {
        localPath: targetPath,
        rootPath: rootPath.value
      }
    })
  } else {
    store.dispatch('snackbar/showSnackbar', {
      message: '无法确定目标路径',
      color: 'error'
    })
  }
}

// 生成代码分析报告
const generateAnalysisReport = async () => {
  analysisReportDrawerVisible.value = false
  analysisDrawerVisible.value = false

  // 检查是否需要显示AI参考信息选择对话框
  if (!checkAiReferenceChoice(() => generateAnalysisReport())) {
    return // 等待用户选择
  }

  // 检查权重配置是否已初始化
  if (!checkWeightConfig(() => generateAnalysisReport())) {
    return // 等待用户选择权重配置
  }

  isProcessing.value = true
  try {
    const targetPath =
      analysisScope.value === 'current' && currentFocus.value
        ? currentFocus.value.data.fullPath
        : rootPath.value
    const scopeText = analysisScope.value === 'current' ? '当前层级' : '整个仓库'

    // 检查是否为单个文件分析
    let isAnalyzingSingleFile = false
    if (analysisScope.value === 'current' && currentFocus.value && currentFocus.value.data) {
      // 检查当前焦点是否为文件（非目录）
      isAnalyzingSingleFile = !currentFocus.value.data.isDirectory
      console.log('当前焦点是否为文件：', isAnalyzingSingleFile, aiReferenceChoice.value)
    }

    console.log(
      `生成代码分析报告，范围：${scopeText}，路径：${targetPath}，单文件分析：${isAnalyzingSingleFile}`
    )

    // 这里可以调用后端API生成报告
    const selectedItem = pathSuggestions.value.find((item) => item.value === rootPath.value)
    if (selectedItem) {
      const repoID = selectedItem.id
      console.log('找到匹配的仓库ID:', repoID, targetPath)

      const { indexing, hasDb, hasFullIndex } = await window.electron.checkMemoryFlashStatus(
        rootPath.value
      )
      if (indexing) {
        window.alert(`检测到正在对 “${targetPath}” 构建索引，请等待索引构建完成后，再进行分析`)
        return
      }

      if (!hasFullIndex) {
        console.log('未构建全量索引')
        // 检查索引状态
        const indexCheckResult = await checkIndexStatus(targetPath)
        if (!indexCheckResult) {
          isProcessing.value = false
          return // 用户取消或索引检查失败
        }

        // 如果正在进行索引，设置待执行操作并返回
        if (indexProgressVisible.value) {
          pendingReportAction.value = () =>
            generateAnalysisReportInternal(
              selectedItem,
              targetPath,
              scopeText,
              isAnalyzingSingleFile
            )
          isProcessing.value = false
          return
        }
      }

      // 给 ref 赋值，Vue 才能通知模板更新 props
      modalRepoID.value = selectedItem.id.toString()
      modalTargetPath.value = targetPath
      modalScopeText.value = scopeText
      apiType.value = 'deepResearch'

      // 根据用户选择设置wholeCode参数
      wholeCode.value = aiReferenceChoice.value
      console.log('wholeCode', wholeCode.value, 'aiReferenceChoice', aiReferenceChoice.value)
      if (isAnalyzingSingleFile) {
        wholeCode.value = true
        console.log('已为单文件分析设置wholeCode为true')
      }
      // 设置文件数量
      if (analysisScope.value === 'current' && currentFocus.value && currentFocus.value.data) {
        count.value = currentFocus.value.data.count || 0
      } else {
        // 整个仓库的文件数量，使用根节点的count
        count.value = fileTree.value ? fileTree.value.count || 0 : 0
      }

      // 再打开弹窗，AnalysisReportModal 会收到最新的 props & visible=true
      analysisReportDrawerVisible.value = true

      console.log('yep', modalRepoID, modalTargetPath, modalScopeText, analysisReportDrawerVisible)
    } else {
      console.warn('未找到匹配的仓库路径')
    }
  } catch (error) {
    console.error('生成代码分析报告失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: '生成代码分析报告失败',
      color: 'error'
    })
  } finally {
    isProcessing.value = false
  }
}

// 内部分析报告生成逻辑
const generateAnalysisReportInternal = async (
  selectedItem,
  targetPath,
  scopeText,
  isAnalyzingSingleFile
) => {
  // 强制关闭索引进度定时器和进度框
  stopIndexProgressMonitoring()
  indexProgressVisible.value = false
  try {
    const repoID = selectedItem.id
    console.log('执行内部分析报告生成逻辑:', repoID, targetPath)

    const { indexing, hasDb } = await window.electron.checkMemoryFlashStatus(rootPath.value)
    if (indexing) {
      window.alert(`检测到正在对 "${targetPath}" 构建索引，请等待索引构建完成后，再进行分析`)
      return
    }

    // 给 ref 赋值，Vue 才能通知模板更新 props
    modalRepoID.value = selectedItem.id.toString()
    modalTargetPath.value = targetPath
    modalScopeText.value = scopeText
    apiType.value = 'deepResearch'

    // 根据用户选择设置wholeCode参数
    wholeCode.value = aiReferenceChoice.value
    console.log('wholeCode', wholeCode.value, 'aiReferenceChoice', aiReferenceChoice.value)
    if (isAnalyzingSingleFile) {
      wholeCode.value = true
      console.log('已为单文件分析设置wholeCode为true')
    }
    // 设置文件数量
    if (analysisScope.value === 'current' && currentFocus.value && currentFocus.value.data) {
      count.value = currentFocus.value.data.count || 0
    } else {
      // 整个仓库的文件数量，使用根节点的count
      count.value = fileTree.value ? fileTree.value.count || 0 : 0
    }

    // 再打开弹窗，AnalysisReportModal 会收到最新的 props & visible=true
    analysisReportDrawerVisible.value = true

    console.log('yep', modalRepoID, modalTargetPath, modalScopeText, analysisReportDrawerVisible)
  } catch (error) {
    console.error('生成代码分析报告失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: '生成代码分析报告失败',
      color: 'error'
    })
  }
}

// 生成流程图
const generateArchitectureMap = async () => {
  architectureDrawerVisible.value = false

  // 检查是否需要显示AI参考信息选择对话框
  if (!checkAiReferenceChoice(() => generateArchitectureMap())) {
    return // 等待用户选择
  }

  // 检查权重配置是否已初始化
  if (!checkWeightConfig(() => generateArchitectureMap())) {
    return // 等待用户选择权重配置
  }

  isProcessing.value = true
  try {
    const targetPath =
      architectureScope.value === 'current' && currentFocus.value
        ? currentFocus.value.data.fullPath
        : rootPath.value
    const scopeText = architectureScope.value === 'current' ? '当前层级' : '整个仓库'

    // 检查是否为单个文件分析
    let isAnalyzingSingleFile = false
    if (architectureScope.value === 'current' && currentFocus.value && currentFocus.value.data) {
      // 检查当前焦点是否为文件（非目录）
      isAnalyzingSingleFile = !currentFocus.value.data.isDirectory
      console.log('当前焦点是否为文件：', isAnalyzingSingleFile, aiReferenceChoice.value)
    }

    console.log(
      `生成流程图，范围：${scopeText}，路径：${targetPath}，单文件分析：${isAnalyzingSingleFile}`
    )

    // 这里可以调用后端API生成报告
    const selectedItem = pathSuggestions.value.find((item) => item.value === rootPath.value)
    if (selectedItem) {
      const repoID = selectedItem.id
      console.log('找到匹配的仓库ID:', repoID, targetPath)

      const { indexing, hasDb, hasFullIndex } = await window.electron.checkMemoryFlashStatus(
        rootPath.value
      )
      if (indexing) {
        window.alert(`检测到正在对 “${targetPath}” 构建索引，请等待索引构建完成后，再进行分析`)
        return
      }

      if (!hasFullIndex) {
        console.log('未构建全量索引')
        // 检查索引状态
        const shouldProceed = await checkIndexStatus(targetPath, () => {
          pendingReportAction.value = () =>
            generateArchitectureMapInternal(
              selectedItem,
              targetPath,
              scopeText,
              isAnalyzingSingleFile
            )
        })
        if (!shouldProceed) {
          return
        }
      }

      // 给 ref 赋值，Vue 才能通知模板更新 props
      modalRepoID.value = selectedItem.id.toString()
      modalTargetPath.value = targetPath
      modalScopeText.value = scopeText
      apiType.value = 'flowChart'

      // 根据用户选择设置wholeCode参数
      wholeCode.value = aiReferenceChoice.value
      console.log('wholeCode', wholeCode.value, 'aiReferenceChoice', aiReferenceChoice.value)
      if (isAnalyzingSingleFile) {
        wholeCode.value = true
        console.log('已为单文件分析设置wholeCode为true')
      }
      // 设置文件数量
      if (architectureScope.value === 'current' && currentFocus.value && currentFocus.value.data) {
        count.value = currentFocus.value.data.count || 0
      } else {
        // 整个仓库的文件数量，使用根节点的count
        count.value = fileTree.value ? fileTree.value.count || 0 : 0
      }

      // 再打开弹窗，AnalysisReportModal 会收到最新的 props & visible=true
      analysisReportDrawerVisible.value = true
    } else {
      console.warn('未找到匹配的仓库路径')
    }
  } catch (error) {
    console.error('生成流程图失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: '生成流程图失败',
      color: 'error'
    })
  } finally {
    isProcessing.value = false
  }
}

// 内部流程图生成逻辑
const generateArchitectureMapInternal = async (
  selectedItem,
  targetPath,
  scopeText,
  isAnalyzingSingleFile
) => {
  // 强制关闭索引进度定时器和进度框
  stopIndexProgressMonitoring()
  indexProgressVisible.value = false
  try {
    const repoID = selectedItem.id
    console.log('执行内部流程图生成逻辑:', repoID, targetPath)

    const { indexing, hasDb } = await window.electron.checkMemoryFlashStatus(rootPath.value)
    if (indexing) {
      window.alert(`检测到正在对 "${targetPath}" 构建索引，请等待索引构建完成后，再进行分析`)
      return
    }

    // 给 ref 赋值，Vue 才能通知模板更新 props
    modalRepoID.value = selectedItem.id.toString()
    modalTargetPath.value = targetPath
    modalScopeText.value = scopeText
    apiType.value = 'flowChart'

    // 根据用户选择设置wholeCode参数
    wholeCode.value = aiReferenceChoice.value
    console.log('wholeCode', wholeCode.value, 'aiReferenceChoice', aiReferenceChoice.value)
    if (isAnalyzingSingleFile) {
      wholeCode.value = true
      console.log('已为单文件分析设置wholeCode为true')
    }
    // 设置文件数量
    if (architectureScope.value === 'current' && currentFocus.value && currentFocus.value.data) {
      count.value = currentFocus.value.data.count || 0
    } else {
      // 整个仓库的文件数量，使用根节点的count
      count.value = fileTree.value ? fileTree.value.count || 0 : 0
    }

    // 再打开弹窗，AnalysisReportModal 会收到最新的 props & visible=true
    analysisReportDrawerVisible.value = true
  } catch (error) {
    console.error('生成流程图失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: '生成流程图失败',
      color: 'error'
    })
  }
}

const applyLensPath = async () => {
  if (lensPath.value) {
    console.log(`用户输入的路径: ${lensPath.value}`)
    isProcessing.value = true
    try {
      // 规范路径格式
      lensPath.value = window.electron.normalize(lensPath.value)
      const parts = lensPath.value.split(window.electron.sep).filter(Boolean)
      
      // 更新标签页标题
      const selectedRepo = pathSuggestions.value.find(item => item.value === lensPath.value)
      if (selectedRepo) {
        updateTabTitle(selectedRepo)
      }
      const pathDepth = parts.length

      let scanDepth
      if (fullScan.value) {
        // 全量扫描模式：使用更大的扫描深度
        scanDepth = 50 // 设置为50层深度，基本可以扫描到所有文件
        depth.value = 50
        console.log(`全量扫描模式，扫描深度: ${scanDepth}`)
      } else {
        // 普通扫描模式：使用自适应深度
        const adaptiveDepth = Math.floor((pathDepth - 3) / 0.3) + 3
        scanDepth = Math.min(Math.max(adaptiveDepth, 3), 14)
        depth.value = adaptiveDepth
        console.log(
          `路径深度: ${pathDepth}, 自适应扫描深度: ${adaptiveDepth}, 最终扫描深度: ${scanDepth}`
        )
      }
      rootPath.value = lensPath.value
      chartLoading.value = true
      legendLoading.value = true
      fileTree.value = await buildFileTreeAsync(rootPath.value, '', 0, scanDepth)
      drawChartWithAnimation()

      // 分析文件类型并绘制图表
      analyzeFileTypes(fileTree.value)
      setTimeout(() => {
        drawFileTypeChart()
      }, 100)
    } catch (error) {
      console.error('扫描失败：', error)
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
    showFileTypeStats.value = false
    fileTypeStats.value = []
    d3.select(chart.value).selectAll('*').remove()
    initialLoad.value = true
  }
}



const onLegendItemClick = async (event, item) => {
  if (currentFocus.value && currentFocus.value.children) {
    const childNode = currentFocus.value.children.find((child) => child.data.name === item.name)
    if (childNode) {
      if (childNode.data.isDirectory) {
        console.log('目录扫描不完整，准备重新扫描：', childNode.data.fullPath)
        isProcessing.value = true
        try {
          let additionalDepth = await rescanNode(childNode.data)
          fileTree.value = await buildFileTreeAsync(rootPath.value, '', 0, additionalDepth)
          root.value = d3.hierarchy(fileTree.value).sum((d) => d.size)
          const newTarget = root.value
            .descendants()
            .find((node) => node.data.fullPath === childNode.data.fullPath)
          if (newTarget) {
            currentFocus.value = newTarget
          }
          updateSunburst.value && updateSunburst.value(currentFocus.value)
        } catch (error) {
          console.error('右侧目录扫描失败：', error)
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

// 鼠标进入目录项时的处理
const onItemMouseEnter = async (event, item) => {
  if (!item || !item.fullPath) return

  currentHoverItem.value = item
  hoverBubbleVisible.value = true
  hoverBubbleLoading.value = true

  // 更新气泡位置
  updateBubblePosition(event)

  // 检查缓存
  const cacheKey = item.fullPath
  if (hoverApiCache.value.has(cacheKey)) {
    hoverBubbleContent.value = hoverApiCache.value.get(cacheKey)
    hoverBubbleLoading.value = false
    return
  }

  try {
    // 异步调用索引状态检查API
    const projectDir = rootPath.value
    const relativePath = item.fullPath.replace(rootPath.value, '').replace(/^[\/\\]/, '')

    console.log('异步检查索引状态，项目路径：', projectDir, '相对路径：', relativePath)
    const response = await checkIndexApi(projectDir, relativePath)
    console.log('气泡API响应:', response)

    let content = ''
    if (response && response.status === 200) {
      if (response.data.code === 0) {
        const {
          total_function_count = 0,
          total_file_count = 0,
          real_file_count = 0,
          function_details = []
        } = response.data.data
        if (total_function_count > 0 || total_file_count > 0) {
          content = `📁 ${item.name}\n`
          content += `📄 已索引文件数: ${total_file_count} / ${real_file_count}\n`
          content += `⚡ 函数索引量: ${total_function_count}`

          if (function_details && function_details.length > 0) {
            content += '\n\n🔧 主要函数:'
            function_details.slice(0, 3).forEach((func) => {
              content += `\n• ${func.function_name || func.name || '未知函数'}`
            })
            if (function_details.length > 3) {
              content += `\n... 还有 ${function_details.length - 3} 个函数`
            }
          }
        } else {
          content = `📁 ${item.name}\n❌ 未索引`
        }
      } else {
        content = `📁 ${item.name}\n❌ 未索引`
      }
    } else {
      content = `📁 ${item.name}\n⚠️ 无法获取信息`
    }

    // 缓存结果
    hoverApiCache.value.set(cacheKey, content)

    // 只有当前悬停项目没有改变时才更新内容
    if (currentHoverItem.value && currentHoverItem.value.fullPath === item.fullPath) {
      hoverBubbleContent.value = content
      hoverBubbleLoading.value = false
    }
  } catch (error) {
    console.error('获取气泡信息失败:', error)
    const errorContent = `📁 ${item.name}\n❌ 获取信息失败`

    if (currentHoverItem.value && currentHoverItem.value.fullPath === item.fullPath) {
      hoverBubbleContent.value = errorContent
      hoverBubbleLoading.value = false
    }
  }
}

// 鼠标离开目录项时的处理
const onItemMouseLeave = () => {
  hoverBubbleVisible.value = false
  currentHoverItem.value = null
  hoverBubbleLoading.value = false
}

// 鼠标在目录项上移动时的处理
const onItemMouseMove = (event, item) => {
  if (hoverBubbleVisible.value && currentHoverItem.value === item) {
    updateBubblePosition(event)
  }
}

// 更新气泡位置
const updateBubblePosition = (event) => {
  const offset = 15
  hoverBubbleX.value = event.clientX + offset
  hoverBubbleY.value = event.clientY - offset
}

const buildFileTree = (dirPath, parentName = '') => {
  const name = path.basename(dirPath)
  let totalSize = 0
  let children = []
  let files
  try {
    files = fs.readdirSync(dirPath).filter((file) => !file.startsWith('.'))
  } catch (err) {
    console.error('读取目录失败：', err)
    return { name, size: 0, group: parentName, children: [] }
  }
  files.forEach((file) => {
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
      console.error('处理文件失败：', fullPath, err)
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
    additionalDepth += currentDepth - targetDepth
  }
  console.log(
    `重新扫描目录 ${nodeData.fullPath}，当前层级 ${currentDepth}，目标层级 ${targetDepth}，额外扩展深度 ${additionalDepth}`
  )
  try {
    const newSubtree = await buildFileTreeAsync(
      nodeData.fullPath,
      nodeData.group || nodeData.name,
      0,
      additionalDepth
    )
    nodeData.children = newSubtree.children
    nodeData.size = newSubtree.size
    nodeData.incomplete = newSubtree.incomplete
    console.log(`节点 ${nodeData.fullPath} 已更新扫描数据`)
    return additionalDepth
  } catch (error) {
    console.error('重新扫描节点失败：', nodeData.fullPath, error)
  }
}

const buildFileTreeAsync = async (dirPath, parentName = '', d = 0, maxDepth = depth.value) => {
  const name = path.basename(dirPath)
  let totalSize = 0
  let totalCount = 0 // 添加总计数变量，用于计算所有子文件和子文件夹的文件总数
  let children = []
  let files
  try {
    files = (await fs.promises.readdir(dirPath)).filter((file) => !file.startsWith('.'))
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
        count: 0, // 添加count属性
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
      count: 0, // 添加count属性
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
      count: 0, // 添加count属性
      group: parentName,
      fullPath: dirPath,
      isDirectory: true,
      children: [],
      incomplete: true
    }
  }
  const results = await Promise.all(
    files.map(async (file) => {
      const fullPath = path.join(dirPath, file)
      try {
        await fs.promises.access(fullPath, fs.constants.F_OK)
        const statData = await window.electron.getFileStats(fullPath)
        if (statData.isDirectory) {
          const subtree = await buildFileTreeAsync(fullPath, name, d + 1, maxDepth)
          totalSize += subtree.size
          totalCount += subtree.count // 累加子目录的文件总数
          return subtree
        } else if (statData.isFile) {
          const fileSizeKB = Math.ceil(statData.size / 1024)
          totalSize += fileSizeKB
          totalCount += 1 // 每个文件计数为1
          return {
            name: file,
            size: fileSizeKB,
            count: 1, // 文件的count为1
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
          console.error('处理文件失败：', fullPath, err)
          return null
        }
      }
    })
  )
  children = results.filter((item) => item !== null)
  return {
    name,
    size: totalSize,
    count: totalCount, // 返回该目录下所有文件的总数
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
    if (!response.data || !Array.isArray(response.data)) return
    // 根据id降序排序
    const sortedData = [...response.data].sort((a, b) => b.id - a.id)
    pathSuggestions.value = sortedData.map((repo) => {
      return {
        value: repo.local_path,
        title: repo.desc ? `${omit(repo.desc, 25)}(${repo.name})` : repo.name,
        id: repo.id,
        name: repo.name
      }
    })
  } catch (err) {
    console.error('获取仓库数据失败:', err)
  }
}

// 更新标签页标题
const updateTabTitle = (selectedRepo) => {
  // 检查当前路由是否为space，避免影响其他路由的标签页
  const currentRoute = window.location.pathname || window.location.hash
  if (!currentRoute.includes('/space')) {
    return
  }
  
  if (selectedRepo) {
    try {
      // 使用自定义事件更新标签页标题
      const title = `空间透镜·${selectedRepo.name}`
      window.dispatchEvent(new CustomEvent('tabs:set-title', { 
        detail: { title } 
      }))
    } catch (e) {
      console.log('更新标签页标题失败:', e)
    }
  }
}

// 绘制图表并添加动画与交互
const chart = ref(null)
const renderMode = ref('count') // 'size' 或 'count'
const colorMode = ref('horizontal') // 'horizontal' 或 'vertical'
watch(renderMode, () => {
  if (fileTree.value) {
    drawChartWithAnimation()
  }
})
watch(colorMode, () => {
  if (fileTree.value) {
    drawChartWithAnimation()
  }
})

// 支持三色渐变，默认蓝-紫
const colorRange = ref(['#FCE38A', '#F38181', '#EAFFD0'])

// 色卡弹窗控制
const showPaletteDialog = ref(false)

// 预设色卡模板
const presetPalettes = [
  ['#b98eff', '#7C4DFF', '#4a04ff'], // 蓝-紫
  ['#FCE38A', '#F38181', '#EAFFD0'], // 浅黄-粉-浅绿
  ['#FFDEE9', '#B5FFFC', '#A1C4FD'], // 粉-浅蓝-蓝
  ['#43E97B', '#38F9D7', '#3B82F6'], // 绿-青-蓝
  ['#FFB75E', '#ED8F03', '#A770EF'], // 橙-金-紫
  ['#F7971E', '#FFD200', '#21D4FD'], // 橙-黄-蓝
  ['#43C6AC', '#191654', '#6D5BBA'] // 绿-深蓝-紫
]

// 应用色卡
function applyPalette(palette) {
  colorRange.value = [...palette]
  showPaletteDialog.value = false
  refreshChart()
}

// 刷新图表（手动触发 assignColors 并重绘）
function refreshChart() {
  if (fileTree.value) {
    drawChartWithAnimation()
  }
}

// 生成同级渐变色（支持三色渐变）
function getSiblingColors(range, count) {
  // range: [color1, color2, color3]
  const colors = []
  if (count === 1) {
    colors.push(range[1])
    return colors
  }
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    let color
    if (t <= 0.5) {
      // 前半段 color1→color2
      color = d3.interpolateHsl(range[0], range[1])(t * 2)
    } else {
      // 后半段 color2→color3
      color = d3.interpolateHsl(range[1], range[2])((t - 0.5) * 2)
    }
    colors.push(color)
  }
  return colors
}

// 递归分配颜色，支持三色渐变 - 同层级渐变模式
function assignHorizontalColors(node, range = colorRange.value) {
  node.data._color = range[0]
  if (!node.children || node.children.length === 0) return
  const colors = getSiblingColors(range, node.children.length)
  node.children.forEach((child, idx) => {
    // 子节点继续用当前色到终点色递进
    assignHorizontalColors(child, [colors[idx], range[1], range[2]])
  })
}

// 递归分配颜色，支持三色渐变 - 垂直子层级渐变模式
function assignVerticalColors(node, range = colorRange.value) {
  // 当前节点的颜色使用传入的范围的起始色
  node.data._color = range[0]

  if (!node.children || node.children.length === 0) return

  // 对同级兄弟节点分配不同的颜色，就像水平模式一样
  const siblingColors = getSiblingColors(range, node.children.length)

  // 对每个子节点，根据其在兄弟中的位置分配不同的颜色
  node.children.forEach((child, idx) => {
    // 为子节点创建一个新的色范围，从当前颜色到终点色渐变
    // 这样每个分支都有不同的起始色，但其子层级会在该颜色的基础上渐变
    const childRange = [
      siblingColors[idx],
      d3.interpolateRgb(siblingColors[idx], range[1])(0.7), // 中间色
      range[1] // 终点色
    ]

    // 为每个子节点计算垂直渐变颜色
    assignVerticalColors(child, childRange)
  })
}

// 根据当前颜色模式选择合适的颜色分配函数
function assignColors(node, range = colorRange.value) {
  if (colorMode.value === 'horizontal') {
    assignHorizontalColors(node, range)
  } else {
    // 获取树的最大深度用于垂直渐变计算
    const maxDepth = getMaxDepth(node)
    assignVerticalColors(node, range, 0, maxDepth)
  }
}

// 获取树的最大深度
function getMaxDepth(node) {
  if (!node.children || node.children.length === 0) return 0
  return 1 + Math.max(...node.children.map(getMaxDepth))
}

const drawChartWithAnimation = () => {
  if (!fileTree.value) return
  initialLoad.value = false
  d3.select(chart.value).selectAll('*').remove()
  const width = 1000,
    height = 600
  const radius = Math.min(width, height) / 2
  const innerRadius = 60
  // 递归分配颜色，传递 colorRange
  root.value = d3.hierarchy(fileTree.value)
  assignColors(root.value, colorRange.value)
  assignValueByMode(root.value)
  currentFocus.value = root.value
  // legendItems 也用 _color
  legendItems.value = (fileTree.value.children || []).map((child) => ({
    name: child.name,
    color: child._color,
    fullPath: child.fullPath,
    size: child.size || 0,
    count: child.count || 0,
    isDirectory: child.isDirectory || !!child.children
  }))
  const svg = d3.select(chart.value).append('svg').attr('width', width).attr('height', height)
  const g = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`)

  // 添加缩放功能 - 基于鼠标位置为中心
  const zoom = d3
    .zoom()
    .scaleExtent([0.5, 3]) // 缩放范围：0.5倍到3倍
    .on('zoom', (event) => {
      g.attr('transform', event.transform)
    })

  // 设置初始变换，使图表居中
  const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2)
  svg.call(zoom.transform, initialTransform)

  svg.call(zoom)
  const diameter = innerRadius * 2.5
  const defs = svg.append('defs')
  const pattern = defs
    .append('pattern')
    .attr('id', 'minecraftGlassPattern')
    .attr('width', diameter)
    .attr('height', diameter)
    .attr('x', innerRadius * 1.25)
    .attr('y', innerRadius * 1.25)
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('patternRepeat', 'no-repeat')
  pattern
    .append('image')
    .attr('xlink:href', grassSVG)
    .attr('width', diameter)
    .attr('height', diameter)
  const lensCircle = g
    .append('circle')
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
    .on('mousemove', (event) => {
      const [mx, my] = d3.pointer(event, lensCircle.node())
      const shiftX = mx * 0.3
      const shiftY = my * 0.3
      pattern.attr('patternTransform', `translate(${shiftX}, ${shiftY})`)
    })
    .on('mouseout', () => {
      pattern.attr('patternTransform', null)
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
  assignValueByMode(root.value)
  currentFocus.value = root.value

  const handleContextMenu = (event, d) => {
    event.preventDefault()
    event.stopPropagation()
    selectedFile.value = {
      name: d.data.name,
      fullPath: d.data.fullPath,
      isDirectory: d.data.isDirectory,
      count: d.data.count || 0,
      size: d.data.size || 0
    }
    showContextMenu(event, selectedFile.value)
  }
  const getArcData = (d) => ({ x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 })

  const updateSunburstFunc = (focusNode) => {
    if (!focusNode) return
    updateSunburst.value = updateSunburstFunc
    // 递归分配颜色，传递 colorRange
    const rootHierarchy = d3.hierarchy(focusNode.data)
    assignColors(rootHierarchy, [
      focusNode.data._color || colorRange.value[0],
      colorRange.value[1],
      colorRange.value[2]
    ])
    rootHierarchy.each((node) => {
      assignValueByMode(node)
    })
    d3.partition().size([2 * Math.PI, rootHierarchy.height + 1])(rootHierarchy)
    const focusDepth = focusNode.height
    const ringThickness = (radius - innerRadius) / (focusDepth > 0 ? focusDepth : 1)
    const arcGen = d3
      .arc()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .innerRadius((d) => innerRadius + (d.y0 - 1) * ringThickness)
      .outerRadius((d) => innerRadius + (d.y1 - 1) * ringThickness)
    const arcs = g.selectAll('path').data(
      rootHierarchy.descendants().filter((d) => d.depth > 0),
      (d) => d.data.name + '-' + d.depth
    )
    arcs
      .exit()
      .transition()
      .duration(750)
      .attrTween('d', function(d) {
        const current = this._current ? getArcData(this._current) : getArcData(d)
        const target = { x0: d.x0, x1: d.x0, y0: d.y0, y1: d.y1 }
        const i = d3.interpolate(current, target)
        return (t) => arcGen(i(t))
      })
      .remove()
    arcs
      .transition()
      .duration(750)
      .attrTween('d', function(d) {
        const current = this._current ? getArcData(this._current) : getArcData(d)
        const target = getArcData(d)
        const i = d3.interpolate(current, target)
        this._current = i(0)
        return (t) => arcGen(i(t))
      })
    // legendItems 也用 _color
    if (focusNode.children && focusNode.children.length > 0) {
      const directories = focusNode.children.filter((child) => child.data.isDirectory)
      const files = focusNode.children.filter((child) => !child.data.isDirectory)
      legendItems.value = [
        ...directories.map((dir) => ({
          name: dir.data.name,
          color: dir.data._color,
          fullPath: dir.data.fullPath,
          isDirectory: true,
          icon: 'mdi-folder',
          size: dir.value || 0,
          count: dir.data.count || 0
        })),
        ...files.map((file) => ({
          name: file.data.name,
          color: file.data._color,
          fullPath: file.data.fullPath,
          isDirectory: false,
          size: file.data.size || 0,
          count: 1
        }))
      ]
    } else {
      legendItems.value = []
    }
    legendLoading.value = false
    const formatSize = (value) =>
      value >= 1024 ? (value / 1024).toFixed(1) + ' MB' : value + ' KB'
    const newArcs = arcs
      .enter()
      .append('path')
      .attr('fill', (d) => d.data._color)
      .attr('stroke', 'none')
      .attr('stroke-width', 1)
      .each(function(d) {
        this._current = getArcData(d)
      })
      .on('click', async (event, d) => {
        if (d.data.isDirectory) {
          console.log('目录扫描不完整，准备重新扫描：', d.data.fullPath)
          let additionalDepth = await rescanNode(d.data)
          fileTree.value = await buildFileTreeAsync(rootPath.value, '', 0, additionalDepth)
          root.value = d3.hierarchy(fileTree.value).sum((d) => d.size)
          const newTarget = root.value
            .descendants()
            .find((node) => node.data.fullPath === d.data.fullPath)
          if (newTarget) {
            currentFocus.value = newTarget
          }
          updateSunburstFunc(currentFocus.value)
        }
        event.stopPropagation()
      })
      .on('contextmenu', handleContextMenu)
      .on('mouseover', (event, d) => {
        const size = renderMode.value === 'size' ? formatSize(d.value) : d.value + ' 项'
        tooltipContent.value = `${d.data.name}: ${size}`
        tooltipVisible.value = true
      })
      .on('mousemove', (event) => {
        tooltipX.value = event.pageX + 10
        tooltipY.value = event.pageY + 10
      })
      .on('mouseout', () => {
        tooltipVisible.value = false
      })
    newArcs.append('title').text((d) => `${d.data.name}: ${d.value}`)
    newArcs
      .transition()
      .duration(750)
      .attrTween('d', function(d) {
        const current = this._current
        const target = getArcData(d)
        const i = d3.interpolate(current, target)
        this._current = i(0)
        return (t) => arcGen(i(t))
      })
    legendLoading.value = false
    chartLoading.value = false
  }
  updateSunburstFunc(currentFocus.value)
}

function assignValueByMode(node) {
  if (!node.data.isDirectory) {
    node.value = renderMode.value === 'size' ? node.data.size : 1
    return node.value
  }
  let sum = 0
  if (node.children) {
    for (const child of node.children) {
      sum += assignValueByMode(child)
    }
  }
  node.value = sum
  return node.value
}

// 文件类型分析函数
const getFileTypeIcon = (extension) => {
  const iconMap = {
    '.js': 'mdi-language-javascript',
    '.ts': 'mdi-language-typescript',
    '.vue': 'mdi-vuejs',
    '.py': 'mdi-language-python',
    '.java': 'mdi-language-java',
    '.cpp': 'mdi-language-cpp',
    '.c': 'mdi-language-c',
    '.cs': 'mdi-language-csharp',
    '.php': 'mdi-language-php',
    '.rb': 'mdi-language-ruby',
    '.go': 'mdi-language-go',
    '.rs': 'mdi-language-rust',
    '.swift': 'mdi-language-swift',
    '.kt': 'mdi-language-kotlin',
    '.html': 'mdi-language-html5',
    '.css': 'mdi-language-css3',
    '.scss': 'mdi-sass',
    '.less': 'mdi-language-css3',
    '.json': 'mdi-code-json',
    '.xml': 'mdi-xml',
    '.yaml': 'mdi-file-code',
    '.yml': 'mdi-file-code',
    '.md': 'mdi-language-markdown',
    '.txt': 'mdi-file-document',
    '.sql': 'mdi-database',
    '.sh': 'mdi-console',
    '.bat': 'mdi-console',
    '.dockerfile': 'mdi-docker',
    '.gitignore': 'mdi-git'
  }
  return iconMap[extension.toLowerCase()] || 'mdi-file-code'
}

const analyzeFileTypes = (tree) => {
  const typeMap = new Map()

  // 获取iconMap中定义的文件扩展名
  const iconMap = {
    '.js': 'mdi-language-javascript',
    '.ts': 'mdi-language-typescript',
    '.vue': 'mdi-vuejs',
    '.py': 'mdi-language-python',
    '.java': 'mdi-language-java',
    '.cpp': 'mdi-language-cpp',
    '.c': 'mdi-language-c',
    '.cs': 'mdi-language-csharp',
    '.php': 'mdi-language-php',
    '.rb': 'mdi-language-ruby',
    '.go': 'mdi-language-go',
    '.rs': 'mdi-language-rust',
    '.swift': 'mdi-language-swift',
    '.kt': 'mdi-language-kotlin',
    '.html': 'mdi-language-html5',
    '.css': 'mdi-language-css3',
    '.scss': 'mdi-sass',
    '.less': 'mdi-language-css3',
    '.json': 'mdi-code-json',
    '.xml': 'mdi-xml',
    '.yaml': 'mdi-file-code',
    '.yml': 'mdi-file-code',
    '.md': 'mdi-language-markdown',
    '.txt': 'mdi-file-document',
    '.sql': 'mdi-database',
    '.sh': 'mdi-console',
    '.bat': 'mdi-console',
    '.dockerfile': 'mdi-docker',
    '.gitignore': 'mdi-git'
  }

  const traverse = (node) => {
    if (!node.isDirectory && node.name) {
      const ext = path.extname(node.name).toLowerCase()
      // 只统计在iconMap中定义的文件类型
      if (ext && iconMap[ext]) {
        if (!typeMap.has(ext)) {
          typeMap.set(ext, { count: 0, size: 0, extension: ext })
        }
        const current = typeMap.get(ext)
        current.count++
        current.size += node.size || 0
      }
    }

    if (node.children) {
      node.children.forEach(traverse)
    }
  }

  traverse(tree)

  // 转换为数组并排序（按文件数量排序，取前10个）
  const sortedTypes = Array.from(typeMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)

  // 计算百分比
  const totalCount = sortedTypes.reduce((sum, type) => sum + type.count, 0)
  sortedTypes.forEach((type) => {
    type.percentage = ((type.count / totalCount) * 100).toFixed(1)
    type.icon = getFileTypeIcon(type.extension)
  })

  fileTypeStats.value = sortedTypes
  showFileTypeStats.value = sortedTypes.length > 0
}

// 获取Vuetify颜色名称（用于v-icon、v-chip等组件）
const getTypeColorName = (index) => {
  const colors = [
    'primary',
    'secondary',
    'accent',
    'success',
    'warning',
    'error',
    'info',
    'purple',
    'pink',
    'indigo',
    'teal',
    'orange',
    'brown',
    'grey'
  ]
  return colors[index % colors.length]
}

// 获取十六进制颜色值（用于CSS样式）
const getTypeColor = (index) => {
  const colors = [
    '#1976D2', // primary
    '#424242', // secondary
    '#82B1FF', // accent
    '#4CAF50', // success
    '#FF9800', // warning
    '#F44336', // error
    '#2196F3', // info
    '#9C27B0', // purple
    '#E91E63', // pink
    '#3F51B5', // indigo
    '#009688', // teal
    '#FF5722', // orange
    '#795548', // brown
    '#9E9E9E' // grey
  ]
  return colors[index % colors.length]
}

const formatFileSize = (sizeInBytes) => {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`
  } else if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`
  } else if (sizeInBytes < 1024 * 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
  } else {
    return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
}

const drawFileTypeChart = () => {
  if (!fileTypeStats.value.length) return

  // 清除之前的图表
  d3.select('#file-type-chart').selectAll('*').remove()

  const width = 200
  const height = 200
  const radius = Math.min(width, height) / 2

  const svg = d3
    .select('#file-type-chart')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`)

  const color = d3
    .scaleOrdinal()
    .domain(fileTypeStats.value.map((d) => d.extension))
    .range(d3.schemeCategory10)

  const pie = d3
    .pie()
    .value((d) => d.count)
    .sort(null)

  const arc = d3
    .arc()
    .innerRadius(40)
    .outerRadius(radius - 10)

  const arcs = svg
    .selectAll('.arc')
    .data(pie(fileTypeStats.value))
    .enter()
    .append('g')
    .attr('class', 'arc')

  arcs
    .append('path')
    .attr('d', arc)
    .attr('fill', (d) => color(d.data.extension))
    .style('opacity', 0)
    .transition()
    .duration(800)
    .style('opacity', 0.8)
    .attrTween('d', function(d) {
      const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d)
      return function(t) {
        return arc(interpolate(t))
      }
    })

  // 添加标签
  arcs
    .append('text')
    .attr('transform', (d) => `translate(${arc.centroid(d)})`)
    .attr('dy', '.35em')
    .style('text-anchor', 'middle')
    .style('font-size', '10px')
    .style('font-weight', 'bold')
    .style('fill', 'white')
    .style('opacity', 0)
    .text((d) => d.data.percentage + '%')
    .transition()
    .delay(800)
    .duration(400)
    .style('opacity', 1)

  fileTypeChartKey.value++
}

onMounted(() => {
  // 初始化AI参考信息选择
  initAiReferenceChoice()
  // 初始化权重配置
  initWeightConfig()
  // 如有需要，可在 mounted 时做额外初始化（例如自动加载默认数据）
})

// 监听预设选择变化
watch(selectedPreset, () => {
  applyPresetConfig()
})
</script>

<style scoped>
.drawer-card {
  width: 220px;
  overflow: hidden;
  animation: slide-in 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.drawer-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 12px;
  color: #424242;
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  gap: 8px;
}

.directory-list-container {
  height: 60vh;
  overflow: hidden;
  background-color: #eeefef;
  border-radius: 8px;
}

.directory-list {
  max-height: 60vh;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: #eeefef;
}

.directory-list::-webkit-scrollbar {
  width: 6px;
}

.directory-list::-webkit-scrollbar-thumb {
  background-color: #eeefef;
  border-radius: 4px;
}

@keyframes slide-in {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

:deep(.bg-surface-variant) {
  background-color: rgb(var(--v-theme-on-surface-variant)) !important;
}
</style>

<style scoped>
/* General container and animations */
.space-lens-container-modern {
  /* Inspired by DeepSearch.vue .search-container */
  animation: fadeIn 0.6s ease-out;
  padding-top: 16px; /* Add some top padding */
}

.modern-overlay .v-progress-circular {
  /* Style for progress circular if needed, matching DeepSearch */
}

/* Autocomplete and Buttons */
.v-autocomplete.v-input--density-dense.v-text-field--solo-filled.v-text-field--single-line
.v-field {
  border-radius: 20px !important; /* Rounded like DeepSearch input */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.v-autocomplete.v-input--density-dense.v-text-field--solo-filled.v-text-field--single-line
.v-field:focus-within {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.6) !important;
}

.button-group-modern .modern-btn {
  border-radius: 20px; /* Rounded buttons */
  text-transform: none; /* No uppercase text */
  font-weight: 500;
  transition: all 0.2s ease-in-out;
}

.button-group-modern .modern-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Toolbar and Breadcrumbs */
.v-toolbar--density-compact {
  margin-bottom: 8px; /* Spacing like DeepSearch header */
}

.v-breadcrumbs {
  padding: 8px 0;
}

.v-breadcrumbs-item {
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface-rgb), 0.7);
  transition: color 0.2s ease;
}

.v-breadcrumbs-item:hover {
  color: rgba(var(--v-theme-primary-rgb), 1);
}

/* Chart and Legend Area */
.chart {
  /* Add subtle shadow or border if needed */
  border-radius: 12px;
  /* background: rgba(var(--v-theme-surface-rgb), 0.6); */ /* Optional: if a background is desired */
  /* box-shadow: 0 6px 24px rgba(0, 0, 0, 0.05); */
  animation: slideUp 0.5s ease-out 0.2s; /* Delayed animation */
  animation-fill-mode: backwards; /* Ensure it starts from opacity 0 */
}

.directory-list-container.modern-surface {
  background: rgba(var(--v-theme-surface-rgb), 0.4);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(var(--v-theme-on-surface-rgb), 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  animation: slideUp 0.5s ease-out 0.3s; /* Delayed animation */
  animation-fill-mode: backwards;
}

.modern-list {
  background-color: transparent !important; /* Make list transparent to show container's backdrop */
}

.modern-list-item {
  transition: background-color 0.2s ease,
  transform 0.2s ease;
  border-radius: 8px;
  margin: 4px 0; /* Add some spacing */
}

.modern-list-item:hover {
  background-color: rgba(var(--v-theme-primary-rgb), 0.1);
  transform: translateX(3px);
}

.modern-list-item .v-list-item-title {
  font-weight: 500;
}

/* Tooltip */
.tooltip-card-modern {
  background-color: rgba(
    var(--v-theme-surface-rgb),
    0.9
  ) !important; /* Match DeepSearch dropdown */
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border-radius: 8px !important;
  padding: 10px 14px !important;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.12) !important;
}

.tooltip-card-modern .v-icon {
  color: rgba(var(--v-theme-primary-rgb), 1);
}

.tooltip-card-modern span {
  color: rgba(var(--v-theme-on-surface-rgb), 0.87) !important;
  font-size: 1rem !important;
}

/* Drawers */
.modern-drawer .drawer-card-modern {
  width: 250px; /* Slightly wider */
  border-radius: 12px; /* More rounded */
  background: rgba(var(--v-theme-surface-rgb), 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(var(--v-theme-on-surface-rgb), 0.08);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: fadeIn 0.3s ease-out; /* Use fadeIn for drawers */
}

.drawer-card-modern .v-card-text {
  padding: 20px;
}

.drawer-card-modern .drawer-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: rgba(var(--v-theme-primary-rgb), 0.9);
  margin-bottom: 16px;
}

.drawer-card-modern .v-radio-group .v-label {
  font-size: 0.95rem;
}

.drawer-card-modern .drawer-actions {
  margin-top: 20px;
}

.drawer-card-modern .drawer-actions .v-btn {
  border-radius: 18px;
  text-transform: none;
}

/* Snackbar */
.v-snackbar--rounded-pill .v-snackbar__wrapper {
  /* Styles for pill snackbar if needed, already has good defaults */
}

/* Keyframe animations (from DeepSearch.vue) */
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
    transform: translateY(-15px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(15px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Ensure initial state for animations if not handled by v-if */
.v-row:first-child, /* Top controls row */
.v-row:nth-child(2) /* Breadcrumbs row */
{
  animation: slideDown 0.5s ease-out;
}

/* 文件类型统计卡片样式 */
.file-type-stats-card {
  border-radius: 16px !important;
  background: rgba(var(--v-theme-surface-rgb), 0.95) !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(var(--v-theme-on-surface-rgb), 0.08);
  animation: slideUp 0.6s ease-out;
}

/* 实时回显气泡样式 */
.hover-bubble-card {
  background: rgba(var(--v-theme-surface-rgb), 0.98) !important;
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-radius: 12px !important;
  border: 1px solid rgba(var(--v-theme-primary-rgb), 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15) !important;
  animation: fadeIn 0.2s ease-out;
  transition: all 0.2s ease-out;
}

.hover-bubble-content {
  font-size: 0.875rem;
  line-height: 1.4;
}

.bubble-text {
  font-family: 'SF Pro Text',
  -apple-system,
  BlinkMacSystemFont,
  'Segoe UI',
  Roboto,
  sans-serif;
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: rgba(var(--v-theme-on-surface-rgb), 0.87);
}

.file-type-chart-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.file-type-list {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
}

.file-type-item {
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(var(--v-theme-surface-variant-rgb), 0.3);
  animation: fadeIn 0.5s ease-out;
  animation-fill-mode: both;
}

.file-type-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.file-type-details {
  flex: 1;
  margin-left: 8px;
}

.file-type-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface-rgb), 0.87);
}

.file-type-stats-text {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface-rgb), 0.6);
  margin-top: 2px;
}

.file-type-percentage {
  margin-left: 12px;
}

.percentage-chip {
  font-size: 0.7rem !important;
  font-weight: 600 !important;
  min-width: 45px;
}

/* 紧凑模式文件类型统计样式 */
.file-type-compact-stats {
  background: rgba(var(--v-theme-surface-rgb), 0.95);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(var(--v-theme-on-surface-rgb), 0.08);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  animation: slideUp 0.6s ease-out;
}

.compact-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 0 8px 0;
  padding: 0;
}

.compact-title {
  display: flex;
  align-items: center;
  font-weight: 600;
  margin: 0;
  padding: 0;
}

.compact-bars {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
}

/* 统一比例条样式 */
.unified-progress-bar {
  display: flex;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  background-color: rgba(var(--v-theme-on-surface-rgb), 0.05);
  animation: slideIn 0.6s ease-out;
  margin: 0;
}

.progress-segment {
  height: 100%;
  transition: all 0.3s ease;
  cursor: pointer;
}

.progress-segment:hover {
  filter: brightness(1.1);
  transform: scaleY(1.1);
}

.progress-segment:first-child {
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
}

.progress-segment:last-child {
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}

/* 图例样式 */
.compact-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 2px 0 0 0;
  padding: 0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.7rem;
  animation: fadeIn 0.5s ease-out;
  animation-fill-mode: both;
  margin: 0;
  padding: 0;
}

.legend-color {
  width: 8px;
  height: 8px;
  border-radius: 1px;
  flex-shrink: 0;
}

.legend-text {
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface-rgb), 0.87);
  margin: 0;
}

.legend-percentage {
  font-weight: 600;
  color: rgba(var(--v-theme-primary-rgb), 0.8);
  margin: 0;
}

@keyframes slideIn {
  from {
    transform: scaleX(0);
    opacity: 0;
  }
  to {
    transform: scaleX(1);
    opacity: 1;
  }
}

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

@media (min-width: 1280px) {
  .v-container {
    max-width: 1200px;
  }
}

@media (min-width: 960px) {
  .v-container {
    max-width: 1500px;
  }
}

/* 权重配置样式 */
.weight-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.weight-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.weight-label {
  font-size: 14px;
}

.weight-value {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-primary));
}

.weight-config-button {
  display: flex;
  align-items: center;
}

.custom-weight-inputs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.custom-weight-inputs .v-text-field {
  margin-bottom: 0;
}
</style>
