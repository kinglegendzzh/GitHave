'use strict'

console.log('loading main/index.js')
import { app, BrowserWindow, ipcMain, protocol, shell, dialog } from 'electron'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import { spawn } from 'child_process'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import { existsSync } from 'fs'
import { resolve } from 'path'

const path = require('path')
const fs = require('fs')
const { exec } = require('child_process');
const remoteMain = require('@electron/remote/main');
remoteMain.initialize();
const { appendFile } = fs.promises;
const logFilePath = path.join(app.getPath('userData'), 'logs.txt');
const originalLog = console.log;
const originalError = console.error;
console.log = function (...args) {
  originalLog(...args);
  appendFile(logFilePath, `${new Date().toISOString()} [INFO] ${args.join(' ')}\n`)
    .catch(err => originalError('异步写入日志失败:', err));
};
console.error = function (...args) {
  originalError(...args);
  appendFile(logFilePath, `${new Date().toISOString()} [ERROR] ${args.join(' ')}\n`)
    .catch(err => originalError('异步写入日志失败:', err));
};


const STATIC_SERVER_PORT = 19166

async function startStaticServer() {
  const staticRoot = resolve(__dirname, '../renderer')
  if (!existsSync(staticRoot)) {
    throw new Error(`静态目录不存在: ${staticRoot}`)
  }

  return new Promise((resolveServer, reject) => {
    const httpServer = require('http-server')
    const server = httpServer.createServer({ root: staticRoot })

    server.listen(STATIC_SERVER_PORT, '127.0.0.1', (err) => {
      if (err) {
        reject(err)
      } else {
        console.log(`[static-server] started at http://127.0.0.1:${STATIC_SERVER_PORT}`)
        resolveServer()
      }
    })
  })
}


// 请确保安装了 kill-port
const killPort = require('kill-port')

const isDevelopment = process.env.NODE_ENV !== 'production'

// 全局数组，用于保存所有外部子进程引用
const childProcesses = []

// 注册 scheme
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

// 修改 getResourcePath，使打包后从 app.asar.unpacked 下获取 bin 内的文件
function getResourcePath(fileName) {
  if (app.isPackaged) {
    console.log('app.getAppPath()', app.getAppPath())
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'bin', fileName)
  } else {
    console.log('app.getAppPath()', app.getAppPath())
    return path.join(app.getAppPath(), 'bin', fileName)
  }
}

// 辅助函数：根据平台生成可执行文件的路径（Windows 下添加 .exe 后缀）
function getExecutablePath(name) {
  const ext = process.platform === 'win32' ? '.exe' : ''
  return getResourcePath(name + ext)
}

// 自动清理指定端口的函数（请根据需要调整端口号）
async function clearPortIfOccupied(port) {
  try {
    await killPort(port)
    console.log(`端口 ${port} 已被清理`)
  } catch (error) {
    console.error(`清理端口 ${port} 失败:`, error)
  }
}

async function clearExternalProcessPorts() {
  // 示例端口列表，请更改为你实际使用的端口号
  // const portsToClear = [19150, 19151, 5533]
  const portsToClear = []
  for (const port of portsToClear) {
    await clearPortIfOccupied(port)
  }
}

// 修改后的 spawnAndTrack 函数
// 说明：采用 pipe 模式捕获外部进程的标准输出和错误输出，将数据既打印到控制台也写入 log.txt 文件
function spawnAndTrack(command, args, options) {
  // 修改点：
  // 如果 options.stdio 被设置为 'inherit'，这里将其覆盖为 'pipe' 以便捕获输出，同时后续再手动打印到控制台
  const spawnOptions = Object.assign({}, options, { stdio: 'pipe' })

  // 启动进程
  const proc = spawn(command, args, spawnOptions)

  // 如果子进程的 stdout 可用，则添加监听器
  if (proc.stdout) {
    proc.stdout.on('data', (chunk) => {
      const dataStr = chunk.toString()
      // 输出到控制台（使用原始 console.log）
      originalLog(dataStr)
      // 同步写入日志文件 log.txt
      appendFile(logFilePath, `${new Date().toISOString()} [PROCESS STDOUT] ${dataStr}\n`)
        .catch(err => originalError('写入子进程 stdout 日志失败:', err))
    })
  }

  // 同理处理 stderr 输出
  if (proc.stderr) {
    proc.stderr.on('data', (chunk) => {
      const dataStr = chunk.toString()
      // 输出到控制台（使用原始 console.error）
      originalError(dataStr)
      // 同步写入日志文件 log.txt
      appendFile(logFilePath, `${new Date().toISOString()} [PROCESS STDERR] ${dataStr}\n`)
        .catch(err => originalError('写入子进程 stderr 日志失败:', err))
    })
  }

  // 保存该进程引用到全局数组中
  childProcesses.push(proc)

  return proc
}


