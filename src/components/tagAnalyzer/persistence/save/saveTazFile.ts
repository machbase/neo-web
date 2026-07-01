import { postFileList } from '@/api/repository/api';
import type { PersistedTazBoardInfoV210 } from '../TazPersistenceTypesV210';
import { isPlainObject } from '../../domain/ObjectGuards';

type TazFileSaveResult = {
    success: boolean;
};

type SaveTazFileParams = {
    payload: PersistedTazBoardInfoV210;
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
    if (!isPlainObject(response)) {
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
