<template xmlns="http://www.w3.org/1999/html">
  <v-container fluid class="memory-flash-container">
    <!-- 顶部导航栏 -->
    <v-row align="center" justify="space-between" class="header">
      <v-col >
        <v-btn color="secondary" variant="outlined" @click="importMemoryFlash" disabled>从社区导入索引</v-btn>
      </v-col>
    </v-row>

    <!-- 主要内容区 -->
    <v-row>
      <v-col cols="12">
        <div v-if="messages.length > 0">
          <div class="news-tips compact-list">
            <tip-banner
              v-for="(item, idx) in messages"
              :key="idx"
              class="tip-compact"
              :date="item.date"
              :message="item.message"
              :href="item.href"
            />
          </div>
        </div>
      </v-col>
      <!-- 显示AI索引的表格 -->
      <v-col class="table-scroll" cols="12">
        <v-data-table
          :headers="headers"
          :items="repositories"
          item-key="id"
          class="elevation-1"
          loading-text="加载中..."
          items-per-page-text="每页显示行数"
          :items-per-page-options="[7, 10, 15]"
          v-model:page="page"
          v-model:items-per-page="itemsPerPage"
          density="compact"
          return-object
        >
          <!-- 是否已构建AI索引 -->
          <template #[`item.hasMemoryFlash`]="{ item }">
            <div class="d-flex align-center">
              <v-chip
                v-if="item.indexing"
                color="orange"
                text-color="white"
                small
                style="font-weight: bold"
              >
                <v-icon :loading="item.loading">mdi-reload</v-icon>
                正在构建
              </v-chip>
              <v-chip
                v-else-if="item.hasMemoryFlash"
                color="success"
                text-color="white"
                small
                style="font-weight: bold"
              >
                <v-icon>mdi-check-circle</v-icon>
                已构建
              </v-chip>
              <v-chip
                v-else
                color="grey"
                text-color="white"
                small
                style="font-weight: bold"
              >
                <v-icon>mdi-close-circle</v-icon>
                未构建
            </v-chip>
            </div>
          </template>

          <template #[`item.totalProgress`]="{ item }">
            <div class="d-flex align-center">
              <v-progress-linear
                v-model="item.indexProgress"
                :value="item.indexProgress"
                color="success"
                height="8"
                rounded
                striped
                class="mx-2 flex-grow-1"
              />
              <span>{{ item.scannedCount }}/{{ item.functionsTotal }}</span>
              <v-tooltip bottom>
                <template #activator="{ props }">
                  <v-icon v-bind="props" small class="ml-1">mdi-help-circle-outline</v-icon>
                </template>
                <span>大模型扫描估算的函数量仅供参考，以实际完成量为准。</span>
              </v-tooltip>
            </div>
          </template>


          <!-- 操作按钮，包括“查看进度” -->
          <template #[`item.actions`]="{ item }">
            <v-btn size="small" @click="buildMemoryFlash(item)" :loading="item.loading" variant="outlined" color="purple">
              <v-icon>mdi-memory</v-icon>
              <span v-if="item.hasMemoryFlash && item.indexProgress === 100">
                重新构建
              </span>
              <span v-else>
                构建
              </span>
            </v-btn>
            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-btn size="small" v-bind="props" class="mr-2" @click="clickProgress(item)" :loading="item.loading" variant="outlined">
                  <v-icon>mdi-credit-card-scan</v-icon>
                  <span>估算</span>
                </v-btn>
              </template>
              <span>预估需要索引的函数量</span>
            </v-tooltip>

            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-btn size="small" v-bind="props" class="mr-2" icon @click="resetClick(item)">
                  <v-icon>{{ item.resetIcon }}</v-icon>
                </v-btn>
              </template>
              <span>{{ item.resetText }}</span>
            </v-tooltip>

            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-btn size="small" v-bind="props" class="mr-2" icon @click="deleteClick(item)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </template>
              <span>彻底清除构建</span>
            </v-tooltip>

            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-btn size="small" v-bind="props" class="mr-2" icon @click="exportMemoryFlash(item)" :loading="item.loading" disabled>
                  <v-icon>mdi-export</v-icon>
                </v-btn>
              </template>
              <span>导出索引</span>
            </v-tooltip>
            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  size="small"
                  icon
                  @click="openExclude(item)"
                >
                  <v-icon>mdi-cog</v-icon>
                </v-btn>
              </template>
              <span>自定义排除索引规则</span>
            </v-tooltip>
          </template>
        </v-data-table>
      </v-col>
    </v-row>
    <!-- 全局唯一的排除文件管理 Modal -->
    <ExcludeFileModal
      v-model="excludeShow"
      :excluded-files="currentRepo ? currentRepo.excludeRule : []"
      :proj-dir="currentRepo ? currentRepo.local_path : ''"
      @update:excluded-files="files => {
        if (currentRepo) currentRepo.excludeRule = files
      }"
    />
    <!-- AI索引构建确认对话框 -->
    <v-dialog v-model="dialogVisible" max-width="500" persistent>
      <v-card>
        <v-card-title class="text-h5">
          {{ dialogTitle }}
        </v-card-title>

        <v-card-text>
          <p>{{ dialogMessage }}</p>

          <!-- AI索引状态和进度条 -->
          <v-card-subtitle v-if="dialogProgress > 0" class="pt-4">AI索引状态</v-card-subtitle>
          <div v-if="dialogProgress > 0" class="d-flex align-center my-2">
            <v-progress-linear
              v-model="dialogProgress"
              :value="dialogProgress"
              color="success"
              height="10"
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
              注意：大型仓库可能需要较长时间构建AI索引
            </v-list-item-subtitle>
          </v-list-item>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey darken-1" text @click="cancelBuildIndex">取消</v-btn>
          <v-btn color="primary" @click="confirmBuildIndex">{{ dialogBuildButton }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount, watch } from "vue";
