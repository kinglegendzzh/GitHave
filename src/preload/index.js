const { contextBridge, ipcRenderer, shell } = require('electron')
const os = require('os')
const fs = require('fs')
const path = require('path')
const installProgressCallbacks = new Set()

async function getFileStats(filePath) {
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
    console.error('getFileStats 错误:', error, '路径:', filePath)
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
  // 临时目录
  tmpdir: os.tmpdir(),
  // 暴露 shell 模块（慎用：仅建议将确定安全的功能暴露出去）
  shell: shell,
  // 专门封装 openPathWithApp 接口
  openPathWithApp: (targetPath, appPath) =>
    ipcRenderer.invoke('open-path-with-app', targetPath, appPath),

  // 文件/目录操作
  openDirectory: async (options) => await ipcRenderer.invoke('dialog:openDirectory', options),
  readDirectory: async (dirPath) => await ipcRenderer.invoke('read-directory', dirPath),
  readFile: async (filePath, options = {}) =>
    await ipcRenderer.invoke('read-file', filePath, options),
  readImageBlob: async (filePath) => await ipcRenderer.invoke('read-image-blob', filePath),
  createReadStream: async (filePath, options) => {
    // Check if file exists and get its stats
    try {
      const stats = await fs.promises.stat(filePath)
      if (stats.size > 10 * 1024 * 1024) {
        // Files larger than 10MB
        // For large files, read in chunks using IPC
        return ipcRenderer.invoke('read-file-chunks', filePath, options)
      } else {
        // For smaller files, read the entire content at once
        const content = await fs.promises.readFile(filePath, options)
        return content.toString(options?.encoding || 'utf8')
      }
    } catch (error) {
      console.error('Error reading file stream:', error)
      throw error
    }
  },

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
  path: {
    extname: (filePath) => path.extname(filePath),
    basename: (filePath) => path.basename(filePath),
    dirname: (filePath) => path.dirname(filePath),
    join: (...paths) => path.join(...paths),
    resolve: (...paths) => path.resolve(...paths),
    relative: (from, to) => path.relative(from, to),
    isAbsolute: (p) => path.isAbsolute(p),
    sep: path.sep
  },

  onInstallProgress,
  removeInstallProgressListener,
  clearInstallProgressListeners,

  platform: process.platform,
  env: process.env,

  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  getDocumentsPath: () => ipcRenderer.invoke('get-documents-path'),
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

  // 文件操作接口
  createDirectory: async (dirPath) => await ipcRenderer.invoke('create-directory', dirPath),
  deleteFile: async (filePath) => await ipcRenderer.invoke('delete-file', filePath),
  copyFile: async (sourcePath, targetPath) =>
    await ipcRenderer.invoke('copy-file', sourcePath, targetPath),
  moveFile: async (sourcePath, targetPath) =>
    await ipcRenderer.invoke('move-file', sourcePath, targetPath),
  showItemInFolder: async (filePath) => await ipcRenderer.invoke('show-item-in-folder', filePath),
  showMessageBox: async (options) => await ipcRenderer.invoke('show-message-box', options),

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
    const { exists, indexing, hasDb, hasFullIndex, moduleAnalyzing } = await ipcRenderer.invoke(
      'check-memory-flash',
      {
        local_path: localPath
      }
    )
    return { exists, indexing, hasDb, hasFullIndex, moduleAnalyzing }
  },

  removeModels: (modelName) => ipcRenderer.invoke('remove-models', modelName),
  // 检测 Pandoc 安装状态
  checkPandocIPC: async () => {
    return await ipcRenderer.invoke('checkPandocIPC')
  },
  checkGitIPC: async () => {
    return await ipcRenderer.invoke('checkGitIPC')
  },

  // Terminal IPC methods
  terminalInit: (options) => ipcRenderer.invoke('terminal-init', options),
  terminalWrite: (data) => ipcRenderer.invoke('terminal-write', data),
  terminalResize: (size) => ipcRenderer.invoke('terminal-resize', size),
  onTerminalOutput: (callback) => {
    ipcRenderer.on('terminal-data', (event, data) => callback(data))
  },
  removeTerminalOutputListener: () => {
    ipcRenderer.removeAllListeners('terminal-data')
  },
  terminalDestroy: (terminalId) => ipcRenderer.invoke('terminal-destroy', { terminalId }),
  onTerminalExit: (callback) => {
    ipcRenderer.on('terminal-exit', (event, data) => callback(data))
  },

  // Git command IPC method
  gitCommand: (options) => ipcRenderer.invoke('git-command', options),

  // Execute command IPC method
  executeCommand: async (command) => {
    try {
      const result = await ipcRenderer.invoke('execute-command', command)
      return result
    } catch (error) {
      console.error('[preload.js] execute-command error:', error)
      throw error
    }
  },

  // 网络速度监控相关API
  getNetworkSpeed: async () => {
    try {
      const result = await ipcRenderer.invoke('get-network-speed')
      return result
    } catch (error) {
      console.error('[preload.js] get-network-speed error:', error)
      throw error
    }
  },

  startNetworkMonitor: async () => {
    try {
      const result = await ipcRenderer.invoke('start-network-monitor')
      return result
    } catch (error) {
      console.error('[preload.js] start-network-monitor error:', error)
      throw error
    }
  },

  stopNetworkMonitor: async () => {
    try {
      const result = await ipcRenderer.invoke('stop-network-monitor')
      return result
    } catch (error) {
      console.error('[preload.js] stop-network-monitor error:', error)
      throw error
    }
  },

  // 监听网络速度更新事件
  onNetworkSpeedUpdate: (callback) => {
    ipcRenderer.on('network-speed-update', (event, data) => callback(data))
  },

  // 移除网络速度更新监听器
  removeNetworkSpeedListener: () => {
    ipcRenderer.removeAllListeners('network-speed-update')
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

  // 监听安装日志事件
  onInstallLog: (callback) => {
    const listener = (event, logData) => callback(logData)
    ipcRenderer.on('install-log', listener)
    // 返回移除监听器的函数
    return () => ipcRenderer.removeListener('install-log', listener)
  },

  // 启动服务日志监听
  startServiceLog: () => ipcRenderer.invoke('start-service-log'),

  // 监听服务启动日志事件
  onServiceLog: (callback) => {
    const listener = (event, logData) => callback(logData)
    ipcRenderer.on('service-log', listener)
    // 返回移除监听器的函数
    return () => ipcRenderer.removeListener('service-log', listener)
  },

  // 停止服务日志监听
  stopServiceLog: () => ipcRenderer.invoke('stop-service-log'),

  // 启动Winston日志监听
  startWinstonLog: () => ipcRenderer.invoke('start-winston-log'),

  // 监听Winston日志事件
  onWinstonLog: (callback) => {
    const listener = (event, logData) => callback(logData)
    ipcRenderer.on('winston-log', listener)
    // 返回移除监听器的函数
    return () => ipcRenderer.removeListener('winston-log', listener)
  },

  // 停止Winston日志监听
  stopWinstonLog: () => ipcRenderer.invoke('stop-winston-log'),

  // 启动子进程日志监听
  startChildProcessLog: () => ipcRenderer.invoke('start-child-process-log'),

  // 监听子进程日志事件
  onChildProcessLog: (callback) => {
    const listener = (event, logData) => callback(logData)
    ipcRenderer.on('child-process-log', listener)
    // 返回移除监听器的函数
    return () => ipcRenderer.removeListener('child-process-log', listener)
  },

  // 停止子进程日志监听
  stopChildProcessLog: () => ipcRenderer.invoke('stop-child-process-log'),

  zipFiles: (dirPath, output) => ipcRenderer.invoke('zip-files', dirPath, output),
  unzipFile: (zipFile, outputDir) => ipcRenderer.invoke('unzip-file', zipFile, outputDir),
  tarGzFiles: (dirPath, output) => ipcRenderer.invoke('tar-gz-files', dirPath, output),
  untarGzFile: (tarFile, outputDir) => ipcRenderer.invoke('untar-gz-file', tarFile, outputDir),
  extractTarGz: (sourcePath, targetPath) => ipcRenderer.invoke('untar-gz-file', sourcePath, targetPath),
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
  },
  /**
   * 判断给定文件是否为文本文件
   * @param filePath 绝对路径
   * @returns Promise<boolean>
   */
  async isText(filePath) {
    return ipcRenderer.invoke('is-text-file', filePath)
  },

  /**
   * 监听协议调用（可多次）
   * @param {(data:{route:string,repo:string,tab:string,token:string,user_id:string,username:string,email:string,timestamp:string,verified:string,github:string,download:string,filename:string,owner:string,branch:string,description:string,isPrivate:boolean,raw:string})=>void} callback
   * @returns {() => void} unsubscribe
   */
  onProtocolUrl(callback) {
    const channel = 'protocol-url'
    const listener = (_event, data) => callback(data)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  },

  /**
   * 仅监听一次协议调用（自动取消）
   * @param {(data:{route:string,repo:string,tab:string,token:string,user_id:string,username:string,email:string,timestamp:string,verified:string,github:string,download:string,filename:string,owner:string,branch:string,description:string,isPrivate:boolean,raw:string})=>void} callback
   */
  onceProtocolUrl(callback) {
    const channel = 'protocol-url'
    ipcRenderer.once(channel, (_event, data) => callback(data))
  },

  /**
   * 移除协议监听（保持向后兼容）
   */
  removeProtocolListener() {
    ipcRenderer.removeAllListeners('protocol-url')
  }
}

// 使用 contextBridge 向渲染进程暴露安全 API，对外命名为 electron
contextBridge.exposeInMainWorld('electron', api)

console.log('loaded preload/main.js!')
