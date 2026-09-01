import moment from 'moment';
import { Delete, GearFill, VscRecord, GoGrabber, VscGraphScatter, Download, VscSync, Duplicate, ZoomPan, Checkmark, VscMultipleWindows, VscScreenFull } from '@/assets/icons/Icon';
import { gBoardList, GBoardListType, gSelectedTab, gRollupTableList } from '@/recoil/recoil';
import { useRecoilState, useRecoilValue } from 'recoil';
import './PanelHeader.scss';
import { Tooltip } from 'react-tooltip';
import { generateRandomString, generateUUID } from '@/utils';
import { Button, Menu, Page, Toast } from '@/design-system/components';
import { useState } from 'react';
import { ChartThemeTextColor } from '@/utils/constants';
import { ChartTheme } from '@/type/eChart';
import { MuiTagAnalyzerGray } from '@/assets/icons/Mui';
import { SaveDashboardModal } from '@/components/modal/SaveDashboardModal';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { VariableParserForTql } from '@/utils/DashboardQueryParser';
import { VARIABLE_REGEX } from '@/utils/CheckDataCompatibility';
import { fetchBlockTimeMinMax } from '@/api/repository/machiot';
import { calcInterval, CheckObjectKey, setUnitTime } from '@/utils/dashboardUtil';
import { timeMinMaxConverter } from '@/utils/bgnEndTimeRange';
import { shouldFetchBlockTimeMinMax } from '@/utils/dashboardTimeMinMax';
import { convertDashboardMinMaxRows } from '@/utils/dashboardBlockColumns';
import { isNonDateTimeBaseTimeColumn, isNumericBaseTimeBlock } from '@/utils/timeFieldColumns';
import { DashboardQueryParser, SqlResDataType } from '@/utils/DashboardQueryParser';
import { chartTypeConverter } from '@/utils/eChartHelper';
import { sqlOriginDataDownloader, DOWNLOADER_EXTENSION } from '@/utils/sqlOriginDataDownloader';
import { fixedEncodeURIComponent } from '@/utils/utils';
import { replaceVariablesInTql } from '@/utils/TqlVariableReplacer';
import { createTagAnalyzerColumnInfoFromDashboardBlock } from '@/utils/tagAnalyzerFields';
import { createTagAnalyzerBoardFromDashboard } from '@/components/tagAnalyzer/integration';
import AutoRefreshControl from '@/components/dashboard/AutoRefreshControl';

