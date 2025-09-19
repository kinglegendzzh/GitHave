# FileBrowser 编辑模式功能使用指南

## 新增功能概述

为 FileBrowser.vue 添加了完整的编辑模式功能，包括保存、回退、重做操作，并支持 Mac/Windows 的快捷键操作。

## 🎯 核心功能

### 1. 编辑模式切换
- **默认状态**: 文件以只读模式打开
- **切换编辑**: 点击 "🔒 只读模式" 按钮切换到 "🔓 编辑模式"
- **自动保存历史**: 切换到编辑模式时自动保存当前版本到历史记录

### 2. 编辑操作按钮
当文件处于编辑模式时，会显示以下操作按钮：

#### 保存按钮
- **按钮状态**: 
  - 默认: "保存" (灰色)
  - 有未保存更改: "保存*" (蓝色高亮)
  - 保存中: "保存中..." (加载状态)
- **功能**: 将文件内容保存到磁盘并记录到历史
- **快捷键**: `Ctrl+S` (Windows) / `Cmd+S` (Mac)

#### 撤销按钮
- **图标**: ↶ 撤销
- **功能**: 撤销上一步编辑操作
- **快捷键**: `Ctrl+Z` (Windows) / `Cmd+Z` (Mac)

#### 重做按钮
- **图标**: ↷ 重做
- **功能**: 重做被撤销的编辑操作
- **快捷键**: 
  - `Ctrl+Y` (Windows)
  - `Cmd+Y` (Mac)
  - `Ctrl+Shift+Z` (Windows)
  - `Cmd+Shift+Z` (Mac)

## ⌨️ 支持的快捷键

### 基础编辑快捷键
| 功能 | Windows | Mac | 说明 |
|------|---------|-----|------|
| 保存文件 | `Ctrl+S` | `Cmd+S` | 保存到磁盘并记录历史 |
| 撤销 | `Ctrl+Z` | `Cmd+Z` | 撤销上一步操作 |
| 重做 | `Ctrl+Y` | `Cmd+Y` | 重做被撤销的操作 |
| 重做 | `Ctrl+Shift+Z` | `Cmd+Shift+Z` | 重做被撤销的操作 |
| 全选 | `Ctrl+A` | `Cmd+A` | 选择全部内容 |
| 查找 | `Ctrl+F` | `Cmd+F` | 打开查找对话框 |
| 替换 | `Ctrl+H` | `Cmd+H` | 打开查找替换对话框 |

### 高级编辑快捷键
| 功能 | Windows | Mac | 说明 |
|------|---------|-----|------|
| 复制当前行 | `Ctrl+D` | `Cmd+D` | 复制当前行到下一行 |
| 向上复制行 | `Alt+Shift+↑` | `Alt+Shift+↑` | 向上复制当前行 |
| 向下复制行 | `Alt+Shift+↓` | `Alt+Shift+↓` | 向下复制当前行 |

## 🔄 状态管理

### 未保存更改指示
- **hasUnsavedChanges**: 跟踪是否有未保存的更改
- **视觉反馈**: 保存按钮会高亮显示并显示 "*" 标记
- **自动检测**: 编辑内容时自动标记为未保存状态

### 自动保存机制
- **防抖保存**: 停止编辑 3 秒后自动保存到历史记录
- **磁盘保存**: 只有手动保存 (Ctrl+S) 才会保存到磁盘
- **状态指示**: 保存过程中显示加载状态

## 🎨 UI/UX 改进

### 按钮布局
```
[📊 索引] [🔒 锁定] [📅 时间线] | [💾 保存] [↶ 撤销] [↷ 重做]
```

### 状态指示器
- **未保存标记**: 保存按钮显示 "*" 表示有未保存更改
- **加载状态**: 保存时显示 "保存中..." 和加载动画
- **颜色编码**: 
  - 蓝色: 有未保存更改的保存按钮
  - 灰色: 默认状态的操作按钮

## 🔧 技术实现

### Monaco 编辑器集成
```javascript
// 设置编辑器快捷键
function setupEditorShortcuts(editor) {
  // Ctrl/Cmd + S: 保存文件
  editor.addCommand(
    monacoGlobal.KeyMod.CtrlCmd | monacoGlobal.KeyCode.KeyS,
    () => saveCurrentFile()
  )
  
  // Ctrl/Cmd + Z: 撤销
  editor.addCommand(
    monacoGlobal.KeyMod.CtrlCmd | monacoGlobal.KeyCode.KeyZ,
    () => editor.trigger('keyboard', 'undo', null)
  )
  
  // 更多快捷键...
}
```

### 全局快捷键支持
```javascript
// 全局快捷键监听（编辑器没有焦点时也可用）
function setupGlobalShortcuts() {
  const handleKeydown = (event) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const ctrlCmd = isMac ? event.metaKey : event.ctrlKey
    
    if (ctrlCmd && event.key === 's') {
      event.preventDefault()
      saveCurrentFile()
    }
    // 更多处理...
  }
  
  document.addEventListener('keydown', handleKeydown)
  return () => document.removeEventListener('keydown', handleKeydown)
}
```

### 文件保存流程
```javascript
async function saveCurrentFile() {
  // 1. 检查编辑权限
  if (fileEditLocked.value) return
  
  // 2. 保存到磁盘
  await window.electron.saveFile(filePath, content)
  
  // 3. 保存到历史记录
  await saveToHistory(filePath, content, '手动保存')
  
  // 4. 更新状态
  hasUnsavedChanges.value = false
}
```

## 🚀 使用流程

### 基本编辑流程
1. **打开文件**: 在 FileBrowser 中选择代码文件
2. **解锁编辑**: 点击 "🔒 只读模式" 切换到编辑模式
3. **编辑内容**: 在 Monaco 编辑器中修改代码
4. **保存文件**: 使用 `Ctrl+S` 或点击保存按钮
5. **查看历史**: 点击时间线按钮查看编辑历史

### 撤销/重做流程
1. **编辑内容**: 对文件进行多次修改
2. **撤销操作**: 使用 `Ctrl+Z` 撤销不需要的更改
3. **重做操作**: 使用 `Ctrl+Y` 恢复被撤销的更改
4. **保存结果**: 完成编辑后保存文件

## 📋 注意事项

### 编辑权限
- 只有在编辑模式下才能使用编辑操作
- 只读模式下的快捷键会显示警告提示
- 编辑模式切换会自动保存当前状态

### 保存机制
- **自动保存历史**: 3秒防抖，只保存到 IndexedDB
- **手动保存文件**: Ctrl+S 保存到磁盘和历史记录
- **状态同步**: 保存后清除未保存更改标记

### 快捷键冲突
- 全局快捷键优先级低于编辑器内快捷键
- 编辑器有焦点时使用 Monaco 内置快捷键
- 编辑器无焦点时使用全局快捷键监听

## 🔍 故障排除

### 快捷键不生效
1. 确认文件处于编辑模式
2. 检查编辑器是否有焦点
3. 查看控制台是否有错误信息

### 保存失败
1. 检查文件路径是否正确
2. 确认有文件写入权限
3. 查看 Electron 文件 API 错误信息

### 撤销/重做异常
1. 确认使用的是正确的快捷键组合
2. 检查 Monaco 编辑器是否正常初始化
3. 查看编辑器的撤销栈状态

通过这些功能，FileBrowser 现在提供了完整的代码编辑体验，支持专业的编辑操作和便捷的快捷键，大大提升了用户的编码效率。