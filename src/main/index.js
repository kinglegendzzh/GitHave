'use strict'

const { app, BrowserWindow, ipcMain, protocol, shell, dialog } = require('electron')
const installExtension = require('electron-devtools-installer').default
const { VUEJS_DEVTOOLS } = require('electron-devtools-installer')
const { spawn, exec, spawnSync } = require('child_process')
const { is } = require('@electron-toolkit/utils')
const path = require('path')
const fs = require('fs')
const { existsSync } = fs
const remoteMain = require('@electron/remote/main')
const util = require('util')
const execAsync = util.promisify(exec)
const net = require('net')
const killPort = require('kill-port')
const winston = require('winston')
const { format, transports } = winston
const fsPromises = fs.promises
const { readdir, stat } = require('fs/promises');
const semver = require('semver');
const { copyFile, mkdir, readFile, writeFile } = fs.promises;

remoteMain.initialize()
const BOT_PORT = 19150
const APP_PORT = 19151
const FM_PORT = 5532

console.log('UserData 路径是：', app.getPath('userData'))

// 全局变量，用于缓存正在进行的停止操作，防止重复请求
let isStoppingBot = false
let isStoppingApp = false
let isRestartingBot = false
let isRestartingApp = false

//【新增】全局标记，表示正在异步清理端口占用的进程（供 check-health 使用）
let isClearingBot = false
let isClearingApp = false
let isClearingFm = false

let timeout = 0

/**
 * 日志系统
 * TODO 看看为什么不tail打印了
 */
// 日志文件路径
const logFilePath = path.join(app.getPath('userData'), 'logs.log')
// 创建 winston 日志记录器 - 不添加任何前缀，直接输出原始消息
const winstonLogger = winston.createLogger({
  level: 'info',
  format: format.printf((info) => `${info.message}`), // 只输出消息内容，不添加时间戳和日志级别
  transports: [
    // 控制台日志
    new transports.Console({
      format: format.simple() // 控制台输出格式，不添加换行
    }),
    // 文件日志（可根据需要配置文件大小、轮转等）
    new transports.File({
      filename: logFilePath,
      options: { flags: 'a' },
      maxsize: 10 * 1024 * 1024, // 例如：10MB 达到后会新生成日志文件
      format: format.printf((info) => `${info.message}`) // 文件日志不添加换行符
    })
  ]
})
// 定义一个日志队列，用于批量写入（限流）日志
const logQueue = []
let isFlushing = false

// 定时刷新日志队列：将积累的日志一次性写入 winstonLogger
function flushLogQueue() {
  if (isFlushing) return
  isFlushing = true
  while (logQueue.length) {
    const { level, message } = logQueue.shift()
    // 调用 winstonLogger 记录日志，这里 winston 会异步写入文件
    winstonLogger.log(level, message)
  }
  isFlushing = false
}

// 每隔7秒刷新一次日志队列（根据业务情况可调整间隔时间）
setInterval(flushLogQueue, 7000)

// 封装日志记录方法，将日志追加到队列中
function logMessage(level, ...args) {
  // 将传入参数拼接成一行日志字符串
  const message = args.join(' ')
  logQueue.push({ level, message })
}
// 根据环境对 console.log / console.error 进行改造，开发时同时写入控制台和队列
const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = !isProduction
if (isProduction) {
  // // 生产环境关闭 console 输出（不建议在生产环境下大量输出）
  // console.log = () => {}
  // console.error = () => {}
  const originalLog = console.log
  const originalError = console.error
  console.log = (...args) => {
    originalLog(...args)
    logMessage('info', ...args)
  }
  console.error = (...args) => {
    originalError(...args)
    logMessage('error', ...args)
  }
} else {
  const originalLog = console.log
  const originalError = console.error
  console.log = (...args) => {
    originalLog(...args)
    logMessage('info', ...args)
  }
  console.error = (...args) => {
    originalError(...args)
    logMessage('error', ...args)
  }
}

// 示例用法
console.log('应用启动，使用 winston 日志记录器')
console.error('模拟错误信息，用于测试日志输出')

// GPU 和缓存优化命令行参数
// app.disableHardwareAcceleration()
// app.commandLine.appendSwitch('ignore-gpu-blocklist')
// app.commandLine.appendSwitch('enable-gpu-rasterization')
// app.commandLine.appendSwitch('enable-zero-copy')
// app.commandLine.appendSwitch('enable-accelerated-2d-canvas')
// app.commandLine.appendSwitch('disk-cache-size', (100 * 1024 * 1024).toString()) // 100MB 缓存

// 定义全局变量保存启动后的进程
// 注意：根据新要求，不进行自启动
let botProcess = null
let appProcess = null
let childProcesses = []
const STATIC_SERVER_PORT = 19166

