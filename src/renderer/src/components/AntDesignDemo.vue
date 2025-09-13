<template>
  <div class="ant-design-demo">
    <a-card title="Ant Design Vue 组件演示" style="margin: 20px;">
      <a-space direction="vertical" size="large" style="width: 100%;">
        <!-- 按钮组件 -->
        <a-card size="small" title="按钮组件">
          <a-space>
            <a-button type="primary">主要按钮</a-button>
            <a-button>默认按钮</a-button>
            <a-button type="dashed">虚线按钮</a-button>
            <a-button type="text">文本按钮</a-button>
            <a-button type="link">链接按钮</a-button>
          </a-space>
        </a-card>

        <!-- 输入框组件 -->
        <a-card size="small" title="输入框组件">
          <a-space direction="vertical" style="width: 100%;">
            <a-input v-model:value="inputValue" placeholder="请输入内容" />
            <a-input-search
              v-model:value="searchValue"
              placeholder="搜索内容"
              enter-button="搜索"
              @search="onSearch"
            />
            <a-textarea
              v-model:value="textareaValue"
              placeholder="多行文本输入"
              :rows="4"
            />
          </a-space>
        </a-card>

        <!-- 选择器组件 -->
        <a-card size="small" title="选择器组件">
          <a-space>
            <a-select
              v-model:value="selectValue"
              placeholder="请选择"
              style="width: 200px;"
            >
              <a-select-option value="option1">选项1</a-select-option>
              <a-select-option value="option2">选项2</a-select-option>
              <a-select-option value="option3">选项3</a-select-option>
            </a-select>
            
            <a-date-picker v-model:value="dateValue" placeholder="选择日期" />
          </a-space>
        </a-card>

        <!-- 表格组件 -->
        <a-card size="small" title="表格组件">
          <a-table :columns="columns" :data-source="dataSource" :pagination="false">
            <template #bodyCell="{ column }">
              <template v-if="column.key === 'action'">
                <a-space>
                  <a-button type="link" size="small">编辑</a-button>
                  <a-button type="link" size="small" danger>删除</a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-card>

        <!-- 消息提示 -->
        <a-card size="small" title="消息提示">
          <a-space>
            <a-button @click="showSuccess">成功提示</a-button>
            <a-button @click="showError">错误提示</a-button>
            <a-button @click="showWarning">警告提示</a-button>
            <a-button @click="showInfo">信息提示</a-button>
          </a-space>
        </a-card>
      </a-space>
    </a-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { message } from 'ant-design-vue'

// 响应式数据
const inputValue = ref('')
const searchValue = ref('')
const textareaValue = ref('')
const selectValue = ref(undefined)
const dateValue = ref(null)

// 表格配置
const columns = [
  {
    title: '姓名',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '年龄',
    dataIndex: 'age',
    key: 'age',
  },
  {
    title: '地址',
    dataIndex: 'address',
    key: 'address',
  },
  {
    title: '操作',
    key: 'action',
  },
]

const dataSource = [
  {
    key: '1',
    name: '张三',
    age: 32,
    address: '北京市朝阳区',
  },
  {
    key: '2',
    name: '李四',
    age: 28,
    address: '上海市浦东新区',
  },
  {
    key: '3',
    name: '王五',
    age: 35,
    address: '广州市天河区',
  },
]

// 方法
const onSearch = (value) => {
  console.log('搜索内容:', value)
  message.info(`搜索: ${value}`)
}

const showSuccess = () => {
  message.success('这是一条成功消息')
}

const showError = () => {
  message.error('这是一条错误消息')
}

const showWarning = () => {
  message.warning('这是一条警告消息')
}

const showInfo = () => {
  message.info('这是一条信息消息')
}
</script>

<style scoped>
.ant-design-demo {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}
</style>