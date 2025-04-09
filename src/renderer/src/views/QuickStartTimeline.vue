<template>
  <v-container>
    <v-app>
      <v-timeline dense>
        <template v-for="(step, index) in steps" :key="index">
          <v-timeline-item
              :color="step.color"
              :icon="step.icon"
          >
            <v-card flat class="pa-2">
              <v-card-title class="headline">{{ step.title }}</v-card-title>
              <v-card-text v-if="step.description">
                {{ step.description }}
              </v-card-text>

              <!-- 子流程项展示 -->
              <template v-if="step.subSteps && step.subSteps.length > 0">
                <div style="min-width: 900px;max-width: 900px">
                  <v-divider class="my-3"></v-divider>
                  <v-stepper v-model="step.currentStep" class="elevation-0">
                    <v-stepper-header class="elevation-0">
                      <template v-for="(subStep, subIndex) in step.subSteps" :key="subIndex">
                        <v-stepper-step
                            :step="subIndex + 1"
                            :complete="step.currentStep > subIndex + 1"
                            @click="selectSubStep(step, subStep)"
                            class="cursor-pointer"
                            editable
                        >
                          <v-icon small class="mr-1">{{ subStep.icon || 'mdi-checkbox-blank-circle-outline' }}</v-icon>
                          {{ subStep.title }}
                        </v-stepper-step>
                        <v-divider
                            v-if="subIndex < step.subSteps.length - 1"
                            :key="'divider-' + subIndex"
                        ></v-divider>
                      </template>
                    </v-stepper-header>
                  </v-stepper>
                  <!-- 子步骤描述展示区域 -->
                  <v-card-text v-if="step.selectedSubStep && step.selectedSubStep.description" class="mt-3 grey lighten-4 rounded">
                    {{ step.selectedSubStep.description }}
                  </v-card-text>
                </div>
              </template>

              <!-- 分支选择部分 -->
              <template v-if="step.branches && step.branches.length > 0">
                <div style="min-width: 900px;max-width: 900px">
                  <v-divider class="my-3"></v-divider>
                  <v-row class="branch-options">
                    <v-col v-for="(branch, branchIndex) in step.branches"
                           :key="branchIndex"
                           :cols="12 / step.branches.length">
                      <v-card
                          outlined
                          class="branch-option"
                          :class="{ 'selected': selectedBranch === branch.value }"
                          @click="selectBranch(branch.value)"
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
            </v-card>
          </v-timeline-item>
        </template>
      </v-timeline>
    </v-app>
  </v-container>
</template>

<script>
export default {
  name: 'QuickStartTimeline',
  mounted() {
    // 初始化时为每个带有子流程的步骤选中第一个子步骤
    this.steps.forEach(step => {
      if (step.subSteps && step.subSteps.length > 0) {
        this.selectSubStep(step, step.subSteps[0]);
      }
    });
  },
  methods: {
    selectBranch(branch) {
      this.selectedBranch = branch;
    },
    selectSubStep(step, subStep) {
      step.selectedSubStep = subStep;
    }
  },
  data() {
    return {
      selectedBranch: null,
      steps: [
        {
          title: 'GitGo，是一个集AI大模型与多智能体协同编排的智能化代码助理软件',
          description: '下面我们来进行快速使用流程👇',
          icon: 'mdi-play',
          color: 'primary',
          currentStep: 1
        },
        {
          title: '1. 代码仓库初始化',
          description: '从任何公网的GitHub、Gitee，或公司内网的GitLab，将代码仓库导入到这里',
          icon: 'mdi-source-repository',
          color: 'success',
          currentStep: 1,
          selectedSubStep: 1,
          subSteps: [
            {
              title: '创建仓库身份证',
              icon: 'mdi-card-account-details',
              description: '为你的代码仓库创建唯一身份标识，便于后续管理和追踪'
            },
            {
              title: '生成数据记忆卡',
              icon: 'mdi-memory',
              description: '基于仓库内容生成数据记忆卡，构建智能索引，提升AI理解和分析能力'
            }
          ]
        },
        {
          title: '2. 配置大模型',
          description: '配置所需的模型参数',
          icon: 'mdi-cog',
          color: 'info',
          branches: [
            { title: '离线智能', value: 'local', icon: 'mdi-laptop' },
            { title: '云端智能', value: 'cloud', icon: 'mdi-cloud' }
          ]
        },
        {
          title: '3. 配置智能体',
          description: '配置你的智能体参数',
          icon: 'mdi-robot',
          color: 'purple',
          currentStep: 1,
          selectedSubStep: 1,
          subSteps: [
            {
              title: '配置角色',
              icon: 'mdi-text-box',
              description: '选择AI角色，定义其行为和目标'
            },
            {
              title: '生成提示词',
              icon: 'mdi-text-box',
              description: '根据项目特点生成个性化的提示词，指导AI行为'
            },
            {
              title: '参数微调',
              icon: 'mdi-tune',
              description: '精细调整AI模型参数，优化智能体表现'
            }
          ]
        },
        {
          title: '4. 启动AI能力',
          description: '启动AI能力，开启智能服务',
          icon: 'mdi-rocket',
          color: 'red',
          branches: [
            { title: '空间透镜', value: '/space', icon: 'mdi-telescope' },
            { title: '深度搜索', value: '/search', icon: 'mdi-book-search' },
            { title: '分析报告', value: '/report', icon:'mdi-microsoft-word' },
            { title: '代码审查', value: '/commits', icon:'mdi-robot-angry' },
          ]
        }
      ]
    }
  }
}
</script>

<style scoped>
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
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.branch-option.selected {
  border-color: var(--v-primary-base);
  background-color: var(--v-primary-lighten5);
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
  background-color: var(--v-warning-base);
  transform: translate(-50%, -100%);
}

/* Stepper样式调整 */
.v-stepper {
  box-shadow: none !important;
}
.v-stepper__header {
  box-shadow: none !important;
}
.cursor-pointer {
  cursor: pointer;
}
.v-stepper__step {
  padding: 8px 12px;
}
.v-stepper__step:hover {
  background-color: var(--v-primary-lighten5);
  border-radius: 4px;
}
</style>
