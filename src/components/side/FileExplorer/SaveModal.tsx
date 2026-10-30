import { useAbortController } from '@/hooks/useAbortController';
import { applyFileReadResult, applySaveAsResult, invalidateFileSaveResult } from '@/utils/boardSaveResult';
import { saveBoardFile, type BoardFileSaveContext } from '@/utils/boardFileSave';
import { useState, useEffect, useRef } from 'react';
import { recordRecentFile } from '@/utils/recentFiles';
import { getFileList, postFileList } from '@/api/repository/api';
import { gFileTree, gRecentModalPath } from '@/recoil/fileTree';
import { gBoardList, gSelectedBoard, gSelectedTab, type GBoardListType } from '@/recoil/recoil';
import { useRecoilState, useRecoilValue, useSetRecoilState, useRecoilCallback } from 'recoil';
import { getId, extractionExtension, elapsedTime, elapsedSize } from '@/utils';
import { FileType, FileTreeType, fileTreeParser } from '@/utils/fileTreeParser';
import { getFiles as getFilesTree, deleteFile as deleteContextFile } from '@/api/repository/fileTree';
import { Menu } from '@/components/contextMenu/Menu';
import useOutsideClick from '@/hooks/useOutsideClick';
import { Toast } from '@/design-system/components';
import { Home, TreeFolder, Delete, Download, Play, Search, Save, Close, ArrowLeft, ArrowRight, TbFolderPlus, FolderOpen } from '@/assets/icons/Icon';
import icons from '@/utils/icons';
import EnterCallback from '@/hooks/useEnter';
import { useFileTreeRefresh } from '@/hooks/useFileTreeRefresh';
import { validateName } from '@/utils/fileName';
import { getTypedFileList, resolveOverwrite, type OverwriteDecision } from '@/utils/fileExistence';
import { useOverwritePrompt } from '@/components/modal/useOverwritePrompt';
import { Alert, Button, Input, Modal, FileListHeader } from '@/design-system/components';
import { loadBoardFromFile } from './loadBoardFromFile';
import './SaveModal.scss';
import {useFileMutationTabs} from '@/hooks/useFileMoveTabs';

export interface SaveModalProps {
    setIsOpen: any;
    pIsSave: boolean;
    saveRequests?: ReturnType<typeof useAbortController>;
}

