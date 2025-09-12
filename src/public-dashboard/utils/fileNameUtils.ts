/**
 * Utility functions to properly separate filenames and extensions
 * Uses lastIndexOf('.') to accurately handle filenames with multiple dots
 */

/**
 * Separates filename and extension from filename
 * @param fullName Full filename (including extension)
 * @returns {fileName: string, extension: string}
 * 
 * @example
 * getFileNameAndExtension('my.config.js') 
 * // → { fileName: 'my.config', extension: 'js' }
 * 
 * getFileNameAndExtension('README')
 * // → { fileName: 'README', extension: '' }
 */
export const getFileNameAndExtension = (fullName: string) => {
    const lastDotIndex = fullName.lastIndexOf('.');
    if (lastDotIndex === -1) {
        return { fileName: fullName, extension: '' };
    }
    return {
        fileName: fullName.slice(0, lastDotIndex),
        extension: fullName.slice(lastDotIndex + 1)
    };
};

/**
 * Generate copy filename
 * @param originalName Original filename
 * @param copyCount Copy number
 * @returns Copy filename
 * 
 * @example
 * generateCopyName('my.config.js', 1)
 * // → 'my.config (1).js'
 * 
 * generateCopyName('README', 2)  
 * // → 'README (2)'
 */
export const generateCopyName = (originalName: string, copyCount: number) => {
    const { fileName, extension } = getFileNameAndExtension(originalName);
    return extension 
        ? `${fileName} (${copyCount}).${extension}`
        : `${fileName} (${copyCount})`;
};

/**
 * Extract only extension from filename
 * @param fullName Full filename
 * @returns Extension (without dot)
 * 
 * @example
 * getExtensionOnly('my.config.js') // → 'js'
 * getExtensionOnly('README')       // → ''
 */
export const getExtensionOnly = (fullName: string) => {
    const lastDotIndex = fullName.lastIndexOf('.');
    return lastDotIndex === -1 ? '' : fullName.slice(lastDotIndex + 1);
};

/**
 * Extract only filename part (excluding extension)
 * @param fullName Full filename
 * @returns Filename (excluding extension)
 * 
 * @example
 * getFileNameOnly('my.config.js') // → 'my.config'
 * getFileNameOnly('README')       // → 'README'
 */
export const getFileNameOnly = (fullName: string) => {
    const lastDotIndex = fullName.lastIndexOf('.');
    return lastDotIndex === -1 ? fullName : fullName.slice(0, lastDotIndex);
};