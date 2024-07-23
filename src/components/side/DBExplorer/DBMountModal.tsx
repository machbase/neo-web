import { ArrowDown, Close, VscWarning } from '@/assets/icons/Icon';
import { useEffect, useState } from 'react';
import { TextButton } from '@/components/buttons/TextButton';
import { backupDBList, getDBSPath, mountDB } from '@/api/repository/api';
import Modal from '@/components/modal/Modal';
import { IconButton } from '@/components/buttons/IconButton';
import { TbPencilCog } from 'react-icons/tb';
import { MdArrowBack } from 'react-icons/md';
import './DBMountModal.scss';

export const DBMountModal = ({ setIsOpen, pRefresh }: { setIsOpen: (status: boolean) => void; pRefresh: () => void }) => {
    const [mountDBInfo, setMountDBInfo] = useState<{ name: string; path: string }>({ name: '', path: '' });
    const [mountState, setMountState] = useState<undefined | string>(undefined);
    const [defaultPath, setDefaultPath] = useState<string | undefined>(undefined);
    const [mountLoad, setMountLoad] = useState<boolean>(false);
    const [modalStep, setModalStep] = useState<'MOUNT' | 'CONFIG'>('MOUNT');
    const [savedLocalDBPath, setSavedLocalDBPath] = useState(localStorage.getItem('DBPath'));
    const [isBackupDropBox, setIsBackupDropBox] = useState<boolean>(true);
    const [backupList, setBackupList] = useState<any[]>([]);

    /** Handle modal step */
    const handleModalSetp = (step: 'CONFIG' | 'MOUNT') => {
        // set step
        setModalStep(step);
    };
    /** Handle Custom Path */
    const handleCustomPath = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSavedLocalDBPath(e.target.value);
    };
    /** Save custom path */
    const saveCustomPath = () => {
        if (!savedLocalDBPath) return localStorage.removeItem('DBPath');
        localStorage.setItem('DBPath', savedLocalDBPath);
    };
    /** Close Modal */
    const handleClose = () => {
        setIsOpen(false);
    };
    /** Check win or linux absolute path */
    const checkRoot = (path: string): boolean => {
        const rootExp = new RegExp('^[cC/]', 'gm');
        const expRes = path.match(rootExp);
        if (expRes && expRes?.length > 0) return true;
        return false;
    };
    /** Get relative path */
    const getRelativePath = (): string => {
        const basePath = savedLocalDBPath && savedLocalDBPath !== '' ? savedLocalDBPath : defaultPath;
        return basePath + '/' + mountDBInfo.path;
    };
    /** Mount database */
    const handleMount = async () => {
        if (mountDBInfo.name === '' || mountDBInfo.path === '') return;
        setMountLoad(true);
        setMountState(undefined);
        const rootPath = checkRoot(mountDBInfo.path) ? mountDBInfo.path : getRelativePath();
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
    /** Get default dbs path */
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
    /** Get backup database list */
    const getBackupDBList = async (path: string) => {
        const backupListRes: any = await backupDBList(path);
        if (backupListRes && backupListRes?.success) setBackupList(backupListRes.data);
        else
            setBackupList([
                // { name: 'backup1' }, { name: 'backup2' }
            ]);
    };
    /** Select backup item */
    const selectBackupItem = (backupItem: any) => {
        // set mountDBInfo
        setMountDBInfo({ ...mountDBInfo, path: backupItem.name });
        // auto close
        // setIsBackupDropBox(false);
    };
    /** Handle backup dropbox */
    const handleBackupDropbox = () => {
        !isBackupDropBox && getBackupDBList(savedLocalDBPath && savedLocalDBPath !== '' ? savedLocalDBPath : defaultPath ?? '');
        setIsBackupDropBox(!isBackupDropBox);
    };
    /** */
    const init = async () => {
        const dbsPath = await getPath();
        getBackupDBList(savedLocalDBPath && savedLocalDBPath !== '' ? savedLocalDBPath : dbsPath ?? '');
        setDefaultPath(dbPathParser(dbsPath));
    };

    useEffect(() => {
        init();
    }, []);

    return (
        <div className="db-mount-modal">
            {modalStep === 'MOUNT' && (
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
                                            <div style={{ marginLeft: '4px', display: 'flex', fontSize: '12px', color: '#9d9d9d', cursor: 'default' }}>
                                                ({savedLocalDBPath && savedLocalDBPath !== '' ? savedLocalDBPath : defaultPath})
                                            </div>
                                        </div>
                                        <IconButton
                                            pIsToopTip
                                            pToolTipContent="Configure path"
                                            pToolTipId="mount-database-modal-path"
                                            pHeight={18}
                                            pIcon={<TbPencilCog />}
                                            onClick={() => handleModalSetp('CONFIG')}
                                        />
                                    </div>
                                    <div className={`input-wrapper input-wrapper-dark`} style={{ paddingRight: '0px' }}>
                                        <input
                                            onChange={(e) => handleMountDBInfo('path', e)}
                                            value={mountDBInfo.path}
                                            onKeyDown={handleEnter}
                                            style={{ width: 'calc(100% - 34px)' }}
                                        />
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                width: '34px',
                                                height: '34px',
                                                borderLeft: 'solid 1px #61636C',
                                            }}
                                        >
                                            <IconButton pIcon={isBackupDropBox ? <Close size={12} /> : <ArrowDown size={12} />} onClick={handleBackupDropbox} />
                                        </div>
                                    </div>
                                    {/* Backup database list */}
                                    {isBackupDropBox && (
                                        <div className="backup-db-list-wrap">
                                            {backupList.length > 0 ? (
                                                backupList.map((backupItem: any, idx: number) => {
                                                    return (
                                                        <button className="backup-db-item" key={idx} onClick={() => selectBackupItem(backupItem)}>
                                                            <span>{backupItem?.name ?? ''}</span>
                                                        </button>
                                                    );
                                                })
                                            ) : (
                                                // no data
                                                <button className="backup-db-item">
                                                    <span>no-data</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
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
            )}
            {modalStep === 'CONFIG' && (
                <Modal pIsDarkMode onOutSideClose={handleClose}>
                    <Modal.Header>
                        <div className="title">
                            <div className="title-content">
                                <span>Configure Path</span>
                            </div>
                            <MdArrowBack onClick={() => handleModalSetp('MOUNT')} />
                        </div>
                    </Modal.Header>
                    <Modal.Body>
                        <div className={'file-dark'}>
                            <div className={`file-dark-content`}>
                                <div className={`file-dark-content-name`}>
                                    <div className={`file-dark-content-name-wrap`}>
                                        <span>Path</span>
                                    </div>
                                    <div className={`input-wrapper input-wrapper-dark`}>
                                        <input autoFocus onChange={handleCustomPath} value={savedLocalDBPath ?? ''} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <div className="button-group">
                            <TextButton pText="Save" pBackgroundColor="#4199ff" pIsDisabled={mountLoad} onClick={saveCustomPath} pIsLoad={mountLoad} />
                            <div style={{ width: '10px' }}></div>
                            <TextButton pText="Backward" pBackgroundColor="#666979" onClick={() => handleModalSetp('MOUNT')} />
                        </div>
                    </Modal.Footer>
                </Modal>
            )}
        </div>
    );
};
