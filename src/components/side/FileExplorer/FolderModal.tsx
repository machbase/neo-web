import { useRecoilState, useRecoilValue } from 'recoil';
import { gFileTree, gRecentDirectory } from '@/recoil/fileTree';
import { BsGit } from '@/assets/icons/Icon';
import { useState, useEffect, useRef } from 'react';
import { postFileList } from '@/api/repository/api';
import useDebounce from '@/hooks/useDebounce';
import { isTypingPath, nameFromUrl, validatePath } from '@/utils/fileName';
import { checkTargetExists } from '@/utils/fileExistence';
import { useClonePrompt } from '@/components/modal/useOverwritePrompt';
import { getFileRequestFailure } from '@/utils/fileRequestResult';
import { TreeFetchDrilling } from '@/utils/UpdateTree';
import { Alert, FileListHeader, Input, Modal, Page } from '@/design-system/components';

export interface FolderModalProps {
    setIsOpen: any;
    pIsGit: boolean;
}

export const FolderModal = (props: FolderModalProps) => {
    const { setIsOpen, pIsGit } = props;
    const [sGitUrl, setGitUrl] = useState<string>('');
    const [sIsLoad, setIsLoad] = useState<boolean>(false);
    const sRecentDirectory = useRecoilValue(gRecentDirectory);
    const [sFolderPath, setFolderPath] = useState<string>(sRecentDirectory ?? '/');
    const sGitUrlRef: any = useRef(null);
    const sInputRef = useRef<HTMLInputElement>(null);
    const [sValResult, setValResut] = useState<boolean>(true);
    const [sErrorMessage, setErrorMessage] = useState<string | undefined>(undefined);
    const [sFileTree, setFileTree] = useRecoilState(gFileTree);
    const { ask: askClone, prompt: sClonePrompt } = useClonePrompt();

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleSave = async () => {
        if (sIsLoad) return;
        if (!sFolderPath) return;
        let sPayload: any = {};
        const sVerdict = validatePath(sFolderPath, { kind: 'folder' });
        if (!sVerdict.ok) {
            setErrorMessage(sVerdict.reason);
            setValResut(false);
            return;
        }
        const sSegments = sFolderPath.split('/').filter((aSeg) => aSeg !== '');
        setIsLoad(true);
        // The server POST does not tell "created" from "already there": check the parent first.
        // The server does not create intermediate folders (measured: 500 `mkdir ...: no such file or directory`),
        // so a missing parent (404) — or any failed lookup — stops here without a POST.
        const sTargetName = sSegments[sSegments.length - 1];
        const sParentDir = '/' + sSegments.slice(0, -1).join('/') + (sSegments.length > 1 ? '/' : '');
        const { entry: sExisting, response: sParentRes } = await checkTargetExists(sParentDir, sTargetName);
        const sParentFailure = getFileRequestFailure(sParentRes, 'Failed to read the parent folder.');
        if (sParentFailure) {
            setErrorMessage(sParentRes?.status === 404 ? `Parent folder '${sParentDir}' does not exist.` : sParentFailure.reason);
            setValResut(false);
            setIsLoad(false);
            return;
        }
        let sTargetPath = sFolderPath;
        // Plain New folder: the server refuses an existing name (500), so block in the modal.
        // Clone (r14): the server REPLACES the existing folder's contents (measured), so ask first.
        if (sExisting && (!pIsGit || !sExisting.isDir)) {
            setErrorMessage(`'${sExisting.name}' already exists.`);
            setValResut(false);
            setIsLoad(false);
            return;
        }
        if (sExisting) {
            if (!(await askClone(sExisting.name))) {
                setIsLoad(false);
                return;
            }
            // clone into the folder that is there, under its real name
            sTargetPath = sParentDir + sExisting.name;
        }
        if (pIsGit) {
            if (sGitUrl) sPayload = { url: sGitUrl, command: 'clone' };
            else sPayload = undefined;
        } else {
            sPayload = undefined;
        }
        const sResult: any = await postFileList(sPayload, sTargetPath, '');
        if (sResult && sResult.success) {
            setValResut(true);
            const sDrillRes = await TreeFetchDrilling(sFileTree, sTargetPath);
            setFileTree(JSON.parse(JSON.stringify(sDrillRes.tree)));
            setValResut(true);
            handleClose();
        } else {
            // the server's reason (a failed clone, mkdir refused ...) instead of the generic "check name and path"
            setErrorMessage(getFileRequestFailure(sResult, pIsGit ? 'Clone failed.' : 'Failed to create the folder.')?.reason);
            setValResut(false);
        }
        setIsLoad(false);
    };

    const handleFoldername = () => {
        if (!sGitUrl) return;
        // one URL→name function (also used by Reference quick install): decode once, '.git' stripped, validated
        const sRepo = nameFromUrl(sGitUrl, { kind: 'repo' });
        if (!sRepo.ok) {
            // '%2F' decodes to '/', '%23' to '#': never turn them into a nested or truncated path
            setFolderPath('/');
            setErrorMessage(`* ${sRepo.reason}`);
            setValResut(false);
            return;
        }
        setErrorMessage(undefined);
        setValResut(true);
        setFolderPath('/' + sRepo.name);
    };

    const pathHandler = (e: any) => {
        if (e.target.value === '') return setFolderPath('/');
        if (!e.nativeEvent.data && sFolderPath === '/') return;
        if (!isTypingPath(e.target.value)) return;
        setErrorMessage(undefined);
        setValResut(true);
        setFolderPath(e.target.value);
    };

    const handleEnter = (e: any) => {
        if (!sFolderPath) return;
        if (e.code === 'Enter') {
            handleSave();
            e.stopPropagation();
        }
    };

    useEffect(() => {
        if (pIsGit) {
            if (sGitUrlRef && sGitUrlRef.current) {
                sGitUrlRef.current.focus();
            }
        } else {
            if (sInputRef && sInputRef.current) {
                sInputRef.current.focus();
            }
        }
    }, []);

    const isFormDisabled = (): boolean => {
        if (pIsGit && !sGitUrl) return true;
        if (!sFolderPath) return true;
        if (sFolderPath === '/') return true;
        return false;
    };

    useDebounce([sGitUrl], handleFoldername);

    return (
        <Modal.Root isOpen={true} onClose={handleClose} size="md" style={{ height: 'auto' }} data-testid="folder-new-dialog">
            <Modal.Header>
                <Modal.Title>{pIsGit ? 'Git Clone' : 'New Folder'}</Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Page>
                <Page.Divi spacing={'0'} />
                <FileListHeader columns={[sFolderPath]} />
            </Page>
            <Modal.Body>
                {pIsGit ? (
                    <Input
                        label={
                            <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
                                <BsGit size={16} />
                                Url
                            </div>
                        }
                        ref={sGitUrlRef}
                        data-testid="folder-new-git-url-input"
                        onChange={(e: any) => setGitUrl(e.target.value)}
                        value={sGitUrl}
                    />
                ) : null}
                <Input label="Name" data-testid="folder-new-path-input" onChange={pathHandler} value={sFolderPath} onKeyDown={handleEnter} />
                {sValResult ? null : (
                    <div data-testid="folder-new-error">
                        <Alert variant="error" message={sErrorMessage ?? `* Please check ${pIsGit ? 'url,' : ''} name and path.`} />
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm data-testid="folder-new-confirm" onClick={handleSave} disabled={isFormDisabled()} loading={sIsLoad}>
                    OK
                </Modal.Confirm>
                <Modal.Cancel onClick={handleClose}>Cancel</Modal.Cancel>
            </Modal.Footer>
            {sClonePrompt}
        </Modal.Root>
    );
};
