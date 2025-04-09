<template>
  <v-container>
    <v-toolbar color="primary" dark>
      <v-spacer></v-spacer>
      <v-btn color="secondary" @click="fetchData">刷新数据</v-btn>
    </v-toolbar>
    <v-card class="mt-4">
      <v-card-title>系统数据</v-card-title>
      <v-card-text>
        <div v-if="data">
          <p><strong>Status:</strong> {{ data.status }}</p>
          <p><strong>Message:</strong> {{ data.message }}</p>
          <p><strong>Items:</strong>
            <span v-for="item in data.data.items" :key="item">{{ item }} </span>
          </p>
        </div>
        <div v-else>
          <p>暂无数据</p>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
import { fetchData } from '../service/api'

export default {
  name: 'SystemConfig',
  data() {
    return {
      data: null
    }
  },
  created() {
    this.fetchData()
  },
  methods: {
    fetchData() {
      fetchData()
          .then(response => {
            this.data = response.data
          })
          .catch(err => {
            console.error('获取系统数据错误:', err)
          })
    }
  }
}
</script>

<style scoped>
/* 根据需要调整样式 */
</style>
