<template>
  <div class="virtual-terminal">
    <div class="terminal-header">
      <div class="terminal-title">
        <span class="terminal-icon">🖥️</span>
        <span>GitHave Terminal</span>
        <span class="terminal-cwd">{{ currentPath }}</span>
      </div>
      <div class="terminal-controls">
        <button class="control-btn" title="搜索" @click="toggleSearch">
          <span>🔍</span>
        </button>
        <button class="control-btn" title="复制内容" @click="copyTerminalContent">
          <span>📋</span>
        </button>
        <button class="control-btn" title="导出" @click="serializeTerminal">
          <span>💾</span>
        </button>
        <button class="control-btn" title="清屏" @click="clearTerminal">
          <span>🗑️</span>
        </button>
        <button class="control-btn" title="中断 (Ctrl+C)" @click="interruptCommand">
          <span>⏹️</span>
        </button>
        <button class="control-btn" title="重新连接" @click="reconnectTerminal">
          <span>🔄</span>
        </button>
        <button class="control-btn close-btn" title="关闭" @click="closeTerminal">
          <span>❌</span>
        </button>
      </div>
    </div>
    <div class="terminal-container">
      <div ref="terminalElement" class="terminal-content"></div>
      <div v-if="!isConnected" class="terminal-overlay">
        <div class="connection-status">
          <div v-if="isConnecting" class="connecting">
            <div class="spinner"></div>
            <span>正在连接终端...</span>
          </div>
          <div v-else class="disconnected">
            <span>终端已断开连接</span>
            <button class="reconnect-btn" @click="reconnectTerminal">重新连接</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
// import { AttachAddon } from '@xterm/addon-attach'
import { ClipboardAddon } from '@xterm/addon-clipboard'
import { ImageAddon } from '@xterm/addon-image'
import { SearchAddon } from '@xterm/addon-search'
import { SerializeAddon } from '@xterm/addon-serialize'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { WebglAddon } from '@xterm/addon-webgl'
import '@xterm/xterm/css/xterm.css'
import FrontendTerminal from '../utils/terminal.js'

