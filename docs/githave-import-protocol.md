# GitHave 本地操作接口协议规范

## 概述

GitHave 本地操作功能允许用户通过自定义协议 `githave://` 在Web端与本地GitHave App之间进行无缝的数据传输和操作，包括索引文件导入和仓库克隆等功能。

## 协议格式

### 导入索引协议结构

```
githave://import?github={github_url}&download={download_url}&filename={filename}[&token={jwt_token}]
```

### 克隆仓库协议结构

```
githave://clone?github={github_url}&owner={owner}&repo={repo}[&token={jwt_token}][&branch={branch}][&description={description}][&private={private}]
```

### 协议组成部分

| 组件 | 说明 |
|------|------|
| `githave://` | 自定义协议头，用于唤起GitHave App |
| `import` | 操作类型，表示索引文件导入操作 |
| `clone` | 操作类型，表示仓库克隆操作 |
| 查询参数 | 包含操作所需的各种参数 |

## 参数说明

### 导入索引操作参数

#### 必需参数

##### `github`
- **类型**: String (URL编码)
- **描述**: GitHub仓库的完整URL
- **格式**: `https://github.com/{owner}/{repo}`
- **示例**: `https://github.com/cloudwego/eino`

##### `download`
- **类型**: String (URL编码)
- **描述**: 索引文件的下载接口地址
- **格式**: HTTP/HTTPS URL
- **示例**: `http://localhost:3000/api/v1/file/download?remote_path=/repositories/indexes/23_2_chordPrediction.gitgo.tar.gz`

##### `filename`
- **类型**: String (URL编码)
- **描述**: 索引文件的文件名
- **格式**: 文件名字符串
- **示例**: `23_2_chordPrediction.gitgo.tar.gz`

### 克隆仓库操作参数

#### 必需参数

##### `github`
- **类型**: String (URL编码)
- **描述**: GitHub仓库的完整URL
- **格式**: `https://github.com/{owner}/{repo}`
- **示例**: `https://github.com/cloudwego/eino`

##### `owner`
- **类型**: String (URL编码)
- **描述**: 仓库所有者用户名或组织名
- **格式**: GitHub用户名字符串
- **示例**: `cloudwego`

##### `repo`
- **类型**: String (URL编码)
- **描述**: 仓库名称
- **格式**: 仓库名字符串
- **示例**: `eino`

#### 可选参数

##### `branch`
- **类型**: String (URL编码)
- **描述**: 默认分支名称
- **格式**: 分支名字符串
- **示例**: `main`

##### `description`
- **类型**: String (URL编码)
- **描述**: 仓库描述信息
- **格式**: 描述文本字符串
- **示例**: `A powerful AI framework`

##### `private`
- **类型**: Boolean
- **描述**: 仓库是否为私有仓库
- **格式**: `true` 或 `false`
- **示例**: `false`

### 通用可选参数

#### `token`
- **类型**: String (URL编码)
- **描述**: JWT认证令牌，用于访问需要权限的资源
- **格式**: JWT Token字符串
- **说明**: 如果用户已登录，则包含此参数；未登录用户可省略

## 完整示例

### 导入索引操作示例

#### 已登录用户