import { VDataTable } from 'vuetify/components';
import { listRepos, listFunctions, buildIndex, deleteIndexApi, incrementalIndex, resetIndexApi, getExcludeApi, updateExcludeApi } from "../service/api.js";
import { omit } from "../service/str.js";
import { useStore } from "vuex";
import ExcludeFileModal from '../components/ExcludeFileModal.vue'
const store = useStore()
const show = computed({
  get: () => store.state.snackbar.show,
  set: val => {
    if (!val) {
      // 你需要在 Vuex 里写一个 mutation，比如 'snackbar/hide'
      store.commit('snackbar/hide')
    }
  },
})
const snackbar = computed(() => store.state.snackbar)
import { loadRepoProgress, removeRepoProgress, RepoProgress, saveRepoProgress } from "../storage/progress-storage";
import TipBanner from "../components/TipBanner.vue";
// 分页状态
const page = ref<number>(1)           // 默认打开第 1 页
const itemsPerPage = ref<number>(7)   // 默认每页 5 条
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
const dialogHasIndex = ref(false);
const dialogBuildButton = ref('确认构建');
// 用来控制 Modal 显示，以及记录当前编辑的 repo
const excludeShow = ref(false);
const currentRepo = ref<Repository | null>(null);
// 点击齿轮时调用
async function openExclude(item: Repository) {
  if (!Array.isArray(item.excludeRule)) {
    item.excludeRule = [];
  }
  const excludeResp = await getExcludeApi(item.local_path);
  const newExcludes = Array.isArray(excludeResp.data.data)
    ? excludeResp.data.data
    : [];
  // 用 Set 去重并保留插入顺序
  item.excludeRule = Array.from(
    new Set([
      ...item.excludeRule,
      ...newExcludes
    ])
  );
  console.log("excludeRule:", item.excludeRule)
  currentRepo.value = item;
  excludeShow.value = true;
}
// 如果需要，在 Modal 关闭时清空 currentRepo
watch(excludeShow, val => {
  if (!val) currentRepo.value = null;
});
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
  indexing : boolean;
  functionsTotal: number;
  scannedCount: number;
  indexProgress: number; // 百分比
  loading: boolean;
  excludeRule: string[];
  resetIcon: string;
  resetText: string;
}

