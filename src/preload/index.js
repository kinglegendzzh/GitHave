console.log('loading preload/main.js')

const { ipcRenderer, shell } = require('electron')
const { exec } = require('child_process')
const os = require('os')

window.electron = {
  ipcRenderer: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
  },
  homeDir: os.homedir(),
  shell: shell,
  openPathWithApp: (targetPath, appPath) => ipcRenderer.invoke('open-path-with-app', targetPath, appPath),
  // 根据应用名称查找其在当前系统下的可执行文件路径
  getAppPath: (appName) => {
    return new Promise((resolve, reject) => {
      const command = process.platform === 'win32' ? `where ${appName}` : `which ${appName}`;
      exec(command, (error, stdout, stderr) => {
        if (error || !stdout.trim()) {
          reject(new Error(`无法查找到 ${appName} 的路径`));
        } else {
          resolve(stdout.trim());
        }
      });
    });
  },
}
console.log('loaded preload/main.js!')
