'use strict'
const { app, BrowserWindow, ipcMain, protocol, shell, dialog } = require('electron');
const installExtension = require('electron-devtools-installer').default;
const { VUEJS_DEVTOOLS } = require('electron-devtools-installer');
const { spawn, exec } = require('child_process');
const { is } = require('@electron-toolkit/utils');
const path = require('path');
const fs = require('fs');
const { existsSync } = require('fs');
const { resolve } = require('path');
const remoteMain = require('@electron/remote/main');
remoteMain.initialize();

const logFilePath = path.join(app.getPath('userData'), 'logs.txt');
const originalLog = console.log;
const originalError = console.error;

// 根据环境判断是否需要详细日志记录，生产环境可关闭详细日志以减轻主线程 I/O
const enableDetailedLog = process.env.NODE_ENV !== 'production';

function writeLog(level, ...args) {
  const message = `${new Date().toISOString()} [${level}] ${args.join(' ')}\n`;
  fs.promises.appendFile(logFilePath, message).catch(err => {
    originalError(`异步写入日志失败:`, err);
  });
}
console.log = function (...args) {
  originalLog(...args);
  if (enableDetailedLog) writeLog('INFO', ...args);
};
console.error = function (...args) {
  originalError(...args);
  if (enableDetailedLog) writeLog('ERROR', ...args);
};

app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('disk-cache-size', (100 * 1024 * 1024).toString()); // 100MB 缓存

const STATIC_SERVER_PORT = 19166;

// 保留启动静态服务器函数，开发环境可能仍需用到
async function startStaticServer() {
  const staticRoot = resolve(__dirname, '../renderer');
  if (!existsSync(staticRoot)) {
    throw new Error(`静态目录不存在: ${staticRoot}`);
  }
  return new Promise((resolveServer, reject) => {
    const httpServer = require('http-server');
    const server = httpServer.createServer({ root: staticRoot });
    server.listen(STATIC_SERVER_PORT, '127.0.0.1', (err) => {
      if (err) {
        reject(err);
      } else {
        console.log(`[static-server] started at http://127.0.0.1:${STATIC_SERVER_PORT}`);
        resolveServer();
      }
    });
  });
}

// 请确保安装了 kill-port
const killPort = require('kill-port');
const isDevelopment = process.env.NODE_ENV !== 'production';
const childProcesses = [];

// 注册 scheme（保证安全性）
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
]);

// 修改资源路径，根据是否打包来决定从哪个目录读取文件
function getResourcePath(fileName) {
  if (app.isPackaged) {
    console.log('app.getAppPath()', app.getAppPath());
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'bin', fileName);
  } else {
    console.log('app.getAppPath()', app.getAppPath());
    return path.join(app.getAppPath(), 'bin', fileName);
  }
}

function getExecutablePath(name) {
  const ext = process.platform === 'win32' ? '.exe' : '';
  return getResourcePath(name + ext);
}

async function clearPortIfOccupied(port) {
  try {
    await killPort(port);
    console.log(`端口 ${port} 已被清理`);
  } catch (error) {
    console.error(`清理端口 ${port} 失败:`, error);
  }
}

async function clearExternalProcessPorts() {
  // 按需配置需要清理的端口列表
  const portsToClear = [];
  for (const port of portsToClear) {
    await clearPortIfOccupied(port);
  }
}

// spawnAndTrack 修改为统一使用 pipe 模式捕获输出，避免阻塞
function spawnAndTrack(command, args, options = {}) {
  const spawnOptions = Object.assign({}, options, { stdio: 'pipe' });
  const proc = spawn(command, args, spawnOptions);
  if (proc.stdout) {
    proc.stdout.on('data', (chunk) => {
      const dataStr = chunk.toString();
      originalLog(dataStr);
      writeLog('PROCESS STDOUT', dataStr);
    });
  }
  if (proc.stderr) {
    proc.stderr.on('data', (chunk) => {
      const dataStr = chunk.toString();
      originalError(dataStr);
      writeLog('PROCESS STDERR', dataStr);
    });
  }
  childProcesses.push(proc);
  return proc;
}