// 保留启动静态服务器函数（仅开发环境可能使用）
async function startStaticServer() {
  const staticRoot = path.resolve(__dirname, '../renderer')
  if (!existsSync(staticRoot)) {
    throw new Error(`静态目录不存在: ${staticRoot}`)
  }
  const httpServer = require('http-server')
  const server = httpServer.createServer({ root: staticRoot })
  return new Promise((resolveServer, reject) => {
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

// 注册 scheme，保证安全性
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

// 根据是否打包，修改资源路径
function getResourcePath(fileName) {
  if (app.isPackaged) {
    console.log('app.getAppPath()', app.getAppPath())
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'bin', fileName)
  }
  console.log('app.getAppPath()', app.getAppPath())
  return path.join(app.getAppPath(), 'bin', fileName)
}

function getUserResourcePath(fileName) {
  if (app.isPackaged) {
    const p = path.join(app.getPath('userData'), fileName);
    return p
  }
  const p = path.join(app.getAppPath(), 'bin', fileName)
  return p
}

function getExecutablePath(name) {
  const ext = process.platform === 'win32' ? '.exe' : ''
  return getUserResourcePath(name + ext)
}

// 辅助函数：执行命令并返回 stdout（错误交由调用者处理）
async function runCommand(cmd, env = process.env) {
  const { stdout } = await execAsync(cmd, { env })
  return stdout.trim()
}

// spawnAndTrack：统一使用 pipe 模式捕获输出，避免阻塞，在子进程退出时清理事件监听器，防止内存泄漏
function spawnAndTrack(command, args, options = {}) {
  const spawnOptions = { ...options, stdio: 'pipe' }
  const proc = spawn(command, args, spawnOptions)

  // 定义独立的事件处理函数，方便后面移除监听器
  const onStdoutData = (chunk) => {
    const dataStr = chunk.toString()
    // console.log(dataStr);
    // 同时调用 winstonLogger.log 记录日志
    winstonLogger.log('info', dataStr)
  }

  const onStderrData = (chunk) => {
    const dataStr = chunk.toString()
    // console.error(dataStr);
    winstonLogger.log('error', dataStr)
  }

  if (proc.stdout) {
    proc.stdout.on('data', onStdoutData)
  }
  if (proc.stderr) {
    proc.stderr.on('data', onStderrData)
  }

  // 将子进程保存到全局 childProcesses 数组中
  childProcesses.push(proc)

  // 监听子进程的退出事件
  proc.on('close', (code, signal) => {
    // 清理 stdout 和 stderr 上的事件监听器
    if (proc.stdout) {
      proc.stdout.removeListener('data', onStdoutData)
      proc.stdout.removeAllListeners('data')
    }
    if (proc.stderr) {
      proc.stderr.removeListener('data', onStderrData)
      proc.stderr.removeAllListeners('data')
    }
    // 从全局数组中移除该进程引用
    const index = childProcesses.indexOf(proc)
    if (index !== -1) {
      childProcesses.splice(index, 1)
    }
    console.log(`子进程 ${command} 已退出，退出码: ${code}，信号: ${signal}`)
  })

  return proc
}

function getExecutablePaths() {
  const files = ['bot', 'app', 'fm_http']
  return files.map((file) => ({ fileName: file, path: getExecutablePath(file) }))
}

//【修改】延迟启动外部进程部分：
// 根据新要求，在窗口初始化时只检测端口占用并清理，
// 不进行自动自启动。同时异步清理过程中设置标记供 check-health 使用。
async function clearOccupiedPorts() {
  // 检查 BOT_PORT 是否被占用
  const botOccupied = await checkPortAndStore(BOT_PORT, 'bot')
  if (botOccupied !== null) {
    isClearingBot = true
    timeout += 5000
    const result = await killPort(BOT_PORT)
    if (result === 'timeout') {
      winstonLogger.log('warn', `清理 BOT_PORT ${BOT_PORT} 超时，跳过等待`)
    } else {
      winstonLogger.log('info', `BOT_PORT ${BOT_PORT} 已清理`)
    }
    isClearingBot = false
  } else {
    winstonLogger.log('info', `BOT_PORT ${BOT_PORT} 空闲，跳过清理`)
  }

  // 检查 APP_PORT 是否被占用
  const appOccupied = await checkPortAndStore(APP_PORT, 'app')
  if (appOccupied !== null) {
    isClearingApp = true
    timeout += 5000
    const result = await killPort(APP_PORT)
    if (result === 'timeout') {
      winstonLogger.log('warn', `清理 APP_PORT ${APP_PORT} 超时，跳过等待`)
    } else {
      winstonLogger.log('info', `APP_PORT ${APP_PORT} 已清理`)
    }
    isClearingApp = false
  } else {
    winstonLogger.log('info', `APP_PORT ${APP_PORT} 空闲，跳过清理`)
  }

  // 检查 fm_http 端口是否被占用
  const fmHttpOccupied = await checkPortAndStore(FM_PORT, 'fm_http')
  if (fmHttpOccupied !== null) {
    isClearingFm = true
    timeout += 5000
    const result = await killPort(FM_PORT)
    if (result === 'timeout') {
      winstonLogger.log('warn', `清理 fm_http 端口 ${FM_PORT} 超时，跳过等待`)
    } else {
      winstonLogger.log('info', `fm_http 端口 ${FM_PORT} 已清理`)
    }
    isClearingFm = false
  } else {
    winstonLogger.log('info', `fm_http 端口 ${FM_PORT} 空闲，跳过清理`)
  }
}

/* IPC 事件及处理 */

// 打开新窗口
ipcMain.on('open-new-window', (event, url) => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nativeWindowOpen: true
    }
  })
  win.loadURL(url)
})

ipcMain.handle('dialog:openDirectory', async (event, options) => {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  return await dialog.showOpenDialog(focusedWindow, options)
})

ipcMain.handle('sys-config', async (event, options) => {
  let configPath = ''
  try {
    configPath = getUserResourcePath('config.yaml')
  } catch (err) {
    console.error('Error reading config.yaml:', err)
  }
  return {
    configPath
  }
})

ipcMain.handle('fm-config', async (event, options) => {
  let configPath = ''
  try {
    configPath = getUserResourcePath('fm.yaml')
  } catch (err) {
    console.error('Error reading config.yaml:', err)
  }
  return {
    configPath
  }
})

// 修改后的 start-bot IPC 处理函数
ipcMain.handle('start-bot', async (event, configPath) => {
  winstonLogger.log(
    'info',
    `[IPC start-bot] 启动外部程序的路径: ${getExecutablePaths()
      .map((f) => f.path)
      .join(', ')}`
  )

  // 检查是否已存在 tag 为 'bot' 的子进程
  const existingBot = childProcesses.find((proc) => proc.tag === 'bot')
  if (existingBot) {
    console.log('[IPC start-bot] Bot 已经在运行，无需重复启动')
    return { started: true, message: 'Bot already running', pid: existingBot.pid }
  }

  const botPath = getExecutablePath('bot')
  const newBot = spawnAndTrack(botPath, ['-config', configPath, '-db', getUserResourcePath('githave.db')], {
    detached: true,
    stdio: 'ignore'
  })
  newBot.unref()
  newBot.tag = 'bot' // 设置标记以便后续识别
  winstonLogger.log('info', `[IPC start-bot] Bot 启动成功，新的 pid: ${newBot.pid}`)
  return { started: true, pid: newBot.pid }
})

