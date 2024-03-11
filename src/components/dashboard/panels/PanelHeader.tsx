import { Delete, GearFill, VscRecord, GoGrabber, VscGraphScatter } from '@/assets/icons/Icon';
// import { IconButton } from '@/components/buttons/IconButton';
import { gBoardList, GBoardListType, gSelectedTab } from '@/recoil/recoil';
import { useRecoilState } from 'recoil';
import './PanelHeader.scss';
import { Tooltip } from 'react-tooltip';
import { generateRandomString, getId, isEmpty } from '@/utils';
import Menu from '@/components/contextMenu/Menu';
import { useState, useRef } from 'react';
import useOutsideClick from '@/hooks/useOutsideClick';
import { convertChartDefault } from '@/utils/utils';
import { DEFAULT_CHART } from '@/utils/constants';
import { Error } from '@/components/toast/Toast';
import { MuiTagAnalyzerGray } from '@/assets/icons/Mui';
import { SaveDashboardModal } from '@/components/modal/SaveDashboardModal';

const PanelHeader = ({ pShowEditPanel, pType, pPanelInfo, pIsView, pIsHeader }: any) => {
    const [sIsContextMenu, setIsContextMenu] = useState<boolean>(false);
    const [sBoardList, setBoardList] = useRecoilState<GBoardListType[]>(gBoardList);
    const [sSelectedTab, setSelectedTab] = useRecoilState(gSelectedTab);
    const sHeaderId = generateRandomString();
    const sMenuRef = useRef<HTMLDivElement>(null);
    const [sDownloadModal, setDownloadModal] = useState<boolean>(false);

    const removePanel = () => {
        setBoardList(
            sBoardList.map((aItem: any) => {
                return aItem.id === sSelectedTab
                    ? {
                          ...aItem,
                          dashboard: {
                              ...aItem.dashboard,
                              panels: aItem.dashboard.panels.filter((aItem: any) => aItem.id !== pPanelInfo.id),
                          },
                      }
                    : aItem;
            })
        );
    };

    const handleContextMenu = (aEvent: React.MouseEvent) => {
        aEvent.preventDefault();
        setIsContextMenu(!sIsContextMenu);
    };

    const handleDeleteOnMenu = (aEvent: React.MouseEvent) => {
        aEvent.stopPropagation();
        removePanel();
        setIsContextMenu(false);
    };

    const handleMoveEditOnMenu = (aEvent: React.MouseEvent, aPanelId: string) => {
        aEvent.stopPropagation();
        pShowEditPanel('edit', aPanelId);
        setIsContextMenu(false);
    };
    const handleMoveTagz = (aEvent: React.MouseEvent) => {
        aEvent.stopPropagation();
        const sTags = [] as any[];

        pPanelInfo.blockList
            .filter((aTag: any) => aTag.type === 'tag' && !aTag.useCustom)
            .map((aPanel: any) => {
                sTags.push(createTag(aPanel));
            });

        if (!isEmpty(sTags)) {
            const sBoard = sBoardList.filter((aBoard) => aBoard.id === sSelectedTab)[0];
            const sTime = pPanelInfo.useCustomTime ? pPanelInfo.timeRange : sBoard.dashboard.timeRange;
            const sNewData = {
                chartType: 'Line',
                tagSet: sTags,
                defaultRange: {
                    min: sTime.start,
                    max: sTime.end,
                },
            };

            const tagzFormat = convertChartDefault(DEFAULT_CHART, sNewData);
            createTagzTab(pPanelInfo.title, tagzFormat, sTime);
        } else {
            Error('Cannot view taganalyzer because there is no tag');
        }
        setIsContextMenu(false);
    };

    const createTag = (aInfo: any) => {
        return {
            key: getId(),
            tagName: aInfo.tag,
            table: aInfo.table,
            calculationMode: 'avg',
            alias: aInfo.alias ?? '',
            weight: 1.0,
            // onRollup: false,
            colName: { name: aInfo.tableInfo[0][0], time: aInfo.tableInfo[1][0], value: aInfo.tableInfo[2][0] },
        };
    };

    const createTagzTab = (aName: string, aPanels: any, aTime: any) => {
        const sId = getId();
        setBoardList((aPrev: any) => {
            return [
                ...aPrev,
                {
                    id: sId,
                    path: '/',
                    type: 'taz',
                    name: aName + '.taz',
                    panels: [aPanels],
                    sheet: [],
                    code: '',
                    savedCode: false,
                    range_bgn: aTime.start ?? '',
                    range_end: aTime.end ?? '',
                    shell: { icon: 'chart-line', theme: '', id: 'TAZ' },
                    dashboard: {
                        timeRange: {
                            start: 'now-30m',
                            end: 'now',
                            refresh: 'Off',
                        },
                        panels: [],
                    },
                },
            ];
        });
        setSelectedTab(sId);
    };

    const HandleDownload = () => {
        setIsContextMenu(false);
        setDownloadModal(true);
    };

    useOutsideClick(sMenuRef, () => setIsContextMenu(false));

    return (
        <>
            {!pIsView && (
                // <div className={`draggable-panel-header ${pIsHeader || pType !== undefined ? 'display-none' : ''}`}>
                <div className={`draggable-panel-header ${pType !== undefined ? 'display-none' : ''}`}>
                    <div ref={sMenuRef}>
                        <div className="draggable-panel-header-menu-icon" onClick={handleContextMenu} style={{ backgroundColor: 'none', cursor: 'pointer' }}>
                            <GoGrabber size={20} color={pPanelInfo.theme !== 'dark' ? 'black' : ''} />
                        </div>
                        <div className="hidden-header-menu" style={{ cursor: 'pointer' }}>
                            <Menu isOpen={sIsContextMenu}>
                                <Menu.Item onClick={(aEvent: any) => handleMoveEditOnMenu(aEvent, pPanelInfo.id)}>
                                    <GearFill />
                                    <span>Setting</span>
                                </Menu.Item>
                                <Menu.Item onClick={handleMoveTagz}>
                                    <MuiTagAnalyzerGray className="mui-svg-hover" width={13} />
                                    <span>Show Taganalyer</span>
                                </Menu.Item>
                                <Menu.Item onClick={handleDeleteOnMenu}>
                                    <Delete />
                                    <span>Delete</span>
                                </Menu.Item>
                                <Menu.Item onClick={HandleDownload}>
                                    <VscGraphScatter />
                                    <span>Save to tql</span>
                                </Menu.Item>
                            </Menu>
                        </div>
                    </div>
                </div>
            )}
            <div
                className={`board-panel-header ${!pIsHeader ? 'display-none' : ''} ${pPanelInfo.theme !== 'dark' ? 'panel-theme-white' : ''} ${
                    pType === undefined ? 'cursor-grab' : ''
                }`}
            >
                {/* <div style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{pPanelInfo.title}</div> */}
                <div className={`panel-header-navigator ${pType !== undefined ? 'display-none' : ''}`}>
                    <a data-tooltip-place="bottom" className={`panel-header-time-range ${!pPanelInfo.useCustomTime ? 'display-none' : ''}`} id={sHeaderId}>
                        <VscRecord color="#339900" />
                        <Tooltip
                            className="tooltip"
                            anchorSelect={'#' + sHeaderId}
                            content={`${pPanelInfo.timeRange.start} ~ ${pPanelInfo.timeRange.end} , ${pPanelInfo.timeRange.refresh}`}
                        />
                    </a>
                    {/* {!pIsView && (
                        <>
                            <IconButton pWidth={25} pIcon={<VscGraphScatter className="mui-svg-hover" width={16} />} onClick={HandleDownload} />
                            <IconButton pWidth={25} pIcon={<MuiTagAnalyzerGray className="mui-svg-hover" width={16} />} onClick={handleMoveTagz} />
                            <IconButton
                                pWidth={25}
                                pIcon={<GearFill size={14} />}
                                onClick={(aEvent: any) => {
                                    aEvent.stopPropagation();
                                    pShowEditPanel('edit', pPanelInfo.id);
                                }}
                            />
                            <IconButton pWidth={25} pIcon={<Delete size={18} />} onClick={() => removePanel()} />
                        </>
                    )} */}
                </div>
            </div>
            {sDownloadModal && (
                <SaveDashboardModal
                    pDashboardTime={sBoardList.find((aItem: any) => aItem.id === sSelectedTab)?.dashboard.timeRange}
                    setIsOpen={setDownloadModal}
                    pPanelInfo={pPanelInfo}
                    pIsDarkMode={true}
                />
            )}
        </>
    );
};
export default PanelHeader;
