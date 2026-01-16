import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, FolderOpen, Home, TreeFolder, Play } from '@/assets/icons/Icon';
import { elapsedSize, elapsedTime } from '@/utils';
import { getFileList } from '@/api/repository/api';
import { useRecoilState } from 'recoil';
import { gRecentModalPath } from '@/recoil/fileTree';
import icons from '@/utils/icons';
import { Button, Modal, FileListHeader } from '@/design-system/components';
import './SelectFileBtn.scss';

export const SelectFileBtn = ({ btnTxt, pType, pCallback }: { pType: string; btnTxt?: string; pCallback: (aTqlPath: string) => void }) => {
    const [sOpen, setOpen] = useState<boolean>(false);
    const [sSelectedDir, setSelectedDir] = useState<string[]>([]);
    const [sSelectedFile, setSelectedFile] = useState<any>();
    const [sFileList, setFileList] = useState<any[]>([]);
    const [sModalPath, setModalPath] = useRecoilState(gRecentModalPath);
    const [sDeletePath, setDeletePath] = useState<string[]>([]);

    const getFiles = async () => {
        const sData = await getFileList(`?filter=*.${pType}`, sSelectedDir.join('/'), '');
        setFileList(sData.data?.children ?? []);
    };
    const handleSave = () => {
        const sTargetPath = '/' + sSelectedDir.join('/') + '/' + sSelectedFile;
        const fullPath = sTargetPath
            .split('/')
            .filter((aPath: string) => aPath !== '')
            .join('/');
        pCallback(fullPath);
        setModalPath('/' + sSelectedDir.join('/') + '/');
        setOpen(false);
    };
    const handleSelectFile = (aEvent: React.MouseEvent<HTMLDivElement>, aItem: any) => {
        const currentPath = JSON.parse(JSON.stringify(sSelectedDir));

        switch (aEvent.detail) {
            // click
            case 1: {
                if (!aItem.isDir) setSelectedFile(aItem.name);
                return;
            }
            // double click
            case 2: {
                // dir type
                if (aItem.isDir) {
                    setDeletePath([]);
                    currentPath.push(aItem.name);
                    setSelectedDir([...currentPath]);
                    return;
                }
                // file type
                else {
                    handleSave();
                    return;
                }
            }
        }
    };
    const handleBackPath = () => {
        if (sSelectedDir.length === 0) return;
        const sOldPath = JSON.parse(JSON.stringify(sSelectedDir));
        const sForwardPath = JSON.parse(JSON.stringify(sDeletePath));
        const sBackItem = sOldPath.at(-1);
        const sCurPath = sOldPath.slice(0, sSelectedDir.length - 1);
        setDeletePath([...sForwardPath, sBackItem]);
        setSelectedDir([...sCurPath]);
    };
    const handleForwardPath = async () => {
        if (sDeletePath.length === 0) return;
        const sOldForwardPath = JSON.parse(JSON.stringify(sDeletePath));
        const sForwardItem = sOldForwardPath.pop();
        const sOldPath = JSON.parse(JSON.stringify(sSelectedDir));
        setDeletePath(sOldForwardPath);
        setSelectedDir([...sOldPath, sForwardItem]);
    };
    const handleDirectPath = (aPath: string) => {
        if (sSelectedDir.at(-1) === aPath) return;
        const sOldPath = JSON.parse(JSON.stringify(sSelectedDir));
        const sBackItemList = sOldPath.splice(sOldPath.findIndex((bPath: string) => aPath === bPath) + 1, sOldPath.length);
        setDeletePath([...sBackItemList.reverse()]);
        if (aPath === '') {
            setSelectedDir([]);
        } else {
            const sCurPath = sOldPath.slice(0, sOldPath.findIndex((bPath: string) => aPath === bPath) + 1);
            setSelectedDir([...sCurPath]);
        }
    };
    const initPathNFile = () => {
        setDeletePath([]);
        setSelectedDir(sModalPath.split('/').filter((aPath: string) => !!aPath));
        setSelectedFile('');
    };

    useEffect(() => {
        if (sOpen) {
            initPathNFile();
            getFiles();
        }
    }, [sOpen]);
    useEffect(() => {
        getFiles();
    }, [sSelectedDir]);

    return (
        <>
            <Button size="md" variant="secondary" onClick={() => setOpen(true)}>
                {btnTxt ?? 'Select file'}
            </Button>

            {sOpen && (
                <Modal.Root isOpen={true} onClose={() => setOpen(false)} size="md">
                    <Modal.Header>
                        <Modal.Title>
                            <FolderOpen />
                            <span>Open</span>
                        </Modal.Title>
                        <Modal.Close />
                    </Modal.Header>

                    {/* Navigation Bar */}
                    <div className="select-file-btn__nav">
                        <Button
                            size="sm"
                            variant="ghost"
                            active={sSelectedDir.length > 0}
                            isToolTip
                            toolTipContent="Backward"
                            icon={<ArrowLeft size={16} />}
                            onClick={() => handleBackPath()}
                        />
                        <Button
                            size="sm"
                            variant="ghost"
                            active={sDeletePath.length > 0}
                            isToolTip
                            toolTipContent="Forward"
                            icon={<ArrowRight size={16} />}
                            onClick={() => handleForwardPath()}
                        />
                        <div className="select-file-btn__breadcrumb">
                            <div className="select-file-btn__breadcrumb-item" onClick={() => handleDirectPath('')}>
                                <Home size={14} />
                            </div>
                            {sSelectedDir.map((aDir: string) => {
                                return (
                                    <div key={aDir} className="select-file-btn__breadcrumb-wrapper">
                                        <Play size={14} className="select-file-btn__breadcrumb-separator" />
                                        <div className="select-file-btn__breadcrumb-item" onClick={() => handleDirectPath(aDir)}>
                                            {aDir}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <FileListHeader />

                    {/* File List */}
                    <Modal.Body style={{ padding: 0 }}>
                        <div className="select-file-btn__file-list">
                            {sFileList &&
                                sFileList.map((aItem, aIdx) => {
                                    const isSelected = sSelectedFile && sSelectedFile === aItem.name;
                                    return (
                                        <div
                                            key={aItem.name + aIdx}
                                            className={`select-file-btn__file-row ${isSelected ? 'select-file-btn__file-row--selected' : ''}`}
                                            onClick={(aEvent) => handleSelectFile(aEvent, aItem)}
                                        >
                                            <div className="select-file-btn__file-name">
                                                {aItem.type === 'dir' ? (
                                                    aItem.gitClone ? (
                                                        <Button forceOpacity disabled size="sm" variant="none" icon={icons('gitClosedDirectory')} />
                                                    ) : (
                                                        <Button forceOpacity disabled size="sm" variant="none" icon={<TreeFolder />} />
                                                    )
                                                ) : (
                                                    <Button forceOpacity disabled size="sm" variant="none" icon={icons(aItem.type.replace('.', ''))} />
                                                )}
                                                <span>{aItem.name}</span>
                                            </div>
                                            <span className="select-file-btn__file-modified">{elapsedTime(aItem.lastModifiedUnixMillis)}</span>
                                            <span className="select-file-btn__file-size">{elapsedSize(aItem.size)}</span>
                                        </div>
                                    );
                                })}
                        </div>
                    </Modal.Body>

                    {/* Footer */}
                    <Modal.Footer>
                        <Button.Group>
                            <Modal.Confirm onClick={handleSave}>OK</Modal.Confirm>
                            <Modal.Cancel>Cancel</Modal.Cancel>
                        </Button.Group>
                    </Modal.Footer>
                </Modal.Root>
            )}
        </>
    );
};