// 修改后的 stop-bot IPC 处理函数
ipcMain.handle('stop-bot', async (event) => {
  // 从 childProcesses 中筛选出 tag 为 'bot' 的所有进程
  const botProcesses = childProcesses.filter((proc) => proc.tag === 'bot')
  if (botProcesses.length === 0) {
    console.log('[IPC stop-bot] 没有发现正在运行的 Bot 进程')
    return { stopped: true, message: 'No bot process running' }
  }
  for (const proc of botProcesses) {
    try {
      proc.kill()
      winstonLogger.log('info', `[IPC stop-bot] 杀死 Bot 进程，pid: ${proc.pid}`)
      childProcesses = childProcesses.filter((p) => p.pid !== proc.pid)
      winstonLogger.log('info', `childProcesses: ${childProcesses}`)
    } catch (err) {
      console.error('[IPC stop-bot] 停止 Bot 时出错:', err)
      return { stopped: false, error: err.toString() }
    }
  }
  const botOccupied = await checkPortAndStore(BOT_PORT, 'bot')
  if (botOccupied !== null) {
    isClearingBot = true
    timeout += 5000
    const result = await killPort(BOT_PORT)
    if (result === 'timeout') {
      winstonLogger.log('warn', `清理 BOT_PORT ${BOT_PORT} 超时，跳过等待`)
    } else {
      winstonLogger.log('info', `BOT_PORT ${BOT_PORT} 已清理`)
    }
    isClearingBot = false
  } else {
    winstonLogger.log('info', `BOT_PORT ${BOT_PORT} 空闲，跳过清理`)
  }
  return { stopped: true }
})

// 修改后的 start-app IPC 处理函数
ipcMain.handle('start-app', async (event, configPath) => {
  winstonLogger.log(
    'info',
    `[IPC start-app] 启动外部程序的路径: ${getExecutablePaths()
      .map((f) => f.path)
      .join(', ')}`
  )

  // 检查是否已存在 tag 为 'app' 的子进程
  const existingApp = childProcesses.find((proc) => proc.tag === 'app')
  if (existingApp) {
    console.log('[IPC start-app] App 已经在运行，无需重复启动')
    return { started: true, message: 'App already running', pid: existingApp.pid }
  }

  const appPath = getExecutablePath('app')
  const newApp = spawnAndTrack(appPath, ['-config', configPath, '-db', getUserResourcePath('githave.db')], {
    detached: true,
    stdio: 'ignore'
  })
  newApp.unref()
  newApp.tag = 'app' // 设置标记以便后续识别
  winstonLogger.log('info', `[IPC start-app] App 启动成功，新的 pid: ${newApp.pid}`)
  return { started: true, pid: newApp.pid }
})

// 修改后的 stop-app IPC 处理函数
ipcMain.handle('stop-app', async (event) => {
  // 从 childProcesses 中筛选出 tag 为 'app' 的所有进程
  const appProcesses = childProcesses.filter((proc) => proc.tag === 'app')
  if (appProcesses.length === 0) {
    console.log('[IPC stop-app] 没有发现正在运行的 App 进程')
    return { stopped: true, message: 'No app process running' }
  }
  for (const proc of appProcesses) {
    try {
      proc.kill()
      winstonLogger.log('info', `[IPC stop-app] 杀死 App 进程，pid: ${proc.pid}`)
      childProcesses = childProcesses.filter((p) => p.pid !== proc.pid)
      winstonLogger.log('info', `childProcesses: ${childProcesses}`)
    } catch (err) {
      console.error('[IPC stop-app] 停止 App 时出错:', err)
      return { stopped: false, error: err.toString() }
    }
  }
  const appOccupied = await checkPortAndStore(APP_PORT, 'app')
  if (appOccupied !== null) {
    isClearingApp = true
    timeout += 5000
    const result = await killPort(APP_PORT)
    if (result === 'timeout') {
      winstonLogger.log('warn', `清理 APP_PORT ${APP_PORT} 超时，跳过等待`)
    } else {
      winstonLogger.log('info', `APP_PORT ${APP_PORT} 已清理`)
    }
    isClearingApp = false
  } else {
    winstonLogger.log('info', `APP_PORT ${APP_PORT} 空闲，跳过清理`)
  }
  return { stopped: true }
})

// 修改后的 check-bot-health IPC 处理函数
ipcMain.handle('check-bot-health', async () => {
  if (isClearingBot) {
    return { state: '正在清理端口并重启Bot服务' }
  }
  const botProc = childProcesses.find((proc) => proc.tag === 'bot')
  if (botProc && !botProc.killed) {
    console.log(`[IPC check-bot-health] Bot 已启动, pid: ${botProc.pid}`)
    return { state: '已启动', pid: botProc.pid }
  } else {
    console.log('[IPC check-bot-health] Bot 已关闭')
    return { state: '已关闭' }
  }
})

// 修改后的 check-app-health IPC 处理函数
ipcMain.handle('check-app-health', async () => {
  if (isClearingApp) {
    return { state: '正在清理端口并重启核心服务' }
  }
  const appProc = childProcesses.find((proc) => proc.tag === 'app')
  if (appProc && !appProc.killed) {
    return { state: '已启动', pid: appProc.pid }
  } else {
    return { state: '已关闭' }
  }
})

// 修改后的 start-fm_http IPC 处理函数
ipcMain.handle('start-fm_http', async (event, configPath) => {
  winstonLogger.log(
    'info',
    `[IPC start-fm_http] 启动外部程序的路径: ${getExecutablePaths()
      .map((f) => f.path)
      .join(', ')}`
  )

  // 检查是否已存在 tag 为 'fm_http' 的子进程
  const existingFmHttp = childProcesses.find((proc) => proc.tag === 'fm_http')
  if (existingFmHttp) {
    console.log('[IPC start-fm_http] fm_http 已经在运行，无需重复启动')
    return { started: true, message: 'fm_http already running', pid: existingFmHttp.pid }
  }

  const fmHttpPath = getExecutablePath('fm_http')
  const newFmHttp = spawnAndTrack(fmHttpPath, ['-config', configPath], {
    detached: true,
    stdio: 'ignore'
  })
  newFmHttp.unref()
  newFmHttp.tag = 'fm_http' // 设置标记以便后续识别
  winstonLogger.log('info', `[IPC start-fm_http] fm_http 启动成功，新的 pid: ${newFmHttp.pid}`)
  return { started: true, pid: newFmHttp.pid }
})

