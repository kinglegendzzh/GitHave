import path from 'path-browserify'

/**
 * Checks if a given path is a file path (not a directory)
 * @param {string} filePath - Path to check
 * @param {Array} allowedExtensions - List of allowed file extensions
 * @param {Array} allowedFileName - List of allowed filenames
 * @param {Function} findNodeByPath - Optional function to find node in tree structure
 * @param {Object} treeData - Optional tree data reference
 * @returns {boolean} - True if path is a file, false otherwise
 */
export function isFilePath(filePath, allowedExtensions = [], allowedFileName = [], findNodeByPath = null, treeData = null) {
  // If tree data and find function are provided, try to find node in tree first
  if (findNodeByPath && treeData) {
    const node = findNodeByPath(treeData, filePath)
    if (node) {
      if (node.isDirectory) return false
      const ext = path.extname(node.name).toLowerCase()
      const fileName = path.basename(node.name)
      return (
        (ext && allowedExtensions.includes(ext)) || (fileName && allowedFileName.includes(fileName))
      )
    }
  }
  
  // Fallback to path-based check
  const ext = path.extname(filePath).toLowerCase()
  const fileName = path.basename(filePath)
  
  // If no extensions or filenames provided, just check if it has an extension
  if (allowedExtensions.length === 0 && allowedFileName.length === 0) {
    return ext !== ''
  }
  
  return (
    (ext && allowedExtensions.includes(ext)) || (fileName && allowedFileName.includes(fileName))
  )
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
