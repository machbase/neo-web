import { useEffect, useState } from 'react';
import PanelEditorPreview from './PanelEditorPreview';
import PanelEditorSettings from './sections/PanelEditorSettings';
import { useRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { IoArrowBackOutline } from '@/assets/icons/Icon';
import { deepEqual } from '@/utils/index';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { getBgnEndTimeRange, subtractTime } from '@/utils/bgnEndTimeRange';
import { convertTimeToFullDate } from '@/utils/helpers/date';
import { fetchVirtualStatTable } from '@/api/repository/machiot';
import { Page, Button } from '@/design-system/components';
import { flattenTagAnalyzerPanelInfo } from '../panel/TagAnalyzerPanelModelUtil';
import type { Dispatch, SetStateAction } from 'react';
import type { TagAnalyzerBoardInfo } from '../TagAnalyzerType';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerPanelInfo,
    TagAnalyzerTagItem,
    TagAnalyzerTimeRange,
} from '../panel/TagAnalyzerPanelModelTypes';
import type {
    PanelEditTab,
    TagAnalyzerEditorNumericValue,
    TagAnalyzerPanelAxesDraft,
    TagAnalyzerPanelDisplayDraft,
    TagAnalyzerPanelEditorConfig,
} from './PanelEditorTypes';

const EDITOR_TABS: PanelEditTab[] = ['General', 'Data', 'Axes', 'Display', 'Time'];

const normalizeDraftNumber = (aValue: TagAnalyzerEditorNumericValue): number => {
    return aValue === '' ? 0 : aValue;
};

const mergeAxesDraft = (aAxes: TagAnalyzerPanelAxesDraft) => {
    return {
        ...aAxes,
        pixels_per_tick_raw: normalizeDraftNumber(aAxes.pixels_per_tick_raw),
        pixels_per_tick: normalizeDraftNumber(aAxes.pixels_per_tick),
        sampling_value: normalizeDraftNumber(aAxes.sampling_value),
        custom_min: normalizeDraftNumber(aAxes.custom_min),
        custom_max: normalizeDraftNumber(aAxes.custom_max),
        custom_drilldown_min: normalizeDraftNumber(aAxes.custom_drilldown_min),
        custom_drilldown_max: normalizeDraftNumber(aAxes.custom_drilldown_max),
        ucl_value: normalizeDraftNumber(aAxes.ucl_value),
        lcl_value: normalizeDraftNumber(aAxes.lcl_value),
        custom_min2: normalizeDraftNumber(aAxes.custom_min2),
        custom_max2: normalizeDraftNumber(aAxes.custom_max2),
        custom_drilldown_min2: normalizeDraftNumber(aAxes.custom_drilldown_min2),
        custom_drilldown_max2: normalizeDraftNumber(aAxes.custom_drilldown_max2),
        ucl2_value: normalizeDraftNumber(aAxes.ucl2_value),
        lcl2_value: normalizeDraftNumber(aAxes.lcl2_value),
    };
};

const mergeDisplayDraft = (aDisplay: TagAnalyzerPanelDisplayDraft) => {
    return {
        ...aDisplay,
        point_radius: normalizeDraftNumber(aDisplay.point_radius),
        fill: normalizeDraftNumber(aDisplay.fill),
        stroke: normalizeDraftNumber(aDisplay.stroke),
    };
};

const createPanelEditorConfig = (aPanelInfo: TagAnalyzerPanelInfo): TagAnalyzerPanelEditorConfig => {
    return {
        general: {
            chart_title: aPanelInfo.meta.chart_title,
            use_zoom: aPanelInfo.display.use_zoom,
            use_time_keeper: aPanelInfo.time.use_time_keeper,
            time_keeper: aPanelInfo.time.time_keeper,
        },
        data: {
            index_key: aPanelInfo.meta.index_key,
            tag_set: aPanelInfo.data.tag_set,
        },
        axes: aPanelInfo.axes,
        display: aPanelInfo.display,
        time: {
            range_bgn: aPanelInfo.time.range_bgn,
            range_end: aPanelInfo.time.range_end,
        },
    };
};

const mergePanelEditorConfig = (aBasePanelInfo: TagAnalyzerPanelInfo, aEditorConfig: TagAnalyzerPanelEditorConfig): TagAnalyzerPanelInfo => {
    return {
        ...aBasePanelInfo,
        meta: {
            ...aBasePanelInfo.meta,
            index_key: aEditorConfig.data.index_key,
            chart_title: aEditorConfig.general.chart_title,
        },
        data: {
            ...aBasePanelInfo.data,
            tag_set: aEditorConfig.data.tag_set,
        },
        time: {
            ...aBasePanelInfo.time,
            range_bgn: aEditorConfig.time.range_bgn,
            range_end: aEditorConfig.time.range_end,
            use_time_keeper: aEditorConfig.general.use_time_keeper,
            time_keeper: aEditorConfig.general.time_keeper,
        },
        axes: mergeAxesDraft(aEditorConfig.axes),
        display: {
            ...mergeDisplayDraft(aEditorConfig.display),
            use_zoom: aEditorConfig.general.use_zoom,
        },
    };
};

