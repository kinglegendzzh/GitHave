<template>
  <v-container fluid class="pa-4 demo-container">
    <v-card elevation="2" rounded="lg">
      <v-card-title class="d-flex align-center">
        <v-icon color="primary" class="me-2">mdi-code-braces</v-icon>
        Monaco编辑器最小可行示例Demo
      </v-card-title>
      
      <v-card-text>
        <!-- 控制面板 -->
        <v-row class="mb-4">
          <v-col cols="12" md="3">
            <v-select
              v-model="selectedLanguage"
              :items="languageOptions"
              label="选择语言"
              density="compact"
              variant="outlined"
              @update:model-value="updateLanguage"
            ></v-select>
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="selectedTheme"
              :items="themeOptions"
              label="选择主题"
              density="compact"
              variant="outlined"
              @update:model-value="updateTheme"
            ></v-select>
          </v-col>
          <v-col cols="12" md="3">
            <v-btn
              color="primary"
              variant="outlined"
              prepend-icon="mdi-format-text"
              @click="formatCode"
            >
              格式化代码
            </v-btn>
          </v-col>
          <v-col cols="12" md="3">
            <v-btn
              color="secondary"
              variant="outlined"
              prepend-icon="mdi-refresh"
              @click="resetCode"
            >
              重置代码
            </v-btn>
          </v-col>
        </v-row>

        <!-- 功能测试按钮组 -->
        <v-row class="mb-4">
          <v-col cols="12">
            <v-chip-group>
              <v-chip 
                color="success" 
                variant="outlined" 
                @click="testSearch"
                prepend-icon="mdi-magnify"
              >
                测试搜索
              </v-chip>
              <v-chip 
                color="info" 
                variant="outlined" 
                @click="testCompletion"
                prepend-icon="mdi-auto-fix"
              >
                测试代码补全
              </v-chip>
              <v-chip 
                color="warning" 
                variant="outlined" 
                @click="insertSampleCode"
                prepend-icon="mdi-code-tags"
              >
                插入示例代码
              </v-chip>
              <v-chip 
                color="error" 
                variant="outlined" 
                @click="testSelection"
                prepend-icon="mdi-cursor-text"
              >
                测试选择文本
              </v-chip>
            </v-chip-group>
          </v-col>
        </v-row>

        <!-- Monaco编辑器容器 -->
        <div class="monaco-wrapper" style="height: 500px; border: 1px solid #ddd; border-radius: 8px;">
          <MonacoEditor
            v-model:value="code"
            :language="selectedLanguage"
            :theme="selectedTheme"
            :options="monacoOptions"
            @mount="onEditorMounted"
            style="height: 100%;"
          />
        </div>

        <!-- 状态信息 -->
        <v-row class="mt-4">
          <v-col cols="12">
            <v-alert 
              :type="editorStatus.type" 
              :text="editorStatus.message"
              density="compact"
            ></v-alert>
          </v-col>
        </v-row>

        <!-- 编辑器信息 -->
        <v-expansion-panels class="mt-4">
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon class="me-2">mdi-information</v-icon>
              编辑器调试信息
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-row>
                <v-col cols="6">
                  <strong>编辑器状态:</strong> {{ monacoReady ? '已就绪' : '未就绪' }}
                </v-col>
                <v-col cols="6">
                  <strong>当前语言:</strong> {{ selectedLanguage }}
                </v-col>
                <v-col cols="6">
                  <strong>当前主题:</strong> {{ selectedTheme }}
                </v-col>
                <v-col cols="6">
                  <strong>代码行数:</strong> {{ codeLineCount }}
                </v-col>
                <v-col cols="12">
                  <strong>当前代码长度:</strong> {{ code.length }} 字符
                </v-col>
              </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import MonacoEditor from 'monaco-editor-vue3'

// 配置Monaco环境
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker.js?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker.js?worker'

window.MonacoEnvironment = {
  getWorker: (_moduleId, label) => {
    if (label === 'json') {
      return new JsonWorker()
    }
    if (label === 'typescript' || label === 'javascript') {
      return new TsWorker()
    }
    return new EditorWorker()
  }
}

