import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { gFileTree, gRecentDirectory } from '@/recoil/fileTree';
import { useState, useEffect, useRef } from 'react';
import { postFileList } from '@/api/repository/api';
import useDebounce from '@/hooks/useDebounce';
import { FileTazDfltVal, FileDshDfltVal, FileWrkDfltVal } from '@/utils/FileExtansion';
import { isTypingPath, validatePath } from '@/utils/fileName';
import { TreeFetchDrilling } from '@/utils/UpdateTree';
import { extractionExtension } from '@/utils';
import { Alert, FileListHeader, Input, Modal, Page } from '@/design-system/components';
import { resolveOverwrite } from '@/utils/fileExistence';
import { useOverwritePrompt } from '@/components/modal/useOverwritePrompt';
import { afterOverwrite, tabFromWrittenContent } from '@/utils/boardAfterOverwrite';
import { gBoardList } from '@/recoil/recoil';
import { getFileRequestFailure } from '@/utils/fileRequestResult';

export interface FileModalProps {
    setIsOpen: any;
}

export const FileModal = (props: FileModalProps) => {
    const { setIsOpen } = props;
    const sRecentDirectory = useRecoilValue(gRecentDirectory);
    const [sFilePath, setFilePath] = useState<string>('');
    const [sValResult, setValResut] = useState<boolean>(true);
    const [sFileTree, setFileTree] = useRecoilState(gFileTree);
    const sInputRef = useRef<HTMLInputElement>(null);
    const [sErrorMessage, setErrorMessage] = useState<string | undefined>(undefined);
    const setBoardList = useSetRecoilState(gBoardList);
    const { ask: askOverwrite, prompt: sOverwritePrompt } = useOverwritePrompt();
    const [sIsSaving, setIsSaving] = useState<boolean>(false);

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleSave = async () => {
        if (!sFilePath || sFilePath === '') return;
        // Re-validate synchronously: during the 200ms debounce sValResult is still the initial true.
        const sVerdict = validatePath(sFilePath, { kind: 'file' });
        if (!sVerdict.ok) {
            setErrorMessage(sVerdict.reason);
            setValResut(false);
            return;
        }
        // extractionExtension is already lower-case: `X.DSH` gets the dashboard default like `x.dsh`
        const sExt = extractionExtension(sFilePath.split('/').at(-1) as string);
        let sPayload: any = undefined;

        if (sExt === 'wrk') sPayload = FileWrkDfltVal;
        if (sExt === 'taz') sPayload = FileTazDfltVal;
        if (sExt === 'dsh') sPayload = FileDshDfltVal;

        // Split into directory and file name to avoid backend routing/validation issues
        const lastSlashIdx = sFilePath.lastIndexOf('/');
        const sDirRaw = lastSlashIdx > 0 ? sFilePath.slice(0, lastSlashIdx) : '/';
        // Backend expects directory without leading slash (consistent with other callers)
        const sDir = sDirRaw === '/' ? '/' : sDirRaw.replace(/^\/+/, '');
        const sName = sFilePath.slice(lastSlashIdx + 1);
        const sDirPath = sDir === '/' ? '/' : `/${sDir}/`;
        if (sIsSaving) return;
        setIsSaving(true);
        try {
            // the shared check of every save/create dialog (r20 M2): unfiltered re-query, missing / non-folder parent,
            // case-insensitive name → overwrite ConfirmModal; problems shown in this modal
            const sDecision = await resolveOverwrite(sDirPath, sName, askOverwrite);
            if (sDecision.status === 'folder' || sDecision.status === 'failed') {
                setErrorMessage(sDecision.reason);
                setValResut(false);
                return;
            }
            if (sDecision.status === 'cancel') return;
            // r20 M1: written under the name the user typed (the server's file system decides the case)
            const sResult: any = await postFileList(sPayload, sDir, sName);
            const sFailure = getFileRequestFailure(sResult, 'Failed to create the file.');
            if (sFailure) {
                // the server's reason instead of the generic "check name and path"
                setErrorMessage(sFailure.reason);
                setValResut(false);
                return;
            }
            // r20 M3: a tab open on the overwritten file shows what was written (or is closed) — same helper as every dialog
            setBoardList((aTabs: any[]) => afterOverwrite(aTabs, { path: sDirPath, name: sName, confirmed: sDecision.status === 'confirmed' }, tabFromWrittenContent(sPayload, sName)));
            const sDrillRes = await TreeFetchDrilling(sFileTree, sDirPath + sName, true);
            setFileTree(JSON.parse(JSON.stringify(sDrillRes.tree)));
            handleClose();
        } finally {
            setIsSaving(false);
        }
    };

    const handlefileName = () => {
        const sVerdict = validatePath(sFilePath, { kind: 'file' });
        setErrorMessage(sVerdict.ok ? undefined : sVerdict.reason);
        setValResut(sVerdict.ok);
    };

    const handleEnter = (e: any) => {
        if (!sValResult) return;
        if (e.code === 'Enter') {
            handleSave();
            e.stopPropagation();
        }
    };

    const pathHandler = (e: any) => {
        if (e.target.value === '') return setFilePath('/');
        if (!e.nativeEvent.data && sFilePath === '/') return;
        if (!isTypingPath(e.target.value)) return;

        setFilePath(e.target.value);
    };

    useDebounce([sFilePath], handlefileName);

    useEffect(() => {
        if (setIsOpen) {
            setFilePath(sRecentDirectory as string);
        }
    }, [setIsOpen]);

    useEffect(() => {
        if (sInputRef && sInputRef.current) {
            sInputRef.current.focus();
        }
    }, []);

    return (
        <Modal.Root isOpen={true} onClose={handleClose} size="md" style={{ height: 'auto' }} data-testid="file-new-dialog">
            <Modal.Header>
                <Modal.Title>New File</Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Page>
                <Page.Divi spacing={'0'} />
                <FileListHeader columns={[sFilePath]} />
            </Page>
            <Modal.Body>
                <Input label="Name" data-testid="file-new-path-input" onChange={pathHandler} value={sFilePath} onKeyDown={handleEnter} />
                {sValResult ? null : (
                    <div data-testid="file-new-error">
                        <Alert variant="error" message={sErrorMessage ?? `Please check name and path.`} />
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm data-testid="file-new-confirm" onClick={handleSave} disabled={!sValResult} loading={false}>
                    OK
                </Modal.Confirm>
                <Modal.Cancel onClick={handleClose}>Cancel</Modal.Cancel>
            </Modal.Footer>
            {sOverwritePrompt}
        </Modal.Root>
    );
};
