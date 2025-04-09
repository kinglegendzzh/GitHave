<template>
  <v-container fluid>
      <!-- 顶部工具栏 -->
      <v-toolbar outlined>
        <v-toolbar-title>
          <v-icon>mdi-github</v-icon>
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-tooltip bottom text="刷新卡片列表">
          <template v-slot:activator="{ on, attrs }">
            <v-btn v-bind="attrs" v-on="on" @click="fetchRepos" class="mr-2" outlined plain>
              <v-icon>mdi-refresh</v-icon>
            </v-btn>
          </template>
          <span>刷新卡片列表</span>
        </v-tooltip>
        <v-tooltip bottom text="新增仓库ID卡">
          <template v-slot:activator="{ on, attrs }">
            <v-btn v-bind="attrs" v-on="on" @click="openNewRepoDialog" class="mr-2" outlined plain>
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </template>
          <span>新增仓库ID卡</span>
        </v-tooltip>
      </v-toolbar>

      <!-- 卡片式仓库列表 -->
      <v-row class="mt-4 mr-4" justify="center">
        <v-col cols="6" v-for="repo in repos" :key="repo.id">
          <v-card class="id-card" elevation="2">
            <div class="id-card-header">
              <span class="id-card-title">代码仓库身份证</span>
              <span class="id-card-subtitle">CODE REPOSITORY ID CARD</span>
            </div>
            <div class="id-card-content">
              <div class="id-card-left">
                <div class="avatar-icon" v-html="getAvatarIcon(repo.id)"></div>
                <div class="repo-name">{{ repo.name }}</div>
              </div>
              <div class="id-card-right">
                <div class="info-item">
                  <span class="label">仓库地址 / URL</span>
                  <span class="value">{{ repo.repo_url }}</span>
                </div>
                <div class="info-item">
                  <span class="label">分支 / Branch</span>
                  <span class="value">{{ repo.branch }}</span>
                </div>
                <div class="info-item">
                  <span class="label">本地路径 / Local Path</span>
                  <span class="value">{{ repo.local_path }}</span>
                </div>
              </div>
            </div>
            <div class="id-card-footer">
              <div class="id-number">仓库ID: {{ repo.id }}</div>
              <div class="action-buttons">
                <v-tooltip text="仓库详情">
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" small class="detail-btn mr-2" color="primary" @click="viewRepo(repo)">
                      <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                  </template>
                </v-tooltip>
                <v-tooltip text="预览仓库内容">
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" small class="preview-btn mr-2" color="warning" @click="previewRepo(repo)">
                      <v-icon>mdi-eye</v-icon>
                    </v-btn>
                  </template>
                </v-tooltip>
                <v-tooltip text="删除仓库">
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" small class="delete-btn mr-2" color="error" @click="deleteRepo(repo)">
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </template>
                </v-tooltip>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- 弹出对话框：用于新增或编辑仓库 -->
      <v-dialog v-model="dialog" max-width="400" scrollable persistent>
        <v-card>
          <v-card-title>
            <span class="headline">{{ selectedRepo ? '编辑ID卡' : '新增仓库ID卡' }}</span>
          </v-card-title>
          <v-card-text>
            <v-form ref="form" v-model="formValid">
              <v-text-field label="名称" v-model="repoForm.name" required :disabled="selectedRepo != null"></v-text-field>
              <v-text-field label="仓库 URL" v-model="repoForm.repo_url" required :disabled="selectedRepo != null"></v-text-field>
              <v-text-field label="分支" v-model="repoForm.branch" required></v-text-field>
              <v-text-field label="本地路径" v-model="repoForm.local_path" required :disabled="selectedRepo != null" readonly @click.native="handleLocalPathClick"></v-text-field>
              <v-text-field label="用户名" v-model="repoForm.username"></v-text-field>
              <v-text-field label="密码" v-model="repoForm.password" type="password"></v-text-field>
              <v-textarea label="描述" v-model="repoForm.desc"></v-textarea>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-tooltip text="取消">
              <template v-slot:activator="{ props }">
                <v-btn v-bind="props" text @click="closeDialog">
                  <v-icon>mdi-close</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
            <v-tooltip text="保存">
              <template v-slot:activator="{ props }">
                <v-btn v-bind="props" text @click="saveRepo" :disabled="!selectedRepo && (!repoForm.local_path || !localFolderValid)">
                  <v-icon>mdi-content-save</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
          </v-card-actions>
        </v-card>
      </v-dialog>
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import { listRepos, getRepo, createRepo, updateRepo, deleteRepo } from '../service/api'
import { generateAvatar } from '../components/AvatarGenerator'

