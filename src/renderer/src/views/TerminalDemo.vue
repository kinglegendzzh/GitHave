<template>
  <v-container class="terminal-demo">
    <div class="demo-header">
      <h1>GitHave 虚拟终端演示</h1>
      <p>这是一个基于 node-pty 和 xterm.js 的虚拟终端组件演示</p>
    </div>
    
    <div class="demo-controls">
      <button @click="showTerminal = !showTerminal" class="toggle-btn">
        {{ showTerminal ? '隐藏终端' : '显示终端' }}
      </button>
      <button @click="createNewTerminal" class="new-terminal-btn" :disabled="terminals.length >= 3">
        新建终端 ({{ terminals.length }}/3)
      </button>
    </div>

    <div v-if="showTerminal" class="terminals-container">
      <div v-if="terminals.length === 0" class="no-terminals">
        <p>暂无终端实例</p>
        <button @click="createNewTerminal" class="create-first-btn">创建第一个终端</button>
      </div>
      
      <div v-else class="terminals-grid">
        <div 
          v-for="terminal in terminals" 
          :key="terminal.id"
          class="terminal-wrapper"
          :class="{ 'single': terminals.length === 1, 'dual': terminals.length === 2 }"
        >
          <div class="terminal-tab">
            <span class="tab-title">终端 {{ terminal.id }}</span>
            <button @click="closeTerminal(terminal.id)" class="close-tab-btn">×</button>
          </div>
          <VirtualTerminal
            :key="terminal.id"
            :initial-path="terminal.path"
            :height="terminalHeight"
            @close="closeTerminal(terminal.id)"
          />
        </div>
      </div>
    </div>

    <div class="demo-info">
      <h3>功能特性</h3>
      <ul>
        <li>✅ 基于 node-pty 的真实终端环境</li>
        <li>✅ 支持所有标准终端命令和操作</li>
        <li>✅ 自动适应窗口大小变化</li>
        <li>✅ 支持多终端实例管理</li>
        <li>✅ 默认启动在用户主目录</li>
        <li>✅ 支持 Ctrl+C 中断、清屏等快捷操作</li>
        <li>✅ 美观的终端界面和主题</li>
        <li>✅ 跨平台支持 (macOS, Windows, Linux)</li>
        <li>🆕 内置搜索功能 - 快速查找终端内容</li>
        <li>🆕 剪贴板集成 - 一键复制终端内容</li>
        <li>🆕 内容导出 - 保存终端会话记录</li>
        <li>🆕 图像支持 - 显示终端中的图片内容</li>
        <li>🆕 WebGL 渲染 - 更流畅的终端性能</li>
        <li>🆕 Unicode11 支持 - 完整的字符集支持</li>
        <li>🆕 网页链接检测 - 自动识别并可点击链接</li>
      </ul>

      <h3>使用说明</h3>
      <ul>
        <li>🖱️ 点击终端区域开始输入命令</li>
        <li>⌨️ 支持所有标准键盘快捷键</li>
        <li>🔍 点击搜索按钮在终端内容中查找文本</li>
        <li>📋 点击复制按钮将终端内容复制到剪贴板</li>
        <li>💾 点击导出按钮保存终端会话为文本文件</li>
        <li>🗑️ 点击清屏按钮清空终端内容</li>
        <li>⏹️ 点击中断按钮发送 Ctrl+C 信号</li>
        <li>🔄 点击重连按钮重新建立终端连接</li>
        <li>❌ 点击关闭按钮关闭当前终端</li>
      </ul>

      <h3>技术栈</h3>
      <div class="tech-stack">
        <span class="tech-item">Vue 3</span>
        <span class="tech-item">Electron</span>
        <span class="tech-item">node-pty</span>
        <span class="tech-item">xterm.js</span>
        <span class="tech-item">IPC 通信</span>
        <span class="tech-item">xterm-addon-fit</span>
        <span class="tech-item">xterm-addon-search</span>
        <span class="tech-item">xterm-addon-clipboard</span>
        <span class="tech-item">xterm-addon-webgl</span>
        <span class="tech-item">xterm-addon-unicode11</span>
      </div>
    </div>
  </v-container>
