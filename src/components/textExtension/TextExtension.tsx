import { useState, Dispatch, SetStateAction, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { MonacoEditor } from '@/components/monaco/MonacoEditor';
import { Save, SaveAs, BiSolidEdit, Play, MdLink } from '@/assets/icons/Icon';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { Markdown } from '@/components/worksheet/Markdown';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { Button, Page } from '@/design-system/components';

type EditorLangType = 'json' | 'go' | 'typescript' | 'markdown' | 'css' | 'html' | 'javascript';

export interface TextExtensionProps {
    pIsActiveTab: boolean;
    pLang: EditorLangType;
    pCode: string | object;
    pHandleSaveModalOpen: () => void;
    setIsOpenModal: Dispatch<SetStateAction<boolean>>;
}

export const TextExtension = (props: TextExtensionProps) => {
    const { pIsActiveTab, pLang, pCode, pHandleSaveModalOpen, setIsOpenModal } = props;
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
        <Page>
            <Page.Header>
                <div>{pLang === 'html' && <Button size="icon" variant="ghost" isToolTip toolTipContent="Run code" icon={<Play size={16} />} onClick={handleWindowOpen} />}</div>
                <Button.Group>
                    {pLang === 'markdown' ? (
                        <Button
                            size="icon"
                            variant="ghost"
                            active={!sIsPreview}
                            isToolTip
                            toolTipContent="Edit"
                            icon={<BiSolidEdit size={16} />}
                            onClick={() => setIsPreView(!sIsPreview)}
                        />
                    ) : null}
                    <Button size="icon" variant="ghost" isToolTip toolTipContent="Save" icon={<Save size={16} />} onClick={pHandleSaveModalOpen} />
                    <Button size="icon" variant="ghost" isToolTip toolTipContent="Save as" icon={<SaveAs size={16} />} onClick={() => setIsOpenModal(true)} />
                    {pLang === 'html' ? <Button size="icon" variant="ghost" isToolTip toolTipContent="Copy link" onClick={handleCopyLink} icon={<MdLink size={16} />} /> : null}
                </Button.Group>
            </Page.Header>
            <Page.Body>
                {!sIsPreview ? (
                    <MonacoEditor pIsActiveTab={pIsActiveTab} pText={sText} pLang={sCurrentLang} onSelectLine={() => null} onChange={handleChangeText} onRunCode={() => null} />
                ) : null}
                {pLang === 'markdown' && sIsPreview ? <Markdown pIdx={1} pContents={sText} pType="mrk" /> : null}
            </Page.Body>
        </Page>
    );
};
