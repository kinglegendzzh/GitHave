import path from 'path-browserify'

/**
 * Checks if a given path is a file path (not a directory)
 * @param {string} filePath - Path to check
 * @param {Function} checkIfTextFile - Function to check if file is text file
 * @param {Array} allowedFileName - List of allowed filenames
 * @param {Function} findNodeByPath - Optional function to find node in tree structure
 * @param {Object} treeData - Optional tree data reference
 * @returns {Promise<boolean>} - True if path is a file, false otherwise
 */
export async function isFilePath(filePath, checkIfTextFile = null, allowedFileName = [], findNodeByPath = null, treeData = null) {
  // If tree data and find function are provided, try to find node in tree first
  if (findNodeByPath && treeData) {
    const node = findNodeByPath(treeData, filePath)
    if (node) {
      if (node.isDirectory) return false
      const fileName = path.basename(node.name)
      if (checkIfTextFile) {
        const isTextFile = await checkIfTextFile(node.path || filePath)
        return isTextFile || (fileName && allowedFileName.includes(fileName))
      }
      return fileName && allowedFileName.includes(fileName)
    }
  }
  
  // Fallback to path-based check
  const fileName = path.basename(filePath)
  
  if (checkIfTextFile) {
    try {
      const isTextFile = await checkIfTextFile(filePath)
      return isTextFile || (fileName && allowedFileName.includes(fileName))
    } catch (error) {
      console.error('检查文件类型失败:', error)
      return fileName && allowedFileName.includes(fileName)
    }
  }
  
  // If no check function provided, just check if it has an extension
  const ext = path.extname(filePath).toLowerCase()
  return ext !== ''
}

/**
 * Gets the file extension from a path
 * @param {string} filePath - Path to get extension from
 * @returns {string} - File extension with dot (e.g., '.js')
 */
export function getFileExtension(filePath) {
  return path.extname(filePath).toLowerCase()
}

/**
 * Gets the filename from a path
 * @param {string} filePath - Path to get filename from
 * @returns {string} - Filename without extension
 */
export function getFileName(filePath) {
  const basename = path.basename(filePath)
  const extname = path.extname(basename)
  return extname ? basename.slice(0, -extname.length) : basename
}
