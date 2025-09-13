// progress-storage.ts
export interface RepoProgress {
  functionsTotal: number;
  scannedCount: number;
  indexProgress: number;
  totalFileCount: number | 0;
}

// 数据库名称和存储对象名称
const DB_NAME = 'GitHaveDB';
const STORE_NAME = 'memoryFlashProgress';
const DB_VERSION = 1;

// 缓存机制，用于同步访问
const cache = new Map<number, RepoProgress>();

// 初始化数据库
let dbPromise: Promise<IDBDatabase> | null = null;
let dbInitialized = false;

/**
 * 初始化 IndexedDB 数据库连接
 */
function initDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = (event) => {
          console.error('IndexedDB 打开失败', event);
          reject(new Error('无法打开 IndexedDB 数据库'));
        };
        
        request.onsuccess = () => {
          dbInitialized = true;
          resolve(request.result);
          
          // 初始化后加载所有数据到缓存
          loadAllToCache();
        };
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          // 如果存储对象不存在，则创建
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
      } catch (e) {
        console.error('初始化 IndexedDB 失败', e);
        reject(e);
      }
    });
  }
  return dbPromise;
}

/**
 * 加载所有数据到缓存
 */
async function loadAllToCache(): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
      if (request.result) {
        request.result.forEach((item: any) => {
          const { id, ...progress } = item;
          cache.set(id, progress as RepoProgress);
        });
      }
    };
    
    request.onerror = (event) => {
      console.error('加载缓存数据失败', event);
    };
  } catch (e) {
    console.error('加载缓存数据失败', e);
  }
}

// 初始化数据库
initDB().catch(e => console.error('初始化数据库失败', e));

/**
 * 获取事务和存储对象
 * @param mode 事务模式：readonly 或 readwrite
 */
async function getStore(mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
  const db = await initDB();
  const transaction = db.transaction(STORE_NAME, mode);
  return transaction.objectStore(STORE_NAME);
}

// 构造仓库对应的 storage key (保留此函数以保持接口一致)
function getKey(id: number): string {
  return `${STORE_NAME}:${id}`;
}

/** 创建／更新（save） */
export function saveRepoProgress(id: number, p: RepoProgress): void {
  // 先更新缓存
  cache.set(id, { ...p });
  
  // 然后异步写入 IndexedDB
  initDB().then(async () => {
    try {
      const store = await getStore('readwrite');
      const request = store.put({ id, ...p });
      
      request.onerror = (event) => {
        console.error('保存AI索引进度到 IndexedDB 失败', event);
      };
    } catch (e) {
      console.error('保存AI索引进度到 IndexedDB 失败', e);
    }
  });
}

/** 读取（read） */
export function loadRepoProgress(id: number): RepoProgress | null {
  // 从缓存中读取
  if (cache.has(id)) {
    return cache.get(id) || null;
  }
  
  // 如果数据库已初始化但缓存中没有，说明数据不存在
  if (dbInitialized) {
    return null;
  }
  
  // 如果数据库未初始化，尝试从 localStorage 读取兼容旧数据
  try {
    const key = getKey(id);
    const json = localStorage.getItem(key);
    if (json) {
      const data = JSON.parse(json) as RepoProgress;
      // 将旧数据写入缓存和 IndexedDB
      cache.set(id, data);
      saveRepoProgress(id, data);
      // 删除旧数据
      localStorage.removeItem(key);
      return data;
    }
  } catch (e) {
    console.warn('从 localStorage 读取兼容数据失败', e);
  }
  
  // 异步加载数据
  initDB().then(async () => {
    try {
      const store = await getStore('readonly');
      const request = store.get(id);
      
      request.onsuccess = () => {
        if (request.result) {
          const { id: itemId, ...progress } = request.result;
          // 更新缓存
          cache.set(id, progress as RepoProgress);
        }
      };
    } catch (e) {
      console.error('从 IndexedDB 读取进度失败', e);
    }
  });
  
  return null;
}

/** 删除单条记录（delete） */
export function removeRepoProgress(id: number): void {
  // 先从缓存中删除
  cache.delete(id);
  
  // 然后异步从 IndexedDB 删除
  initDB().then(async () => {
    try {
      const store = await getStore('readwrite');
      store.delete(id);
    } catch (e) {
      console.error('从 IndexedDB 删除进度记录失败', e);
    }
  });
  
  // 兼容删除旧数据
  try {
    localStorage.removeItem(getKey(id));
  } catch (e) {
    // 忽略错误
  }
}

/** 清空所有记录 */
export function clearAllRepoProgress(): void {
  // 清空缓存
  cache.clear();
  
  // 异步清空 IndexedDB
  initDB().then(async () => {
    try {
      const store = await getStore('readwrite');
      store.clear();
    } catch (e) {
      console.error('清空 IndexedDB 进度记录失败', e);
    }
  });
  
  // 兼容清空旧数据
  try {
    Object.keys(localStorage)
      .filter(key => key.startsWith(STORE_NAME + ':'))
      .forEach(key => localStorage.removeItem(key));
  } catch (e) {
    // 忽略错误
  }
}
