import Sql from '../sql';
import Tql from '../tql';
import Dashboard from '../dashboard';
import Shell from '../shell/Shell';
import { gBoardList, gSelectedBoard, gSelectedTab } from '@/recoil/recoil';
import { useRecoilState, useRecoilValue } from 'recoil';
import NewBoard from '../newBoard';
import TagAnalyzer from '../tagAnalyzer/TagAnalyzer';
import { Button, Tabs } from '@/design-system/components';
import Tab from '@/design-system/components/Tabs/Tab';
import { useState, useRef, useEffect } from 'react';
import useSaveCommand from '@/hooks/useSaveCommand';
import useMoveTab from '@/hooks/useMoveTab';
import { WorkSheet } from '@/components/worksheet/WorkSheet';
import { extractionExtension, getId } from '@/utils';
import { postFileList } from '@/api/repository/api';
import { gSaveWorkSheets } from '@/recoil/workSheet';
import { PlusCircle } from '@/assets/icons/Icon';
import { Toast } from '@/design-system/components';
import { ImageBox } from '@/components/imageBox/ImageBox';
import { TextExtension } from '@/components/textExtension/TextExtension';
import { SecurityKey } from '@/components/securityKey';
import { Timer } from '../timer';
import { ShellManage } from '@/components/ShellManage';
import { Bridge } from '../bridge';
import { useNavigate } from 'react-router-dom';
import { SSHKey } from '../sshkey';
import { Subscriber } from '../bridge/subscriber';
import { BackupDatabase } from '../database/backup';
import { AppInfo } from '../side/AppStore/info';
import { DBTablePage } from '../side/DBExplorer/tablePage';
import { EXTENSION_SET, IMAGE_EXTENSION_LIST } from '@/utils/constants';
import { UnknownExtension } from '../unknownExtension';
import { SaveModal } from '../side/FileExplorer/SaveModal';
import { CameraPage } from '../side/Camera/cameraPage';
import { EventPage } from '../side/Camera/Event';
import { ServerPage } from '../side/Camera/serverPage';

// import { Chat } from '../chat/Chat';