function getExecutablePaths() {
  const files = ['bot', 'app', 'flashmemory'];
  return files.map(file => ({ fileName: file, path: getExecutablePath(file) }));
}

function startExternalProcesses() {
  const executableFiles = getExecutablePaths();
  const configPath = getResourcePath('config.yaml');
  console.log('启动外部程序的路径:', executableFiles.map(f => f.path));

  // 非 Windows 平台下设置可执行权限
  if (process.platform !== 'win32') {
    executableFiles.forEach(({ path }) => {
      try {
        fs.chmodSync(path, 0o755);
      } catch (err) {
        console.error('设置执行权限失败：', err);
      }
    });
  }
  // 启动所有外部进程
  executableFiles.forEach(({ fileName, path }) => {
    const proc = spawnAndTrack(path, ['-config', configPath], { stdio: 'inherit' });
    proc.on('error', (err) => {
      console.error(`启动 ${fileName} 失败:`, err);
    });
    proc.on('exit', (code) => {
      console.log(`${fileName} 进程退出，退出码: ${code}`);
    });
  });
  console.log('启动外部程序成功');
}

ipcMain.on('open-new-window', (event, url) => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nativeWindowOpen: true,
    },
  });
  win.loadURL(url);
});

// 各 ipcMain.handle 代码保持不变
ipcMain.handle('dialog:openDirectory', async (event, options) => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(focusedWindow, options);
  return result;
});

ipcMain.handle('start-bot', async (event, configPath) => {
  console.log('[IPC start-bot] Received configPath:', configPath);
  const botPath = getExecutablePath('bot');
  return new Promise((resolve, reject) => {
    const botProcess = spawnAndTrack(botPath, ['-config', configPath], { stdio: 'inherit' });
    botProcess.on('error', (err) => {
      console.error('[IPC start-bot] Error starting bot:', err);
      reject(err);
    });
    botProcess.on('exit', (code) => {
      console.log(`[IPC start-bot] Bot process exited with code: ${code}`);
      resolve(code);
    });
  });
});

ipcMain.handle('start-app', async (event, configPath) => {
  console.log('[IPC start-app] Received configPath:', configPath);
  const appPath = getExecutablePath('app');
  return new Promise((resolve, reject) => {
    const appProcess = spawnAndTrack(appPath, ['-config', configPath], { stdio: 'inherit' });
    appProcess.on('error', (err) => {
      console.error('[IPC start-app] Error starting app:', err);
      reject(err);
    });
    appProcess.on('exit', (code) => {
      console.log(`[IPC start-app] App process exited with code: ${code}`);
      resolve(code);
    });
  });
});

ipcMain.handle('read-config', async (event, configPath = null) => {
  console.log('[IPC read-config] Received configPath:', configPath);
  try {
    if (!configPath) {
      configPath = getResourcePath('config.yaml');
    }
    const data = await fs.promises.readFile(configPath, 'utf-8');
    console.log('[IPC read-config] Read data successfully');
    return data;
  } catch (err) {
    console.error('[IPC read-config] Error reading config.yaml:', err);
    throw err;
  }
});

