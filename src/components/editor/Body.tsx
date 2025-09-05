import Sql from '../sql';
import Tql from '../tql';
import Dashboard from '../dashboard';
import Shell from '../shell/Shell';
import { gBoardList, gSelectedBoard, gSelectedTab } from '@/recoil/recoil';
import { useRecoilState, useRecoilValue } from 'recoil';
import NewBoard from '../newBoard';
import Tab from './Tab';
import TagAnalyzer from '../tagAnalyzer/TagAnalyzer';
import { useState, useRef, useEffect } from 'react';
import { SaveModal } from '../modal/SaveModal';
import useSaveCommand from '@/hooks/useSaveCommand';
import useMoveTab from '@/hooks/useMoveTab';
import { WorkSheet } from '@/components/worksheet/WorkSheet';
import { extractionExtension, getId, isImage } from '@/utils';
import { postFileList } from '@/api/repository/api';
import { gSaveWorkSheets } from '@/recoil/workSheet';
import { PlusCircle } from '@/assets/icons/Icon';
import { Error } from '@/components/toast/Toast';
import { ImageBox } from '@/components/imageBox/ImageBox';
import { TextExtension } from '@/components/textExtension/TextExtension';
import { SecurityKey } from '@/components/securityKey';
import { Timer } from '../timer';
import { ShellManage } from '@/components/ShellManage';
import { Bridge } from '../bridge';
import { useNavigate } from 'react-router-dom';
import { SSHKey } from '../sshkey';
import { Subscriber } from '../bridge/subscriber';
import './Body.scss';
import { BackupDatabase } from '../database/backup';
import { AppInfo } from '../side/AppStore/info';
import { DBTablePage } from '../side/DBExplorer/tablePage';

