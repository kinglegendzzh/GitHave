<template>
  <v-container>
    <!-- 动态加载状态：显示一个内置动画的SVG动态加载图 -->
    <template v-if="loading">
      <div class="loading-container">
        <img :src="dynamicLoadingSvg" alt="加载动画" class="loading-svg" />
      </div>
    </template>

    <!-- 正常显示时间轴 -->
    <template v-else>
      <v-app>
        <v-timeline density="compact">
          <template v-for="(step, index) in steps" :key="index">
            <v-timeline-item :dot-color="step.color" :icon="step.icon">
              <v-card variant="flat" class="pa-2">
                <v-card-title class="headline">
                  {{ step.title }}
                </v-card-title>
                <v-card-text v-if="step.description">
                  {{ step.description }}
                </v-card-text>

                <!-- 子流程项展示 -->
                <template v-if="step.subSteps && step.subSteps.length">
                  <div style="min-width: 900px; max-width: 900px">
                    <v-divider class="my-3" />
                    <v-stepper v-model="step.currentStep" class="elevation-0">
                      <v-stepper-header class="elevation-0">
                        <template
                          v-for="(subStep, subIndex) in step.subSteps"
                          :key="subIndex"
                        >
                          <v-stepper-item
                            :value="subIndex + 1"
                            :complete="step.currentStep > subIndex + 1"
                            @click="selectSubStep(step, subStep)"
                            class="cursor-pointer"
                            editable
                          >
                            <template #title>
                              <div class="d-flex align-center">
                                <v-icon size="small" class="mr-1">
                                  {{
                                    subStep.icon ||
                                    'mdi-checkbox-blank-circle-outline'
                                  }}
                                </v-icon>
                                <span>{{ subStep.title }}</span>
                              </div>
                            </template>
                          </v-stepper-item>
                          <v-divider
                            v-if="subIndex < step.subSteps.length - 1"
                            :key="'divider-' + subIndex"
                          />
                        </template>
                      </v-stepper-header>
                    </v-stepper>
                    <!-- 子步骤描述展示区域 -->
                    <v-card-text
                      v-if="step.selectedSubStep && step.selectedSubStep.description"
                      class="mt-3 bg-grey-lighten-4 rounded"
                    >
                      {{ step.selectedSubStep.description }}
                    </v-card-text>
                  </div>
                </template>

                <!-- 分支选择部分 -->
                <template v-if="step.branches && step.branches.length">
                  <div style="min-width: 900px; max-width: 900px">
                    <v-divider class="my-3" />
                    <v-row class="branch-options">
                      <v-col
                        v-for="(branch, branchIndex) in step.branches"
                        :key="branchIndex"
                        :cols="12 / step.branches.length"
                      >
                        <v-card
                          variant="outlined"
                          class="branch-option"
                          :class="{ selected: selectedBranch === branch.value }"
                          @click="jumpToRoute(branch.value)"
                        >
                          <v-card-text class="text-center">
                            <v-icon>{{ branch.icon }}</v-icon>
                            <div>{{ branch.title }}</div>
                          </v-card-text>
                        </v-card>
                      </v-col>
                    </v-row>
                  </div>
                </template>

                <!-- 跳转按钮（对非分支步骤） -->
                <v-card-actions v-if="step.route">
                  <v-btn color="primary" @click="jumpToRoute(step.route)">
                    前往 {{ step.buttonText || step.title }}
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-timeline-item>
          </template>
        </v-timeline>
      </v-app>
    </template>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import dynamicLoadingSvg from '../assets/load.svg';

// 通过 useRouter 获取 vue-router 实例用于页面跳转
const router = useRouter();

// 控制是否处于加载状态
const loading = ref(true);

// 分支选择（全局）状态
const selectedBranch = ref(null);

