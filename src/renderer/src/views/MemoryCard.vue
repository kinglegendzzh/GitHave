<template xmlns="http://www.w3.org/1999/html">
  <v-container fluid class="memory-flash-container">
    <!-- 顶部导航栏 -->
    <v-row align="center" justify="space-between" class="header">
      <v-col >
        <v-btn color="success" variant="elevated" @click="jumpToRepo">跳转到仓库</v-btn>
      </v-col>
      <v-col>
        <v-text-field
          v-model="searchQuery"
          label="快速搜索仓库"
          placeholder="输入仓库名称或描述进行搜索..."
          prepend-inner-icon="mdi-magnify"
          clearable
          variant="outlined"
          density="compact"
          hide-details
        />
      </v-col>
      <v-col>
        <v-chip
          v-if="searchQuery"
          color="primary"
          variant="outlined"
          size="small"
        >
          找到 {{ filteredRepositories.length }} 个仓库
        </v-chip>
      </v-col>
    </v-row>

    <!-- GitHave AI 用户信息区域 -->
    <v-row>
      <v-col cols="12">
        <!-- 已登录或登录过期状态 -->
        <v-card
          v-if="isLoggedIn || loginExpired"
          outlined
          class="elevation-2 pa-3 mb-4 githave-user-card"
          :style="
            isLoggedIn
              ? {
                  border: '2px solid #3CB371',
                  background: 'linear-gradient(90deg, #fff 10%, #E6FFED 100%)'
                }
              : {
                  border: '2px solid #FFD700',
                  background: 'linear-gradient(90deg, #FFFACD 60%, #fff 100%)'
                }
          "
        >
          <div class="d-flex align-center">
            <v-icon v-if="!isLoggedIn" color="warning" class="mr-2" size="24">mdi-alert-circle</v-icon>
            <v-icon v-else color="success" class="mr-2" size="24">mdi-check-circle</v-icon>
            <span v-if="!isLoggedIn" class="font-weight-bold">GitHave AI 登录已过期</span>
            <span v-else class="font-weight-bold">GitHave AI 已登录</span>
            <v-spacer></v-spacer>
            
            <!-- 登录状态下的用户信息 -->
            <div v-if="isLoggedIn" class="d-flex align-center flex-wrap">
              <a-tag color="blue" class="mr-2">{{ githaveUser.username || '用户' }}</a-tag>
              <a-tag color="geekblue" class="mr-2">{{ githaveUser.email || '—' }}</a-tag>
              <a-tag color="purple" class="mr-2">{{ formattedLoginTime }}</a-tag>
              <a-button size="small" type="link" @click="showToken = !showToken" class="mr-2">
                {{ showToken ? '隐藏' : '显示' }}Token
              </a-button>
              <a-button size="small" type="link" @click="copyToClipboard(githaveUser.token)" class="mr-2">
                复制Token
              </a-button>
              <v-chip v-if="isLoggedIn" color="success" class="ml-2 mr-2" label>
                <v-icon small class="mr-1">mdi-check-circle</v-icon>
                访问
                <a @click="jumpToDash" style="color: #1976d2; text-decoration: underline; cursor: pointer;">
                  GitHave AI 控制台
                </a>
                查看账户信息
              </v-chip>
              <a-button size="small" type="dashed" danger @click="logoutGithave">
                退出登录
              </a-button>
            </div>
            
            <!-- 未登录或过期状态下的登录按钮 -->
            <div v-else>
              <a-button type="dashed" @click="loginToGithave">
                <template #icon><v-icon>mdi-login</v-icon></template>
                重新登录
              </a-button>
            </div>
          </div>
          
          <!-- Token 显示区域 -->
          <div v-if="isLoggedIn && showToken" class="mt-2">
            <a-tag color="gold">APIKey: {{ maskedToken }}</a-tag>
            <a-tag color="error" class="ml-2">过期时间: {{ formattedExpireTime }}</a-tag>
          </div>
          
          <!-- 账号未激活提醒 -->
          <div v-if="isLoggedIn && (!githaveUser.email || !githaveUser.verified)" class="mt-2">
            <v-alert type="warning" variant="tonal" density="compact">
              <v-icon color="warning" class="mr-2">mdi-email-alert</v-icon>
              该账号未激活，请前往 GitHave AI 控制台激活邮箱后重新登录
            </v-alert>
          </div>
        </v-card>
        
        <!-- 未登录状态的GitHave AI索引库推广卡片 -->
        <v-card
          v-else
          outlined
          class="elevation-4 pa-4 mb-4 githave-subscription-card"
          :style="{
            border: '2px solid #FFD700',
            background: 'linear-gradient(90deg, #FFFACD 60%, #fff 100%)'
          }"
        >
          <v-card-title class="d-flex align-center githave-subscription-title">
            <v-icon color="primary" class="mr-2" size="28">mdi-star-circle</v-icon>
            <span class="font-weight-bold title-text">从GitHave AI一键导入索引，或者向社区共享你的索引，赚取tokens！</span>
          </v-card-title>

          <v-card-text>
            <div class="mb-3">
              <div class="d-flex align-center mb-2">
                <v-icon color="success" class="mr-2">mdi-database-import</v-icon>
                <span class="font-weight-bold">免费开放的AI索引库</span>
              </div>
              <div class="d-flex align-center mb-2">
                <v-icon color="info" class="mr-2">mdi-git</v-icon>
                <span class="font-weight-bold">完善的版本管理机制</span>
              </div>
              <div class="d-flex align-center mb-3">
                <v-icon color="purple" class="mr-2">mdi-currency-usd</v-icon>
                <span class="font-weight-bold">丰厚的激励机制</span>
              </div>
            </div>
            
            <v-alert type="info" variant="tonal" border="start" class="mb-3" density="comfortable">
              <div class="mb-2">
                <strong>🌟 关于GitHave AI索引库</strong>
              </div>
              <p class="mb-2">
                本网站托管一个对所有人免费开放的AI索引库，在这里可以找到大家共享的热门开源项目索引。
                我们维护了一套针对"索引"的版本管理机制，确保索引质量和更新的可追溯性。
              </p>
              <p class="mb-2">
                所有人都可以上传自己构建的索引，并合并到公共分支，共享给所有人。
              </p>
              <p class="mb-0">
                <strong>💰 激励机制：</strong>根据你分享的索引热门指数，为自己赚取更多tokens！
                贡献越多，收益越丰厚 - 让知识分享变成可持续的价值创造。
              </p>
            </v-alert>
            
            <div class="d-flex align-center flex-wrap gap-2">
              <a-button type="dashed" size="large" @click="loginToGithave">
                <template #icon><v-icon>mdi-login</v-icon></template>
                立即登录GitHave AI
              </a-button>
              <a-button type="text" size="large" @click="openGithaveWebsite">
                <template #icon><v-icon>mdi-web</v-icon></template>
                了解更多
              </a-button>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- GitHave AI 功能卡片区域（所有用户可见） -->
    <v-row class="mb-4">
      <v-col cols="12">
        <v-row>
          <v-col cols="12" md="6">
            <v-card
              outlined
              class="elevation-2 pa-3 function-card import-card"
              style="border: 2px solid #4CAF50; background: linear-gradient(135deg, #E8F5E8 0%, #fff 100%); cursor: pointer;"
              @click="importIndexFromGithave"
            >
              <div class="d-flex align-center mb-2">
                <v-icon color="success" size="32" class="mr-3">mdi-download-circle</v-icon>
                <div>
                  <div class="font-weight-bold text-h6">从GitHave AI导入索引</div>
                  <div class="text-caption text-grey-darken-1">一键导入社区优质项目索引</div>
                </div>
              </div>
              <div class="text-body-2 mb-3">
                • 海量开源项目索引库<br>
                • 免费下载，即用即得<br>
                • 社区维护，质量保证
              </div>
              <v-chip color="success" variant="outlined" size="small">
                <v-icon small class="mr-1">mdi-rocket-launch</v-icon>
                立即导入
              </v-chip>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="6">
            <v-card
              outlined
              class="elevation-2 pa-3 function-card upload-card"
              style="border: 2px solid #FF9800; background: linear-gradient(135deg, #FFF3E0 0%, #fff 100%); cursor: pointer;"
              @click="uploadIndexToGithave"
            >
              <div class="d-flex align-center mb-2">
                <v-icon color="orange" size="32" class="mr-3">mdi-upload-circle</v-icon>
                <div>
                  <div class="font-weight-bold text-h6">上传并发布我的索引</div>
                  <div class="text-caption text-grey-darken-1">分享索引，赚取丰厚tokens</div>
                </div>
              </div>
              <div class="text-body-2 mb-3">
                • 分享你的项目索引<br>
                • 根据热度赚取tokens<br>
                • 贡献社区，获得收益
              </div>
              <v-chip color="orange" variant="outlined" size="small">
                <v-icon small class="mr-1">mdi-currency-usd</v-icon>
                开始赚取
              </v-chip>
            </v-card>
          </v-col>
        </v-row>
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
      <!-- 显示函数索引的表格 -->
      <v-col class="table-scroll" style="width: 100%;" cols="12">
        <v-data-table
          :headers="headers"
          :items="filteredRepositories"
          item-key="id"
          class="elevation-1"
          loading-text="加载中..."
          items-per-page-text="每页显示行数"
          :items-per-page-options="[5, 10, 20, 50, 100, 150, 200]"
          v-model:page="currentPage"
          v-model:items-per-page="itemsPerPage"
          density="compact"
          return-object
          no-data-text="暂无数据"
          :page-text="`第 ${currentPage} 页，共 ${totalPages} 页`"
        >
          <!-- 是否已构建函数索引 -->
          <template #[`item.hasMemoryFlash`]="{ item }">
            <div class="d-flex align-center">
              <div v-if="!item.moduleAnalyzing">
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
                  v-else-if="item.hasFullIndex"
                  color="purple"
                  text-color="white"
                  small
                  style="font-weight: bold"
                >
                  <v-icon>mdi-check-circle</v-icon>
                  已全量构建
                </v-chip>
                <v-chip
                  v-else-if="item.hasMemoryFlash"
                  color="success"
                  text-color="white"
                  small
                  style="font-weight: bold"
                >
                  <v-icon>mdi-check-bold</v-icon>
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
              <div v-else>
                <v-tooltip bottom>
                  <template #activator="{ props }">
                    <v-chip
                      v-bind="props"
                      color="primary"
                      text-color="white"
                      small
                      style="font-weight: bold"
                      @click="jumpToModuleGraphs(item)"
                    >
                      <v-icon :loading="item.loading">mdi-robot</v-icon>
                      正在模块分析
                    </v-chip>
                  </template>
                  <span>点我跳转到”脉络感知“查看模块分析进度</span>
                </v-tooltip>
              </div>
            </div>
          </template>

          <template #[`item.totalProgress`]="{ item }">
            <div v-if="item.moduleAnalyzing && item.taskData && !item.indexing" class="d-flex align-center">
              <v-progress-linear
                v-if="item.taskData"
                v-model="item.taskData.percent"
                :value="item.taskData.percent"
                color="primary"
                height="8"
                rounded
                striped
                class="mx-2 flex-grow-1"
              />
              <span>{{ item.taskData?.completed }}/{{ item.taskData?.total }}</span>
            </div>
            <div v-else>
              <div v-if="item.hasFullIndex && !item.indexing" class="d-flex align-center">
                <v-icon small color="success" class="ml-1">mdi-function</v-icon>
                <v-chip small size="small" color="success" variant="outlined" class="ml-1" style="font-weight: bold">{{ item.scannedCount }}<span>个函数</span></v-chip>
                <span v-if="item.totalFileCount && item.totalFileCount > 0">
                  <v-icon small color="primary" class="ml-1">mdi-file-code-outline</v-icon>
                  <v-chip small size="small" color="primary" variant="outlined" class="ml-1" style="font-weight: bold">{{ item.totalFileCount }}<span>个文件</span></v-chip>
                </span>
              </div>
              <div v-else class="d-flex align-center">
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
                  <span>预估函数量仅供参考，以实际完成量为准（实际量通常大于预估量）</span>
                </v-tooltip>
              </div>
            </div>
          </template>


          <!-- 操作按钮，包括“查看进度” -->
          <template #[`item.actions`]="{ item }">
            <span v-if="item.functionsTotal > 0 || item.hasFullIndex">
              <v-btn v-if="item.hasMemoryFlash" size="small" @click="buildMemoryFlash(item)" :loading="item.loading || item.moduleAnalyzing" variant="outlined" color="purple">
                <v-icon>mdi-memory</v-icon>
                <span>
                  更新
                </span>
              </v-btn>
              <v-btn v-else size="small" @click="buildMemoryFlash(item)" :loading="item.loading || item.moduleAnalyzing" variant="outlined" color="pink">
                <v-icon>mdi-memory</v-icon>
                <span>
                  开始构建
                </span>
              </v-btn>
            </span>
            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-btn v-if="!item.hasFullIndex || item.functionsTotal === 0" size="small" v-bind="props" class="mr-2" @click="clickProgress(item)" :loading="item.loading" variant="outlined">
                  <v-icon>mdi-line-scan</v-icon>
                  <!-- <span>扫描</span> -->
                </v-btn>
              </template>
              <span>预估需要构建的函数量</span>
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
                <v-btn size="small" v-bind="props" class="mr-2" icon @click="deleteClick(item)" :disabled="item.indexing">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </template>
              <span>清除索引</span>
            </v-tooltip>
            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  size="small"
                  icon
                  @click="openExclude(item)"
                  :disabled="item.indexing"
                >
                  <v-icon>mdi-cog</v-icon>
                </v-btn>
              </template>
              <span>自定义排除索引规则</span>
            </v-tooltip>
            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-btn size="small" v-bind="props" class="mr-2" icon @click="exportMemoryFlash(item)" :loading="item.loading" :disabled="!item.hasMemoryFlash || item.indexing">
                  <v-icon>mdi-export-variant</v-icon>
                </v-btn>
              </template>
              <span>导出索引</span>
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
    <!-- 函数索引构建确认对话框 -->
    <v-dialog v-model="dialogVisible" max-width="500" persistent>
      <v-card>
        <v-card-title class="text-h5">
          {{ dialogTitle }}
        </v-card-title>

        <v-card-text>
          <p>{{ dialogMessage }}</p>

          <!-- 函数索引状态和进度条 -->
          <v-card-subtitle v-if="dialogProgress > 0" class="pt-4">函数索引状态</v-card-subtitle>
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
              注意：大型仓库可能需要较长时间构建函数索引
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
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="8000">
      {{ snackbar.message }}
    </v-snackbar>
    
    <!-- 导入索引选择弹窗 -->
    <v-dialog v-model="importDialogVisible" max-width="600" persistent>
      <v-card>
        <v-card-title class="text-h5 d-flex align-center">
          <v-icon color="success" class="mr-2">mdi-download-circle</v-icon>
          从GitHave AI导入索引
        </v-card-title>
        
        <v-card-text>
          <div class="mb-3">
            <p class="text-body-2 text-grey-darken-1">
              选择要导入索引的GitHub仓库，系统将跳转到GitHave AI对应的仓库页面。
            </p>
          </div>
          
          <v-list class="max-height-300 overflow-y-auto">
             <v-list-item
               v-for="repo in sortedGithubRepositories"
               :key="repo.id"
              :value="repo"
              @click="selectedRepo = repo"
              :class="{ 'v-list-item--active': selectedRepo?.id === repo.id }"
              class="mb-2"
            >
              <template #prepend>
                <v-radio
                  :model-value="selectedRepo?.id"
                  :value="repo.id"
                  color="success"
                  hide-details
                />
              </template>
              
              <v-list-item-title class="font-weight-medium">
                {{ repo.name }}
              </v-list-item-title>
              
              <v-list-item-subtitle class="text-caption">
                {{ repo.repo_url }}
              </v-list-item-subtitle>
              
              <v-list-item-subtitle v-if="repo.desc" class="text-body-2 mt-1">
                {{ repo.desc }}
              </v-list-item-subtitle>
              
              <template #append>
                 <!-- 公共索引状态 -->
                 <v-chip
                   v-if="publicIndexStatus[repo.id] === null"
                   color="grey"
                   size="small"
                   variant="outlined"
                   class="loading-chip"
                 >
                   <v-progress-circular size="12" width="2" indeterminate class="mr-1"></v-progress-circular>
                   检查中
                 </v-chip>
                 <v-chip
                   v-else-if="publicIndexStatus[repo.id] === true"
                   color="success"
                   size="small"
                   variant="elevated"
                   class="public-index-available"
                 >
                   <v-icon size="14" class="mr-1">mdi-check-circle</v-icon>
                   有可用的公共索引
                 </v-chip>
                 <v-chip
                   v-else
                   color="grey"
                   size="small"
                   variant="outlined"
                   class="public-index-unavailable"
                 >
                   <v-icon size="14" class="mr-1">mdi-minus-circle</v-icon>
                   暂无公共索引
                 </v-chip>
               </template>
            </v-list-item>
          </v-list>
          
          <div v-if="githubRepositories.length === 0" class="text-center py-4">
            <v-icon size="48" color="grey-lighten-1">mdi-github</v-icon>
            <p class="text-body-2 text-grey-darken-1 mt-2">没有找到GitHub仓库</p>
          </div>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey darken-1" variant="text" @click="cancelImportIndex">
            取消
          </v-btn>
          <v-btn 
            color="success" 
            variant="elevated"
            :disabled="!selectedRepo"
            @click="confirmImportIndex"
          >
            <v-icon class="mr-1">mdi-open-in-new</v-icon>
            查看详情
          </v-btn>
        </v-card-actions>
      </v-card>
     </v-dialog>
     
     <!-- 上传索引弹窗 -->
     <v-dialog v-model="uploadIndexDialogVisible" max-width="800" persistent>
       <v-card>
         <v-card-title class="text-h5 d-flex align-center">
           <v-icon color="orange" class="mr-2">mdi-upload-circle</v-icon>
           上传并发布我的索引
           <v-spacer></v-spacer>
           <v-chip color="orange" variant="outlined" size="small">
             步骤 {{ uploadStep }}/3
           </v-chip>
         </v-card-title>
         
         <v-card-text>
           <!-- 步骤1：选择要上传的仓库 -->
           <div v-if="uploadStep === 1">
             <div class="mb-4">
               <h3 class="text-h6 mb-2">📂 选择要共享的索引</h3>
               <p class="text-body-2 text-grey-darken-1">
                 选择一个已构建索引的仓库进行上传分享
               </p>
             </div>
             
             <v-list class="max-height-400 overflow-y-auto">
               <v-list-item
                 v-for="repo in repositories.filter(r => r.hasMemoryFlash)"
                 :key="repo.id"
                 :value="repo"
                 @click="selectUploadRepository(repo)"
                 :class="{ 'v-list-item--active': selectedUploadRepo?.id === repo.id }"
                 class="mb-2"
               >
                 <template #prepend>
                   <v-radio
                     :model-value="selectedUploadRepo?.id"
                     :value="repo.id"
                     color="orange"
                     hide-details
                   />
                 </template>
                 
                 <v-list-item-title class="font-weight-medium">
                   {{ repo.name }}
                 </v-list-item-title>
                 
                 <v-list-item-subtitle class="text-caption">
                   {{ repo.repo_url }}
                 </v-list-item-subtitle>
                 
                 <v-list-item-subtitle v-if="repo.desc" class="text-body-2 mt-1">
                   {{ repo.desc }}
                 </v-list-item-subtitle>
                 
                 <template #append>
                   <div class="d-flex flex-column align-end">
                     <v-chip
                       v-if="repo.hasFullIndex"
                       color="success"
                       size="small"
                       variant="elevated"
                       class="mb-1"
                     >
                       <v-icon size="14" class="mr-1">mdi-check-circle</v-icon>
                       全量索引
                     </v-chip>
                     <v-chip
                       v-else
                       color="warning"
                       size="small"
                       variant="outlined"
                       class="mb-1"
                     >
                       <v-icon size="14" class="mr-1">mdi-alert-circle</v-icon>
                       部分索引
                     </v-chip>
                     <v-chip
                       color="info"
                       size="small"
                       variant="outlined"
                     >
                       已构建索引
                     </v-chip>
                   </div>
                 </template>
               </v-list-item>
             </v-list>
             
             <div v-if="repositories.filter(r => r.hasMemoryFlash).length === 0" class="text-center py-8">
               <v-icon size="48" color="grey-lighten-1">mdi-folder-open</v-icon>
               <p class="text-body-2 text-grey-darken-1 mt-2">暂无已构建索引的仓库</p>
               <p class="text-caption text-grey-darken-2">请先为仓库构建索引后再上传</p>
             </div>
           </div>
           
           <!-- 步骤2：导出索引 -->
           <div v-if="uploadStep === 2">
             <div class="mb-4">
               <h3 class="text-h6 mb-2">📦 导出索引文件</h3>
               <p class="text-body-2 text-grey-darken-1">
                 正在为仓库 "{{ selectedUploadRepo?.name }}" 导出索引文件...
               </p>
             </div>
             
             <v-card variant="outlined" class="pa-4">
               <div class="d-flex align-center">
                 <v-progress-circular indeterminate color="orange" class="mr-3"></v-progress-circular>
                 <div>
                   <div class="font-weight-medium">正在导出索引</div>
                   <div class="text-caption text-grey-darken-1">请稍候，正在打包 .gitgo 目录...</div>
                 </div>
               </div>
             </v-card>
           </div>
           
           <!-- 步骤3：确认上传 -->
           <div v-if="uploadStep === 3">
             <div class="mb-4">
               <p class="text-body-2 text-grey-darken-1">
                 请确认以下信息无误后开始上传
               </p>
             </div>
             
             <v-card variant="outlined" class="mb-4">
               <v-card-text>
                 <v-row>
                   <v-col cols="12" md="6">
                     <div class="mb-2">
                       <strong>仓库名称：</strong>{{ selectedUploadRepo?.name }}
                     </div>
                     <div class="mb-2">
                       <strong>仓库URL：</strong>
                       <a :href="selectedUploadRepo?.repo_url" target="_blank" class="text-decoration-none">
                         {{ selectedUploadRepo?.repo_url }}
                       </a>
                     </div>
                     <div class="mb-2">
                       <strong>描述：</strong>{{ selectedUploadRepo?.desc || '无描述' }}
                     </div>
                   </v-col>
                   <v-col cols="12" md="6">
                     <div class="mb-2">
                       <strong>索引文件：</strong>{{ selectedUploadRepo?.name }}.gitgo.tar.gz
                     </div>
                     <div class="mb-2">
                       <strong>索引类型：</strong>
                       <v-chip
                         :color="selectedUploadRepo?.hasFullIndex ? 'success' : 'warning'"
                         size="small"
                         variant="outlined"
                       >
                         {{ selectedUploadRepo?.hasFullIndex ? '全量索引' : '部分索引' }}
                       </v-chip>
                     </div>
                     <div class="mb-2">
                       <strong>导出路径：</strong>
                       <span class="text-caption">{{ exportedIndexPath }}</span>
                     </div>
                   </v-col>
                 </v-row>
               </v-card-text>
             </v-card>
             
             <!-- 自定义更新描述输入框 -->
             <v-card variant="outlined" class="mb-4">
               <v-card-text>
                 <h4 class="text-h6 mb-3">📝 更新说明</h4>
                 <v-textarea
                   v-model="customUpdateDescription"
                   label="更新描述"
                   placeholder="请输入本次索引更新的说明..."
                   rows="3"
                   counter="200"
                   maxlength="200"
                   variant="outlined"
                   hint="描述此次索引更新的内容和变更"
                 ></v-textarea>
               </v-card-text>
             </v-card>
             
             <v-alert type="info" variant="tonal" class="mb-4">
               <div class="mb-2">
                 <strong>📢 上传须知</strong>
               </div>
               <ul class="text-body-2" style="margin: 0; padding-left: 20px;">
                 <li>上传的索引将存储在你的GitHave AI私人索引库中</li>
                 <li>请确保索引内容不包含敏感信息</li>
                 <li>上传成功后将跳转到GitHave AI控制台</li>
                 <li>您可以在控制台将索引公开发布给所有用户</li>
               </ul>
             </v-alert>
             
             <div v-if="uploadingIndex" class="text-center py-4">
               <v-progress-circular indeterminate color="orange" size="32" class="mb-2"></v-progress-circular>
               <div class="text-body-2">正在上传索引文件...</div>
             </div>
           </div>
         </v-card-text>
         
         <v-card-actions>
           <v-spacer></v-spacer>
           <v-btn color="grey darken-1" variant="text" @click="cancelUploadIndex" :disabled="uploadingIndex">
             取消
           </v-btn>
           <v-btn 
             v-if="uploadStep === 1"
             color="orange" 
             variant="tonal"
             :disabled="!selectedUploadRepo"
             @click="nextUploadStep"
           >
             下一步
           </v-btn>
           <v-btn 
             v-if="uploadStep === 3"
             color="orange" 
             :loading="uploadingIndex"
             @click="nextUploadStep"
           >
             <v-icon class="mr-1">mdi-upload</v-icon>
             确认上传
           </v-btn>
         </v-card-actions>
       </v-card>
     </v-dialog>
   </v-container>
 </template>

