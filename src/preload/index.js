const { contextBridge, ipcRenderer, shell } = require('electron')
const os = require('os')
const fs = require('fs')
const path = require('path')
const installProgressCallbacks = new Set()

async function getFileStats(filePath) {
  // eslint-disable-next-line no-useless-catch
  try {
    const stats = await fs.promises.stat(filePath)
    // 返回一个 plain object，用于在渲染进程中直接使用
    return {
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      size: stats.size
      // 可根据需要添加其他属性
    }
  } catch (error) {
    throw error
  }
}

// 封装注册监听器函数
function onInstallProgress(callback) {
  if (installProgressCallbacks.size === 0) {
    // 第一次注册时，监听 install-progress 事件
    ipcRenderer.on('install-progress', (event, data) => {
      // 调用所有注册的回调函数
      installProgressCallbacks.forEach((cb) => cb(data))
    })
  }
  installProgressCallbacks.add(callback)
}

// 封装移除特定的监听器函数
function removeInstallProgressListener(callback) {
  installProgressCallbacks.delete(callback)
  // 如果没有剩余监听器，则移除 ipcRenderer 上的事件监听
  if (installProgressCallbacks.size === 0) {
    ipcRenderer.removeAllListeners('install-progress')
  }
}

// 封装移除所有 install-progress 监听器的函数
function clearInstallProgressListeners() {
  installProgressCallbacks.clear()
  ipcRenderer.removeAllListeners('install-progress')
}

