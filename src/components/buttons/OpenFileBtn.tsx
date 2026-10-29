import { useRecoilState, useSetRecoilState } from 'recoil';
import { GBoardListType, gBoardList, gSelectedTab } from '@/recoil/recoil';
import { extractionExtension, getId } from '@/utils';
import { loadBoardFromFile } from '@/components/side/FileExplorer/loadBoardFromFile';
import './OpenFileBtn.scss';
import { Button } from '@/design-system/components';

export const OpenFileBtn = ({
    pType,
    pFileInfo,
    btnTxt,
    btnWidth,
    btnHeight,
    pErrorCallback,
}: {
    pType: string;
    pFileInfo: any;
    btnTxt?: string;
    btnWidth?: string | number;
    btnHeight?: string | number;
    pErrorCallback?: (aError: string | undefined) => void;
}) => {
    const [sBoardList, setBoardList] = useRecoilState<GBoardListType[]>(gBoardList);
    const setSelectedTab = useSetRecoilState<string>(gSelectedTab);

    const getExistBoard = (aTargetFile: any): GBoardListType => {
        return sBoardList.filter((aBoard: GBoardListType) => aBoard.name === aTargetFile.name && aBoard.path === aTargetFile.path)[0];
    };
    const handleOpen = async () => {
        if (!pFileInfo.path) return;
        pErrorCallback && pErrorCallback(undefined);
        const sSplitPath = pFileInfo.path.split('/').filter((aPath: string) => aPath !== '');
        // extension compared case-insensitively on the last segment (r20 M4): `X.TQL` opens like `x.tql`, `a.tqlx` does not
        const sLast: string = sSplitPath.at(-1) ?? '';
        const sFileName = extractionExtension(sLast) === pType.replace(/^\./, '').toLowerCase() ? sLast : '';
        const sFilePath = ('/' + sSplitPath.slice(0, sSplitPath.length - 1).join('/') + '/').replaceAll('//', '/');
        const sTmpId = getId();

        if (!sFileName) return;

        const sExistBoard = getExistBoard({ name: sFileName, path: sFilePath });

        if (sExistBoard) {
            setSelectedTab(sExistBoard.id as string);
        } else {
            const sLoaded = await loadBoardFromFile({ path: sFilePath, name: sFileName }, sTmpId);
            if (sLoaded.error !== undefined) {
                pErrorCallback?.(sLoaded.error);
                return;
            }
            setBoardList(boards => [...boards, sLoaded.board]);
            setSelectedTab(sTmpId);
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
            <Button size="sm" variant="secondary" onClick={handleOpen}>
                {btnTxt ?? 'Open file'}
            </Button>
        </div>
    );
};