// 定义时间轴流程项
const steps = ref([
  {
    title:
      'GitGo，是一个代码智能助理软件',
    description: '下面我们来进行快速使用流程👇',
    icon: 'mdi-play',
    color: 'primary',
    // 该步骤仅作为介绍，无子流程/跳转
  },
  {
    title: '1. 代码仓库初始化',
    description:
      '从任何公网的GitHub、Gitee，或公司内网的GitLab，将代码仓库导入到这里',
    icon: 'mdi-source-repository',
    color: 'success',
    currentStep: 1,
    selectedSubStep: null,
    subSteps: [
      {
        title: '创建仓库身份证',
        icon: 'mdi-card-account-details',
        description:
          '为你的代码仓库创建唯一身份标识，便于后续管理和追踪',
      },
      {
        title: '生成数据记忆卡',
        icon: 'mdi-memory',
        description:
          '基于仓库内容生成数据记忆卡，构建智能索引，提升AI理解和分析能力',
      },
    ],
    route: '/repo',
    buttonText: '仓库配置',
  },
  {
    title: '2. 配置大模型',
    description: '配置所需的模型参数',
    icon: 'mdi-cog',
    color: 'info',
    branches: [
      { title: '离线智能', value: '/model', icon: 'mdi-laptop' },
      { title: '云端智能', value: '/model', icon: 'mdi-cloud' },
    ],
  },
  {
    title: '3. 配置智能体',
    description: '配置你的智能体参数',
    icon: 'mdi-robot',
    color: 'purple',
    currentStep: 1,
    selectedSubStep: null,
    subSteps: [
      {
        title: '定制智能体行为',
        icon: 'mdi-text-box',
        description:
          '定制智能体的行为逻辑与风格设定，使它更具备符合项目特点的个性化特征',
      },
      {
        title: '定制提示词',
        icon: 'mdi-text-box',
        description: '编写符合智能体行为逻辑的提示词，指导AI行为',
      },
      {
        title: '参数微调',
        icon: 'mdi-tune',
        description:
          '精细调整AI模型的参数，如温度、Top-K、上下文长度、重复惩罚等模型高级特性，优化智能体表现。',
      },
    ],
    route: '/agent',
    buttonText: '智能体管理',
  },
  {
    title: '4. 启动AI能力',
    description: '启动AI能力，开启智能服务',
    icon: 'mdi-rocket',
    color: 'red',
    branches: [
      {
        title: '空间透镜',
        value: '/space',
        icon: 'mdi-telescope',
      },
      {
        title: '智能推送',
        value: '/sender',
        icon: 'mdi-send',
      },
      {
        title: '代码审查',
        value: '/commits',
        icon: 'mdi-robot-angry',
      },
      {
        title: '分析报告',
        value: '/report',
        icon: 'mdi-microsoft-word',
      },
      {
        title: '深度搜索',
        value: '/search',
        icon: 'mdi-book-search',
      },
    ],
  },
]);

/**
 * 选择指定流程中某个子流程项
 * @param {Object} step - 当前流程项
 * @param {Object} subStep - 选中的子流程项
 */
function selectSubStep(step, subStep) {
  step.selectedSubStep = subStep;
}

/**
 * 使用 vue-router 进行路由跳转
 * @param {String|Object} route - 跳转的路由
 */
function jumpToRoute(route) {
  router.push(route).catch((err) => {
    // 忽略重复导航错误
    if (err.name !== 'NavigationDuplicated') {
      console.error(err);
    }
  });
}

// 组件加载时：为每个带子流程的步骤选择第一个子流程，并等待页面完全加载
onMounted(() => {
  steps.value.forEach((step) => {
    if (step.subSteps && step.subSteps.length) {
      selectSubStep(step, step.subSteps[0]);
    }
  });
  // 判断页面是否已完全加载：
  if (document.readyState === 'complete') {
    loading.value = false;
  } else {
    window.addEventListener('load', () => {
      loading.value = false;
    });
  }
});
</script>

<style scoped>
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

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

/* 时间轴、分支与步进器样式 */
.v-timeline {
  margin-top: 20px;
}

.v-timeline-item {
  margin-bottom: 16px;
}

.branch-option {
  cursor: pointer;
  transition: all 0.3s;
}

.branch-option:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.branch-option.selected {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.1);
}

.branch-options {
  position: relative;
}

.branch-options::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2px;
  height: 20px;
  background-color: rgb(var(--v-theme-warning));
  transform: translate(-50%, -100%);
}

/* Stepper 样式调整 */
.v-stepper {
  box-shadow: none !important;
}

.v-stepper__header {
  box-shadow: none !important;
}

.cursor-pointer {
  cursor: pointer;
}

.v-stepper__item {
  padding: 8px 12px;
}

.v-stepper__item:hover {
  background-color: rgba(var(--v-theme-primary), 0.1);
  border-radius: 4px;
}
</style>
