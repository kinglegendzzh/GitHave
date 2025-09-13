/**
 * @description 检查并启动单个服务
 * @param {object} service - 服务配置对象
 * @param {function} service.healthCheck - 健康检查API调用
 * @param {function} service.getConfig - 获取配置API调用
 * @param {function} service.start - 启动服务API调用
 * @param {string} service.name - 服务名称，用于日志记录
 * @param {string[]} service.runningStates - 表示服务正在运行的状态数组
 */
async function checkAndStartService({ healthCheck, getConfig, start, name, runningStates }) {
  try {
    const health = await healthCheck()
    console.log(`[${name}] health status:`, health)

    if (!runningStates.includes(health.state)) {
      console.log(`[${name}] is not running, attempting to start...`)
      const config = await getConfig()
      console.log(`[${name}] config:`, config)
      const configPath = config.configPath

      if (configPath) {
        const result = await start(configPath)
        console.log(`[${name}] start result:`, result)
      } else {
        console.error(`[${name}] config path not found, cannot start service.`)
      }
    } else {
      console.log(`[${name}] is already running.`)
    }
  } catch (error) {
    console.error(`[${name}] failed to initialize:`, error)
  }
}

/**
 * @description 初始化应用，检查并启动所有核心服务
 */
export async function initializeApp() {
  console.log('[AppInitializer] Starting application initialization...')

  const services = [
    {
      healthCheck: window.electron.checkAppHealth,
      getConfig: window.electron.sysConfig,
      start: window.electron.startApp,
      name: 'CoreService',
      runningStates: ['已启动', '正在清理端口并重启核心服务']
    },
    {
      healthCheck: window.electron.checkFmHttpHealth,
      getConfig: window.electron.fmConfig,
      start: window.electron.startFmHttp,
      name: 'FmHttpService',
      runningStates: ['已启动', '正在清理端口并重启索引']
    }
  ]

  // 并行启动所有服务以提高效率
  await Promise.all(services.map(checkAndStartService))

  console.log('[AppInitializer] Application initialization finished.')
}