ipcMain.handle('read-directory', async (event, dirPath) => {
  console.log('[IPC read-directory] Received dirPath:', dirPath);
  try {
    const files = await fs.promises.readdir(dirPath);
    const result = await Promise.all(
      files.map(async file => {
        try {
          const filePath = path.join(dirPath, file);
          if (!fs.existsSync(filePath)) {
            console.warn(`[IPC read-directory] File does not exist, skipping: ${filePath}`);
            return null;
          }
          const stat = await fs.promises.stat(filePath);
          return {
            name: file,
            fullPath: filePath,
            isDirectory: stat.isDirectory()
          };
        } catch (err) {
          console.error(`[IPC read-directory] Error reading file ${file}, skipping...`, err);
          return null;
        }
      })
    );
    console.log('[IPC read-directory] Directory read successfully');
    return result.filter(item => item !== null);
  } catch (err) {
    console.error('[IPC read-directory] Error reading directory:', err);
    throw err;
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  console.log('[IPC read-file] Received filePath:', filePath);
  try {
    const data = await fs.promises.readFile(filePath, 'utf-8');
    console.log('[IPC read-file] File read successfully');
    return data;
  } catch (err) {
    console.error('[IPC read-file] Error reading file:', err);
    throw err;
  }
});

ipcMain.handle('get-app-path', async (event, appName) => {
  console.log('[IPC get-app-path] Received appName:', appName);
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32' ? `where ${appName}` : `which ${appName}`;
    console.log('[IPC get-app-path] Executing command:', command);
    const env = { ...process.env };
    if (process.platform !== 'win32') {
      if (!env.PATH.includes('/usr/local/bin')) {
        env.PATH = `/usr/local/bin:${env.PATH}`;
      }
    }
    exec(command, { env }, (error, stdout, stderr) => {
      if (error || !stdout.trim()) {
        reject(new Error(`无法查找到 ${appName} 的路径`));
      } else {
        resolve(stdout.trim());
      }
    });
  });
});

ipcMain.handle('check-path-exists', async (event, targetPath) => {
  console.log('[IPC check-path-exists] Received targetPath:', targetPath)
  const exists = fs.existsSync(targetPath)
  console.log('[IPC check-path-exists] Path exists:', exists)
  return exists
});

ipcMain.handle('open-path-with-app', async (event, targetPath, appPath) => {
  console.log('[IPC open-path-with-app] Received targetPath:', targetPath, 'appPath:', appPath)
  return new Promise((resolve, reject) => {
    try {
      const child = spawnAndTrack(appPath, [targetPath], { detached: true, stdio: 'ignore' })
      child.unref()
      console.log('[IPC open-path-with-app] Opened path successfully')
      resolve()
    } catch (error) {
      console.error(`[IPC open-path-with-app] Error opening ${targetPath} with ${appPath}:`, error)
      reject(error)
    }
  })
});

ipcMain.handle('check-ollama', async () => {
  console.log('[IPC check-ollama] Invoked')
  return new Promise((resolve) => {
    exec('/usr/local/bin/ollama serve', (error, stdout, stderr) => {
      if (error) {
        if (stderr.includes('address already in use')) {
          console.log('[IPC check-ollama] ollama is installed and running')
          resolve(true)
        } else {
          console.error('[IPC check-ollama] Error:', error)
          resolve(false)
        }
      } else {
        console.log('[IPC check-ollama] ollama not running')
        resolve(false)
      }
    })
  })
});

ipcMain.handle('check-model-deployment', async (event, requiredModelsList) => {
  console.log('[IPC check-model-deployment] Received models list:', requiredModelsList)
  return new Promise((resolve) => {
    exec('/usr/local/bin/ollama list', (error, stdout) => {
      if (error) {
        console.error('[IPC check-model-deployment] Error:', error)
        resolve(false)
      } else {
        let deployed = true
        for (let modelName of requiredModelsList) {
          if (!stdout.toLowerCase().includes(modelName)) {
            deployed = false
            break
          }
        }
        console.log('[IPC check-model-deployment] Deployed:', deployed)
        resolve(deployed)
      }
    })
  })
});

