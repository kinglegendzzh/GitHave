<template>
  <v-container fluid class="memory-flash-container">
    <!-- 顶部导航栏 -->
    <v-row align="center" justify="space-between" class="header">
      <v-col cols="auto">
        <v-btn icon @click="goBack">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
      </v-col>
      <v-col>
        <h1 class="text-h5">记忆闪存管理</h1>
      </v-col>
    </v-row>

    <!-- 主要内容区 -->
    <v-row>
      <!-- 操作按钮 -->
      <v-col cols="12" class="action-buttons">
        <v-btn color="secondary" @click="importMemoryFlash">导入记忆闪存</v-btn>
      </v-col>

      <!-- 显示记忆闪存的表格 -->
      <v-col cols="12">
        <v-data-table
          :headers="headers"
          :items="repositories"
          item-key="id"
          class="elevation-1"
          :loading="loading"
          loading-text="加载中..."
        >
          <template #[`item.hasMemoryFlash`]="{ item }">
            <v-icon v-if="item.hasMemoryFlash" color="success">mdi-check</v-icon>
            <v-icon v-else color="error">mdi-close</v-icon>
          </template>

          <template #[`item.indexProgress`]="{ item }">
            <div class="d-flex align-center">
              <v-progress-linear
                :value="item.indexProgress"
                height="8"
                rounded
                striped
                class="flex-grow-1 mr-2"
              />
              <span>{{ item.scannedCount }}/{{ item.functionsTotal }}</span>
            </div>
          </template>

          <template #[`item.actions`]="{ item }">
            <v-btn icon @click="updateMemoryFlash(item)" :disabled="!item.hasMemoryFlash">
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
            <v-btn icon @click="deleteMemoryFlash(item)" :disabled="!item.hasMemoryFlash">
              <v-icon>mdi-delete</v-icon>
            </v-btn>
            <v-btn icon @click="resetMemoryFlash(item)" :disabled="!item.hasMemoryFlash">
              <v-icon>mdi-refresh</v-icon>
            </v-btn>
            <v-btn icon @click="exportMemoryFlash(item)" :disabled="!item.hasMemoryFlash">
              <v-icon>mdi-export</v-icon>
            </v-btn>
            <v-btn icon @click="buildMemoryFlash(item)" v-if="!item.hasMemoryFlash">
              <v-icon>mdi-memory</v-icon>
            </v-btn>
          </template>
        </v-data-table>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { VDataTable } from 'vuetify/components';
import { listRepos, listFunctions } from "../service/api.js";

// 定义 Repository 类型
interface Repository {
  id: number;
  repo_url: string;
  branch: string;
  local_path: string;
  created_at: string;
  username: string;
  password: string;
  name: string;
  desc: string;
  hasMemoryFlash: boolean;
  functionsTotal: number;
  scannedCount: number;
  indexProgress: number; // 百分比
}

// 定义表头
const headers = [
  { text: '仓库名称', align: 'start', key: 'name' },
  { text: '描述', align: 'start', key: 'desc' },
  { text: '已构建闪存', align: 'center', key: 'hasMemoryFlash' },
  { text: '索引进度', align: 'center', key: 'indexProgress', sortable: false },
  { text: '操作', align: 'center', key: 'actions', sortable: false },
] as { text: string; align: string; key: string; sortable?: boolean }[];

const repositories = ref<Repository[]>([]);
const loading = ref(true);