// 表头定义
// const headers = [
//   { text: '仓库名称', align: 'start', value: 'name' },
//   { text: '描述', align: 'start', value: 'desc' },
//   { text: '已构建AI索引', align: 'center', value: 'hasMemoryFlash' },
//   { text: 'AI索引进度', align: 'center', value: 'indexProgress', sortable: false },
//   { text: '操作', align: 'center', value: 'actions', sortable: false },
// ]
const headers = [
  { title: '仓库名称', key: 'name'},
  { title: '描述', key: 'omitDesc'},
  { title: '状态', key: 'hasMemoryFlash'},
  { title: '当前进度/预估函数量', key: 'totalProgress', width: '260px'},
  { title: '操作', key: 'actions', width: '420px'},
]

const messages = ref([
  {
    date: '2025.5.5',
    message:
      '目前对Go、Java、Python、C/C++、PHP六种语言，支持了构建“函数级”的精确粒度索引，提高了AI分析这些代码任务的能力',
    href: 'https://your.link/3'
  },
])

const repositories = ref<Repository[]>([]);
const loading = ref(true);

const fetchRepositories = async () => {
  try {
    loading.value = true;
    const response = await listRepos();
    const repos = response.data;

    repositories.value = await Promise.all(
      repos.map(async (repo: any) => {
        const { exists, indexing } = await window.electron.checkMemoryFlashStatus(repo.local_path);
        console.log('checkMemoryFlashStatus', repo.local_path, exists, indexing);

        // 新：尝试从 localStorage 读取进度
        const saved = loadRepoProgress(repo.id);
        const fallback: RepoProgress = {
          functionsTotal: 0,
          scannedCount: 0,
          indexProgress: 0,
        };
        let { functionsTotal, scannedCount, indexProgress } = saved || fallback;
        console.log('进度', { functionsTotal, scannedCount, indexProgress });
        repo.resetText = indexing ? '强制停止' : '重置索引';
        repo.resetIcon = indexing ? 'mdi-stop-circle' : 'mdi-lock-reset';
        return {
          ...repo,
          omitDesc: omit(repo.desc, 5),
          hasMemoryFlash: exists,
          indexing,
          functionsTotal,
          scannedCount,
          indexProgress,
          loading: indexing,
        } as Repository;
      })
    );
  } catch (error) {
    console.error('获取仓库列表失败:', error);
  } finally {
    loading.value = false;
  }
};

const clickProgress = async (repo: Repository) => {
  await store.dispatch('snackbar/showSnackbar', {
    message: `正在扫描AI索引量（较大的仓库可能会花费几分钟）...`,
    color: 'primary'
  });
  await viewProgress(repo)
}

const viewProgress = async (repo: Repository) => {
  repo.loading = true;
  try {
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

    const total   = functionsList.length;
    const scanned = functionsList.filter((f: any) => f.scan).length;
    const progress= total > 0 ? Math.floor((scanned / total) * 100) : 0;

    // 更新 UI
    repo.functionsTotal  = total;
    repo.scannedCount    = scanned;
    repo.indexProgress   = progress;

    // 新：保存到 localStorage
    const p: RepoProgress = { functionsTotal: total, scannedCount: scanned, indexProgress: progress };
    saveRepoProgress(repo.id, p);
    console.log('saveRepoProgress', repo.id, p);
    repo.loading = false;
    // 强制 vue 响应（若仍需 slice）
    const idx = repositories.value.findIndex(r => r.id === repo.id);
    if (idx !== -1) {
      repositories.value[idx] = { ...repo };
      repositories.value = repositories.value.slice();
    }
    await store.dispatch('snackbar/showSnackbar', {
      message: `${repo.name}(${repo.desc}) 扫描进度已更新`,
      color: 'success'
    });
  } catch (error) {
    console.error(`加载 ${repo.name} 进度失败:`, error);
  }
};



// 检查仓库是否已构建AI索引
const checkMemoryFlashStatus = async (local_path: string): Promise<boolean> => {
  try {
    const { exists, indexing } = await window.electron.checkMemoryFlashStatus(local_path)
    console.log(`仓库 ${local_path} AI索引状态:`, exists);
    return exists;
  } catch (error) {
    console.error(`检查仓库 ${local_path} AI索引状态失败:`, error);
    return false;
  }
};