export default {
  name: 'CodeRepoManagement',
  data() {
    return {
      repos: [],
      dialog: false,
      formValid: false,
      selectedRepo: null,
      localFolderValid: true,

      repoForm: {
        name: '',
        repo_url: '',
        branch: '',
        local_path: '',
        username: '',
        password: '',
        desc: ''
      },
      headers: [
        { text: 'ID', value: 'id' },
        { text: '名称', value: 'name' },
        { text: '仓库 URL', value: 'repo_url' },
        { text: '分支', value: 'branch' },
        { text: '本地路径', value: 'local_path' },
        { text: '操作', value: 'actions', sortable: false }
      ]
    }
  },
  watch: {
  },
  computed: {
    snackbar() {
      return this.$store.state.snackbar;
    },
  },
  created() {
    this.fetchRepos()
  },
  methods: {
    previewRepo(item) {
      const localPath = item.local_path;
      const forceReplace = true;
      if (localPath) {
        this.$router.push({         // 使用路由名称和参数
          name: 'finder',           // 对应路由名称
          params: { localPath, forceReplace }     // 传递参数
        });
      } else {
        alert('该仓库未配置本地路径');
      }
    },
    fetchRepos() {
      console.log('fetchRepos')
      listRepos()
          .then(response => {
            this.repos = response.data
          })
          .catch(err => {
            console.error('获取仓库列表错误:', err)
          })
    },
    openNewRepoDialog() {
      this.selectedRepo = null
      this.repoForm = {
        name: '',
        repo_url: '',
        branch: '',
        local_path: '',
        username: '',
        password: '',
        desc: ''
      }
      this.dialog = true
    },
    viewRepo(item) {
      getRepo(item.id)
          .then(response => {
            this.selectedRepo = response.data
            this.repoForm = {
              name: response.data.name,
              repo_url: response.data.repo_url,
              branch: response.data.branch,
              local_path: response.data.local_path,
              username: response.data.username,
              password: response.data.password,
              desc: response.data.desc
            }
            this.dialog = true
          })
          .catch(err => {
            console.error('获取仓库详情错误:', err)
          })
    },
    saveRepo() {
      if (this.selectedRepo) {
        // 更新操作，仅更新 branch 和 LocalPath（与后端实现对应）
        updateRepo(this.selectedRepo.id, {
          repo_url: this.repoForm.repo_url,
          branch: this.repoForm.branch,
          local_path: this.repoForm.local_path,
          username: this.repoForm.username,
          password: this.repoForm.password,
          name: this.repoForm.name,
          desc: this.repoForm.desc,
        })
            .then(() => {
              this.dialog = false
              this.fetchRepos()
            })
            .catch(err => {
              console.error('更新仓库错误:', err)
            })
      } else {
        // 创建操作，发送完整数据
        createRepo({
          repo_url: this.repoForm.repo_url,
          branch: this.repoForm.branch,
          local_path: this.repoForm.local_path,
          username: this.repoForm.username,
          password: this.repoForm.password,
          name: this.repoForm.name,
          desc: this.repoForm.desc
        })
            .then(() => {
              this.dialog = false
              this.fetchRepos()
            })
            .catch(err => {
              console.error('新增仓库错误:', err)
            })
      }
    },
    deleteRepo(item) {
      if (confirm(`确定删除仓库 ${item.name}?`)) {
        deleteRepo(item.id)
            .then(() => {
              this.fetchRepos()
            })
            .catch(err => {
              console.error('删除仓库错误:', err)
            })
      }
    },
    closeDialog() {
      this.dialog = false
    },
    getAvatarIcon(repoId) {
      return generateAvatar(repoId);
    },
    handleLocalPathClick() {
      if (this.selectedRepo != null) {
        console.log('rerere')
        return;
      }
      if (!this.repoForm.name || !this.repoForm.repo_url) {
        alert('请先填写名称和仓库 URL');
        return;
      }
      console.log('Local Path Clicked');
      const electron = window.require ? window.require('electron') : null;
      if (!electron) {
        console.error('Electron module not found.');
        return;
      }
      electron.remote.dialog.showOpenDialog({
        properties: ['openDirectory']
      }).then(result => {
        if (!result.canceled && result.filePaths.length > 0) {
          const selectedPath = result.filePaths[0];
          const fs = window.require('fs');
          const path = window.require('path');
            // 拼接仓库名称作为子文件夹路径
            const newFolderPath = path.join(selectedPath, this.repoForm.name);
            if (!fs.existsSync(newFolderPath)) {
              fs.mkdirSync(newFolderPath);
              this.$store.dispatch('snackbar/showSnackbar', {
                message: "已自动创建" + newFolderPath + "文件夹",
                type: 'info'
              });
            }
            this.repoForm.local_path = newFolderPath;
            this.localFolderValid = true;
        }
      }).catch(err => {
        console.error(err);
      });
    }
  }
}
</script>

<style scoped>
/* 身份证卡片样式 */
.id-card {
  width: 600px;
  height: 360px;
  margin: 10px;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7eb 100%);
  position: relative;
  border-radius: 10px;
  overflow: hidden;
}

.id-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%239C92AC' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E") repeat;
  opacity: 0.3;
  z-index: 0;
}

.id-card-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

.id-card-title {
  font-size: 24px;
  font-weight: bold;
  color: #1a237e;
  margin-bottom: 5px;
}

.id-card-subtitle {
  font-size: 14px;
  color: #5c6bc0;
}

.id-card-content {
  display: flex;
  position: relative;
  z-index: 1;
}

.id-card-left {
  flex: 0 0 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-right: 20px;
  border-right: 2px solid rgba(0, 0, 0, 0.1);
}

.avatar-icon {
  color: #1a237e;
  margin-bottom: 15px;
}

.repo-name {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  color: #1a237e;
  word-break: break-word;
}

.id-card-right {
  flex: 1;
  padding-left: 20px;
}

.info-item {
  margin-bottom: 15px;
}

.label {
  display: block;
  font-size: 12px;
  color: #5c6bc0;
  margin-bottom: 3px;
}

.value {
  display: block;
  font-size: 14px;
  color: #1a237e;
  word-break: break-word;
}

.id-card-footer {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1;
}

.id-number {
  font-family: 'Courier New', monospace;
  font-size: 16px;
  color: #1a237e;
  letter-spacing: 1px;
}

.action-buttons {
  display: flex;
  gap: 5px;
}

/* 设置容器垂直滚动 */
.v-container {
  padding: 0;
  height: calc(100vh - 150px);
  overflow-y: auto;
}

/* 确保卡片居中排列 */
.v-row {
  justify-content: center;
}
</style>
