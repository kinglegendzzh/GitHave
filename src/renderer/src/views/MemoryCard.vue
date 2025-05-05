<template>
  <v-container fluid class="memory-flash-container">
    <!-- 顶部导航栏 -->
    <v-row align="center" justify="space-between" class="header">
      <v-col cols="auto">
        <v-btn icon @click="goBack">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
      </v-col>
      <v-col class="action-buttons">
        <v-btn color="secondary" @click="importMemoryFlash" disabled>导入索引</v-btn>
      </v-col>
    </v-row>

    <!-- 主要内容区 -->
    <v-row>

      <!-- 显示索引的表格 -->
      <v-col cols="12">
        <v-data-table
          :headers="headers"
          :items="repositories"
          item-key="id"
          class="elevation-1"
          loading-text="加载中..."
          items-per-page-text="每页显示行数"
          :items-per-page-options="[5, 10]"
        >
          <!-- 是否已构建索引 -->
          <template #[`item.hasMemoryFlash`]="{ item }">
            <v-icon v-if="item.hasMemoryFlash" color="success">mdi-check</v-icon>
            <v-icon v-else color="error">mdi-close</v-icon>
          </template>

          <!-- 索引进度，只要点击“查看进度”后，这里就会显示最新数据 -->
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

          <!-- 操作按钮，包括“查看进度” -->
          <template #[`item.actions`]="{ item }">
            <v-btn small @click="buildMemoryFlash(item)" v-if="!item.hasMemoryFlash" :loading="item.loading">
              <v-icon>mdi-memory</v-icon>
              构建索引
            </v-btn>
            <!-- 新增：查看进度 -->
            <v-btn icon @click="viewProgress(item)" :loading="item.loading">
              <v-icon>mdi-refresh</v-icon>
            </v-btn>
            <v-btn icon @click="exportMemoryFlash(item)" :disabled="!item.hasMemoryFlash" :loading="item.loading">
              <v-icon>mdi-export</v-icon>
            </v-btn>
          </template>
        </v-data-table>
      </v-col>
    </v-row>
    <!-- 索引构建确认对话框 -->
    <v-dialog v-model="dialogVisible" max-width="500">
      <v-card>
        <v-card-title class="text-h5">
          {{ dialogTitle }}
        </v-card-title>

        <v-card-text>
          <p>{{ dialogMessage }}</p>

          <!-- 索引状态和进度条 -->
          <v-card-subtitle v-if="dialogProgress > 0" class="pt-4">索引状态</v-card-subtitle>
          <div v-if="dialogProgress > 0" class="d-flex align-center my-2">
            <v-progress-linear
              :value="dialogProgress"
              color="primary"
              height="10"
              rounded
              striped
              class="flex-grow-1 mr-2"
            />
            <span>{{ dialogScannedCount }}/{{ dialogFunctionsTotal }} ({{ dialogProgress }}%)</span>
          </div>

          <!-- 仓库大小分类信息 -->
          <v-card-subtitle class="pt-4">仓库信息</v-card-subtitle>
          <v-list-item>
            <v-list-item-title>仓库大小: <v-chip :color="dialogCanBuildFullIndex ? 'success' : 'warning'" size="small">{{ dialogRepoSizeType }}</v-chip></v-list-item-title>
          </v-list-item>
          <v-list-item>
            <v-list-item-title>函数总数: {{ dialogFunctionsTotal }}</v-list-item-title>
          </v-list-item>
          <v-list-item v-if="!dialogCanBuildFullIndex">
            <v-list-item-subtitle class="text-warning">
              <v-icon size="small" color="warning">mdi-alert</v-icon>
              注意：大型仓库可能需要较长时间构建索引
            </v-list-item-subtitle>
          </v-list-item>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey darken-1" text @click="cancelBuildIndex">取消</v-btn>
          <v-btn color="primary" @click="confirmBuildIndex">确认构建</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { VDataTable } from 'vuetify/components';
import { listRepos, listFunctions, buildIndex, deleteIndexApi, incrementalIndex } from "../service/api.js";
import { useStore } from "vuex";
const store = useStore()
const snackbar = computed(() => store.state.snackbar)
import { loadRepoProgress, RepoProgress } from '../storage/progress-storage';

// 对话框相关状态
const dialogVisible = ref(false);
const dialogTitle = ref('');
const dialogMessage = ref('');
const dialogRepo = ref<Repository | null>(null);
const dialogProgress = ref(0);
const dialogFunctionsTotal = ref(0);
const dialogScannedCount = ref(0);
const dialogRepoSizeType = ref('');
const dialogCanBuildFullIndex = ref(true);

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
  loading: boolean;
}

// 表头定义
// const headers = [
//   { text: '仓库名称', align: 'start', value: 'name' },
//   { text: '描述', align: 'start', value: 'desc' },
//   { text: '已构建索引', align: 'center', value: 'hasMemoryFlash' },
//   { text: '索引进度', align: 'center', value: 'indexProgress', sortable: false },
//   { text: '操作', align: 'center', value: 'actions', sortable: false },
// ]
const headers = [
  { title: '仓库名称', key: 'name'},
  { title: '描述', key: 'desc'},
  { title: '已构建索引', key: 'hasMemoryFlash'},
  { title: '索引完整度', key: 'indexProgress'},
  { title: '操作', key: 'actions'}, // 新增
]

const repositories = ref<Repository[]>([]);
const loading = ref(true);

