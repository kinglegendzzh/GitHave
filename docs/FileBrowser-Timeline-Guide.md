# FileBrowser 时间线功能使用指南

## 概述

基于 IndexedDB 的文件历史管理系统已经集成到 FileBrowser.vue 中，模仿 VSCode 的时间线功能，支持完整的文件版本管理和 Monaco 差异展示。

## 主要功能

### 1. 文件历史管理
- **自动保存**: 文件编辑时自动保存历史版本（3秒防抖）
- **手动保存**: 切换编辑模式时手动保存版本
- **去重机制**: 基于 SHA-256 哈希避免保存重复内容
- **版本限制**: 每个文件最多保留 20 个历史版本

### 2. 时间线界面
- **历史列表**: 显示文件的所有历史版本，包含时间戳、大小、描述
- **版本操作**: 支持查看、恢复、删除历史版本
- **统计信息**: 显示总版本数、平均大小等统计数据
- **搜索功能**: 支持按内容或描述搜索历史版本

### 3. Monaco 差异展示
- **并排显示**: 使用 Monaco 差异编辑器并排显示原始版本和历史版本
- **语法高亮**: 保持文件类型的语法高亮
- **主题同步**: 与当前编辑器主题保持一致

## 使用步骤

### 1. 开启文件编辑
1. 在 FileBrowser 中打开一个代码文件
2. 点击 "🔒 只读模式" 按钮切换到 "🔓 编辑模式"
3. 系统自动保存当前版本到历史记录

### 2. 编辑文件
1. 在 Monaco 编辑器中修改文件内容
2. 系统在 3 秒后自动保存修改到历史记录
3. 继续编辑会创建新的历史版本

### 3. 查看时间线
1. 点击 "📅 时间线" 按钮打开时间线面板
2. 在右侧边栏查看文件的所有历史版本
3. 每个版本显示时间戳、文件大小、描述信息

### 4. 版本操作
- **查看版本**: 点击历史项查看该版本内容
- **差异对比**: 点击 "差异视图" 按钮并排显示当前版本和历史版本的差异
- **恢复版本**: 点击 "恢复" 按钮将文件恢复到选定的历史版本
- **删除版本**: 点击 "删除" 按钮移除不需要的历史版本

## 技术特性

### IndexedDB 存储
- **数据结构**: 
  ```javascript
  {
    id: number,           // 自动递增ID
    filePath: string,     // 文件完整路径
    content: string,      // 文件内容
    timestamp: number,    // 时间戳
    size: number,         // 文件大小
    hash: string,         // SHA-256 哈希值
    description: string,  // 版本描述
    metadata: object      // 元数据（语言类型等）
  }
  ```

### 性能优化
- **去重机制**: 基于内容哈希避免保存重复版本
- **自动清理**: 超过版本限制时自动清理旧版本
- **懒加载**: 按需加载历史版本，限制显示数量
- **索引优化**: 使用复合索引提升查询性能

### 错误处理
- **数据库初始化**: 自动处理 IndexedDB 初始化失败
- **版本冲突**: 处理并发操作的版本冲突
- **存储限制**: 处理浏览器存储配额限制
- **兼容性**: 降级到内存存储如果 IndexedDB 不可用

## API 接口

### FileHistoryDB 类
```javascript
// 保存历史版本
await fileHistoryDB.saveHistory(filePath, content, description, metadata)

// 获取文件历史
const history = await fileHistoryDB.getFileHistory(filePath, limit)

// 删除历史版本
await fileHistoryDB.deleteHistory(id)

// 获取统计信息
const stats = await fileHistoryDB.getHistoryStats(filePath)

// 搜索历史
const results = await fileHistoryDB.searchHistory(filePath, searchText, limit)
```

## 故障排除

### 常见问题
1. **历史记录不显示**: 检查 IndexedDB 是否正常初始化
2. **差异视图异常**: 确保 Monaco 编辑器已正确加载
3. **保存失败**: 检查浏览器存储配额是否充足
4. **版本过多**: 系统会自动清理，保留最近 20 个版本

### 调试模式
在浏览器控制台中可以查看详细日志：
```javascript
// 查看 IndexedDB 状态
console.log(fileHistoryDB.db)

// 查看当前历史记录
console.log(fileHistory.value)

// 手动触发清理
await fileHistoryDB.cleanupHistory(filePath, 10)
```

## 注意事项

1. **存储限制**: IndexedDB 受浏览器存储配额限制，大文件频繁编辑可能触发清理
2. **性能影响**: 大文件的差异计算可能影响性能，建议限制文件大小
3. **数据持久性**: IndexedDB 数据在用户清理浏览器数据时会丢失
4. **兼容性**: 需要现代浏览器支持 IndexedDB 和 Web Crypto API

## 升级说明

这个实现完全替代了之前基于 localStorage 的简单历史管理，提供了：
- 更强大的数据结构和查询能力
- 更好的性能和存储效率
- 完整的版本管理功能
- 专业的差异展示界面

所有现有功能保持兼容，无需修改使用方式。