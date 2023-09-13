import { IMAGE_EXTENSION_LIST } from '@/utils/constants';

export const getId = () => {
    return new Date().getTime() + (Math.random() * 1000).toFixed();
};

export const isValidJSON = (aString: string) => {
    try {
        JSON.parse(aString);
        return true;
    } catch (error) {
        return false;
    }
};

export const isImage = (aFileName: string) => {
    const sImageExtensions = IMAGE_EXTENSION_LIST;

    const sDotIndex = aFileName.lastIndexOf('.');
    if (sDotIndex === -1) return false;

    const sFileExtension = aFileName.slice(sDotIndex + 1).toLowerCase();
    if (sImageExtensions.includes(sFileExtension)) {
        return true;
    }

    return false;
};

export const binaryCodeEncodeBase64 = (aBinaryCode: ArrayBufferLike) => {
    return btoa(new Uint8Array(aBinaryCode).reduce((data, byte) => data + String.fromCharCode(byte), ''));
};

export const extractionExtension = (aFileName: string) => {
    const sDotIndex = aFileName.lastIndexOf('.');
    if (sDotIndex === -1) return '';

    return aFileName.slice(sDotIndex + 1).toLowerCase();
};

export const calcViewportHeight = (aPixel: number) => {
    return Number(((aPixel / document.documentElement.clientHeight) * 100).toFixed(2));
};
