import { postFileList } from '@/api/repository/api';
import type { PersistedTazBoardInfoV205 } from '../TazPersistenceTypesV205';

type TazFileSaveResult = {
    success: boolean;
};

type SaveTazFileParams = {
    payload: PersistedTazBoardInfoV205;
    directoryPath: string;
    fileName: string;
};

export async function saveTazFile({
    payload,
    directoryPath,
    fileName,
}: SaveTazFileParams): Promise<TazFileSaveResult> {
    const sResult = await postFileList(
        payload,
        directoryPath,
        fileName,
    );

    if (!didFileSaveSucceed(sResult)) {
        return { success: false };
    }

    return {
        success: true,
    };
}

function didFileSaveSucceed(response: unknown): boolean {
    if (!response || typeof response !== 'object') {
        return false;
    }

    const sResponse = response as {
        success?: boolean;
        data?: {
            success?: boolean;
        };
    };

    return sResponse.success === true || sResponse.data?.success === true;
}
