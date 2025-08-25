/**
 * 파일명과 확장자를 올바르게 분리하는 유틸리티 함수들
 * lastIndexOf('.')를 사용하여 다중 점이 있는 파일명도 정확히 처리
 */

/**
 * 파일명에서 이름과 확장자를 분리
 * @param fullName 전체 파일명 (확장자 포함)
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
 * 파일 복사본의 이름을 생성
 * @param originalName 원본 파일명
 * @param copyCount 복사본 번호
 * @returns 복사본 파일명
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
 * 파일명에서 확장자만 추출
 * @param fullName 전체 파일명
 * @returns 확장자 (점 제외)
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
 * 파일명에서 이름 부분만 추출 (확장자 제외)
 * @param fullName 전체 파일명
 * @returns 파일명 (확장자 제외)
 * 
 * @example
 * getFileNameOnly('my.config.js') // → 'my.config'
 * getFileNameOnly('README')       // → 'README'
 */
export const getFileNameOnly = (fullName: string) => {
    const lastDotIndex = fullName.lastIndexOf('.');
    return lastDotIndex === -1 ? fullName : fullName.slice(0, lastDotIndex);
};