const PanelEditor = ({
    pPanelInfo,
    pBoardInfo,
    pSetEditPanel,
    pSetSaveEditedInfo,
    pNavigatorRange,
}: {
    pPanelInfo: TagAnalyzerPanelInfo;
    pBoardInfo: TagAnalyzerBoardInfo;
    pSetEditPanel: () => void;
    pSetSaveEditedInfo: Dispatch<SetStateAction<boolean>>;
    pNavigatorRange: TagAnalyzerTimeRange;
}) => {
    const [sBoardList, setBoardList] = useRecoilState<any>(gBoardList);
    const [sGlobalSelectedTab] = useRecoilState<any>(gSelectedTab);
    const [sBgnEndTimeRange, setBgnEndTimeRange] = useState<Partial<TagAnalyzerBgnEndTimeRange> | undefined>(undefined);
    const [sSelectedTab, setSelectedTab] = useState<PanelEditTab>('General');
    const [sPanelInfo, setPanelInfo] = useState<TagAnalyzerPanelInfo | null>(null);
    const [sEditorConfig, setEditorConfig] = useState<TagAnalyzerPanelEditorConfig | null>(null);
    const [sIsConfirmModal, setIsConfirmModal] = useState<boolean>(false);
    const [sLoading] = useState<boolean>(false);

    const resolveEditorTimeBounds = async (aTargetTime: {
        range_bgn: TagAnalyzerPanelInfo['time']['range_bgn'];
        range_end: TagAnalyzerPanelInfo['time']['range_end'];
        tag_set: TagAnalyzerTagItem[];
    }) => {
        let sData: Partial<TagAnalyzerBgnEndTimeRange> = { bgn_min: 0, bgn_max: 0, end_min: 0, end_max: 0 };
        // Set last
        if (typeof aTargetTime.range_bgn === 'string' && aTargetTime.range_bgn.includes('last')) {
            const sLastRange = await getBgnEndTimeRange(aTargetTime.tag_set, { bgn: aTargetTime.range_bgn, end: aTargetTime.range_end }, { bgn: '', end: '' });
            sData = {
                bgn_min: subtractTime(sLastRange.end_max as number, aTargetTime.range_bgn),
                bgn_max: subtractTime(sLastRange.end_max as number, aTargetTime.range_bgn),
                end_min: subtractTime(sLastRange.end_max as number, aTargetTime.range_end),
                end_max: subtractTime(sLastRange.end_max as number, aTargetTime.range_end),
            };
        }
        // Set now
       if (typeof aTargetTime.range_bgn === 'string' && aTargetTime.range_bgn.includes('now')) {
            const sNowTimeBgn = convertTimeToFullDate(aTargetTime.range_bgn);
            const sNowTimeEnd = convertTimeToFullDate(aTargetTime.range_end);
            sData = { bgn_min: sNowTimeBgn, bgn_max: sNowTimeBgn, end_min: sNowTimeEnd, end_max: sNowTimeEnd };
        } 
        // Set range
        if (typeof aTargetTime.range_bgn === 'number') {
            sData = { bgn_min: aTargetTime.range_bgn, bgn_max: aTargetTime.range_bgn, end_min: aTargetTime.range_end, end_max: aTargetTime.range_end };
        }
        // Set defulat ('')
        if (aTargetTime.range_bgn === '' || aTargetTime.range_end === '') {
            sData = {
                bgn_min: pNavigatorRange.startTime,
                bgn_max: pNavigatorRange.startTime,
                end_min: pNavigatorRange.endTime,
                end_max: pNavigatorRange.endTime,
            };
        }
        return sData;
    };
    const apply = async () => {
        if (!sEditorConfig) return;
        const sNextPanelInfo = mergePanelEditorConfig(sPanelInfo?.meta?.index_key ? sPanelInfo : pPanelInfo, sEditorConfig);
        let sData: Partial<TagAnalyzerBgnEndTimeRange> = { bgn_min: 0, bgn_max: 0, end_min: 0, end_max: 0 };
        if (sNextPanelInfo.time.range_bgn !== '') sData = await resolveEditorTimeBounds({ range_bgn: sNextPanelInfo.time.range_bgn, range_end: sNextPanelInfo.time.range_end, tag_set: sNextPanelInfo.data.tag_set });
        else if (pBoardInfo.range_bgn !== '')
            sData = await resolveEditorTimeBounds({ range_end: pBoardInfo.range_end, range_bgn: pBoardInfo.range_bgn, tag_set: pBoardInfo.panels[0].data.tag_set });
        else {
            const sVirtualStatInfo = await fetchVirtualStatTable(sNextPanelInfo.data.tag_set[0].table, [sNextPanelInfo.data.tag_set[0].tagName], sNextPanelInfo.data.tag_set[0]);
            sData = {
                bgn_min: sVirtualStatInfo[0][0] / 1000000,
                bgn_max: sVirtualStatInfo[0][0] / 1000000,
                end_min: sVirtualStatInfo[0][1] / 1000000,
                end_max: sVirtualStatInfo[0][1] / 1000000,
            };
        }
        setPanelInfo(() => sNextPanelInfo);
        setBgnEndTimeRange(() => sData);
    };
    const save = () => {
        if (!sPanelInfo) return;
        setBoardList(
            sBoardList.map((aItem: any) => {
                return aItem.id === sGlobalSelectedTab
                    ? {
                          ...aItem,
                          panels: aItem.panels.map((bItem: any) => {
                              return bItem.index_key === pPanelInfo.meta.index_key ? flattenTagAnalyzerPanelInfo(sPanelInfo) : bItem;
                          }),
                      }
                    : aItem;
            })
        );
        pSetSaveEditedInfo(true);
        pSetEditPanel();
    };
    const checkSameWithConfirmModal = () => {
        if (!sEditorConfig) return;
        const sDraftPanelInfo = mergePanelEditorConfig(sPanelInfo?.meta?.index_key ? sPanelInfo : pPanelInfo, sEditorConfig);
        const sIsSame = deepEqual(sPanelInfo, sDraftPanelInfo);
        if (!sIsSame) {
            setIsConfirmModal(true);
            return;
        } else {
            save();
            return;
        }
    };
    const initializeEditor = async () => {
        let sData: Partial<TagAnalyzerBgnEndTimeRange> = { bgn_min: 0, bgn_max: 0, end_min: 0, end_max: 0 };
        if (pPanelInfo.time.range_bgn !== '') sData = await resolveEditorTimeBounds({ range_bgn: pPanelInfo.time.range_bgn, range_end: pPanelInfo.time.range_end, tag_set: pPanelInfo.data.tag_set });
        else if (pBoardInfo.range_bgn !== '') {
            sData = await resolveEditorTimeBounds({ range_end: pBoardInfo.range_end, range_bgn: pBoardInfo.range_bgn, tag_set: pBoardInfo.panels[0].data.tag_set });
        } else {
            const sVirtualStatInfo = await fetchVirtualStatTable(pPanelInfo.data.tag_set[0].table, [pPanelInfo.data.tag_set[0].tagName], pPanelInfo.data.tag_set[0]);
            sData = {
                bgn_min: sVirtualStatInfo[0][0] / 1000000,
                bgn_max: sVirtualStatInfo[0][0] / 1000000,
                end_min: sVirtualStatInfo[0][1] / 1000000,
                end_max: sVirtualStatInfo[0][1] / 1000000,
            };
        }
        setBgnEndTimeRange(() => sData);
        setPanelInfo(pPanelInfo);
        setEditorConfig(createPanelEditorConfig(pPanelInfo));
    };

    useEffect(() => {
        initializeEditor();
    }, []);

    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
                zIndex: 9999,
                backgroundColor: 'var(--color-background-primary)',
            }}
        >
            <Page style={{ width: '100%', height: '100%' }}>
                <Page.Header>
                    <Page.DpRow>
                        <Button variant="ghost" size="icon" icon={<IoArrowBackOutline size={16} />} onClick={pSetEditPanel} aria-label="Back" />
                        Edit panel
                    </Page.DpRow>
                    <Page.DpRow>
                        <Page.TextButton pText="Discard" pType="DELETE" pCallback={pSetEditPanel} pWidth="75px" mb="0px" mr="4px" />
                        <Page.TextButton pText="Apply" pType="STATUS" pCallback={apply} pWidth="75px" mb="0px" mr="4px" />
                        <Page.TextButton pText="Save" pType="CREATE" pCallback={checkSameWithConfirmModal} pWidth="65px" mb="0px" mr="4px" />
                    </Page.DpRow>
                </Page.Header>

                <PanelEditorPreview
                    pPanelSource={{
                        panelInfo: sPanelInfo,
                        bgnEndTimeRange: sBgnEndTimeRange,
                        navigatorRange: pNavigatorRange,
                        boardInfo: pBoardInfo,
                    }}
                    pLoadState={{
                        isLoading: sLoading,
                    }}
                />
                <Page style={{ height: 2 }}>
                    <Page.Divi spacing="0" />
                </Page>
                <PanelEditorSettings
                    pTabs={[...EDITOR_TABS]}
                    pSelectedTab={sSelectedTab}
                    pSetSelectedTab={setSelectedTab}
                    pEditorConfig={sEditorConfig}
                    pSetEditorConfig={setEditorConfig}
                />
            </Page>

            {sIsConfirmModal && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsConfirmModal}
                    pCallback={save}
                    pContents={
                        <>
                            <div className="body-content">There are contents that have not been applied.</div>
                            <div className="body-content">Are you sure you want to save it?</div>
                        </>
                    }
                />
            )}
        </div>
    );
};

export default PanelEditor;
