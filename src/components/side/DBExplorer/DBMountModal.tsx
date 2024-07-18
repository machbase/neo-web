import { Close, VscWarning } from '@/assets/icons/Icon';
import { useEffect, useState } from 'react';
import { TextButton } from '@/components/buttons/TextButton';
import { getDBSPath, mountDB } from '@/api/repository/api';
import Modal from '@/components/modal/Modal';

export const DBMountModal = ({ setIsOpen, pRefresh }: { setIsOpen: (status: boolean) => void; pRefresh: () => void }) => {
    const [mountDBInfo, setMountDBInfo] = useState<{ name: string; path: string }>({ name: '', path: '' });
    const [mountState, setMountState] = useState<undefined | string>(undefined);
    const [defaultPath, setDefaultPath] = useState<string | undefined>(undefined);
    const [mountLoad, setMountLoad] = useState<boolean>(false);
    const savedLocalDBPath = localStorage.getItem('databasePath');

    const handleClose = () => {
        setIsOpen(false);
    };
    const checkRoot = (path: string): boolean => {
        const rootExp = new RegExp('^[cC/]', 'gm');
        const expRes = path.match(rootExp);
        if (expRes && expRes?.length > 0) return true;
        return false;
    };
    const handleMount = async () => {
        if (mountDBInfo.name === '' || mountDBInfo.path === '') return;
        setMountLoad(true);
        setMountState(undefined);
        const rootPath = checkRoot(mountDBInfo.path) ? mountDBInfo.path : defaultPath + '/' + mountDBInfo.path;
        const resMount: any = await mountDB(mountDBInfo.name, rootPath);
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
        setMountDBInfo((prev) => {
            return {
                ...prev,
                [target]: e.target.value,
            };
        });
    };
    /** GET DEFAULT DB PATH */
    const getPath = async () => {
        const resDBSPath: any = await getDBSPath();
        if (resDBSPath?.success) {
            const targetColumnIdx = resDBSPath.data.columns.findIndex((col: string) => col === 'VALUE');
            if (targetColumnIdx >= 0) return resDBSPath.data.rows[0][targetColumnIdx];
        }
        return '';
    };
    const dbPathParser = (path: string) => {
        if (path === '') return path;
        return path.replaceAll('\\', '/');
    };
    const init = async () => {
        const defaultPath = savedLocalDBPath ?? (await getPath());
        setDefaultPath(dbPathParser(defaultPath));
    };

    useEffect(() => {
        init();
    }, []);

    return (
        <div className="fileModal">
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
                                <div className={`file-dark-content-name-wrap`} style={{ display: 'flex', alignItems: 'baseLine' }}>
                                    <span>Path</span>
                                    <div style={{ marginLeft: '4px', display: 'flex', fontSize: '12px', color: '#9d9d9d', cursor: 'default' }}>(default: {defaultPath})</div>
                                </div>
                                <div className={`input-wrapper input-wrapper-dark`}>
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
