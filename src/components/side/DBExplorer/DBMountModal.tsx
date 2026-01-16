import { useState } from 'react';
import { mountDB } from '@/api/repository/api';
import { IsKeyword, MountNameRegEx } from '@/utils/database';
import { Modal, Input, Alert } from '@/design-system/components';
import styles from './DBMountModal.module.scss';

export const DBMountModal = ({ setIsOpen, pRefresh }: { setIsOpen: (status: boolean) => void; pRefresh: () => void }) => {
    const [mountDBInfo, setMountDBInfo] = useState<{ name: string; path: string }>({ name: '', path: '' });
    const [mountState, setMountState] = useState<undefined | string>(undefined);
    const [mountLoad, setMountLoad] = useState<boolean>(false);

    /** Close Modal */
    const handleClose = () => {
        setIsOpen(false);
    };
    /** Mount database */
    const handleMount = async () => {
        if (mountDBInfo.name === '' || mountDBInfo.path === '' || IsKeyword(mountDBInfo.name)) return;
        setMountLoad(true);
        setMountState(undefined);
        const resMount: any = await mountDB(mountDBInfo.name, mountDBInfo.path);
        if (resMount.success) {
            pRefresh();
            setIsOpen(false);
        } else setMountState(resMount?.data ? resMount?.data.reason : resMount.statusText);
        setMountLoad(false);
    };
    const handleEnter = (e: any) => {
        if (IsKeyword(mountDBInfo.name)) return;
        if (e.code === 'Enter') {
            handleMount();
            e.stopPropagation();
        }
    };
    const handleMountDBInfo = (target: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (target === 'name' && !MountNameRegEx.test(e.target.value) && e.target.value !== '') return;
        else
            setMountDBInfo((prev) => {
                return {
                    ...prev,
                    [target]: e.target.value,
                };
            });
    };

    return (
        <Modal.Root isOpen={true} onClose={handleClose} className={styles['db-mount-modal']}>
            <Modal.Header>
                <Modal.Title>Database Mount</Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <Input
                    label="Name"
                    autoFocus
                    value={mountDBInfo.name}
                    onChange={(e) => handleMountDBInfo('name', e)}
                    error={IsKeyword(mountDBInfo.name) ? 'Mount name cannot be a keyword.' : undefined}
                    fullWidth
                />
                <Input label="Path" value={mountDBInfo.path} onChange={(e) => handleMountDBInfo('path', e)} onKeyDown={handleEnter} fullWidth />
                {mountState && <Alert variant="error" message={mountState} />}
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm onClick={handleMount} disabled={mountLoad || IsKeyword(mountDBInfo.name)} loading={mountLoad}>
                    OK
                </Modal.Confirm>
                <Modal.Cancel onClick={handleClose}>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};
