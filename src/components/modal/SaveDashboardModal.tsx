import { useState, useEffect, useRef } from 'react';
import { getFileList, postFileList } from '@/api/repository/api';
import Modal from './Modal';
import { gFileTree } from '@/recoil/fileTree';
import './SaveDashboardModal.scss';
import { gBoardList, gRollupTableList } from '@/recoil/recoil';
import { useRecoilState, useRecoilValue } from 'recoil';
import { extractionExtension, elapsedTime, elapsedSize } from '@/utils';
import { FileType, FileTreeType, fileTreeParser } from '@/utils/fileTreeParser';
import { getFiles as getFilesTree, deleteFile as deleteContextFile } from '@/api/repository/fileTree';
import { Menu } from '@/components/contextMenu/Menu';
import useOutsideClick from '@/hooks/useOutsideClick';
import { Error } from '@/components/toast/Toast';
import { Home, TreeFolder, Delete, Download, Play, Search, Save, Close, ArrowLeft, ArrowRight, NewFolder } from '@/assets/icons/Icon';
import icons from '@/utils/icons';
import { TextButton } from '../buttons/TextButton';
import { calcInterval, CheckObjectKey, decodeFormatterFunction, setUnitTime } from '@/utils/dashboardUtil';
import { DashboardQueryParser, SqlResDataType } from '@/utils/DashboardQueryParser';
import { DashboardChartOptionParser } from '@/utils/DashboardChartOptionParser';
import { DashboardChartCodeParser } from '@/utils/DashboardChartCodeParser';
import { Select } from '@/components/inputs/Select';
import { chartTypeConverter } from '@/utils/eChartHelper';
import { FileNameAndExtensionValidator } from '@/utils/FileExtansion';
import { IconButton } from '../buttons/IconButton';
import { VARIABLE_TYPE } from '../dashboard/variable';

export interface SaveDashboardModalProps {
    setIsOpen: any;
    pIsDarkMode?: boolean;
    pPanelInfo: any;
    pDashboardTime: any;
    pVariables: VARIABLE_TYPE[];
}