// 构建AI索引
const buildMemoryFlash = async (repo: Repository) => {
  try {
    repo.loading = true;
    // 1. 检查是否已构建AI索引
    const { exists, indexing } = await window.electron.checkMemoryFlashStatus(repo.local_path);
    dialogHasIndex.value = exists;
    console.log('hasIndex', exists);

    // 2. 获取函数总量，判断仓库大小
    let total: number
    let scanned: number
    let progress: number
    const saved = loadRepoProgress(repo.id);
    if (saved != null) {
      console.log('从 localStorage 读取进度', saved);
      total = saved.functionsTotal;
      scanned = saved.scannedCount;
      progress = saved.indexProgress;
    } else {
      console.log('从 API 获取进度');
      await store.dispatch('snackbar/showSnackbar', {
        message: `构建全量索引前，首先要扫描AI索引的完整度（较大的仓库可能会花费几分钟）...`,
        color: 'primary'
      });
      await viewProgress(repo)
      return
    }


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
    if (exists) {
      confirmMessage = `该仓库(${repoSizeType})已构建AI索引，完整度为${progress}%。是否重新构建AI索引？`;
    } else {
      confirmMessage = `该仓库为${repoSizeType}，包含${total}个函数。`;
      if (canBuildFullIndex) {
        confirmMessage += '是否构建AI索引？';
      } else {
        confirmMessage += '为了节省电脑性能，对于大于1000个函数的仓库，我们建议你1. 使用云端模型构建AI索引，2. 从社区一键导入索引，3. 从‘空间透镜’自行批量构建索引。是否继续构建？';
      }
    }
    if (!dialogHasIndex.value && progress > 0 && progress < 100) {
      dialogBuildButton.value = "继续构建"
    }
    if (dialogHasIndex.value && progress >= 100) {
      dialogBuildButton.value = "重新构建"
    }

    // 5. 设置对话框数据并显示
    dialogTitle.value = '构建AI索引确认';
    dialogMessage.value = confirmMessage;
    dialogRepo.value = repo;
    dialogProgress.value = progress;
    dialogFunctionsTotal.value = total;
    dialogScannedCount.value = scanned;
    dialogRepoSizeType.value = repoSizeType;
    dialogCanBuildFullIndex.value = canBuildFullIndex;
    dialogVisible.value = true;

    repo.loading = true;
    repo.indexing = true;
  } catch (error) {
    console.error(`构建AI索引失败:`, error);
  } finally {
  }
};

// 确认构建AI索引
const confirmBuildIndex = async () => {
  if (!dialogRepo.value) return;

  try {
    const { exists, indexing } = await window.electron.checkMemoryFlashStatus(dialogRepo.value.local_path);
    dialogVisible.value = false
    console.log('if should rebuild', indexing, dialogProgress.value)
    if (!Array.isArray(dialogRepo.value.excludeRule)) {
      dialogRepo.value.excludeRule = [];
    }
    console.log('ruleeeeeeeeee', dialogRepo.value.excludeRule)
    await updateExcludeApi(dialogRepo.value.local_path, dialogRepo.value.excludeRule)
    if (indexing && dialogProgress.value >=100) {
      console.log('重新构建', dialogRepo.value)
      await deleteRepo(dialogRepo.value)
    }
    await store.dispatch('snackbar/showSnackbar', {
      message: `正在构建${dialogRepo.value.name}(${dialogRepo.value.desc}) 的AI索引，点击‘扫描进度’以查看索引的实时进展...`,
      color: 'primary'
    });

    // 调用构建AI索引API
    await buildIndex(dialogRepo.value.local_path, '');
    await store.dispatch('snackbar/showSnackbar', {
      message: `${dialogRepo.value.name}(${dialogRepo.value.desc}) 的AI索引构建完成`,
      color: 'success'
    });
    // 更新状态
    const index = repositories.value.findIndex(r => r.id === dialogRepo.value!.id);
    if (index !== -1) {
      repositories.value[index].hasMemoryFlash = true;
    }
    dialogVisible.value = false;
  } catch (error) {
    console.error(`构建AI索引失败:`, error);
  }
};

// 取消构建AI索引
const cancelBuildIndex = () => {
  dialogVisible.value = false;
};

async function deleteRepo(repo: Repository) {
  await deleteIndexApi(repo.local_path);
  // …从 repositories.value 中移除…
  removeRepoProgress(repo.id);
  await viewProgress(repo)
  await fetchRepositories()
}

