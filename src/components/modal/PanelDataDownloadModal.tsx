import { useState, useEffect, useRef } from 'react';
import { getFileList, postFileList } from '@/api/repository/api';
import { fetchMountTimeMinMax, fetchTimeMinMax, getTqlChart } from '@/api/repository/machiot';
import Modal from './Modal';
import { gFileTree } from '@/recoil/fileTree';
import './SaveDashboardModal.scss';
import { gRollupTableList } from '@/recoil/recoil';
import { useRecoilState, useRecoilValue } from 'recoil';
import { elapsedTime, elapsedSize } from '@/utils';
import { FileType, FileTreeType, fileTreeParser } from '@/utils/fileTreeParser';
import { getFiles as getFilesTree, deleteFile as deleteContextFile } from '@/api/repository/fileTree';
import { Menu } from '@/components/contextMenu/Menu';
import useOutsideClick from '@/hooks/useOutsideClick';
import { Error, Success } from '@/components/toast/Toast';
import { Home, TreeFolder, Delete, Download, Play, Search, Close, ArrowLeft, ArrowRight, NewFolder } from '@/assets/icons/Icon';
import icons from '@/utils/icons';
import { TextButton } from '../buttons/TextButton';
import { calcInterval, CheckObjectKey, setUnitTime } from '@/utils/dashboardUtil';
import { timeMinMaxConverter } from '@/utils/bgnEndTimeRange';
import { DashboardQueryParser, SqlResDataType } from '@/utils/DashboardQueryParser';
import { Select } from '@/components/inputs/Select';
import { chartTypeConverter } from '@/utils/eChartHelper';
import { IconButton } from '../buttons/IconButton';

export interface PanelDataDownloadModalProps {
    setIsOpen: any;
    pIsDarkMode?: boolean;
    pPanelInfo: any;
    pDashboardTime: any;
}

