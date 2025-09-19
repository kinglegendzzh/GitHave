'use strict'

const { app, BrowserWindow, ipcMain, protocol, shell, dialog } = require('electron')
const { spawn, exec, spawnSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const { existsSync } = fs
const remoteMain = require('@electron/remote/main')
const util = require('util')
const execAsync = util.promisify(exec)
const killPort = require('kill-port')
const winston = require('winston')
const { format, transports } = winston
const fsPromises = fs.promises
const { readdir, stat } = require('fs/promises')
const semver = require('semver')
const AdmZip = require('adm-zip')
const tar = require('tar')
const si = require('systeminformation')
import { fileTypeFromFile } from 'file-type'
import { lookup } from 'mime-types'
let pty
try {
  pty = require('node-pty')
} catch {
  pty = null
  console.warn('node-pty is not available on this platform')
  // 使用替代方案或禁用相关功能
}

const env = process.env

console.log('platform', process.platform)

remoteMain.initialize()
const BOT_PORT = 19150
const APP_PORT = 19151
const FM_PORT = 5532

console.log('UserData 路径是：', app.getPath('userData'))

// 协议注册 - 让浏览器能通过 githave:// 协议拉起应用
const PROTOCOL = 'githave'
let pendingDeepLinks = [] // 可能在 app ready 前到来的 URL

// ---- 单实例：Windows/Linux 深链通过 argv 进入这里
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    // Windows: argv 里包含 githave://...
    const deepLink = argv.find((a) => typeof a === 'string' && a.startsWith(`${PROTOCOL}://`))
    if (deepLink) queueDeepLink(deepLink)
    focusMainWindow()
  })
}

function focusMainWindow() {
  const win = BrowserWindow.getAllWindows()[0]
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
}

// ---- macOS: 从系统事件接收 URL
app.on('open-url', (event, url) => {
  event.preventDefault()
  queueDeepLink(url)
})

// ---- 开发态/生产态：协议注册
function registerProtocol() {
  // 生产安装版：简单注册
  if (!process.defaultApp) {
    app.setAsDefaultProtocolClient(PROTOCOL)
    return
  }
  // 开发态：传入可执行路径和入口脚本路径
  // 修复：只传入主入口文件，避免参数过长导致socket消息错误
  const exe = process.execPath
  const entry = path.resolve(__dirname, '../main/index.js')
  console.log('[registerProtocol] 开发环境协议注册:', { exe, entry })
  app.setAsDefaultProtocolClient(PROTOCOL, exe, [entry])
}

// ---- 解析 & 排队
function queueDeepLink(raw) {
  console.log('[queueDeepLink] 收到深链接:', raw)
  if (!raw) {
    console.log('[queueDeepLink] 深链接为空，跳过')
    return
  }
  pendingDeepLinks.push(raw)
  console.log('[queueDeepLink] 深链接已入队，当前队列长度:', pendingDeepLinks.length)
  dispatchDeepLinks() // 若窗口已就绪会立即派发
}

function parseDeepLink(raw) {
  try {
    // 兼容 githave://open?... 与 githave:///open?...
    // new URL 在 hostname 为空时，可从 pathname 拿路由
    const u = new URL(raw)
    const host = (u.hostname || '').trim() // 可能为空
    let route = host
    if (!route) {
      // pathname 可能是 "/open" 或 "/open/xxx"
      route = (u.pathname || '').replace(/^\/+/, '').split('/')[0]
    }
    
    // 通用参数
    const repo = u.searchParams.get('repo') || ''
    const tab = u.searchParams.get('tab') || ''
    const token = u.searchParams.get('token') || ''
    const user_id = u.searchParams.get('user_id') || ''
    const username = u.searchParams.get('username') || ''
    const email = u.searchParams.get('email') || ''
    const timestamp = u.searchParams.get('timestamp') || ''
    const verified = u.searchParams.get('verified') || ''
    
    // 导入索引操作参数
    const github = u.searchParams.get('github') || ''
    const download = u.searchParams.get('download') || ''
    const filename = u.searchParams.get('filename') || ''
    
    // 克隆仓库操作参数
     const owner = u.searchParams.get('owner') || ''
     const branch = u.searchParams.get('branch') || ''
     const description = u.searchParams.get('description') || ''
     const isPrivate = u.searchParams.get('private') === 'true'
     
     return { 
       route, repo, tab, token, user_id, username, email, timestamp, verified, 
       github, download, filename, owner, branch, description, isPrivate, raw 
     }
  } catch (e) {
    console.error('[deeplink] invalid url:', raw, e)
    return {
      route: '',
      repo: '',
      tab: '',
      token: '',
      user_id: '',
      username: '',
      email: '',
      timestamp: '',
      verified: '',
      github: '',
       download: '',
       filename: '',
       owner: '',
       branch: '',
       description: '',
       isPrivate: false,
       raw
    }
  }
}

function dispatchDeepLinks() {
  console.log('[dispatchDeepLinks] 开始派发深链接，待处理数量:', pendingDeepLinks.length)
  const win = BrowserWindow.getAllWindows()[0]
  if (!win) {
    console.log('[dispatchDeepLinks] 窗口未创建，等待窗口创建后再派发')
    return // 等窗口创建好再派发
  }

  if (pendingDeepLinks.length === 0) {
    console.log('[dispatchDeepLinks] 没有待处理的深链接')
    return
  }
  
  const batch = pendingDeepLinks.splice(0, pendingDeepLinks.length)
  console.log('[dispatchDeepLinks] 准备派发深链接批次:', batch)
  
  for (const raw of batch) {
    const payload = parseDeepLink(raw)
    console.log('[dispatchDeepLinks] 发送协议回调到前端:', payload)
    
    // 检查webContents是否可用
    if (win.webContents && !win.webContents.isDestroyed()) {
      win.webContents.send('protocol-url', payload)
      console.log('[dispatchDeepLinks] 协议回调已发送')
    } else {
      console.error('[dispatchDeepLinks] webContents不可用或已销毁')
    }
  }
  focusMainWindow()
}

// 全局变量，用于缓存正在进行的停止操作，防止重复请求
// 这些变量保留用于未来功能扩展
// let isRestartingApp = false // 保留用于未来功能扩展

//【新增】全局标记，表示正在异步清理端口占用的进程（供 check-health 使用）
let isClearingBot = false
let isClearingApp = false
let isClearingFm = false

// 服务日志监听状态
let serviceLogEnabled = true
let serviceLogListeners = new Set()
let serviceLogTimer = null // 存储日志监听的计时器ID

let winstonLogEnabled = true
let winstonLogListeners = new Set()
// let winstonLogTimer = null // 保留用于未来功能扩展

// 子进程日志监听相关变量
let childProcessLogEnabled = false
let childProcessLogListeners = new Set()

let timeout = 0

/**
 * 日志系统
 * TODO 看看为什么不tail打印了
 */
// 日志文件路径
const logFilePath = path.join(app.getPath('userData'), 'logs', 'logs.log')

// 清理所有winston日志文件的函数
async function cleanupAllLogFiles() {
  try {
    // 先刷新剩余的日志队列
    flushLogQueue()
    // 关闭winston logger的所有transports
    winstonLogger.close()
    // 等待一小段时间确保文件句柄释放
    await new Promise((resolve) => setTimeout(resolve, 100))

    // 获取日志文件所在目录
    const logDir = path.dirname(logFilePath)
    const logBaseName = path.basename(logFilePath, '.log')

    // 读取目录中的所有文件
    if (fs.existsSync(logDir)) {
      const files = fs.readdirSync(logDir)

      // 过滤出所有相关的日志文件（logs.log, logs1.log, logs2.log等）
      const logFiles = files.filter((file) => {
        return file === `${logBaseName}.log` || file.match(new RegExp(`^${logBaseName}\\d+\\.log$`))
      })

      // 删除所有找到的日志文件
      for (const logFile of logFiles) {
        const fullPath = path.join(logDir, logFile)
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath)
          console.log(`日志文件已清理: ${logFile}`)
        }
      }

      if (logFiles.length === 0) {
        console.log('未找到需要清理的日志文件')
      }
    }
  } catch (err) {
    console.error('清理日志文件时出错:', err)
  }
}
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

    // 如果启用了winston日志监听，发送日志到前端
    if (winstonLogEnabled && winstonLogListeners.size > 0) {
      const logData = {
        serviceName: 'system', // winston日志标记为系统日志
        type: level === 'error' ? 'error' : level === 'success' ? 'success' : 'info',
        message: message.trim(),
        timestamp: new Date().toISOString()
      }

      // 向所有监听的窗口发送日志
      // 使用Array.from创建一个副本进行迭代，避免在迭代过程中修改集合
      Array.from(winstonLogListeners).forEach((sender) => {
        try {
          // 检查sender是否已被销毁
          if (sender.isDestroyed()) {
            // 如果已被销毁，从集合中移除
            winstonLogListeners.delete(sender)
            console.log('已移除已销毁的winston日志监听器')
          } else {
            sender.send('winston-log', logData)
          }
        } catch (err) {
          console.error('发送winston日志失败:', err)
          // 出错时也从集合中移除该sender
          winstonLogListeners.delete(sender)
        }
      })
    }
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

  // 即时发送winston日志到前端，不等待队列刷新
  if (winstonLogEnabled && winstonLogListeners.size > 0) {
    const logData = {
      serviceName: 'system',
      type: level === 'error' ? 'error' : level === 'success' ? 'success' : 'info',
      message: message.trim(),
      timestamp: new Date().toISOString()
    }

    // 使用Array.from创建一个副本进行迭代，避免在迭代过程中修改集合
    Array.from(winstonLogListeners).forEach((sender) => {
      try {
        // 检查sender是否已被销毁
        if (sender.isDestroyed()) {
          // 如果已被销毁，从集合中移除
          winstonLogListeners.delete(sender)
          console.log('已移除已销毁的winston日志监听器')
        } else {
          sender.send('winston-log', logData)
        }
      } catch (err) {
        console.error('发送winston日志失败:', err)
        // 出错时也从集合中移除该sender
        winstonLogListeners.delete(sender)
      }
    })
  }
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
// let botProcess = null // 保留用于未来功能扩展
// let appProcess = null // 保留用于未来功能扩展
let childProcesses = []
// const STATIC_SERVER_PORT = 19166 // 保留用于未来功能扩展

// 保留启动静态服务器函数（仅开发环境可能使用）
// async function startStaticServer() {
//   const staticRoot = path.resolve(__dirname, '../renderer')
//   if (!existsSync(staticRoot)) {
//     throw new Error(`静态目录不存在: ${staticRoot}`)
//   }
//   const httpServer = require('http-server')
//   const server = httpServer.createServer({ root: staticRoot })
//   return new Promise((resolveServer, reject) => {
//     server.listen(STATIC_SERVER_PORT, '127.0.0.1', (err) => {
//       if (err) {
//         reject(err)
//       } else {
//         console.log(`[static-server] started at http://127.0.0.1:${STATIC_SERVER_PORT}`)
//         resolveServer()
//       }
//     })
//   })
// }