// 修改后的 stop-fm_http IPC 处理函数
ipcMain.handle('stop-fm_http', async (event) => {
  // 从 childProcesses 中筛选出 tag 为 'fm_http' 的所有进程
  const fmHttpProcesses = childProcesses.filter((proc) => proc.tag === 'fm_http')
  if (fmHttpProcesses.length === 0) {
    console.log('[IPC stop-fm_http] 没有发现正在运行的 fm_http 进程')
    return { stopped: true, message: 'No fm_http process running' }
  }
  for (const proc of fmHttpProcesses) {
    try {
      proc.kill()
      winstonLogger.log('info', `[IPC stop-fm_http] 杀死 fm_http 进程，pid: ${proc.pid}`)
      //将fm_http从childProcesses中移除
      childProcesses = childProcesses.filter((p) => p.pid !== proc.pid)
      winstonLogger.log('info', `childProcesses: ${childProcesses}`)
    } catch (err) {
      console.error('[IPC stop-fm_http] 停止 fm_http 时出错:', err)
      return { stopped: false, error: err.toString() }
    }
  }
  const fmHttpOccupied = await checkPortAndStore(FM_PORT, 'fm_http')
  if (fmHttpOccupied !== null) {
    isClearingFm = true
    timeout += 5000
    const result = await killPort(FM_PORT)
    if (result === 'timeout') {
      winstonLogger.log('warn', `清理 fm_http 端口 ${FM_PORT} 超时，跳过等待`)
    } else {
      winstonLogger.log('info', `fm_http 端口 ${FM_PORT} 已清理`)
    }
    isClearingFm = false
  } else {
    winstonLogger.log('info', `fm_http 端口 ${FM_PORT} 空闲，跳过清理`)
  }
  return { stopped: true }
})

// 修改后的 check-fm_http-health IPC 处理函数
ipcMain.handle('check-fm_http-health', async () => {
  if (isClearingFm) {
    return { state: '正在清理端口并重启AI索引' }
  }
  const fmHttpProc = childProcesses.find((proc) => proc.tag === 'fm_http')
  if (fmHttpProc && !fmHttpProc.killed) {
    return { state: '已启动', pid: fmHttpProc.pid }
  } else {
    return { state: '已关闭' }
  }
})

ipcMain.handle('read-config', async (event, configPath = null) => {
  console.log('[IPC read-config] Received configPath:', configPath)
  try {
    if (!configPath) configPath = getUserResourcePath('config.yaml')
    const data = await fs.promises.readFile(configPath, 'utf-8')
    console.log('[IPC read-config] Read data successfully')
    return data
  } catch (err) {
    console.error('[IPC read-config] Error reading config.yaml:', err)
    throw err
  }
})

ipcMain.handle('read-fm-config', async (event, configPath = null) => {
  console.log('[IPC read-fm-config] Received fm configPath:', configPath)
  try {
    if (!configPath) configPath = getUserResourcePath('fm.yaml')
    const data = await fs.promises.readFile(configPath, 'utf-8')
    console.log('[IPC read-fm-config] Read fm data successfully')
    return data
  } catch (err) {
    console.error('[IPC read-fm-config] Error reading fm config.yaml:', err)
    throw err
  }
})

ipcMain.handle('read-directory', async (event, dirPath) => {
  console.log('[IPC read-directory] Received dirPath:', dirPath)
  try {
    const files = await fs.promises.readdir(dirPath)
    const results = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(dirPath, file)
        if (!existsSync(filePath)) {
          console.warn(`[IPC read-directory] File does not exist, skipping: ${filePath}`)
          return null
        }
        const stat = await fs.promises.stat(filePath)
        return {
          name: file,
          fullPath: filePath,
          isDirectory: stat.isDirectory()
        }
      })
    )
    console.log('[IPC read-directory] Directory read successfully')
    return results.filter((item) => item !== null)
  } catch (err) {
    console.error('[IPC read-directory] Error reading directory:', err)
    throw err
  }
})

ipcMain.handle('read-file', async (event, filePath) => {
  console.log('[IPC read-file] Received filePath:', filePath)
  try {
    const data = await fs.promises.readFile(filePath, 'utf-8')
    console.log('[IPC read-file] File read successfully')
    return data
  } catch (err) {
    console.error('[IPC read-file] Error reading file:', err)
    throw err
  }
})

ipcMain.handle('get-app-path', async (event, appName) => {
  console.log('[IPC get-app-path] Received appName:', appName)
  const command = process.platform === 'win32' ? `where ${appName}` : `which ${appName}`
  try {
    const stdout = await runCommand(
      command,
      process.platform !== 'win32' ? { PATH: `/usr/local/bin:${process.env.PATH}` } : process.env
    )
    if (!stdout) {
      throw new Error(`无法查找到 ${appName} 的路径`)
    }
    return stdout
  } catch (err) {
    throw new Error(`无法查找到 ${appName} 的路径: ${err.message}`)
  }
})

ipcMain.handle('check-path-exists', async (event, targetPath) => {
  console.log('[IPC check-path-exists] Received targetPath:', targetPath)
  const exists = existsSync(targetPath)
  console.log('[IPC check-path-exists] Path exists:', exists)
  return exists
})

ipcMain.handle('open-path-with-app', async (event, targetPath, appPath) => {
  console.log('[IPC open-path-with-app] Received targetPath:', targetPath, 'appPath:', appPath)
  try {
    const child = spawnAndTrack(appPath, [targetPath], { detached: true, stdio: 'ignore' })
    child.unref()
    console.log('[IPC open-path-with-app] Opened path successfully')
    return
  } catch (error) {
    console.error(`[IPC open-path-with-app] Error opening ${resolvedPath} with ${appPath}:`, error)
    throw error
  }
})

ipcMain.handle('open-path-with-bot', async (event, targetPath, botPath) => {
  console.log('[IPC open-path-with-bot] Received targetPath:', targetPath, 'appPath:', botPath)
  try {
    const child = spawnAndTrack(botPath, [targetPath], { detached: true, stdio: 'ignore' })
    child.unref()
    console.log('[IPC open-path-with-bot] Opened path successfully')
    return
  } catch (error) {
    console.error(`[IPC open-path-with-bot] Error opening ${targetPath} with ${botPath}:`, error)
    throw error
  }
})

// 获取跨平台的ollama可执行文件路径
function getOllamaPath() {
  // Windows上通常安装在Program Files目录下，但也可能在PATH中
  // macOS和Linux上通常在/usr/local/bin/ollama
  if (process.platform === 'win32') {
    return 'ollama' // Windows上使用命令名称，依赖PATH环境变量
  } else {
    return '/usr/local/bin/ollama' // macOS和Linux上使用完整路径
  }
}