const MainContent = ({ pExtentionList, pSideSizes, pDraged, pGetInfo, pGetPath, pSetDragStat, pDragStat }: any) => {
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
                    Toast.error('save file fail retry please');
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
    const checkExtension = (aCurrentExtension: string, aExpectedExtension: string): boolean => {
        if (aExpectedExtension === 'unknown' && !EXTENSION_SET.has(aCurrentExtension)) return true;
        if (aExpectedExtension === 'image') return IMAGE_EXTENSION_LIST.includes(aCurrentExtension);
        const isExtensionMatch = aCurrentExtension === aExpectedExtension;
        if (!isExtensionMatch) return false;
        return EXTENSION_SET?.has(aCurrentExtension);
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
            <Tabs.Root selectedTab={sSelectedTab} onTabSelect={(tab) => setSelectTab(tab.id)} onTabClose={() => {}} className="tabs-wrapper">
                <Tabs.Header>
                    <Tabs.List onWheel={handleMouseWheel}>
                        {sBoardList.length !== 0 &&
                            sBoardList.map((aBoard: any, aIdx: number) => {
                                return (
                                    <Tabs.Tab key={aBoard.id} tab={{ id: aBoard.id, ...aBoard }} index={aIdx}>
                                        {() => (
                                            <Tab
                                                pBoard={aBoard}
                                                pSelectedTab={sSelectedTab}
                                                pSetSelectedTab={setSelectTab}
                                                pIdx={aIdx}
                                                pTabDragInfo={sTabDragInfo}
                                                pSetTabDragInfo={setTabDragInfo}
                                            />
                                        )}
                                    </Tabs.Tab>
                                );
                            })}
                    </Tabs.List>
                    <Tabs.Actions>
                        <Button size="icon" variant="ghost" icon={<PlusCircle size={14} />} onClick={addFile} />
                    </Tabs.Actions>
                </Tabs.Header>
                <Tabs.Content>
                    {/* <Chat pWrkId={sSelectedTab} pIdx={1} /> */}
                    {sBoardList.map((aItem) => {
                        return (
                            <Tabs.Panel key={aItem.id} tabId={aItem.id}>
                                {checkExtension(aItem.type, 'new') && <NewBoard pExtentionList={pExtentionList} pGetInfo={pGetInfo} setIsOpenModal={setIsOpenModal} />}
                                {checkExtension(aItem.type, 'sql') && (
                                    <Sql
                                        pIsActiveTab={aItem.id === sSelectedTab}
                                        pSetDragStat={pSetDragStat}
                                        pHandleSaveModalOpen={handleSaveModalOpen}
                                        pInfo={aItem}
                                        setIsSaveModal={setIsSaveModal}
                                    />
                                )}
                                {checkExtension(aItem.type, 'tql') && (
                                    <Tql
                                        pIsActiveTab={aItem.id === sSelectedTab}
                                        pCode={aItem.code}
                                        pIsSave={aItem.path}
                                        pSetDragStat={pSetDragStat}
                                        pHandleSaveModalOpen={handleSaveModalOpen}
                                        setIsSaveModal={setIsSaveModal}
                                    />
                                )}
                                {checkExtension(aItem.type, 'taz') && (
                                    <TagAnalyzer pHandleSaveModalOpen={handleSaveModalOpen} pInfo={aItem} pSetIsOpenModal={setIsOpenModal} pSetIsSaveModal={setIsSaveModal} />
                                )}
                                {checkExtension(aItem.type, 'term') && <Shell pSelectedTab={sSelectedTab} pInfo={aItem} pId={aItem.id} pWidth={sBodyWidth} />}
                                {checkExtension(aItem.type, 'dsh') && (
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
                                {checkExtension(aItem.type, 'wrk') && (
                                    <WorkSheet
                                        pIsActiveTab={aItem.id === sSelectedTab}
                                        pId={aItem.id}
                                        pSheet={aItem.sheet}
                                        pHandleSaveModalOpen={handleSaveModalOpen}
                                        setIsSaveModal={setIsSaveModal}
                                    />
                                )}
                                {checkExtension(aItem.type, 'json') && (
                                    <TextExtension
                                        pIsActiveTab={aItem.id === sSelectedTab}
                                        pLang="json"
                                        pCode={aItem.code}
                                        pHandleSaveModalOpen={handleSaveModalOpen}
                                        setIsOpenModal={setIsSaveModal}
                                    />
                                )}
                                {checkExtension(aItem.type, 'csv') && (
                                    <TextExtension
                                        pIsActiveTab={aItem.id === sSelectedTab}
                                        pLang="go"
                                        pCode={aItem.code}
                                        pHandleSaveModalOpen={handleSaveModalOpen}
                                        setIsOpenModal={setIsSaveModal}
                                    />
                                )}
                                {checkExtension(aItem.type, 'md') && (
                                    <TextExtension
                                        pIsActiveTab={aItem.id === sSelectedTab}
                                        pLang="markdown"
                                        pCode={aItem.code}
                                        pHandleSaveModalOpen={handleSaveModalOpen}
                                        setIsOpenModal={setIsSaveModal}
                                    />
                                )}
                                {checkExtension(aItem.type, 'txt') && (
                                    <TextExtension
                                        pIsActiveTab={aItem.id === sSelectedTab}
                                        pLang="go"
                                        pCode={aItem.code}
                                        pHandleSaveModalOpen={handleSaveModalOpen}
                                        setIsOpenModal={setIsSaveModal}
                                    />
                                )}
                                {checkExtension(aItem.type, 'html') && (
                                    <TextExtension
                                        pIsActiveTab={aItem.id === sSelectedTab}
                                        pLang="html"
                                        pCode={aItem.code}
                                        pHandleSaveModalOpen={handleSaveModalOpen}
                                        setIsOpenModal={setIsSaveModal}
                                    />
                                )}
                                {checkExtension(aItem.type, 'css') && (
                                    <TextExtension
                                        pIsActiveTab={aItem.id === sSelectedTab}
                                        pLang="css"
                                        pCode={aItem.code}
                                        pHandleSaveModalOpen={handleSaveModalOpen}
                                        setIsOpenModal={setIsSaveModal}
                                    />
                                )}
                                {checkExtension(aItem.type, 'js') && (
                                    <TextExtension
                                        pIsActiveTab={aItem.id === sSelectedTab}
                                        pLang="javascript"
                                        pCode={aItem.code}
                                        pHandleSaveModalOpen={handleSaveModalOpen}
                                        setIsOpenModal={setIsSaveModal}
                                    />
                                )}
                                {checkExtension(aItem.type, 'image') && <ImageBox pBase64Code={aItem.code} pType={aItem.type} />}
                                {checkExtension(aItem.type, 'key') && <SecurityKey pCode={aItem.code} />}
                                {checkExtension(aItem.type, 'timer') && <Timer pCode={aItem.code} />}
                                {checkExtension(aItem.type, 'shell-manage') && <ShellManage pCode={aItem.code} />}
                                {checkExtension(aItem.type, 'bridge') && <Bridge pCode={aItem.code} />}
                                {checkExtension(aItem.type, 'ssh-key') && <SSHKey />}
                                {checkExtension(aItem.type, 'subscriber') && <Subscriber pCode={aItem.code} />}
                                {checkExtension(aItem.type, 'backupdb') && <BackupDatabase pCode={aItem} />}
                                {checkExtension(aItem.type, 'appStore') && <AppInfo pCode={aItem.code} />}
                                {checkExtension(aItem.type, 'DBTable') && <DBTablePage pCode={aItem} pIsActiveTab={aItem.id === sSelectedTab} />}
                                {checkExtension(aItem.type, 'camera') && <CameraPage pCode={aItem.code} mode={aItem.mode} />}
                                {checkExtension(aItem.type, 'blackboxsvr') && <ServerPage pCode={aItem.code} />}
                                {checkExtension(aItem.type, 'event') && <EventPage pServerConfig={aItem.code} />}
                                {checkExtension(aItem.type, 'unknown') && <UnknownExtension pIsActiveTab={aItem.id === sSelectedTab} pCode={aItem.code} />}
                            </Tabs.Panel>
                        );
                    })}
                </Tabs.Content>
            </Tabs.Root>
            {sIsSaveModal ? <SaveModal pIsSave setIsOpen={handleIsSaveModal} /> : null}
            {sIsOpenModal ? <SaveModal pIsSave={false} setIsOpen={handleIsOpenModal} /> : null}
        </div>
    );
};

export default MainContent;
