import { useState, Dispatch, SetStateAction, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { MonacoEditor } from '@/components/monaco/MonacoEditor';
import { Save, SaveAs, BiSolidEdit, Play, MdLink } from '@/assets/icons/Icon';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { Markdown } from '@/components/worksheet/Markdown';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { Button, Page, ErrorBoundary } from '@/design-system/components';
import { toTqlFileUrlPath } from '@/utils/filePath';
import { useShareAvailability } from '@/hooks/useShareAvailability';

type EditorLangType = 'json' | 'go' | 'typescript' | 'markdown' | 'css' | 'html' | 'javascript' | 'jsh';

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
    // The copied /db/tql link answers 401 on a server with HTTP token auth on (#1576): no Copy link there.
    const sShareAvailable = useShareAvailability();
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
        if (!sTargetBoard) {
            return;
        }

        const sTargetPath = window.location.origin + toTqlFileUrlPath(sTargetBoard.path + sTargetBoard.name);
        ClipboardCopy(sTargetPath);
    };

    // A package page opens from /web/apps/...; any other file runs from /db/tql/<path>, which a server with
    // HTTP token auth on answers with 401 (#1576), so Run is off there and says why.
    const isPkgPath = (aPath: string) => /\/apps\//.test(aPath);
    const sRunUnavailable = pLang === 'html' && sShareAvailable === false && !isPkgPath(sBoardList.find((aBoard) => aBoard.id === sSelectedTab)?.path ?? '');

    const handleWindowOpen = () => {
        const sTargetBoard = sBoardList.find((aBoard) => aBoard.id === sSelectedTab);
        if (!sTargetBoard) {
            return;
        }

        const isPkg = isPkgPath(sTargetBoard.path);
        let sOpenUrl: string = '';
        if (isPkg) sOpenUrl = window.location.origin + '/web' + sTargetBoard.path;
        else sOpenUrl = window.location.origin + toTqlFileUrlPath(sTargetBoard.path + sTargetBoard.name);
        // url, target
        window.open(sOpenUrl, sOpenUrl);
    };

    return (
        <Page>
            <Page.Header>
                <div>
                    {pLang === 'html' && (
                        <Button
                            size="icon"
                            variant="ghost"
                            isToolTip
                            toolTipContent={sRunUnavailable ? 'Not available on this server.' : 'Run code'}
                            aria-label="Run code"
                            disabled={sRunUnavailable}
                            icon={<Play size={16} />}
                            onClick={handleWindowOpen}
                            data-testid="html-run"
                        />
                    )}
                </div>
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
                    {pLang === 'html' && sShareAvailable ? <Button size="icon" variant="ghost" isToolTip toolTipContent="Copy link" onClick={handleCopyLink} icon={<MdLink size={16} />} data-testid="html-copy-link" /> : null}
                </Button.Group>
            </Page.Header>
            <Page.Body>
                {!sIsPreview ? (
                    <MonacoEditor pIsActiveTab={pIsActiveTab} pText={sText} pLang={sCurrentLang} onSelectLine={() => null} onChange={handleChangeText} onRunCode={() => null} />
                ) : null}
                {pLang === 'markdown' && sIsPreview ? (
                    // A preview that cannot be shown keeps the header, so the editor is one click away.
                    <ErrorBoundary name="tab-result:md-preview" variant="region" resetKeys={[sText]}>
                        <Markdown pIdx={1} pContents={sText} pType="mrk" />
                    </ErrorBoundary>
                ) : null}
            </Page.Body>
        </Page>
    );
};
