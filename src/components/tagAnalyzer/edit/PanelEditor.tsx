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
import { flattenTagAnalyzerPanelInfo } from '../panel/TagAnalyzerPanelTypes';
import type { TagAnalyzerPanelInfo } from '../panel/TagAnalyzerPanelTypes';
import type { TagAnalyzerPanelEditorConfig } from './PanelEditorTypes';

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
        display: {
            chart_type: aPanelInfo.display.chart_type,
            show_legend: aPanelInfo.display.show_legend,
            show_point: aPanelInfo.display.show_point,
            point_radius: aPanelInfo.display.point_radius,
            fill: aPanelInfo.display.fill,
            stroke: aPanelInfo.display.stroke,
        },
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
        axes: {
            ...aEditorConfig.axes,
        },
        display: {
            ...aEditorConfig.display,
            use_zoom: aEditorConfig.general.use_zoom,
        },
    };
};

const PanelEditor = ({ pPanelInfo, pBoardInfo, pSetEditPanel, pSetSaveEditedInfo, pNavigatorRange }: any) => {
    const [sBoardList, setBoardList] = useRecoilState<any>(gBoardList);
    const [sGlobalSelectedTab] = useRecoilState<any>(gSelectedTab);
    const [sBgnEndTimeRange, setBgnEndTimeRange] = useState<any>(undefined);
    const [sSelectedTab, setSelectedTab] = useState('General');
    const [sPanelInfo, setPanelInfo] = useState<any>({});
    const [sEditorConfig, setEditorConfig] = useState<TagAnalyzerPanelEditorConfig | null>(null);
    const [sIsConfirmModal, setIsConfirmModal] = useState<boolean>(false);
    const [sLoading] = useState<boolean>(false);
    const [sData] = useState<any>(['General', 'Data', 'Axes', 'Display', 'Time']);

    const timeConverter = async (aTargetTime: any) => {
        let sData: any = { bgn_min: 0, bgn_max: 0, end_min: 0, end_max: 0 };
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
        const sNextPanelInfo = mergePanelEditorConfig((sPanelInfo.meta?.index_key ? sPanelInfo : pPanelInfo) as TagAnalyzerPanelInfo, sEditorConfig);
        let sData: any = { bgn_min: 0, bgn_max: 0, end_min: 0, end_max: 0 };
        if (sNextPanelInfo.time.range_bgn !== '') sData = await timeConverter({ range_bgn: sNextPanelInfo.time.range_bgn, range_end: sNextPanelInfo.time.range_end, tag_set: sNextPanelInfo.data.tag_set });
        else if (pBoardInfo.range_bgn !== '')
            sData = await timeConverter({ range_end: pBoardInfo.range_end, range_bgn: pBoardInfo.range_bgn, tag_set: pBoardInfo.panels[0].data.tag_set });
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
        pSetEditPanel(false);
    };
    const checkSameWithConfirmModal = () => {
        if (!sEditorConfig) return;
        const sDraftPanelInfo = mergePanelEditorConfig((sPanelInfo.meta?.index_key ? sPanelInfo : pPanelInfo) as TagAnalyzerPanelInfo, sEditorConfig);
        const sIsSame = deepEqual(sPanelInfo, sDraftPanelInfo);
        if (!sIsSame) {
            setIsConfirmModal(true);
            return;
        } else {
            save();
            return;
        }
    };
    const setInit = async () => {
        let sData: any = { bgn_min: 0, bgn_max: 0, end_min: 0, end_max: 0 };
        if (pPanelInfo.time.range_bgn !== '') sData = await timeConverter({ range_bgn: pPanelInfo.time.range_bgn, range_end: pPanelInfo.time.range_end, tag_set: pPanelInfo.data.tag_set });
        else if (pBoardInfo.range_bgn !== '') {
            sData = await timeConverter({ range_end: pBoardInfo.range_end, range_bgn: pBoardInfo.range_bgn, tag_set: pBoardInfo.panels[0].data.tag_set });
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
        setInit();
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
                        <Button variant="ghost" size="icon" icon={<IoArrowBackOutline size={16} />} onClick={() => pSetEditPanel(false)} aria-label="Back" />
                        Edit panel
                    </Page.DpRow>
                    <Page.DpRow>
                        <Page.TextButton pText="Discard" pType="DELETE" pCallback={() => pSetEditPanel(false)} pWidth="75px" mb="0px" mr="4px" />
                        <Page.TextButton pText="Apply" pType="STATUS" pCallback={apply} pWidth="75px" mb="0px" mr="4px" />
                        <Page.TextButton pText="Save" pType="CREATE" pCallback={checkSameWithConfirmModal} pWidth="65px" mb="0px" mr="4px" />
                    </Page.DpRow>
                </Page.Header>

                <PanelEditorPreview
                    pPanelInfo={sPanelInfo}
                    pBgnEndTimeRange={sBgnEndTimeRange}
                    pNavigatorRange={pNavigatorRange}
                    pBoardInfo={pBoardInfo}
                    pIsLoading={sLoading}
                />
                <Page style={{ height: 2 }}>
                    <Page.Divi spacing="0" />
                </Page>
                <PanelEditorSettings
                    pTabs={sData}
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
