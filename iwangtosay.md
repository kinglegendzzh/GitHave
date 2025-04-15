# gitgo

GitGo智能代码助理

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

```shell
npm cache clean --force
rm -rf node_modules package-lock.json
```

构建开发环境顺序
当前node版本：18.12.0
删除`.npmrc`中的`electron_mirror=https://npmmirror.com/mirrors/electron/`
`npm install electron --save-dev`
`npm install`


```shell
❯ nvm use v20.17.0
Now using node v20.17.0 (npm v11.3.0)
```

```shell
nvm use v20.17.0
```