<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount, watch, reactive } from "vue";

// 每页显示行数本地存储key
const itemsPerPageKey = 'memorycard_items_per_page'
const itemsPerPage = ref(Number(localStorage.getItem(itemsPerPageKey)) || 5)
// 监听变化写入localStorage
watch(itemsPerPage, (val) => {
  localStorage.setItem(itemsPerPageKey, String(val))
})
// 当前页本地存储key
const currentPageKey = 'memorycard_current_page'
const currentPage = ref(Number(localStorage.getItem(currentPageKey)) || 1)
// 监听变化写入localStorage
watch(currentPage, (val) => {
  localStorage.setItem(currentPageKey, String(val))
})

// GitHave AI 登录相关状态
const isLoggedIn = ref(false)
const loginExpired = ref(false)
const jumpToDash = async () => {
  const fmConfigResponse = await getFmConfig()
  window.open(fmConfigResponse.data.auth_base_url + '/dashboard', '_blank')
}
const githaveUser = reactive({
  user_id: '',
  username: '',
  email: '',
  token: '',
  expires: 0,
  loginTime: 0,
  verified: false
})
const showToken = ref(false)

// 计算属性
const formattedLoginTime = computed(() =>
  githaveUser.loginTime ? new Date(githaveUser.loginTime).toLocaleString() : '—'
)
const formattedExpireTime = computed(() =>
  githaveUser.expires ? new Date(githaveUser.expires).toLocaleString() : '—'
)
const maskedToken = computed(() => {
  const t = githaveUser.token || ''
  if (!t) return '—'
  if (showToken.value) return t
  return t.length > 8 ? `${t.slice(0, 4)}••••${t.slice(-4)}` : '••••'
})

