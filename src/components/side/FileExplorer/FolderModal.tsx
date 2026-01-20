import { useRecoilState, useRecoilValue } from 'recoil';
import { gFileTree, gRecentDirectory } from '@/recoil/fileTree';
import { BsGit } from '@/assets/icons/Icon';
import { useState, useEffect, useRef } from 'react';
import { postFileList } from '@/api/repository/api';
import useDebounce from '@/hooks/useDebounce';
import { FileNameValidator } from '@/utils/FileExtansion';
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
    const [sFileTree, setFileTree] = useRecoilState(gFileTree);

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleSave = async () => {
        if (sIsLoad) return;
        if (!sFolderPath) return;
        let sPayload: any = {};
        setIsLoad(true);
        if (pIsGit) {
            if (sGitUrl) sPayload = { url: sGitUrl, command: 'clone' };
            else sPayload = undefined;
        } else {
            sPayload = undefined;
        }
        const sResult: any = await postFileList(sPayload, sFolderPath, '');
        if (sResult && sResult.success) {
            setValResut(true);
            const sDrillRes = await TreeFetchDrilling(sFileTree, sFolderPath);
            setFileTree(JSON.parse(JSON.stringify(sDrillRes.tree)));
            setValResut(true);
            handleClose();
        } else {
            setValResut(false);
        }
        setIsLoad(false);
    };

    const handleFoldername = () => {
        if (!sGitUrl) return;
        const sPathList = sGitUrl.split('/');
        if (sPathList.length <= 0) return;
        const folderName = sPathList[sPathList.length - 1];
        setFolderPath('/' + (folderName.endsWith('.git') ? folderName.slice(0, -4) : folderName));
    };

    const pathHandler = (e: any) => {
        if (e.target.value === '') return setFolderPath('/');
        if (!e.nativeEvent.data && sFolderPath === '/') return;
        if (!e.target.value.split('/').every((aV: string) => FileNameValidator(aV))) return;
        if (e.target.value[0] !== '/') return;
        if (e.target.value.includes('//')) return;
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
        <Modal.Root isOpen={true} onClose={handleClose} size="md" style={{ height: 'auto' }}>
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
                        onChange={(e: any) => setGitUrl(e.target.value)}
                        value={sGitUrl}
                    />
                ) : null}
                <Input label="Name" onChange={pathHandler} value={sFolderPath} onKeyDown={handleEnter} />
                {sValResult ? null : <Alert variant="error" message={`* Please check ${pIsGit ? 'url,' : ''} name and path.`} />}
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm onClick={handleSave} disabled={isFormDisabled()} loading={sIsLoad}>
                    OK
                </Modal.Confirm>
                <Modal.Cancel onClick={handleClose}>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};