const Body = ({ pExtentionList, pSideSizes, pDraged, pGetInfo, pGetPath, pSetDragStat, pDragStat }: any) => {
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sSelectedTab, setSelectedTab] = useRecoilState<any>(gSelectedTab);
    const sFilterBoard = useRecoilValue<any>(gSelectedBoard);
    const [sIsSaveModal, setIsSaveModal] = useState<boolean>(false);
    const [sIsOpenModal, setIsOpenModal] = useState<boolean>(false);
    const [sBodyWidth, setBodyWidth] = useState<number>(0);
    const sSaveWorkSheet = useRecoilValue(gSaveWorkSheets);
    const sTabRef = useRef(null);
    const [sTabDragInfo, setTabDragInfo] = useState<{ start: number | undefined; over: number | undefined; enter: number | undefined; end: boolean }>({
        start: undefined,
        enter: undefined,
        over: undefined,
        end: false,
    });
    const sBodyRef = useRef<any>(null);
    const sNavigate = useNavigate();

    const handleMouseWheel = (e: any) => {
        const scrollable: any = sTabRef.current;

        if (scrollable) {
            scrollable.scrollLeft += e.deltaY;
        }
    };

    const setSelectTab = (aBoardId: string) => {
        setSelectedTab(aBoardId);
    };

    const handleSaveModalOpen = async () => {
        const sIsSave = isSaveCheck();
        if (sIsSave) {
            const sIsAlreadySave = sFilterBoard.path !== '';

            if (sIsAlreadySave) {
                const sFileType = extractionExtension(sFilterBoard.name);
                let sSaveData: any = sFileType === 'wrk' ? { data: sSaveWorkSheet } : sFileType === 'taz' || sFileType === 'dsh' ? sFilterBoard : sFilterBoard?.code;
                if (sFileType === 'taz') {
                    const sTmpTaz = JSON.parse(JSON.stringify(sFilterBoard));
                    sTmpTaz.savedCode = '';
                    sTmpTaz.code = '';
                    sSaveData = sTmpTaz;
                }
                try {
                    const sResult: any = await postFileList(sSaveData, sFilterBoard.path.replace('/', ''), sFilterBoard.name);
                    if (sResult.success) {
                        const sIndex = sBoardList.findIndex((aBoard) => aBoard.id === sSelectedTab);
                        const sTempBoardList = JSON.parse(JSON.stringify(sBoardList));
                        if (sFileType === 'wrk') {
                            sTempBoardList[sIndex].sheet = sSaveWorkSheet;
                            sTempBoardList[sIndex].savedCode = JSON.stringify(sSaveWorkSheet);
                        } else if (sFileType === 'json' && typeof sSaveData === 'object') {
                            sTempBoardList[sIndex].code = JSON.stringify(sSaveData, null, 4);
                            sTempBoardList[sIndex].savedCode = JSON.stringify(sSaveData, null, 4);
                        } else if (sFileType === 'taz') {
                            sTempBoardList[sIndex].code = '';
                            sTempBoardList[sIndex].savedCode = JSON.stringify(sSaveData.panels);
                        } else if (sFileType === 'dsh') {
                            sTempBoardList[sIndex].code = '';
                            sTempBoardList[sIndex].savedCode = JSON.stringify(sSaveData.dashboard);
                        } else {
                            sTempBoardList[sIndex].code = sSaveData;
                            sTempBoardList[sIndex].savedCode = sSaveData;
                        }
                        setBoardList(sTempBoardList);
                    }
                } catch (aError) {
                    Error('save file fail retry please');
                }
            } else {
                setIsSaveModal(true);
            }
        }
    };

    const isSaveCheck = () => {
        const sType = sFilterBoard.type;
        const saveList = ['sql', 'tql', 'wrk', 'taz', 'json', 'md', 'csv', 'txt', 'dsh', 'html', 'js', 'css'];
        if (saveList.some((aType) => aType === sType)) {
            return true;
        } else {
            return false;
        }
    };

    const handleIsSaveModal = (aBool: boolean, aPath: string) => {
        setIsSaveModal(aBool);
        pGetInfo();
        pGetPath(aPath);
    };
    const handleIsOpenModal = (aBool: boolean) => {
        setIsOpenModal(aBool);
        pGetInfo();
    };

    const addFile = () => {
        const sNewTab = { id: getId(), type: 'new', name: 'new', path: '', code: '', panels: [], range_bgn: '', range_end: '', sheet: [], savedCode: false };
        setBoardList([...sBoardList, sNewTab]);
        setSelectedTab(sNewTab.id);
    };

    const handleMoveTab = (aKeyNumber: number) => {
        sBoardList[aKeyNumber - 1] && setSelectedTab(sBoardList[aKeyNumber - 1]?.id);
    };

    const clearTabDragInfo = () => {
        setTabDragInfo({ start: undefined, enter: undefined, over: undefined, end: false });
    };

    useSaveCommand(handleSaveModalOpen);
    useMoveTab(handleMoveTab);

    useEffect(() => {
        const expiredRt = () => {
            localStorage.removeItem('refreshToken');
            sNavigate('/login');
        };
        window.addEventListener('logoutEvent', expiredRt);
        return () => window.removeEventListener('logoutEvent', expiredRt);
    }, []);

    useEffect(() => {
        if (sTabDragInfo.end) {
            if (sTabDragInfo.start === sTabDragInfo.enter) clearTabDragInfo();
            else {
                const sTmpBoardList = JSON.parse(JSON.stringify(sBoardList));
                const sTargetTab = sTmpBoardList.splice(sTabDragInfo.start, 1)[0];
                sTmpBoardList.splice(sTabDragInfo.enter, 0, sTargetTab);
                setBoardList(sTmpBoardList);
                clearTabDragInfo();
            }
        }
    }, [sTabDragInfo.end]);

    // resize body ref when extension button click
    useEffect(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            if (entries[0]) {
                setBodyWidth(entries[0].contentRect.width);
            }
        });

        if (sBodyRef.current) {
            resizeObserver.observe(sBodyRef.current);
        }

        return () => {
            if (sBodyRef.current) {
                resizeObserver.unobserve(sBodyRef.current);
            }
        };
    }, []);

    return (
        <div ref={sBodyRef} style={{ width: '100%', height: '100%', background: '#262831' }}>
            <div className="tab">
                <div className="tab-list" onWheel={handleMouseWheel} ref={sTabRef}>
                    {sBoardList.length !== 0 &&
                        sBoardList.map((aBoard: any, aIdx: number) => {
                            return (
                                <Tab
                                    // Add drag event
                                    key={aBoard.id}
                                    pBoard={aBoard}
                                    pSelectedTab={sSelectedTab}
                                    pSetSelectedTab={setSelectTab}
                                    pIdx={aIdx}
                                    pTabDragInfo={sTabDragInfo}
                                    pSetTabDragInfo={setTabDragInfo}
                                />
                            );
                        })}
                </div>
                <div style={{ margin: '4px 14px 0 14px', display: 'flex', alignItems: 'center' }}>
                    <PlusCircle className="plus-icon" size="20px" onClick={addFile} style={{ cursor: 'pointer' }}></PlusCircle>
                </div>
            </div>
            <div style={{ height: 'calc(100% - 40px)', background: '#262831', zIndex: 2, position: 'relative' }}>
                {sBoardList.map((aItem) => {
                    return (
                        <div key={aItem.id} style={aItem.id === sSelectedTab ? { width: '100%', height: '100%' } : { display: 'none' }}>
                            {aItem.type === 'new' && <NewBoard pExtentionList={pExtentionList} pGetInfo={pGetInfo} setIsOpenModal={setIsOpenModal} />}
                            {aItem.type === 'sql' && (
                                <Sql
                                    pIsActiveTab={aItem.id === sSelectedTab}
                                    pSetDragStat={pSetDragStat}
                                    pHandleSaveModalOpen={handleSaveModalOpen}
                                    pInfo={aItem}
                                    setIsSaveModal={setIsSaveModal}
                                />
                            )}
                            {aItem.type === 'tql' && (
                                <Tql
                                    pIsActiveTab={aItem.id === sSelectedTab}
                                    pCode={aItem.code}
                                    pIsSave={aItem.path}
                                    pSetDragStat={pSetDragStat}
                                    pHandleSaveModalOpen={handleSaveModalOpen}
                                    setIsSaveModal={setIsSaveModal}
                                />
                            )}
                            {aItem.type === 'taz' && (
                                <TagAnalyzer pHandleSaveModalOpen={handleSaveModalOpen} pInfo={aItem} pSetIsOpenModal={setIsOpenModal} pSetIsSaveModal={setIsSaveModal} />
                            )}
                            {aItem.type === 'term' && <Shell pSelectedTab={sSelectedTab} pInfo={aItem} pId={aItem.id} pWidth={sBodyWidth} />}
                            {aItem.type === 'dsh' && (
                                <Dashboard
                                    pDragStat={pDragStat}
                                    pWidth={sBodyWidth}
                                    pHandleSaveModalOpen={handleSaveModalOpen}
                                    pInfo={aItem}
                                    pSetIsSaveModal={setIsSaveModal}
                                    pDraged={pDraged}
                                    pId={aItem.id}
                                    pSideSizes={pSideSizes}
                                    pIsSave={aItem.path}
                                />
                            )}
                            {aItem.type === 'wrk' && (
                                <WorkSheet
                                    pIsActiveTab={aItem.id === sSelectedTab}
                                    pId={aItem.id}
                                    pSheet={aItem.sheet}
                                    pHandleSaveModalOpen={handleSaveModalOpen}
                                    setIsSaveModal={setIsSaveModal}
                                />
                            )}
                            {aItem.type === 'json' && (
                                <TextExtension
                                    pIsActiveTab={aItem.id === sSelectedTab}
                                    pLang="json"
                                    pCode={aItem.code}
                                    pHandleSaveModalOpen={handleSaveModalOpen}
                                    setIsOpenModal={setIsSaveModal}
                                />
                            )}
                            {aItem.type === 'csv' && (
                                <TextExtension
                                    pIsActiveTab={aItem.id === sSelectedTab}
                                    pLang="go"
                                    pCode={aItem.code}
                                    pHandleSaveModalOpen={handleSaveModalOpen}
                                    setIsOpenModal={setIsSaveModal}
                                />
                            )}
                            {aItem.type === 'md' && (
                                <TextExtension
                                    pIsActiveTab={aItem.id === sSelectedTab}
                                    pLang="markdown"
                                    pCode={aItem.code}
                                    pHandleSaveModalOpen={handleSaveModalOpen}
                                    setIsOpenModal={setIsSaveModal}
                                />
                            )}
                            {aItem.type === 'txt' && (
                                <TextExtension
                                    pIsActiveTab={aItem.id === sSelectedTab}
                                    pLang="go"
                                    pCode={aItem.code}
                                    pHandleSaveModalOpen={handleSaveModalOpen}
                                    setIsOpenModal={setIsSaveModal}
                                />
                            )}
                            {aItem.type === 'html' && (
                                <TextExtension
                                    pIsActiveTab={aItem.id === sSelectedTab}
                                    pLang="html"
                                    pCode={aItem.code}
                                    pHandleSaveModalOpen={handleSaveModalOpen}
                                    setIsOpenModal={setIsSaveModal}
                                />
                            )}
                            {aItem.type === 'css' && (
                                <TextExtension
                                    pIsActiveTab={aItem.id === sSelectedTab}
                                    pLang="css"
                                    pCode={aItem.code}
                                    pHandleSaveModalOpen={handleSaveModalOpen}
                                    setIsOpenModal={setIsSaveModal}
                                />
                            )}
                            {aItem.type === 'js' && (
                                <TextExtension
                                    pIsActiveTab={aItem.id === sSelectedTab}
                                    pLang="javascript"
                                    pCode={aItem.code}
                                    pHandleSaveModalOpen={handleSaveModalOpen}
                                    setIsOpenModal={setIsSaveModal}
                                />
                            )}
                            {aItem.type === 'key' && <SecurityKey pCode={aItem.code} />}
                            {aItem.type === 'timer' && <Timer pCode={aItem.code} />}
                            {aItem.type === 'shell-manage' && <ShellManage pCode={aItem.code} />}
                            {aItem.type === 'bridge' && <Bridge pCode={aItem.code} />}
                            {aItem.type === 'ssh-key' && <SSHKey />}
                            {aItem.type === 'subscriber' && <Subscriber pCode={aItem.code} />}
                            {aItem.type === 'backupdb' && <BackupDatabase pCode={aItem} />}
                            {aItem.type === 'appStore' && <AppInfo pCode={aItem.code} />}
                            {isImage(aItem.name) && <ImageBox pBase64Code={aItem.code} pType={aItem.type} />}
                            {aItem.type === 'DBTable' && <DBTablePage pCode={aItem} />}
                        </div>
                    );
                })}
            </div>
            {sIsSaveModal ? <SaveModal pIsDarkMode pIsSave setIsOpen={handleIsSaveModal} /> : null}
            {sIsOpenModal ? <SaveModal pIsDarkMode pIsSave={false} setIsOpen={handleIsOpenModal} /> : null}
        </div>
    );
};

export default Body;