import { VDataTable } from 'vuetify/components';
import { listRepos, listFunctions, buildIndex, deleteIndexApi, incrementalIndex, resetIndexApi, getExcludeApi, updateExcludeApi, getModuleGraphTaskStatus, getFmConfig } from "../service/api.js";
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
interface TaskData {
  percent: number
  completed: number
  total: number
  status: string
}

interface MessageItem {
  date: string
  message: string
  href: string
}

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
  estimating?: boolean; // 是否正在进行索引量估算
  hasFullIndex?: boolean; // 是否已全量构建
  moduleAnalyzing?: boolean; // 是否正在构建模块分析
  taskData?: TaskData;
  totalFileCount?: number | 0;
}

// 声明全局window类型
declare global {
  interface Window {
    electron: any;
  }
}

// 表头定义
// const headers = [
//   { text: '仓库名称', align: 'start', value: 'name' },
//   { text: '描述', align: 'start', value: 'desc' },
//   { text: '已构建函数索引', align: 'center', value: 'hasMemoryFlash' },
//   { text: '函数索引进度', align: 'center', value: 'indexProgress', sortable: false },
//   { text: '操作', align: 'center', value: 'actions', sortable: false },
// ]
const headers = [
  { title: '仓库名称', key: 'name'},
  { title: '描述', key: 'omitDesc', width: '45%'},
  { title: '索引状态', key: 'hasMemoryFlash'},
  { title: '进度/预估函数量', key: 'totalProgress', width: '20%'},
  { title: '操作', key: 'actions', maxWidth: '500px'},
]