export const SaveModal = (props: SaveModalProps) => {
    const fileMutations = useFileMutationTabs();
    const refreshFileTree = useFileTreeRefresh();
    const { setIsOpen, pIsSave } = props;
    const sLocalSaveRequests = useAbortController();
    const sSaveRequests = props.saveRequests ?? sLocalSaveRequests;
    const [sSelectedDir, setSelectedDir] = useState<string[]>([]);
    const [sDeletePath, setDeletePath] = useState<string[]>([]);
    const [sSelectedFile, setSelectedFile] = useState<any>();
    const [sFileList, setFileList] = useState<any[]>([]);
    const [sFilterFileList, setFilterFileList] = useState<any[]>([]);
    const [sSaveFileName, setSaveFileName] = useState<string>('');
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const setSelectedTab = useSetRecoilState(gSelectedTab);
    const [sMenuX, setMenuX] = useState<number>(0);
    const [sMenuY, setMenuY] = useState<number>(0);
    const [sIsContextMenu, setIsContextMenu] = useState<boolean>(false);
    const [sSearchText, setSearchText] = useState<string>('');
    const [sIsSearchMode, setIsSearchMode] = useState<boolean>(false);
    const MenuRef = useRef<HTMLDivElement>(null);
    const [sFileType, setFileType] = useState<string>('');
    const [sFileTree, setFileTree] = useRecoilState(gFileTree);
    const sSelectedBoard = useRecoilValue(gSelectedBoard);
    // File name, format, content and result updates belong to the tab that
    // opened this dialog, even if a tab shortcut changes the active tab.
    const sSaveOwner = useRef(sSelectedBoard).current;
    const getCurrentBoards = useRecoilCallback(({ snapshot }) => () => snapshot.getLoadable(gBoardList).getValue(), []);
    const isSaveOwner = (board: GBoardListType) => board.id === sSaveOwner?.id &&
        board.path === sSaveOwner.path && board.name === sSaveOwner.name && board.type === sSaveOwner.type;
    const sDialogOpen = useRef(true);
    const sSaveInProgress = useRef(false);
    useEffect(() => {
        sDialogOpen.current = true;
        return () => { sDialogOpen.current = false; };
    }, []);
    const [sModalPath, setModalPath] = useRecoilState(gRecentModalPath);
    const { ask: askOverwrite, prompt: sOverwritePrompt } = useOverwritePrompt();
    const [sSaveError, setSaveError] = useState<string | undefined>(undefined);
    // Read current state when the response arrives. Update the tabs and their
    // selection together if an overwrite removes the active destination tab.
    const applyCurrentTabs = useRecoilCallback(({ snapshot, set }) => (
        update: (boards: GBoardListType[]) => GBoardListType[], ownerId: string,
    ) => {
        const current = snapshot.getLoadable(gBoardList).getValue();
        const next = update(current);
        if (next === current) return;
        set(gBoardList, next);
        set(gSelectedTab, selected => next.some(board => board.id === selected) ? selected : ownerId);
    }, []);

    const sCheckType = (aValue: string) =>
        aValue === 'sql' ||
        aValue === 'tql' ||
        aValue === 'taz' ||
        aValue === 'dsh' ||
        aValue === 'wrk' ||
        aValue === 'json' ||
        aValue === 'csv' ||
        aValue === 'md' ||
        aValue === 'html' ||
        aValue === 'css' ||
        aValue === 'js' ||
        aValue === 'txt';

    useEffect(() => {
        sSaveOwner && sSaveOwner.type ? setFileType(sSaveOwner.type) : setFileType('');
        setSaveFileName(
            sSaveOwner ? (sCheckType(extractionExtension(sSaveOwner.name)) ? sSaveOwner.name : sSaveOwner.name + `.${sSaveOwner.type}`) : `new.${sFileType}`
        );
        const sInitPath = sSaveOwner.path !== '' ? sSaveOwner.path : sModalPath;
        setSelectedDir(sInitPath.split('/').filter((aPath: string) => !!aPath));
        getFiles(
            sSaveOwner.type ?? '',
            sInitPath.split('/').filter((aPath: string) => !!aPath)
        );
    }, []);

    const handleClose = () => {
        // A dismissed dialog may finish saving, but cannot close its successor.
        if (!sDialogOpen.current) return;
        sDialogOpen.current = false;
        setIsOpen(false);
    };

    const getFiles = async (aType: string, aPathArr?: any) => {
        const sDir = aPathArr ? aPathArr.join('/') : sSelectedDir.join('/');
        // r19: type filter applied client-side, case-insensitive (the server ?filter= drops `X.SQL`)
        const sData = pIsSave ? await getTypedFileList(aType, sDir) : await getFileList('', sDir, '');
        setFileList(sData.data?.children ?? []);
        setFilterFileList(sData.data?.children ?? []);
    };

    const changeSaveFileName = (aEvent: React.ChangeEvent<HTMLInputElement>) => {
        setSaveFileName(aEvent.target.value);
    };

    const changeSearchText = (aEvent: React.ChangeEvent<HTMLInputElement>) => {
        const sText = aEvent.target.value;
        setSearchText(sText);
        const sCopyList = JSON.parse(JSON.stringify(sFileList));
        const sFilterList = sCopyList.filter((aItem: any) => aItem.name.toLowerCase().includes(sText.toLowerCase()));
        setFilterFileList(sFilterList);
    };

    const handleSelectFile = (aEvent: React.MouseEvent<HTMLDivElement>, aItem: any) => {
        setSelectedFile(aItem);
        switch (aEvent.detail) {
            case 1:
                aItem.type !== 'dir' ? setSaveFileName(aItem.name) : null;
                break;
            case 2:
                handleForwardPath(aItem.name, true);
                if (aItem.type !== 'dir') {
                    if (pIsSave) setFilterFileList(sFileList);
                    else openFile(aItem);
                }
                break;
            default:
                break;
        }
    };

    const handleBackPath = () => {
        setSelectedFile(null);
        setSearchText('');
        setIsSearchMode(false);
        const currentPath = JSON.parse(JSON.stringify(sSelectedDir));
        const deletePath = JSON.parse(JSON.stringify(sDeletePath));
        if (currentPath.length > 0) {
            deletePath.push(currentPath.pop());
            setSelectedDir(currentPath);
            setDeletePath(deletePath);
            getFiles(sFileType, currentPath);
        }
    };

    const handleForwardPath = async (aName: string, aIsDoubleClick?: boolean) => {
        setSelectedFile(null);
        setSearchText('');
        setIsSearchMode(false);
        const currentPath = JSON.parse(JSON.stringify(sSelectedDir));
        let deletePath = JSON.parse(JSON.stringify(sDeletePath));
        if (aIsDoubleClick && deletePath[deletePath.length - 1] !== aName) {
            deletePath = [];
            setDeletePath([]);
        }
        // extension compared via extractionExtension (lower-case): `X.SQL` is a file, not a folder to enter
        const sIsTypeFile = !!sFileType && extractionExtension(aName) === sFileType.toLowerCase();
        if (aName && !sIsTypeFile) {
            currentPath.push(aName);
            setSelectedDir([...currentPath]);
            if (deletePath.length > 0) {
                deletePath.pop();
                setDeletePath(deletePath);
                const sData = pIsSave ? await getTypedFileList(sFileType, currentPath.join('/')) : await getFileList('', currentPath.join('/'), '');
                setFileList(sData.data?.children ?? []);
                setFilterFileList(sData.data.children ?? []);
            } else {
                getFiles(sFileType, currentPath);
            }
        }
    };

    // No "tab's own file" exception (r12): Save As onto the tab's own file asks too. Only the plain Save of an
    // already-saved tab (MainContent direct save, no dialog) writes without a question.
    // A failed lookup / folder conflict is shown inside this dialog (r13), not as a toast.
    const checkSaveTarget = async (aPath: string, aFileName: string, canSave: () => boolean): Promise<OverwriteDecision> => {
        setSaveError(undefined);
        const sDecision = await resolveOverwrite(aPath, aFileName, name => canSave() ? askOverwrite(name) : Promise.resolve(false), canSave);
        if (canSave() && (sDecision.status === 'folder' || sDecision.status === 'failed')) setSaveError(sDecision.reason);
        return sDecision;
    };

    const saveFile = async () => {
        if (sSaveInProgress.current) return;
        setSaveError(undefined);
        const sCurrentBoards = getCurrentBoards();
        const sTab = sCurrentBoards.find(isSaveOwner);
        if (!sTab) {
            setSaveError('The source tab was closed or changed. Please reopen Save As.');
            return;
        }
        const sOverwriteBoards = new Map(sCurrentBoards.map(board => [board.id, board]));
        const sPath = sSelectedDir.length > 0 ? '/' + sSelectedDir.join('/') + '/' : '/';
        sSaveInProgress.current = true;
        const sSignal = sSaveRequests.createSignal(sTab.id);
        const canSave = (boards = getCurrentBoards()) => sDialogOpen.current && !sSignal.aborted && boards.some(isSaveOwner);
        try {
            let sDecision: OverwriteDecision = {status: 'none'};
            let latestAction = true;
            const sFileName = sSaveFileName;
            const applyTabs = (submitted: any, context: BoardFileSaveContext) => applyCurrentTabs(boards => {
                latestAction = context.isLatestAction;
                // A successful wire write still acknowledges its target, but a
                // dismissed dialog no longer owns the source tab's binding.
                const sourceIsCurrent = latestAction && canSave(boards);
                return applySaveAsResult(boards, {
                    owner: sTab, target: {path: sPath, name: sFileName}, fileType: sFileType,
                    submitted, sourceIsCurrent,
                    confirmed: sDecision.status === 'confirmed', previousBoards: sOverwriteBoards,
                    isSaving: board => context.isSaving(board) || sSaveRequests.hasPendingRequest(board.id),
                });
            }, sTab.id);
            const success = await saveBoardFile({
                board: sTab, target: {path: sPath, name: sFileName}, fileType: sFileType, saveAs: true,
                beforeWrite: async () => {
                    if (!canSave()) return false;
                    sDecision = await checkSaveTarget(sPath, sFileName, canSave);
                    if (sDialogOpen.current && !sSignal.aborted && !getCurrentBoards().some(isSaveOwner)) setSaveError('The source tab was closed or changed. Please reopen Save As.');
                    return canSave() && (sDecision.status === 'none' || sDecision.status === 'confirmed');
                },
                canApply: () => sSaveRequests.isCurrentLifetime(sSignal),
                canWrite: canSave,
                getSaveBoards: getCurrentBoards,
                onFailure: reason => { if (canSave()) setSaveError(current => current ?? reason); },
                onSuccess: applyTabs,
                onRead: loaded => applyCurrentTabs(boards => applyFileReadResult(boards, loaded), sTab.id),
                onUncertain: (target = {path: sPath, name: sFileName}) => applyCurrentTabs(boards => invalidateFileSaveResult(boards, target), sTab.id),
            });
            if (!success || !sDialogOpen.current || sSignal.aborted || !latestAction) return;
            setModalPath(sPath);
            if (sFileType !== 'taz') recordRecentFile({name: sFileName, path: sPath});
            // A file is saved before refreshing the explorer; a slow listing
            // must not postpone its tab metadata or later replace new tabs.
            handleClose();
            await refreshFileTree(sPath + sFileName, () => !sSignal.aborted && sSaveRequests.isCurrentLifetime(sSignal));
        } catch {
            if (!sSignal.aborted) Toast.error('save file fail retry please');
        } finally {
            sSaveInProgress.current = false;
            sSaveRequests.releaseSignal(sSignal, sTab.id);
        }
    };

    const updateFileTree = async (aPath: any) => {
        if (aPath === '/') {
            const sResponseData = await getFileList('', '/', '');
            const sParedData = fileTreeParser(sResponseData.data, '/', 0, '0');
            setFileTree(sParedData as any);
        } else {
            const sPath = sSelectedDir.filter((_, aIdx: number) => aIdx + 1 !== sSelectedDir.length).join('/');
            const sResponseData = await getFileList('', sPath ? '/' + sPath + '/' : '/', sSelectedDir.at(-1) as string);
            const sParedData = fileTreeParser(sResponseData.data, '/' + sSelectedDir.join('/') + '/', sSelectedDir.length, sSelectedDir.at(-1) as string);
            sParedData.parentId = sPath.split('/').at(-1);
            sParedData.path = '/' + sPath + '/';
            const sTmpDir = findDir(sFileTree as FileTreeType, sParedData);
            const sResult = JSON.parse(JSON.stringify(sFileTree));
            sResult.dirs = sTmpDir;
            setFileTree(sResult);
        }
    };

    const findDir = (aOriginDir: FileTreeType, aParedData: FileTreeType): FileTreeType[] => {
        return aOriginDir.dirs.map((aDir: FileTreeType) => {
            if (aDir.name === aParedData.name) {
                return { ...aParedData, parentId: aParedData.path.replaceAll('/', '') };
            } else if (aParedData.path.includes(aDir.name)) {
                return { ...aDir, dirs: findDir(aDir, aParedData) };
            } else return aDir;
        });
    };

    const openFile = async (file: any) => {
        if (!file) {
            Toast.error('please select file');
            return;
        }
        const sExistBoard = getExistBoard(file);
        if (file.isDir) {
            handleForwardPath(file.name);
            return;
        }
        if (sExistBoard) {
            setSelectedTab(sExistBoard.id as string);
        } else {
            const sPath = sSelectedDir.length > 0 ? '/' + sSelectedDir.join('/') + '/' : '/';
            const sTmpId = getId();
            const loaded = await loadBoardFromFile({path: sPath, name: file.name}, sTmpId);
            if (loaded.error !== undefined) {
                Toast.error(loaded.error);
                return;
            }
            setBoardList(boards => [...boards, loaded.board]);
            setSelectedTab(sTmpId);
        }
        handleClose();
    };

    const getExistBoard = (aTargetFile: FileType) => {
        const sPath = sSelectedDir.length > 0 ? '/' + sSelectedDir.join('/') + '/' : '/';
        return sBoardList.filter((aBoard) => aBoard.name === aTargetFile.name && aBoard.path === sPath)[0];
    };

    const makeFolder = () => {
        const sFilterList = sFileList.filter((aItem) => aItem.isDir && aItem.name.startsWith('new'));
        const sPath = sSelectedDir.length > 0 ? '/' + sSelectedDir.join('/') + '/' : '/';

        if (sFilterList.length === 0) {
            postFileList(undefined, sPath, `new`);
        } else {
            const sSortData = sFilterList
                .map((aItem) => {
                    return aItem.name;
                })
                .sort();

            const sData = sSortData.map((aItem, aIdx) => {
                if (aIdx === 0 && aItem === 'new') return true;
                if (aItem.split('-')[1] === String(aIdx)) {
                    return true;
                } else {
                    return false;
                }
            });

            const sIdx = sData.findIndex((aItem) => !aItem);
            if (sIdx === 0) {
                postFileList(undefined, sPath, `new`);
            } else if (sIdx !== -1) {
                postFileList(undefined, sPath, `new-${sIdx}`);
            } else {
                postFileList(undefined, sPath, `new-${sSortData.length}`);
            }
        }
        getFiles(sFileType);
        updateFileTree('/');
    };

    const onContextMenu = (e: React.MouseEvent, file: FileType | FileTreeType) => {
        return;
        e.preventDefault();
        setMenuX(e.pageX);
        setMenuY(e.pageY);
        setIsContextMenu(true);
        setSelectedFile(file);
    };

    const closeContextMenu = () => {
        setIsContextMenu(false);
    };

    const deleteFile = async () => {
        const sConfirm = confirm(`Do you want to delete this file (${sSelectedFile?.name})?`);
        if (sConfirm && sSelectedFile !== undefined) {
            const sResult: any = await deleteContextFile(sSelectedDir.join('/'), sSelectedFile.name, { recursive: false, handlers: fileMutations('/' + [...sSelectedDir, sSelectedFile.name].join('/')) });
            if (sResult.reason === 'success') {
                getFiles(sFileType);
                const sPath = sSelectedDir.length > 0 ? '/' + sSelectedDir.join('/') + '/' : '/';
                updateFileTree(sPath);
            } else {
                Toast.error('delete fail');
            }
        }
        closeContextMenu();
    };

    const downloadFile = async () => {
        if (sSelectedFile !== undefined) {
            const sData: any = await getFilesTree(`${sSelectedDir.join('/')}${sSelectedFile.name}`);
            const sBlob = new Blob([sData], { type: `text/plain` });
            const sLink = document.createElement('a');
            sLink.href = URL.createObjectURL(sBlob);
            sLink.setAttribute('download', sSelectedFile.name);
            sLink.click();
            URL.revokeObjectURL(sLink.href);
            closeContextMenu();
        }
    };

    useOutsideClick(MenuRef, () => setIsContextMenu(false));

    // one name rule (src/utils/fileName.ts): extension compared case-insensitively inside validateName
    const sIsValidSaveName = validateName(sSaveFileName, { kind: 'file', type: sFileType }).ok;

    return (
        <>
            <Modal.Root isOpen={true} onClose={handleClose} size="md" data-testid="file-save-dialog">
                <Modal.Header>
                    <Modal.Title>
                        {pIsSave ? <Save /> : <FolderOpen />}
                        <span>{pIsSave ? 'Save' : 'Open'}</span>
                    </Modal.Title>
                    <Modal.Close />
                </Modal.Header>

                {/* Navigation Bar */}
                <div className="save-modal__nav">
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
                        onClick={() => handleForwardPath(sDeletePath[sDeletePath.length - 1])}
                    />
                    <div style={{ display: 'flex', flex: 1 }}>
                        {sIsSearchMode ? (
                            <Input
                                leftIcon={<Search size={14} />}
                                value={sSearchText}
                                fullWidth
                                onChange={changeSearchText}
                                rightIcon={
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        isToolTip
                                        toolTipContent="Cancel"
                                        icon={<Close size={14} />}
                                        onClick={() => setIsSearchMode(!sIsSearchMode)}
                                    />
                                }
                            />
                        ) : (
                            <Input
                                leftIcon={
                                    <>
                                        <Home size={14} />
                                        <Play size={14} />
                                    </>
                                }
                                fullWidth
                                value={sSelectedDir.join(' / ')}
                                readOnly
                                rightIcon={
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        isToolTip
                                        toolTipContent="Search"
                                        icon={<Search size={14} />}
                                        onClick={() => setIsSearchMode(!sIsSearchMode)}
                                    />
                                }
                            />
                        )}
                    </div>
                    <Button size="sm" variant="ghost" isToolTip toolTipContent="New folder" icon={<TbFolderPlus size={16} />} onClick={makeFolder} />
                </div>

                <FileListHeader />

                {/* File List */}
                <Modal.Body style={{ padding: 0 }}>
                    <div className="save-modal__file-list">
                        {sFilterFileList &&
                            sFilterFileList.map((aItem, aIdx) => {
                                const isSelected = sSelectedFile?.name === aItem.name;
                                return (
                                    <div
                                        key={aItem.name + aIdx}
                                        data-testid={`row-${encodeURIComponent(aItem.name)}`}
                                        className={`save-modal__file-row ${isSelected ? 'save-modal__file-row--selected' : ''}`}
                                        onContextMenu={(aEvent) => onContextMenu(aEvent, aItem)}
                                        onClick={(aEvent) => handleSelectFile(aEvent, aItem)}
                                    >
                                        <div className="save-modal__file-name">
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
                                        <span className="save-modal__file-modified">{elapsedTime(aItem.lastModifiedUnixMillis)}</span>
                                        <span className="save-modal__file-size">{elapsedSize(aItem.size)}</span>
                                    </div>
                                );
                            })}
                    </div>
                </Modal.Body>

                {sSaveError ? (
                    <div data-testid="save-modal-error">
                        <Alert variant="error" message={sSaveError} />
                    </div>
                ) : null}

                {/* Footer */}
                <Modal.Footer style={{ justifyContent: 'space-between' }}>
                    {pIsSave ? (
                        <div className="save-modal__footer-input">
                            <Input
                                data-testid="file-name-input"
                                label="File name"
                                labelPosition="left"
                                value={sSaveFileName}
                                onChange={changeSaveFileName}
                                onKeyDown={(e: any) =>
                                    sIsValidSaveName && pIsSave ? EnterCallback(e, saveFile) : null
                                }
                            />
                        </div>
                    ) : null}
                    <Button.Group>
                        <Modal.Confirm
                            data-testid="apply"
                            disabled={pIsSave && !sIsValidSaveName}
                            onClick={
                                sIsValidSaveName && pIsSave
                                    ? saveFile
                                    : () => openFile(sSelectedFile)
                            }
                        >
                            Apply
                        </Modal.Confirm>
                        <Modal.Cancel>Cancel</Modal.Cancel>
                    </Button.Group>
                </Modal.Footer>
                {sOverwritePrompt}
            </Modal.Root>

            {/* Context Menu */}
            <div ref={MenuRef} className="save-modal__context-menu" style={{ top: sMenuY, left: sMenuX }}>
                <Menu isOpen={sIsContextMenu}>
                    <Menu.Item onClick={deleteFile}>
                        <Delete />
                        <span>Delete</span>
                    </Menu.Item>
                    <Menu.Item onClick={downloadFile}>
                        <Download />
                        <span>Download</span>
                    </Menu.Item>
                </Menu>
            </div>
        </>
    );
};
