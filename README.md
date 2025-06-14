# 终极操作指南

## 一键打包
```bash
# mac 全部 系统
rm -rf node_modules package-lock.json
npm cache clean --force
arch -arm64 zsh
npm install
npm run build:mac

# mac universal 系统
rm -rf node_modules package-lock.json
npm cache clean --force
arch -arm64 zsh
npm install
npm run build:mac:u

# mac m1 系统
rm -rf node_modules package-lock.json
npm cache clean --force
arch -arm64 zsh
npm install
npm run build:mac:arm64

# mac x64 系统
rm -rf node_modules package-lock.json
npm cache clean --force
arch -x86_64 zsh
arch -x86_64 npm install
arch -x86_64 npm run build:mac:x64

# Windows 系统
rm -rf node_modules package-lock.json
npm cache clean --force
arch -arm64 zsh
npm install
npm run build:win
```
## 常用打包指令
```bash
// 1️⃣ 仅 arm64 包
arch -arm64 zsh
npm install
npm run build:mac:arm64

2️⃣ 仅 x64 包
arch -x86_64 zsh
arch -x86_64 npm install
arch -x86_64 npm run build:mac:x64

3️⃣ Universal 包
npm install
npm run build:mac:universal

// npm瘦身
npm run prune
```

# 版本信息

```bash                                                 
❯ python -V
Python 3.12.4
❯ python3 -V
Python 3.12.4
❯ node -v
v18.20.8
❯ npm -v
10.8.2
❯ pnpm -v
10.9.0
❯ nvm -v
0.39.3
  
如果是mac m1系统，克隆https://github.com/microsoft/node-pty并构建，然后通过npm file形式外部导入的方式引入本项目。

（node-pty虚拟终端仅支持mac）
```

# 清理缓存

```bash
rm -rf node_modules package-lock.json
npm cache clean --force
```

---



```shell
sudo chmod -R 755 /Users/apple/Public/openProject/githave/dist/mac/GitHave.app/Contents/Resources/app.asar.unpacked/bin/static/
```

```shell
sudo npm run build:mac
```

```shell
sudo npm run build:win
```

```shell
npm run dev
```


## 搭建开发环境

### 构建x86 mac软件

```bash
arch -x86_64 zsh
```

```bash
arch -x86_64 /usr/local/bin/brew install nvm
```



### 构建arm64 mac软件

```bash
arch -arm64 zsh
```

# 其他

## x86版本的homebrew

arch -x86_64 /usr/local/bin/brew --version

## 关于切换开发环境（MacOS）架构的注意事项

- **最直接**：在命令前加 `arch -x86_64` 或 `arch -arm64`，比如

  ```bash
  arch -x86_64 node index.js
  arch -arm64 node index.js
  ```

  这样“瞬间”切架构而不用改 PATH。
- **如果想让 node 本身一直指向某个架构**，可以在 `~/.zshrc` 里加两个 alias（或函数）：

  ```bash
  alias node-x64="arch -x86_64 /usr/local/bin/node"
  alias node-arm="arch -arm64 /opt/homebrew/bin/node"
  ```

  之后用 `node-x64` / `node-arm` 直接切。或者用上面的 `use_node_arch` 函数把 `node` 这个名字动态映射到 x64 或 arm64 二进制。
- **如果想“一次切换整个 shell 到 x64”**，可以运行

  ```bash
  arch -x86_64 /bin/zsh
  ```

  新打开的 shell 就会在 Intel 模式下，所有 `node` 默认就是 x64 版；要退回来就关闭窗口、在正常（arm64）终端里再打开。

任选一种方式，都能达到“按一个命令就从 x64 切到 arm64、或从 arm64 切到 x64”的效果。根据个人习惯，把它写进 `.zshrc` 的 alias 或函数里就更方便：一行命令，切到你要的 Node 架构。