export default {
  name: 'VirtualTerminal',
  props: {
    initialPath: {
      type: String,
      default: ''
    },
    height: {
      type: String,
      default: '400px'
    },
    width: {
      type: String,
      default: '100%'
    },
    darkMode: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      terminal: null,
      fitAddon: null,
      webLinksAddon: null,
      attachAddon: null,
      clipboardAddon: null,
      imageAddon: null,
      searchAddon: null,
      serializeAddon: null,
      unicode11Addon: null,
      webglAddon: null,
      frontendTerminal: null,
      isConnected: false,
      isConnecting: false,
      currentPath: '',
      resizeObserver: null
    }
  },
  computed: {
    terminalTheme() {
      if (this.darkMode) {
        return {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#ffffff',
          selection: '#264f78',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#e5e5e5'
        }
      } else {
        return {
          background: '#ffffff',
          foreground: '#333333',
          cursor: '#000000',
          selection: '#b3d4fc',
          black: '#000000',
          red: '#cd3131',
          green: '#00bc00',
          yellow: '#949800',
          blue: '#0451a5',
          magenta: '#bc05bc',
          cyan: '#0598bc',
          white: '#555555',
          brightBlack: '#666666',
          brightRed: '#cd3131',
          brightGreen: '#14ce14',
          brightYellow: '#b5ba00',
          brightBlue: '#0451a5',
          brightMagenta: '#bc05bc',
          brightCyan: '#0598bc',
          brightWhite: '#a5a5a5'
        }
      }
    },
    containerStyles() {
      return {
        background: this.darkMode ? '#1e1e1e' : '#ffffff',
        borderColor: this.darkMode ? '#3c3c3c' : '#d1d5db'
      }
    },
    headerStyles() {
      return {
        background: this.darkMode ? '#2d2d2d' : '#f3f4f6',
        borderColor: this.darkMode ? '#3c3c3c' : '#d1d5db',
        color: this.darkMode ? '#d4d4d4' : '#374151'
      }
    },
    overlayStyles() {
      return {
        background: this.darkMode ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        color: this.darkMode ? '#d4d4d4' : '#374151'
      }
    }
  },
  watch: {
    darkMode() {
      this.updateTheme()
    }
  },
  mounted() {
    this.initializeTerminal()
    this.connectTerminal()
  },
  beforeUnmount() {
    this.cleanup()
  },
  methods: {
    /**
     * 初始化 xterm.js 终端
     */
    initializeTerminal() {
      // 创建终端实例
      this.terminal = new Terminal({
        cursorBlink: true,
        cursorStyle: 'block',
        fontSize: 14,
        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
        theme: this.terminalTheme,
        allowTransparency: true,
        convertEol: true,
        scrollback: 1000,
        allowProposedApi: true
      })

      // 添加插件
      this.fitAddon = new FitAddon()
      this.webLinksAddon = new WebLinksAddon()
      this.clipboardAddon = new ClipboardAddon()

      // 尝试加载ImageAddon（可能因CSP策略失败）
      try {
        this.imageAddon = new ImageAddon()
      } catch (error) {
        console.warn('ImageAddon not supported due to CSP restrictions:', error)
        this.imageAddon = null
      }

      this.searchAddon = new SearchAddon()
      this.serializeAddon = new SerializeAddon()
      this.unicode11Addon = new Unicode11Addon()

      // 尝试使用WebGL渲染器（如果支持的话）
      try {
        this.webglAddon = new WebglAddon()
      } catch (error) {
        console.warn('WebGL addon not supported, falling back to canvas renderer:', error)
        this.webglAddon = null
      }

      // 加载插件
      this.terminal.loadAddon(this.fitAddon)
      this.terminal.loadAddon(this.webLinksAddon)
      this.terminal.loadAddon(this.clipboardAddon)

      // 只有在ImageAddon成功创建时才加载
      // if (this.imageAddon) {
      //   try {
      //     this.terminal.loadAddon(this.imageAddon)
      //   } catch (error) {
      //     console.warn('Failed to load ImageAddon:', error)
      //     this.imageAddon = null
      //   }
      // }

      this.terminal.loadAddon(this.searchAddon)
      this.terminal.loadAddon(this.serializeAddon)
      this.terminal.loadAddon(this.unicode11Addon)

      // 加载WebGL addon（如果成功创建）
      if (this.webglAddon) {
        try {
          this.terminal.loadAddon(this.webglAddon)
        } catch (error) {
          console.warn('Failed to load WebGL addon:', error)
          this.webglAddon = null
        }
      }

      // 打开终端
      this.terminal.open(this.$refs.terminalElement)

      // 启用Unicode11支持
      if (this.unicode11Addon) {
        this.terminal.unicode.activeVersion = '11'
      }

      // 适配大小
      this.fitAddon.fit()

      // 监听用户输入
      this.terminal.onData((data) => {
        if (this.frontendTerminal && this.isConnected) {
          this.frontendTerminal.write(data)
        }
      })

      // 监听窗口大小变化
      this.setupResizeObserver()
    },

    /**
     * 更新终端主题
     */
    updateTheme() {
      if (this.terminal) {
        this.terminal.options.theme = this.terminalTheme
      }
    },

    /**
     * 连接到后端终端
     */
    async connectTerminal() {
      this.isConnecting = true

      try {
        // 创建前端终端实例
        this.frontendTerminal = new FrontendTerminal()

        // 获取初始路径
        const initialPath = this.initialPath || window.electron?.homeDir || ''
        this.currentPath = initialPath

        // 初始化终端
        const result = await this.frontendTerminal.init({
          cwd: initialPath,
          cols: this.terminal.cols,
          rows: this.terminal.rows,
          onData: (data) => {
            // 将后端输出写入前端终端
            this.terminal.write(data)
          },
          onClose: (code) => {
            this.isConnected = false
            this.terminal.write(`\r\n\x1b[31m终端会话已结束 (退出码: ${code})\x1b[0m\r\n`)
          }
        })

        if (result.success) {
          this.isConnected = true
          this.terminal.focus()
        } else {
          throw new Error(result.error || '终端初始化失败')
        }
      } catch (error) {
        console.error('Terminal connection error:', error)
        this.terminal.write(`\r\n\x1b[31m终端连接失败: ${error.message}\x1b[0m\r\n`)
      } finally {
        this.isConnecting = false
      }
    },

    /**
     * 重新连接终端
     */
    async reconnectTerminal() {
      if (this.frontendTerminal) {
        this.frontendTerminal.destroy()
      }
      this.isConnected = false
      this.terminal.clear()
      await this.connectTerminal()
    },

    /**
     * 清屏
     */
    clearTerminal() {
      if (this.frontendTerminal && this.isConnected) {
        this.frontendTerminal.clear()
      }
      this.terminal.clear()
    },

    /**
     * 中断当前命令 (Ctrl+C)
     */
    interruptCommand() {
      if (this.frontendTerminal && this.isConnected) {
        this.frontendTerminal.interrupt()
      }
    },

    /**
     * 关闭终端
     */
    closeTerminal() {
      this.$emit('close')
    },

    /**
     * 切换搜索功能
     */
    toggleSearch() {
      if (this.searchAddon && this.terminal) {
        try {
          // 打开搜索框
          this.searchAddon.findNext('', {
            decorations: { activeMatchColorOverviewRuler: '#ff0000' }
          })
        } catch (error) {
          console.warn('Search functionality error:', error)
        }
      }
    },

    /**
     * 复制终端内容到剪贴板
     */
    async copyTerminalContent() {
      if (this.terminal && this.clipboardAddon) {
        try {
          // 选择所有内容
          this.terminal.selectAll()
          // 复制选中内容
          await this.clipboardAddon.writeText(this.terminal.getSelection())
          // 清除选择
          this.terminal.clearSelection()
          console.log('Terminal content copied to clipboard')
        } catch (error) {
          console.warn('Copy to clipboard failed:', error)
          // 备用方案：使用浏览器API
          try {
            const content = this.terminal.getSelection() || this.serializeAddon?.serialize()
            if (content && navigator.clipboard) {
              await navigator.clipboard.writeText(content)
              console.log('Terminal content copied using fallback method')
            }
          } catch (fallbackError) {
            console.error('All clipboard methods failed:', fallbackError)
          }
        }
      }
    },

    /**
     * 序列化终端内容
     */
    serializeTerminal() {
      if (this.serializeAddon && this.terminal) {
        try {
          const serializedContent = this.serializeAddon.serialize()
          // 创建下载链接
          const blob = new Blob([serializedContent], { type: 'text/plain' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `terminal-export-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          console.log('Terminal content exported')
        } catch (error) {
          console.warn('Serialize terminal failed:', error)
        }
      }
    },

    /**
     * 设置窗口大小监听
     */
    setupResizeObserver() {
      if (window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(() => {
          this.handleResize()
        })
        this.resizeObserver.observe(this.$refs.terminalElement)
      }

      // 备用方案：监听窗口大小变化
      window.addEventListener('resize', this.handleResize)
    },

    /**
     * 处理大小变化
     */
    handleResize() {
      if (this.fitAddon && this.terminal) {
        // 延迟执行以确保DOM更新完成
        this.$nextTick(() => {
          try {
            this.fitAddon.fit()
            if (this.frontendTerminal && this.isConnected) {
              this.frontendTerminal.resize(this.terminal.cols, this.terminal.rows)
            }
          } catch (error) {
            console.warn('Terminal resize error:', error)
          }
        })
      }
    },

    /**
     * 清理资源
     */
    cleanup() {
      if (this.resizeObserver) {
        this.resizeObserver.disconnect()
      }
      window.removeEventListener('resize', this.handleResize)

      if (this.frontendTerminal) {
        this.frontendTerminal.destroy()
      }

      if (this.terminal) {
        try {
          // 手动卸载插件，避免dispose时的插件状态冲突
          const addons = [
            { addon: this.fitAddon, name: 'fitAddon' },
            { addon: this.webLinksAddon, name: 'webLinksAddon' },
            { addon: this.attachAddon, name: 'attachAddon' },
            { addon: this.clipboardAddon, name: 'clipboardAddon' },
            { addon: this.imageAddon, name: 'imageAddon' },
            { addon: this.searchAddon, name: 'searchAddon' },
            { addon: this.serializeAddon, name: 'serializeAddon' },
            { addon: this.unicode11Addon, name: 'unicode11Addon' },
            { addon: this.webglAddon, name: 'webglAddon' }
          ]

          addons.forEach(({ addon, name }) => {
            if (addon) {
              try {
                this.terminal.dispose(addon)
                this[name] = null
              } catch (error) {
                console.log(`Error disposing ${name}:`, error)
              }
            }
          })
        } catch (error) {
          console.log('Error disposing terminal addons:', error)
        }

        // 最后dispose terminal本身
        try {
          this.terminal.dispose()
        } catch (error) {
          console.log('Error disposing terminal:', error)
        }
      }
    }
  }
}
</script>

<style scoped>
.virtual-terminal {
  display: flex;
  flex-direction: column;
  height: v-bind(height);
  width: v-bind(width);
  border: 1px solid v-bind('containerStyles.borderColor');
  border-radius: 8px;
  overflow: hidden;
  background: v-bind('containerStyles.background');
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: v-bind('headerStyles.background');
  border-bottom: 1px solid v-bind('headerStyles.borderColor');
  color: v-bind('headerStyles.color');
  font-size: 12px;
}

.terminal-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.terminal-icon {
  font-size: 14px;
}

.terminal-cwd {
  color: v-bind('darkMode ? "#569cd6" : "#0451a5"');
  font-weight: 500;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.terminal-controls {
  display: flex;
  gap: 4px;
}

.control-btn {
  background: transparent;
  border: none;
  color: v-bind('headerStyles.color');
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 12px;
  transition: background-color 0.2s;
}

.control-btn:hover {
  background: v-bind('darkMode ? "#404040" : "#e5e7eb"');
}

.close-btn:hover {
  background: #f14c4c;
  color: white;
}

.terminal-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.terminal-content {
  width: 100%;
  height: 100%;
}

.terminal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: v-bind('overlayStyles.background');
  display: flex;
  align-items: center;
  justify-content: center;
  color: v-bind('overlayStyles.color');
}

.connection-status {
  text-align: center;
  padding: 20px;
}

.connecting {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid v-bind('darkMode ? "#3c3c3c" : "#d1d5db"');
  border-top: 2px solid v-bind('darkMode ? "#569cd6" : "#0451a5"');
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.disconnected {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reconnect-btn {
  background: v-bind('darkMode ? "#569cd6" : "#0451a5"');
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
}

.reconnect-btn:hover {
  background: v-bind('darkMode ? "#4a86c7" : "#1e40af"');
}

/* 响应式设计 */
@media (max-width: 768px) {
  .terminal-header {
    padding: 6px 8px;
    font-size: 11px;
  }

  .terminal-cwd {
    max-width: 150px;
  }

  .control-btn {
    padding: 3px 5px;
    font-size: 11px;
  }
}
</style>
