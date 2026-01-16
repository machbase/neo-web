import { useState } from 'react';
import { VscWarning } from '@/assets/icons/Icon';
import { FileTreeType, FileType } from '@/utils/fileTreeParser';
import { gDeleteFileList } from '@/recoil/fileTree';
import { useRecoilState } from 'recoil';
import { Button, Modal, Checkbox, Page } from '@/design-system/components';

export interface DeleteModalProps {
    setIsOpen: any;
    pFileInfo?: FileType | FileTreeType;
    pCallback: (isBool: boolean) => void;
}

export const DeleteModal = (props: DeleteModalProps) => {
    const { setIsOpen, pFileInfo, pCallback } = props;
    const [sIsRecursive, setIsRecursive] = useState<boolean>(false);
    const [sDeleteFileList] = useRecoilState(gDeleteFileList);
    let sIsFile = (pFileInfo as any).dirs ? false : true;

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleDelete = (aBool: boolean) => {
        pCallback(aBool);
    };

    const getDeleteFileName = () => {
        const sNameList: string[] = [];

        if (sDeleteFileList && (sDeleteFileList as any).length > 0) {
            let sDupFile: boolean = false;
            (sDeleteFileList as any).map((dFile: any) => {
                if (dFile === pFileInfo) sDupFile = true;
                if (dFile.type === 1) sIsFile = false;
                sNameList.push(dFile.name);
            });
            if (!sDupFile) {
                sNameList.push((pFileInfo as any).name);
            }
        }
        return <div style={{ display: 'flex', textAlign: 'center' }}>{sNameList.length > 0 ? sNameList.join(', ') : pFileInfo?.name}?</div>;
    };

    return (
        <Modal.Root isOpen={true} onClose={handleClose}>
            <Modal.Header>
                <Modal.Title>
                    <VscWarning />
                    <span>Delete</span>
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>

            <Modal.Body>
                <Page.DpRow style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                    Do you want to delete this {sIsFile ? 'file' : 'folder'} ({getDeleteFileName()})
                </Page.DpRow>
                {!sIsFile ? (
                    <Page.DpRow>
                        <Checkbox size="sm" label="Recursive delete directory" checked={sIsRecursive} onChange={(e) => setIsRecursive(e.target.checked)} />
                    </Page.DpRow>
                ) : null}
            </Modal.Body>

            <Modal.Footer>
                <Button.Group>
                    <Modal.Confirm onClick={() => handleDelete(sIsRecursive)}>OK</Modal.Confirm>
                    <Modal.Cancel>Cancel</Modal.Cancel>
                </Button.Group>
            </Modal.Footer>
        </Modal.Root>
    );
};
