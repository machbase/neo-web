import { Delete, GearFill, VscRecord, GoGrabber, VscGraphScatter, Download } from '@/assets/icons/Icon';
// import { IconButton } from '@/components/buttons/IconButton';
import { gBoardList, GBoardListType, gSelectedTab } from '@/recoil/recoil';
import { useRecoilState } from 'recoil';
import './PanelHeader.scss';
import { Tooltip } from 'react-tooltip';
import { generateRandomString, generateUUID, getId, isEmpty } from '@/utils';
import Menu from '@/components/contextMenu/Menu';
import { useState, useRef } from 'react';
import useOutsideClick from '@/hooks/useOutsideClick';
import { convertChartDefault } from '@/utils/utils';
import { ChartThemeTextColor, DEFAULT_CHART } from '@/utils/constants';
import { Error } from '@/components/toast/Toast';
import { MuiTagAnalyzerGray } from '@/assets/icons/Mui';
import { SaveDashboardModal } from '@/components/modal/SaveDashboardModal';
import { PanelDataDownloadModal } from '@/components/modal/PanelDataDownloadModal';
import { HiMiniDocumentDuplicate } from 'react-icons/hi2';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { concatTagSet } from '@/utils/helpers/tags';
import { ChartTheme } from '@/type/eChart';
import { TbZoomPan } from 'react-icons/tb';
import { IoMdCheckmark } from 'react-icons/io';
import { VariableParserForTql } from '@/utils/DashboardQueryParser';
import { VARIABLE_REGEX } from '@/utils/CheckDataCompatibility';