const PanelHeader = ({ pShowEditPanel, pType, pPanelInfo, pIsView, pIsHeader, pBoardInfo, pOnFullscreen, pResolvedTheme, pRefreshCycleId }: any) => {
    const [sBoardList, setBoardList] = useRecoilState<GBoardListType[]>(gBoardList);
    const [sSelectedTab, setSelectedTab] = useRecoilState(gSelectedTab);
    const sRollupTableList = useRecoilValue(gRollupTableList);
    const sHeaderId = generateRandomString();
    const [sDownloadModal, setDownloadModal] = useState<boolean>(false);
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);

    const getDashboardTimeRange = () => sBoardList.find((aItem: any) => aItem.id === sSelectedTab)?.dashboard.timeRange;

    // The panel's own auto-refresh interval, set and shown right here. Drawn wherever it can actually
    // run: the editor's preview never auto-refreshes (`pType` is set there, and LineChart returns no
    // interval for create/edit), and a Geomap only honours the interval when its own useAutoRefresh is
    // on — a control on a panel that will not refresh would be a switch wired to nothing.
    //
    // Only on panels that are actually refreshing: one with no interval of its own has nothing to
    // report, and a ring on every panel is noise. Turning one on is the panel editor's job; from here
    // the interval can be changed or switched off.
    const sPanelRefresh = pPanelInfo?.timeRange?.refresh ?? 'Off';
    const sHonorsPanelRefresh = pPanelInfo?.type !== 'Geomap' || !!pPanelInfo?.chartOptions?.useAutoRefresh;
    const sShowPanelRefresh = sPanelRefresh !== 'Off' && sHonorsPanelRefresh && pType === undefined;

    // Panel-level, so it goes in the panel rather than in the board — the same field the panel
    // editor's Time/Distance tab writes, kept in sync by editing the same board list entry.
    const changePanelRefresh = (aRefresh: string) => {
        setBoardList((aPrev: any) =>
            aPrev.map((aBoard: any) =>
                aBoard.id === sSelectedTab
                    ? {
                          ...aBoard,
                          dashboard: {
                              ...aBoard.dashboard,
                              panels: aBoard.dashboard.panels.map((aPanel: any) =>
                                  aPanel.id === pPanelInfo.id ? { ...aPanel, timeRange: { ...aPanel.timeRange, refresh: aRefresh } } : aPanel
                              ),
                          },
                      }
                    : aBoard
            )
        );
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
        const sTags: Parameters<typeof createTagAnalyzerBoardFromDashboard>[0]['seriesList'] = pPanelInfo.blockList
            .filter((aTag: any) => aTag.type === 'tag' && !aTag.useCustom && aTag.isVisible && !aTag.customFullTyping.use)
            .map((aPanel: any) => ({
                sourceTagName: aPanel.tag,
                table: aPanel.table,
                alias: aPanel.alias ?? '',
                sourceColumns: createTagAnalyzerColumnInfoFromDashboardBlock(aPanel),
            }));

        if (sTags.length > 0) {
            const sBoard = sBoardList.filter((aBoard) => aBoard.id === sSelectedTab)[0];
            const sTime = pPanelInfo.useCustomTime ? pPanelInfo.timeRange : sBoard.dashboard.timeRange;
            let sSeriesList = sTags;

            if (pBoardInfo.dashboard.variables.length > 0) {
                const sParsedVar = VariableParserForTql(pBoardInfo.dashboard.variables);
                sSeriesList = sTags.map((aTag) => {
                    if (aTag.sourceTagName.match(VARIABLE_REGEX)) {
                        const sTargetVar = sParsedVar.find((parsedItem) => aTag.sourceTagName.match(parsedItem.regEx));
                        return {
                            ...aTag,
                            sourceTagName: sTargetVar ? aTag.sourceTagName.replaceAll(sTargetVar.regEx, sTargetVar.value) : aTag.sourceTagName,
                        };
                    }

                    return aTag;
                });
            }

            const sTazBoard = createTagAnalyzerBoardFromDashboard({
                name: pPanelInfo.title,
                seriesList: sSeriesList,
                timeRange: sTime,
            });
            setBoardList((aPrev: any) => [...aPrev, sTazBoard]);
            setSelectedTab(sTazBoard.id);
        } else {
            Toast.error('Cannot view taganalyzer because there is no tag. (Custom tags are not supported in the TagAnalyzer)');
        }
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
        const customName = sTargetTag.filter?.filter((aFilter: any) => {
            if (aFilter.column === 'NAME' && (aFilter.operator === '=' || aFilter.operator === 'in') && aFilter.value && aFilter.value !== '') return aFilter;
        })?.[0]?.value;
        if (shouldFetchBlockTimeMinMax(sTargetTag, customName)) {
            if (sTargetTag.customTable) return defaultMinMax();
            const rows = await fetchBlockTimeMinMax(sTargetTag, customName);
            const res = convertDashboardMinMaxRows(rows, sTargetTag);
            if (!res) return defaultMinMax();
            if (!Number.isFinite(res.min) || !Number.isFinite(res.max)) return defaultMinMax();
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
        const { min, max } = await resolveTimeRange();
        const sIntervalInfo = pPanelInfo.isAxisInterval ? pPanelInfo.axisInterval : calcInterval(min, max, pPanelInfo.w * 50, isNumericBaseTimeBlock(pPanelInfo.blockList?.[0]));
        const [sParsedQuery, sAliasList, sInjectionSrc] = DashboardQueryParser(
            chartTypeConverter(pPanelInfo.type),
            SqlResDataType(pPanelInfo.type),
            pPanelInfo.blockList,
            pPanelInfo.transformBlockList,
            sRollupTableList,
            pPanelInfo.xAxisOptions,
            {
                interval: sIntervalInfo,
                start: min,
                end: max,
            },
            undefined,
            true
        );

        return [sParsedQuery, sAliasList, sInjectionSrc];
    };

    const GetSaveDataText = async (blockIndex: number) => {
        const [sParsedQuery, sAliasList] = await GetQuery();
        const { min, max } = await resolveTimeRange();
        const sIntervalInfo = pPanelInfo.isAxisInterval ? pPanelInfo.axisInterval : calcInterval(min, max, pPanelInfo.w * 50, isNumericBaseTimeBlock(pPanelInfo.blockList?.[0]));

        const sTargetItem = sParsedQuery[blockIndex];
        const sBlockInfo = sAliasList[blockIndex];
        let sResult = '';

        // Apply variables replacement if board info and variables are available
        let processedSql = sTargetItem.sql;
        if (pBoardInfo?.dashboard?.variables && pBoardInfo.dashboard.variables.length > 0) {
            const sTimeContext = {
                interval: sIntervalInfo,
                start: min,
                end: max,
            };
            processedSql = replaceVariablesInTql(sTargetItem.sql, pBoardInfo.dashboard.variables, sTimeContext);
        }

        // Get actual tag name from block info (alias name or original name)
        const tagName = sBlockInfo?.name || 'UNKNOWN';
        const sSourceBlock = pPanelInfo?.blockList?.[blockIndex] ?? pPanelInfo?.blockList?.[0];
        const sTimeValueMapper = isNonDateTimeBaseTimeColumn(sSourceBlock?.tableInfo, sSourceBlock?.time)
            ? `MAPVALUE(1, value(1), 'TIME')`
            : `MAPVALUE(1, round(value(1) * 1000) / 1000000, 'TIME')`;

        if (CheckObjectKey(sTargetItem, 'trx')) {
            sResult = processedSql + '\n' + `PUSHVALUE(0, '${tagName}', 'NAME')\n` + `${sTimeValueMapper}\n` + `CSV(header(true))`;
        } else {
            sResult = `SQL("${processedSql}")\n` + `PUSHVALUE(0, '${tagName}', 'NAME')\n` + `${sTimeValueMapper}\n` + `CSV(header(true))`;
        }
        return sResult;
    };

    const HandleDataDownload = async () => {
        try {
            const [, sAliasList] = await GetQuery();
            const sBlockList = sAliasList as any[];

            if (sBlockList.length === 0) {
                Toast.error('No data blocks found to download');
                return;
            }

            const blocksToDownload = Array.from({ length: sBlockList.length }, (_, index) => index).filter((index) => sBlockList?.[index]?.useQuery === true);

            if (blocksToDownload.length === 0) {
                Toast.error('No data blocks found to download');
                return;
            }

            const url = window.location.origin + '/web/api/tql-exec';
            const token = localStorage.getItem('accessToken');

            // Single block - direct download
            if (blocksToDownload.length === 1) {
                const blockIndex = blocksToDownload[0];
                const tqlQuery = await GetSaveDataText(blockIndex);
                const blockInfo = sBlockList[blockIndex];
                const encodedQuery = fixedEncodeURIComponent(tqlQuery);
                const downloadUrl = `${url}?$=${encodedQuery}&$token=${token}`;
                const filename = (blockInfo.name || 'panel_data').replace(/[^a-zA-Z0-9_-]/g, '_');
                sqlOriginDataDownloader(downloadUrl, DOWNLOADER_EXTENSION.CSV, filename);
                return;
            }

            // Multiple blocks - merge via SCRIPT + $.request()
            const subQueries: { tql: string; name: string }[] = [];
            for (const blockIndex of blocksToDownload) {
                const tql = await GetSaveDataText(blockIndex);
                const blockInfo = sBlockList[blockIndex];
                subQueries.push({ tql, name: blockInfo.name || `block_${blockIndex + 1}` });
            }

            // Build wrapper TQL using SCRIPT that calls each sub-TQL via $.request()
            let scriptBody = '';
            subQueries.forEach((q, i) => {
                const encodedTql = fixedEncodeURIComponent(q.tql);
                const reqUrl = `${window.location.origin}/web/api/tql-exec?$=${encodedTql}&$token=${token}`;
                scriptBody += `    var _h${i} = true;\n`;
                scriptBody += `    $.request("${reqUrl}")\n`;
                scriptBody += `     .do(function(rsp) {\n`;
                scriptBody += `        rsp.csv(function(row) {\n`;
                scriptBody += `            if (_h${i}) { _h${i} = false; }\n`;
                scriptBody += `            else { $.yield(row[0], row[1], row[2]); }\n`;
                scriptBody += `        })\n`;
                scriptBody += `    })\n\n`;
            });

            const wrapperTql = `SCRIPT({\n    $.yield('NAME', 'TIME', 'VALUE');\n\n${scriptBody}})\nCSV()`;

            const encodedWrapper = fixedEncodeURIComponent(wrapperTql);
            const downloadUrl = `${url}?$=${encodedWrapper}&$token=${token}`;
            const datePrefix = moment(new Date()).format('YYYY_MM_DD_HHmmss');
            const titlePart = (pPanelInfo.title || 'panel_data').replace(/[^a-zA-Z0-9_-]/g, '_');
            const filename = `${datePrefix}_${titlePart}`;
            sqlOriginDataDownloader(downloadUrl, DOWNLOADER_EXTENSION.CSV, filename);
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
    const handleVideoSyncOpt = () => {
        const sTmpPanel = JSON.parse(JSON.stringify(pPanelInfo));
        sTmpPanel.chartOptions.source.enableSync = !sTmpPanel.chartOptions.source.enableSync;
        // sTmpPanel.id = generateUUID();
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
    // Opens a new window only for panels that have dependency with video panel
    // const handleDetailBoard = () => {
    //     const currentUrl = `${window.location.origin + '/web/ui/board' + pBoardInfo?.path + pBoardInfo!.name.split('.')[0]}`;
    //     const queryString = `?video=${encodeURIComponent(pPanelInfo.id)}`;
    //     window.open(currentUrl + queryString, '_blank', 'width=1200,height=800');
    // };
    const handleChildBoard = () => {
        const currentUrl = `${window.location.origin + '/web/ui/board/' + pPanelInfo?.chartOptions?.childBoard?.split('.')[0]}`;
        // window.open(currentUrl, '_blank', 'width=1200,height=800');
        window.open(currentUrl);
    };

    return (
        <>
            {!pIsView && (
                // <div className={`draggable-panel-header ${pIsHeader || pType !== undefined ? 'display-none' : ''}`}>
                <div className={`draggable-panel-header ${pType !== undefined ? 'display-none' : ''}`}>
                    {/* The panel's own refresh interval, in the same countdown ring the board header
                        uses and with the same menu — until now the setting existed only inside the
                        panel editor, so a panel refreshing on its own schedule looked identical to one
                        that never did, and changing it meant opening the editor. */}
                    {sShowPanelRefresh && (
                        <div className="draggable-panel-header-refresh">
                            <AutoRefreshControl
                                pValue={sPanelRefresh}
                                pOnChange={changePanelRefresh}
                                pCompact
                                pInk={ChartThemeTextColor[(pResolvedTheme ?? pPanelInfo.theme) as ChartTheme]}
                                pCycleId={pRefreshCycleId}
                                pTitle={`Panel auto refresh: ${sPanelRefresh}`}
                            />
                        </div>
                    )}
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
                                                    : ChartThemeTextColor[(pResolvedTheme ?? pPanelInfo.theme) as ChartTheme]
                                            }
                                        />
                                    }
                                />
                            </Menu.Trigger>
                            <Menu.Content>
                                <Menu.Item onClick={() => handleMoveEditOnMenu(pPanelInfo.id)} icon={<GearFill />}>
                                    Setting
                                </Menu.Item>
                                {pPanelInfo.type === 'Video' ? (
                                    <>
                                        <Menu.Item
                                            onClick={handleVideoSyncOpt}
                                            icon={<VscSync size={16} />}
                                            rightIcon={<Page.Switch pState={pPanelInfo?.chartOptions?.source?.enableSync ?? false} pCallback={() => {}} />}
                                        >
                                            Synchronization
                                        </Menu.Item>
                                        {/* <Menu.Item onClick={handleDetailBoard} icon={<VscMultipleWindows size={16} />}>
                                            Detail board
                                        </Menu.Item> */}
                                        <Menu.Item onClick={handleChildBoard} icon={<VscMultipleWindows size={16} />}>
                                            Child board
                                        </Menu.Item>
                                        <Menu.Item onClick={pOnFullscreen} icon={<VscScreenFull />}>
                                            Fullscreen
                                        </Menu.Item>
                                    </>
                                ) : null}
                                {pPanelInfo.type === 'Geomap' && (
                                    <Menu.Item onClick={handleGeomapZoom} icon={<ZoomPan />} rightIcon={pPanelInfo.chartOptions.useZoomControl ? <Checkmark /> : undefined}>
                                        Use zoom control
                                    </Menu.Item>
                                )}
                                <Menu.Item onClick={() => handleCopyPanel(pPanelInfo)} icon={<Duplicate />}>
                                    Duplicate
                                </Menu.Item>
                                {pPanelInfo.type !== 'Tql chart' && pPanelInfo.type !== 'Geomap' && pPanelInfo.type !== 'Text' && pPanelInfo.type !== 'Video' && (
                                    <Menu.Item onClick={handleMoveTagz} icon={<MuiTagAnalyzerGray className="mui-svg-hover" width={13} />}>
                                        Show Taganalyzer
                                    </Menu.Item>
                                )}
                                {pPanelInfo.type !== 'Tql chart' && pPanelInfo.type !== 'Geomap' && pPanelInfo.type !== 'Text' && pPanelInfo.type !== 'Video' && (
                                    <Menu.Item onClick={HandleDataDownload} icon={<Download />}>
                                        Download data
                                    </Menu.Item>
                                )}
                                <Menu.Item onClick={handleDelete} icon={<Delete />}>
                                    Delete
                                </Menu.Item>
                                {pPanelInfo.type !== 'Tql chart' && pPanelInfo.type !== 'Geomap' && pPanelInfo.type !== 'Text' && pPanelInfo.type !== 'Video' && (
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
                className={`board-panel-header${!pIsHeader ? ' display-none' : ''}${(pResolvedTheme ?? pPanelInfo.theme) !== 'dark' ? ' panel-theme-white' : ''}${
                    pType === undefined ? ' cursor-grab' : ''
                }`}
            >
                {/* <div style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{pPanelInfo.title}</div> */}
                <div className={`panel-header-navigator ${pType !== undefined ? 'display-none' : ''}`}>
                    {/* The dot marks a panel on its own range. A distance panel's window is numeric and
                        lives in its own field, so the tooltip has to read that one — `timeRange` is
                        empty there, and printing it would label an overridden panel ` ~ `. */}
                    <a
                        data-tooltip-place="bottom"
                        className={`panel-header-time-range${!pPanelInfo.useCustomTime && !pPanelInfo.useCustomDistance ? ' display-none' : ''}`}
                        id={sHeaderId}
                    >
                        <VscRecord color="#339900" />
                        <Tooltip
                            className="tooltip"
                            anchorSelect={'#' + sHeaderId}
                            content={
                                pPanelInfo.useCustomDistance
                                    ? `${pPanelInfo.distanceRange?.start ?? ''} ~ ${pPanelInfo.distanceRange?.end ?? ''} , ${pPanelInfo.timeRange.refresh}`
                                    : `${pPanelInfo.timeRange.start} ~ ${pPanelInfo.timeRange.end} , ${pPanelInfo.timeRange.refresh}`
                            }
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
            {sDownloadModal && <SaveDashboardModal pDashboardTime={getDashboardTimeRange()} setIsOpen={setDownloadModal} pPanelInfo={pPanelInfo} />}
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