```
githave://import?github=https%3A%2F%2Fgithub.com%2Fcloudwego%2Feino&download=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fv1%2Ffile%2Fdownload%3Fremote_path%3D%2Frepositories%2Findexes%2F23_2_chordPrediction.gitgo.tar.gz&filename=23_2_chordPrediction.gitgo.tar.gz&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 未登录用户

```
githave://import?github=https%3A%2F%2Fgithub.com%2Fcloudwego%2Feino&download=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fv1%2Ffile%2Fdownload%3Fremote_path%3D%2Frepositories%2Findexes%2F23_2_chordPrediction.gitgo.tar.gz&filename=23_2_chordPrediction.gitgo.tar.gz
```

### 克隆仓库操作示例

#### 已登录用户（包含完整信息）

```
githave://clone?github=https%3A%2F%2Fgithub.com%2Fcloudwego%2Feino&owner=cloudwego&repo=eino&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...&branch=main&description=A%20powerful%20AI%20framework&private=false
```

#### 未登录用户（基本信息）

```
githave://clone?github=https%3A%2F%2Fgithub.com%2Fcloudwego%2Feino&owner=cloudwego&repo=eino&branch=main
```

#### 私有仓库克隆

```
githave://clone?github=https%3A%2F%2Fgithub.com%2Fmyorg%2Fprivate-repo&owner=myorg&repo=private-repo&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...&private=true
```

## 实现流程

### Web端实现

#### 导入索引操作

1. **参数准备**
   ```javascript
   const githubUrl = `https://github.com/${owner}/${repo}`;
   const downloadUrl = item.remote_url; // 从API获取
   const fileName = item.file_name;
   const token = localStorage.getItem('token'); // 可选
   ```

2. **URL构建**
   ```javascript
   let githaveUrl = `githave://import?` + 
     `github=${encodeURIComponent(githubUrl)}&` +
     `download=${encodeURIComponent(downloadUrl)}&` +
     `filename=${encodeURIComponent(fileName)}`;
   
   if (token) {
     githaveUrl += `&token=${encodeURIComponent(token)}`;
   }
   ```

#### 克隆仓库操作

1. **参数准备**
   ```javascript
   const githubUrl = `https://github.com/${owner}/${repo}`;
   const token = localStorage.getItem('token'); // 可选
   const githubData = getRepositoryData(); // 从API获取的仓库信息
   ```

2. **URL构建**
   ```javascript
   let githaveUrl = `githave://clone?` + 
     `github=${encodeURIComponent(githubUrl)}&` +
     `owner=${encodeURIComponent(owner)}&` +
     `repo=${encodeURIComponent(repo)}`;
   
   if (token) {
     githaveUrl += `&token=${encodeURIComponent(token)}`;
   }
   
   // 添加可选的仓库信息
   if (githubData.default_branch) {
     githaveUrl += `&branch=${encodeURIComponent(githubData.default_branch)}`;
   }
   if (githubData.description) {
     githaveUrl += `&description=${encodeURIComponent(githubData.description)}`;
   }
   if (githubData.private !== undefined) {
     githaveUrl += `&private=${githubData.private}`;
   }
   ```

#### 通用流程

3. **协议调用**
   ```javascript
   window.location.href = githaveUrl;
   ```

4. **失败处理**
   ```javascript
   setTimeout(() => {
     if (!document.hidden) {
       // 显示App下载提示
       showAppDownloadDialog();
     }
   }, 2000);
   ```

### App端实现

1. **协议注册**
   - 在操作系统中注册 `githave://` 协议处理器
   - 配置App为该协议的默认处理程序

2. **协议路由解析**
   ```javascript
   const url = new URL(protocolUrl);
   const operation = url.pathname; // 'import' 或 'clone'
   
   switch(operation) {
     case 'import':
       handleImportOperation(url);
       break;
     case 'clone':
       handleCloneOperation(url);
       break;
     default:
       showError('不支持的操作类型');
   }
   ```

#### 导入索引操作处理

3. **参数解析**
   ```javascript
   const handleImportOperation = (url) => {
     const params = {
       github: decodeURIComponent(url.searchParams.get('github')),
       download: decodeURIComponent(url.searchParams.get('download')),
       filename: decodeURIComponent(url.searchParams.get('filename')),
       token: url.searchParams.get('token') ? 
              decodeURIComponent(url.searchParams.get('token')) : null
     };
   };
   ```

4. **文件下载**
   ```javascript
   const headers = {};
   if (params.token) {
     headers['Authorization'] = `Bearer ${params.token}`;
   }
   
   const response = await fetch(params.download, { headers });
   const blob = await response.blob();
   ```

5. **本地保存**
   - 将下载的索引文件保存到App的本地存储
   - 更新本地仓库索引数据库
   - 显示导入成功提示

#### 克隆仓库操作处理

6. **参数解析**
   ```javascript
   const handleCloneOperation = (url) => {
     const params = {
       github: decodeURIComponent(url.searchParams.get('github')),
       owner: decodeURIComponent(url.searchParams.get('owner')),
       repo: decodeURIComponent(url.searchParams.get('repo')),
       token: url.searchParams.get('token') ? 
              decodeURIComponent(url.searchParams.get('token')) : null,
       branch: url.searchParams.get('branch') ? 
               decodeURIComponent(url.searchParams.get('branch')) : 'main',
       description: url.searchParams.get('description') ? 
                    decodeURIComponent(url.searchParams.get('description')) : '',
       private: url.searchParams.get('private') === 'true'
     };
   };
   ```

