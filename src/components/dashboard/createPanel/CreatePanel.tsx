import './CreatePanel.scss';
import { Calendar, IoArrowBackOutline, VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { TextButton } from '@/components/buttons/TextButton';
import SplitPane, { Pane } from 'split-pane-react';
import { useEffect, useState } from 'react';
import CreatePanelBody from './CreatePanelBody';
import CreatePanelFooter from './CreatePanelFooter';
import CreatePanelRight from './CreatePanelRight';
import { useRecoilState } from 'recoil';
import { gBoardList } from '@/recoil/recoil';
import { createDefaultTagTableOption, getChartDefaultWidthSize, getTableType } from '@/utils/dashboardUtil';
import { getTableList, postFileList } from '@/api/repository/api';
import { decodeJwt, generateUUID, isValidJSON } from '@/utils';
import { DefaultChartOption, getDefaultSeriesOption } from '@/utils/eChartHelper';
import { fetchTimeMinMax } from '@/api/repository/machiot';
import { timeMinMaxConverter } from '@/utils/bgnEndTimeRange';
import moment from 'moment';

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
    pSetBoardTimeMinMax: (aTimeRange: { min: number; max: number }) => void;
}) => {
    const [sSideSizes, setSideSizes] = useState<any>(['75%', '25%']);
    const [sBottomSizes, setBottomSizes] = useState<any>(['50%', '50%']);
    const [sInsetDraging, setInsetDraging] = useState(false);
    const [sPanelOption, setPanelOption] = useState<any>({});
    const [sAppliedPanelOption, setAppliedPanelOption] = useState<any>({});
    const [sTableList, setTableList] = useState<any>([]);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const [sTimeRangeStatus, setTimeRangeStatus] = useState<boolean>(false);
    const [sCreateModeTimeMinMax, setCreateModeTimeMinMax] = useState<any>(undefined);
    const [sIsPreview, setIsPreview] = useState<boolean>(false);

    // Create
    const addPanel = async () => {
        if (sPanelOption.useCustomTime) {
            let sStart: any;
            let sEnd: any;
            if (typeof sPanelOption.timeRange.start === 'string' && (sPanelOption.timeRange.start.includes('now') || sPanelOption.timeRange.start.includes('last'))) {
                sStart = sPanelOption.timeRange.start;
            } else {
                sStart = moment(sPanelOption.timeRange.start).unix() * 1000;
                if (sStart < 0 || isNaN(sStart)) {
                    Error('Please check the entered time.');
                    return;
                }
            }
            if (typeof sPanelOption.timeRange.end === 'string' && (sPanelOption.timeRange.end.includes('now') || sPanelOption.timeRange.start.includes('last'))) {
                sEnd = sPanelOption.timeRange.end;
            } else {
                sEnd = moment(sPanelOption.timeRange.end).unix() * 1000;
                if (sEnd < 0 || isNaN(sEnd)) {
                    Error('Please check the entered time.');
                    return;
                }
            }
        }
        sPanelOption.w = getChartDefaultWidthSize(sPanelOption.type, !!sPanelOption.chartOptions?.isPolar);
        let sSaveTarget: any = undefined;
        const sTabList = sBoardList.map((aItem) => {
            if (aItem.id === pBoardInfo.id) {
                sSaveTarget = {
                    ...aItem,
                    dashboard: {
                        ...aItem.dashboard,
                        panels: [...aItem.dashboard.panels, sPanelOption],
                    },
                };
                return sSaveTarget;
            } else return aItem;
        });
        setBoardList(() => sTabList);
        if (sSaveTarget.path !== '') postFileList(sSaveTarget, sSaveTarget.path, sSaveTarget.name);
        if (pBoardInfo.dashboard.panels.length === 0) {
            pSetBoardTimeMinMax(await getTimeMinMax(sPanelOption.useCustomTime ? sPanelOption.timeRange : pBoardInfo.dashboard.timeRange));
            pSetModifyState({ id: sPanelOption.id, state: true });
        } else {
            if (sCreateModeTimeMinMax) pSetBoardTimeMinMax(sCreateModeTimeMinMax);
            else pSetModifyState({ id: sPanelOption.id, state: true });
        }
        handleClose();
    };
    // Edit
    const editPanel = () => {
        const sNewPanelId = generateUUID();
        let sSaveTarget: any = undefined;
        const sTabList = sBoardList.map((aItem) => {
            if (aItem.id === pBoardInfo.id) {
                sSaveTarget = {
                    ...aItem,
                    dashboard: {
                        ...aItem.dashboard,
                        panels: aItem.dashboard.panels.map((bItem: any) => {
                            return bItem.id === pPanelId ? { ...sPanelOption, id: sNewPanelId } : bItem;
                        }),
                    },
                };
                return sSaveTarget;
            } else return aItem;
        });
        setBoardList(() => sTabList);
        if (sSaveTarget.path !== '') postFileList(sSaveTarget, sSaveTarget.path, sSaveTarget.name);
        if (sCreateModeTimeMinMax) pSetBoardTimeMinMax(sCreateModeTimeMinMax);
        handleClose();
    };
    // Preview
    const applyPanel = async () => {
        const sTmpPanelOption = JSON.parse(JSON.stringify(sPanelOption));

        if (sTmpPanelOption.useCustomTime) {
            let sStart: any;
            let sEnd: any;
            if (typeof sTmpPanelOption.timeRange.start === 'string' && (sTmpPanelOption.timeRange.start.includes('now') || sTmpPanelOption.timeRange.start.includes('last'))) {
                sStart = sTmpPanelOption.timeRange.start;
            } else {
                sStart = moment(sTmpPanelOption.timeRange.start).unix() * 1000;
                if (sStart < 0 || isNaN(sStart)) {
                    Error('Please check the entered time.');
                    return;
                }
            }
            if (typeof sTmpPanelOption.timeRange.end === 'string' && (sTmpPanelOption.timeRange.end.includes('now') || sTmpPanelOption.timeRange.end.includes('last'))) {
                sEnd = sTmpPanelOption.timeRange.end;
            } else {
                sEnd = moment(sTmpPanelOption.timeRange.end).unix() * 1000;
                if (sEnd < 0 || isNaN(sEnd)) {
                    Error('Please check the entered time.');
                    return;
                }
            }
            if (isValidJSON(JSON.stringify(sTmpPanelOption))) {
                const sTempOption = { ...sTmpPanelOption, timeRange: { ...sTmpPanelOption.timeRange, start: sStart, end: sEnd } };
                setAppliedPanelOption(sTempOption);
                pSetModifyState({ id: sTempOption.id, state: true });
            }
        } else {
            if (isValidJSON(JSON.stringify(sTmpPanelOption))) {
                setAppliedPanelOption(sTmpPanelOption);
            }
            if (pType === 'create' && !pBoardTimeMinMax) {
                getTimeMinMax(pBoardInfo.dashboard.timeRange);
            } else if (pType === 'edit') {
                setCreateModeTimeMinMax(await getTimeMinMax(pBoardInfo.dashboard.timeRange));
                setIsPreview(() => true);
            } else pSetModifyState({ id: sTmpPanelOption.id, state: true });
        }
    };
    const getTimeMinMax = async (aTimeRange: any) => {
        const sTargetPanel = sPanelOption;
        const sTargetTag = sTargetPanel.blockList[0];
        const sIsTagName = sTargetTag.tag && sTargetTag.tag !== '';
        const sCustomTag = sTargetTag.filter.filter((aFilter: any) => {
            if (aFilter.column === 'NAME' && (aFilter.operator === '=' || aFilter.operator === 'in') && aFilter.value && aFilter.value !== '') return aFilter;
        })[0]?.value;

        if (sIsTagName || (sTargetTag.useCustom && sCustomTag)) {
            const sSvrResult = sTargetTag.useCustom ? await fetchTimeMinMax({ ...sTargetTag, tag: sCustomTag }) : await fetchTimeMinMax(sTargetTag);
            const sSvrMinMax: { min: number; max: number } = { min: Math.floor(sSvrResult[0][0] / 1000000), max: Math.floor(sSvrResult[0][1] / 1000000) };
            const sTimeMinMax = timeMinMaxConverter(aTimeRange.start, aTimeRange.end, sSvrMinMax);
            setCreateModeTimeMinMax(() => sTimeMinMax);
            return sTimeMinMax;
        } else {
            const sNowTime = moment().unix() * 1000;
            const sNowTimeMinMax = { min: moment(sNowTime).subtract(1, 'h').unix() * 1000, max: sNowTime };
            setCreateModeTimeMinMax(() => sNowTimeMinMax);
            return sNowTimeMinMax;
        }
    };
    const getTables = async (aStatus: boolean) => {
        const sResult: any = await getTableList();
        if (sResult.success) {
            // TODO 만약 나중에 다른 테이블 추가하면 설정해줘야함
            const newTable = sResult.data.rows.filter((aItem: any) => getTableType(aItem[4]) === 'log' || getTableType(aItem[4]) === 'tag');
            setTableList(newTable);
            if (aStatus) {
                if (pType === 'create') {
                    const sToken = localStorage.getItem('accessToken');
                    if (sToken) {
                        let sOption = DefaultChartOption;
                        const sTableType = getTableType(newTable[0][4]);
                        // let sData: any = null;
                        // let sTag: string = '';
                        // if (sTableType === 'tag') sData = await fetchTags(newTable[0][3]);
                        // if (sData && sData.success && sData.data && sData.data.rows && sData.data.rows.length > 0) sTag = sData.data.rows[0][1];
                        sOption = {
                            ...sOption,
                            id: generateUUID(),
                            blockList: createDefaultTagTableOption(decodeJwt(sToken).sub, newTable[0], sTableType, ''),
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
        if (sTimeRangeStatus) return setTimeRangeStatus(() => false);
        if (pBoardInfo.path === '') pSetIsSaveModal(true);
    };
    const handleTimeRange = () => {
        setTimeRangeStatus(() => true);
        pSetTimeRangeModal(true);
    };
    const init = async () => {
        getTables(true);
    };

    useEffect(() => {
        init();
    }, []);

    return (
        <div className="create-panel-form">
            <div className="header">
                <div className="left">
                    <IconButton pWidth={20} pHeight={32} pIcon={<IoArrowBackOutline />} onClick={() => pSetCreateModal(false)} />
                    <span>Create panel</span>
                </div>

                <div className="right">
                    <div className="move-timerange-wrapper">
                        <IconButton pWidth={24} pHeight={24} pIcon={<VscChevronLeft />} onClick={() => pMoveTimeRange('l')} />
                        <button onClick={handleTimeRange} className="set-global-option-btn">
                            <Calendar />
                            {pBoardInfo && pBoardInfo.dashboard.timeRange.start ? (
                                <span>
                                    {(typeof pBoardInfo.dashboard.timeRange.start === 'string' &&
                                    (pBoardInfo.dashboard.timeRange.start.includes('now') || pBoardInfo.dashboard.timeRange.start.includes('last'))
                                        ? pBoardInfo.dashboard.timeRange.start
                                        : moment(pBoardInfo.dashboard.timeRange.start).format('yyyy-MM-DD HH:mm:ss')) +
                                        '~' +
                                        (typeof pBoardInfo.dashboard.timeRange.end === 'string' &&
                                        (pBoardInfo.dashboard.timeRange.end.includes('now') || pBoardInfo.dashboard.timeRange.end.includes('last'))
                                            ? pBoardInfo.dashboard.timeRange.end
                                            : moment(pBoardInfo.dashboard.timeRange.end).format('yyyy-MM-DD HH:mm:ss'))}
                                </span>
                            ) : (
                                <span>Time range not set</span>
                            )}
                            , Refresh : {pBoardInfo.dashboard.timeRange.refresh}
                        </button>
                        <IconButton pWidth={24} pHeight={24} pIcon={<VscChevronRight />} onClick={() => pMoveTimeRange('r')} />
                    </div>
                    <TextButton
                        pHeight={28}
                        pWidth={75}
                        pIsDisabled={false}
                        onClick={() => pSetCreateModal(false)}
                        pFontColor="rgb(231 65 131)"
                        pText="Discard"
                        pBorderColor="rgb(231 65 131)"
                        pBorderRadius={2}
                        pBackgroundColor="transparent"
                    />
                    <TextButton
                        pBorderColor="#4199ff"
                        pHeight={28}
                        pWidth={65}
                        pFontColor="#4199ff"
                        pBorderRadius={2}
                        pIsDisabled={JSON.stringify(sPanelOption) === JSON.stringify(sAppliedPanelOption)}
                        onClick={() => applyPanel()}
                        pText="Apply"
                        pBackgroundColor="transparent"
                    />
                    <TextButton
                        pBorderColor="#4199ff"
                        pHeight={28}
                        pWidth={65}
                        pBorderRadius={2}
                        pIsDisabled={false}
                        onClick={pType === 'create' ? () => addPanel() : () => editPanel()}
                        pText="Save"
                        pBackgroundColor="#4199ff"
                    />
                </div>
            </div>
            <div className="body">
                <SplitPane
                    className="split-side"
                    sashRender={() => <></>}
                    split="vertical"
                    onDragEnd={() => setInsetDraging(false)}
                    onDragStart={() => setInsetDraging(true)}
                    sizes={sSideSizes}
                    onChange={setSideSizes}
                >
                    <Pane maxSize="95%">
                        <SplitPane
                            onDragEnd={() => setInsetDraging(false)}
                            onDragStart={() => setInsetDraging(true)}
                            className="split-bottom"
                            sashRender={() => <></>}
                            split="horizontal"
                            sizes={sBottomSizes}
                            onChange={setBottomSizes}
                        >
                            <Pane maxSize="90%">
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
                            <Pane>
                                {sPanelOption.id && (
                                    <CreatePanelFooter pType={pType} pGetTables={getTables} pTableList={sTableList} pPanelOption={sPanelOption} pSetPanelOption={setPanelOption} />
                                )}
                            </Pane>
                        </SplitPane>
                    </Pane>
                    <Pane>{sPanelOption.id && <CreatePanelRight pType={pType} pPanelOption={sPanelOption} pSetPanelOption={setPanelOption} />}</Pane>
                </SplitPane>
            </div>
        </div>
    );
};
export default CreatePanel;
