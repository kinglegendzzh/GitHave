<template>
  <v-container fluid>
    <v-layout row wrap>
      <!-- 模型配置卡片 -->
      <v-flex xs12 sm8 md6 offset-sm2 offset-md3>
        <v-card>
          <v-card-title>
            <span class="headline">模型卡片配置</span>
          </v-card-title>
          <v-card-text>
            <v-form ref="form" v-model="valid">
              <v-text-field
                  label="模型类型"
                  v-model="model.type"
                  :rules="[v => !!v || '必填']"
                  hint="输入：ollama 或 openai"
                  required
              ></v-text-field>

              <v-text-field
                  label="API Key"
                  v-model="model.apiKey"
                  :rules="[v => !!v || '必填']"
                  required
              ></v-text-field>

              <v-text-field
                  label="Base URL"
                  v-model="model.baseURL"
                  :rules="[v => !!v || '必填']"
                  required
              ></v-text-field>

              <!-- Options 参数部分 -->
              <v-subheader>Options 配置</v-subheader>
              <v-layout row wrap>
                <v-flex xs12 sm6>
                  <v-text-field
                      label="Temperature"
                      v-model.number="model.options.temperature"
                      type="number"
                  ></v-text-field>
                </v-flex>
                <v-flex xs12 sm6>
                  <v-text-field
                      label="TopP"
                      v-model.number="model.options.topP"
                      type="number"
                  ></v-text-field>
                </v-flex>
                <v-flex xs12 sm6>
                  <v-text-field
                      label="TopK"
                      v-model.number="model.options.topK"
                      type="number"
                  ></v-text-field>
                </v-flex>
                <v-flex xs12 sm6>
                  <v-text-field
                      label="Seed"
                      v-model.number="model.options.seed"
                      type="number"
                  ></v-text-field>
                </v-flex>
                <v-flex xs12 sm6>
                  <v-text-field
                      label="NumPredict"
                      v-model.number="model.options.numPredict"
                      type="number"
                  ></v-text-field>
                </v-flex>
                <v-flex xs12 sm6>
                  <v-text-field
                      label="Stop"
                      v-model="model.options.stop"
                  ></v-text-field>
                </v-flex>
                <v-flex xs12 sm6>
                  <v-text-field
                      label="RepeatPenalty"
                      v-model.number="model.options.repeatPenalty"
                      type="number"
                  ></v-text-field>
                </v-flex>
                <v-flex xs12 sm6>
                  <v-text-field
                      label="NumKeep"
                      v-model.number="model.options.numKeep"
                      type="number"
                  ></v-text-field>
                </v-flex>
                <v-flex xs12 sm6>
                  <v-text-field
                      label="NumCtx"
                      v-model.number="model.options.numCtx"
                      type="number"
                  ></v-text-field>
                </v-flex>
                <v-flex xs12 sm6>
                  <v-text-field
                      label="NumBatch"
                      v-model.number="model.options.numBatch"
                      type="number"
                  ></v-text-field>
                </v-flex>
                <v-flex xs12 sm6>
                  <v-text-field
                      label="NumGPU"
                      v-model.number="model.options.numGPU"
                      type="number"
                  ></v-text-field>
                </v-flex>
                <v-flex xs12 sm6>
                  <v-text-field
                      label="MainGPU"
                      v-model.number="model.options.mainGPU"
                      type="number"
                  ></v-text-field>
                </v-flex>
                <v-flex xs12 sm6>
                  <v-switch
                      label="LowVRAM"
                      v-model="model.options.lowVRAM"
                  ></v-switch>
                </v-flex>
                <v-flex xs12 sm6>
                  <v-switch
                      label="UseMMap"
                      v-model="model.options.useMMap"
                  ></v-switch>
                </v-flex>
                <v-flex xs12 sm6>
                  <v-text-field
                      label="NumThread"
                      v-model.number="model.options.numThread"
                      type="number"
                  ></v-text-field>
                </v-flex>
              </v-layout>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" :disabled="!valid" @click="submit">
              保存配置
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
export default {
  name: "ModelCardConfig",
  data() {
    return {
      valid: false,
      model: {
        type: "",
        apiKey: "",
        baseURL: "",
        options: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          seed: 42,
          numPredict: 128,
          stop: "",
          repeatPenalty: 1.0,
          numKeep: 0,
          numCtx: 512,
          numBatch: 8,
          numGPU: 1,
          mainGPU: 0,
          lowVRAM: false,
          useMMap: false,
          numThread: 4,
        },
      },
    };
  },
  methods: {
    submit() {
      if (this.$refs.form.validate()) {
        // 提交逻辑，例如调用API接口保存配置
        console.log("提交模型配置：", this.model);
        // 可以在这里发起 axios 请求
      }
    },
  },
};
</script>

<style scoped>
/* 根据需要添加自定义样式 */
</style>
