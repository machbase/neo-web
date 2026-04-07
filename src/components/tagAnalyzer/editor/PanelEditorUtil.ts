import { deepEqual } from '@/utils';
import { getBgnEndTimeRange, subtractTime } from '@/utils/bgnEndTimeRange';
import { flattenTagAnalyzerPanelInfo } from '../panel/PanelModelUtil';
import { convertTimeToFullDate } from '../tagAnalyzerUtilReplacement/TagAnalyzerDateUtil';
import type { TagAnalyzerBoardSourceInfo } from '../TagAnalyzerType';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerPanelInfo,
    TagAnalyzerTagItem,
    TagAnalyzerTimeRange,
} from '../panel/TagAnalyzerPanelModelTypes';
import type {
    EditTabPanelType,
    TagAnalyzerEditorNumericValue,
    TagAnalyzerPanelAxesDraft,
    TagAnalyzerPanelDisplayDraft,
    TagAnalyzerPanelEditorConfig,
} from './PanelEditorTypes';

export const EDITOR_TABS: EditTabPanelType[] = ['General', 'Data', 'Axes', 'Display', 'Time'];

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

export const createPanelEditorConfig = (aPanelInfo: TagAnalyzerPanelInfo): TagAnalyzerPanelEditorConfig => {
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

export const mergePanelEditorConfig = (
    aBasePanelInfo: TagAnalyzerPanelInfo,
    aEditorConfig: TagAnalyzerPanelEditorConfig,
): TagAnalyzerPanelInfo => {
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

export const resolveEditorTimeBounds = async ({
    range_bgn,
    range_end,
    tag_set,
    navigatorRange,
}: {
    range_bgn: TagAnalyzerPanelInfo['time']['range_bgn'];
    range_end: TagAnalyzerPanelInfo['time']['range_end'];
    tag_set: TagAnalyzerTagItem[];
    navigatorRange: TagAnalyzerTimeRange;
}): Promise<Partial<TagAnalyzerBgnEndTimeRange>> => {
    let sData: Partial<TagAnalyzerBgnEndTimeRange> = { bgn_min: 0, bgn_max: 0, end_min: 0, end_max: 0 };

    if (typeof range_bgn === 'string' && range_bgn.includes('last')) {
        const sLastRange = await getBgnEndTimeRange(tag_set, { bgn: range_bgn, end: range_end }, { bgn: '', end: '' });
        sData = {
            bgn_min: subtractTime(sLastRange.end_max as number, range_bgn),
            bgn_max: subtractTime(sLastRange.end_max as number, range_bgn),
            end_min: subtractTime(sLastRange.end_max as number, range_end),
            end_max: subtractTime(sLastRange.end_max as number, range_end),
        };
    }

    if (typeof range_bgn === 'string' && range_bgn.includes('now')) {
        const sNowTimeBgn = convertTimeToFullDate(range_bgn);
        const sNowTimeEnd = convertTimeToFullDate(range_end);
        sData = { bgn_min: sNowTimeBgn, bgn_max: sNowTimeBgn, end_min: sNowTimeEnd, end_max: sNowTimeEnd };
    }

    if (typeof range_bgn === 'number') {
        sData = { bgn_min: range_bgn, bgn_max: range_bgn, end_min: range_end, end_max: range_end };
    }

    if (range_bgn === '' || range_end === '') {
        sData = {
            bgn_min: navigatorRange.startTime,
            bgn_max: navigatorRange.startTime,
            end_min: navigatorRange.endTime,
            end_max: navigatorRange.endTime,
        };
    }

    return sData;
};

export const hasUnappliedEditorChanges = (
    aAppliedPanelInfo: TagAnalyzerPanelInfo,
    aDraftPanelInfo: TagAnalyzerPanelInfo,
) => {
    return !deepEqual(aAppliedPanelInfo, aDraftPanelInfo);
};

export const replaceEditedPanelInBoardList = (
    aBoards: TagAnalyzerBoardSourceInfo[],
    aBoardId: TagAnalyzerBoardSourceInfo['id'],
    aPanelKey: TagAnalyzerPanelInfo['meta']['index_key'],
    aPanelInfo: TagAnalyzerPanelInfo,
) => {
    return aBoards.map((aBoard) =>
        aBoard.id === aBoardId
            ? {
                  ...aBoard,
                  panels: aBoard.panels.map((aPanel) =>
                      aPanel.index_key === aPanelKey ? flattenTagAnalyzerPanelInfo(aPanelInfo) : aPanel,
                  ),
              }
            : aBoard,
    );
};
