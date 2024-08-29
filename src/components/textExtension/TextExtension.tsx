import { useState, Dispatch, SetStateAction, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { MonacoEditor } from '@/components/monaco/MonacoEditor';
import { IconButton } from '@/components/buttons/IconButton';
import { Save, SaveAs, BiSolidEdit, MdLink, Play } from '@/assets/icons/Icon';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { Markdown } from '@/components/worksheet/Markdown';
import './TextExtension.scss';
import { ClipboardCopy } from '@/utils/ClipboardCopy';

type EditorLangType = 'json' | 'go' | 'typescript' | 'markdown' | 'css' | 'html' | 'javascript';

export interface TextExtensionProps {
    pLang: EditorLangType;
    pCode: string | object;
    pHandleSaveModalOpen: () => void;
    setIsOpenModal: Dispatch<SetStateAction<boolean>>;
}

export const TextExtension = (props: TextExtensionProps) => {
    const { pLang, pCode, pHandleSaveModalOpen, setIsOpenModal } = props;
    const [sText, setText] = useState<string>('');
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const sSelectedTab = useRecoilValue(gSelectedTab);
    const [sCurrentLang, setCurrentLang] = useState<string>('');
    const [sIsPreview, setIsPreView] = useState<boolean>(pLang === 'markdown' ? true : false);

    useEffect(() => {
        if (typeof pCode === 'object') {
            setText(JSON.stringify(pCode, null, 4));
        } else {
            setText(pCode);
        }
        setCurrentLang(pLang);
    }, []);

    const handleChangeText = (aValue: any) => {
        setText(aValue);

        setBoardList(
            sBoardList.map((aItem) => {
                return aItem.id === sSelectedTab ? { ...aItem, code: aValue } : aItem;
            })
        );
    };

    const handleCopyLink = () => {
        const sTargetBoard = sBoardList.find((aBoard) => aBoard.id === sSelectedTab);
        const sTargetPath = `${window.location.origin + '/db/tql' + sTargetBoard!.path + sTargetBoard!.name}`;
        ClipboardCopy(sTargetPath);
    };

    const handleWindowOpen = () => {
        const sTargetBoard = sBoardList.find((aBoard) => aBoard.id === sSelectedTab);
        const isPkg = /\/apps\//.test(sTargetBoard?.path);
        let sOpenUrl: string = '';
        if (isPkg) sOpenUrl = window.location.origin + '/web' + sTargetBoard?.path;
        else sOpenUrl = window.location.origin + '/db/tql' + sTargetBoard!.path + sTargetBoard!.name;
        // url, target
        window.open(sOpenUrl, sOpenUrl);
    };

    return (
        <div className="textextension-editor">
            <div className="textextension-editor-header">
                <div className="textextension-editor-header-l">
                    {pLang === 'html' && (
                        <IconButton pPlace="bottom-start" pIsToopTip pToolTipContent="Run code" pToolTipId="txt-tab-run-code" pIcon={<Play />} onClick={handleWindowOpen} />
                    )}
                </div>
                <div className="textextension-editor-header-r">
                    {pLang === 'markdown' ? (
                        <IconButton
                            pPlace="bottom-end"
                            pIsToopTip
                            pToolTipContent="Edit"
                            pToolTipId="txt-tab-edit"
                            pIcon={<BiSolidEdit size={18} />}
                            pIsActive={!sIsPreview}
                            onClick={() => setIsPreView(!sIsPreview)}
                        />
                    ) : null}
                    <IconButton pPlace="bottom-end" pIsToopTip pToolTipContent="Save" pToolTipId="txt-tab-save" pIcon={<Save size={18} />} onClick={pHandleSaveModalOpen} />
                    <IconButton
                        pPlace="bottom-end"
                        pIsToopTip
                        pToolTipContent="Save as"
                        pToolTipId="txt-tab-save-as"
                        pIcon={<SaveAs size={18} />}
                        onClick={() => setIsOpenModal(true)}
                    />
                    {pLang === 'html' && (
                        <IconButton pPlace="bottom-end" pIsToopTip pToolTipContent="Copy link" pToolTipId="txt-tab-copy-link" pIcon={<MdLink />} onClick={handleCopyLink} />
                    )}
                </div>
            </div>
            <div className="textextension-editor-content" style={{ padding: sIsPreview ? '0 1rem' : '', backgroundColor: sIsPreview ? '#1B1C21' : '' }}>
                {!sIsPreview ? <MonacoEditor pText={sText} pLang={sCurrentLang} onSelectLine={() => null} onChange={handleChangeText} onRunCode={() => null} /> : null}
                {pLang === 'markdown' && sIsPreview ? <Markdown pIdx={1} pContents={sText} pType="mrk" /> : null}
            </div>
        </div>
    );
};
