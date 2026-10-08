import { useRecoilState, useRecoilValue } from 'recoil';
import { gFileTree, gRecentDirectory } from '@/recoil/fileTree';
import { useState, useEffect, useRef } from 'react';
import { postFileList } from '@/api/repository/api';
import { getFiles } from '@/api/repository/fileTree';
import useDebounce from '@/hooks/useDebounce';
import { FileTazDfltVal, FileDshDfltVal, FileWrkDfltVal } from '@/utils/FileExtansion';
import { isTypingPath, validatePath } from '@/utils/fileName';
import { TreeFetchDrilling } from '@/utils/UpdateTree';
import { extractionExtension } from '@/utils';
import { Alert, FileListHeader, Input, Modal, Page } from '@/design-system/components';
import { findExistingEntry, overwriteMessage } from '@/utils/fileExistence';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
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
    const [sPendingOverwrite, setPendingOverwrite] = useState<{ payload: any; dir: string; name: string; existing: string } | null>(null);

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
        // Preflight: ensure parent path exists and is a directory
        const checkPath = sDir === '/' ? '/' : `/${sDir}/`;
        const sParentInfo: any = await getFiles(checkPath);
        if (!sParentInfo || !sParentInfo.success || !sParentInfo.data?.isDir) {
            // in-modal error (r13): say why instead of the generic "check name and path"
            const sFailure = getFileRequestFailure(sParentInfo, `The folder '${checkPath}' does not exist.`);
            setErrorMessage(sFailure ? sFailure.reason : `'${checkPath}' is not a folder.`);
            setValResut(false);
            return;
        }

        // The server POST overwrites. Judge existence from the children we already fetched.
        const sExisting = findExistingEntry(sParentInfo.data?.children, sName);
        if (sExisting?.isDir) {
            setErrorMessage(`A folder named '${sExisting.name}' already exists.`);
            setValResut(false);
            return;
        }
        if (sExisting) {
            setPendingOverwrite({ payload: sPayload, dir: sDir, name: sName, existing: sExisting.name });
            return;
        }
        await postFile(sPayload, sDir, sName);
    };

    const postFile = async (sPayload: any, sDir: string, sName: string) => {
        const sResult: any = await postFileList(sPayload, sDir, sName);
        if (sResult && sResult.success) {
            // sName is the server's real name after an overwrite confirm (r13), so drill to that entry
            const sDrillRes = await TreeFetchDrilling(sFileTree, (sDir === '/' ? '/' : `/${sDir}/`) + sName, true);
            setFileTree(JSON.parse(JSON.stringify(sDrillRes.tree)));
            handleClose();
        } else {
            // the server's reason instead of the generic "check name and path"
            setErrorMessage(getFileRequestFailure(sResult, 'Failed to create the file.')?.reason);
            setValResut(false);
        }
    };

    const handleConfirmOverwrite = async () => {
        const sPending = sPendingOverwrite;
        setPendingOverwrite(null);
        // overwrite the file that is there under its real name (r13): 'A.sql' typed, 'a.sql' exists → 'a.sql'
        if (sPending) await postFile(sPending.payload, sPending.dir, sPending.existing);
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
            {sPendingOverwrite ? (
                <ConfirmModal
                    data-testid="file-overwrite-dialog"
                    setIsOpen={() => setPendingOverwrite(null)}
                    pContents={<div className="body-content">{overwriteMessage(sPendingOverwrite.existing)}</div>}
                    pCallback={handleConfirmOverwrite}
                />
            ) : null}
        </Modal.Root>
    );
};