// 获取仓库列表
const fetchRepositories = async () => {
  try {
    loading.value = true;
    const response = await listRepos();
    const repos = response.data;

    repositories.value = [];
    for (const repo of repos) {
      const hasMemoryFlash = await checkMemoryFlashStatus(repo.id);

      // 修复：先检查 fnRes.data 的类型
      const fnRes = await listFunctions(repo.local_path);
      let functionsList: any[] = [];
      if (Array.isArray(fnRes.data)) {
        functionsList = fnRes.data;
      } else if (fnRes.data && Array.isArray((fnRes.data as any).functions)) {
        functionsList = (fnRes.data as any).functions;
      } else {
        console.warn('Unexpected functions response format:', fnRes.data);
      }

      const total = functionsList.length;
      const scanned = functionsList.filter((f: any) => f.scan).length;
      const progress = total > 0 ? Math.floor((scanned / total) * 100) : 0;

      repositories.value.push({
        ...repo,
        hasMemoryFlash,
        functionsTotal: total,
        scannedCount: scanned,
        indexProgress: progress,
      });
    }
  } catch (error) {
    console.error('获取仓库列表失败:', error);
  } finally {
    loading.value = false;
  }
};


// 检查仓库是否已构建记忆闪存
const checkMemoryFlashStatus = async (repoId: number): Promise<boolean> => {
  try {
    // 调用 electronIPC 接口检查记忆闪存状态
    const result = await window.electron.invoke('check-memory-flash', { repoId });
    return result.exists;
  } catch (error) {
    console.error(`检查仓库 ${repoId} 记忆闪存状态失败:`, error);
    return false;
  }
};

// 构建记忆闪存
const buildMemoryFlash = async (repo: Repository) => {
  try {
    loading.value = true;
    await window.electron.ipcRenderer.invoke('build-memory-flash', { repoId: repo.id });
    // 更新状态
    const index = repositories.value.findIndex(r => r.id === repo.id);
    if (index !== -1) {
      repositories.value[index].hasMemoryFlash = true;
    }
  } catch (error) {
    console.error(`构建记忆闪存失败:`, error);
  } finally {
    loading.value = false;
  }
};

// 方法
const importMemoryFlash = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('import-memory-flash');
    if (result.success) {
      // 刷新列表
      repositories.value = [];
      await fetchRepositories();
    }
  } catch (error) {
    console.error('导入记忆闪存失败:', error);
  }
};

const updateMemoryFlash = async (repo: Repository) => {
  try {
    loading.value = true;
    await window.electron.ipcRenderer.invoke('update-memory-flash', { repoId: repo.id });
  } catch (error) {
    console.error(`更新记忆闪存失败:`, error);
  } finally {
    loading.value = false;
  }
};

const deleteMemoryFlash = async (repo: Repository) => {
  try {
    if (confirm(`确定要删除 ${repo.name} 的记忆闪存吗？`)) {
      loading.value = true;
      await window.electron.ipcRenderer.invoke('delete-memory-flash', { repoId: repo.id });
      // 更新状态
      const index = repositories.value.findIndex(r => r.id === repo.id);
      if (index !== -1) {
        repositories.value[index].hasMemoryFlash = false;
      }
    }
  } catch (error) {
    console.error(`删除记忆闪存失败:`, error);
  } finally {
    loading.value = false;
  }
};

const resetMemoryFlash = async (repo: Repository) => {
  try {
    if (confirm(`确定要重置 ${repo.name} 的记忆闪存吗？`)) {
      loading.value = true;
      await window.electron.ipcRenderer.invoke('reset-memory-flash', { repoId: repo.id });
    }
  } catch (error) {
    console.error(`重置记忆闪存失败:`, error);
  } finally {
    loading.value = false;
  }
};

const exportMemoryFlash = async (repo: Repository) => {
  try {
    loading.value = true;
    await window.electron.ipcRenderer.invoke('export-memory-flash', { repoId: repo.id });
  } catch (error) {
    console.error(`导出记忆闪存失败:`, error);
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  window.history.back();
};

// 组件挂载时获取仓库列表
onMounted(() => {
  fetchRepositories();
});
</script>

<style scoped>
.memory-flash-container {
  padding: 20px;
}

.header {
  margin-bottom: 20px;
}

.action-buttons {
  margin-bottom: 20px;
}

.v-data-table {
  border-radius: 8px;
}

.v-btn {
  margin-right: 10px;
}
</style>
