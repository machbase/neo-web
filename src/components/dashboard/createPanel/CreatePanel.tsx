import { Calendar, IoArrowBackOutline, VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { SplitPane, Pane, Page, Button } from '@/design-system/components';
import { useEffect, useState } from 'react';
import CreatePanelBody from './CreatePanelBody';
import CreatePanelFooter from './CreatePanelFooter';
import CreatePanelRight from './CreatePanelRight';
import { useRecoilState } from 'recoil';
import { gBoardList } from '@/recoil/recoil';
import { createDefaultTagTableOption, getChartDefaultWidthSize, getTableType, PanelIdParser } from '@/utils/dashboardUtil';
import { TableTypeOrderList } from '@/components/Side/DBExplorer/utils';
import { getTableList, postFileList } from '@/api/repository/api';
import { decodeJwt, generateUUID, isValidJSON, parseDashboardTables } from '@/utils';
import { DefaultChartOption, getDefaultSeriesOption } from '@/utils/eChartHelper';
import { fetchMountTimeMinMax, fetchTimeMinMax } from '@/api/repository/machiot';
import { timeMinMaxConverter } from '@/utils/bgnEndTimeRange';
import moment from 'moment';
import { formatTimeValue } from '@/utils/dashboardUtil';
import { VARIABLE_REGEX } from '@/utils/CheckDataCompatibility';
import { Toast } from '@/design-system/components';
import { getDefaultVersionForExtension } from '@/utils/version/utils';
import { E_VERSIONED_EXTENSION } from '@/utils/version/constants';

const CreatePanel = ({
    pLoopMode,
    pPanelId,
    pSetCreateModal,
    pType,
    pBoardInfo,
    pSetType,
    pModifyState,
    pSetModifyState,
    pMoveTimeRange,
    pSetTimeRangeModal,
    pSetIsSaveModal,
    pBoardTimeMinMax,
    pChartVariableId,
    pSetBoardTimeMinMax,
}: {
    pLoopMode: boolean;
    pPanelId: string;
    pType: 'create' | 'edit' | undefined;
    pSetCreateModal: (aValue: boolean) => void;
    pBoardInfo: any;
    pSetType: any;
    pModifyState: { id: string; state: boolean };
    pSetModifyState: any;
    pMoveTimeRange: any;
    pSetTimeRangeModal: (aValue: boolean) => void;
    pSetIsSaveModal: any;
    pBoardTimeMinMax: any;
    pChartVariableId: string;
    pSetBoardTimeMinMax: (aTimeRange: { min: number; max: number }) => void;
}) => {
    const [sSideSizes, setSideSizes] = useState<any>(['75%', '25%']);
    const [sBottomSizes, setBottomSizes] = useState<any>(['50%', '50%']);
    const [sInsetDraging, setInsetDraging] = useState(false);
    const [sPanelOption, setPanelOption] = useState<any>({});
    const [sAppliedPanelOption, setAppliedPanelOption] = useState<any>({});
    const [sTableList, setTableList] = useState<any>([]);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const [sCreateModeTimeMinMax, setCreateModeTimeMinMax] = useState<any>(undefined);
    const [sIsPreview, setIsPreview] = useState<boolean>(false);
    const [sBoardTimeRange, setBoardTimeRange] = useState<any>(undefined);

    // Create
    const addPanel = async () => {
        // Validate transform aliases first
        if (!validateTransformAliases(sPanelOption)) {
            return;
        }

        if (sPanelOption.useCustomTime) {
            let sStart: any;
            let sEnd: any;
            if (typeof sPanelOption.timeRange.start === 'string' && (sPanelOption.timeRange.start.includes('now') || sPanelOption.timeRange.start.includes('last'))) {
                sStart = sPanelOption.timeRange.start;
            } else {
                sStart = moment(sPanelOption.timeRange.start).unix() * 1000;
                if (sStart < 0 || isNaN(sStart)) {
                    Toast.error('Please check the entered time.');
                    return;
                }
            }
            if (typeof sPanelOption.timeRange.end === 'string' && (sPanelOption.timeRange.end.includes('now') || sPanelOption.timeRange.end.includes('last'))) {
                sEnd = sPanelOption.timeRange.end;
            } else {
                sEnd = moment(sPanelOption.timeRange.end).unix() * 1000;
                if (sEnd < 0 || isNaN(sEnd)) {
                    Toast.error('Please check the entered time.');
                    return;
                }
            }
        }
        sPanelOption.w = getChartDefaultWidthSize(sPanelOption.type, !!sPanelOption.chartOptions?.isPolar);

        const sTmpPanelInfo = checkXAxisInterval(sPanelOption);
        sTmpPanelInfo.version = getDefaultVersionForExtension(E_VERSIONED_EXTENSION.DSH);

        let sSaveTarget: any = sBoardList.find((aItem) => aItem.id === pBoardInfo.id);
        if (sSaveTarget?.path !== '') {
            const sTabList = sBoardList.map((aItem) => {
                if (aItem.id === pBoardInfo.id) {
                    const sTmpDashboard = {
                        ...aItem.dashboard,
                        panels: [...aItem.dashboard.panels, sTmpPanelInfo],
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
            postFileList(sSaveTarget, sSaveTarget.path, sSaveTarget.name);
        } else {
            const sTabList = sBoardList.map((aItem) => {
                if (aItem.id === pBoardInfo.id) {
                    const sTmpDashboard = {
                        ...aItem.dashboard,
                        panels: [...aItem.dashboard.panels, sTmpPanelInfo],
                    };
                    sSaveTarget = {
                        ...aItem,
                        dashboard: sTmpDashboard,
                    };
                    return sSaveTarget;
                } else return aItem;
            });
            setBoardList(() => sTabList);
        }

        if (pBoardInfo.dashboard.panels.length === 0) {
            pSetBoardTimeMinMax(await getTimeMinMax(sTmpPanelInfo.useCustomTime ? sTmpPanelInfo.timeRange : pBoardInfo.dashboard.timeRange));
            pSetModifyState({ id: PanelIdParser(pChartVariableId + '-' + sTmpPanelInfo.id), state: true });
        } else {
            const sChartPanelList = pBoardInfo.dashboard.panels.filter((panel: any) => panel.type !== 'Tql chart');
            if (sChartPanelList.length === 0) {
                pSetBoardTimeMinMax(await getTimeMinMax(sTmpPanelInfo.useCustomTime ? sTmpPanelInfo.timeRange : pBoardInfo.dashboard.timeRange));
                pSetModifyState({ id: PanelIdParser(pChartVariableId + '-' + sTmpPanelInfo.id), state: true });
            } else {
                if (sCreateModeTimeMinMax) pSetBoardTimeMinMax(sCreateModeTimeMinMax);
                else pSetModifyState({ id: PanelIdParser(pChartVariableId + '-' + sTmpPanelInfo.id), state: true });
            }
        }
        handleClose();
    };
    // Edit
    const editPanel = () => {
        // Validate transform aliases first
        if (!validateTransformAliases(sPanelOption)) {
            return;
        }

        let sSaveTarget: any = sBoardList.find((aItem) => aItem.id === pBoardInfo.id);
        const sTmpPanelInfo = checkXAxisInterval(sPanelOption);
        sTmpPanelInfo.version = getDefaultVersionForExtension(E_VERSIONED_EXTENSION.DSH);

        if (sSaveTarget.path !== '') {
            const sNewPanelId = generateUUID();
            const sTabList = sBoardList.map((aItem) => {
                if (aItem.id === pBoardInfo.id) {
                    const sTmpDashboard = {
                        ...aItem.dashboard,
                        panels: aItem.dashboard.panels.map((bItem: any) => {
                            return bItem.id === pPanelId ? { ...sTmpPanelInfo, id: sNewPanelId } : bItem;
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
            postFileList(sSaveTarget, sSaveTarget.path, sSaveTarget.name);
        } else {
            const sNewPanelId = generateUUID();
            const sTabList = sBoardList.map((aItem) => {
                if (aItem.id === pBoardInfo.id) {
                    const sTmpDashboard = {
                        ...aItem.dashboard,
                        panels: aItem.dashboard.panels.map((bItem: any) => {
                            return bItem.id === pPanelId ? { ...sTmpPanelInfo, id: sNewPanelId } : bItem;
                        }),
                    };
                    sSaveTarget = {
                        ...aItem,
                        dashboard: sTmpDashboard,
                    };
                    return sSaveTarget;
                } else return aItem;
            });
            setBoardList(() => sTabList);
        }

        handleClose();
    };
    const checkXAxisInterval = (aPanelInfo: any) => {
        if (aPanelInfo?.axisInterval?.IntervalType === '' || aPanelInfo?.axisInterval?.IntervalValue === '')
            return { ...aPanelInfo, axisInterval: { IntervalType: '', IntervalValue: '' }, isAxisInterval: false };
        else return { ...aPanelInfo, isAxisInterval: true };
    };

    const validateTransformAliases = (aPanelInfo: any) => {
        if (aPanelInfo?.transformBlockList && aPanelInfo.transformBlockList.length > 0) {
            for (const transformBlock of aPanelInfo.transformBlockList) {
                if (!transformBlock.alias || transformBlock.alias.trim() === '') {
                    Toast.error('Transform alias cannot be empty. Please enter an alias for all transform blocks.');
                    return false;
                }
            }
        }
        return true;
    };
    // Preview
    const applyPanel = async (aTime?: any) => {
        // Validate transform aliases first
        if (!validateTransformAliases(sPanelOption)) {
            return;
        }

        const sTmpPanelOption = checkXAxisInterval(sPanelOption);
        sTmpPanelOption.version = getDefaultVersionForExtension(E_VERSIONED_EXTENSION.DSH);

        if (sPanelOption.type === 'Tql chart') {
            if (sTmpPanelOption.useCustomTime) {
                let sStart: any;
                let sEnd: any;
                if (typeof sTmpPanelOption.timeRange.start === 'string' && sTmpPanelOption.timeRange.start.includes('now')) {
                    sStart = sTmpPanelOption.timeRange.start;
                } else {
                    sStart = moment(sTmpPanelOption.timeRange.start).unix() * 1000;
                    if (sStart < 0 || isNaN(sStart)) {
                        Toast.error('Please check the entered time.');
                        return;
                    }
                }
                if (typeof sTmpPanelOption.timeRange.end === 'string' && sTmpPanelOption.timeRange.end.includes('now')) {
                    sEnd = sTmpPanelOption.timeRange.end;
                } else {
                    sEnd = moment(sTmpPanelOption.timeRange.end).unix() * 1000;
                    if (sEnd < 0 || isNaN(sEnd)) {
                        Toast.error('Please check the entered time.');
                        return;
                    }
                }
                if (isValidJSON(JSON.stringify(sTmpPanelOption))) {
                    const sTempOption = { ...sTmpPanelOption, timeRange: { ...sTmpPanelOption.timeRange, start: sStart, end: sEnd } };
                    setAppliedPanelOption(sTempOption);
                    pSetModifyState({ id: PanelIdParser('undefined-' + sTmpPanelOption.id), state: true });
                }
            } else {
                setAppliedPanelOption(sPanelOption);
                setCreateModeTimeMinMax((preTime: any) => JSON.parse(JSON.stringify(preTime ?? defaultMinMax())));
                setIsPreview(() => true);
            }
        } else {
            if (sTmpPanelOption.useCustomTime) {
                let sStart: any;
                let sEnd: any;
                if (typeof sTmpPanelOption.timeRange.start === 'string' && (sTmpPanelOption.timeRange.start.includes('now') || sTmpPanelOption.timeRange.start.includes('last'))) {
                    sStart = sTmpPanelOption.timeRange.start;
                } else {
                    sStart = moment(sTmpPanelOption.timeRange.start).unix() * 1000;
                    if (sStart < 0 || isNaN(sStart)) {
                        Toast.error('Please check the entered time.');
                        return;
                    }
                }
                if (typeof sTmpPanelOption.timeRange.end === 'string' && (sTmpPanelOption.timeRange.end.includes('now') || sTmpPanelOption.timeRange.end.includes('last'))) {
                    sEnd = sTmpPanelOption.timeRange.end;
                } else {
                    sEnd = moment(sTmpPanelOption.timeRange.end).unix() * 1000;
                    if (sEnd < 0 || isNaN(sEnd)) {
                        Toast.error('Please check the entered time.');
                        return;
                    }
                }
                if (isValidJSON(JSON.stringify(sTmpPanelOption))) {
                    const sTempOption = { ...sTmpPanelOption, timeRange: { ...sTmpPanelOption.timeRange, start: sStart, end: sEnd } };
                    setAppliedPanelOption(sTempOption);
                    pSetModifyState({ id: PanelIdParser('undefined-' + sTmpPanelOption.id), state: true });
                }
            } else {
                const sChartPanelList = pBoardInfo.dashboard.panels.filter((panel: any) => panel.type !== 'Tql chart');
                if (isValidJSON(JSON.stringify(sTmpPanelOption))) {
                    setAppliedPanelOption(sTmpPanelOption);
                }
                if (pType === 'create' && (!pBoardTimeMinMax || sChartPanelList.length === 0)) {
                    const sTime = await getTimeMinMax(aTime ?? pBoardInfo.dashboard.timeRange);
                    if (sChartPanelList.length === 0) {
                        setCreateModeTimeMinMax(sTime);
                        setIsPreview(() => true);
                    }
                } else if (pType === 'edit') {
                    setCreateModeTimeMinMax(await getTimeMinMax(pBoardInfo.dashboard.timeRange));
                    setIsPreview(() => true);
                }
                pSetModifyState({ id: PanelIdParser('undefined-' + sTmpPanelOption.id), state: true });
            }
        }
    };
    const defaultMinMax = () => {
        const sNowTime = moment().unix() * 1000;
        const sNowTimeMinMax = { min: moment(sNowTime).subtract(1, 'h').unix() * 1000, max: sNowTime };
        setCreateModeTimeMinMax(() => sNowTimeMinMax);
        return sNowTimeMinMax;
    };
    const getTimeMinMax = async (aTimeRange: any) => {
        const sTargetPanel = pType === 'create' ? sPanelOption : pBoardInfo?.dashboard.panels.filter((aPanel: any) => aPanel.type !== 'Tql chart')[0];
        const sTargetTag = sTargetPanel?.blockList ? sTargetPanel.blockList[0] : { tag: '' };
        const sIsTagName = sTargetTag.tag && sTargetTag.tag !== '';
        const sIsCreateModeFirstPanel =
            pType === 'create' &&
            pBoardInfo.dashboard.panels.filter((panel: any) => panel.type !== 'Tql chart').length === pBoardInfo?.dashboard?.panels?.length &&
            pBoardInfo.dashboard.panels.filter((panel: any) => panel.type !== 'Tql chart').length <= 0;
        const sCustomTag =
            sIsTagName &&
            sTargetTag.filter.filter((aFilter: any) => {
                if (aFilter.column === 'NAME' && (aFilter.operator === '=' || aFilter.operator === 'in') && aFilter.value && aFilter.value !== '') return aFilter;
            })[0]?.value;
        if (sIsTagName || (sTargetTag.useCustom && sCustomTag) || sIsCreateModeFirstPanel) {
            if (sTargetTag?.customTable || sTargetTag?.tag?.match(VARIABLE_REGEX) || !sTargetTag?.tag) return pBoardTimeMinMax ? pBoardTimeMinMax : defaultMinMax();
            let sSvrResult: any = undefined;
            if (sTargetTag.table.split('.').length > 2) {
                sSvrResult = await fetchMountTimeMinMax(sTargetTag);
            } else {
                sSvrResult = sTargetTag.useCustom ? await fetchTimeMinMax({ ...sTargetTag, tag: sCustomTag }) : await fetchTimeMinMax(sTargetTag);
            }
            if (!sSvrResult) return pBoardTimeMinMax ? pBoardTimeMinMax : defaultMinMax();
            const sSvrMinMax: { min: number; max: number } = { min: Math.floor(sSvrResult[0][0] / 1000000), max: Math.floor(sSvrResult[0][1] / 1000000) };
            const sTimeMinMax = timeMinMaxConverter(aTimeRange.start, aTimeRange.end, sSvrMinMax);
            setCreateModeTimeMinMax(() => sTimeMinMax);
            return sTimeMinMax;
        } else {
            return pBoardTimeMinMax ? pBoardTimeMinMax : defaultMinMax();
        }
    };
    const getTables = async (aStatus: boolean) => {
        const sResult: any = await getTableList();
        if (sResult && sResult?.success) {
            const newTable = sResult.data.rows.filter((aItem: any) => getTableType(aItem[4]) === 'log' || getTableType(aItem[4]) === 'tag');
            const sParesdTable = parseDashboardTables({ columns: sResult.data.columns, rows: newTable });
            setTableList(sParesdTable);
            if (aStatus) {
                if (pType === 'create') {
                    const sToken = localStorage.getItem('accessToken');
                    if (sToken) {
                        let sOption = DefaultChartOption;
                        // no table
                        if (newTable.length === 0) {
                            sOption = {
                                ...sOption,
                                id: generateUUID(),
                                blockList: createDefaultTagTableOption(decodeJwt(sToken).sub, newTable[0], 'none', ''),
                            };
                            setPanelOption(sOption);
                            setAppliedPanelOption(JSON.parse(JSON.stringify(sOption)));
                            return;
                        }
                        const sSortedTable = [...newTable].sort((aTable: any, bTable: any) => {
                            const aType = getTableType(aTable[4]);
                            const bType = getTableType(bTable[4]);
                            return TableTypeOrderList.indexOf(aType) - TableTypeOrderList.indexOf(bType);
                        });
                        const sTableType = getTableType(sSortedTable[0][4]);
                        sOption = {
                            ...sOption,
                            id: generateUUID(),
                            blockList: createDefaultTagTableOption(decodeJwt(sToken).sub, sSortedTable[0], sTableType, ''),
                        };
                        sOption.chartOptions = getDefaultSeriesOption(sOption.type);
                        setPanelOption(sOption);
                        setAppliedPanelOption(JSON.parse(JSON.stringify(sOption)));
                    }
                } else {
                    setPanelOption(pBoardInfo.dashboard.panels.find((aItem: any) => aItem.id === pPanelId));
                    setAppliedPanelOption(JSON.parse(JSON.stringify(pBoardInfo.dashboard.panels.find((aItem: any) => aItem.id === pPanelId))));
                }
            }
        }
    };
    const handleClose = () => {
        pSetType(undefined);
        pSetCreateModal(false);
        if (pBoardInfo.path === '') pSetIsSaveModal(true);
    };
    const handleDiscard = () => {
        pSetType(undefined);
        pSetCreateModal(false);
    };
    const handleTimeRange = () => {
        pSetTimeRangeModal(true);
    };
    const init = async () => {
        if (pType === 'edit') setCreateModeTimeMinMax(async () => await getTimeMinMax(pBoardInfo?.dashboard?.timeRange));
        await getTables(true);
    };
    const handlePreviewText = () => {
        if (JSON.stringify(sPanelOption) !== JSON.stringify(sAppliedPanelOption)) return 'Apply';
        return 'Refresh';
    };

    useEffect(() => {
        init();
    }, []);
    useEffect(() => {
        if (sTableList.length > 0 && JSON.stringify(sBoardTimeRange) !== JSON.stringify(pBoardInfo?.dashboard?.timeRange)) {
            setBoardTimeRange(() => pBoardInfo?.dashboard?.timeRange);
            applyPanel(pBoardInfo?.dashboard?.timeRange);
        }
    }, [pBoardInfo?.dashboard?.timeRange]);

    return (
        <Page style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999 }}>
            <Page.Header>
                <Page.DpRow>
                    <Button variant="ghost" size="icon" icon={<IoArrowBackOutline size={16} />} onClick={handleDiscard} />
                    Create panel
                </Page.DpRow>
                <Page.DpRow>
                    <Button.Group>
                        <Button size="icon" variant="ghost" icon={<VscChevronLeft size={14} />} onClick={() => pMoveTimeRange('l')} />
                        <Button size="sm" variant="ghost" onClick={handleTimeRange}>
                            <Calendar style={{ paddingRight: '8px' }} />
                            {pBoardInfo?.dashboard?.timeRange?.start ? (
                                <>
                                    {formatTimeValue(pBoardInfo.dashboard.timeRange.start) + '~' + formatTimeValue(pBoardInfo.dashboard.timeRange.end)}
                                </>
                            ) : (
                                <span>Time range not set</span>
                            )}
                            , Refresh : {pBoardInfo.dashboard.timeRange.refresh}
                        </Button>
                        <Button size="icon" variant="ghost" isToolTip toolTipContent="Move range" icon={<VscChevronRight size={14} />} onClick={() => pMoveTimeRange('r')} />
                    </Button.Group>
                    <Page.Divi direction={'vertical'} />
                    <Page.DpRow>
                        <Page.TextButton pText="Discard" pType="DELETE" pCallback={handleDiscard} pWidth="75px" mb="0px" mr="4px" />
                        <Page.TextButton pText={handlePreviewText()} pType="STATUS" pCallback={() => applyPanel()} pWidth="75px" mb="0px" mr="4px" />
                        <Page.TextButton pText="Save" pType="CREATE" pCallback={pType === 'create' ? () => addPanel() : () => editPanel()} pWidth="65px" mb="0px" mr="4px" />
                    </Page.DpRow>
                </Page.DpRow>
            </Page.Header>
            <Page.Body>
                <SplitPane
                    className="split-side"
                    split="vertical"
                    onDragEnd={() => setInsetDraging(false)}
                    onDragStart={() => setInsetDraging(true)}
                    sizes={sSideSizes}
                    onChange={setSideSizes}
                >
                    <Pane maxSize="80%" minSize="500px">
                        <SplitPane
                            onDragEnd={() => setInsetDraging(false)}
                            onDragStart={() => setInsetDraging(true)}
                            className="split-bottom"
                            split="horizontal"
                            sizes={sBottomSizes}
                            onChange={setBottomSizes}
                        >
                            <Pane minSize="20%">
                                {sAppliedPanelOption.id && (
                                    <CreatePanelBody
                                        pLoopMode={pLoopMode}
                                        pBoardInfo={pBoardInfo}
                                        pType={pType}
                                        pInsetDraging={sInsetDraging}
                                        pPanelInfo={sAppliedPanelOption}
                                        pModifyState={pModifyState}
                                        pSetModifyState={pSetModifyState}
                                        pBoardTimeMinMax={(pType === 'create' && !pBoardTimeMinMax) || sIsPreview ? sCreateModeTimeMinMax : pBoardTimeMinMax}
                                    />
                                )}
                            </Pane>
                            <Pane minSize="10%">
                                {sPanelOption.id && (
                                    <CreatePanelFooter
                                        pType={pType}
                                        pVariables={pBoardInfo?.dashboard?.variables ?? []}
                                        pGetTables={getTables}
                                        pTableList={sTableList}
                                        pPanelOption={sPanelOption}
                                        pSetPanelOption={setPanelOption}
                                    />
                                )}
                            </Pane>
                        </SplitPane>
                    </Pane>
                    <Pane>{sPanelOption.id && <CreatePanelRight pType={pType} pPanelOption={sPanelOption} pSetPanelOption={setPanelOption} />}</Pane>
                </SplitPane>
            </Page.Body>
        </Page>
    );
};
export default CreatePanel;
