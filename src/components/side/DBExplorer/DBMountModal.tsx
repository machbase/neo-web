import { Close, VscWarning } from '@/assets/icons/Icon';
import { useState } from 'react';
import { TextButton } from '@/components/buttons/TextButton';
import { mountDB } from '@/api/repository/api';
import Modal from '@/components/modal/Modal';
import { MountNameRegEx } from '@/utils/database';
import './DBMountModal.scss';

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
        if (mountDBInfo.name === '' || mountDBInfo.path === '') return;
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
        <div className="db-mount-modal">
            <Modal pIsDarkMode onOutSideClose={handleClose}>
                <Modal.Header>
                    <div className="title">
                        <div className="title-content">
                            <span>Database Mount</span>
                        </div>
                        <Close onClick={handleClose} />
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <div className={'file-dark'}>
                        <div className={`file-dark-content`}>
                            <div className={`file-dark-content-name`}>
                                <div className={`file-dark-content-name-wrap`}>
                                    <span>Name</span>
                                </div>
                                <div className={`input-wrapper input-wrapper-dark`}>
                                    <input autoFocus onChange={(e) => handleMountDBInfo('name', e)} value={mountDBInfo.name} />
                                </div>
                            </div>
                            <div className={`file-dark-content-name`}>
                                <div className={`file-dark-content-name-wrap`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                                        <span>Path</span>
                                    </div>
                                </div>
                                <div className={`input-wrapper input-wrapper-dark`} style={{ paddingRight: '0px' }}>
                                    <input onChange={(e) => handleMountDBInfo('path', e)} value={mountDBInfo.path} onKeyDown={handleEnter} />
                                </div>
                            </div>
                            {mountState && (
                                <div className="mount-res-err" style={{ display: 'flex' }}>
                                    <VscWarning color="rgb(255, 83, 83)" />
                                    <span style={{ color: 'rgb(255, 83, 83)', fontSize: '14px', marginLeft: '4px' }}>{mountState}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <div className="button-group">
                        <TextButton pText="OK" pBackgroundColor="#4199ff" pIsDisabled={mountLoad} onClick={handleMount} pIsLoad={mountLoad} />
                        <div style={{ width: '10px' }}></div>
                        <TextButton pText="Cancel" pBackgroundColor="#666979" onClick={handleClose} />
                    </div>
                </Modal.Footer>
            </Modal>
        </div>
    );
};
