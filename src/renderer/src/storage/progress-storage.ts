// progress-storage.ts
export interface RepoProgress {
  functionsTotal: number;
  scannedCount: number;
  indexProgress: number;
}

// 本地存储的 key 前缀
const STORAGE_KEY = 'memoryFlashProgress';

// 构造仓库对应的 storage key
function getKey(id: number): string {
  return `${STORAGE_KEY}:${id}`;
}

/** 创建／更新（save） */
export function saveRepoProgress(id: number, p: RepoProgress): void {
  try {
    localStorage.setItem(getKey(id), JSON.stringify(p));
  } catch (e) {
    console.error('保存AI索引进度到 localStorage 失败', e);
  }
}

/** 读取（read） */
export function loadRepoProgress(id: number): RepoProgress | null {
  const json = localStorage.getItem(getKey(id));
  if (!json) return null;
  try {
    return JSON.parse(json) as RepoProgress;
  } catch {
    console.warn('解析 localStorage 进度数据失败，已清除该条记录', id);
    localStorage.removeItem(getKey(id));
    return null;
  }
}

/** 删除单条记录（delete） */
export function removeRepoProgress(id: number): void {
  localStorage.removeItem(getKey(id));
}

/** 清空所有记录 */
export function clearAllRepoProgress(): void {
  Object.keys(localStorage)
    .filter(key => key.startsWith(STORAGE_KEY + ':'))
    .forEach(key => localStorage.removeItem(key));
}