</template>

<script>
import VirtualTerminal from '../components/VirtualTerminal.vue'

export default {
  name: 'TerminalDemo',
  components: {
    VirtualTerminal
  },
  data() {
    return {
      showTerminal: true,
      terminals: [],
      nextTerminalId: 1
    }
  },
  computed: {
    terminalHeight() {
      const count = this.terminals.length
      if (count === 1) return '500px'
      if (count === 2) return '400px'
      return '300px'
    }
  },
  mounted() {
    // 默认创建一个终端
    this.createNewTerminal()
  },
  methods: {
    createNewTerminal() {
      if (this.terminals.length >= 3) {
        alert('最多只能同时打开3个终端实例')
        return
      }
      
      const terminal = {
        id: this.nextTerminalId++,
        path: window.electron?.homeDir || ''
      }
      
      this.terminals.push(terminal)
    },
    
    closeTerminal(terminalId) {
      const index = this.terminals.findIndex(t => t.id === terminalId)
      if (index !== -1) {
        this.terminals.splice(index, 1)
      }
    }
  }
}
</script>

<style scoped>
.terminal-demo {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.demo-header {
  text-align: center;
  margin-bottom: 30px;
}

.demo-header h1 {
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 2.5em;
  font-weight: 300;
}

.demo-header p {
  color: #7f8c8d;
  font-size: 1.1em;
  margin: 0;
}

.demo-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  justify-content: center;
}

.toggle-btn,
.new-terminal-btn,
.create-first-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.toggle-btn {
  background: #3498db;
  color: white;
}

.toggle-btn:hover {
  background: #2980b9;
}

.new-terminal-btn {
  background: #2ecc71;
  color: white;
}

.new-terminal-btn:hover:not(:disabled) {
  background: #27ae60;
}

.new-terminal-btn:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.terminals-container {
  margin-bottom: 40px;
}

.no-terminals {
  text-align: center;
  padding: 60px 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px dashed #dee2e6;
}

.no-terminals p {
  color: #6c757d;
  font-size: 1.1em;
  margin-bottom: 20px;
}

.create-first-btn {
  background: #17a2b8;
  color: white;
  font-size: 16px;
  padding: 12px 24px;
}

.create-first-btn:hover {
  background: #138496;
}

.terminals-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: 1fr;
}

.terminals-grid.dual {
  grid-template-columns: 1fr 1fr;
}

.terminals-grid.triple {
  grid-template-columns: 1fr 1fr 1fr;
}

.terminal-wrapper {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.terminal-tab {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  font-size: 12px;
  color: #495057;
}

.tab-title {
  font-weight: 500;
}

.close-tab-btn {
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition: all 0.2s ease;
}

.close-tab-btn:hover {
  background: #e9ecef;
  color: #dc3545;
}

.demo-info {
  background: #f8f9fa;
  padding: 30px;
  border-radius: 8px;
  border-left: 4px solid #3498db;
}

.demo-info h3 {
  color: #2c3e50;
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.3em;
}

.demo-info ul {
  list-style: none;
  padding: 0;
  margin-bottom: 25px;
}

.demo-info li {
  padding: 5px 0;
  color: #495057;
  font-size: 14px;
}

.tech-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.tech-item {
  background: #3498db;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .terminals-grid.dual {
    grid-template-columns: 1fr;
  }
  
  .demo-controls {
    flex-direction: column;
    align-items: center;
  }
  
  .demo-header h1 {
    font-size: 2em;
  }
  
  .terminal-demo {
    padding: 15px;
  }
}

@media (max-width: 1024px) {
  .terminals-grid.triple {
    grid-template-columns: 1fr 1fr;
  }
}
</style>