function getPandocPath() {
  // Windows上通常安装在Program Files目录下，但也可能在PATH中
  // macOS和Linux上通常在/usr/local/bin/pandoc
  if (process.platform === 'win32') {
    return 'pandoc' // Windows上使用命令名称，依赖PATH环境变量
  } else {
    return '/usr/local/bin/pandoc' // macOS和Linux上使用完整路径
  }
}

ipcMain.handle('check-ollama', async () => {
  const ollamaCmd = getOllamaPath();
  // 第一步：确认 ollama 可执行文件存在（即是否安装）
  try {
    // 调用 --version，比 serve 安全，不会占端口
    await execAsync(`${ollamaCmd} --version`);
  } catch (err) {
    console.error('[IPC check-ollama] ollama 未安装或无法执行:', err)
    return { installed: false, running: false }
  }

  // 第二步：检查默认端口（11434）是否有 ollama 进程在监听
  try {
    const result = await checkProcessByPort(11434, 'ollama')
    if (result.healthy) {
      return { installed: true, running: true, pid: result.pid }
    } else {
      console.log('[IPC check-ollama] ollama 已安装但未运行')
      return { installed: true, running: false }
    }
  } catch (err) {
    console.error('[IPC check-ollama] 检测端口时出错:', err)
    // 安装了但检测失败，也当作已安装未运行
    return { installed: true, running: false }
  }
})

// 解析 Ollama 列表输出为对象数组
async function parseOllamaList() {
  const ollamaPath = getOllamaPath()
  const { stdout, stderr } = await execAsync(`${ollamaPath} list`)
  if (stderr) console.error('[parseOllamaList] stderr:', stderr)
  const lines = stdout.trim().split('\n')
  const dataLines = lines.slice(1).filter((line) => line.trim())
  return dataLines.map((line) => {
    const parts = line.split(/\s{2,}/)
    return { name: parts[0], id: parts[1], size: parts[2], modified: parts[3] }
  })
}

ipcMain.handle('remove-models', async (event, modelName) => {
  try {
    const ollamaPath = getOllamaPath()
    // 如果传入的是数组，则逐个卸载；否则视为单个模型名
    const models = Array.isArray(modelName) ? modelName : [modelName]

    for (const model of models) {
      winstonLogger.log('info', `[remove-models] 开始卸载模型: ${model}`)
      const proc = spawnAndTrack(ollamaPath, ['rm', model])

      await new Promise((resolve, reject) => {
        proc.on('close', (code, signal) => {
          if (code === 0) {
            winstonLogger.log('info', `[remove-models] 模型 ${model} 卸载成功`)
            resolve()
          } else {
            const msg = `ollama rm ${model} 退出，退出码 ${code}${signal ? `，信号 ${signal}` : ''}`
            winstonLogger.log('error', `[remove-models] ${msg}`)
            reject(new Error(msg))
          }
        })
      })

      // 可选：如果需要在渲染进程显示进度
      // event.sender.send('remove-progress', { model, progress: 100 });
    }

    return { removed: true, models: models }
  } catch (err) {
    console.error('[remove-models] Error:', err)
    throw err
  }
})

// IPC：获取 Ollama 模型列表
ipcMain.handle('list-models', async () => {
  try {
    return await parseOllamaList()
  } catch (err) {
    console.error('[list-models] Error:', err)
    throw err
  }
})

// IPC：检测指定模型是否已安装
ipcMain.handle('check-model-installed', async (event, modelName) => {
  try {
    console.log('[IPC check-model-installed] Received model name:', modelName)
    const list = await parseOllamaList()
    if (list.some((item) => item.name === modelName)) {
      console.log('[IPC check-model-installed] Model is installed')
      return true
    }
    console.log('[IPC check-model-installed] Model is not installed')
    return false
  } catch (err) {
    console.error('[check-model-installed] Error:', err)
    throw err
  }
})

ipcMain.handle('check-model-deployment', async (event, requiredModelsList) => {
  console.log('[IPC check-model-deployment] Received models list:', requiredModelsList)
  const ollamaPath = getOllamaPath()
  try {
    const stdout = await runCommand(`${ollamaPath} list`)
    const deployed = requiredModelsList.every((modelName) =>
      stdout.toLowerCase().includes(modelName.toLowerCase())
    )
    console.log('[IPC check-model-deployment] Deployed:', deployed)
    return deployed
  } catch (err) {
    console.error('[IPC check-model-deployment] Error:', err)
    return false
  }
})

