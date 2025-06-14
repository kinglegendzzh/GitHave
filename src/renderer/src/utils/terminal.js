/**
 * 前端终端实现
 * 通过 preload 脚本暴露的 API 与主进程中的 node-pty 进行通信
 * 避免在渲染进程中直接使用 Node.js 模块
 */
class FrontendTerminal {
  constructor() {
    this.sessionId = null
    this.currentCwd = null
    this.isConnected = false
    this.outputCallback = null
    this.closeCallback = null
  }

  /**
   * 检查是否安装了zsh
   * @returns {Promise<boolean>} 是否安装了zsh
   */
  async checkZshInstalled() {
    try {
      if (!window.electron?.executeCommand) {
        console.warn('Electron API not available.')
        return false
      }
      
      // 检查zsh是否存在
      const result = await window.electron.executeCommand('which zsh')
      console.log('zsh installation check result:', result)
      return result.success && result.stdout && result.stdout.trim().length > 0
    } catch (error) {
      console.warn('Failed to check zsh installation:', error)
      return false
    }
  }

  /**
   * 初始化终端会话
   * @param {Object} options - 初始化选项
   * @param {string} options.cwd - 工作目录
   * @param {number} options.cols - 终端列数
   * @param {number} options.rows - 终端行数
   * @param {Function} options.onData - 数据输出回调
   * @param {Function} options.onClose - 关闭回调
   */
  async init({ cwd, cols = 80, rows = 24, onData, onClose }) {
    try {
      // 检查是否有可用的终端 API
      if (!window.electron || !window.electron.terminalInit) {
        throw new Error('Terminal API not available. Please check preload script.')
      }

      this.outputCallback = onData
      this.closeCallback = onClose

      // 检查是否安装了zsh
      const hasZsh = await this.checkZshInstalled()
      console.log('zsh installed:', hasZsh)
      // 通过 IPC 初始化终端
      const result = await window.electron.terminalInit({
        cwd: cwd || window.electron.homeDir,
        cols,
        rows,
        shell: hasZsh ? '/bin/zsh' : undefined // 如果有zsh则使用zsh，否则使用系统默认
      })

      if (result.success) {
        this.sessionId = result.terminalId
        this.currentCwd = cwd || window.electron.homeDir
        this.isConnected = true

        // 监听终端输出
        window.electron.onTerminalOutput((data) => {
          if (data.terminalId === this.sessionId && this.outputCallback) {
            this.outputCallback(data.data)
          }
        })

        // 监听终端退出
        window.electron.onTerminalExit((data) => {
          if (data.terminalId === this.sessionId) {
            this.isConnected = false
            if (this.closeCallback) {
              this.closeCallback(data.code)
            }
          }
        })

        // 发送欢迎信息
        this.sendWelcomeMessage()
        
        return { success: true, cwd: this.currentCwd }
      } else {
        throw new Error(result.error || 'Failed to initialize terminal')
      }
    } catch (error) {
      console.error('Terminal init error:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 发送欢迎信息
   */
  sendWelcomeMessage() {
    if (!this.isConnected) return
    
    // 发送欢迎信息到终端
    const welcomeMessage = `\r\n🚀 Welcome to GitHave Terminal\r\n`
    const versionInfo = `📁 Current Directory: ${this.currentCwd}\r\n`
    const separator = `${'='.repeat(50)}\r\n`
    
    setTimeout(() => {
      if (this.outputCallback) {
        this.outputCallback(welcomeMessage + versionInfo + separator)
      }
    }, 100)
  }

  /**
   * 写入数据到终端
   * @param {string} data - 要写入的数据
   */
  write(data) {
    if (!this.isConnected || !window.electron?.terminalWrite) {
      console.warn('Terminal not connected or API not available')
      return false
    }

    try {
      window.electron.terminalWrite({ terminalId: this.sessionId, data })
      return true
    } catch (error) {
      console.error('Terminal write error:', error)
      return false
    }
  }

  /**
   * 调整终端大小
   * @param {number} cols - 列数
   * @param {number} rows - 行数
   */
  resize(cols, rows) {
    if (!this.isConnected || !window.electron?.terminalResize) {
      console.warn('Terminal not connected or API not available')
      return false
    }

    try {
      window.electron.terminalResize({ terminalId: this.sessionId, cols, rows })
      return true
    } catch (error) {
      console.error('Terminal resize error:', error)
      return false
    }
  }

  /**
   * 获取当前工作目录
   */
  getCwd() {
    return this.currentCwd
  }

  /**
   * 检查连接状态
   */
  isAlive() {
    return this.isConnected
  }

  /**
   * 销毁终端会话
   */
  destroy() {
    if (this.isConnected && this.sessionId) {
      // 销毁终端实例
      if (window.electron?.terminalDestroy) {
        window.electron.terminalDestroy(this.sessionId)
      }
      // 移除输出监听器
      if (window.electron?.removeTerminalOutputListener) {
        window.electron.removeTerminalOutputListener()
      }
    }
    
    this.sessionId = null
    this.isConnected = false
    this.outputCallback = null
    this.closeCallback = null
  }

  /**
   * 发送中断信号 (Ctrl+C)
   */
  interrupt() {
    if (this.isConnected) {
      this.write('\x03') // Ctrl+C
    }
  }

  /**
   * 清屏
   */
  clear() {
    if (this.isConnected) {
      this.write('\x1b[2J\x1b[H')
    }
  }

  /**
   * 执行命令
   * @param {string} command - 要执行的命令
   */
  executeCommand(command) {
    if (this.isConnected) {
      this.write(command + '\r')
    }
  }
}

export default FrontendTerminal