// 获取文件路径的辅助函数（平台无关）
function getExecutablePaths() {
  const files = ['bot', 'app', 'flashmemory']
  return files.map(file => {
    return {
      fileName: file,
      path: getExecutablePath(file)
    }
  })
}

// 启动外部程序
function startExternalProcesses() {
  const executableFiles = getExecutablePaths()
  const configPath = getResourcePath('config.yaml')

  console.log('启动外部程序的路径:', executableFiles.map(f => f.path))

  // 非 Windows 平台下，设置可执行权限
  if (process.platform !== 'win32') {
    executableFiles.forEach(({ path }) => {
      try {
        fs.chmodSync(path, 0o755)
      } catch (err) {
        console.error('设置执行权限失败：', err)
      }
    })
  }

  // 启动所有外部进程
  executableFiles.forEach(({ fileName, path }) => {
    const process = spawnAndTrack(path, ['-config', configPath], { stdio: 'inherit' })
    process.on('error', (err) => {
      console.error(`启动 ${fileName} 失败:`, err)
    })
    process.on('exit', (code) => {
      console.log(`${fileName} 进程退出，退出码: ${code}`)
    })
  })

  console.log('启动外部程序成功')
}

ipcMain.handle('dialog:openDirectory', async (event, options) => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(focusedWindow, options);
  return result;
});

// 注册 IPC 处理器：启动 bot 可执行程序
ipcMain.handle('start-bot', async (event, configPath) => {
  console.log('[IPC start-bot] Received configPath:', configPath)
  const botPath = getExecutablePath('bot')
  return new Promise((resolve, reject) => {
    const botProcess = spawnAndTrack(botPath, ['-config', configPath], { stdio: 'inherit' })
    botProcess.on('error', (err) => {
      console.error('[IPC start-bot] Error starting bot:', err)
      reject(err)
    })
    botProcess.on('exit', (code) => {
      console.log(`[IPC start-bot] Bot process exited with code: ${code}`)
      resolve(code)
    })
  })
})

// 注册 IPC 处理器：启动 app 可执行程序
ipcMain.handle('start-app', async (event, configPath) => {
  console.log('[IPC start-app] Received configPath:', configPath)
  const appPath = getExecutablePath('app')
  return new Promise((resolve, reject) => {
    const appProcess = spawnAndTrack(appPath, ['-config', configPath], { stdio: 'inherit' })
    appProcess.on('error', (err) => {
      console.error('[IPC start-app] Error starting app:', err)
      reject(err)
    })
    appProcess.on('exit', (code) => {
      console.log(`[IPC start-app] App process exited with code: ${code}`)
      resolve(code)
    })
  })
})

// 注册 IPC 处理器：启动 flashmemory 可执行程序（扫描代码仓库）
ipcMain.handle('start-flashmemory', async (event, dir) => {
  console.log('[IPC start-flashmemory] Received dir:', dir)
  const flashmemoryPath = getExecutablePath('flashmemory')
  return new Promise((resolve, reject) => {
    const flashmemoryProcess = spawnAndTrack(flashmemoryPath, ['-dir', dir], { stdio: 'inherit' })
    flashmemoryProcess.on('error', (err) => {
      console.error('[IPC start-flashmemory] Error starting flashmemory:', err)
      reject(err)
    })
    flashmemoryProcess.on('exit', (code) => {
      console.log(`[IPC start-flashmemory] Flashmemory process exited with code: ${code}`)
      resolve(code)
    })
  })
})

// 注册 IPC 处理器：启动 flashmemory 可执行程序（扫描代码仓库）
ipcMain.handle('query-flashmemory', async (event, dir, query) => {
  console.log('[IPC query-flashmemory] Received dir:', dir, 'query:', query)
  const flashmemoryPath = getExecutablePath('flashmemory')
  return new Promise((resolve, reject) => {
    const flashmemoryProcess = spawnAndTrack(
      flashmemoryPath,
      ['-dir', dir, '-query_only', '-query', query],
      { stdio: 'inherit' }
    )
    flashmemoryProcess.on('error', (err) => {
      console.error('[IPC query-flashmemory] Error starting flashmemory:', err)
      reject(err)
    })
    flashmemoryProcess.on('exit', (code) => {
      console.log(`[IPC query-flashmemory] Flashmemory process exited with code: ${code}`)
      resolve(code)
    })
  })
})

// 注册 IPC 处理器：读取 config.yaml 文件数据
ipcMain.handle('read-config', async (event, configPath = null) => {
  console.log('[IPC read-config] Received configPath:', configPath);
  try {
    if (!configPath) {
      configPath = getResourcePath('config.yaml');
    }
    // 异步读取
    const data = await fs.promises.readFile(configPath, 'utf-8');
    console.log('[IPC read-config] Read data successfully');
    return data;
  } catch (err) {
    console.error('[IPC read-config] Error reading config.yaml:', err);
    throw err;
  }
});