// 响应式数据
const code = ref(`// Monaco编辑器测试示例
function greetUser(name) {
  console.log('Hello, ' + name + '!');
  return {
    message: \`欢迎使用Monaco编辑器，\${name}!\`,
    timestamp: new Date().toISOString()
  };
}

// 测试代码补全
const user = {
  id: 1,
  name: 'Developer',
  email: 'dev@example.com'
};

// 调用函数
const result = greetUser(user.name);
console.log(result);
`)

const selectedLanguage = ref('javascript')
const selectedTheme = ref('vs-dark')
const monacoReady = ref(false)
const editorInstance = ref(null)
const monacoGlobal = ref(null)

// 配置选项
const languageOptions = [
  { title: 'JavaScript', value: 'javascript' },
  { title: 'TypeScript', value: 'typescript' },
  { title: 'Vue', value: 'vue' },
  { title: 'JSON', value: 'json' },
  { title: 'HTML', value: 'html' },
  { title: 'CSS', value: 'css' },
  { title: 'Python', value: 'python' },
  { title: 'Java', value: 'java' },
  { title: 'Go', value: 'go' },
  { title: 'Markdown', value: 'markdown' }
]

const themeOptions = [
  { title: '深色主题', value: 'vs-dark' },
  { title: '浅色主题', value: 'vs' },
  { title: '高对比度', value: 'hc-black' }
]

const monacoOptions = reactive({
  fontSize: 14,
  fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
  automaticLayout: true,
  wordWrap: 'on',
  minimap: { enabled: true },
  scrollBeyondLastLine: false,
  readOnly: false,
  suggestOnTriggerCharacters: true,
  snippetSuggestions: 'inline',
  quickSuggestions: true,
  tabSize: 2,
  insertSpaces: true,
  bracketPairColorization: { enabled: true },
  folding: true,
  lineNumbers: 'on',
  glyphMargin: true,
  smoothScrolling: true
})

// 计算属性
const codeLineCount = computed(() => {
  return code.value.split('\n').length
})

const editorStatus = computed(() => {
  if (!monacoReady.value) {
    return {
      type: 'warning',
      message: 'Monaco编辑器正在初始化...'
    }
  }
  return {
    type: 'success',
    message: `Monaco编辑器已就绪 - 语言: ${selectedLanguage.value}, 主题: ${selectedTheme.value}`
  }
})

// 示例代码模板
const codeTemplates = {
  javascript: `// JavaScript 示例
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log('斐波那契数列前10项:');
for (let i = 0; i < 10; i++) {
  console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}`,
  
  typescript: `// TypeScript 示例
interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

class UserService {
  private users: User[] = [];
  
  addUser(user: User): void {
    this.users.push(user);
  }
  
  getUserById(id: number): User | undefined {
    return this.users.find(user => user.id === id);
  }
}

const service = new UserService();
service.addUser({
  id: 1,
  name: '张三',
  email: 'zhangsan@example.com',
  isActive: true
});`,

  python: `# Python 示例
def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    return quick_sort(left) + middle + quick_sort(right)

# 测试快速排序
numbers = [64, 34, 25, 12, 22, 11, 90]
print(f"原始数组: {numbers}")
sorted_numbers = quick_sort(numbers)
print(f"排序后: {sorted_numbers}")`,

  json: `{
  "name": "Monaco Editor Demo",
  "version": "1.0.0",
  "description": "Monaco编辑器测试示例",
  "features": [
    "语法高亮",
    "代码补全",
    "错误检查",
    "格式化",
    "主题切换"
  ],
  "config": {
    "theme": "vs-dark",
    "fontSize": 14,
    "tabSize": 2,
    "wordWrap": true
  },
  "languages": {
    "supported": ["javascript", "typescript", "python", "java", "go"]
  }
}`
}

// 方法
function onEditorMounted(editor) {
  console.log('Monaco编辑器挂载完成', editor)
  
  editorInstance.value = editor
  monacoGlobal.value = editor.$monaco
  monacoReady.value = true
  
  // 注册代码补全提供者
  registerCompletionProvider()
  
  // 注册快捷键
  registerKeyboardShortcuts()
  
  // 更新编辑器选项
  editor.updateOptions(monacoOptions)
  
  console.log('Monaco编辑器初始化完成')
}