ipcMain.handle('install-models', async (event, modelsToInstall) => {
  console.log('[IPC install-models] Received models to install:', modelsToInstall)
  return new Promise((resolve) => {
    modelsToInstall = [...new Set(modelsToInstall)]
    const total = modelsToInstall.length
    function installModel(index) {
      if (index >= total) {
        event.sender.send('install-progress', { progress: 100, model: '全部模型' })
        console.log('[IPC install-models] All models installed.')
        resolve(true)
        return
      }
      const model = modelsToInstall[index]
      console.log(`[IPC install-models] Installing model: ${model}`)
      const pullProcess = spawnAndTrack('/usr/local/bin/ollama', ['pull', model], { stdio: 'inherit' })
      let outputData = ''
      let lastModelProgress = 0
      pullProcess.stdout.on('data', (data) => {
        const chunk = data.toString()
        outputData += chunk
        const match = chunk.match(/(\d+)%/)
        if (match) {
          const modelProgress = parseInt(match[1])
          if (modelProgress > lastModelProgress) {
            lastModelProgress = modelProgress
            const overallProgress = Math.round((index * 100 + modelProgress) / total)
            event.sender.send('install-progress', { progress: overallProgress, model })
            console.log(`[IPC install-models] Model ${model} progress: ${modelProgress}% (Overall: ${overallProgress}%)`)
          }
        }
      })
      pullProcess.stderr.on('data', (data) => {
        const chunk = data.toString()
        outputData += chunk
        const match = chunk.match(/(\d+)%/)
        if (match) {
          const modelProgress = parseInt(match[1])
          if (modelProgress > lastModelProgress) {
            lastModelProgress = modelProgress
            const overallProgress = Math.round((index * 100 + modelProgress) / total)
            event.sender.send('install-progress', { progress: overallProgress, model })
            console.log(`[IPC install-models] Model ${model} progress: ${modelProgress}% (Overall: ${overallProgress}%)`)
          }
        }
      })
      pullProcess.on('close', () => {
        const overallProgress = Math.round(((index + 1) * 100) / total)
        event.sender.send('install-progress', { progress: overallProgress, model })
        if (outputData.toLowerCase().includes('success')) {
          console.log(`[IPC install-models] Model ${model} installed successfully. Final overall progress: ${overallProgress}%`)
          installModel(index + 1)
        } else {
          console.error(`[IPC install-models] Installation failed for model ${model}. Output:`, outputData)
          resolve(false)
        }
      })
    }
    if (total > 0) {
      installModel(0)
    } else {
      resolve(true)
    }
  })
});

ipcMain.handle('write-config', async (event, configPath = null, data) => {
  console.log('[IPC write-config] Received configPath:', configPath, 'data length:', data.length);
  try {
    if (!configPath) {
      configPath = getResourcePath('config.yaml');
    }
    await fs.promises.writeFile(configPath, data, 'utf-8');
    console.log('[IPC write-config] Write successful');
    return true;
  } catch (err) {
    console.error('[IPC write-config] Error writing config.yaml:', err);
    throw err;
  }
});

ipcMain.handle('get-user-data-path', async () => {
  // 获取并返回 userData 目录的绝对路径
  return app.getPath('userData');
});

// 修改窗口创建逻辑，根据环境加载不同资源
async function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, 'assets', 'banner.png'),
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: true
    }
  });
  remoteMain.enable(win.webContents);
  win.on('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (isDevelopment && process.env['ELECTRON_RENDERER_URL']) {
    console.log('[main] load from dev server:', process.env['ELECTRON_RENDERER_URL']);
    await win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    // 生产环境直接通过 loadFile 加载本地打包的 HTML 文件
    const indexPath = path.join(__dirname, '../renderer/index.html');
    console.log('[main] load file:', indexPath);
    await win.loadFile(indexPath);
  }
}

app.on('ready', async () => {
// 异步清除端口，错误可以忽略或后台记录
  clearExternalProcessPorts().catch(err => console.error(err));
  if (isDevelopment && !process.env.IS_TEST) {
    try {
      await installExtension(VUEJS_DEVTOOLS);
    } catch (e) {
      console.error('Vue Devtools 安装失败:', e.toString());
    }
  }
// 后台启动外部进程，不再等待
  startExternalProcesses();
// 立即创建窗口
  await createWindow();

});

app.on('before-quit', () => {
  console.log('应用即将退出，终止所有外部进程...');
  childProcesses.forEach(proc => {
    if (!proc.killed) {
      try {
        proc.kill();
      } catch (error) {
        console.error('终止进程失败:', error);
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') app.quit();
    });
  } else {
    process.on('SIGTERM', () => { app.quit(); });
  }
}
console.log('main/index.js loaded!');