ipcMain.handle('install-models', async (event, modelsToInstall) => {
  console.log('[IPC install-models] Received models to install:', modelsToInstall)
  modelsToInstall = [...new Set(modelsToInstall)]
  const total = modelsToInstall.length
  return new Promise((resolve) => {
    function installModel(index) {
      if (index >= total) {
        event.sender.send('install-progress', { progress: 100, model: '全部模型' })
        console.log('[IPC install-models] All models installed.')
        resolve(true)
        return
      }
      const model = modelsToInstall[index]
      console.log(`[IPC install-models] Installing model: ${model}`)
      const ollamaPath = getOllamaPath()
      const pullProcess = spawnAndTrack(ollamaPath, ['pull', model], { stdio: 'inherit' })
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
            console.log(
              `[IPC install-models] Model ${model} progress: ${modelProgress}% (Overall: ${overallProgress}%)`
            )
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
            console.log(
              `[IPC install-models] Model ${model} progress: ${modelProgress}% (Overall: ${overallProgress}%)`
            )
          }
        }
      })
      pullProcess.on('close', () => {
        const overallProgress = Math.round(((index + 1) * 100) / total)
        event.sender.send('install-progress', { progress: overallProgress, model })
        if (outputData.toLowerCase().includes('success')) {
          console.log(
            `[IPC install-models] Model ${model} installed successfully. Final overall progress: ${overallProgress}%`
          )
          installModel(index + 1)
        } else {
          console.error(
            `[IPC install-models] Installation failed for model ${model}. Output:`,
            outputData
          )
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

ipcMain.handle('write-config', async (event, configPath = null, data) => {
  console.log('[IPC write-config] Received configPath:', configPath, 'data length:', data.length)
  try {
    if (!configPath) configPath = getUserResourcePath('config.yaml')
    await fs.promises.writeFile(configPath, data, 'utf-8')
    console.log('[IPC write-config] Write successful')
    return true
  } catch (err) {
    console.error('[IPC write-config] Error writing config.yaml:', err)
    throw err
  }
})

ipcMain.handle('get-resource-path', async (event, filePath) => {
  return getUserResourcePath(filePath)
})

ipcMain.handle('get-user-data-path', async () => {
  return app.getPath('userData')
})

// 新增：检查 Python 是否安装

ipcMain.handle('check-python', () => {
  const py = process.platform === 'win32' ? 'python' : 'python3'
  const result = spawnSync(py, ['--version'], { encoding: 'utf8' })

  if (result.error) {
    console.error(`[IPC check-python] Python 检查失败:`, result.error)
    return { success: false, version: null }
  }

  const version = result.stdout.trim() || result.stderr.trim()
  return { success: true, version }
})
ipcMain.handle('save-file', async (event, filePath, data) => {
  console.log(`[IPC save-file] 保存文件: ${filePath}`)
  try {
    await fs.promises.writeFile(filePath, data, 'utf-8')
    return { success: true }
  } catch (err) {
    console.error(`[IPC save-file] 写入失败:`, err)
    // 抛出错误会在渲染进程里以 rejected Promise 的形式出现
    throw err
  }
})

// ─── 窗口缩放接口 ──────────────────────────────────────────────────────────
ipcMain.handle('set-zoom-factor', (event, factor) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win && win.webContents) {
    win.webContents.setZoomFactor(factor)
    return true
  }
  return false
})

ipcMain.handle('get-zoom-factor', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  return win && win.webContents ? win.webContents.getZoomFactor() : 1
})

/* 主窗口创建与页面加载 */

async function createSkeletonWindow() {
  const preload = path.join(__dirname, '../preload/index.js')
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, '../renderer/assets', 'banner.png'),
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: false,
    show: false,
    webPreferences: {
      preload: preload,
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: true
    }
  })
  remoteMain.enable(win.webContents)

  // 载入骨架加载页面，替代空白界面
  const skeletonPath = path.join(__dirname, '../../public/skeleton.html')
  console.log('[main] loading skeleton screen:', skeletonPath)
  await win.loadFile(skeletonPath, {
    query: { desc: '正在检查并启动核心进程...' }
  })

  // 当骨架页面准备就绪后展示窗口
  win.once('ready-to-show', () => win.show())
  // 拦截新窗口打开请求（外链均由系统默认浏览器打开）
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  return win
}

async function loadMainInterface(win) {
  if (isDevelopment && process.env['ELECTRON_RENDERER_URL']) {
    console.log('[main] load from dev server:', process.env['ELECTRON_RENDERER_URL'])
    await win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    const indexPath = path.join(__dirname, '../renderer/index.html')
    console.log('[main] load main interface file:', indexPath)
    await win.loadFile(indexPath)
  }
}

app.on('ready', async () => {
  console.log('[main] app ready')
  const win = await createSkeletonWindow()
  // 异步启动清理操作，不阻塞主窗口创建
  clearOccupiedPorts().catch((err) => winstonLogger.log('error', '清理端口时出现错误: ' + err))

  // 为了平滑展示骨架页，等待固定时间（例如 2.5 秒），但不受清理操作影响
  await new Promise((resolve) => setTimeout(resolve, 2500))
  try {
    setTimeout(async () => {
      await loadMainInterface(win)
    }, timeout)
  } catch (err) {
    console.error('加载主界面出错:', err)
  }
})

//【修改】before-quit：
// 若用户选择“停止核心服务并退出”（shutdown-yes），则检查 childProcesses 数组，逐一清理
// 若选择“直接退出（保留后台服务）”，则直接退出，不杀子进程
app.on('before-quit', async (event) => {
  event.preventDefault()
  let shutdownWindow = new BrowserWindow({
    width: 450,
    height: 250,
    frame: false,
    resizable: false,
    movable: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  const quitHtmlPath = path.join(__dirname, '../../public/quit.html')
  try {
    await shutdownWindow.loadFile(quitHtmlPath)
  } catch (err) {
    console.error('加载退出确认页面失败:', err)
    shutdownWindow.close()
    app.quit()
    return
  }

  // 用户选择“停止核心服务并退出”
  ipcMain.once('shutdown-yes', async () => {
    console.log('用户选择停止核心服务，开始进行关闭流程……')
    const skeletonHtmlPath = path.join(__dirname, '../../public/skeleton.html')
    try {
      await shutdownWindow.loadFile(skeletonHtmlPath, {
        query: { desc: '正在停止核心进程服务，稍候片刻后将自动退出……' }
      })
    } catch (err) {
      console.error('加载骨架页面失败:', err)
      shutdownWindow.close()
      app.removeAllListeners('before-quit')
      app.quit()
      return
    }

    // 保证骨架界面展示一段时间后再退出
    setTimeout(async () => {
      try {
        // 杀死 BOT_PORT 与 APP_PORT 上的服务
        // await Promise.all([
        //   killPort(BOT_PORT),
        //   killPort(APP_PORT)
        // ]);
        // 遍历全局 childProcesses 数组，逐一杀死子进程
        childProcesses.forEach((proc) => {
          if (proc && !proc.killed) {
            try {
              proc.kill()
            } catch (e) {
              console.error('杀死子进程时出错:', e)
            }
          }
        })
        console.log('核心服务已全部停止。')
      } catch (err) {
        console.error('停止核心服务过程中出错:', err)
      } finally {
        shutdownWindow.close()
        app.removeAllListeners('before-quit')
        app.quit()
      }
    }, 2500)
  })

  // 用户选择“直接退出（保留后台服务）”
  ipcMain.once('shutdown-no', async () => {
    console.log('用户选择直接退出，保留后台服务。')
    shutdownWindow.close()
    app.removeAllListeners('before-quit')
    app.quit()
  })

  shutdownWindow.on('closed', async () => {
    app.removeAllListeners('before-quit')
    app.quit()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow().catch((err) => console.error('激活时创建窗口失败:', err))
  }
})

async function createWindow() {
  const win = await createSkeletonWindow()
  await new Promise((resolve) => setTimeout(resolve, 1000))
  await loadMainInterface(win)
  return win
}

// 开发环境下平滑退出
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') app.quit()
    })
  } else {
    process.on('SIGTERM', () => app.quit())
  }
}