const PanelHeader = ({ pShowEditPanel, pType, pPanelInfo, pIsView, pIsHeader, pBoardInfo }: any) => {
    const [sIsContextMenu, setIsContextMenu] = useState<boolean>(false);
    const [sBoardList, setBoardList] = useRecoilState<GBoardListType[]>(gBoardList);
    const [sSelectedTab, setSelectedTab] = useRecoilState(gSelectedTab);
    const sHeaderId = generateRandomString();
    const sMenuRef = useRef<HTMLDivElement>(null);
    const [sDownloadModal, setDownloadModal] = useState<boolean>(false);
    const [sDataDownloadModal, setDataDownloadModal] = useState<boolean>(false);
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);

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
    const handleDeleteOnMenu = () => {
        removePanel();
    };
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsContextMenu(false);
        setIsDeleteModal(true);
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
            .filter((aTag: any) => aTag.type === 'tag' && !aTag.useCustom && aTag.isVisible && !aTag.customFullTyping.use)
            .map((aPanel: any) => {
                sTags.push(createTag(aPanel));
            });

        if (!isEmpty(sTags)) {
            const sBoard = sBoardList.filter((aBoard) => aBoard.id === sSelectedTab)[0];
            const sTime = pPanelInfo.useCustomTime ? pPanelInfo.timeRange : sBoard.dashboard.timeRange;
            const sNewData = {
                chartType: 'Line',
                tagSet: concatTagSet([], sTags),
                defaultRange: {
                    min: sTime.start,
                    max: sTime.end,
                },
            };

            const tagzFormat = convertChartDefault(DEFAULT_CHART, sNewData);
            if (pBoardInfo.dashboard.variables.length > 0) {
                const sParsedVar = VariableParserForTql(pBoardInfo.dashboard.variables);
                const sReplaceTagSet = tagzFormat.tag_set.map((aTag: any) => {
                    if (aTag.tagName.match(VARIABLE_REGEX)) {
                        const sTargetVar = sParsedVar.find((parsedItem) => aTag.tagName.match(parsedItem.regEx));
                        return {
                            ...aTag,
                            tagName: sTargetVar ? aTag.tagName.replaceAll(sTargetVar.regEx, sTargetVar.value) : aTag.tagName,
                        };
                    } else return aTag;
                });
                tagzFormat.tag_set = sReplaceTagSet;
            }
            createTagzTab(pPanelInfo.title, tagzFormat, sTime);
        } else {
            Error('Cannot view taganalyzer because there is no tag. (Custom tags are not supported in the TagAnalyzer)');
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
                            start: 'now-3h',
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
    const HandleDataDownload = () => {
        setIsContextMenu(false);
        setDataDownloadModal(true);
    };
    const handleCopyPanel = (aPanelInfo: any) => {
        const sTmpPanel = JSON.parse(JSON.stringify(aPanelInfo));
        sTmpPanel.id = generateUUID();
        sTmpPanel.x = 0;
        sTmpPanel.y = 0;
        let sSaveTarget: any = sBoardList.find((aItem) => aItem.id === pBoardInfo.id);
        const sTabList = sBoardList.map((aItem) => {
            if (aItem.id === pBoardInfo.id) {
                const sTmpDashboard = {
                    ...aItem.dashboard,
                    panels: [...aItem.dashboard.panels, sTmpPanel],
                };
                sSaveTarget = {
                    ...aItem,
                    dashboard: sTmpDashboard,
                    savedCode: JSON.stringify(sTmpDashboard),
                };
                return sSaveTarget;
            } else return aItem;
        });
        setBoardList(() => sTabList);
        setIsContextMenu(false);
    };
    const handleGeomapZoom = () => {
        const sTmpPanel = JSON.parse(JSON.stringify(pPanelInfo));
        sTmpPanel.chartOptions.useZoomControl = !sTmpPanel.chartOptions.useZoomControl;
        sTmpPanel.id = generateUUID();
        let sSaveTarget: any = sBoardList.find((aItem) => aItem.id === pBoardInfo.id);
        const sTabList = sBoardList.map((aItem) => {
            if (aItem.id === pBoardInfo.id) {
                const sTmpDashboard = {
                    ...aItem.dashboard,
                    panels: aItem.dashboard.panels.map((aPanel: any) => {
                        if (aPanel.id === pPanelInfo.id) return sTmpPanel;
                        else return aPanel;
                    }),
                };
                sSaveTarget = {
                    ...aItem,
                    dashboard: sTmpDashboard,
                    savedCode: JSON.stringify(sTmpDashboard),
                };
                return sSaveTarget;
            } else return aItem;
        });
        setBoardList(() => sTabList);
    };

    useOutsideClick(sMenuRef, () => setIsContextMenu(false));
    return (
        <>
            {!pIsView && (
                // <div className={`draggable-panel-header ${pIsHeader || pType !== undefined ? 'display-none' : ''}`}>
                <div className={`draggable-panel-header ${pType !== undefined ? 'display-none' : ''}`}>
                    <div ref={sMenuRef} className="draggable-panel-header-menu">
                        <div className="draggable-panel-header-menu-icon" onClick={handleContextMenu} style={{ backgroundColor: 'none', cursor: 'pointer' }}>
                            <GoGrabber
                                size={20}
                                color={
                                    pPanelInfo.type === 'Geomap'
                                        ? pPanelInfo?.titleColor && pPanelInfo?.titleColor !== ''
                                            ? pPanelInfo?.titleColor
                                            : '#000000'
                                        : ChartThemeTextColor[pPanelInfo.theme as ChartTheme]
                                }
                            />
                        </div>
                        <div className="hidden-header-menu" style={{ cursor: 'pointer' }}>
                            <Menu isOpen={sIsContextMenu}>
                                <Menu.Item onClick={(aEvent: any) => handleMoveEditOnMenu(aEvent, pPanelInfo.id)}>
                                    <GearFill />
                                    <span>Setting</span>
                                </Menu.Item>
                                {pPanelInfo.type === 'Geomap' && (
                                    <Menu.Item onClick={handleGeomapZoom}>
                                        <TbZoomPan />
                                        <span>Use zoom control</span>
                                        {pPanelInfo.chartOptions.useZoomControl && <IoMdCheckmark />}
                                    </Menu.Item>
                                )}
                                <Menu.Item onClick={() => handleCopyPanel(pPanelInfo)}>
                                    <HiMiniDocumentDuplicate />
                                    <span>Duplicate</span>
                                </Menu.Item>
                                {pPanelInfo.type !== 'Tql chart' && pPanelInfo.type !== 'Geomap' && pPanelInfo.type !== 'Text' && (
                                    <Menu.Item onClick={handleMoveTagz}>
                                        <MuiTagAnalyzerGray className="mui-svg-hover" width={13} />
                                        <span>Show Taganalyzer</span>
                                    </Menu.Item>
                                )}
                                {pPanelInfo.type !== 'Tql chart' && pPanelInfo.type !== 'Geomap' && pPanelInfo.type !== 'Text' && (
                                    <Menu.Item onClick={HandleDataDownload}>
                                        <Download />
                                        <span>Download data</span>
                                    </Menu.Item>
                                )}
                                <Menu.Item onClick={handleDelete}>
                                    <Delete />
                                    <span>Delete</span>
                                </Menu.Item>
                                {localStorage.getItem('experimentMode') && pPanelInfo.type !== 'Tql chart' && pPanelInfo.type !== 'Geomap' && pPanelInfo.type !== 'Text' && (
                                    <Menu.Item onClick={HandleDownload}>
                                        <VscGraphScatter />
                                        <span>Save to tql</span>
                                    </Menu.Item>
                                )}
                            </Menu>
                        </div>
                    </div>
                </div>
            )}
            <div
                className={`board-panel-header${!pIsHeader ? ' display-none' : ''}${pPanelInfo.theme !== 'dark' ? ' anel-theme-white' : ''}${
                    pType === undefined ? ' cursor-grab' : ''
                }`}
            >
                {/* <div style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{pPanelInfo.title}</div> */}
                <div className={`panel-header-navigator ${pType !== undefined ? 'display-none' : ''}`}>
                    <a data-tooltip-place="bottom" className={`panel-header-time-range${!pPanelInfo.useCustomTime ? ' display-none' : ''}`} id={sHeaderId}>
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
            {sDataDownloadModal && (
                <PanelDataDownloadModal
                    pDashboardTime={sBoardList.find((aItem: any) => aItem.id === sSelectedTab)?.dashboard.timeRange}
                    setIsOpen={setDataDownloadModal}
                    pPanelInfo={pPanelInfo}
                    pBoardInfo={pBoardInfo}
                    pIsDarkMode={true}
                />
            )}
            {sIsDeleteModal && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsDeleteModal}
                    pCallback={handleDeleteOnMenu}
                    pContents={<div className="body-content">{`Do you want to delete this panel?`}</div>}
                />
            )}
        </>
    );
};
export default PanelHeader;