7. **仓库克隆**
   ```javascript
   // 构建Git克隆URL
   const cloneUrl = params.private && params.token ? 
     `https://${params.token}@github.com/${params.owner}/${params.repo}.git` :
     `https://github.com/${params.owner}/${params.repo}.git`;
   
   // 执行Git克隆操作
   const result = await executeGitClone({
     url: cloneUrl,
     branch: params.branch,
     localPath: getLocalRepositoryPath(params.owner, params.repo)
   });
   ```

8. **本地仓库管理**
   - 将克隆的仓库添加到本地仓库列表
   - 保存仓库元信息（描述、分支、私有状态等）
   - 初始化本地索引构建任务
   - 显示克隆成功提示

## 错误处理

### 常见错误场景

#### 通用错误

1. **App未安装**
   - 现象：协议无法唤起App
   - 处理：显示App下载页面引导

2. **参数缺失**
   - 现象：必需参数为空或格式错误
   - 处理：App显示参数错误提示

3. **Token过期**
   - 现象：401认证失败
   - 处理：提示用户重新登录Web端

#### 导入索引特有错误

4. **下载失败**
   - 现象：网络错误或权限不足
   - 处理：显示具体错误信息和重试选项

5. **文件格式错误**
   - 现象：下载的文件不是有效的索引文件
   - 处理：提示文件格式错误，建议重新生成索引

#### 克隆仓库特有错误

6. **仓库不存在**
   - 现象：GitHub返回404错误
   - 处理：提示仓库不存在或已被删除

7. **权限不足**
   - 现象：私有仓库无访问权限
   - 处理：提示需要有效的访问令牌

8. **本地路径冲突**
   - 现象：目标路径已存在同名仓库
   - 处理：提示用户选择不同路径或覆盖现有仓库

9. **磁盘空间不足**
   - 现象：本地存储空间不够
   - 处理：提示清理磁盘空间或选择其他位置

10. **Git操作失败**
    - 现象：Git克隆过程中出现错误
    - 处理：显示Git错误信息，提供重试选项

### 错误码定义

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| **通用错误码** |
| 1001 | 参数缺失 | 检查必需参数 |
| 1002 | URL格式错误 | 验证URL有效性 |
| 1005 | Token无效 | 重新获取认证 |
| 1006 | 操作类型不支持 | 检查协议路径 |
| **导入索引错误码** |
| 1003 | 下载失败 | 检查网络和权限 |
| 1004 | 文件保存失败 | 检查本地存储空间 |
| 1007 | 索引文件格式错误 | 重新生成索引文件 |
| **克隆仓库错误码** |
| 2001 | 仓库不存在 | 验证仓库URL有效性 |
| 2002 | 权限不足 | 检查访问令牌权限 |
| 2003 | 本地路径冲突 | 选择不同路径或覆盖 |
| 2004 | 磁盘空间不足 | 清理磁盘空间 |
| 2005 | Git操作失败 | 检查Git环境和网络 |
| 2006 | 分支不存在 | 验证分支名称 |

## 安全考虑

### 数据验证

1. **URL验证**
   - 验证GitHub URL格式的合法性
   - 检查下载URL的域名白名单

2. **文件验证**
   - 验证文件名的安全性（防止路径遍历）
   - 检查文件大小限制
   - 验证文件类型和格式

3. **Token验证**
   - 验证JWT Token的有效性和完整性
   - 检查Token的过期时间

### 权限控制

1. **访问控制**
   - 根据Token验证用户权限
   - 限制可访问的资源范围

2. **频率限制**
   - 实施下载频率限制
   - 防止恶意批量下载

## 兼容性说明

### 支持平台

- **Windows**: 通过注册表注册协议处理器
- **macOS**: 通过Info.plist配置URL Scheme
- **Linux**: 通过desktop文件注册协议

### 浏览器兼容性

- **Chrome**: 完全支持
- **Firefox**: 完全支持
- **Safari**: 完全支持
- **Edge**: 完全支持

## 版本历史

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| 1.0.0 | 2024-01-15 | 初始版本，支持基础导入功能 |
| 1.1.0 | 2024-01-20 | 添加Token可选支持，优化错误处理 |
| 1.2.0 | 2024-01-25 | 新增克隆仓库功能，支持完整的仓库克隆到本地 |

## 相关文档

- [GitHave App 开发文档](./githave-app-dev.md)
- [Web端集成指南](./web-integration.md)
- [API接口文档](./api-reference.md)