const api = {
  // 封装通用的 ipcRenderer.invoke 方法
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  // 当前用户的 home 目录
  homeDir: os.homedir(),
  // 暴露 shell 模块（慎用：仅建议将确定安全的功能暴露出去）
  shell: shell,
  // 专门封装 openPathWithApp 接口
  openPathWithApp: (targetPath, appPath) =>
    ipcRenderer.invoke('open-path-with-app', targetPath, appPath),

  // 文件/目录操作
  openDirectory: async (options) => await ipcRenderer.invoke('dialog:openDirectory', options),
  readDirectory: async (dirPath) => await ipcRenderer.invoke('read-directory', dirPath),
  readFile: async (filePath) => await ipcRenderer.invoke('read-file', filePath),

  // 配置文件操作
  readConfig: async (configPath) => await ipcRenderer.invoke('read-config', configPath),
  readFmConfig: async (configPath) => await ipcRenderer.invoke('read-fm-config', configPath),
  writeConfig: async (configPath, data) =>
    await ipcRenderer.invoke('write-config', configPath, data),

  // 启动外部进程
  // 停止 app 进程
  stopApp: async () => {
    try {
      const result = await ipcRenderer.invoke('stop-app')
      console.log('[preload.js] stop-app result:', result)
      return result
    } catch (error) {
      console.error('[preload.js] stop-app error:', error)
      throw error
    }
  },

  // 启动 app 进程，configPath 为启动参数之一
  startApp: async (configPath) => {
    try {
      const result = await ipcRenderer.invoke('start-app', configPath)
      console.log('[preload.js] start-app result:', result)
      return result
    } catch (error) {
      console.error('[preload.js] start-app error:', error)
      throw error
    }
  },

  // 停止 bot 进程
  stopBot: async () => {
    try {
      const result = await ipcRenderer.invoke('stop-bot')
      console.log('[preload.js] stop-bot result:', result)
      return result
    } catch (error) {
      console.error('[preload.js] stop-bot error:', error)
      throw error
    }
  },

  // 启动 bot 进程，configPath 为启动参数之一
  startBot: async (configPath) => {
    try {
      const result = await ipcRenderer.invoke('start-bot', configPath)
      console.log('[preload.js] start-bot result:', result)
      return result
    } catch (error) {
      console.error('[preload.js] start-bot error:', error)
      throw error
    }
  },

  // 健康检查接口
  checkBotHealth: () => ipcRenderer.invoke('check-bot-health'),
  checkAppHealth: () => ipcRenderer.invoke('check-app-health'),

  sysConfig: (options) => ipcRenderer.invoke('sys-config', options),
  fmConfig: (options) => ipcRenderer.invoke('fm-config', options),

  // 路径/系统工具接口
  getAppPathIPC: async (appName) => await ipcRenderer.invoke('get-app-path', appName),
  checkPathExists: async (targetPath) => await ipcRenderer.invoke('check-path-exists', targetPath),

  // 其他系统检测与模型管理
  checkOllamaIPC: async () => await ipcRenderer.invoke('check-ollama'),
  checkModelDeployment: async (models) =>
    await ipcRenderer.invoke('check-model-deployment', models),
  installModels: async (modelsToInstall) =>
    await ipcRenderer.invoke('install-models', modelsToInstall),
  fs: {
    ...fs,
    promises: fs.promises
  },
  getFileStats: getFileStats,
  path: path,

  onInstallProgress,
  removeInstallProgressListener,
  clearInstallProgressListeners,

  platform: process.platform,
  env: process.env,

  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  getResourcePath: (filePath) => ipcRenderer.invoke('get-resource-path', filePath),
  openNewWindow: (url) => ipcRenderer.send('open-new-window', url),
  openNewWindowIDE: (url) => ipcRenderer.send('open-new-window-ide', url),

  /* ─── 窗口缩放 ─── */
  setZoomFactor: (factor) => ipcRenderer.invoke('set-zoom-factor', factor),
  getZoomFactor: () => ipcRenderer.invoke('get-zoom-factor'),

  normalize: (p) => path.normalize(p),
  sep: path.sep,

  checkPythonIPC: async () => await ipcRenderer.invoke('check-python'),
  listModels: async () => await ipcRenderer.invoke('list-models'),
  checkModelInstalled: (model) => ipcRenderer.invoke('check-model-installed', model),
  // 在 writeConfig 旁边添加
  saveFile: async (filePath, data) => await ipcRenderer.invoke('save-file', filePath, data),

  // 启动 fm_http 进程
  startFmHttp: async (configPath) => {
    try {
      const result = await ipcRenderer.invoke('start-fm_http', configPath)
      console.log('[preload.js] start-fm_http result:', result)
      return result
    } catch (error) {
      console.error('[preload.js] start-fm_http error:', error)
      throw error
    }
  },

  // 停止 fm_http 进程
  stopFmHttp: async () => {
    try {
      const result = await ipcRenderer.invoke('stop-fm_http')
      console.log('[preload.js] stop-fm_http result:', result)
      return result
    } catch (error) {
      console.error('[preload.js] stop-fm_http error:', error)
      throw error
    }
  },

  // 检查 fm_http 健康状态
  checkFmHttpHealth: () => ipcRenderer.invoke('check-fm_http-health'),

  checkMemoryFlashStatus: async (localPath) => {
    const { exists, indexing, hasDb } = await ipcRenderer.invoke('check-memory-flash', {
      local_path: localPath
    })
    return { exists, indexing, hasDb }
  },

  removeModels: (modelName) => ipcRenderer.invoke('remove-models', modelName),
  // 检测 Pandoc 安装状态
  checkPandocIPC: async () => {
    return await ipcRenderer.invoke('checkPandocIPC')
  },
  checkGitIPC: async () => {
    return await ipcRenderer.invoke('checkGitIPC')
  },

  getStaticFileList: (dirPath, subPath, isDir) =>
    ipcRenderer.invoke('get-static-file-list', dirPath, subPath, isDir),

  // 包管理接口
  checkDependenciesStatus: () => ipcRenderer.invoke('check-dependencies-status'),
  installRequiredPackages: () => ipcRenderer.invoke('install-required-packages'),
  installPackage: (pkgName) => ipcRenderer.invoke('install-package', pkgName),

  // 检查 Homebrew 是否安装
  checkBrewInstalled: () => ipcRenderer.invoke('check-brew-installed'),
  checkBrewInstalledIPC: () => ipcRenderer.invoke('check-brew-installed'),

  zipFiles: (dirPath, output) => ipcRenderer.invoke('zip-files', dirPath, output),
  unzipFile: (zipFile, outputDir) => ipcRenderer.invoke('unzip-file', zipFile, outputDir),
  /**
   * Get file stats (size in bytes) for a given path.
   * Usage: window.electron.stat('/path/to/file')
   * Returns: { size: number } or throws on error
   */
  stat: (filePath) => {
    try {
      const stats = fs.statSync(filePath)
      return { size: stats.size }
    } catch (err) {
      console.error('stat error:', err)
      return { size: -1, error: err.message }
    }
  }
}

// 使用 contextBridge 向渲染进程暴露安全 API，对外命名为 electron
contextBridge.exposeInMainWorld('electron', api)

console.log('loaded preload/main.js!')
