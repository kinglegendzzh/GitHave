/**
 * 文件历史管理 - IndexedDB 实现
 * 模仿 VSCode 时间线功能，支持文件历史版本的增删改查
 */

class FileHistoryDB {
  constructor() {
    this.dbName = 'FileHistoryDB'
    this.version = 1
    this.storeName = 'fileHistory'
    this.db = null
  }

  /**
   * 初始化数据库
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        
        // 删除旧的对象存储（如果存在）
        if (db.objectStoreNames.contains(this.storeName)) {
          db.deleteObjectStore(this.storeName)
        }

        // 创建新的对象存储
        const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true })
        
        // 创建索引
        store.createIndex('filePath', 'filePath', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('filePathTimestamp', ['filePath', 'timestamp'], { unique: false })
      }
    })
  }

  /**
   * 确保数据库已初始化
   */
  async ensureDB() {
    if (!this.db) {
      await this.init()
    }
    return this.db
  }

  /**
   * 保存文件历史版本
   * @param {string} filePath 文件路径
   * @param {string} content 文件内容
   * @param {string} description 版本描述
   * @param {Object} metadata 额外元数据
   */
  async saveHistory(filePath, content, description = '', metadata = {}) {
    await this.ensureDB()
    
    const historyItem = {
      filePath,
      content,
      description: description || `编辑于 ${new Date().toLocaleString()}`,
      timestamp: Date.now(),
      size: content.length,
      hash: await this.generateContentHash(content),
      metadata: {
        language: metadata.language || 'plaintext',
        encoding: metadata.encoding || 'utf-8',
        ...metadata
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      const request = store.add(historyItem)
      
      request.onsuccess = () => {
        historyItem.id = request.result
        resolve(historyItem)
      }
      
      request.onerror = () => {
        reject(new Error('Failed to save history'))
      }
    })
  }

  /**
   * 获取文件的所有历史版本
   * @param {string} filePath 文件路径
   * @param {number} limit 限制数量
   */
  async getFileHistory(filePath, limit = 50) {
    await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('filePath')
      
      const request = index.getAll(filePath)
      
      request.onsuccess = () => {
        const results = request.result
          .sort((a, b) => b.timestamp - a.timestamp) // 按时间倒序
          .slice(0, limit)
        resolve(results)
      }
      
      request.onerror = () => {
        reject(new Error('Failed to get file history'))
      }
    })
  }

  /**
   * 获取指定历史版本
   * @param {number} id 历史版本ID
   */
  async getHistoryById(id) {
    await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      
      const request = store.get(id)
      
      request.onsuccess = () => {
        resolve(request.result)
      }
      
      request.onerror = () => {
        reject(new Error('Failed to get history by ID'))
      }
    })
  }

  /**
   * 删除指定历史版本
   * @param {number} id 历史版本ID
   */
  async deleteHistory(id) {
    await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      const request = store.delete(id)
      
      request.onsuccess = () => {
        resolve(true)
      }
      
      request.onerror = () => {
        reject(new Error('Failed to delete history'))
      }
    })
  }

  /**
   * 清理文件的过期历史版本（保留最近N个版本）
   * @param {string} filePath 文件路径
   * @param {number} keepCount 保留数量
   */
  async cleanupHistory(filePath, keepCount = 20) {
    await this.ensureDB()
    
    const allHistory = await this.getFileHistory(filePath, 1000) // 获取所有历史
    
    if (allHistory.length <= keepCount) {
      return // 不需要清理
    }

    // 保留最近的版本，删除其余的
    const toDelete = allHistory.slice(keepCount)
    
    const promises = toDelete.map(item => this.deleteHistory(item.id))
    await Promise.all(promises)
    
    return toDelete.length
  }

  /**
   * 更新历史版本描述
   * @param {number} id 历史版本ID
   * @param {string} description 新描述
   */
  async updateHistoryDescription(id, description) {
    await this.ensureDB()
    
    const historyItem = await this.getHistoryById(id)
    if (!historyItem) {
      throw new Error('History item not found')
    }

    historyItem.description = description

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      const request = store.put(historyItem)
      
      request.onsuccess = () => {
        resolve(historyItem)
      }
      
      request.onerror = () => {
        reject(new Error('Failed to update history description'))
      }
    })
  }

  /**
   * 搜索历史版本
   * @param {string} filePath 文件路径（可选）
   * @param {string} searchText 搜索文本
   * @param {number} limit 限制数量
   */
  async searchHistory(filePath = null, searchText = '', limit = 50) {
    await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      
      let request
      if (filePath) {
        const index = store.index('filePath')
        request = index.getAll(filePath)
      } else {
        request = store.getAll()
      }
      
      request.onsuccess = () => {
        let results = request.result
        
        // 文本搜索过滤
        if (searchText) {
          const searchLower = searchText.toLowerCase()
          results = results.filter(item => 
            item.description.toLowerCase().includes(searchLower) ||
            item.content.toLowerCase().includes(searchLower)
          )
        }
        
        // 排序并限制数量
        results = results
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit)
        
        resolve(results)
      }
      
      request.onerror = () => {
        reject(new Error('Failed to search history'))
      }
    })
  }

  /**
   * 获取文件历史统计信息
   * @param {string} filePath 文件路径
   */
  async getHistoryStats(filePath) {
    await this.ensureDB()
    
    const history = await this.getFileHistory(filePath, 1000)
    
    if (history.length === 0) {
      return {
        totalVersions: 0,
        oldestVersion: null,
        newestVersion: null,
        totalSize: 0,
        averageSize: 0
      }
    }

    const totalSize = history.reduce((sum, item) => sum + item.size, 0)
    
    return {
      totalVersions: history.length,
      oldestVersion: history[history.length - 1],
      newestVersion: history[0],
      totalSize,
      averageSize: Math.round(totalSize / history.length)
    }
  }

  /**
   * 生成内容哈希（用于去重）
   * @param {string} content 文件内容
   */
  async generateContentHash(content) {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * 检查重复内容（基于哈希）
   * @param {string} filePath 文件路径
   * @param {string} content 文件内容
   */
  async isDuplicateContent(filePath, content) {
    const hash = await this.generateContentHash(content)
    const history = await this.getFileHistory(filePath, 10) // 检查最近10个版本
    
    return history.some(item => item.hash === hash)
  }

  /**
   * 导出文件历史数据
   * @param {string} filePath 文件路径（可选）
   */
  async exportHistory(filePath = null) {
    await this.ensureDB()
    
    let history
    if (filePath) {
      history = await this.getFileHistory(filePath, 1000)
    } else {
      history = await this.searchHistory(null, '', 1000)
    }
    
    return {
      exportDate: new Date().toISOString(),
      totalItems: history.length,
      data: history
    }
  }

  /**
   * 关闭数据库连接
   */
  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

// 创建单例实例
const fileHistoryDB = new FileHistoryDB()

export default fileHistoryDB