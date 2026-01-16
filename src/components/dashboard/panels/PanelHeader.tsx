import { Delete, GearFill, VscRecord, GoGrabber, VscGraphScatter, Download } from '@/assets/icons/Icon';
import { gBoardList, GBoardListType, gSelectedTab, gRollupTableList } from '@/recoil/recoil';
import { useRecoilState, useRecoilValue } from 'recoil';
import './PanelHeader.scss';
import { Tooltip } from 'react-tooltip';
import { generateRandomString, generateUUID, getId, isEmpty } from '@/utils';
import { Menu } from '@/design-system/components';
import { useState } from 'react';
import { convertChartDefault } from '@/utils/utils';
import { ChartThemeTextColor, DEFAULT_CHART } from '@/utils/constants';
import { Toast } from '@/design-system/components';
import { MuiTagAnalyzerGray } from '@/assets/icons/Mui';
import { SaveDashboardModal } from '@/components/modal/SaveDashboardModal';
import { HiMiniDocumentDuplicate } from 'react-icons/hi2';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { concatTagSet } from '@/utils/helpers/tags';
import { ChartTheme } from '@/type/eChart';
import { TbZoomPan } from 'react-icons/tb';
import { IoMdCheckmark } from 'react-icons/io';
import { VariableParserForTql } from '@/utils/DashboardQueryParser';
import { VARIABLE_REGEX } from '@/utils/CheckDataCompatibility';
import { fetchMountTimeMinMax, fetchTimeMinMax } from '@/api/repository/machiot';
import { calcInterval, CheckObjectKey, setUnitTime } from '@/utils/dashboardUtil';
import { timeMinMaxConverter } from '@/utils/bgnEndTimeRange';
import { DashboardQueryParser, SqlResDataType } from '@/utils/DashboardQueryParser';
import { chartTypeConverter } from '@/utils/eChartHelper';
import { sqlOriginDataDownloader, DOWNLOADER_EXTENSION } from '@/utils/sqlOriginDataDownloader';
import { fixedEncodeURIComponent } from '@/utils/utils';
import { replaceVariablesInTql } from '@/utils/TqlVariableReplacer';
import { useExperiment } from '@/hooks/useExperiment';
import { Button } from '@/design-system/components';