export const SaveDashboardModal = (props: SaveDashboardModalProps) => {
    const { setIsOpen, pIsDarkMode, pPanelInfo, pDashboardTime, pVariables } = props;
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
    const [sFileType, setFileType] = useState<string>('');
    const [sFileTree, setFileTree] = useRecoilState(gFileTree);
    const sRollupTableList = useRecoilValue(gRollupTableList);
    const [sOutput, setOutput] = useState<'CHART' | 'DATA(JSON)' | 'DATA(CSV)'>('CHART');
    const [sBlockList, setBlockList] = useState<any>([]);
    const [sSelectedBlock, setSelectedBlock] = useState<any>({ idx: 0, name: '', value: '' });
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);

    const GetQuery = () => {
        const sStartTime = pPanelInfo.useCustomTime ? setUnitTime(pPanelInfo.timeRange.start ?? '') : setUnitTime(pDashboardTime.start);
        const sEndTime = pPanelInfo.useCustomTime ? setUnitTime(pPanelInfo.timeRange.end ?? '') : setUnitTime(pDashboardTime.end);
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
            pVariables,
            true
        );

        return [sParsedQuery, sAliasList, sInjectionSrc];
    };
    const GetSaveChartText = () => {
        const [sParsedQuery, sAliasList, sInjectionSrc] = GetQuery();
        const sStartTime = pPanelInfo.useCustomTime ? setUnitTime(pPanelInfo.timeRange.start ?? '') : setUnitTime(pDashboardTime.start);
        const sEndTime = pPanelInfo.useCustomTime ? setUnitTime(pPanelInfo.timeRange.end ?? '') : setUnitTime(pDashboardTime.end);
        const sParsedChartOption = DashboardChartOptionParser(pPanelInfo, sAliasList, { startTime: sStartTime, endTime: sEndTime });
        const sParsedChartCode = DashboardChartCodeParser(pPanelInfo.chartOptions, chartTypeConverter(pPanelInfo.type), sParsedQuery, true);
        const sUsePlg: boolean = !!pPanelInfo.plg;
        let sResult: string = `${sInjectionSrc}\n` + `CHART(\n`;
        if (sUsePlg) sResult += `\tplugins('${pPanelInfo.plg}'),\n`;
        sResult +=
            `\ttheme("${pPanelInfo.theme}"),\n` +
            `\tsize("${pPanelInfo.w * 50}px","${pPanelInfo.h * 40}px"),\n` +
            `\tchartOption(${decodeFormatterFunction(JSON.stringify(sParsedChartOption, null, '\t'))}),\n` +
            `\tchartJSCode(${sParsedChartCode})\n` +
            `)`;
        return sResult;
    };
    const GetSaveDataText = () => {
        const [sParsedQuery] = GetQuery();
        const sOutputStr: string = sOutput === 'CHART' ? `${sOutput}()` : sOutput === 'DATA(JSON)' ? 'JSON()' : 'CSV()';
        const sTargetItem = sParsedQuery[sSelectedBlock.idx];
        let sResult = '';
        if (CheckObjectKey(sTargetItem, 'trx')) {
            sResult = sTargetItem.sql + '\n' + sOutputStr;
        } else sResult = `SQL("${sTargetItem.sql}")\n` + sOutputStr;
        return sResult;
    };
    const SetBlockAliasList = () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_, sAliasList] = GetQuery();
        setBlockList(sAliasList);
    };
    const handleClose = () => {
        setIsOpen(false);
    };

    const getFiles = async (aType: string, aPathArr?: any) => {
        const sData = await getFileList(`?filter=*.${aType}`, aPathArr ? aPathArr.join('/') : sSelectedDir.join('/'), '');
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
                aItem.type !== 'dir' ? setSaveFileName(aItem.name) : null;
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
        if (aName && !aName.endsWith(`.${sFileType}`)) {
            currentPath.push(aName);
            setSelectedDir([...currentPath]);
            if (deletePath.length > 0) {
                deletePath.pop();
                setDeletePath(deletePath);
                const sData = await getFileList(`?filter=*.${sFileType}`, currentPath.join('/'), '');
                setFileList(sData.data?.children ?? []);
                setFilterFileList(sData.data.children ?? []);
            } else {
                getFiles(sFileType, currentPath);
            }
        }
    };

    const saveFile = async () => {
        let sPayload: any = undefined;
        if (sOutput === 'CHART') sPayload = GetSaveChartText();
        else sPayload = GetSaveDataText();
        const sDupFile = sFileList && sFileList.find((aItem) => aItem.name === sSaveFileName);

        if (sDupFile) {
            const sConfirm = confirm('Do you want to overwrite it?');
            if (!sConfirm) return;
        }

        const sResult: any = await postFileList(sPayload, sSelectedDir.join('/'), sSaveFileName);

        if (sResult.success) {
            handleClose();
            updateFileTree('/');
            let sIsOpenFile: any = sBoardList.find((aBoard: any) => aBoard.name === sSaveFileName);
            if (sIsOpenFile) sIsOpenFile = { ...sIsOpenFile, code: sPayload, savedCode: sPayload };

            setBoardList((preV: any) =>
                preV.map((aItem: any) => {
                    if (aItem.name === sSaveFileName) {
                        return sIsOpenFile;
                    } else return aItem;
                })
            );
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
        getFiles(sFileType);
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
                getFiles(sFileType);
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
    const HandleOutput = (aValue: 'CHART' | 'DATA(JSON)' | 'DATA(CSV)') => {
        if (aValue === 'CHART') setSelectedBlock({ idx: 0, name: '', value: '' });
        else setSelectedBlock(sBlockList[0] ? { idx: 0, name: sBlockList[0].namne, value: sBlockList[0].namne } : '');
        setOutput(aValue);
    };

    useEffect(() => {
        SetBlockAliasList();
        setSaveFileName(`${pPanelInfo.title !== '' ? pPanelInfo.title : 'New chart'}.tql`);
        setFileType('tql');
        getFiles('tql');
    }, []);

    useOutsideClick(MenuRef, () => setIsContextMenu(false));

    return (
        <div className="tql">
            <Modal pIsDarkMode={pIsDarkMode} onOutSideClose={handleClose}>
                <Modal.Header>
                    <div className="title">
                        <div className="title-content">
                            <Save />
                            <span>Save</span>
                        </div>
                        <Close onClick={handleClose} />
                    </div>
                    <div className="tool-bar">
                        <div className={`tool-bar-content ${pIsDarkMode ? 'dark dark-border' : ''} ${sSelectedDir.length > 0 ? 'active' : ''}`} onClick={() => handleBackPath()}>
                            <IconButton pIsToopTip pToolTipContent="Backward" pToolTipId="save-modal-backward" pIcon={<ArrowLeft />} onClick={() => null} />
                        </div>
                        <div
                            className={`tool-bar-content ${pIsDarkMode ? 'dark dark-border' : ''} ${sDeletePath.length > 0 ? 'active' : ''}`}
                            style={{ marginLeft: '8px' }}
                            onClick={() => handleForwardPath(sDeletePath[sDeletePath.length - 1])}
                        >
                            <IconButton pIsToopTip pToolTipContent="Forward" pToolTipId="save-modal-forward" pIcon={<ArrowRight />} onClick={() => null} />
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
                            <IconButton pIsToopTip pToolTipContent="Search" pToolTipId="save-modal-search" pIcon={<Search size={20} />} onClick={() => null} />
                        </div>
                        <div className={`file-button ${pIsDarkMode ? 'dark' : ''}`} onClick={makeFolder}>
                            <IconButton pIsToopTip pToolTipContent="New folder" pToolTipId="save-modal-new-folder" pIcon={<NewFolder size={28} />} onClick={() => null} />
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
                                pOptions={['DATA(JSON)', 'DATA(CSV)', 'CHART']}
                            />
                        </div>
                        <div className="save-file-block" style={sOutput === 'CHART' ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
                            <span>Block</span>
                            <Select
                                pFontSize={12}
                                pAutoChanged={true}
                                pWidth={175}
                                pBorderRadius={8}
                                pInitValue={sSelectedBlock.value}
                                pHeight={33}
                                onChange={(aEvent: any) => setSelectedBlock(aEvent.target)}
                                pOptions={sBlockList.map((aAlias: any) => aAlias.name)}
                            />
                        </div>
                    </div>
                    <div className="button-group">
                        <TextButton
                            pText="OK"
                            pBackgroundColor="#4199ff"
                            pIsDisabled={!(FileNameAndExtensionValidator(sSaveFileName) && sSaveFileName.endsWith(`.${sFileType}`))}
                            onClick={FileNameAndExtensionValidator(sSaveFileName) && extractionExtension(sSaveFileName) === sFileType ? saveFile : () => null}
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