export const PanelDataDownloadModal = (props: PanelDataDownloadModalProps) => {
    const { setIsOpen, pIsDarkMode, pPanelInfo, pDashboardTime } = props;
    const [sSelectedDir, setSelectedDir] = useState<string[]>([]);
    const [sDeletePath, setDeletePath] = useState<string[]>([]);
    const [sSelectedFile, setSelectedFile] = useState<any>();
    const [sFileList, setFileList] = useState<any[]>([]);
    const [sFilterFileList, setFilterFileList] = useState<any[]>([]);
    const [sSaveFileName, setSaveFileName] = useState<string>('');
    const [sMenuX, setMenuX] = useState<number>(0);
    const [sMenuY, setMenuY] = useState<number>(0);
    const [sIsContextMenu, setIsContextMenu] = useState<boolean>(false);
    const [sSearchText, setSearchText] = useState<string>('');
    const [sIsSearchMode, setIsSearchMode] = useState<boolean>(false);
    const MenuRef = useRef<HTMLDivElement>(null);
    const [sFileTree, setFileTree] = useRecoilState(gFileTree);
    const sRollupTableList = useRecoilValue(gRollupTableList);
    const [sOutput, setOutput] = useState<'DATA(JSON)' | 'DATA(CSV)'>('DATA(JSON)');
    const [sBlockList, setBlockList] = useState<any>([]);
    const [sSelectedBlock, setSelectedBlock] = useState<any>({ idx: -1, name: 'All', value: 'All' });
    const [sIsDownloading, setIsDownloading] = useState<boolean>(false);

    const defaultMinMax = () => {
        const now = Date.now();
        return { min: Math.floor(now - 60 * 60 * 1000), max: Math.floor(now) };
    };

    const fetchTableTimeMinMax = async (): Promise<{ min: number; max: number }> => {
        const sTargetTag = pPanelInfo?.blockList?.[0] ?? { tag: '' };
        const hasName = sTargetTag.tag && sTargetTag.tag !== '';
        const customName = sTargetTag.filter?.filter((aFilter: any) => {
            if (aFilter.column === 'NAME' && (aFilter.operator === '=' || aFilter.operator === 'in') && aFilter.value && aFilter.value !== '') return aFilter;
        })?.[0]?.value;
        if (hasName || (sTargetTag.useCustom && customName)) {
            if (sTargetTag.customTable) return defaultMinMax();
            let rows: any = undefined;
            if (sTargetTag.table?.split('.')?.length > 2) rows = await fetchMountTimeMinMax(sTargetTag);
            else rows = sTargetTag.useCustom ? await fetchTimeMinMax({ ...sTargetTag, tag: customName }) : await fetchTimeMinMax(sTargetTag);
            const res = { min: Math.floor(rows?.[0]?.[0] / 1000000), max: Math.floor(rows?.[0]?.[1] / 1000000) };
            if (!Number(res.min) || !Number(res.max)) return defaultMinMax();
            return res;
        }
        return defaultMinMax();
    };

    const resolveTimeRange = async () => {
        // Determine which time strings to use (panel custom vs dashboard)
        const startRaw = pPanelInfo.useCustomTime ? pPanelInfo.timeRange.start ?? '' : pDashboardTime.start;
        const endRaw = pPanelInfo.useCustomTime ? pPanelInfo.timeRange.end ?? '' : pDashboardTime.end;

        // If both are numeric, return directly
        if (!isNaN(Number(startRaw)) && !isNaN(Number(endRaw))) return { min: Number(startRaw), max: Number(endRaw) };

        // Fetch dataset min/max so 'last-*' can anchor to data's last timestamp
        const svr = await fetchTableTimeMinMax();
        const mm = timeMinMaxConverter(startRaw, endRaw, svr) ?? { min: setUnitTime(startRaw), max: setUnitTime(endRaw) };
        return mm;
    };

    const GetQuery = async () => {
        const { min: sStartTime, max: sEndTime } = await resolveTimeRange();
        const sIntervalInfo = pPanelInfo.isAxisInterval ? pPanelInfo.axisInterval : calcInterval(sStartTime, sEndTime, pPanelInfo.w * 50);
        const [sParsedQuery, sAliasList, sInjectionSrc] = DashboardQueryParser(
            chartTypeConverter(pPanelInfo.type),
            SqlResDataType(pPanelInfo.type),
            pPanelInfo.blockList,
            pPanelInfo.transformBlockList,
            sRollupTableList,
            pPanelInfo.xAxisOptions,
            {
                interval: sIntervalInfo,
                start: sStartTime,
                end: sEndTime,
            },
            undefined,
            true
        );

        return [sParsedQuery, sAliasList, sInjectionSrc];
    };

    const SetBlockAliasList = async () => {
        const [_, sAliasList] = await GetQuery();
        setBlockList(sAliasList as any);
    };

    const handleClose = () => {
        setIsOpen(false);
    };

    const getFiles = async (aPathArr?: any) => {
        const sData = await getFileList('', aPathArr ? aPathArr.join('/') : sSelectedDir.join('/'), '');
        setFileList(sData.data?.children ?? []);
        setFilterFileList(sData.data.children ?? []);
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
                break;
            case 2:
                handleForwardPath(aItem.name, true);
                if (aItem.type !== 'dir') setFilterFileList(sFileList);
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
            getFiles(currentPath);
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
        if (aName && !aName.includes('.')) { // Only navigate into directories
            currentPath.push(aName);
            setSelectedDir([...currentPath]);
            if (deletePath.length > 0) {
                deletePath.pop();
                setDeletePath(deletePath);
                const sData = await getFileList('', currentPath.join('/'), '');
                setFileList(sData.data?.children ?? []);
                setFilterFileList(sData.data.children ?? []);
            } else {
                getFiles(currentPath);
            }
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
        getFiles();
        updateFileTree('/');
    };

    const onContextMenu = (e: React.MouseEvent, file: FileType | FileTreeType) => {
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
            const sResult: any = await deleteContextFile(sSelectedDir.join('/'), sSelectedFile.name);
            if (sResult.reason === 'success') {
                getFiles();
                const sPath = sSelectedDir.length > 0 ? '/' + sSelectedDir.join('/') + '/' : '/';
                updateFileTree(sPath);
            } else {
                Error('delete fail');
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

    const HandleOutput = (aValue: 'DATA(JSON)' | 'DATA(CSV)') => {
        setOutput(aValue);
    };

    const HandleBlockSelection = (aEvent: any) => {
        const selectedValue = aEvent.target.value;
        if (selectedValue === 'All') {
            setSelectedBlock({ idx: -1, name: 'All', value: 'All' });
        } else {
            const blockIndex = sBlockList.findIndex((block: any) => block.name === selectedValue);
            setSelectedBlock({
                idx: blockIndex,
                name: selectedValue,
                value: selectedValue
            });
        }
    };

    const GetSaveDataText = async (blockIndex: number) => {
        const [sParsedQuery] = await GetQuery();
        const sOutputStr: string = sOutput === 'DATA(JSON)' ? 'JSON()' : 'CSV()';
        const sTargetItem = sParsedQuery[blockIndex];
        let sResult = '';
        if (CheckObjectKey(sTargetItem, 'trx')) {
            sResult = sTargetItem.sql + '\n' + sOutputStr;
        } else sResult = `SQL("${sTargetItem.sql}")\n` + sOutputStr;
        return sResult;
    };

    const GetDataForBlock = async (blockIndex: number): Promise<string> => {
        try {
            const [sParsedQuery] = await GetQuery();
            if (!sParsedQuery || blockIndex >= sParsedQuery.length) {
                throw new (Error as any)(`Invalid block index: ${blockIndex}`);
            }

            const sTargetItem = sParsedQuery[blockIndex];
            if (!sTargetItem || !sTargetItem.sql) {
                throw new (Error as any)(`No SQL query found for block ${blockIndex}`);
            }

            const sTqlQuery = await GetSaveDataText(blockIndex);

            const sResult: any = await getTqlChart(sTqlQuery);
            
            if (sResult?.status === 200 && sResult?.data !== undefined) {
                return typeof sResult.data === 'string' ? sResult.data : JSON.stringify(sResult.data);
            } else {
                throw new (Error as any)(`Failed to fetch data: ${sResult?.statusText || 'Unknown error'}`);
            }
        } catch (error) {
            const errorMessage = error instanceof (Error as any) ? (error as any).message : 'Unknown error';
            Error(`Failed to fetch data for block ${blockIndex + 1}: ${errorMessage}`);
            throw error;
        }
    };

    const saveToServer = async (content: string, filename: string) => {
        try {
            const sResult: any = await postFileList(content, sSelectedDir.join('/'), filename);
            if (sResult.success) {
                return true;
            } else {
                throw new (Error as any)('Failed to save file to server');
            }
        } catch (error) {
            throw error;
        }
    };

    const downloadFileClient = (content: string, filename: string) => {
        const sBlob = new Blob([content], { 
            type: sOutput === 'DATA(JSON)' ? 'application/json' : 'text/csv' 
        });
        const sLink = document.createElement('a');
        sLink.href = URL.createObjectURL(sBlob);
        sLink.setAttribute('download', filename);
        sLink.click();
        URL.revokeObjectURL(sLink.href);
    };

    const handleDownload = async () => {
        if (sBlockList.length === 0) return;
        
        setIsDownloading(true);
        let successCount = 0;
        let errorCount = 0;
        
        try {
            // Determine which blocks to download
            const blocksToDownload = sSelectedBlock.idx === -1 
                ? Array.from({ length: sBlockList.length }, (_, index) => index)  // All blocks
                : [sSelectedBlock.idx];  // Single selected block

            for (const blockIndex of blocksToDownload) {
                try {
                    const blockInfo = sBlockList[blockIndex];
                    if (!blockInfo) {
                        Error(`Block not found at index ${blockIndex}`);
                        errorCount++;
                        continue;
                    }

                    const data = await GetDataForBlock(blockIndex);
                    
                    if (data) {
                        const extension = sOutput === 'DATA(JSON)' ? 'json' : 'csv';
                        let filename: string;
                        
                        if (sSelectedBlock.idx === -1) {
                            // All blocks selected - use base filename with numbering
                            const baseFileName = sSaveFileName.trim() || 
                                (pPanelInfo.title || 'panel_data').replace(/[^a-zA-Z0-9_-]/g, '_');
                            const baseWithoutExt = baseFileName.replace(/\.(json|csv)$/i, '');
                            const blockNumber = blockIndex + 1;
                            filename = `${baseWithoutExt}_${blockNumber}.${extension}`;
                        } else {
                            // Single block selected - use filename as is
                            const baseFileName = sSaveFileName.trim() || 
                                (pPanelInfo.title || 'panel_data').replace(/[^a-zA-Z0-9_-]/g, '_');
                            const baseWithoutExt = baseFileName.replace(/\.(json|csv)$/i, '');
                            filename = `${baseWithoutExt}.${extension}`;
                        }
                        
                        try {
                            await saveToServer(data, filename);
                            downloadFileClient(data, filename);
                            successCount++;
                        } catch (saveError) {
                            downloadFileClient(data, filename);
                            successCount++;
                        }
                        
                        // Add small delay between downloads to prevent browser issues
                        if (blocksToDownload.length > 1) {
                            await new Promise(resolve => setTimeout(resolve, 200));
                        }
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    Error(`Failed to download block ${blockIndex + 1}`);
                    errorCount++;
                }
            }
            
            // Show success/error messages
            if (successCount > 0) {
                Success(`Successfully downloaded ${successCount} file${successCount > 1 ? 's' : ''}`);
            }
            if (errorCount > 0) {
                Error(`Failed to download ${errorCount} file${errorCount > 1 ? 's' : ''}`);
            }
            
        } catch (error) {
            Error('Download failed. Please try again.');
        } finally {
            setIsDownloading(false);
            if (successCount > 0 || (errorCount > 0 && successCount === 0)) {
                handleClose();
            }
        }
    };

    useEffect(() => {
        SetBlockAliasList();
        setSaveFileName(`${pPanelInfo.title !== '' ? pPanelInfo.title : 'panel_data'}`);
        getFiles();
    }, []);

    useOutsideClick(MenuRef, () => setIsContextMenu(false));

    return (
        <div className="tql">
            <Modal pIsDarkMode={pIsDarkMode} onOutSideClose={handleClose}>
                <Modal.Header>
                    <div className="title">
                        <div className="title-content">
                            <Download />
                            <span>Download Panel Data</span>
                        </div>
                        <Close onClick={handleClose} />
                    </div>
                    <div className="tool-bar">
                        <div className={`tool-bar-content ${pIsDarkMode ? 'dark dark-border' : ''} ${sSelectedDir.length > 0 ? 'active' : ''}`} onClick={() => handleBackPath()}>
                            <IconButton pIsToopTip pToolTipContent="Backward" pToolTipId="download-modal-backward" pIcon={<ArrowLeft />} onClick={() => null} />
                        </div>
                        <div
                            className={`tool-bar-content ${pIsDarkMode ? 'dark dark-border' : ''} ${sDeletePath.length > 0 ? 'active' : ''}`}
                            style={{ marginLeft: '8px' }}
                            onClick={() => handleForwardPath(sDeletePath[sDeletePath.length - 1])}
                        >
                            <IconButton pIsToopTip pToolTipContent="Forward" pToolTipId="download-modal-forward" pIcon={<ArrowRight />} onClick={() => null} />
                        </div>
                        <div className={`input-wrapper ${pIsDarkMode ? 'input-wrapper-dark dark' : ''}`} style={{ marginLeft: '1rem' }}>
                            {sIsSearchMode ? (
                                <Search style={{ cursor: 'default' }} />
                            ) : (
                                <>
                                    <Home style={{ cursor: 'default' }} />
                                    <Play style={{ cursor: 'default' }} />
                                </>
                            )}
                            {sIsSearchMode ? (
                                <input onChange={changeSearchText} value={sSearchText} />
                            ) : (
                                <input readOnly value={sSelectedDir.join(' / ')} style={{ cursor: 'default' }} />
                            )}
                        </div>
                        <div className={`file-button ${pIsDarkMode ? 'dark' : ''}`} onClick={() => setIsSearchMode(!sIsSearchMode)}>
                            <IconButton pIsToopTip pToolTipContent="Search" pToolTipId="download-modal-search" pIcon={<Search size={20} />} onClick={() => null} />
                        </div>
                        <div className={`file-button ${pIsDarkMode ? 'dark' : ''}`} onClick={makeFolder}>
                            <IconButton pIsToopTip pToolTipContent="New folder" pToolTipId="download-modal-new-folder" pIcon={<NewFolder size={28} />} onClick={() => null} />
                        </div>
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <div className={`${pIsDarkMode ? 'file-broswer-dark' : 'file-broswer'}`}>
                        <div className={`${pIsDarkMode ? 'file-broswer-dark-header' : 'file-broswer-header'}`}>
                            <span style={{ width: '48%', paddingLeft: '1.5rem' }}>Name</span>
                            <span style={{ width: '32%' }}>Last modified</span>
                            <span style={{ width: '20%' }}>Size</span>
                        </div>
                        <div className={`${pIsDarkMode ? 'file-broswer-dark-content' : 'file-broswer-content'}`}>
                            {sFilterFileList &&
                                sFilterFileList.map((aItem, aIdx) => {
                                    return (
                                        <div
                                            key={aItem.name + aIdx}
                                            onContextMenu={(aEvent) => onContextMenu(aEvent, aItem)}
                                            className={`row ${sSelectedFile && sSelectedFile.name === aItem.name ? 'selected' : ''}`}
                                            onClick={(aEvent) => handleSelectFile(aEvent, aItem)}
                                        >
                                            <div className="pl list-wrapper">
                                                <div className="pl-icon">
                                                    {aItem.type === 'dir' ? (
                                                        aItem.gitClone ? (
                                                            icons('gitClosedDirectory')
                                                        ) : (
                                                            <TreeFolder height={100} />
                                                        )
                                                    ) : (
                                                        icons(aItem.type.replace('.', ''))
                                                    )}
                                                </div>
                                                <span>{aItem.name}</span>
                                            </div>
                                            <span className="pl" style={{ width: '32%' }}>
                                                {elapsedTime(aItem.lastModifiedUnixMillis)}
                                            </span>
                                            <span className="pl" style={{ width: '20%' }}>
                                                {elapsedSize(aItem.size)}
                                            </span>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <div className="save-option">
                        <div className="save-file-name">
                            <span>File Name</span>
                            <div className={`input-wrapper ${pIsDarkMode ? 'input-wrapper-dark' : ''}`}>
                                <input autoFocus onChange={changeSaveFileName} value={sSaveFileName}></input>
                            </div>
                        </div>
                        <div className="save-file-data">
                            <span>Output</span>
                            <Select
                                pFontSize={12}
                                pAutoChanged={true}
                                pWidth={175}
                                pBorderRadius={8}
                                pInitValue={sOutput}
                                pHeight={33}
                                onChange={(aEvent: any) => HandleOutput(aEvent.target.value)}
                                pOptions={['DATA(JSON)', 'DATA(CSV)']}
                            />
                        </div>
                        <div className="save-file-block">
                            <span>Block</span>
                            <Select
                                pFontSize={12}
                                pAutoChanged={true}
                                pWidth={175}
                                pBorderRadius={8}
                                pInitValue={sSelectedBlock.value}
                                pHeight={33}
                                onChange={HandleBlockSelection}
                                pOptions={['All', ...sBlockList.map((aAlias: any) => aAlias.name)]}
                            />
                        </div>
                    </div>
                    <div className="button-group">
                        <TextButton
                            pText={sIsDownloading ? "Downloading..." : "Download"}
                            pBackgroundColor="#4199ff"
                            pIsDisabled={sBlockList.length === 0 || sIsDownloading}
                            onClick={handleDownload}
                        />
                        <div style={{ width: '10px' }}></div>
                        <TextButton pText="Cancel" pBackgroundColor="#666979" onClick={handleClose} />
                    </div>
                </Modal.Footer>
            </Modal>
            <div ref={MenuRef} className="save-dashboard-context-menu" style={{ top: sMenuY, left: sMenuX }}>
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
        </div>
    );
};