// 只加载仓库列表，不再预先拉取函数进度
const fetchRepositories = async () => {
  try {
    loading.value = true;
    const response = await listRepos();
    const repos = response.data;

    repositories.value = [];
    for (const repo of repos) {
      const hasMemoryFlash = await checkMemoryFlashStatus(repo.local_path);
      // 初始进度全设为 0，等点击“查看进度”时再加载
      repositories.value = await Promise.all(
        repos.map(async (repo: any) => {
          const hasMemoryFlash = await window.electron.checkMemoryFlashStatus(repo.local_path);
          return {
            ...repo,
            hasMemoryFlash,
            functionsTotal: 0,
            scannedCount: 0,
            indexProgress: 0,
            loading: false,    // 新增初始化
          } as Repository;
        })
      );
    }
  } catch (error) {
    console.error('获取仓库列表失败:', error);
  } finally {
    loading.value = false;
  }
};

// 新增函数：只有点击“查看进度”时才调用
const viewProgress = async (repo: Repository) => {
  try {
    repo.loading = true;
    await store.dispatch('snackbar/showSnackbar', {
      message: `正在扫描索引完整度（较大的仓库可能会花费几分钟）...`,
      color: 'purple'
    })
    const fn = await listFunctions(repo.local_path)
    const fnRes = fn.data;
    let functionsList: any[] = [];
    if (Array.isArray(fnRes.data)) {
      functionsList = fnRes.data;
    } else if (fnRes.data && Array.isArray((fnRes.data as any).functions)) {
      functionsList = (fnRes.data as any).functions;
    } else {
      console.warn('Unexpected functions response format:', fnRes.data);
    }

    const total   = functionsList.length;
    const scanned = functionsList.filter((f: any) => f.scan).length;
    const progress= total > 0 ? Math.floor((scanned / total) * 100) : 0;
    console.log('viewProgress', total, scanned, progress);
    repo.loading = false;
    // 整行替换，并用 slice() 强制 Vue 侦测
    const idx = repositories.value.findIndex(r => r.id === repo.id);
    if (idx !== -1) {
      const updated: Repository = {
        ...repo,
        functionsTotal: total,
        scannedCount: scanned,
        indexProgress: progress,
      };
      repositories.value[idx] = updated;
      repositories.value = repositories.value.slice();
    }
    await store.dispatch('snackbar/showSnackbar', {
      message: `${repo.name}(${repo.desc}) 仓库已扫描完成`,
      color: 'success'
    })
  } catch (error) {
    console.error(`加载 ${repo.name} 进度失败:`, error);
  }
};



// 检查仓库是否已构建索引
const checkMemoryFlashStatus = async (local_path: string): Promise<boolean> => {
  try {
    const built = await window.electron.checkMemoryFlashStatus(local_path)
    console.log(`仓库 ${local_path} 索引状态:`, built);
    return built;
  } catch (error) {
    console.error(`检查仓库 ${local_path} 索引状态失败:`, error);
    return false;
  }
};

// 构建索引
const buildMemoryFlash = async (repo: Repository) => {
  try {
    repo.loading = true;
    // 1. 检查是否已构建索引
    const hasIndex = await checkMemoryFlashStatus(repo.local_path);

    // 2. 获取函数总量，判断仓库大小
    const fn = await listFunctions(repo.local_path);
    const fnRes = fn.data;
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

    // 3. 根据函数数量判断仓库大小
    let repoSizeType = '';
    let canBuildFullIndex = false;

    if (total < 100) {
      repoSizeType = '超小型仓库';
      canBuildFullIndex = true;
    } else if (total < 500) {
      repoSizeType = '小型仓库';
      canBuildFullIndex = true;
    } else if (total < 1000) {
      repoSizeType = '中型仓库';
      canBuildFullIndex = true;
    } else if (total < 10000) {
      repoSizeType = '大型仓库';
      canBuildFullIndex = false;
    } else {
      repoSizeType = '超大型仓库';
      canBuildFullIndex = false;
    }

    // 4. 构建确认信息
    let confirmMessage = '';
    if (hasIndex) {
      confirmMessage = `该仓库(${repoSizeType})已构建索引，完整度为${progress}%。是否重新构建索引？`;
    } else {
      confirmMessage = `该仓库为${repoSizeType}，包含${total}个函数。`;
      if (canBuildFullIndex) {
        confirmMessage += '是否构建索引？';
      } else {
        confirmMessage += '目前仅支持全量构建小于1000个函数的仓库索引。是否继续？';
      }
    }

    // 5. 设置对话框数据并显示
    dialogTitle.value = '构建索引确认';
    dialogMessage.value = confirmMessage;
    dialogRepo.value = repo;
    dialogProgress.value = progress;
    dialogFunctionsTotal.value = total;
    dialogScannedCount.value = scanned;
    dialogRepoSizeType.value = repoSizeType;
    dialogCanBuildFullIndex.value = canBuildFullIndex;
    dialogVisible.value = true;
  } catch (error) {
    console.error(`构建索引失败:`, error);
  } finally {
    repo.loading = false;
  }
};

// 确认构建索引
const confirmBuildIndex = async () => {
  if (!dialogRepo.value) return;

  try {
    // 调用构建索引API
    await buildIndex(dialogRepo.value.local_path, '');

    // 更新状态
    const index = repositories.value.findIndex(r => r.id === dialogRepo.value!.id);
    if (index !== -1) {
      repositories.value[index].hasMemoryFlash = true;
    }
  } catch (error) {
    console.error(`构建索引失败:`, error);
  } finally {
    // 关闭对话框
    dialogVisible.value = false;
  }
};

// 取消构建索引
const cancelBuildIndex = () => {
  dialogVisible.value = false;
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
    console.error('导入索引失败:', error);
  }
};


const exportMemoryFlash = async (repo: Repository) => {
  try {
    repo.loading = true;
    // await window.electron.ipcRenderer.invoke('export-memory-flash', { repoId: repo.id });
  } catch (error) {
    console.error(`导出索引失败:`, error);
  } finally {
    repo.loading = false;
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