function registerCompletionProvider() {
  if (!monacoGlobal.value) return
  
  // 为JavaScript/TypeScript注册自定义补全
  monacoGlobal.value.languages.registerCompletionItemProvider(['javascript', 'typescript'], {
    triggerCharacters: ['.', '@'],
    provideCompletionItems: () => {
      const suggestions = [
        {
          label: 'console.log',
          kind: monacoGlobal.value.languages.CompletionItemKind.Snippet,
          insertText: 'console.log(${1:message});',
          insertTextRules: monacoGlobal.value.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: '输出日志到控制台'
        },
        {
          label: 'function',
          kind: monacoGlobal.value.languages.CompletionItemKind.Snippet,
          insertText: 'function ${1:functionName}(${2:params}) {\n\t${3:// 函数体}\n\treturn ${4:result};\n}',
          insertTextRules: monacoGlobal.value.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: '创建函数'
        },
        {
          label: 'for循环',
          kind: monacoGlobal.value.languages.CompletionItemKind.Snippet,
          insertText: 'for (let ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t${3:// 循环体}\n}',
          insertTextRules: monacoGlobal.value.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'for循环'
        }
      ]
      
      return { suggestions }
    }
  })
}

function registerKeyboardShortcuts() {
  if (!editorInstance.value) return
  
  // 注册自定义快捷键
  editorInstance.value.addCommand(
    monacoGlobal.value.KeyMod.CtrlCmd | monacoGlobal.value.KeyCode.KeyK,
    () => {
      console.log('触发自定义快捷键: Ctrl/Cmd + K')
      formatCode()
    }
  )
}

function updateLanguage() {
  if (editorInstance.value) {
    const model = editorInstance.value.getModel()
    if (model) {
      monacoGlobal.value.editor.setModelLanguage(model, selectedLanguage.value)
    }
  }
}

function updateTheme() {
  if (editorInstance.value) {
    monacoGlobal.value.editor.setTheme(selectedTheme.value)
  }
}

function formatCode() {
  if (editorInstance.value) {
    editorInstance.value.getAction('editor.action.formatDocument').run()
  }
}

function resetCode() {
  const template = codeTemplates[selectedLanguage.value]
  if (template) {
    code.value = template
  } else {
    code.value = codeTemplates.javascript
  }
}

function testSearch() {
  if (editorInstance.value) {
    // 打开搜索框
    editorInstance.value.getAction('actions.find').run()
  }
}

function testCompletion() {
  if (editorInstance.value) {
    // 触发代码补全
    editorInstance.value.getAction('editor.action.triggerSuggest').run()
  }
}

function insertSampleCode() {
  if (editorInstance.value) {
    const position = editorInstance.value.getPosition()
    const sampleCode = `
// 插入的示例代码
const currentTime = new Date().toLocaleString();
console.log('当前时间:', currentTime);
`
    editorInstance.value.executeEdits('insertSample', [{
      range: new monacoGlobal.value.Range(position.lineNumber, position.column, position.lineNumber, position.column),
      text: sampleCode
    }])
  }
}

function testSelection() {
  if (editorInstance.value) {
    // 选择第一行
    const model = editorInstance.value.getModel()
    if (model) {
      const firstLine = model.getLineContent(1)
      editorInstance.value.setSelection(new monacoGlobal.value.Range(1, 1, 1, firstLine.length + 1))
      editorInstance.value.focus()
    }
  }
}

// 生命周期
onMounted(() => {
  console.log('MonacoDemo 组件已挂载')
})
</script>

<style scoped>
.demo-container {
  max-width: 1200px;
  margin: 0 auto;
}

.monaco-wrapper {
  background-color: #1e1e1e;
  overflow: hidden;
}

:deep(.monaco-editor) {
  border-radius: 8px;
}

.v-chip {
  margin: 2px;
}

.v-expansion-panel-text {
  padding-top: 16px;
}
</style>