/**
 * 使用跨平台方法检查指定端口是否被目标进程监听
 * 对于类 Unix 系统，利用 lsof 检查
 * 对于 Windows 使用 netstat 和 tasklist（保持原有逻辑）
 *
 * @param {number} port - 要检查的端口号
 * @param {string} executableName - 目标可执行程序名称，如 'bot' 或 'app'
 * @returns {Promise<{healthy: boolean, pid?: number}>}
 */
async function checkProcessByPort(port, executableName) {
  if (process.platform === 'win32') {
    try {
      const { stdout } = await execAsync(`netstat -ano -p tcp | findstr :${port}`)
      if (!stdout || stdout.trim() === '') {
        return { healthy: false }
      }
      const lines = stdout
        .trim()
        .split('\n')
        .map((line) => line.trim())
      for (const line of lines) {
        const parts = line.split(/\s+/)
        if (parts.length >= 5) {
          const state = parts[3]
          const pid = parts[4]
          if (state.toUpperCase() === 'LISTENING') {
            try {
              const { stdout: tasklistOutput } = await execAsync(
                `tasklist /FI "PID eq ${pid}" /FO CSV /NH`
              )
              const taskListLines = tasklistOutput.trim().split('\n')
              for (let taskLine of taskListLines) {
                taskLine = taskLine.trim()
                const columns = taskLine.split('","').map((s) => s.replace(/^"|"$/g, ''))
                if (columns.length > 0) {
                  const imageName = columns[0].toLowerCase()
                  if (imageName.includes(executableName.toLowerCase())) {
                    return { healthy: true, pid: parseInt(pid, 10) }
                  }
                }
              }
            } catch (innerErr) {
              console.error(`使用 tasklist 查询 PID ${pid} 时出错:`, innerErr)
            }
          }
        }
      }
      return { healthy: false }
    } catch (err) {
      console.error(`检查端口 ${port} 时出错:`, err)
      return { healthy: false }
    }
  } else {
    try {
      const { stdout } = await execAsync(`lsof -i :${port} -sTCP:LISTEN -n -P`)
      const lines = stdout.split('\n').filter((line) => line.trim() !== '')
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(/\s+/)
        if (parts[0].toLowerCase().includes(executableName.toLowerCase())) {
          return { healthy: true, pid: parseInt(parts[1], 10) }
        }
      }
      return { healthy: false }
    } catch (err) {
      if (err.code === 1 && !err.stdout && !err.stderr) {
        return { healthy: false }
      }
      console.error(`检查端口 ${port} 时出错:`, err)
      return { healthy: false }
    }
  }
}

/**
 * 检查指定端口是否被占用，若占用则检测该进程是否为目标可执行程序
 * 如果占用但不是目标程序，则调用 kill-port 清理
 *
 * @param {number} port - 要检测的端口号
 * @param {string} executableName - 目标可执行程序名称，如 'bot' 或 'app'
 * @returns {Promise<number|null>} 返回目标进程的 pid（如果存在），否则返回 null
 */
async function checkPortAndStore(port, executableName) {
  const result = await checkProcessByPort(port, executableName)
  if (result.healthy) {
    console.log(`${executableName} 已经在端口 ${port} 监听，pid: ${result.pid}`)
    return result.pid
  } else {
    let portInUse = false
    if (process.platform === 'win32') {
      try {
        const { stdout } = await execAsync(`netstat -ano -p tcp | findstr :${port}`)
        if (stdout && stdout.trim() !== '') {
          portInUse = true
        }
      } catch (err) {
        portInUse = false
      }
    } else {
      try {
        const { stdout } = await execAsync(`lsof -i :${port} -sTCP:LISTEN -n -P`)
        const lines = stdout.split('\n').filter((line) => line.trim() !== '')
        if (lines.length > 1) {
          portInUse = true
        }
      } catch (err) {
        if (err.code === 1 && !err.stdout && !err.stderr) {
          portInUse = false
        } else {
          portInUse = false
        }
      }
    }

    if (portInUse) {
      console.log(`端口 ${port} 被占用，但不是 ${executableName}，调用 kill-port 清理...`)
      try {
        await killPort(port)
        console.log(`端口 ${port} 已被 kill-port 清理`)
      } catch (err) {
        if (err.message && err.message.includes('No process running on port')) {
          console.log(`端口 ${port} 本就没有进程在运行。`)
        } else {
          console.error(`使用 kill-port 清理端口 ${port} 时出错:`, err)
        }
      }
    } else {
      console.log(`端口 ${port} 空闲。`)
    }
    return null
  }
}

// 打开新窗口
ipcMain.on('open-new-window-ide', (event, url) => {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    frame: true,
    autoHideMenuBar: false,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      enableRemoteModule: true,
      nativeWindowOpen: true
    }
  })

  // 允许在新窗口中使用 @electron/remote
  remoteMain.enable(win.webContents)

  // 加载带 hash 的 URL（例如 http://localhost:8080/#/ide）
  if (isDevelopment && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(url)
  } else {
    // 生产环境：把 index.html 和 Hash 一起加载
    const indexPath = path.join(__dirname, '../renderer/index.html')
    // 取出 '#/ide/...'
    const hash = url.includes('#') ? url.substring(url.indexOf('#')) : ''
    // loadFile 支持第二个参数 { hash }
    win.loadFile(indexPath, { hash })
  }
})

ipcMain.handle('check-memory-flash', async (_event, args) => {
  const dir = args.local_path
  const gitgoDir = path.join(dir, '.gitgo')

  // 检查 .gitgo 文件夹是否存在
  try {
    const stat = await fsPromises.stat(gitgoDir)
    if (!stat.isDirectory()) {
      return { exists: false, indexing: false }
    }
  } catch (err) {
    return { exists: false, indexing: false }
  }

  // 检查 code_index.db 和 code_index.faiss
  const dbPath = path.join(gitgoDir, 'code_index.db')
  const faissPath = path.join(gitgoDir, 'code_index.faiss')
  const indexing = path.join(gitgoDir, 'indexing.temp')
  const hasDb = fs.existsSync(dbPath)
  const hasFaiss = fs.existsSync(faissPath)
  const hasIndexing = fs.existsSync(indexing)

  return { exists: hasDb && hasFaiss, indexing: hasIndexing, hasDb }
})