const PanelHeader = ({ pShowEditPanel, pType, pPanelInfo, pIsView, pIsHeader, pBoardInfo }: any) => {
    const [sBoardList, setBoardList] = useRecoilState<GBoardListType[]>(gBoardList);
    const [sSelectedTab, setSelectedTab] = useRecoilState(gSelectedTab);
    const sRollupTableList = useRecoilValue(gRollupTableList);
    const sHeaderId = generateRandomString();
    const [sDownloadModal, setDownloadModal] = useState<boolean>(false);
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);
    const { getExperiment } = useExperiment();

    // Convert timeRange with special values (now, last) to actual timestamps
    const getConvertedTimeRange = () => {
        const timeRange = sBoardList.find((aItem: any) => aItem.id === sSelectedTab)?.dashboard.timeRange;
        if (!timeRange) return undefined;

        const start = timeRange.start;
        const end = timeRange.end;

        // If both are already numbers (timestamps), return as is
        if (typeof start === 'number' && typeof end === 'number') {
            return timeRange;
        }

        // If either contains 'now' or 'last', convert them
        if ((typeof start === 'string' && (start.includes('now') || start.includes('last'))) ||
            (typeof end === 'string' && (end.includes('now') || end.includes('last')))) {
            return {
                ...timeRange,
                start: setUnitTime(start),
                end: setUnitTime(end),
            };
        }

        return timeRange;
    };

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
    const handleDeleteOnMenu = () => {
        removePanel();
    };
    const handleDelete = () => {
        setIsDeleteModal(true);
    };
    const handleMoveEditOnMenu = (aPanelId: string) => {
        pShowEditPanel('edit', aPanelId);
    };
    const handleMoveTagz = () => {
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
            Toast.error('Cannot view taganalyzer because there is no tag. (Custom tags are not supported in the TagAnalyzer)');
        }
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
        setDownloadModal(true);
    };
    // Helper functions for data download (moved from PanelDataDownloadModal)
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
        const pDashboardTime = sBoardList.find((aItem: any) => aItem.id === sSelectedTab)?.dashboard.timeRange;
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

    const GetSaveDataText = async (blockIndex: number) => {
        const [sParsedQuery, sAliasList] = await GetQuery();
        const { min: sStartTime, max: sEndTime } = await resolveTimeRange();
        const sIntervalInfo = pPanelInfo.isAxisInterval ? pPanelInfo.axisInterval : calcInterval(sStartTime, sEndTime, pPanelInfo.w * 50);

        const sTargetItem = sParsedQuery[blockIndex];
        const sBlockInfo = sAliasList[blockIndex];
        let sResult = '';

        // Apply variables replacement if board info and variables are available
        let processedSql = sTargetItem.sql;
        if (pBoardInfo?.dashboard?.variables && pBoardInfo.dashboard.variables.length > 0) {
            const sTimeContext = {
                interval: sIntervalInfo,
                start: sStartTime,
                end: sEndTime,
            };
            processedSql = replaceVariablesInTql(sTargetItem.sql, pBoardInfo.dashboard.variables, sTimeContext);
        }

        // Get actual tag name from block info (alias name or original name)
        const tagName = sBlockInfo?.name || 'UNKNOWN';

        if (CheckObjectKey(sTargetItem, 'trx')) {
            sResult = processedSql + '\n' + `PUSHVALUE(0, '${tagName}', 'NAME')\n` + `MAPVALUE(1, round(value(1) * 1000) / 1000000, 'TIME')\n` + `CSV(header(true))`;
        } else {
            sResult = `SQL("${processedSql}")\n` + `PUSHVALUE(0, '${tagName}', 'NAME')\n` + `MAPVALUE(1, round(value(1) * 1000) / 1000000, 'TIME')\n` + `CSV(header(true))`;
        }
        return sResult;
    };

    const HandleDataDownload = async () => {
        try {
            // Get all block aliases to determine how many blocks to download
            const [_, sAliasList] = await GetQuery();
            const sBlockList = sAliasList as any[];

            if (sBlockList.length === 0) {
                Toast.error('No data blocks found to download');
                return;
            }

            let successCount = 0;
            let errorCount = 0;

            // Download all blocks
            const blocksToDownload = Array.from({ length: sBlockList.length }, (_, index) => index);

            for (const blockIndex of blocksToDownload) {
                try {
                    const blockInfo = sBlockList[blockIndex];
                    if (!blockInfo) {
                        Toast.error(`Block not found at index ${blockIndex}`);
                        errorCount++;
                        continue;
                    }

                    // Generate TQL query string
                    const tqlQuery = await GetSaveDataText(blockIndex);

                    // Create download URL
                    const url = window.location.origin + '/web/api/tql-exec';
                    const token = localStorage.getItem('accessToken');
                    const encodedQuery = fixedEncodeURIComponent(tqlQuery);
                    const downloadUrl = `${url}?$=${encodedQuery}&$token=${token}`;

                    // Generate filename like Save TQL logic
                    const extension = DOWNLOADER_EXTENSION.CSV;
                    let filename: string;

                    if (sBlockList.length > 1) {
                        // Multiple blocks - use tag name with numbering (1, 2, 3...)
                        const baseFileName = (blockInfo.name || 'panel_data').replace(/[^a-zA-Z0-9_-]/g, '_');
                        const blockNumber = blockIndex + 1;
                        filename = `${baseFileName}_${blockNumber}`;
                    } else {
                        // Single block - use tag name as is
                        filename = (blockInfo.name || 'panel_data').replace(/[^a-zA-Z0-9_-]/g, '_');
                    }

                    // Direct URL download
                    sqlOriginDataDownloader(downloadUrl, extension, filename);
                    successCount++;

                    // Add small delay between downloads to prevent browser issues
                    if (blocksToDownload.length > 1) {
                        await new Promise((resolve) => setTimeout(resolve, 200));
                    }
                } catch (error) {
                    Toast.error(`Failed to download block ${blockIndex + 1}`);
                    errorCount++;
                }
            }

            // Don't show toast messages
        } catch (error) {
            Toast.error('Download failed. Please try again.');
        }
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

    return (
        <>
            {!pIsView && (
                // <div className={`draggable-panel-header ${pIsHeader || pType !== undefined ? 'display-none' : ''}`}>
                <div className={`draggable-panel-header ${pType !== undefined ? 'display-none' : ''}`}>
                    <div className="draggable-panel-header-menu">
                        <Menu.Root>
                            <Menu.Trigger>
                                <Button
                                    size="side"
                                    variant="ghost"
                                    icon={
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
                                    }
                                />
                            </Menu.Trigger>
                            <Menu.Content>
                                <Menu.Item onClick={() => handleMoveEditOnMenu(pPanelInfo.id)} icon={<GearFill />}>
                                    Setting
                                </Menu.Item>
                                {pPanelInfo.type === 'Geomap' && (
                                    <Menu.Item onClick={handleGeomapZoom} icon={<TbZoomPan />} rightIcon={pPanelInfo.chartOptions.useZoomControl ? <IoMdCheckmark /> : undefined}>
                                        Use zoom control
                                    </Menu.Item>
                                )}
                                <Menu.Item onClick={() => handleCopyPanel(pPanelInfo)} icon={<HiMiniDocumentDuplicate />}>
                                    Duplicate
                                </Menu.Item>
                                {pPanelInfo.type !== 'Tql chart' && pPanelInfo.type !== 'Geomap' && pPanelInfo.type !== 'Text' && (
                                    <Menu.Item onClick={handleMoveTagz} icon={<MuiTagAnalyzerGray className="mui-svg-hover" width={13} />}>
                                        Show Taganalyzer
                                    </Menu.Item>
                                )}
                                {pPanelInfo.type !== 'Tql chart' && pPanelInfo.type !== 'Geomap' && pPanelInfo.type !== 'Text' && (
                                    <Menu.Item onClick={HandleDataDownload} icon={<Download />}>
                                        Download data
                                    </Menu.Item>
                                )}
                                <Menu.Item onClick={handleDelete} icon={<Delete />}>
                                    Delete
                                </Menu.Item>
                                {getExperiment() && pPanelInfo.type !== 'Tql chart' && pPanelInfo.type !== 'Geomap' && pPanelInfo.type !== 'Text' && (
                                    <Menu.Item onClick={HandleDownload} icon={<VscGraphScatter />}>
                                        Save to tql
                                    </Menu.Item>
                                )}
                            </Menu.Content>
                        </Menu.Root>
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
                    pDashboardTime={getConvertedTimeRange()}
                    setIsOpen={setDownloadModal}
                    pPanelInfo={pPanelInfo}
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
