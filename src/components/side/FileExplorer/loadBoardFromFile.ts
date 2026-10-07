import axios from 'axios';
import { getFiles } from '@/api/repository/fileTree';
import { getId, isImage, binaryCodeEncodeBase64, extractionExtension } from '@/utils';
import { CheckDataCompatibility } from '@/utils/CheckDataCompatibility';
import { loadTazBoard } from '@/components/tagAnalyzer/persistence/tazDocumentService';

const hasOwn = (aValue: unknown, aKey: string) => typeof aValue === 'object' && aValue !== null && Object.prototype.hasOwnProperty.call(aValue, aKey);

// `transport` marks a request that never got a server answer. The request layer has already
// reported it, so the explorer stays quiet on it as it always has.
export type LoadBoardResult = { board: any; error?: undefined } | { board?: undefined; error: string; transport?: boolean };

/**
 * Read a saved file and turn it into a tab (board) the way the file explorer opens it.
 *
 * Shared by the explorer and the New tab's recent list so both open every extension identically.
 * `aFile.path` is the directory with its trailing slash; `aFile.id` is what the extension is read from
 * (the explorer passes its tree id, which ends in the file name).
 */
export const loadBoardFromFile = async (aFile: { name: string; path: string; id?: string }, aBoardId: string = getId()): Promise<LoadBoardResult> => {
    const sId = aFile.id ?? aFile.name;
    const sContentResult: any = await getFiles(`${aFile.path}${aFile.name}`);
    const sFileExtension = extractionExtension(sId);
    if (axios.isAxiosError(sContentResult)) return { error: sContentResult.message || 'Failed to open the file.', transport: true };
    if (hasOwn(sContentResult, 'headers') || hasOwn(sContentResult, 'reason') || hasOwn(sContentResult?.data, 'reason')) {
        let sParseData = sContentResult?.data;
        if (typeof sParseData === 'string') {
            try {
                sParseData = JSON.parse(sParseData);
            } catch {
                // Invalid JSON response from server
            }
        }
        return { error: sContentResult?.reason ?? sParseData?.reason ?? 'Unknown error' };
    }

    let sTmpBoard: any = { id: aBoardId, name: aFile.name, type: sFileExtension, path: aFile.path, savedCode: sContentResult, code: '' };
    if (sFileExtension === 'wrk') {
        const sTmpData: any = CheckDataCompatibility(sContentResult, sFileExtension);
        if (sTmpData.data) {
            sTmpBoard.sheet = sTmpData.data;
            sTmpBoard.savedCode = JSON.stringify(sTmpData.data);
        } else if (sTmpData.sheet) {
            sTmpBoard.sheet = sTmpData.sheet;
            sTmpBoard.savedCode = JSON.stringify(sTmpData.sheet);
        } else {
            sTmpBoard.sheet = sTmpData;
            sTmpBoard.savedCode = JSON.stringify(sTmpData);
        }
    } else if (sFileExtension === 'dsh') {
        const sTmpData: any = CheckDataCompatibility(sContentResult, sFileExtension);
        sTmpBoard = {
            ...sTmpData,
            id: sTmpBoard.id,
            name: sTmpBoard.name,
            type: sFileExtension,
            path: sTmpBoard.path,
            savedCode: JSON.stringify(JSON.parse(sContentResult).dashboard),
        };
    } else if (sFileExtension === 'taz') {
        try {
            const sParsedTaz = typeof sContentResult === 'string' ? JSON.parse(sContentResult) : sContentResult;
            sTmpBoard = loadTazBoard(sParsedTaz, aBoardId, aFile.name, aFile.path);
        } catch (error) {
            return { error: error instanceof Error ? error.message : 'Failed to load TAZ file.' };
        }
    } else if (isImage(sId)) {
        const base64 = binaryCodeEncodeBase64(sContentResult);
        sTmpBoard = {
            ...sTmpBoard,
            code: base64,
            savedCode: base64,
            type: extractionExtension(sId),
        };
    } else sTmpBoard.code = sContentResult;

    return { board: sTmpBoard };
};