// 注册 scheme，保证安全性
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

// 根据是否打包，修改资源路径
// function getResourcePath(fileName) {
//   if (app.isPackaged) {
//     console.log('app.getAppPath()', app.getAppPath())
//     return path.join(process.resourcesPath, 'app.asar.unpacked', 'bin', fileName)
//   }
//   console.log('app.getAppPath()', app.getAppPath())
//   return path.join(app.getAppPath(), 'bin', fileName)
// }

function getUserResourcePath(fileName) {
  if (app.isPackaged) {
    const p = path.join(app.getPath('userData'), fileName)
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

  // 发送服务日志到前端的辅助函数
  const sendServiceLogToFrontend = (type, message, serviceName) => {
    if (serviceLogEnabled && serviceLogListeners.size > 0) {
      const logData = {
        serviceName: serviceName,
        type: type, // 'info', 'error', 'success'
        message: message.trim(),
        timestamp: new Date().toISOString()
      }
      // 向所有监听的窗口发送日志
      serviceLogListeners.forEach((sender) => {
        try {
          sender.send('service-log', logData)
        } catch (err) {
          console.error('发送服务日志失败:', err)
        }
      })
    }
  }

  // 定义独立的事件处理函数，方便后面移除监听器
  const onStdoutData = (chunk) => {
    const dataStr = chunk.toString()
    // console.log(dataStr);
    // 同时调用 winstonLogger.log 记录日志
    winstonLogger.log('info', dataStr)

    // 发送实时日志到前端（根据进程标记确定服务名称）
    if (proc.tag) {
      sendServiceLogToFrontend('info', dataStr, proc.tag)
    }
  }

  const onStderrData = (chunk) => {
    const dataStr = chunk.toString()
    // console.error(dataStr);
    winstonLogger.log('error', dataStr)

    // 发送实时日志到前端（根据进程标记确定服务名称）
    if (proc.tag) {
      sendServiceLogToFrontend('error', dataStr, proc.tag)
    }
  }

  if (proc.stdout) {
    proc.stdout.on('data', onStdoutData)
  }
  if (proc.stderr) {
    proc.stderr.on('data', onStderrData)
  }

  // 将子进程保存到全局 childProcesses 数组中
  childProcesses.push(proc)

  // 如果子进程日志监听已启用，为新进程添加日志监听器
  if (childProcessLogEnabled && childProcessLogListeners.size > 0) {
    // 添加stdout监听器
    if (proc.stdout) {
      const onChildStdoutData = (chunk) => {
        const dataStr = chunk.toString()
        const logData = {
          serviceName: proc.tag || 'unknown',
          type: 'info',
          message: dataStr.trim(),
          timestamp: new Date().toISOString()
        }

        // 使用Array.from创建一个副本进行迭代，避免在迭代过程中修改集合
        Array.from(childProcessLogListeners).forEach((sender) => {
          try {
            // 检查sender是否已被销毁
            if (sender.isDestroyed()) {
              // 如果已被销毁，从集合中移除
              childProcessLogListeners.delete(sender)
              console.log('已移除已销毁的子进程日志监听器')
            } else {
              sender.send('child-process-log', logData)
            }
          } catch (err) {
            console.error('发送子进程日志失败:', err)
            // 出错时也从集合中移除该sender，避免持续刷屏
            childProcessLogListeners.delete(sender)
            console.log('已移除失效的子进程日志监听器')
          }
        })
      }

      proc.stdout.on('data', onChildStdoutData)
      proc._stdoutHandler = onChildStdoutData
    }

    // 添加stderr监听器
    if (proc.stderr) {
      const onChildStderrData = (chunk) => {
        const dataStr = chunk.toString()
        const logData = {
          serviceName: proc.tag || 'unknown',
          type: 'error',
          message: dataStr.trim(),
          timestamp: new Date().toISOString()
        }

        // 使用Array.from创建一个副本进行迭代，避免在迭代过程中修改集合
        Array.from(childProcessLogListeners).forEach((sender) => {
          try {
            // 检查sender是否已被销毁
            if (sender.isDestroyed()) {
              // 如果已被销毁，从集合中移除
              childProcessLogListeners.delete(sender)
              console.log('已移除已销毁的子进程日志监听器')
            } else {
              sender.send('child-process-log', logData)
            }
          } catch (err) {
            console.error('发送子进程日志失败:', err)
            // 出错时也从集合中移除该sender，避免持续刷屏
            childProcessLogListeners.delete(sender)
            console.log('已移除失效的子进程日志监听器')
          }
        })
      }

      proc.stderr.on('data', onChildStderrData)
      proc._stderrHandler = onChildStderrData
    }

    proc._logListenersAttached = true
  }

  // 监听子进程的退出事件
  proc.on('close', (code, signal) => {
    // 清理 stdout 和 stderr 上的事件监听器
    if (proc.stdout) {
      proc.stdout.removeListener('data', onStdoutData)
      if (proc._stdoutHandler) {
        proc.stdout.removeListener('data', proc._stdoutHandler)
        delete proc._stdoutHandler
      }
      proc.stdout.removeAllListeners('data')
    }
    if (proc.stderr) {
      proc.stderr.removeListener('data', onStderrData)
      if (proc._stderrHandler) {
        proc.stderr.removeListener('data', proc._stderrHandler)
        delete proc._stderrHandler
      }
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

// 安装状态跟踪
const installationStatus = {
  python: { installed: false, installing: false, progress: 0, name: 'Python' },
  git: { installed: false, installing: false, progress: 0, name: 'Git' },
  pandoc: { installed: false, installing: false, progress: 0, name: 'Pandoc' }
}

// 检查命令是否可用（如果是Windows，则直接执行对应指令来判断）
async function checkCommand(command) {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      // 绝对路径（含盘符或 .exe 或者反斜杠），直接校验是否存在
      const looksLikePath =
        /:\\/.test(command) || command.toLowerCase().endsWith('.exe') || command.includes('\\')
      if (looksLikePath) {
        try {
          // 如果文件存在就直接返回该路径；否则尝试 --version 验证
          if (existsSync(command)) {
            return resolve(command)
          }
          exec(`"${command}" --version`, (error) => {
            return resolve(!error || !error.code ? command : null)
          })
        } catch {
          return resolve(null)
        }
        return
      }

      switch (command) {
        case 'python':
        case 'python3':
          exec(`python --version`, (error, stdout) => {
            console.log(`python --version: ${stdout}`)
            resolve(!error || !error.code ? stdout.trim() : null)
          })
          return // 防止继续执行Unix命令
        case 'git':
          exec(`git --version`, (error, stdout) => {
            console.log(`git --version: ${stdout}`)
            resolve(!error || !error.code ? stdout.trim() : null)
          })
          return // 防止继续执行Unix命令
        case 'pandoc':
          exec(`pandoc --version`, (error, stdout) => {
            console.log(`pandoc --version: ${stdout}`)
            resolve(!error || !error.code ? stdout.trim() : null)
          })
          return // 防止继续执行Unix命令
        case 'ollama':
          // 优先用 where 定位绝对路径；失败则回退到 --version 判断 PATH 可执行
          exec(`where ollama`, (err, stdout) => {
            if (!err && stdout && stdout.trim()) {
              const first = stdout.split(/\r?\n/).find(Boolean)
              resolve(first ? first.trim() : 'ollama')
            } else {
              exec(`ollama --version`, (error2) => {
                resolve(!error2 || !error2.code ? 'ollama' : null)
              })
            }
          })
          return // 防止继续执行Unix命令
      }
    }
    // 只在非Windows系统上执行
    exec(`command -v ${command}`, (error, stdout) => {
      console.log(`command -v ${command}: ${stdout}`)
      resolve(!error || !error.code ? stdout.trim() : null)
    })
  })
}

// 获取系统架构
async function getSystemArchitecture() {
  try {
    // 先获取当前进程架构
    const { stdout: processArch } = await execAsync('/usr/bin/uname -m')
    console.log(`当前进程架构: ${processArch.trim()}`)

    // 检查是否支持 arm64 执行
    try {
      // 尝试使用 arch -arm64 运行一个简单命令
      await execAsync('/usr/bin/arch -arm64 echo "Testing arm64 support"')
      console.log('系统支持 arm64 执行')

      // 如果能够运行 arm64 命令，则说明系统上有 arm64 支持
      // 这通常表示这是一台 Apple Silicon Mac
      if (processArch.trim() === 'x86_64') {
        console.log('检测到在 Apple Silicon 上使用 Rosetta 2 运行')
      }

      // 即使当前在 Rosetta 下运行，也返回 arm64，以使用适当的 Homebrew 路径
      return 'arm64'
    } catch {
      // 如果不能运行 arm64 命令，说明这是一台 Intel Mac
      console.log('系统不支持 arm64 执行，可能是 Intel Mac')
      return 'x86_64'
    }
  } catch (error) {
    console.error('获取系统架构失败:', error)
    // 当无法确定时，根据 process.arch 来决定
    return process.arch.includes('arm') ? 'arm64' : 'x86_64'
  }
}

let globalBrewPath = null

// 配置 Homebrew 国内镜像源
async function configureBrewMirror() {
  if (!globalBrewPath) {
    console.log('未找到 Homebrew 路径，跳过镜像配置')
    return
  }

  try {
    // const mirrorCommands = [
    //   'export HOMEBREW_BOTTLE_DOMAIN=https://mirrors.aliyun.com/homebrew/homebrew-bottles',
    //   'export HOMEBREW_API_DOMAIN=https://mirrors.aliyun.com/homebrew/homebrew-bottles/api',
    //   'export HOMEBREW_BREW_GIT_REMOTE=https://mirrors.aliyun.com/homebrew/brew.git',
    //   'export HOMEBREW_CORE_GIT_REMOTE=https://mirrors.aliyun.com/homebrew/homebrew-core.git'
    // ]

    // 设置环境变量到当前进程
    process.env.HOMEBREW_BOTTLE_DOMAIN = 'https://mirrors.aliyun.com/homebrew/homebrew-bottles'
    process.env.HOMEBREW_API_DOMAIN = 'https://mirrors.aliyun.com/homebrew/homebrew-bottles/api'
    process.env.HOMEBREW_BREW_GIT_REMOTE = 'https://mirrors.aliyun.com/homebrew/brew.git'
    process.env.HOMEBREW_CORE_GIT_REMOTE = 'https://mirrors.aliyun.com/homebrew/homebrew-core.git'

    console.log('已配置 Homebrew 国内镜像源 (阿里云)')
    console.log('HOMEBREW_BOTTLE_DOMAIN:', process.env.HOMEBREW_BOTTLE_DOMAIN)
    console.log('HOMEBREW_API_DOMAIN:', process.env.HOMEBREW_API_DOMAIN)

    // 可选：更新 tap 源
    // try {
    //   await execAsync(
    //     `${globalBrewPath} tap --custom-remote homebrew/core https://mirrors.aliyun.com/homebrew/homebrew-core.git`
    //   )
    //   console.log('已更新 homebrew/core tap 源为国内镜像')
    // } catch (tapError) {
    //   console.log('更新 tap 源失败，但不影响正常使用:', tapError.message)
    // }
  } catch (error) {
    console.error('配置 Homebrew 镜像源失败:', error.message)
  }
}

async function initBrewPath() {
  const arch = await getSystemArchitecture()
  // 检查默认路径
  const defaultBrewPath = arch === 'arm64' ? '/opt/homebrew/bin/brew' : '/usr/local/bin/brew'
  if (fs.existsSync(defaultBrewPath)) {
    console.log(`找到 Homebrew 的默认路径: ${defaultBrewPath}, 架构: ${arch}`)
    globalBrewPath = defaultBrewPath
    await configureBrewMirror()
    updateBrew()
    return
  }

  // 如果默认路径不存在，尝试使用 command -v 来找
  const brewPath = await checkCommand('brew')
  if (brewPath) {
    console.log(`找到 Homebrew 的路径: ${brewPath}, 架构: ${arch}`)
    globalBrewPath = brewPath
    await configureBrewMirror()
    updateBrew()
    return
  }

  // 检查另一个可能的路径 (架构不同的路径)
  const alternativePath = arch === 'arm64' ? '/usr/local/bin/brew' : '/opt/homebrew/bin/brew'
  if (fs.existsSync(alternativePath)) {
    console.log(`找到 Homebrew 的替代路径: ${alternativePath}, 架构: ${arch}`)
    globalBrewPath = alternativePath
    await configureBrewMirror()
    updateBrew()
    return
  }
  // 找不到 Homebrew
  console.log(`未找到 Homebrew, 架构: ${arch}`)
  return null
}

async function updateBrew() {
  if (process.platform === 'darwin') {
    console.log('当前平台为 macOS')
    const brewPath = await getBrewPath()
    // 如果找到了 Homebrew 路径，获取版本信息
    if (brewPath) {
      execAsync(`${globalBrewPath} update`)
        .then(({ stdout }) => {
          console.log('Homebrew 版本更新信息:', stdout)
        })
        .catch((err) => {
          console.error('Homebrew 更新失败:', err)
        })
    }
  }
}

// 根据架构获取 Homebrew 路径
async function getBrewPath() {
  return globalBrewPath
}

// 检查 Homebrew 是否安装
async function checkBrewInstalled() {
  try {
    const brewPath = await getBrewPath()

    // 如果找到了 Homebrew 路径，获取版本信息
    if (brewPath) {
      const { stdout } = await execAsync(`${brewPath} --version`)
      const version = stdout.trim()
      const arch = await getSystemArchitecture()

      return {
        installed: true,
        version: version,
        path: brewPath,
        architecture: arch
      }
    }

    // 找不到 Homebrew
    return {
      installed: false,
      version: null,
      path: null
    }
  } catch (error) {
    console.error('检查 Homebrew 安装状态失败:', error)
    return {
      installed: false,
      error: error.message
    }
  }
}

// 检查所有依赖的状态
async function checkDependenciesStatus() {
  const results = {}
  for (const [pkg, status] of Object.entries(installationStatus)) {
    const isInstalled = await checkCommand(pkg === 'python' ? 'python3' : pkg)
    status.installed = isInstalled !== null
    status.progress = isInstalled ? 100 : 0
    results[pkg] = { ...status }
  }
  return results
}

// 安装单个包
async function installPackage(pkgName, event = null) {
  // 发送日志到前端的辅助函数
  const sendLogToFrontend = (type, message) => {
    if (event) {
      event.sender.send('install-log', {
        packageName: pkgName,
        type: type, // 'info', 'error', 'success'
        message: message,
        timestamp: new Date().toISOString()
      })
    }
    // 同时输出到控制台
    if (type === 'error') {
      console.error(message)
    } else {
      console.log(message)
    }
  }

  if (process.platform !== 'win32') {
    const brewPath = await getBrewPath()

    if (!brewPath) {
      const errorMsg = 'Homebrew 未安装，无法继续安装包'
      sendLogToFrontend('error', errorMsg)
      return { success: false, message: errorMsg }
    }

    if (installationStatus[pkgName]?.installing) {
      const errorMsg = `${pkgName} is already being installed`
      sendLogToFrontend('error', errorMsg)
      return { success: false, message: errorMsg }
    }

    installationStatus[pkgName].installing = true
    installationStatus[pkgName].progress = 10
    installationStatus[pkgName].installed = false

    // 获取当前架构信息
    const processArch = await execAsync('/usr/bin/uname -m').then(({ stdout }) => stdout.trim())
    const isAppleSilicon = brewPath.includes('/opt/homebrew')
    const runningUnderRosetta = isAppleSilicon && processArch === 'x86_64'

    const archInfo = `安装 ${pkgName}: 进程架构=${processArch}, 是否在 Rosetta 下运行=${runningUnderRosetta}`
    sendLogToFrontend('info', archInfo)

    return new Promise((resolve) => {
      let brewInstall
      const packageToInstall = pkgName === 'python' ? 'python@3.11' : pkgName

      // 如果在 Apple Silicon 上使用 Rosetta 2 运行，需要使用 arch -arm64 来强制以 ARM 模式运行 brew
      if (runningUnderRosetta) {
        const cmdInfo = `使用 arch -arm64 强制以 ARM 模式运行: ${brewPath} install ${packageToInstall}`
        sendLogToFrontend('info', cmdInfo)
        brewInstall = spawn('/usr/bin/arch', ['-arm64', brewPath, 'install', packageToInstall])
      } else {
        const cmdInfo = `正常运行: ${brewPath} install ${packageToInstall}`
        sendLogToFrontend('info', cmdInfo)
        brewInstall = spawn(brewPath, ['install', packageToInstall])
      }

      brewInstall.stdout.on('data', (data) => {
        const output = data.toString().trim()
        if (output) {
          sendLogToFrontend('info', `[${pkgName}] ${output}`)
        }
        installationStatus[pkgName].progress = Math.min(
          installationStatus[pkgName].progress + 30,
          90
        )
      })

      brewInstall.stderr.on('data', (data) => {
        const output = data.toString().trim()
        if (output) {
          sendLogToFrontend('error', `[${pkgName} 错误] ${output}`)
        }
      })

      brewInstall.on('close', (code) => {
        const success = code === 0
        installationStatus[pkgName].installing = false
        installationStatus[pkgName].installed = success
        installationStatus[pkgName].progress = success ? 100 : 0

        if (success) {
          const successMsg = `${pkgName} 安装成功完成`
          sendLogToFrontend('success', successMsg)
        } else {
          const errorMsg = `${pkgName} 安装失败，退出码: ${code}`
          sendLogToFrontend('error', errorMsg)
        }

        resolve({ success, code, logs: [] })
      })
    })
  } else {
    // Windows 安装部分
    if (installationStatus[pkgName]?.installing) {
      const errorMsg = `${pkgName} is already being installed`
      sendLogToFrontend('error', errorMsg)
      return { success: false, message: errorMsg }
    }

    installationStatus[pkgName].installing = true
    installationStatus[pkgName].progress = 10
    installationStatus[pkgName].installed = false

    const startMsg = `开始在 Windows 上安装 ${pkgName}`
    sendLogToFrontend('info', startMsg)

    return new Promise((resolve) => {
      let installCommand, installArgs

      switch (pkgName) {
        case 'python':
        case 'python3': {
          // Windows系统下直接打开微软商店Python页面
          const pythonStoreUrl = 'ms-windows-store://pdp/?productid=9NRWMJP3717K' // Python 3.11官方版本
          sendLogToFrontend('info', '正在打开微软商店Python页面，请手动安装Python...')

          shell
            .openExternal(pythonStoreUrl)
            .then(() => {
              sendLogToFrontend('success', '已打开微软商店Python页面，请按照页面提示完成安装')

              // 由于是手动安装，我们不能确定安装状态，建议用户安装完成后重新检测
              installationStatus[pkgName].installing = false
              installationStatus[pkgName].progress = 50 // 设置为50%表示已引导用户

              resolve({
                success: true,
                code: 0,
                message: '已打开微软商店，请手动完成Python安装后重新检测环境',
                logs: []
              })
            })
            .catch((error) => {
              const errorMsg = `打开微软商店失败: ${error.message}`
              sendLogToFrontend('error', errorMsg)
              installationStatus[pkgName].installing = false
              resolve({ success: false, message: errorMsg })
            })
          return // 提前返回，避免继续执行后面的代码
        }
        case 'git': {
          installCommand = 'winget'
          installArgs = ['install', '--id', 'Git.Git', '-e']
          break
        }
        case 'pandoc': {
          installCommand = 'winget'
          installArgs = [
            'install',
            '--source',
            'winget',
            '--exact',
            '--id',
            'JohnMacFarlane.Pandoc'
          ]
          break
        }
        default: {
          installationStatus[pkgName].installing = false
          const errorMsg = `Unknown package: ${pkgName}`
          sendLogToFrontend('error', errorMsg)
          return resolve({ success: false, message: errorMsg })
        }
      }

      const cmdInfo = `执行命令: ${installCommand} ${installArgs.join(' ')}`
      sendLogToFrontend('info', cmdInfo)

      const installProcess = spawn(installCommand, installArgs, { shell: true })

      installProcess.stdout.on('data', (data) => {
        const output = data.toString().trim()
        if (output) {
          sendLogToFrontend('info', `[${pkgName}] ${output}`)
        }
        installationStatus[pkgName].progress = Math.min(
          installationStatus[pkgName].progress + 30,
          90
        )
      })

      installProcess.stderr.on('data', (data) => {
        const output = data.toString().trim()
        if (output) {
          sendLogToFrontend('error', `[${pkgName} 错误] ${output}`)
        }
      })

      installProcess.on('close', (code) => {
        const success = code === 0
        installationStatus[pkgName].installing = false
        installationStatus[pkgName].installed = success
        installationStatus[pkgName].progress = success ? 100 : 0

        if (success) {
          const successMsg = `${pkgName} 安装成功完成`
          sendLogToFrontend('success', successMsg)
        } else {
          const errorMsg = `${pkgName} 安装失败，退出码: ${code}`
          sendLogToFrontend('error', errorMsg)
        }

        resolve({ success, code, logs: [] })
      })
    })
  }
}

// 批量安装所有需要的包
async function installRequiredPackages(event = null) {
  // 发送开始安装日志
  const sendLogToFrontend = (type, message) => {
    if (event) {
      event.sender.send('install-log', { type, message })
    }
    // 同时输出到控制台
    if (type === 'error') {
      console.error(message)
    } else {
      console.log(message)
    }
  }

  sendLogToFrontend('info', '开始批量安装依赖包...')

  // 重置安装状态
  for (const pkg of Object.keys(installationStatus)) {
    installationStatus[pkg].installed =
      (await checkCommand(pkg === 'python' ? 'python3' : pkg)) !== null
    installationStatus[pkg].progress = installationStatus[pkg].installed ? 100 : 0
  }

  // 安装缺失的包
  const packagesToInstall = Object.entries(installationStatus)
    .filter(([, status]) => !status.installed)
    .map(([pkg]) => pkg)

  if (packagesToInstall.length === 0) {
    sendLogToFrontend('success', '所有依赖包已安装，无需重复安装')
    return { success: true, message: 'All required packages are already installed' }
  }

  sendLogToFrontend(
    'info',
    `发现 ${packagesToInstall.length} 个未安装的依赖包: ${packagesToInstall.join(', ')}`
  )

  try {
    for (const pkg of packagesToInstall) {
      sendLogToFrontend('info', `开始安装 ${pkg}...`)
      await installPackage(pkg, event)
      sendLogToFrontend('success', `${pkg} 安装完成`)
    }
    sendLogToFrontend('success', '所有依赖包安装完成！')
    return { success: true, message: 'All packages installed successfully' }
  } catch (error) {
    const errorMsg = `批量安装失败: ${error.message}`
    sendLogToFrontend('error', errorMsg)
    return { success: false, message: `Installation failed: ${error.message}` }
  }
}

// 打开新窗口
ipcMain.on('open-new-window', (event, url) => {
  const win = new BrowserWindow({
    width: 1440,
    height: 1000,
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

ipcMain.handle('sys-config', async () => {
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

ipcMain.handle('fm-config', async () => {
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
ipcMain.handle('start-bot', async (_, configPath) => {
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
  const newBot = spawnAndTrack(
    botPath,
    ['-config', configPath, '-db', getUserResourcePath('githave.db')],
    {
      detached: true,
      stdio: 'ignore'
    }
  )
  newBot.unref()
  newBot.tag = 'bot' // 设置标记以便后续识别
  winstonLogger.log('info', `[IPC start-bot] Bot 启动成功，新的 pid: ${newBot.pid}`)
  return { started: true, pid: newBot.pid }
})

// 修改后的 stop-bot IPC 处理函数
ipcMain.handle('stop-bot', async () => {
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
  // 启用服务日志监听，但不重复添加监听器（由start-service-log统一管理）
  serviceLogEnabled = true

  // 清除之前的计时器（如果存在）
  if (serviceLogTimer) {
    clearTimeout(serviceLogTimer)
  }

  // 设置10分钟自动停止日志监听的计时器，防止内存泄漏
  serviceLogTimer = setTimeout(
    () => {
      console.log('[start-app] 10分钟计时器到期，自动停止服务日志监听')
      serviceLogEnabled = false
      serviceLogListeners.clear()
      serviceLogTimer = null
    },
    10 * 60 * 1000
  ) // 10分钟

  // 发送启动开始日志
  event.sender.send('service-log', {
    serviceName: 'app',
    type: 'info',
    message: '正在启动核心服务...',
    timestamp: new Date().toISOString()
  })

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
    event.sender.send('service-log', {
      serviceName: 'app',
      type: 'info',
      message: '核心服务已在运行中',
      timestamp: new Date().toISOString()
    })
    return { started: true, message: 'App already running', pid: existingApp.pid }
  }

  const appPath = getExecutablePath('app')
  const newApp = spawnAndTrack(
    appPath,
    ['-config', configPath, '-db', getUserResourcePath('githave.db')],
    {
      detached: true,
      stdio: 'pipe'
    }
  )
  newApp.unref()
  newApp.tag = 'app' // 设置标记以便后续识别

  event.sender.send('service-log', {
    serviceName: 'app',
    type: 'success',
    message: `核心服务启动成功，进程ID: ${newApp.pid}`,
    timestamp: new Date().toISOString()
  })

  winstonLogger.log('info', `[IPC start-app] App 启动成功，新的 pid: ${newApp.pid}`)
  return { started: true, pid: newApp.pid }
})

// 修改后的 stop-app IPC 处理函数
ipcMain.handle('stop-app', async () => {
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
  // 启用服务日志监听，但不重复添加监听器（由start-service-log统一管理）
  serviceLogEnabled = true

  // 清除之前的计时器（如果存在）
  if (serviceLogTimer) {
    clearTimeout(serviceLogTimer)
  }

  // 设置10分钟自动停止日志监听的计时器，防止内存泄漏
  serviceLogTimer = setTimeout(
    () => {
      console.log('[start-fm_http] 10分钟计时器到期，自动停止服务日志监听')
      serviceLogEnabled = false
      serviceLogListeners.clear()
      serviceLogTimer = null
    },
    10 * 60 * 1000
  ) // 10分钟

  // 发送启动开始日志
  event.sender.send('service-log', {
    serviceName: 'fm_http',
    type: 'info',
    message: '正在启动索引服务...',
    timestamp: new Date().toISOString()
  })

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
    event.sender.send('service-log', {
      serviceName: 'fm_http',
      type: 'info',
      message: '索引服务已在运行中',
      timestamp: new Date().toISOString()
    })
    return { started: true, message: 'fm_http already running', pid: existingFmHttp.pid }
  }

  const fmHttpPath = getExecutablePath('fm_http')
  const newFmHttp = spawnAndTrack(fmHttpPath, ['-config', configPath], {
    detached: true,
    stdio: 'pipe'
  })
  newFmHttp.unref()
  newFmHttp.tag = 'fm_http' // 设置标记以便后续识别

  event.sender.send('service-log', {
    serviceName: 'fm_http',
    type: 'success',
    message: `索引服务启动成功，进程ID: ${newFmHttp.pid}`,
    timestamp: new Date().toISOString()
  })

  winstonLogger.log('info', `[IPC start-fm_http] fm_http 启动成功，新的 pid: ${newFmHttp.pid}`)
  return { started: true, pid: newFmHttp.pid }
})

// 修改后的 stop-fm_http IPC 处理函数
ipcMain.handle('stop-fm_http', async () => {
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
    return results.filter((item) => item !== null)
  } catch (err) {
    console.error('[IPC read-directory] Error reading directory:', err)
    throw err
  }
})

ipcMain.handle('read-file', async (event, filePath, options = {}) => {
  console.log('[IPC read-file] Received filePath:', filePath, options)
  try {
    let encoding = options.encoding !== undefined ? options.encoding : 'utf-8'
    let maxBytes = options.maxBytes
    if (encoding === null) {
      // 读取 Buffer
      const fd = await fs.promises.open(filePath, 'r')
      const stat = await fd.stat()
      const length = maxBytes ? Math.min(stat.size, maxBytes) : stat.size
      const buffer = Buffer.alloc(length)
      await fd.read(buffer, 0, length, 0)
      await fd.close()
      return buffer
    } else {
      // 读取字符串
      let data = await fs.promises.readFile(filePath, encoding)
      if (maxBytes) {
        data = data.slice(0, maxBytes)
      }
      return data
    }
  } catch (err) {
    console.error('[IPC read-file] Error reading file:', err)
    throw err
  }
})

// Handle image file reading as blob
ipcMain.handle('read-image-blob', async (event, filePath) => {
  console.log('[IPC read-image-blob] Received filePath:', filePath)
  try {
    // Read image file as buffer (binary data)
    const imageBuffer = await fs.promises.readFile(filePath)
    console.log('[IPC read-image-blob] Image file read successfully, size:', imageBuffer.length)

    // Convert buffer to base64
    const base64Data = imageBuffer.toString('base64')

    // Determine MIME type based on file extension
    const ext = path.extname(filePath).toLowerCase()
    let mimeType = 'image/jpeg' // default

    switch (ext) {
      case '.png':
        mimeType = 'image/png'
        break
      case '.jpg':
      case '.jpeg':
        mimeType = 'image/jpeg'
        break
      case '.gif':
        mimeType = 'image/gif'
        break
      case '.webp':
        mimeType = 'image/webp'
        break
      case '.svg':
        mimeType = 'image/svg+xml'
        break
      case '.bmp':
        mimeType = 'image/bmp'
        break
      default:
        mimeType = 'image/jpeg'
    }

    // Return data URL format
    return `data:${mimeType};base64,${base64Data}`
  } catch (err) {
    console.error('[IPC read-image-blob] Error reading image file:', err)
    throw err
  }
})

// Handle large file reading in chunks
ipcMain.handle('read-file-chunks', async (event, filePath, options = {}) => {
  console.log('[IPC read-file-chunks] Reading large file:', filePath)
  try {
    const stats = await fs.promises.stat(filePath)
    const fileSize = stats.size
    const encoding = options.encoding || 'utf-8'
    const chunkSize = 1024 * 1024 // 1MB chunks

    // For files smaller than 10MB, read the entire file
    if (fileSize < 10 * 1024 * 1024) {
      const content = await fs.promises.readFile(filePath, { encoding })
      return content
    }

    // For larger files, read the first portion (up to maxLines)
    const maxLines = options.maxLines || 1000
    const fileHandle = await fs.promises.open(filePath, 'r')
    const buffer = Buffer.alloc(chunkSize)
    let bytesRead = 0
    let content = ''
    let lineCount = 0

    try {
      while (lineCount < maxLines) {
        const { bytesRead: read } = await fileHandle.read(buffer, 0, chunkSize, bytesRead)
        if (read === 0) break // End of file

        const chunk = buffer.toString(encoding, 0, read)
        content += chunk

        // Count lines
        const lines = content.split(/\r?\n/)
        lineCount = lines.length

        if (lineCount >= maxLines) {
          // Truncate to maxLines
          content = lines.slice(0, maxLines).join('\n')
          break
        }

        bytesRead += read
        if (bytesRead >= fileSize) break // End of file
      }

      return content + '\n...\n(文件过大，仅显示部分内容)'
    } finally {
      await fileHandle.close()
    }
  } catch (error) {
    console.error('[IPC read-file-chunks] Error reading large file:', error)
    throw error
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
    console.error(`[IPC open-path-with-app] Error opening ${targetPath} with ${appPath}:`, error)
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
/**
 * 保证返回一个可执行命令名或绝对路径，
 * which 找不到也返回命令名本身，让 shell 去 PATH 里找。
 */
async function resolveCommand(cmd) {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      console.log(`[resolveCommand] Windows platform, resolving via 'where': ${cmd}`)
      exec(`where ${cmd}`, (error, stdout) => {
        if (!error && stdout && stdout.trim()) {
          const first = stdout.split(/\r?\n/).find(Boolean)
          console.log(`[resolveCommand] Resolved path (win): ${first ? first.trim() : cmd}`)
          resolve(first ? first.trim() : cmd)
        } else {
          console.log(`[resolveCommand] 'where' failed, fallback to cmd name: ${cmd}`)
          resolve(cmd)
        }
      })
      return
    }
    getSystemArchitecture().then((arch) => {
      console.log(`[resolveCommand] System architecture: ${arch}`)
      const command = `which ${cmd}`
      console.log(`[resolveCommand] Executing: ${command}`)
      exec(
        `bash -l -c "export PATH=$PATH:/opt/homebrew/bin:/usr/local/bin &&  ${command}"`,
        { env },
        (error, stdout, stderr) => {
          console.log(`stdout: ${stdout}`)
          console.error(`stderr: ${stderr}`)
          if (error || !stdout.trim()) {
            console.log(
              `[resolveCommand] Not found or error, returning original command: ${cmd} ${stdout} ${stderr}`,
              error ? error.message : ''
            )
            resolve(cmd)
          } else {
            console.log(`[resolveCommand] Resolved path: ${stdout.trim()}`)
            resolve(stdout.trim())
          }
        }
      )
    })
  })
}

let pandocPath = null
let gitPath = null
let ollamaPath = null

async function initPandocPath() {
  pandocPath = await resolveCommand('pandoc')
  console.log('[init][PandocPath] pandocPath:', pandocPath)
}

async function initGitPath() {
  gitPath = await resolveCommand('git')
  console.log('[init][GitPath] gitPath:', gitPath)
}

async function initOllamaPath() {
  ollamaPath = await resolveCommand('ollama')
  console.log('[init][OllamaPath] ollamaPath:', ollamaPath)
}

async function initPaths() {
  await initPandocPath()
  await initGitPath()
  await initOllamaPath()
}

async function getPandocPath() {
  return pandocPath
}

async function getGitPath() {
  return gitPath
}

async function getOllamaPath() {
  return ollamaPath
}

ipcMain.handle('check-ollama', async () => {
  // 获取 ollama 的路径，并正确等待 Promise 完成
  const ollamaCmd = await getOllamaPath()
  // 第一步：确认 ollama 可执行文件存在（即是否安装）
  try {
    // 调用 --version，比 serve 安全，不会占端口（加引号兼容空格路径）
    const actualPath = await checkCommand(ollamaCmd)
    const execPath = actualPath || ollamaCmd
    await execAsync(`"${execPath}" --version`)
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
  // 1. 拿到“命令名”或“绝对路径”
  const ollamaCmd = await getOllamaPath()

  // 2. 验证命令是否真的在 PATH 可用
  const actualPath = await checkCommand(ollamaCmd)
  if (!actualPath) {
    console.error(`[parseOllamaList] 找不到可执行文件: ${ollamaCmd}`)
    // 如果你希望前端拿到空数组，就 return []
    return []
    // 或者直接抛错： throw new Error('ollama 未安装或不在 PATH 中')
  }

  // 3. 真正执行 list（对路径加引号，兼容空格）
  try {
    const cmd = `"${actualPath}"`
    const { stdout, stderr } = await execAsync(`${cmd} list`)
    if (stderr) console.error('[parseOllamaList] stderr:', stderr)
    const lines = stdout.trim().split('\n')
    const dataLines = lines.slice(1).filter((line) => line.trim())
    return dataLines.map((line) => {
      const parts = line.split(/\s{2,}/)
      return { name: parts[0], id: parts[1], size: parts[2], modified: parts[3] }
    })
  } catch (err) {
    console.error('[parseOllamaList] 执行 list 时出错:', err)
    throw err
  }
}

ipcMain.handle('remove-models', async (event, modelName) => {
  try {
    const ollamaPath = await getOllamaPath()
    const actualPath = await checkCommand(ollamaPath)
    const execPath = actualPath || ollamaPath
    // 如果传入的是数组，则逐个卸载；否则视为单个模型名
    const models = Array.isArray(modelName) ? modelName : [modelName]

    for (const model of models) {
      winstonLogger.log('info', `[remove-models] 开始卸载模型: ${model}`)
      const proc = spawnAndTrack(execPath, ['rm', model])

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
    const list = await parseOllamaList()
    return list
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
  try {
    const ollamaPath = await getOllamaPath()
    // 新增：解析实际可执行路径，兼容 Windows 未加入 PATH 的情况
    const actualPath = await checkCommand(ollamaPath)
    const execPath = actualPath || ollamaPath
    const stdout = await runCommand(`"${execPath}" list`)
    const deployed = requiredModelsList.every((modelName) =>
      stdout.toLowerCase().includes(modelName.toLowerCase())
    )
    console.log('[IPC check-model-deployment] Deployed:', deployed)
    return deployed
  } catch (err) {
    console.error('[check-model-deployment] Error:', err)
    throw err
  }
})

ipcMain.handle('install-models', async (event, modelsToInstall) => {
  console.log('[IPC install-models] Received models to install:', modelsToInstall)
  modelsToInstall = [...new Set(modelsToInstall)]
  const total = modelsToInstall.length
  return new Promise((resolve) => {
    async function installModel(index) {
      if (index >= total) {
        event.sender.send('install-progress', { progress: 100, model: '全部模型' })
        console.log('[IPC install-models] All models installed.')
        resolve(true)
        return
      }
      const model = modelsToInstall[index]
      console.log(`[IPC install-models] Installing model: ${model}`)
      const ollamaPath = await getOllamaPath()
      const actualPath = await checkCommand(ollamaPath)
      const execPath = actualPath || ollamaPath
      const pullProcess = spawnAndTrack(execPath, ['pull', model], { stdio: 'inherit' })
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

// 获取Documents目录路径
ipcMain.handle('get-documents-path', async () => {
  return app.getPath('documents')
})

// 新增：检查 Python 是否安装

ipcMain.handle('check-python', async () => {
  // 先尝试 python 命令
  let pythonResult = spawnSync('python', ['--version'], { encoding: 'utf8' })
  // 如果 python 命令失败，则尝试 python3 命令
  if (pythonResult.error) {
    pythonResult = spawnSync('python3', ['--version'], { encoding: 'utf8' })
  }

  // 两个命令都失败的情况
  if (pythonResult.error) {
    console.error(`[IPC check-python] Python 检查失败:`, pythonResult.error)
    return { success: false, version: null }
  }

  const version = pythonResult.stdout.trim() || pythonResult.stderr.trim()
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

// 文件操作相关接口
ipcMain.handle('create-directory', async (event, dirPath) => {
  console.log(`[IPC create-directory] 创建目录: ${dirPath}`)
  try {
    await fs.promises.mkdir(dirPath, { recursive: true })
    return { success: true }
  } catch (err) {
    console.error(`[IPC create-directory] 创建目录失败:`, err)
    throw err
  }
})

ipcMain.handle('delete-file', async (event, filePath) => {
  console.log(`[IPC delete-file] 删除文件: ${filePath}`)
  try {
    const stats = await fs.promises.stat(filePath)
    if (stats.isDirectory()) {
      await fs.promises.rmdir(filePath, { recursive: true })
    } else {
      await fs.promises.unlink(filePath)
    }
    return { success: true }
  } catch (err) {
    console.error(`[IPC delete-file] 删除失败:`, err)
    throw err
  }
})

ipcMain.handle('copy-file', async (event, sourcePath, targetPath) => {
  console.log(`[IPC copy-file] 复制文件: ${sourcePath} -> ${targetPath}`)
  try {
    await fs.promises.copyFile(sourcePath, targetPath)
    return { success: true }
  } catch (err) {
    console.error(`[IPC copy-file] 复制失败:`, err)
    throw err
  }
})

ipcMain.handle('move-file', async (event, sourcePath, targetPath) => {
  console.log(`[IPC move-file] 移动文件: ${sourcePath} -> ${targetPath}`)
  try {
    await fs.promises.rename(sourcePath, targetPath)
    return { success: true }
  } catch (err) {
    console.error(`[IPC move-file] 移动失败:`, err)
    throw err
  }
})

ipcMain.handle('show-item-in-folder', async (event, filePath) => {
  console.log(`[IPC show-item-in-folder] 在文件夹中显示: ${filePath}`)
  try {
    shell.showItemInFolder(filePath)
    return { success: true }
  } catch (err) {
    console.error(`[IPC show-item-in-folder] 显示失败:`, err)
    throw err
  }
})

ipcMain.handle('show-message-box', async (event, options) => {
  console.log(`[IPC show-message-box] 显示消息框`)
  try {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showMessageBox(win, options)
    return result
  } catch (err) {
    console.error(`[IPC show-message-box] 显示消息框失败:`, err)
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
  const isWin = process.platform === 'win32'
  const win = new BrowserWindow({
    width: 1400,
    height: 1000,
    icon: path.join(__dirname, '../renderer/assets', 'banner_v3_low.png'),
    frame: isWin, // Windows 下展示系统窗口控制按钮
    titleBarStyle: isWin ? 'default' : 'hidden',
    autoHideMenuBar: isWin, // Windows 下自动隐藏菜单栏，但保留窗口控制按钮
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
  // const skeletonPath = path.join(__dirname, '../../public/skeleton.html')
  // console.log('[main] loading skeleton screen:', skeletonPath)
  // await win.loadFile(skeletonPath, {
  //   query: { desc: '正在检查并启动核心进程...' }
  // })
  initializeUserDataBin()
  // 当骨架页面准备就绪后展示窗口
  win.once('ready-to-show', () => {
    win.show()
    dispatchDeepLinks()
  })
  // 拦截新窗口打开请求（外链均由系统默认浏览器打开）
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 监听窗口关闭事件，清理终端实例
  win.on('closed', () => {
    terminals.forEach((terminal, terminalId) => {
      try {
        terminal.kill()
        terminals.delete(terminalId)
      } catch (e) {
        console.error('窗口关闭时清理终端实例出错:', e)
      }
    })
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
  registerProtocol()
  const win = await createSkeletonWindow()
  await initPaths()
  await initBrewPath()
  clearOccupiedPorts().catch((err) => winstonLogger.log('error', '清理端口时出现错误: ' + err))

  // Windows 冷启动：argv 里自带深链（第一个是 exe 路径，后面可能有 URL）
  if (process.platform === 'win32' && Array.isArray(process.argv)) {
    const deepLink = process.argv.find(
      (a) => typeof a === 'string' && a.startsWith(`${PROTOCOL}://`)
    )
    if (deepLink) queueDeepLink(deepLink)
  }

  await new Promise((resolve) => setTimeout(resolve, 1500))
  try {
    setTimeout(async () => {
      await loadMainInterface(win)
    }, timeout)
  } catch (err) {
    console.error('加载主界面出错:', err)
  }
})

// app.on('ready', async () => {
//   console.log('[main] app ready')
//   const win = await createSkeletonWindow()
//   try {
//     setTimeout(async () => {
//       await loadMainInterface(win)
//     }, timeout)
//   } catch (err) {
//     console.error('加载主界面出错:', err)
//   }
// })

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

  // 用户选择"停止核心服务并退出"
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
        // 清理所有终端实例
        terminals.forEach((terminal, terminalId) => {
          try {
            terminal.kill()
            terminals.delete(terminalId)
          } catch (e) {
            console.error('清理终端实例时出错:', e)
          }
        })

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

        // 清理winston日志文件
        await cleanupAllLogFiles()
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
    shutdownWindow.close()
  })

  shutdownWindow.on('closed', async () => {
    console.log('用户关闭了退出确认窗口，取消退出操作。')
    // 清理winston日志文件
    await cleanupAllLogFiles()

    // 不移除 before-quit 监听器，保持退出确认功能
    // 不调用 app.quit()，让程序继续运行
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
      const { stdout, stderr } = await execAsync(`lsof -i :${port} -sTCP:LISTEN -n -P`)
      if (stderr) {
        console.warn(`lsof 错误: ${stderr}`)
      }
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
      } catch {
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
    height: 1000,
    frame: true,
    autoHideMenuBar: false,
    show: true,
    title: 'GitHave IDE',
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
  } catch {
    return { exists: false, indexing: false }
  }

  // 检查 code_index.db 和 code_index.faiss
  const dbPath = path.join(gitgoDir, 'code_index.db')
  const faissPath = path.join(gitgoDir, 'code_index.faiss')
  const indexing = path.join(gitgoDir, 'indexing.temp')
  const fullIndex = path.join(gitgoDir, 'full_index.temp')
  const moduleAnalyzer = path.join(gitgoDir, 'module_analyzer.temp')
  const hasDb = fs.existsSync(dbPath)
  const hasFaiss = fs.existsSync(faissPath)
  const hasIndexing = fs.existsSync(indexing)
  const hasFullIndex = fs.existsSync(fullIndex)
  const moduleAnalyzing = fs.existsSync(moduleAnalyzer)

  return {
    exists: hasDb && hasFaiss,
    indexing: hasIndexing,
    hasDb,
    hasFullIndex,
    moduleAnalyzing
  }
})

ipcMain.handle('checkPandocIPC', async () => {
  try {
    // 确保获取 pandoc 路径的时候正确等待 Promise 完成
    const pandocPath = await getPandocPath()
    const { stdout } = await execAsync(`"${pandocPath}" --version`)
    if (!stdout || !stdout.trim()) {
      return { installed: false }
    }
    const version = stdout.split('\n')[0]
    return { installed: true, version }
  } catch (err) {
    console.error('检查 Pandoc 失败：', err)
    return { installed: false }
  }
})

ipcMain.handle('checkGitIPC', async () => {
  try {
    // 确保获取 Git 路径的时候正确等待 Promise 完成
    const gitPath = await getGitPath()
    const { stdout } = await execAsync(`"${gitPath}" --version`)
    if (!stdout || !stdout.trim()) {
      return { installed: false }
    }
    const version = stdout.split('\n')[0]
    return { installed: true, version }
  } catch (err) {
    console.error('检查 Git 失败：', err)
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
  console.log('[initializeUserDataBin] 初始化 userData 下的 bin 目录...')

  // 1. 确定目标目录（生产环境用 userData，开发环境指向项目 bin）
  const isProd = app.isPackaged
  const userDataPath = isProd ? app.getPath('userData') : path.join(app.getAppPath(), 'bin')

  // 2. 版本文件路径
  const versionFilePath = path.join(userDataPath, 'app_version.json')
  const currentVersion = app.getVersion()

  console.log('内测阶段删除版本标识文件，正式生产上线时删掉这段')
  await fsPromises.rm(versionFilePath, { recursive: true, force: true })

  // 3. 确保目标目录存在
  await fsPromises.mkdir(userDataPath, { recursive: true })

  // 4. 如果版本文件路径存在且是目录，先把它删掉
  if (fs.existsSync(versionFilePath)) {
    try {
      const stat = await fsPromises.stat(versionFilePath)
      if (stat.isDirectory()) {
        console.warn(
          `[initializeUserDataBin] 版本文件路径误为目录，正在删除目录：${versionFilePath}`
        )
        await fsPromises.rm(versionFilePath, { recursive: true, force: true })
      }
    } catch (err) {
      console.error(`[initializeUserDataBin] 检查版本文件时出错: ${err}`)
      // 继续执行，后面写文件时会再次报错或重建
    }
  }

  // 5. 读取上次保存的版本号
  let previousVersion = null
  if (fs.existsSync(versionFilePath)) {
    try {
      const data = await fsPromises.readFile(versionFilePath, 'utf-8')
      previousVersion = JSON.parse(data).version
    } catch (err) {
      console.warn(`[initializeUserDataBin] 无法读取版本文件: ${err}`)
    }
  }

  // 6. 判断是否为新版本
  const isNewVersion = !previousVersion || semver.gt(currentVersion, previousVersion)
  if (isNewVersion) {
    console.log(
      `[initializeUserDataBin] 检测到新版本: ${previousVersion || 'none'} → ${currentVersion}`
    )
  }

  // 7. 准备源目录路径
  const sourceBinPath = isProd
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'bin')
    : path.join(app.getAppPath(), 'bin')

  if (!fs.existsSync(sourceBinPath)) {
    console.warn(`[initializeUserDataBin] 源 bin 目录不存在：${sourceBinPath}`)
    return
  }

  // 8. 读取源目录内容
  const entries = await fsPromises.readdir(sourceBinPath)

  // 9. 新版本时强制覆盖的名单
  const forceOverride = [
    'app',
    'app.exe',
    'bot',
    'bot.exe',
    // 'fm',
    // 'fm.exe',
    'fm_http',
    'fm_http.exe',
    'static',
    'fm.yaml',
    'config.yaml',
    'watermark.svg',
    'watermark.png'
  ]

  // 10. 遍历复制或覆盖
  for (const name of entries) {
    const src = path.join(sourceBinPath, name)
    const dest = path.join(userDataPath, name)
    const stat = await fsPromises.stat(src)
    const shouldForce = isNewVersion && forceOverride.includes(name)

    if (stat.isDirectory()) {
      if (shouldForce || !fs.existsSync(dest)) {
        if (name === 'static') {
          // 如果是生产环境，清理userData下的static
          if (isProd) {
            const staticPath = path.join(app.getPath('userData'), 'static', 'deep_research')
            if (fs.existsSync(staticPath)) {
              console.log('[initializeUserDataBin] 清理 static/deep_research 目录...')
              await fsPromises.rm(staticPath, { recursive: true, force: true })
            }
          }
        }
        await fsPromises.cp(src, dest, { recursive: true })
        console.log(`[initializeUserDataBin] ${shouldForce ? '强制覆盖目录' : '复制目录'}：${name}`)
        if (isProd) {
          console.log(`[initializeUserDataBin] 删除用于更新的原始文件：${src}`)
          try {
            await fsPromises.rm(src, { recursive: true, force: true })
          } catch (err) {
            console.error(`[initializeUserDataBin] 删除原始文件失败: ${err}`)
          }
        }
      }
    } else {
      if (shouldForce || !fs.existsSync(dest)) {
        await fsPromises.copyFile(src, dest)
        console.log(`[initializeUserDataBin] ${shouldForce ? '强制覆盖文件' : '复制文件'}：${name}`)
        if (isProd) {
          console.log(`[initializeUserDataBin] 删除用于更新的原始文件：${src}`)
          try {
            await fsPromises.rm(src, { recursive: true, force: true })
          } catch (err) {
            console.error(`[initializeUserDataBin] 删除原始文件失败: ${err}`)
          }
        }
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
      )
      console.log(`[initializeUserDataBin] 更新版本记录文件：${versionFilePath}`)
    } catch (err) {
      console.error(`[initializeUserDataBin] 写入版本文件失败: ${err}`)
    }
  }

  console.log('[initializeUserDataBin] 初始化完成！')
}

// 检查依赖状态
ipcMain.handle('check-dependencies-status', async () => {
  return await checkDependenciesStatus()
})

// 安装所有缺失的依赖
ipcMain.handle('install-required-packages', async (event) => {
  return await installRequiredPackages(event)
})

// 安装单个包
ipcMain.handle('install-package', async (event, pkgName) => {
  if (!installationStatus[pkgName]) {
    return { success: false, message: `Unknown package: ${pkgName}` }
  }
  return await installPackage(pkgName, event)
})

// 检查 Homebrew 是否安装
ipcMain.handle('check-brew-installed', async () => {
  return await checkBrewInstalled()
})

ipcMain.handle('get-static-file-list', async (event, dirPath, subPath, idDir) => {
  try {
    const dir = getUserResourcePath(path.join(dirPath, subPath))
    const entries = await readdir(dir, { withFileTypes: true })
    const fileList = []

    for (const entry of entries) {
      const fullPath = path.resolve(dir, entry.name)
      const stats = await stat(fullPath)

      // 根据 idDir 的值决定是否跳过文件扫描
      if (idDir) {
        // 如果 idDir 为 true，跳过文件扫描，仅返回文件夹
        if (entry.isDirectory()) {
          fileList.push({
            name: entry.name,
            size: null, // 文件夹不提供大小
            creationDate: stats.birthtime,
            path: fullPath,
            type: 'directory',
            isDirectory: true
          })
        }
      } else {
        // 如果 idDir 为 false 或未传递，正常扫描文件和文件夹
        if (entry.isFile()) {
          fileList.push({
            name: entry.name,
            size: stats.size,
            creationDate: stats.birthtime,
            path: fullPath,
            type: 'file',
            isDirectory: false
          })
        } else if (entry.isDirectory()) {
          fileList.push({
            name: entry.name,
            size: null, // 文件夹不提供大小
            creationDate: stats.birthtime,
            path: fullPath,
            type: 'directory',
            isDirectory: true
          })
        }
      }
    }

    return fileList
  } catch (err) {
    console.error(`读取目录失败：${err.message}`)
    throw err
  }
})

// 创建递归函数，用于获取目录下的所有文件
const getFilesFromDirectory = (dirPath) => {
  let files = []

  // 读取目录内容
  const items = fs.readdirSync(dirPath)

  items.forEach((item) => {
    const fullPath = path.join(dirPath, item)
    const stats = fs.statSync(fullPath)

    // 如果是文件，加入到文件数组
    if (stats.isFile()) {
      files.push(fullPath)
    }
    // 如果是目录，递归读取该目录下的文件
    else if (stats.isDirectory()) {
      files = files.concat(getFilesFromDirectory(fullPath)) // 合并子目录文件
    }
  })

  return files
}

// 打包文件
ipcMain.handle('zip-files', (event, directory, output) => {
  try {
    // 确保目录存在
    if (!fs.existsSync(directory)) {
      throw new Error('目录不存在')
    }

    const zip = new AdmZip()
    const files = getFilesFromDirectory(directory) // 获取目录下的所有文件

    // 将文件添加到压缩包
    files.forEach((file) => zip.addLocalFile(file))

    zip.writeZip(output) // 保存压缩包

    return { success: true, message: '文件已成功压缩' }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

// 解压文件
ipcMain.handle('unzip-file', (event, zipFile, outputDir) => {
  try {
    if (!fs.existsSync(zipFile)) {
      throw new Error('压缩文件不存在')
    }

    const zip = new AdmZip(zipFile)
    zip.extractAllTo(outputDir, true) // 解压文件到指定目录

    return { success: true, message: '文件已成功解压' }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

// 打包文件为tar.gz
ipcMain.handle('tar-gz-files', async (event, directory, output) => {
  try {
    // 确保目录存在
    if (!fs.existsSync(directory)) {
      throw new Error('目录不存在')
    }

    // 使用tar库创建tar.gz压缩包
    await tar.create(
      {
        gzip: true,
        file: output,
        cwd: path.dirname(directory)
      },
      [path.basename(directory)]
    )

    return { success: true, message: '文件已成功压缩为tar.gz' }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

// 解压tar.gz文件
ipcMain.handle('untar-gz-file', async (event, tarFile, outputDir) => {
  try {
    if (!fs.existsSync(tarFile)) {
      throw new Error('压缩文件不存在')
    }

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // 使用tar库解压tar.gz文件
    await tar.extract({
      file: tarFile,
      cwd: outputDir
    })

    return { success: true, message: '文件已成功解压' }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

// Terminal management
const terminals = new Map() // 存储终端实例
let terminalCounter = 0 // 终端ID计数器

// Terminal IPC handlers
ipcMain.handle('terminal-init', async (event, { cwd, cols, rows, shell }) => {
  if (pty === null) {
    return { success: false, error: 'Terminal not initialized' }
  }
  try {
    const terminalId = `terminal_${++terminalCounter}`

    // 确定要使用的 shell
    let shellToUse
    if (shell) {
      shellToUse = shell
    } else if (process.platform === 'win32') {
      shellToUse = 'powershell.exe'
    } else {
      shellToUse = 'bash'
    }

    // 创建新的终端实例
    const terminal = pty.spawn(shellToUse, [], {
      name: 'xterm-color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: cwd || process.cwd(),
      env: process.env
    })

    // 存储终端实例
    terminals.set(terminalId, terminal)

    // 监听终端输出
    terminal.on('data', (data) => {
      // 检查渲染进程是否已销毁
      if (!event.sender.isDestroyed()) {
        event.sender.send('terminal-data', { terminalId, data })
      }
    })

    // 监听终端退出
    terminal.on('exit', (code) => {
      terminals.delete(terminalId)
      // 检查渲染进程是否已销毁
      if (!event.sender.isDestroyed()) {
        event.sender.send('terminal-exit', { terminalId, code })
      }
    })

    return { success: true, terminalId }
  } catch (error) {
    console.error('Terminal init error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('terminal-write', async (event, { terminalId, data }) => {
  if (pty === null) {
    return { success: false, error: 'Terminal not initialized' }
  }
  try {
    const terminal = terminals.get(terminalId)
    if (!terminal) {
      return { success: false, error: 'Terminal not found' }
    }

    terminal.write(data)
    return { success: true }
  } catch (error) {
    console.error('Terminal write error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('terminal-resize', async (event, { terminalId, cols, rows }) => {
  try {
    const terminal = terminals.get(terminalId)
    if (!terminal) {
      return { success: false, error: 'Terminal not found' }
    }

    terminal.resize(cols, rows)
    return { success: true }
  } catch (error) {
    console.error('Terminal resize error:', error)
    return { success: false, error: error.message }
  }
})

// 清理终端实例的辅助函数
ipcMain.handle('terminal-destroy', async (event, { terminalId }) => {
  if (pty === null) {
    return { success: false, error: 'Terminal not initialized' }
  }
  try {
    const terminal = terminals.get(terminalId)
    if (terminal) {
      terminal.kill()
      terminals.delete(terminalId)
    }
    return { success: true }
  } catch (error) {
    console.error('Terminal destroy error:', error)
    return { success: false, error: error.message }
  }
})

// Git command IPC handler
ipcMain.handle('git-command', async (event, { command, cwd }) => {
  try {
    const gitPath = await getGitPath()
    const fullCommand = `${gitPath} ${command}`

    console.log('Executing git command:', fullCommand, 'in', cwd)

    const { stdout, stderr } = await execAsync(fullCommand, {
      cwd: cwd || process.cwd(),
      encoding: 'utf8'
    })

    return {
      success: true,
      output: stdout,
      error: stderr
    }
  } catch (error) {
    console.error('Git command error:', error)
    return {
      success: false,
      output: '',
      error: error.message
    }
  }
})

// Execute command IPC handler
ipcMain.handle('execute-command', async (event, command) => {
  try {
    console.log('Executing command:', command)

    const { stdout, stderr } = await execAsync(command, {
      encoding: 'utf8'
    })

    return {
      success: true,
      stdout: stdout,
      stderr: stderr
    }
  } catch (error) {
    console.error('Execute command error:', error)
    return {
      success: false,
      stdout: '',
      stderr: error.message
    }
  }
})

// 网络速度监控相关变量
let networkMonitorInterval = null
let previousNetworkStats = null

// 获取网络速度
ipcMain.handle('get-network-speed', async () => {
  try {
    const networkStats = await si.networkStats()
    const currentTime = Date.now()

    if (!networkStats || networkStats.length === 0) {
      return {
        success: false,
        error: '无法获取网络统计信息'
      }
    }

    // 获取主要网络接口的统计信息
    const mainInterface = networkStats[0]

    if (previousNetworkStats && previousNetworkStats.timestamp) {
      const timeDiff = (currentTime - previousNetworkStats.timestamp) / 1000 // 转换为秒
      const rxBytesDiff = mainInterface.rx_bytes - previousNetworkStats.rx_bytes
      const txBytesDiff = mainInterface.tx_bytes - previousNetworkStats.tx_bytes

      const downloadSpeed = rxBytesDiff / timeDiff // bytes/s
      const uploadSpeed = txBytesDiff / timeDiff // bytes/s

      // 更新之前的统计信息
      previousNetworkStats = {
        rx_bytes: mainInterface.rx_bytes,
        tx_bytes: mainInterface.tx_bytes,
        timestamp: currentTime
      }

      return {
        success: true,
        downloadSpeed: Math.max(0, downloadSpeed), // 确保不为负数
        uploadSpeed: Math.max(0, uploadSpeed),
        downloadSpeedFormatted: formatBytes(downloadSpeed) + '/s',
        uploadSpeedFormatted: formatBytes(uploadSpeed) + '/s',
        interface: mainInterface.iface
      }
    } else {
      // 首次调用，保存当前统计信息
      previousNetworkStats = {
        rx_bytes: mainInterface.rx_bytes,
        tx_bytes: mainInterface.tx_bytes,
        timestamp: currentTime
      }

      return {
        success: true,
        downloadSpeed: 0,
        uploadSpeed: 0,
        downloadSpeedFormatted: '0 B/s',
        uploadSpeedFormatted: '0 B/s',
        interface: mainInterface.iface
      }
    }
  } catch (error) {
    console.error('获取网络速度失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

// 开始网络速度监控
ipcMain.handle('start-network-monitor', async (event) => {
  try {
    // 如果已经在监控，先停止
    if (networkMonitorInterval) {
      clearInterval(networkMonitorInterval)
    }

    // 重置之前的统计信息
    previousNetworkStats = null

    // 每秒获取一次网络速度
    networkMonitorInterval = setInterval(async () => {
      try {
        const speedData = await si.networkStats()
        if (speedData && speedData.length > 0) {
          const currentTime = Date.now()
          const mainInterface = speedData[0]

          if (previousNetworkStats && previousNetworkStats.timestamp) {
            const timeDiff = (currentTime - previousNetworkStats.timestamp) / 1000
            const rxBytesDiff = mainInterface.rx_bytes - previousNetworkStats.rx_bytes
            const txBytesDiff = mainInterface.tx_bytes - previousNetworkStats.tx_bytes

            const downloadSpeed = Math.max(0, rxBytesDiff / timeDiff)
            const uploadSpeed = Math.max(0, txBytesDiff / timeDiff)

            // 发送速度数据到渲染进程
            event.sender.send('network-speed-update', {
              downloadSpeed,
              uploadSpeed,
              downloadSpeedFormatted: formatBytes(downloadSpeed) + '/s',
              uploadSpeedFormatted: formatBytes(uploadSpeed) + '/s',
              interface: mainInterface.iface
            })
          }

          previousNetworkStats = {
            rx_bytes: mainInterface.rx_bytes,
            tx_bytes: mainInterface.tx_bytes,
            timestamp: currentTime
          }
        }
      } catch (error) {
        console.error('网络监控错误:', error)
      }
    }, 1000)

    return { success: true }
  } catch (error) {
    console.error('启动网络监控失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

// 停止网络速度监控
ipcMain.handle('stop-network-monitor', async () => {
  try {
    if (networkMonitorInterval) {
      clearInterval(networkMonitorInterval)
      networkMonitorInterval = null
    }
    previousNetworkStats = null
    return { success: true }
  } catch (error) {
    console.error('停止网络监控失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

// 启动服务日志监听
ipcMain.handle('start-service-log', async (event) => {
  try {
    serviceLogEnabled = true

    // 检查是否已经添加过此监听器
    if (serviceLogListeners.has(event.sender)) {
      console.log('服务日志监听器已存在，跳过重复添加')
    } else {
      serviceLogListeners.add(event.sender)
      console.log('服务日志监听已启动，监听器数量:', serviceLogListeners.size)
    }

    return { success: true }
  } catch (error) {
    console.error('启动服务日志监听失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

// 停止服务日志监听
ipcMain.handle('stop-service-log', async () => {
  try {
    serviceLogEnabled = false
    serviceLogListeners.clear()

    // 清除计时器（如果存在）
    if (serviceLogTimer) {
      clearTimeout(serviceLogTimer)
      serviceLogTimer = null
    }

    console.log('服务日志监听已停止')
    return { success: true }
  } catch (error) {
    console.error('停止服务日志监听失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

// 启动Winston日志监听 - 新增接口
ipcMain.handle('start-winston-log', async (event) => {
  try {
    winstonLogEnabled = true

    // 检查是否已经添加过此监听器
    if (winstonLogListeners.has(event.sender)) {
      console.log('Winston日志监听器已存在，跳过重复添加')
    } else {
      winstonLogListeners.add(event.sender)
      console.log('Winston日志监听已启动，监听器数量:', winstonLogListeners.size)
    }

    return { success: true }
  } catch (error) {
    console.error('启动Winston日志监听失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

// 停止Winston日志监听 - 新增接口
ipcMain.handle('stop-winston-log', async () => {
  try {
    winstonLogEnabled = false
    winstonLogListeners.clear()

    console.log('Winston日志监听已停止')
    return { success: true }
  } catch (error) {
    console.error('停止Winston日志监听失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

// 启动子进程日志监听 - 新增接口
ipcMain.handle('start-child-process-log', async (event) => {
  try {
    // 设置启用标志
    childProcessLogEnabled = true

    // 将发送者添加到监听者集合
    if (childProcessLogListeners.has(event.sender)) {
      console.log('子进程日志监听器已存在，跳过重复添加')
    } else {
      childProcessLogListeners.add(event.sender)
      console.log('子进程日志监听已启动，监听器数量:', childProcessLogListeners.size)
    }

    // 遍历所有现有的子进程，为它们添加日志处理
    childProcesses.forEach((proc) => {
      // 如果已经有监听器，跳过
      if (proc._logListenersAttached) return

      if (proc.stdout) {
        const onStdoutData = (chunk) => {
          const dataStr = chunk.toString()
          if (childProcessLogEnabled && childProcessLogListeners.size > 0) {
            const logData = {
              serviceName: proc.tag || 'unknown',
              type: 'info',
              message: dataStr.trim(),
              timestamp: new Date().toISOString()
            }

            // 使用Array.from创建一个副本进行迭代，避免在迭代过程中修改集合
            Array.from(childProcessLogListeners).forEach((sender) => {
              try {
                // 检查sender是否已被销毁
                if (sender.isDestroyed()) {
                  // 如果已被销毁，从集合中移除
                  childProcessLogListeners.delete(sender)
                  console.log('已移除已销毁的子进程日志监听器')
                } else {
                  sender.send('child-process-log', logData)
                }
              } catch (err) {
                console.error('发送子进程日志失败:', err)
                // 出错时也从集合中移除该sender，避免持续刷屏
                childProcessLogListeners.delete(sender)
                console.log('已移除失效的子进程日志监听器')
              }
            })
          }
        }

        proc.stdout.on('data', onStdoutData)
        proc._stdoutHandler = onStdoutData
      }

      if (proc.stderr) {
        const onStderrData = (chunk) => {
          const dataStr = chunk.toString()
          if (childProcessLogEnabled && childProcessLogListeners.size > 0) {
            const logData = {
              serviceName: proc.tag || 'unknown',
              type: 'error',
              message: dataStr.trim(),
              timestamp: new Date().toISOString()
            }

            // 使用Array.from创建一个副本进行迭代，避免在迭代过程中修改集合
            Array.from(childProcessLogListeners).forEach((sender) => {
              try {
                // 检查sender是否已被销毁
                if (sender.isDestroyed()) {
                  // 如果已被销毁，从集合中移除
                  childProcessLogListeners.delete(sender)
                  console.log('已移除已销毁的子进程日志监听器')
                } else {
                  sender.send('child-process-log', logData)
                }
              } catch (err) {
                console.error('发送子进程日志失败:', err)
                // 出错时也从集合中移除该sender，避免持续刷屏
                childProcessLogListeners.delete(sender)
                console.log('已移除失效的子进程日志监听器')
              }
            })
          }
        }

        proc.stderr.on('data', onStderrData)
        proc._stderrHandler = onStderrData
      }

      proc._logListenersAttached = true
    })

    return { success: true }
  } catch (error) {
    console.error('启动子进程日志监听失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

// 停止子进程日志监听 - 新增接口
ipcMain.handle('stop-child-process-log', async () => {
  try {
    // 设置禁用标志
    childProcessLogEnabled = false

    // 清除所有监听器
    childProcessLogListeners.clear()

    // 遍历所有子进程，移除日志处理器
    childProcesses.forEach((proc) => {
      if (!proc._logListenersAttached) return

      if (proc.stdout && proc._stdoutHandler) {
        proc.stdout.removeListener('data', proc._stdoutHandler)
        delete proc._stdoutHandler
      }

      if (proc.stderr && proc._stderrHandler) {
        proc.stderr.removeListener('data', proc._stderrHandler)
        delete proc._stderrHandler
      }

      proc._logListenersAttached = false
    })

    console.log('子进程日志监听已停止')
    return { success: true }
  } catch (error) {
    console.error('停止子进程日志监听失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

// 格式化字节数
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 黑名单：无法当纯文本读取的 MIME
const blackMimeList = [
  // ---- 通配前缀（以 * 结尾表示 startsWith）----
  'image/*',
  'audio/*',
  'video/*',
  'font/*',
  'model/*',

  // ---- 精确 MIME ----
  // 压缩 & 打包
  'application/zip',
  'application/x-7z-compressed',
  'application/x-rar-compressed',
  'application/x-tar',
  'application/x-bzip2',
  'application/x-gzip',
  'application/x-xz',
  'application/zstd',
  // 可执行 / 安装包
  'application/x-msdownload',
  'application/x-executable',
  'application/vnd.android.package-archive',
  'application/x-cab',
  'application/x-debian-package',
  'application/x-redhat-package-manager',
  'application/x-iso9660-image',
  // 办公文档（ZIP-based OPC）
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.ms-excel',
  // PDF / 矢量二进制
  'application/pdf',
  // 数据库 & 二进制格式
  'application/x-sqlite3',
  'application/vnd.parquet',
  // 字体
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
  // 其它通用二进制
  'application/octet-stream',
  // ELF
  'application/x-elf',
  'application/x-mach-binary'
]

const textLikeMimeSet = new Set([
  // 非 text/ 但本质文本
  'application/json',
  'application/ld+json',
  'application/xml',
  'application/x-yaml',
  'application/x-sh',
  'application/javascript',
  'application/ecmascript',
  'application/x-www-form-urlencoded',
  'image/svg+xml',
  'model/gltf+json'
])

const isBinaryByBlacklist = (mime) => {
  // 前缀规则
  for (const rule of blackMimeList) {
    if (rule.endsWith('/*')) {
      const prefix = rule.slice(0, -2)
      if (mime.startsWith(prefix)) return true
    } else if (mime === rule) {
      return true
    }
  }
  return false
}
ipcMain.handle('is-text-file', async (_e, filePath) => {
  try {
    const stats = await stat(filePath)
    if (stats.isDirectory()) {
      console.log(`[is-text-file] ${filePath} 是目录，判定为非文本`)
      return false
    }

    // ① 魔数优先
    const kind = await fileTypeFromFile(filePath)
    if (kind?.mime) {
      console.log(`[is-text-file] 魔数识别 mime: ${kind.mime}`)
      if (kind.mime.startsWith('text/')) {
        console.log(`[is-text-file] 魔数判定为文本`)
        return true
      }
      if (textLikeMimeSet.has(kind.mime)) {
        console.log(`[is-text-file] 魔数判定为类文本`)
        return true
      }
      if (isBinaryByBlacklist(kind.mime)) {
        console.log(`[is-text-file] 魔数黑名单判定为二进制`)
        return false
      }
    } else {
      console.log(`[is-text-file] 魔数识别失败，尝试 buffer 识别`)
      try {
        // 超时包装
        const result = await Promise.race([
          (async () => {
            const fd = await fs.promises.open(filePath, 'r')
            const buffer = Buffer.alloc(50)
            const { bytesRead } = await fd.read(buffer, 0, 50, 0)
            await fd.close()
            console.log(`[is-text-file] buffer 读取 ${filePath} 前 50 字节:`, buffer)
            // 如果文件为空（实际读取字节数为0），判定为文本
            if (bytesRead === 0) {
              console.log(`[is-text-file] 文件为空，判定为文本`)
              return 'text'
            }
            // 只处理实际读取的字节
            const actualBuffer = buffer.slice(0, bytesRead)
            // 尝试utf8解码
            let text = actualBuffer.toString('utf8')
            // 判断是否有大量不可打印字符
            const nonPrintable = text.split('').filter((c) => {
              const code = c.charCodeAt(0)
              // 允许常见换行、制表符、回车
              if (code === 9 || code === 10 || code === 13) return false
              // 可打印ASCII和常见Unicode
              return code < 32 || (code >= 127 && code < 0xa0)
            }).length
            const ratio = nonPrintable / text.length
            console.log(`[is-text-file] buffer 可打印率: ${(1 - ratio) * 100}%`)
            // 若可打印率高于50%，判定为文本
            if (ratio < 0.5) {
              console.log(`[is-text-file] buffer 判定为文本`)
              return 'text'
            } else {
              console.log(`[is-text-file] buffer 判定为二进制`)
              return 'binary'
            }
          })(),
          new Promise((resolve) => setTimeout(() => resolve('timeout'), 2000))
        ])
        if (result === 'text') return true
        if (result === 'binary' || result === 'timeout') {
          if (result === 'timeout') {
            console.warn(`[is-text-file] buffer 读取超时，自动判为二进制`)
          }
          return false
        }
      } catch (e) {
        console.warn(`[is-text-file] buffer 魔数识别异常:`, e)
      }
    }

    // ② 后缀兜底
    const mime = lookup(filePath) || ''
    console.log(`[is-text-file] 后缀识别 mime: ${mime}`)
    if (mime.startsWith('text/')) {
      console.log(`[is-text-file] 后缀判定为文本`)
      return true
    }
    if (textLikeMimeSet.has(mime)) {
      console.log(`[is-text-file] 后缀判定为类文本`)
      return true
    }
    if (isBinaryByBlacklist(mime)) {
      console.log(`[is-text-file] 后缀黑名单判定为二进制`)
      return false
    }
    if (!mime || mime == undefined || mime == null || mime == '') {
      // 文本扩展名白名单
      const textExts = new Set([
        '.go',
        '.c',
        '.cpp',
        '.h',
        '.hpp',
        '.rs',
        '.swift',
        '.py',
        '.js',
        '.ts',
        '.jsx',
        '.tsx',
        '.java',
        '.kt',
        '.rb',
        '.php',
        '.sh',
        '.bat',
        '.pl',
        '.cs',
        '.json',
        '.xml',
        '.yml',
        '.yaml',
        '.md',
        '.txt',
        '.ini',
        '.conf',
        '.log',
        '.csv',
        '.toml',
        '.makefile',
        '.mk',
        '.dockerfile',
        '.gradle',
        '.properties',
        '.gitignore',
        '.gitattributes',
        '.editorconfig',
        '.vscode',
        '.eslintrc',
        '.prettierrc',
        '.babelrc',
        '.env',
        '.npmrc',
        '.lock',
        '.rst',
        '.tex',
        '.scss',
        '.sass',
        '.less',
        '.styl'
      ])
      const ext = path.extname(filePath).toLowerCase()
      if (textExts.has(ext)) {
        console.log(`[is-text-file] 扩展名白名单判定为文本: ${ext}`)
        return true
      }
      console.log(`[is-text-file] 后缀无法识别，默认为二进制`)
      return false
    }
    console.log(`[is-text-file] 未知类型，默认判定为二进制`)
    return false
  } catch (err) {
    console.error('[is-text-file] 检测失败:', err)
    return false
  }
})
console.log('main/index.js loaded!')