async function resetClick(repo: Repository) {
  if (repo.indexing) {
    const confirmed = window.confirm(`确定要停止构建吗？`)
    if (!confirmed) return
  } else {
    const confirmed = window.confirm(`确定要重置索引吗？（不会删除构建的函数）`)
    if (!confirmed) return
  }
  await resetIndexApi(repo.local_path)
  await fetchRepositories()
}

async function deleteClick(repo: Repository) {
  const confirmed = window.confirm(`确定清除“${repo.name}”构建的全部内容吗？`)
  if (!confirmed) return
  await deleteRepo(repo)
}

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
    console.error('导入AI索引失败:', error);
  }
};


const exportMemoryFlash = async (repo: Repository) => {
  try {
    repo.loading = true;
    // await window.electron.ipcRenderer.invoke('export-memory-flash', { repoId: repo.id });
  } catch (error) {
    console.error(`导出AI索引失败:`, error);
  } finally {
    repo.loading = false;
  }
};

// 定时器 ID
let intervalId: number | undefined = undefined;

// 定时任务：每5秒刷新一次
const startAutoRefresh = () => {
  intervalId = setInterval(async () => {
    try {
      // 遍历所有仓库，获取最新的索引进度
      for (const repo of repositories.value) {
        if (repo.local_path) {

          const fn = await listFunctions(repo.local_path, true); // 加上 `true` 作为参数
          const scannedCount = fn.data.data
          //如果fn.data.data不是数字类型，则跳过
          if (typeof scannedCount !== 'number') {
            console.log('fn.data.data is not a number', fn.data.data);
            continue;
          }
          // 更新进度到 localStorage
          const oldProgress = loadRepoProgress(repo.id);
          if (oldProgress != null) {
            const progress= oldProgress.functionsTotal > 0 ? Math.floor((scannedCount / oldProgress.functionsTotal) * 100) : 0;
            let updatedProgress = {
              functionsTotal: oldProgress.functionsTotal,
              scannedCount: scannedCount,
              indexProgress: progress
            };
            console.log('startAutoRefresh:', repo.local_path, scannedCount, progress);
            saveRepoProgress(repo.id, updatedProgress);

            if (oldProgress.functionsTotal != 0) {
              // 如果仓库已进行初始化，则更新仓库的加载状态
              const { exists, indexing } = await window.electron.checkMemoryFlashStatus(repo.local_path);
              console.log('startAutoRefresh:', repo.local_path, exists, indexing);
              repo.hasMemoryFlash = exists;
              repo.loading = indexing;
              repo.indexing = indexing;
            }
          }
          // 更新 repositories 中的数据
          const idx = repositories.value.findIndex(r => r.id === repo.id);
          if (idx !== -1) {
            repositories.value[idx].scannedCount = scannedCount;
            repositories.value[idx].indexProgress = Math.floor((scannedCount / repo.functionsTotal) * 100);
          }
        }
      }
    } catch (error) {
      console.error('自动刷新进度失败:', error);
    }
  }, 5000); // 每5秒刷新一次
};

// 清除定时器
const stopAutoRefresh = () => {
  if (intervalId !== undefined) {
    clearInterval(intervalId);
    intervalId = undefined;
  }
};

// 使用 beforeRouteLeave 来处理路由离开时清除定时器
import { useRoute, useRouter } from "vue-router";

const router = useRouter();

router.beforeEach((to, from, next) => {
  console.log('beforeEach', to, from);
  stopAutoRefresh(); // 清除定时器
  next(); // 跳转到下一个路由
});

import { onBeforeRouteLeave } from "vue-router";

onBeforeRouteLeave((to, from, next) => {
  console.log('beforeRouteLeave', to, from);
  stopAutoRefresh();
  next(); // 允许路由跳转
});


// 组件挂载时获取仓库列表
onMounted(() => {
  fetchRepositories();
  startAutoRefresh();
});

// 组件卸载时清除定时器
onBeforeUnmount(() => {
  stopAutoRefresh();
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

.news-tips.compact-list {
  padding: 0;
}
.table-scroll {
  width: 100%;
  overflow-x: auto;       /* 启用横向滚动 */
}

/* 深度选择器，给内部真正渲染的 table 设置最小宽度 */
.table-scroll ::v-deep(.v-data-table__wrapper > table) {
  min-width: 800px;        /* 根据列数调大或用 max-content */
}
</style>
