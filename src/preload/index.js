const { contextBridge, ipcRenderer, shell } = require('electron');
const os = require('os');
const fs = require('fs');
const path = require('path');
const installProgressCallbacks = new Set();

async function getFileStats(filePath) {
  try {
    const stats = await fs.promises.stat(filePath);
    // 返回一个 plain object，用于在渲染进程中直接使用
    return {
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      size: stats.size,
      // 可根据需要添加其他属性
    };
  } catch (error) {
    throw error;
  }
}

// 封装注册监听器函数
function onInstallProgress(callback) {
  if (installProgressCallbacks.size === 0) {
    // 第一次注册时，监听 install-progress 事件
    ipcRenderer.on('install-progress', (event, data) => {
      // 调用所有注册的回调函数
      installProgressCallbacks.forEach(cb => cb(data));
    });
  }
  installProgressCallbacks.add(callback);
}

// 封装移除特定的监听器函数
function removeInstallProgressListener(callback) {
  installProgressCallbacks.delete(callback);
  // 如果没有剩余监听器，则移除 ipcRenderer 上的事件监听
  if (installProgressCallbacks.size === 0) {
    ipcRenderer.removeAllListeners('install-progress');
  }
}

// 封装移除所有 install-progress 监听器的函数
function clearInstallProgressListeners() {
  installProgressCallbacks.clear();
  ipcRenderer.removeAllListeners('install-progress');
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
  writeConfig: async (configPath, data) => await ipcRenderer.invoke('write-config', configPath, data),

  // 启动外部进程
  // 停止 app 进程
  stopApp: async () => {
    try {
      const result = await ipcRenderer.invoke('stop-app');
      console.log('[preload.js] stop-app result:', result);
      return result;
    } catch (error) {
      console.error('[preload.js] stop-app error:', error);
      throw error;
    }
  },

  // 启动 app 进程，configPath 为启动参数之一
  startApp: async (configPath) => {
    try {
      const result = await ipcRenderer.invoke('start-app', configPath);
      console.log('[preload.js] start-app result:', result);
      return result;
    } catch (error) {
      console.error('[preload.js] start-app error:', error);
      throw error;
    }
  },

  // 停止 bot 进程
  stopBot: async () => {
    try {
      const result = await ipcRenderer.invoke('stop-bot');
      console.log('[preload.js] stop-bot result:', result);
      return result;
    } catch (error) {
      console.error('[preload.js] stop-bot error:', error);
      throw error;
    }
  },

  // 启动 bot 进程，configPath 为启动参数之一
  startBot: async (configPath) => {
    try {
      const result = await ipcRenderer.invoke('start-bot', configPath);
      console.log('[preload.js] start-bot result:', result);
      return result;
    } catch (error) {
      console.error('[preload.js] start-bot error:', error);
      throw error;
    }
  },

  // 健康检查接口
  checkBotHealth: () => ipcRenderer.invoke('check-bot-health'),
  checkAppHealth: () => ipcRenderer.invoke('check-app-health'),

  sysConfig: (options) => ipcRenderer.invoke('sys-config', options),

  // 路径/系统工具接口
  getAppPathIPC: async (appName) => await ipcRenderer.invoke('get-app-path', appName),
  checkPathExists: async (targetPath) => await ipcRenderer.invoke('check-path-exists', targetPath),

  // 其他系统检测与模型管理
  checkOllamaIPC: async () => await ipcRenderer.invoke('check-ollama'),
  checkModelDeployment: async (models) => await ipcRenderer.invoke('check-model-deployment', models),
  installModels: async (modelsToInstall) => await ipcRenderer.invoke('install-models', modelsToInstall),
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
  openNewWindow: (url) => ipcRenderer.send('open-new-window', url),
};

// 使用 contextBridge 向渲染进程暴露安全 API，对外命名为 electron
contextBridge.exposeInMainWorld('electron', api);

console.log('loaded preload/main.js!');