const messages = ref<MessageItem[]>([
  // {
  //   date: '2025.5.5',
  //   message:
  //     '目前对Go、Java、Python、C/C++、PHP、JS七种语言，支持了构建"函数级"的精确粒度索引，提高了AI分析这些代码任务的能力',
  //   href: 'https://your.link/3'
  // },
])

const repositories = ref<Repository[]>([]);
const loading = ref(true);
// 搜索相关
const searchQuery = ref('');

// 过滤后的仓库列表
const filteredRepositories = computed(() => {
  if (!searchQuery.value) {
    return repositories.value;
  }
  
  const query = searchQuery.value.toLowerCase().trim();
  return repositories.value.filter(repo => {
    const nameMatch = repo.name.toLowerCase().includes(query);
    const descMatch = repo.desc.toLowerCase().includes(query);
    return nameMatch || descMatch;
  });
});

// 计算总页数
const totalPages = computed(() => {
  const total = filteredRepositories.value.length;
  return Math.max(1, Math.ceil(total / itemsPerPage.value));
});

const fetchRepositories = async () => {
  try {
    loading.value = true;
    const response = await listRepos();
    const repos = response.status === 200 && Array.isArray(response.data) ? response.data.sort((a, b) => b.id - a.id) : response.data;

    repositories.value = await Promise.all(
      repos.map(async (repo: any) => {
        const { exists, indexing, hasFullIndex, moduleAnalyzing } = await (window as any).electron.checkMemoryFlashStatus(repo.local_path);
        if (moduleAnalyzing) {
          // 二次接口判断确认
          const resp = await getModuleGraphTaskStatus('', repo.local_path);
          console.log('getModuleGraphTaskStatus', resp);
          if (resp.data && resp.data.code === 0 && resp.data.data) {
            const taskData = resp.data.data
            taskData.percent = taskData.total > 0 ? Math.round((taskData.completed / taskData.total) * 100) : 0
            console.log('任务数据', taskData)
            if (taskData.status === 'running') {  // 任务正在运行
              repo.moduleAnalyzing = true
            } else {
              repo.moduleAnalyzing = false
            }
            repo.taskData = taskData
            const oldProgress = loadRepoProgress(repo.id);
              const updatedProgress: RepoProgress = {
                functionsTotal: oldProgress?.functionsTotal || 0,
                scannedCount: oldProgress?.scannedCount || 0,
                indexProgress: oldProgress?.indexProgress || 0,
                totalFileCount: taskData.total
              };
              saveRepoProgress(repo.id, updatedProgress);
          } else {
            repo.taskData = null
            repo.moduleAnalyzing = false
          }
        }

        // 新：尝试从 localStorage 读取进度
        const saved = loadRepoProgress(repo.id);
        const fallback: RepoProgress = {
          functionsTotal: 0,
          scannedCount: 0,
          indexProgress: 0,
          totalFileCount: 0
        };
        let { functionsTotal, scannedCount, indexProgress, totalFileCount } = saved || fallback;
        repo.resetText = indexing ? '停止构建' : '重置索引';
        repo.resetIcon = indexing ? 'mdi-stop-circle' : 'mdi-backspace-outline';
        return {
          ...repo,
          omitDesc: repo.desc,
          hasMemoryFlash: exists,
          indexing,
          functionsTotal,
          scannedCount,
          indexProgress,
          loading: indexing,
          hasFullIndex,
          estimating: false, // 初始化为非估算状态
          totalFileCount,
        } as Repository;
      })
    );
  } catch (error) {
    console.error('获取仓库列表失败:', error);
  } finally {
    loading.value = false;
  }
};

const jumpToModuleGraphs = (repo: Repository) => {
  // 二次确认
  if (!confirm(`确定要跳转到仓库 ${repo.name} 的脉络感知页面吗？`)) {
    return;
  }
  localStorage.setItem('projectDir', repo.local_path);
  router.push({
    name: 'moduleGraphs',
    query: {
      repoPath: repo.local_path
    }
  })
}

const clickProgress = async (repo: Repository) => {
  // 防止重复点击，如果当前仓库正在估算中则直接返回
  if (repo.loading || repo.estimating) {
    return;
  }
  
  await store.dispatch('snackbar/showSnackbar', {
    message: `正在扫描函数索引量（较大的仓库可能会花费几分钟）...`,
    color: 'primary'
  });
  await viewProgress(repo)
}

const viewProgress = async (repo: Repository) => {
  // 设置用于估算的特殊标记，防止自动刷新任务重置 loading 状态
  repo.estimating = true;
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
    // repo.scannedCount    = scanned;
    // repo.indexProgress   = progress;

    // 新：保存到 localStorage
    const p: RepoProgress = { functionsTotal: total, scannedCount: scanned, indexProgress: progress, totalFileCount: repo.totalFileCount || 0 };
    saveRepoProgress(repo.id, p);
    console.log('saveRepoProgress', repo.id, p);
    
    // 只有在估算完成后才取消 loading 状态
    repo.loading = false;
    repo.estimating = false;
    
    // 更新repositories数组中对应的仓库，保持其他仓库的引用不变
    const idx = repositories.value.findIndex(r => r.id === repo.id);
    if (idx !== -1) {
      // 直接更新数组中的对象属性，而不是替换整个对象
      Object.assign(repositories.value[idx], {
        functionsTotal: repo.functionsTotal,
        scannedCount: repo.scannedCount,
        indexProgress: repo.indexProgress,
        loading: repo.loading,
        estimating: repo.estimating
      });
    }
    await store.dispatch('snackbar/showSnackbar', {
      message: `${repo.name}(${repo.branch}) 扫描进度已更新`,
      color: 'success'
    });
  } catch (error) {
    console.error(`加载 ${repo.name} 进度失败:`, error);
    // 出错时也需要重置状态
    repo.loading = false;
    repo.estimating = false;
    
    // 更新repositories数组中对应的仓库状态
    const idx = repositories.value.findIndex(r => r.id === repo.id);
    if (idx !== -1) {
      Object.assign(repositories.value[idx], {
        loading: repo.loading,
        estimating: repo.estimating
      });
    }
  }
};



// 检查仓库是否已构建函数索引
const checkMemoryFlashStatus = async (local_path: string): Promise<boolean> => {
  try {
    const { exists, indexing } = await (window as any).electron.checkMemoryFlashStatus(local_path)
    console.log(`仓库 ${local_path} 函数索引状态:`, exists);
    return exists;
  } catch (error) {
    console.error(`检查仓库 ${local_path} 函数索引状态失败:`, error);
    return false;
  }
};

