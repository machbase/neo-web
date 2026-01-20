import { useRecoilState, useRecoilValue } from 'recoil';
import { gFileTree, gRecentDirectory } from '@/recoil/fileTree';
import { useState, useEffect, useRef } from 'react';
import { postFileList } from '@/api/repository/api';
import { getFiles } from '@/api/repository/fileTree';
import useDebounce from '@/hooks/useDebounce';
import { FileNameAndExtensionValidator, FileTazDfltVal, FileDshDfltVal, FileWrkDfltVal, PathRootValidator } from '@/utils/FileExtansion';
import { TreeFetchDrilling } from '@/utils/UpdateTree';
import { getFileNameAndExtension } from '@/utils/fileNameUtils';
import { Alert, FileListHeader, Input, Modal, Page } from '@/design-system/components';

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

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleSave = async () => {
        if (!sFilePath || sFilePath === '') return;
        const fullFileName = sFilePath.split('/').at(-1) as string;
        const { extension } = getFileNameAndExtension(fullFileName);
        const parsedExtension = extension.toLowerCase();
        let sPayload: any = undefined;

        if (parsedExtension.includes('wrk')) sPayload = FileWrkDfltVal;
        if (parsedExtension.includes('taz')) sPayload = FileTazDfltVal;
        if (parsedExtension.includes('dsh')) sPayload = FileDshDfltVal;

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
            setValResut(false);
            return;
        }

        const sResult: any = await postFileList(sPayload, sDir, sName);
        if (sResult && sResult.success) {
            const sDrillRes = await TreeFetchDrilling(sFileTree, sFilePath, true);
            setFileTree(JSON.parse(JSON.stringify(sDrillRes.tree)));
            handleClose();
        } else {
            setValResut(false);
        }
    };

    const handlefileName = () => {
        setValResut(FileNameAndExtensionValidator((sFilePath.split('/').at(-1) as string).toLowerCase()));
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
        if (!PathRootValidator(e.target.value)) return;
        if (e.target.value[0] !== '/') return;

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
        <Modal.Root isOpen={true} onClose={handleClose} size="md" style={{ height: 'auto' }}>
            <Modal.Header>
                <Modal.Title>New File</Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Page>
                <Page.Divi spacing={'0'} />
                <FileListHeader columns={[sFilePath]} />
            </Page>
            <Modal.Body>
                <Input label="Name" onChange={pathHandler} value={sFilePath} onKeyDown={handleEnter} />
                {sValResult ? null : <Alert variant="error" message={`Please check name and path.`} />}
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm onClick={handleSave} disabled={!sValResult} loading={false}>
                    OK
                </Modal.Confirm>
                <Modal.Cancel onClick={handleClose}>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};
