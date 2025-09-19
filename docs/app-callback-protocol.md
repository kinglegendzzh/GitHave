# GitHave App 拉起回调协议说明

## 概述

GitHave App 拉起回调协议允许第三方应用通过 Web 授权页面获取用户登录凭证，并通过自定义协议头 `githave://` 回调到第三方应用。

## 协议流程

### 1. 发起授权请求

第三方应用通过浏览器或 WebView 打开授权页面：

```
https://your-domain.com/app/auth?callback={callback_identifier}
```

**参数说明：**
- `callback`: 回调标识符（可选），用于标识第三方应用
- `redirect_uri`: 备用回调参数名
- `return_to`: 备用回调参数名

### 2. 用户授权登录

- 如果用户已登录：直接进入步骤3
- 如果用户未登录：显示登录界面，支持以下登录方式：
  - 用户名密码登录
  - 邮箱验证码登录
  - GitHub OAuth 登录
  - Google OAuth 登录

### 3. 授权成功回调

登录成功后，系统会通过 `githave://` 协议回调第三方应用：

```
githave://auth-success?route=auth&repo=success&token={token}&user_id={user_id}&username={username}&email={email}&timestamp={timestamp}
```

**回调参数：**
- `route`: 固定值 "auth"
- `repo`: 固定值 "success"
- `token`: 用户登录令牌
- `user_id`: 用户ID
- `username`: 用户名
- `email`: 用户邮箱
- `timestamp`: 时间戳

## 第三方应用集成

### 1. 注册协议头

第三方应用需要在系统中注册 `githave://` 协议头，以便接收回调。

**macOS 示例（Info.plist）：**
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>GitHave Auth</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>githave</string>
        </array>
    </dict>
</array>
```

**Windows 示例（注册表）：**
```
HKEY_CLASSES_ROOT\githave
    (Default) = "URL:GitHave Protocol"
    URL Protocol = ""
    shell\open\command
        (Default) = "C:\\path\\to\\your\\app.exe" "%1"
```

### 2. 处理回调

第三方应用需要实现回调处理逻辑：

```javascript
// 解析回调URL
function handleGitHaveCallback(url) {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
    if (urlObj.host === 'auth-success') {
        const token = params.get('token');
        const userId = params.get('user_id');
        const username = params.get('username');
        const email = params.get('email');
        
        // 保存用户信息和令牌
        saveUserCredentials({ token, userId, username, email });
        
        // 通知应用授权成功
        onAuthSuccess({ token, userId, username, email });
    }
}
```

## 安全考虑

### 1. 令牌安全
- 令牌具有时效性，建议定期刷新
- 令牌应安全存储，避免明文保存
- 建议使用 HTTPS 进行所有网络通信

### 2. 协议安全
- 验证回调 URL 的合法性
- 检查时间戳防止重放攻击
- 验证用户信息的完整性

## 错误处理

### 常见错误情况

1. **用户取消授权**：用户关闭授权页面，不会触发回调
2. **网络错误**：显示错误页面，提供重试选项
3. **登录失败**：显示具体错误信息，允许重新登录

### 错误回调（可选）

```
githave://auth-error?error={error_code}&message={error_message}
```

## 示例代码

### 发起授权请求

```javascript
// 打开授权页面
function requestAuth(callbackId = 'myapp') {
    const authUrl = `https://your-domain.com/app/auth?callback=${callbackId}`;
    
    // 在默认浏览器中打开
    window.open(authUrl, '_blank');
    
    // 或在 WebView 中打开
    // webview.loadURL(authUrl);
}
```

### 处理授权结果

```javascript
// 监听协议回调
function setupProtocolHandler() {
    // Electron 示例
    app.setAsDefaultProtocolClient('githave');
    
    app.on('open-url', (event, url) => {
        event.preventDefault();
        handleGitHaveCallback(url);
    });
}

// 处理回调数据
function handleGitHaveCallback(url) {
    try {
        const urlObj = new URL(url);
        
        if (urlObj.host === 'auth-success') {
            const params = Object.fromEntries(urlObj.searchParams);
            console.log('授权成功:', params);
            
            // 保存用户信息
            localStorage.setItem('githave_token', params.token);
            localStorage.setItem('githave_user', JSON.stringify({
                id: params.user_id,
                username: params.username,
                email: params.email
            }));
            
            // 通知应用
            onAuthSuccess(params);
        }
    } catch (error) {
        console.error('处理回调失败:', error);
    }
}
```

## 测试

### 测试授权流程

1. 在浏览器中访问：`https://your-domain.com/app/auth?callback=test`
2. 完成登录流程
3. 检查是否正确触发 `githave://auth-success` 回调
4. 验证回调参数的完整性和正确性

### 调试技巧

- 在浏览器开发者工具中查看控制台日志
- 检查网络请求和响应
- 验证协议头注册是否正确
- 测试不同登录方式的兼容性

## 版本历史

- **v1.0**: 初始版本，支持基本的授权回调功能
- **v1.1**: 增加多种登录方式支持
- **v1.2**: 优化错误处理和安全性