// 构建函数索引
const buildMemoryFlash = async (repo: Repository) => {
  try {
    // 1. 检查是否已构建函数索引
    const { exists, indexing } = await (window as any).electron.checkMemoryFlashStatus(repo.local_path);
    dialogHasIndex.value = exists;
    console.log('hasIndex', exists);

    // 2. 获取函数总量，判断仓库大小
    let total: number = 0
    let scanned: number = 0
    let progress: number = 0
    let saved: RepoProgress | null = loadRepoProgress(repo.id);
    if (saved == null) {
      console.log('从 API 获取进度');
      await store.dispatch('snackbar/showSnackbar', {
        message: `构建全量索引前，首先要扫描函数索引的完整度（较大的仓库可能会花费几分钟）...`,
        color: 'primary'
      });
      await viewProgress(repo)
      saved = await loadRepoProgress(repo.id);
      total = saved?.functionsTotal || 0;
      scanned = saved?.scannedCount || 0;
      progress = saved?.indexProgress || 0;
    } else {
      console.log('从 localStorage 读取进度', saved);
      total = saved.functionsTotal;
      scanned = saved.scannedCount;
      progress = saved.indexProgress;
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
    // 估算扫描时间：扫描每个函数平均需要n秒，则扫描total个函数需要total * n 秒
    const min_n = 0.5
    const max_n = 2
    // 4. 构建确认信息
    let confirmMessage = '';
    if (exists) {
      const left = total - scanned
      // 小数量后2位忽略，自动正则 秒 和 分钟 的转换
      const minEstimatedTime = left * min_n < 60 ? left * min_n + '秒' : (left * min_n / 60).toFixed(0) + '分钟'
      const maxEstimatedTime = left * max_n < 60 ? left * max_n + '秒' : (left * max_n / 60).toFixed(0) + '分钟'
      confirmMessage = `该仓库(${repoSizeType})已构建${scanned}个函数，还剩${left}，完整度为${progress}%。是否重新构建函数索引？
      预计需要花费${minEstimatedTime}~${maxEstimatedTime}。`;
    } else {
      // 小数量后2位忽略，自动正则 秒 和 分钟 的转换
      const minEstimatedTime = total * min_n < 60 ? total * min_n + '秒' : (total * min_n / 60).toFixed(0) + '分钟'
      const maxEstimatedTime = total * max_n < 60 ? total * max_n + '秒' : (total * max_n / 60).toFixed(0) + '分钟'
      confirmMessage = `该仓库为${repoSizeType}，包含${total}个函数，预计需要花费${minEstimatedTime}~${maxEstimatedTime}。`;
      if (canBuildFullIndex) {
        confirmMessage += '是否构建函数索引？';
      } else {
        confirmMessage += `为了节省电脑性能，对于大于1000个函数的仓库，建议你
        1. 使用云端模型构建函数索引，
        2. 从社区一键导入索引，
        3. 从‘空间透镜’自行批量构建索引。
        是否继续构建？`;
      }
    }
    if (!dialogHasIndex.value && progress > 0 && progress < 100) {
      dialogBuildButton.value = "继续构建"
    }
    if (dialogHasIndex.value && progress >= 100) {
      dialogBuildButton.value = "更新"
    }

    // 5. 设置对话框数据并显示
    dialogTitle.value = '构建函数索引确认';
    dialogMessage.value = confirmMessage;
    dialogRepo.value = repo;
    dialogProgress.value = progress;
    dialogFunctionsTotal.value = total;
    dialogScannedCount.value = scanned;
    dialogRepoSizeType.value = repoSizeType;
    dialogCanBuildFullIndex.value = canBuildFullIndex;
    dialogVisible.value = true;

  } catch (error) {
    console.error(`构建函数索引失败:`, error);
  } finally {
  }
};

// 确认构建函数索引
const confirmBuildIndex = async () => {
  if (!dialogRepo.value) return;

  try {
    const { exists, indexing } = await (window as any).electron.checkMemoryFlashStatus(dialogRepo.value.local_path);
    dialogVisible.value = false
    console.log('if should rebuild', indexing, dialogProgress.value)
    if (!Array.isArray(dialogRepo.value.excludeRule)) {
      dialogRepo.value.excludeRule = [];
    }
    console.log('ruleeeeeeeeee', dialogRepo.value.excludeRule)
    await updateExcludeApi(dialogRepo.value.local_path, dialogRepo.value.excludeRule)
    // if (indexing && dialogProgress.value >=100) {
    //   console.log('增量更新', dialogRepo.value)
    //   await deleteRepo(dialogRepo.value)
    // }
    await store.dispatch('snackbar/showSnackbar', {
      message: `正在构建${dialogRepo.value.name}(${dialogRepo.value.desc}) 的函数索引...`,
      color: 'primary'
    });

    dialogRepo.value.resetText = '强制停止';
    dialogRepo.value.resetIcon = 'mdi-stop-circle';
    dialogRepo.value.loading = true;
    dialogRepo.value.indexing = true;
    dialogRepo.value.hasFullIndex = false;

    // 调用构建函数索引API
    const response = await buildIndex(dialogRepo.value.local_path, '');
    console.log('buildIndex response', response)
    if (response.status === 200 && response.data.code === 0) {
      await store.dispatch('snackbar/showSnackbar', {
        message: `${dialogRepo.value.name}(${dialogRepo.value.desc}) 的函数索引已构建完成，正在开始分析模块，前往“脉络感知”查看进度...`,
        color: 'success'
      });
      dialogRepo.value.moduleAnalyzing = true;
    } else {
      await store.dispatch('snackbar/showSnackbar', {
        message: `${dialogRepo.value.name}(${dialogRepo.value.desc}) 的函数索引构建失败，错误信息：${response.data.message}`,
        color: 'error'
      });
    }
    dialogRepo.value.resetText = '重置索引';
    dialogRepo.value.resetIcon = 'mdi-backspace-outline';
    // 更新状态
    const index = repositories.value.findIndex(r => r.id === dialogRepo.value!.id);
    if (index !== -1) {
      repositories.value[index].hasMemoryFlash = true;
    }
    dialogVisible.value = false;
  } catch (error) {
    console.error(`构建函数索引失败:`, error);
  }
};

// 取消构建函数索引
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

// 跳转到仓库身份证页面
const jumpToRepo = async () => {
  // 跳转到仓库身份证页面
  router.push({
    path: '/repo'
  })
}


const exportMemoryFlash = async (repo: Repository) => {
  try {
    // 二次确认
    const confirmed = window.confirm(`确定要导出“${repo.name}”的函数索引吗？`)
    if (!confirmed) return
    const path = await (window as any).electron.path
    repo.loading = true;
    const tarGzFile = path.join(repo.local_path, `${repo.name}.gitgo.tar.gz`);
    const {success, message} = await (window as any).electron.tarGzFiles(path.join(repo.local_path, '.gitgo'), tarGzFile);
    if (success) {
      store.dispatch('snackbar/showSnackbar', {
        message: `导出函数索引成功: ${tarGzFile}`,
        color: 'success'
      });
      // 跳转至文件夹
      (window as any).electron.shell.openPath(path.dirname(tarGzFile));
    } else {
      store.dispatch('snackbar/showSnackbar', {
        message: `导出函数索引失败: ${message}`,
        color: 'error'
      });
    }
    repo.loading = false;
  } catch (error) {
    console.error(`导出函数索引失败:`, error);
    repo.loading = false;
  }
};

// 定时器 ID
let intervalId: NodeJS.Timeout | undefined = undefined;

// 定时任务：每5秒刷新一次
const startAutoRefresh = () => {
  intervalId = setInterval(async () => {
    try {
      // 遍历所有仓库，获取最新的索引进度
      for (const repo of repositories.value) {
        if (repo.estimating) continue;
        let scannedCount = 0
        if (repo.local_path) {
          try {
            const fn = await listFunctions(repo.local_path, true); // 加上 `true` 作为参数
            scannedCount = fn.data.data;
            //如果fn.data.data不是数字类型，则跳过
            if (typeof scannedCount !== 'number') {
              console.log('fn.data.data is not a number', fn.data.data);
              continue;
            }
          } catch (error) {
            console.warn('获取仓库函数列表失败:', error);
            continue;
          }

          const repoIndex = repositories.value.findIndex((r) => r.id === repo.id);
          if (repoIndex === -1) continue;

          const currentRepo = repositories.value[repoIndex];

          // 优先检查 hasFullIndex
          const status = await (window as any).electron.checkMemoryFlashStatus(repo.local_path);
          if (status.moduleAnalyzing) {
            // 二次接口判断确认
            const resp = await getModuleGraphTaskStatus('', repo.local_path);
            if (resp.data && resp.data.code === 0 && resp.data.data) {
              const taskData = resp.data.data
              taskData.percent = taskData.total > 0 ? Math.round((taskData.completed / taskData.total) * 100) : 0
              console.log('startAutoRefresh 任务数据', taskData)
              if (taskData.status === 'running') {  // 任务正在运行
                currentRepo.moduleAnalyzing = true
              } else {
                currentRepo.moduleAnalyzing = false
              }
              currentRepo.taskData = taskData
              const oldProgress = loadRepoProgress(repo.id);
              const updatedProgress: RepoProgress = {
                functionsTotal: oldProgress?.functionsTotal || 0,
                scannedCount: oldProgress?.scannedCount || 0,
                indexProgress: oldProgress?.indexProgress || 0,
                totalFileCount: taskData.total
              };
              saveRepoProgress(repo.id, updatedProgress);
            } else {
              currentRepo.taskData = undefined
              currentRepo.moduleAnalyzing = false
            }
          } else {
            currentRepo.moduleAnalyzing = false
            currentRepo.taskData = undefined
          }
          currentRepo.hasMemoryFlash = status.exists;
          currentRepo.hasFullIndex = status.hasFullIndex;

          if (status.hasFullIndex) {
            // 索引已完成，直接标记并跳过其它进度逻辑
            currentRepo.loading = false;
            currentRepo.indexing = false;
            currentRepo.indexProgress = 100;
            currentRepo.scannedCount = scannedCount;
            // 依然保存一次进度到 localStorage
            const oldProgress = loadRepoProgress(repo.id);
            let updatedProgress = {
              functionsTotal: oldProgress?.functionsTotal || currentRepo.functionsTotal || 0,
              scannedCount: scannedCount,
              indexProgress: 100,
              totalFileCount: oldProgress?.totalFileCount || currentRepo.totalFileCount || 0
            };
            saveRepoProgress(repo.id, updatedProgress);
            continue;
          }

          // 未完成索引才继续后续进度逻辑
          const oldProgress = loadRepoProgress(repo.id);
          if (oldProgress != null) {
            const progress =
              oldProgress.functionsTotal > 0
                ? Math.floor((scannedCount / oldProgress.functionsTotal) * 100)
                : 0;
            let updatedProgress = {
              functionsTotal: oldProgress.functionsTotal,
              scannedCount: scannedCount,
              indexProgress: progress,
              totalFileCount: oldProgress.totalFileCount
            };
            saveRepoProgress(repo.id, updatedProgress);

            if (oldProgress.functionsTotal != 0) {
              currentRepo.loading = status.indexing;
              currentRepo.indexing = status.indexing;
            }
          }
          // 更新 repositories 中的数据
          currentRepo.scannedCount = scannedCount;
          if (currentRepo.functionsTotal > 0) {
            currentRepo.indexProgress = Math.floor(
              (scannedCount / currentRepo.functionsTotal) * 100
            );
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


// GitHave AI 登录相关方法
const copyToClipboard = async (text: string) => {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    store.dispatch('snackbar/showSnackbar', { message: '已复制到剪贴板', color: 'success' })
  } catch (e) {
    console.error('复制失败:', e)
    store.dispatch('snackbar/showSnackbar', { message: '复制失败，请重试', color: 'error' })
  }
}

const checkGithaveLoginStatus = async () => {
  try {
    const loginData = localStorage.getItem('githave_login_data')
    if (loginData) {
      const userData = JSON.parse(loginData)
      if (userData.token && userData.expires > Date.now()) {
        isLoggedIn.value = true
        loginExpired.value = false
        Object.assign(githaveUser, {
          user_id: userData.user_id || '',
          username: userData.username || '',
          email: userData.email || '',
          token: userData.token || '',
          expires: userData.expires || 0,
          loginTime: userData.loginTime || 0,
          verified: userData.verified || false
        })
        return true
      } else if (userData.expires <= Date.now()) {
        localStorage.removeItem('githave_login_data')
        loginExpired.value = true
        isLoggedIn.value = false
        Object.assign(githaveUser, {
          user_id: userData.user_id || '',
          username: userData.username || '',
          email: userData.email || '',
          token: userData.token || '',
          expires: userData.expires || 0,
          loginTime: userData.loginTime || 0,
          verified: userData.verified || false
        })
      }
    }
    if (!isLoggedIn.value && !loginExpired.value) {
      Object.assign(githaveUser, {
        user_id: '',
        username: '',
        email: '',
        token: '',
        expires: 0,
        loginTime: 0,
        verified: false
      })
    }
    return false
  } catch (error) {
    console.error('检查GitHave登录状态失败:', error)
    localStorage.removeItem('githave_login_data')
    isLoggedIn.value = false
    loginExpired.value = false
    Object.assign(githaveUser, {
      user_id: '',
      username: '',
      email: '',
      token: '',
      expires: 0,
      loginTime: 0,
      verified: false
    })
    return false
  }
}

const loginToGithave = async () => {
  try {
    const authUrl = 'http://localhost:3000/app/auth?callback=githave-desktop'
    if ((window as any).electron && (window as any).electron.shell && (window as any).electron.shell.openExternal) {
      await (window as any).electron.shell.openExternal(authUrl)
      store.dispatch('snackbar/showSnackbar', {
        message: '正在打开浏览器登录页面，请完成登录后返回...',
        color: 'info'
      })
    } else {
      window.open(authUrl, '_blank')
      store.dispatch('snackbar/showSnackbar', {
        message: '正在打开浏览器登录页面，请完成登录后返回...',
        color: 'info'
      })
    }
  } catch (error) {
    console.error('打开外部浏览器失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: '打开登录页面失败，请重试',
      color: 'error'
    })
  }
}

const logoutGithave = async () => {
  const confirmed = window.confirm('确认退出 GitHave 登录？')
  if (!confirmed) return
  
  try {
    localStorage.removeItem('githave_login_data')
    isLoggedIn.value = false
    showToken.value = false
    Object.assign(githaveUser, {
      user_id: '',
      username: '',
      email: '',
      token: '',
      expires: 0,
      loginTime: 0,
      verified: false
    })
    store.dispatch('snackbar/showSnackbar', {
      message: '已退出 GitHave 登录',
      color: 'success'
    })
  } catch (error) {
    console.error('退出登录失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: '退出登录失败，请重试',
      color: 'error'
    })
  }
}

const openGithaveWebsite = async () => {
  try {
    const websiteUrl = 'http://localhost:3000'
    if ((window as any).electron && (window as any).electron.shell && (window as any).electron.shell.openExternal) {
      await (window as any).electron.shell.openExternal(websiteUrl)
    } else {
      window.open(websiteUrl, '_blank')
    }
  } catch (error) {
    console.error('打开GitHave网站失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: '打开网站失败，请重试',
      color: 'error'
    })
  }
}

// 导入索引弹窗相关状态
const importDialogVisible = ref(false)
const githubRepositories = ref<Repository[]>([])
const selectedRepo = ref<Repository | null>(null)
const publicIndexStatus = ref<{[key: number]: boolean | null}>({})

// 排序后的GitHub仓库列表（有公共索引的排在前面）
const sortedGithubRepositories = computed(() => {
  return [...githubRepositories.value].sort((a, b) => {
    const aStatus = publicIndexStatus.value[a.id]
    const bStatus = publicIndexStatus.value[b.id]
    
    // 有公共索引的排在前面
    if (aStatus === true && bStatus !== true) return -1
    if (bStatus === true && aStatus !== true) return 1
    
    // 其他情况按原顺序
    return 0
  })
})

// 检查仓库是否有公共索引
const checkPublicIndexStatus = async (repo: Repository) => {
  try {
    const fmConfigResponse = await getFmConfig()
    const apiUrlSimple = fmConfigResponse.data?.api_url_simple || 'http://localhost:5202'
    
    // 如果repo_url没有值，则使用repo.name搜索
    const searchQuery = repo.repo_url || repo.name
    const searchUrl = `${apiUrlSimple}/api/v1/search?q=${encodeURIComponent(searchQuery)}&page=1&limit=1000`
    
    const response = await fetch(searchUrl)
    const data = await response.json()
    
    // 检查返回的数据中是否有匹配的仓库
    const hasPublicIndex = Array.isArray(data.data.list) && data.data.list.some(item => {
      if (repo.repo_url) {
        // 如果有repo_url，按URL匹配
        return item.url && item.url.toLowerCase() === repo.repo_url.toLowerCase()
      } else {
        // 如果没有repo_url，按名称匹配
        return item.title && item.title.toLowerCase() === repo.name.toLowerCase()
      }
    })
    
    publicIndexStatus.value[repo.id] = hasPublicIndex
    return hasPublicIndex
  } catch (error) {
    console.error(`检查仓库 ${repo.name} 公共索引状态失败:`, error)
    publicIndexStatus.value[repo.id] = false
    return false
  }
}

// 从GitHave AI导入索引
const importIndexFromGithave = async () => {
  // 检查登录状态
  if (!isLoggedIn.value) {
    store.dispatch('snackbar/showSnackbar', {
      message: '请先登录GitHave AI账户',
      color: 'warning'
    })
    return
  }
  
  try {
    // 获取当前仓库列表
    const allRepos = repositories.value
    
    // 过滤出URL仓库
    // const githubRepos = allRepos.filter(repo => {
    //   return repo.repo_url && repo.repo_url.includes('github.com')
    // })
    const githubRepos = allRepos
    
    if (githubRepos.length === 0) {
      store.dispatch('snackbar/showSnackbar', {
        message: '当前没有GitHub仓库，无法导入索引',
        color: 'warning'
      })
      return
    }
    
    // 设置GitHub仓库列表并显示选择弹窗
    githubRepositories.value = githubRepos
    importDialogVisible.value = true
    
    // 异步检查每个仓库的公共索引状态
    githubRepos.forEach(repo => {
      publicIndexStatus.value[repo.id] = null // 设置为加载状态
      checkPublicIndexStatus(repo)
    })
    
  } catch (error) {
    console.error('获取仓库列表失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: '获取仓库列表失败，请重试',
      color: 'error'
    })
  }
}

// 确认导入选中的仓库索引
const confirmImportIndex = async () => {
  if (!selectedRepo.value) {
    store.dispatch('snackbar/showSnackbar', {
      message: '请选择要导入索引的仓库',
      color: 'warning'
    })
    return
  }
  
  try {
    let username, repoName
    
    if (selectedRepo.value.repo_url) {
      // 解析GitHub URL获取用户名和仓库名
      const repoUrl = selectedRepo.value.repo_url
      const githubMatch = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/)
      
      if (!githubMatch) {
        store.dispatch('snackbar/showSnackbar', {
          message: 'GitHub URL格式不正确',
          color: 'error'
        })
        return
      }
      
      username = githubMatch[1]
      repoName = githubMatch[2]
    } else {
      // 如果没有repo_url，从githave_login_data获取用户名
      const loginData = JSON.parse(localStorage.getItem('githave_login_data') || '{}')
      username = loginData.username
      
      if (!username) {
        store.dispatch('snackbar/showSnackbar', {
          message: '未找到用户名信息，请先登录',
          color: 'error'
        })
        return
      }
      
      repoName = selectedRepo.value.name
    }
    
    // 获取fm配置中的auth_base_url
    const fmConfigResponse = await getFmConfig()
    const authBaseUrl = fmConfigResponse.data?.auth_base_url || 'http://localhost:3000'
    
    // 构建导入URL
    const importUrl = `${authBaseUrl}/${username}/${repoName}`
    
    // 打开外部浏览器
    if ((window as any).electron && (window as any).electron.shell && (window as any).electron.shell.openExternal) {
      await (window as any).electron.shell.openExternal(importUrl)
      store.dispatch('snackbar/showSnackbar', {
        message: `正在打开GitHave AI导入页面：${username}/${repoName}`,
        color: 'info'
      })
    } else {
      window.open(importUrl, '_blank')
      store.dispatch('snackbar/showSnackbar', {
        message: `正在打开GitHave AI导入页面：${username}/${repoName}`,
        color: 'info'
      })
    }
    
    // 关闭弹窗
    importDialogVisible.value = false
    selectedRepo.value = null
    
  } catch (error) {
    console.error('导入索引失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: '打开导入页面失败，请重试',
      color: 'error'
    })
  }
}

// 取消导入
const cancelImportIndex = () => {
  importDialogVisible.value = false
  selectedRepo.value = null
}

// 上传索引弹窗相关状态
const uploadIndexDialogVisible = ref(false)
const uploadStep = ref(1)
const selectedUploadRepo = ref<Repository | null>(null)
const exportedIndexPath = ref('')
const uploadingIndex = ref(false)
const customUpdateDescription = ref('通过上传功能自动更新索引')

// 上传并发布索引
const uploadIndexToGithave = async () => {
  // 检查登录状态
  if (!isLoggedIn.value) {
    store.dispatch('snackbar/showSnackbar', {
      message: '请先登录GitHave AI账户',
      color: 'warning'
    })
    return
  }
  
  // 重置状态并显示弹窗
  uploadStep.value = 1
  selectedUploadRepo.value = null
  exportedIndexPath.value = ''
  uploadIndexDialogVisible.value = true
}

// 选择要上传的仓库
const selectUploadRepository = (repo: Repository) => {
  selectedUploadRepo.value = repo
}

// 进入下一步
const nextUploadStep = async () => {
  console.log('=== nextUploadStep 被调用，当前步骤:', uploadStep.value)
  
  if (uploadStep.value === 1) {
    console.log('处理步骤1：选择仓库')
    if (!selectedUploadRepo.value) {
      console.log('错误：未选择仓库')
      store.dispatch('snackbar/showSnackbar', {
        message: '请选择要上传的仓库',
        color: 'warning'
      })
      return
    }
    
    console.log('选中的仓库:', selectedUploadRepo.value.name)
    
    // 检查是否已全量构建
    if (!selectedUploadRepo.value.hasFullIndex) {
      console.log('仓库未全量构建，弹出确认框')
      const confirmed = window.confirm(
        `仓库"${selectedUploadRepo.value.name}"尚未完成全量构建，可能影响索引质量。\n\n是否继续上传？`
      )
      if (!confirmed) {
        console.log('用户取消上传')
        return
      }
    }
    
    console.log('步骤1完成，进入步骤2')
    uploadStep.value = 2
    
    // 立即开始导出
    console.log('自动开始导出索引')
    await exportIndexForUpload()
    
  } else if (uploadStep.value === 2) {
    console.log('处理步骤2：导出索引（不应该到这里）')
    // 这个分支不应该被执行，因为步骤2会自动处理
    await exportIndexForUpload()
  } else if (uploadStep.value === 3) {
    console.log('处理步骤3：开始上传')
    // 开始上传
    await uploadIndexToServer()
  }
  
  console.log('=== nextUploadStep 执行完成，当前步骤:', uploadStep.value)
}

// 导出索引用于上传
const exportIndexForUpload = async () => {
  console.log('=== 开始导出索引用于上传 ===')
  
  if (!selectedUploadRepo.value) {
    console.log('错误: 未选择仓库')
    return
  }
  
  try {
    const repo = selectedUploadRepo.value
    console.log('选中的仓库:', repo)
    
    const path = await (window as any).electron.path
    console.log('获取path模块成功')
    
    const tarGzFile = path.join(repo.local_path, `${repo.name}.gitgo.tar.gz`)
    console.log('目标文件路径:', tarGzFile)
    
    store.dispatch('snackbar/showSnackbar', {
      message: '正在导出索引文件...',
      color: 'info'
    })
    
    // 检查.gitgo目录是否存在
    const gitgoPath = path.join(repo.local_path, '.gitgo')
    console.log('检查索引目录:', gitgoPath)
    
    // 简化检查逻辑，直接使用同步方法
    try {
      const fs = window.electron.fs
      if (!fs.existsSync(gitgoPath)) {
        console.log('索引目录不存在:', gitgoPath)
        store.dispatch('snackbar/showSnackbar', {
          message: '未找到索引目录，请先构建索引',
          color: 'error'
        })
        uploadStep.value = 1
        return
      }
      console.log('索引目录存在，开始打包')
    } catch (fsError) {
      console.log('检查目录时出错，使用electron方法:', fsError)
      // 如果fs模块不可用，直接尝试打包
    }
    
    console.log('调用tarGzFiles方法...')
    console.log('源目录:', gitgoPath)
    console.log('目标文件:', tarGzFile)
    
    const result = await (window as any).electron.tarGzFiles(
      gitgoPath, 
      tarGzFile
    )
    
    console.log('tarGzFiles调用完成，结果:', result)
    
    if (result && result.success) {
      console.log('导出成功，设置路径和步骤')
      exportedIndexPath.value = tarGzFile
      uploadStep.value = 3
      store.dispatch('snackbar/showSnackbar', {
        message: '索引导出成功，请确认信息后上传',
        color: 'success'
      })
    } else {
      const errorMsg = result?.message || '导出失败'
      console.log('导出失败:', errorMsg)
      store.dispatch('snackbar/showSnackbar', {
        message: `导出失败: ${errorMsg}`,
        color: 'error'
      })
      uploadStep.value = 1
    }
  } catch (error) {
    console.error('导出索引异常:', error)
    console.error('错误堆栈:', error.stack)
    store.dispatch('snackbar/showSnackbar', {
      message: `导出索引失败: ${error.message || '未知错误'}`,
      color: 'error'
    })
    uploadStep.value = 1
  }
  
  console.log('=== 导出索引流程结束 ===')
}

// 上传索引到服务器
const uploadIndexToServer = async () => {
  if (!selectedUploadRepo.value || !exportedIndexPath.value) return
  
  uploadingIndex.value = true
  
  try {
    const repo = selectedUploadRepo.value
    const fmConfigResponse = await getFmConfig()
    const apiUrlSimple = fmConfigResponse.data?.api_url_simple || 'http://localhost:5202'
    
    // 创建FormData
    const formData = new FormData()
    
    // 读取导出的文件
    const fileBuffer = await (window as any).electron.readFile(exportedIndexPath.value, { encoding: null })
    const file = new File([fileBuffer], `${repo.name}.gitgo.tar.gz`, {
      type: 'application/gzip'
    })
    
    formData.append('file', file)
    formData.append('url', repo.repo_url)
    formData.append('name', repo.name)
    formData.append('description', repo.desc || '')
    
    // 获取JWT token
    const loginData = JSON.parse(localStorage.getItem('githave_login_data') || '{}')
    const token = loginData.token
    
    // 上传到服务器
    const uploadUrl = `${apiUrlSimple}/api/v1/repositories/upload`
    const headers = {
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: formData
    })
    
    if (response.ok) {
      store.dispatch('snackbar/showSnackbar', {
        message: '索引上传成功！正在跳转到控制台...',
        color: 'success'
      })
      
      // 关闭弹窗
      uploadIndexDialogVisible.value = false
      
      // 跳转到控制台
      setTimeout(async () => {
        const authBaseUrl = fmConfigResponse.data?.auth_base_url || 'http://localhost:3000'
        const dashboardUrl = `${authBaseUrl}/repository-manager`
        
        if ((window as any).electron && (window as any).electron.shell && (window as any).electron.shell.openExternal) {
          await (window as any).electron.shell.openExternal(dashboardUrl)
        } else {
          window.open(dashboardUrl, '_blank')
        }
      }, 1500)
      
    } else {
      const errorData = await response.json()
      
      // 如果返回EXIST状态码，说明仓库已存在，需要调用更新索引接口
      if (errorData.code === 'EXIST') {
        console.log('仓库已存在，尝试更新索引')
        
        try {
          // 调用更新索引接口
          const updateFormData = new FormData()
          updateFormData.append('file', file)
          updateFormData.append('repository_id', errorData.details.existing_repo_id)
          updateFormData.append('description', customUpdateDescription.value || '通过上传功能自动更新索引')
          
          const updateUrl = `${apiUrlSimple}/api/v1/repositories/index/update`
          const updateResponse = await fetch(updateUrl, {
            method: 'POST',
            headers: {
              ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: updateFormData
          })
          
          if (updateResponse.ok) {
            store.dispatch('snackbar/showSnackbar', {
              message: '检测到仓库已存在，已自动更新索引！正在跳转到控制台...',
              color: 'success'
            })
            
            // 关闭弹窗
            uploadIndexDialogVisible.value = false
            
            // 跳转到控制台
            setTimeout(async () => {
              const authBaseUrl = fmConfigResponse.data?.auth_base_url || 'http://localhost:3000'
              const dashboardUrl = `${authBaseUrl}/repository-manager`
              
              if ((window as any).electron && (window as any).electron.shell && (window as any).electron.shell.openExternal) {
                await (window as any).electron.shell.openExternal(dashboardUrl)
              } else {
                window.open(dashboardUrl, '_blank')
              }
            }, 1500)
          } else {
            const updateErrorData = await updateResponse.json()
            store.dispatch('snackbar/showSnackbar', {
              message: updateErrorData.error || '更新索引失败，请重试',
              color: 'error'
            })
          }
        } catch (updateError) {
          console.error('更新索引失败:', updateError)
          store.dispatch('snackbar/showSnackbar', {
            message: '更新索引失败，请重试',
            color: 'error'
          })
        }
      } else {
        store.dispatch('snackbar/showSnackbar', {
          message: errorData.error || '上传失败，请重试',
          color: 'error'
        })
      }
    }
  } catch (error) {
    console.error('上传索引失败:', error)
    store.dispatch('snackbar/showSnackbar', {
      message: '上传失败，请重试',
      color: 'error'
    })
  } finally {
    uploadingIndex.value = false
  }
}

// 取消上传
const cancelUploadIndex = () => {
  uploadIndexDialogVisible.value = false
  uploadStep.value = 1
  selectedUploadRepo.value = null
  exportedIndexPath.value = ''
  customUpdateDescription.value = '通过上传功能自动更新索引'
}

// 协议回调处理
const handleProtocolCallback = async (data: any) => {
  console.log('收到协议回调:', data)
  if (data && data.type === 'githave-auth' && data.success) {
    // 登录成功，保存用户数据
    const userData = {
      user_id: data.user_id || '',
      username: data.username || '',
      email: data.email || '',
      token: data.token || '',
      expires: data.expires || 0,
      loginTime: Date.now(),
      verified: data.verified || false
    }
    
    localStorage.setItem('githave_login_data', JSON.stringify(userData))
    
    // 更新组件状态
    isLoggedIn.value = true
    loginExpired.value = false
    Object.assign(githaveUser, userData)
    
    // 刷新GitHave AI组件状态
    await checkGithaveLoginStatus()
    
    store.dispatch('snackbar/showSnackbar', {
      message: `欢迎回来，${userData.username || '用户'}！`,
      color: 'success'
    })
    
    // 刷新仓库列表
    await fetchRepositories()
  } else if (data && data.type === 'githave-auth' && !data.success) {
    // 登录失败
    store.dispatch('snackbar/showSnackbar', {
      message: data.message || '登录失败，请重试',
      color: 'error'
    })
  }
}

// 协议监听器清理函数
let protocolListenerCleanup: (() => void) | null = null

// 组件挂载时获取仓库列表
onMounted(() => {
  fetchRepositories();
  startAutoRefresh();
  checkGithaveLoginStatus();
  
  // 监听协议回调 - 使用返回的清理函数
  if ((window as any).electron && (window as any).electron.onProtocolUrl) {
    protocolListenerCleanup = (window as any).electron.onProtocolUrl(handleProtocolCallback)
  }
});

// 组件卸载时清除定时器
onBeforeUnmount(() => {
  stopAutoRefresh();
  
  // 移除协议监听器 - 只移除当前组件注册的监听器
  if (protocolListenerCleanup) {
    protocolListenerCleanup()
    protocolListenerCleanup = null
  }
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

/* GitHave AI 用户信息卡片样式 */
.githave-user-card {
  border-radius: 12px;
  transition: all 0.3s ease;
}

.githave-user-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.githave-user-card .a-tag {
  margin: 2px;
  border-radius: 6px;
}

.githave-user-card .a-button {
  border-radius: 6px;
}

/* 夜间模式适配 - GitHave AI 用户卡片 */
.v-theme--dark .githave-user-card {
  background: linear-gradient(90deg, rgba(33, 37, 41, 0.8) 10%, rgba(46, 125, 50, 0.15) 100%) !important;
  border-color: rgba(76, 175, 80, 0.6) !important;
}

.v-theme--dark .githave-user-card:hover {
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
}

/* GitHave AI 索引库推广卡片样式 */
.githave-subscription-card {
  border-radius: 16px;
  transition: all 0.3s ease;
  box-shadow: 0 6px 20px rgba(255, 215, 0, 0.2);
}

.githave-subscription-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(255, 215, 0, 0.3);
}

.githave-subscription-title {
  padding-bottom: 8px;
}

.githave-subscription-title .title-text {
  font-size: 1.1rem;
  color: #1976d2;
}

.githave-subscription-card .gap-2 {
  gap: 8px;
}

.githave-subscription-card .a-button {
  border-radius: 8px;
  font-weight: 500;
}

/* 夜间模式适配 - GitHave AI 推广卡片 */
.v-theme--dark .githave-subscription-card {
  background: linear-gradient(90deg, rgba(255, 193, 7, 0.1) 60%, rgba(33, 37, 41, 0.8) 100%) !important;
  border-color: rgba(255, 193, 7, 0.6) !important;
  box-shadow: 0 6px 20px rgba(255, 193, 7, 0.15);
}

.v-theme--dark .githave-subscription-card:hover {
  box-shadow: 0 8px 25px rgba(255, 193, 7, 0.25);
}

.v-theme--dark .githave-subscription-title .title-text {
  color: #90CAF9 !important;
}

/* 功能卡片样式 */
.function-card {
  border-radius: 12px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.function-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.function-card:active {
  transform: translateY(-2px);
}

.import-card:hover {
  box-shadow: 0 8px 25px rgba(76, 175, 80, 0.3);
}

.upload-card:hover {
  box-shadow: 0 8px 25px rgba(255, 152, 0, 0.3);
}

.function-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(205, 205, 205, 0.3), transparent);
  transition: left 0.5s;
}

.function-card:hover::before {
  left: 100%;
}

/* 夜间模式适配 - 功能卡片 */
.v-theme--dark .function-card::before {
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
}

.v-theme--dark .import-card {
  background: linear-gradient(135deg, rgba(46, 125, 50, 0.2) 0%, rgba(33, 37, 41, 0.8) 100%) !important;
  border-color: rgba(76, 175, 80, 0.6) !important;
}

.v-theme--dark .upload-card {
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.2) 0%, rgba(33, 37, 41, 0.8) 100%) !important;
  border-color: rgba(255, 152, 0, 0.6) !important;
}

