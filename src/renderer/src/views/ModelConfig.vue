<template>
  <v-container>
    <v-card class="pa-4" outlined>
<!--      <v-card-title class="headline">模型配置</v-card-title>-->
      <v-card-text>
        <v-form ref="form" v-model="valid">
          <v-expansion-panels v-model="expandedPanels" multiple variant="popout">
            <v-expansion-panel>
              <v-expansion-panel-title id="offline-panel-header">📴 离线智能</v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-row>
                  <v-col
                      v-for="(value, key) in config.ollama"
                      :key="key"
                      cols="12" md="6"
                  >
                    <v-text-field
                        :label="checkOllamaLabel(key)"
                        v-model="config.ollama[key]"
                        outlined
                    ></v-text-field>
                  </v-col>
                </v-row>
                <v-card class="pa-4 mb-4" outlined>
                  <v-card-title class="headline">检测部署状态并自动安装</v-card-title>
                  <v-card-text>
                    <!-- 使用 v-stepper 控制当前步骤 -->
                    <v-stepper v-model="deploymentStep">
                      <!-- 上方区域：步骤条和步骤标题 -->
                      <v-stepper-header>
                        <v-stepper-item
                          value="1"
                          :complete="deploymentStep > 1"
                          editable
                        >
                          <template #title>
                            检查 ollama 状态
                          </template>
                        </v-stepper-item>

                        <v-divider class="mx-2"></v-divider>

                        <v-stepper-item
                          value="2"
                          :complete="deploymentStep > 2"
                          editable
                        >
                          <template #title>
                            检查模型部署
                          </template>
                        </v-stepper-item>

                        <v-divider class="mx-2"></v-divider>

                        <v-stepper-item value="3" editable>
                          <template #title>
                            自动部署
                          </template>
                        </v-stepper-item>
                      </v-stepper-header>

                      <!-- 下方区域：步骤内容和操作按钮 -->
                      <v-container>
                        <!-- 步骤 1 内容 -->
                        <div v-if="deploymentStep === 1">
                          <div v-if="ollamaInstalled === null">
                            正在检测 ollama 状态...
                          </div>
                          <div v-else-if="ollamaInstalled">
                            ollama 已安装且正在运行。
                          </div>
                          <div v-else>
                            ollama 未安装。请点击下面按钮进入官网下载安装。
                          </div>
                          <v-btn
                            v-if="ollamaInstalled || ollamaInstalled === null"
                            color="primary"
                            class="mt-2"
                            @click="nextStep"
                          >
                            下一步
                          </v-btn>
                          <v-btn
                            v-else
                            color="error"
                            class="mt-2"
                            @click="openOllamaWebsite"
                          >
                            前往 ollama 官网
                          </v-btn>
                        </div>

                      <!-- 步骤 2 内容 -->
                        <div v-if="deploymentStep === 2">
                          <div v-if="modelsDeployed === null">
                            检查所需模型部署情况
                          </div>
                          <div v-else-if="modelsDeployed">
                            所需模型已全部部署。
                          </div>
                          <div v-else>
                            检测到部分模型未部署，请点击“开始部署”自动安装。<span>{{ modelsNotExits }}</span>
                          </div>
                          <v-btn
                            v-if="modelsDeployed"
                            color="success"
                            class="mt-2"
                            @click="nextStep"
                          >
                            完成
                          </v-btn>
                          <v-btn
                            v-else
                            color="primary"
                            class="mt-2"
                            @click="startDeployment"
                          >
                            开始部署
                          </v-btn>
                        </div>

                      <!-- 步骤 3 内容 -->
                        <div v-if="deploymentStep === 3">
                          <div v-if="deploymentInProgress">
                            <div>正在部署模型：{{ currentDeployingModel }}</div>
                            <v-progress-linear
                              :value="deploymentProgress"
                              height="20"
                              striped
                              class="mt-2"
                            ></v-progress-linear>
                          </div>
                          <div v-else>
                            已部署完成。
                          </div>
                        </div>
                      </v-container>
                    </v-stepper>
                  </v-card-text>
                </v-card>

              </v-expansion-panel-text>
            </v-expansion-panel>
            <v-expansion-panel>
              <v-expansion-panel-title id="cloud-panel-header">☁️ 云端智能</v-expansion-panel-title>
              <v-expansion-panel-text>
                <div v-for="(modelConfig, modelKey) in config.custom" :key="modelKey">
                  <v-card flat class="mb-4 pa-2">
                    <v-card-title class="subtitle-1">{{ checkCustomLabel(modelKey) }}</v-card-title>
                    <v-card-text>
                      <v-row>
                        <v-col
                            v-for="(value, key) in modelConfig"
                            :key="key"
                            cols="12" md="6"
                        >
                          <v-text-field
                              :label="checkCustomLabel(key)"
                              v-model="config.custom[modelKey][key]"
                              outlined
                          ></v-text-field>
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="saveModelConfig">保存模型配置</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script>
import { getConfig, updateConfig } from '../service/api.js'
export default {
  name: 'ModelConfig',
  data() {
    return {
      // 离线部署相关数据
      deploymentStep: 1,         // 当前步骤：1-检查ollama；2-检查模型部署；3-自动部署
      ollamaInstalled: null,     // null:未检测，true/false
      modelsDeployed: null,      // null:未检测，true/false
      deploymentInProgress: false,
      deploymentProgress: 0,
      currentDeployingModel: '',
      modelsNotExits: [],
      valid: true,
      config: {
        custom: {},
        ollama: {}
      },
      expandedPanels: [],
      offlineStatus: {
        checking: false,
        downloading: false,
        progress: 0,
        message: ''
      },
      ollamaLabels: {
        coder: {
          label: "代码专家模型",
          isModel: true,
        },
        chatter: {
          label: "话术专家模型",
          isModel: true,
        },
        officer: {
          label: "总结官模型",
          isModel: true,
        },
        max_prompts: {
          label: "最大提示词数",
          isModel: false,
        },
      },
      customLabels: {
        coder: {
          label: "代码专家模型",
          isModel: true,
        },
        chatter: {
          label: "话术专家模型",
          isModel: true,
        },
        officer: {
          label: "总结官模型",
          isModel: true,
        },
        max_prompts: {
          label: "最大提示词数",
          isModel: false,
        },
        type: {
          label: "模型厂商",
          isModel: false,
        },
        enabled: {
          label: "是否启用(关闭则默认使用本地模型)",
          isModel: false,
        },
        url: {
          label: "地址",
          isModel: false,
        },
        api: {
          label: "ApiKey",
          isModel: false,
        },
        model: {
          label: "模型",
          isModel: false,
        },
      },
    }
  },
  mounted() {
    getConfig()
        .then(response => {
          this.config = response.data;
          this.checkOllama();
          this.handleHashNavigation();
        })
        .catch(error => {
          console.error('获取配置失败：', error);
        });
  },
  methods: {
    checkOllamaLabel(key) {
      try {
        return this.ollamaLabels[key].label;
      } catch (e) {
        console.log(e);
        return key;
      }
    },
    checkCustomLabel(key) {
      try {
        return this.customLabels[key].label;
      } catch (e) {
        return key;
      }
    },
    // 新增非线性动画方法，duration 默认2000ms
    animateProgress(duration = 2000) {
      return new Promise(resolve => {
        this.deploymentProgress = 0;
        this.deploymentInProgress = true;
        const startTime = performance.now();
        const animate = (currentTime) => {
          let elapsed = currentTime - startTime;
          let t = Math.min(elapsed / duration, 1);
          // easeOutQuad 动画公式
          let progress = 100 * (1 - Math.pow(1 - t, 2));
          this.deploymentProgress = Math.floor(progress);
          if (t < 1) {
            requestAnimationFrame(animate);
          } else {
            this.deploymentInProgress = false;
            resolve();
          }
        };
        requestAnimationFrame(animate);
      });
    },
    // 下一步：当步骤为1时进入步骤2并检测模型部署；当步骤为2且所有模型已部署时跳转至步骤3
    nextStep() {
      if (this.deploymentStep === 1) {
        this.deploymentStep = 2;
        this.checkModelsDeployment();
      } else if (this.deploymentStep === 2 && this.modelsDeployed) {
        this.animateProgress(2000).then(() => {
          this.deploymentStep = 3;
          this.offlineStatus.message = '离线智能部署已完成。';
        });
      }
    },
    // 检测模型部署情况
    async checkModelsDeployment() {
      let modelsList = [];
      if (this.config.ollama) {
        console.log('this.config.ollama', JSON.stringify(this.config.ollama));
        for (let key in this.ollamaLabels) {
          if (this.ollamaLabels[key].isModel && this.config.ollama[key]) {
            modelsList.push(this.config.ollama[key]);
          }
        }
      }
      await window.electron.checkModelDeployment(modelsList).then(result => {
        this.modelsDeployed = result;
        if (result) {
          this.offlineStatus.message = '所有模型均已部署。';
        } else {
          this.modelsNotExits = modelsList;
        }
      }).catch(error => {
        console.error('检查模型部署状态失败：', error);
        this.modelsDeployed = false;
      });
    },
    // 开始部署：调用IPC接口安装模型，并自动跳转到步骤3
    async startDeployment() {
      this.deploymentStep = 3;
      let modelsList = [];
      if (this.config.ollama) {
        console.log('this.config.ollama', JSON.stringify(this.config.ollama));
        for (let key in this.ollamaLabels) {
          if (this.ollamaLabels[key].isModel && this.config.ollama[key]) {
            modelsList.push(this.config.ollama[key]);
          }
        }
      }
      console.log("modelsList for deployment:", modelsList);
      this.deploymentInProgress = true;
      // 监听安装进度事件
      await window.electron.onInstallProgress((data) => {
        console.log("Install progress event:", data);
        this.deploymentProgress = data.progress;
        this.currentDeployingModel = data.model;
      });
      // 调用安装模型的IPC方法
      await window.electron.installModels(modelsList).then(() => {
        console.log("install-models resolved");
        this.animateProgress(2000).then(async () => {
          this.deploymentInProgress = false;
          this.deploymentStep = 3;
          this.offlineStatus.message = '离线智能部署已完成。';
          await window.electron.clearInstallProgressListeners();
          console.log("Deployment complete, step set to 3");
        });
      }).catch(error => {
        console.error('安装模型失败：', error);
        this.deploymentInProgress = false;
      });
    },
    fetchConfig() {
      getConfig()
          .then(response => {
            this.config = response.data;
          })
          .catch(error => {
            console.error('获取配置失败：', error);
          });
    },
    saveModelConfig() {
      updateConfig(this.config)
          .then(() => {
            alert('模型配置已保存！');
          })
          .catch(error => {
            console.error('保存模型配置失败：', error);
          });
    },
    checkOllama() {
      window.electron.checkOllamaIPC().then(result => {
        this.ollamaInstalled = result;
      }).catch(error => {
        console.error('检查ollama状态失败：', error);
        this.ollamaInstalled = false;
      });
    },
    openOllamaWebsite() {
      window.open('https://ollama.com', '_blank');
    },
    handleHashNavigation() {
      const hash = window.location.hash.slice(1).toLowerCase();
      if (hash.includes('离线') || hash.includes('offline')) {
        this.expandedPanels = [0];
        this.$nextTick(() => {
          const el = document.getElementById('offline-panel-header');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        });
      } else if (hash.includes('云端') || hash.includes('cloud')) {
        this.expandedPanels = [1];
        this.$nextTick(() => {
          const el = document.getElementById('cloud-panel-header');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        });
      }
    },
  }
}
</script>

<style scoped>
/* 可根据需要自定义样式 */
</style>