// 注册 IPC 处理器：写入 config.yaml 文件数据
ipcMain.handle('write-config', async (event, configPath = null, data) => {
  console.log('[IPC write-config] Received configPath:', configPath, 'data length:', data.length);
  try {
    if (!configPath) {
      configPath = getResourcePath('config.yaml');
    }
    // 异步写入
    await fs.promises.writeFile(configPath, data, 'utf-8');
    console.log('[IPC write-config] Write successful');
    return true;
  } catch (err) {
    console.error('[IPC write-config] Error writing config.yaml:', err);
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

// 注册 get-app-path IPC 处理器
ipcMain.handle('get-app-path', async (event, appName) => {
  console.log('[IPC get-app-path] Received appName:', appName);

  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32' ? `where ${appName}` : `which ${appName}`;
    console.log('[IPC get-app-path] Executing command:', command);

    // 复制并扩展当前环境变量
    const env = { ...process.env };
    if (process.platform !== 'win32') {
      // 确保 /usr/local/bin 存在于 PATH 中
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
})

// 注册 open-path-with-app IPC 处理器
ipcMain.handle('open-path-with-app', async (event, targetPath, appPath) => {
  console.log('[IPC open-path-with-app] Received targetPath:', targetPath, 'appPath:', appPath)
  return new Promise((resolve, reject) => {
    try {
      const child = spawnAndTrack(appPath, [targetPath], { detached: true, stdio: 'ignore' })
      child.unref()
      console.log('[IPC open-path-with-app] Opened path successfully')
      resolve() // 成功时 resolve
    } catch (error) {
      console.error(`[IPC open-path-with-app] Error opening ${targetPath} with ${appPath}:`, error)
      reject(error)
    }
  })
})

// 检测系统是否已安装并正在运行 ollama
ipcMain.handle('check-ollama', async () => {
  console.log('[IPC check-ollama] Invoked')
  return new Promise((resolve) => {
    const { exec } = require('child_process')
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
})

// 检测是否已部署所需的模型，requiredModelsList 为传入的模型名称列表
ipcMain.handle('check-model-deployment', async (event, requiredModelsList) => {
  console.log('[IPC check-model-deployment] Received models list:', requiredModelsList)
  return new Promise((resolve) => {
    const { exec } = require('child_process')
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
})

// 下载并安装缺失的模型，并通过 IPC 发送进度更新
ipcMain.handle('install-models', async (event, modelsToInstall) => {
  console.log('[IPC install-models] Received models to install:', modelsToInstall)
  return new Promise((resolve) => {
    // 对 modelsToInstall 字符串列表去重
    modelsToInstall = [...new Set(modelsToInstall)]
    const total = modelsToInstall.length
    // 按顺序安装模型
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

      // Listen to stdout for real-time progress updates
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

      // Also listen to stderr in case progress is output there
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
        // Ensure the current model is marked as complete
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
})

// 创建窗口
async function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, 'assets', 'banner.png'),
    frame: false,
    titleBarStyle: 'hidden',  // 隐藏系统标题栏
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: true
    }
  })

  remoteMain.enable(win.webContents);

  win.on('ready-to-show', () => {
    win.show()
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // // HMR for renderer base on electron-vite cli.
  // // Load the remote URL for development or the local html file for production.
  // if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
  //   await win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  // } else {
  //   await win.loadFile(join(__dirname, '../renderer/index.html'))
  // }


  // 加载页面逻辑
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    console.log('[main] load from dev server:', process.env['ELECTRON_RENDERER_URL'])
    await win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    // 启动本地静态资源服务并加载 URL
    await startStaticServer()
    await win.loadURL(`http://127.0.0.1:${STATIC_SERVER_PORT}/index.html`)
  }

}

// 在 app 就绪后先清理端口，再启动外部程序，再创建窗口
app.on('ready', async () => {
  await clearExternalProcessPorts()  // 自动清理占用的端口（示例端口，请根据实际情况调整）
  if (isDevelopment && !process.env.IS_TEST) {
    try {
      await installExtension(VUEJS_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools 安装失败:', e.toString())
    }
  }
  startExternalProcesses()
  await createWindow()
})

// 退出前终止所有外部子进程
app.on('before-quit', () => {
  console.log('应用即将退出，终止所有外部进程...')
  childProcesses.forEach(proc => {
    if (!proc.killed) {
      try {
        proc.kill()
      } catch (error) {
        console.error('终止进程失败:', error)
      }
    }
  })
})

// 关闭窗口时退出程序（非 macOS 平台）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// 开发环境下退出信号处理
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}

console.log('main/index.js loaded!')