ipcMain.handle('checkPandocIPC', async () => {
  try {
    const { stdout } = await execAsync(`${getPandocPath()} --version`)
    if (!stdout || !stdout.trim()) {
      return { installed: false }
    }
    const version = stdout.split('\n')[0]
    return { installed: true, version }    // ← 改成 return
  } catch (err) {
    console.error('检查 Pandoc 失败：', err)
    return { installed: false }
  }
})

ipcMain.handle('checkGitIPC', async () => {
  try {
    const { stdout } = await execAsync(`git --version`)
    if (!stdout || !stdout.trim()) {
      return { installed: false }
    }
    const version = stdout.split('\n')[0]
    return { installed: true, version }    // ← 改成 return
  } catch (err) {
    console.error('检查 Pandoc 失败：', err)
    return { installed: false }
  }
})

/**
 * 初始化 userData 下的 bin 目录：
 * 逐个检查源目录（开发环境：app.getAppPath()/bin，
 * 生产环境：process.resourcesPath/app.asar.unpacked/bin）中的所有文件和文件夹，
 * 如果 userData 中不存在，则复制过去。
 */
async function initializeUserDataBin() {
  console.log('[initializeUserDataBin] 初始化 userData 下的 bin 目录...');

  // 1. 确定目标目录（生产环境用 userData，开发环境指向项目 bin）
  const isProd = app.isPackaged;
  const userDataPath = isProd
    ? app.getPath('userData')
    : path.join(app.getAppPath(), 'bin');

  // 2. 版本文件路径
  const versionFilePath = path.join(userDataPath, 'app_version.json');
  const currentVersion = app.getVersion();

  // 3. 确保目标目录存在
  await fsPromises.mkdir(userDataPath, { recursive: true });

  // 4. 如果版本文件路径存在且是目录，先把它删掉
  if (fs.existsSync(versionFilePath)) {
    try {
      const stat = await fsPromises.stat(versionFilePath);
      if (stat.isDirectory()) {
        console.warn(`[initializeUserDataBin] 版本文件路径误为目录，正在删除目录：${versionFilePath}`);
        await fsPromises.rm(versionFilePath, { recursive: true, force: true });
      }
    } catch (err) {
      console.error(`[initializeUserDataBin] 检查版本文件时出错: ${err}`);
      // 继续执行，后面写文件时会再次报错或重建
    }
  }

  // 5. 读取上次保存的版本号
  let previousVersion = null;
  if (fs.existsSync(versionFilePath)) {
    try {
      const data = await fsPromises.readFile(versionFilePath, 'utf-8');
      previousVersion = JSON.parse(data).version;
    } catch (err) {
      console.warn(`[initializeUserDataBin] 无法读取版本文件: ${err}`);
    }
  }

  // 6. 判断是否为新版本
  const isNewVersion = !previousVersion || semver.gt(currentVersion, previousVersion);
  if (isNewVersion) {
    console.log(`[initializeUserDataBin] 检测到新版本: ${previousVersion || 'none'} → ${currentVersion}`);
  }

  // 7. 准备源目录路径
  const sourceBinPath = isProd
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'bin')
    : path.join(app.getAppPath(), 'bin');

  if (!fs.existsSync(sourceBinPath)) {
    console.warn(`[initializeUserDataBin] 源 bin 目录不存在：${sourceBinPath}`);
    return;
  }

  // 8. 读取源目录内容
  const entries = await fsPromises.readdir(sourceBinPath);

  // 9. 新版本时强制覆盖的名单
  const forceOverride = [
    'app',
    'app.exe',
    'bot',
    'bot.exe',
    'fm',
    'fm.exe',
    'fm_http',
    'fm_http.exe',
  ];

  // 10. 遍历复制或覆盖
  for (const name of entries) {
    const src = path.join(sourceBinPath, name);
    const dest = path.join(userDataPath, name);
    const stat = await fsPromises.stat(src);
    const shouldForce = isNewVersion && forceOverride.includes(name);

    if (stat.isDirectory()) {
      if (shouldForce || !fs.existsSync(dest)) {
        await fsPromises.cp(src, dest, { recursive: true });
        console.log(`[initializeUserDataBin] ${shouldForce ? '强制覆盖目录' : '复制目录'}：${name}`);
      }
    } else {
      if (shouldForce || !fs.existsSync(dest)) {
        await fsPromises.copyFile(src, dest);
        console.log(`[initializeUserDataBin] ${shouldForce ? '强制覆盖文件' : '复制文件'}：${name}`);
      }
    }
  }

  // 11. 新版本时写入新版号到文件
  if (isNewVersion) {
    try {
      await fsPromises.writeFile(
        versionFilePath,
        JSON.stringify({ version: currentVersion }, null, 2),
        'utf-8'
      );
      console.log(`[initializeUserDataBin] 更新版本记录文件：${versionFilePath}`);
    } catch (err) {
      console.error(`[initializeUserDataBin] 写入版本文件失败: ${err}`);
    }
    if (isProd) {
      console.log(`[initializeUserDataBin] 删除用于更新的原始文件：${sourceBinPath}`);
      try {
        await fsPromises.rm(sourceBinPath, { recursive: true, force: true });
      } catch (err) {
        console.error(`[initializeUserDataBin] 删除临时文件失败: ${err}`);
      }
    }
  }

  console.log('[initializeUserDataBin] 初始化完成！');
}
initializeUserDataBin()

ipcMain.handle('get-static-file-list', async (event, dirPath, subPath) => {
  try {
    const dir = getUserResourcePath(path.join(dirPath, subPath));
    const entries = await readdir(dir, { withFileTypes: true });
    const fileList = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        const fullPath = path.resolve(dir, entry.name);
        const stats = await stat(fullPath);
        fileList.push({
          name: entry.name,
          size: stats.size,
          creationDate: stats.birthtime,
          path: fullPath,
        });
      }
    }

    return fileList;
  } catch (err) {
    console.error(`读取目录失败：${err.message}`);
    throw err;
  }
});
console.log('main/index.js loaded!')
