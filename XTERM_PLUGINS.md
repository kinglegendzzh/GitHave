# XTerm.js 插件集成说明

本项目已集成多个官方维护的 xterm.js 插件，为终端提供丰富的功能扩展。

## 已集成的插件

### 1. @xterm/addon-fit
**功能**: 自动调整终端大小以适应容器
- 自动适配父容器尺寸
- 响应窗口大小变化
- 保持最佳显示效果

### 2. @xterm/addon-web-links
**功能**: 网页链接检测与交互
- 自动识别终端中的URL
- 点击链接在浏览器中打开
- 支持多种链接格式

### 3. @xterm/addon-search
**功能**: 终端内容搜索
- 🔍 点击搜索按钮激活搜索功能
- 支持正则表达式搜索
- 高亮显示搜索结果
- 快速定位到匹配内容

### 4. @xterm/addon-clipboard
**功能**: 剪贴板集成
- 📋 一键复制终端内容到系统剪贴板
- 支持选中文本复制
- 跨平台剪贴板访问

### 5. @xterm/addon-serialize
**功能**: 终端内容序列化
- 💾 导出终端会话为文本文件
- 保存完整的终端历史记录
- 支持VT序列和HTML格式

### 6. @xterm/addon-image
**功能**: 图像显示支持
- 在终端中显示图片
- 支持多种图像格式
- 增强终端视觉体验

### 7. @xterm/addon-unicode11
**功能**: Unicode 11 字符支持
- 完整的Unicode字符集支持
- 正确显示各种特殊字符
- 支持表情符号和符号字符

### 8. @xterm/addon-webgl
**功能**: WebGL 渲染加速
- 使用WebGL2上下文进行渲染
- 提升终端性能和流畅度
- 自动降级到Canvas渲染器

### 9. @xterm/addon-attach (预留)
**功能**: WebSocket 连接支持
- 通过WebSocket连接到远程进程
- 支持远程终端访问
- 网络终端会话管理

## 使用方法

### 搜索功能
```javascript
// 点击搜索按钮或使用API
this.searchAddon.findNext('搜索内容')
```

### 复制功能
```javascript
// 选择所有内容并复制
this.terminal.selectAll()
await this.clipboardAddon.writeText(this.terminal.getSelection())
```

### 导出功能
```javascript
// 序列化终端内容
const content = this.serializeAddon.serialize()
// 创建下载链接
const blob = new Blob([content], { type: 'text/plain' })
```

## 技术特性

- ✅ **模块化设计**: 每个插件独立加载，按需使用
- ✅ **错误处理**: 插件加载失败时自动降级
- ✅ **性能优化**: WebGL渲染提升显示性能
- ✅ **跨平台**: 所有插件支持主流操作系统
- ✅ **用户友好**: 直观的按钮界面操作

## 插件管理

### 初始化
所有插件在终端组件初始化时自动加载：

```javascript
// 创建插件实例
this.fitAddon = new FitAddon()
this.searchAddon = new SearchAddon()
this.clipboardAddon = new ClipboardAddon()
// ... 其他插件

// 加载到终端
this.terminal.loadAddon(this.fitAddon)
this.terminal.loadAddon(this.searchAddon)
// ... 其他插件
```

### 清理
组件销毁时自动清理所有插件资源：

```javascript
addons.forEach(({ addon, name }) => {
  if (addon) {
    this.terminal.dispose(addon)
    this[name] = null
  }
})
```

## 更新日志

- **v1.0.0**: 集成基础插件 (fit, web-links)
- **v1.1.0**: 添加搜索、剪贴板、序列化插件
- **v1.2.0**: 集成图像、Unicode11、WebGL插件
- **v1.3.0**: 预留attach插件支持

## 注意事项

1. **WebGL支持**: 部分设备可能不支持WebGL，会自动降级到Canvas渲染
2. **剪贴板权限**: 需要用户授权才能访问系统剪贴板
3. **搜索性能**: 大量终端内容时搜索可能较慢
4. **内存管理**: 及时清理插件资源避免内存泄漏

## 开发指南

### 添加新插件
1. 安装插件包: `npm install @xterm/addon-xxx`
2. 在组件中导入: `import { XxxAddon } from '@xterm/addon-xxx'`
3. 创建实例: `this.xxxAddon = new XxxAddon()`
4. 加载插件: `this.terminal.loadAddon(this.xxxAddon)`
5. 添加清理逻辑

### 自定义配置
```javascript
// 搜索插件配置
this.searchAddon = new SearchAddon({
  decorations: {
    activeMatchColorOverviewRuler: '#ff0000',
    matchOverviewRuler: '#ffff00'
  }
})
```

---

更多信息请参考 [xterm.js 官方文档](https://xtermjs.org/docs/)