.v-theme--dark .import-card:hover {
  box-shadow: 0 8px 25px rgba(76, 175, 80, 0.25);
}

.v-theme--dark .upload-card:hover {
  box-shadow: 0 8px 25px rgba(255, 152, 0, 0.25);
}

/* 导入索引弹窗样式 */
.max-height-300 {
  max-height: 300px;
}

.v-list-item--active {
  background-color: rgba(76, 175, 80, 0.1) !important;
}

.v-list-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

/* 夜间模式适配 - 列表项 */
.v-theme--dark .v-list-item--active {
  background-color: rgba(76, 175, 80, 0.2) !important;
}

.v-theme--dark .v-list-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

/* 公共索引状态标签样式 */
.public-index-available {
  background: linear-gradient(45deg, #4CAF50, #66BB6A) !important;
  color: white !important;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
}

.public-index-unavailable {
  background-color: #f5f5f5 !important;
  color: #9e9e9e !important;
  border: 1px solid #e0e0e0 !important;
}

.loading-chip {
  background-color: #fafafa !important;
  color: #757575 !important;
}

/* 夜间模式适配 - 状态标签 */
.v-theme--dark .public-index-unavailable {
  background-color: rgba(66, 66, 66, 0.8) !important;
  color: rgba(255, 255, 255, 0.6) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
}

.v-theme--dark .loading-chip {
  background-color: rgba(66, 66, 66, 0.8) !important;
  color: rgba(255, 255, 255, 0.7) !important;
}

/* 夜间模式适配 - Ant Design 按钮 */
.v-theme--dark .ant-btn,
.v-theme--dark .a-button {
  color: rgba(255, 255, 255, 0.85) !important;
}

.v-theme--dark .ant-btn-dashed,
.v-theme--dark .a-button.ant-btn-dashed,
.v-theme--dark .ant-btn[type="dashed"] {
  background-color: transparent !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
  color: rgba(255, 255, 255, 0.85) !important;
}

.v-theme--dark .ant-btn-dashed:hover,
.v-theme--dark .a-button.ant-btn-dashed:hover,
.v-theme--dark .ant-btn[type="dashed"]:hover {
  background-color: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.5) !important;
  color: rgba(255, 255, 255, 0.95) !important;
}

