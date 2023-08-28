import Sql from '../sql';
import Tql from '../tql';
import Dashboard from '../dashboard';
import Shell from '../shell/Shell';
import { gBoardList, gSelectedBoard, gSelectedTab } from '@/recoil/recoil';
import { useRecoilState, useRecoilValue } from 'recoil';
import './Body.scss';
import NewBoard from '../newBoard';
import Tab from './Tab';
import TagAnalyzer from '../tagAnalyzer/TagAnalyzer';
import { useState, useRef, useEffect } from 'react';
import { SaveModal } from '../modal/SaveModal';
import useSaveCommand from '@/hooks/useSaveCommand';
import { WorkSheet } from '@/components/worksheet/WorkSheet';
import { getId } from '@/utils';
import { postFileList } from '@/api/repository/api';
import { gSaveWorkSheets } from '@/recoil/workSheet';
import { PlusCircle } from '@/assets/icons/Icon';
import { Error } from '@/components/toast/Toast';
import { useNavigate } from 'react-router-dom';

const Body = ({ pExtentionList, pSideSizes, pReferences, pDraged, pRecentFiles, pGetInfo, pGetPath }: any) => {
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sSelectedTab, setSelectedTab] = useRecoilState<any>(gSelectedTab);
    const sFilterBoard = useRecoilValue(gSelectedBoard);
    const [sIsSaveModal, setIsSaveModal] = useState<boolean>(false);
    const [sIsOpenModal, setIsOpenModal] = useState<boolean>(false);
    const sSaveWorkSheet = useRecoilValue(gSaveWorkSheets);
    const sTabRef = useRef(null);
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
                const sFileType = sFilterBoard.name.slice(sFilterBoard.name.length - 3);
                const sSaveData = sFileType === 'wrk' ? { data: sSaveWorkSheet } : sFileType === 'taz' ? sFilterBoard : sFilterBoard?.code;
                try {
                    const sResult: any = await postFileList(sSaveData, sFilterBoard.path.replace('/', ''), sFilterBoard.name);
                    if (sResult.success) {
                        const sIndex = sBoardList.findIndex((aBoard) => aBoard.id === sSelectedTab);
                        const sTempBoardList = JSON.parse(JSON.stringify(sBoardList));
                        if (sFileType === 'wrk') {
                            sTempBoardList[sIndex].sheet = sSaveWorkSheet;
                            sTempBoardList[sIndex].savedCode = JSON.stringify(sSaveWorkSheet);
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
        const saveList = ['sql', 'tql', 'wrk', 'taz'];
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

    useSaveCommand(handleSaveModalOpen);

    useEffect(() => {
        const expiredRt = () => {
            sNavigate('/login');
        };
        window.addEventListener('logoutEvent', expiredRt);
        return () => window.removeEventListener('logoutEvent', expiredRt);
    }, []);

    return (
        <div style={{ width: '100%', height: '100%', background: '#262831' }}>
            <div className="tab">
                <div className="tab-list" onWheel={handleMouseWheel} ref={sTabRef}>
                    {sBoardList.length !== 0 &&
                        sBoardList.map((aBoard: any, aIdx: number) => {
                            return <Tab key={aBoard.id} pBoard={aBoard} pSelectedTab={sSelectedTab} pSetSelectedTab={setSelectTab} pIdx={aIdx}></Tab>;
                        })}
                </div>

                <div style={{ margin: '4px 14px 0 14px', display: 'flex', alignItems: 'center' }}>
                    <PlusCircle className="plus-icon" size="20px" onClick={addFile} style={{ cursor: 'pointer' }}></PlusCircle>
                </div>
            </div>
            <div style={{ height: 'calc(100% - 40px)', background: '#262831' }}>
                {sBoardList.map((aItem) => {
                    return (
                        <div key={aItem.id} style={aItem.id === sSelectedTab ? { width: '100%', height: '100%' } : { display: 'none' }}>
                            {aItem.type === 'new' && (
                                <NewBoard
                                    pExtentionList={pExtentionList}
                                    pRecentFiles={pRecentFiles}
                                    pGetInfo={pGetInfo}
                                    setIsOpenModal={setIsOpenModal}
                                    pReferences={pReferences}
                                />
                            )}
                            {aItem.type === 'sql' && (
                                <Sql pHandleSaveModalOpen={handleSaveModalOpen} pInfo={aItem} setIsOpenModal={setIsOpenModal} setIsSaveModal={setIsSaveModal}></Sql>
                            )}
                            {aItem.type === 'tql' && <Tql pHandleSaveModalOpen={handleSaveModalOpen} setIsOpenModal={setIsOpenModal} setIsSaveModal={setIsSaveModal}></Tql>}
                            {aItem.type === 'taz' && (
                                <TagAnalyzer
                                    pHandleSaveModalOpen={handleSaveModalOpen}
                                    pInfo={aItem}
                                    pSetIsOpenModal={setIsOpenModal}
                                    pSetIsSaveModal={setIsSaveModal}
                                ></TagAnalyzer>
                            )}
                            {aItem.type === 'term' && <Shell pInfo={aItem} pId={aItem.id}></Shell>}
                            {aItem.type === 'dsh' && <Dashboard pDraged={pDraged} pId={aItem.id} pSideSizes={pSideSizes}></Dashboard>}
                            {aItem.type === 'wrk' && <WorkSheet pHandleSaveModalOpen={handleSaveModalOpen} setIsOpenModal={setIsOpenModal} setIsSaveModal={setIsSaveModal} />}
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
