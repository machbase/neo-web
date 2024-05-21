import { useRecoilState, useSetRecoilState } from 'recoil';
import { GBoardListType, gBoardList, gSelectedTab } from '@/recoil/recoil';
import { extractionExtension, getId } from '@/utils';
import { getFiles } from '@/api/repository/fileTree';
import './OpenFileBtn.scss';

export const OpenFileBtn = ({
    pType,
    pFileInfo,
    btnTxt,
    btnWidth,
    btnHeight,
}: {
    pType: string;
    pFileInfo: any;
    btnTxt?: string;
    btnWidth?: string | number;
    btnHeight?: string | number;
}) => {
    const [sBoardList, setBoardList] = useRecoilState<GBoardListType[]>(gBoardList);
    const setSelectedTab = useSetRecoilState<string>(gSelectedTab);

    const getExistBoard = (aTargetFile: any): GBoardListType => {
        return sBoardList.filter((aBoard: GBoardListType) => aBoard.name === aTargetFile.name && aBoard.path === aTargetFile.path)[0];
    };
    const handleOpen = async () => {
        if (!pFileInfo.path) return;
        const sSplitPath = pFileInfo.path.split('/').filter((aPath: string) => aPath !== '');
        const sFileName = sSplitPath.at(-1).includes(`.${pType}`) ? sSplitPath.at(-1) : '';
        const sFilePath = ('/' + sSplitPath.slice(0, sSplitPath.length - 1).join('/') + '/').replaceAll('//', '/');
        const sTmpId = getId();
        const sExistBoard = getExistBoard({ name: sFileName, path: sFilePath });

        if (sExistBoard) {
            setSelectedTab(sExistBoard.id as string);
        } else {
            const sFileExtension = extractionExtension(sFileName);
            if (sFileExtension === 'tql') {
                const sContentResult: any = await getFiles(`${sFilePath}/${sFileName}`);
                const sTmpBoard: any = { id: sTmpId, name: sFileName, type: sFileExtension, path: sFilePath, savedCode: sContentResult, code: '' };

                sTmpBoard.code = sContentResult;

                setBoardList([...sBoardList, sTmpBoard]);
                setSelectedTab(sTmpId);
            }
        }
    };

    return (
        <div
            className="open-input"
            style={{
                width: Number(btnWidth) ? btnWidth + 'px' : String(btnWidth) ? btnWidth : '200px',
                height: Number(btnHeight) ? btnHeight + 'px' : String(btnHeight) ? btnHeight : '100px',
            }}
        >
            <button className="open-input-button" onClick={handleOpen}>
                {btnTxt ?? 'Open file'}
            </button>
        </div>
    );
};