.v-theme--dark .ant-btn-dashed:focus,
.v-theme--dark .a-button.ant-btn-dashed:focus,
.v-theme--dark .ant-btn[type="dashed"]:focus {
  background-color: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.5) !important;
  color: rgba(255, 255, 255, 0.95) !important;
}

.v-theme--dark .ant-btn-dangerous,
.v-theme--dark .a-button[danger] {
  color: #ff7875 !important;
  border-color: #ff7875 !important;
}

.v-theme--dark .ant-btn-dangerous:hover,
.v-theme--dark .a-button[danger]:hover {
  background-color: rgba(255, 120, 117, 0.1) !important;
  border-color: #ff4d4f !important;
  color: #ff4d4f !important;
}

/* 深度覆盖 - 确保样式生效 */
.v-theme--dark >>> .ant-btn-dashed {
  background-color: transparent !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
  color: rgba(255, 255, 255, 0.85) !important;
}

.v-theme--dark >>> .ant-btn-dashed:hover {
  background-color: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.5) !important;
  color: rgba(255, 255, 255, 0.95) !important;
}

/* 上传索引弹窗样式 */
.max-height-400 {
  max-height: 400px;
}

.upload-step-card {
  border-radius: 12px;
  transition: all 0.3s ease;
}

.upload-step-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.table-scroll {
  width: 100%;
  overflow-x: auto;
}

.v-data-table {
  min-width: 100%;
  table-layout: fixed;
}

.v-data-table :deep(th),
.v-data-table :deep(td) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.v-data-table :deep(th) {
  position: sticky;
  top: 0;
  z-index: 2;
}

/* Keep existing styles */
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
</style>
