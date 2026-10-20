import { SqlResDataType } from './DashboardQueryParser';
import { CheckObjectKey, SEPARATE_DIFF, geomapAggregatorList, logAggregatorList, nameValueAggregatorList, nameValueVirtualAggList, tagAggregatorList } from './dashboardUtil';
import { chartTypeConverter } from './eChartHelper';
import { DIFF_LIST } from './aggregatorConstants';
import { TransformBlockType } from '../type/transform';
import { getVersionByKey } from './version/utils';
import { getDefaultTimeFieldColumn } from '@/utils/timeFieldColumns';
import { findUnitById } from './Chart/AxisConstants';

export const VARIABLE_REGEX = /\{\{.*?\}\}/g;
export const VARIABLE_RM_REGEX = /^{+|}+$/g;

// A unit is persisted into a saved dashboard as the whole UnitItem snapshot (`{ id, label, suffix,
// sourceScale, outFormat }`), not as its id, so a panel keeps whatever UNITS carried on the day it
// was saved. When a unit definition is corrected — the Data group's suffix was 'B/s' where it should
// have been 'B', so `bytes (SI)` axis labels read '6.5 GB/s' — the fix reaches new panels only, and
// every already-saved dashboard keeps rendering the old label forever. So re-read each persisted
// snapshot from UNITS by id on load. `outFormat` is what identifies a snapshot: no other persisted
// dashboard object carries it.
const IsUnitSnapshot = (aValue: any): boolean =>
    !!aValue && typeof aValue === 'object' && !Array.isArray(aValue) && typeof aValue.id === 'string' && CheckObjectKey(aValue, 'outFormat');

export const RefreshUnitSnapshots = (aValue: any): any => {
    if (Array.isArray(aValue)) return aValue.map(RefreshUnitSnapshots);
    if (!aValue || typeof aValue !== 'object') return aValue;
    // An id no longer in UNITS is left as it is — a snapshot we cannot resolve still formats.
    if (IsUnitSnapshot(aValue)) return findUnitById(aValue.id) ?? aValue;
    const sResult: any = {};
    for (const sKey of Object.keys(aValue)) sResult[sKey] = RefreshUnitSnapshots(aValue[sKey]);
    return sResult;
};

/** Repairs one dashboard panel in place and returns it. Throws when the panel cannot be repaired. */
const repairDashboardPanel = (aRawPanel: any) => {
    // Re-read every persisted unit snapshot from UNITS before anything reads a suffix off it.
    const aPanel = RefreshUnitSnapshots(aRawPanel);

    // The editor backfills this through the panel validator (BASE_REQUIRED); this copy has no validator.
    if (!aPanel.timeRange) aPanel.timeRange = { start: '', end: '', refresh: 'Off' };

    // Add version
    aPanel.version = getVersionByKey(aPanel);

    if (aPanel.type === 'Text') {
        if (!CheckObjectKey(aPanel.chartOptions, 'textSeries')) aPanel.chartOptions.textSeries = [0];
        if (!CheckObjectKey(aPanel.chartOptions, 'chartSeries')) aPanel.chartOptions.chartSeries = [0];
    }

    if (aPanel.type === 'Tql') aPanel.type = 'Tql chart';
    if (aPanel.xAxisOptions[0].type === 'category') aPanel.xAxisOptions[0].type = 'time';
    if (aPanel.type === 'Geomap' && !CheckObjectKey(aPanel, 'titleColor')) aPanel.titleColor = '#000000';
    // Transform data opt
    if (!CheckObjectKey(aPanel, 'transformBlockList')) aPanel.transformBlockList = [];
    // X-Axis opt
    aPanel.xAxisOptions = aPanel.xAxisOptions.map((xAxisOpt: any) => {
        const sTmpXAxis = JSON.parse(JSON.stringify(xAxisOpt));
        if (!xAxisOpt?.axisLabel) sTmpXAxis.axisLabel = { hideOverlap: true };
        if (!xAxisOpt?.useBlockList) sTmpXAxis.useBlockList = [0];
        if (!xAxisOpt?.axisLine) sTmpXAxis.axisLine = { show: true, onZero: false };
        if (!xAxisOpt?.label) sTmpXAxis.label = { name: 'value', key: 'value', title: '', unit: '', decimals: undefined, squared: 0 };
        return sTmpXAxis;
    });
    // Y-Axis opt
    aPanel.yAxisOptions = aPanel.yAxisOptions.map((yAxisOpt: any) => {
        const sTmpYAxis = JSON.parse(JSON.stringify(yAxisOpt));
        if (!yAxisOpt?.axisLabel) sTmpYAxis.axisLabel = { offset: '' };
        if (!yAxisOpt?.axisLine) sTmpYAxis.axisLine = { show: true, onZero: false };
        return sTmpYAxis;
    });
    const sResultPanel = aPanel;
    const sBlockList: any = aPanel.blockList;
    const sTrxBlockList: TransformBlockType[] = aPanel.transformBlockList;
    const sChartType: string = chartTypeConverter(aPanel.type);
    const sResDataType: string = SqlResDataType(sChartType);

    const sValidBlockList = sBlockList.map((aBlock: any) => {
        // Set block visibility
        if (!CheckObjectKey(aBlock, 'isVisible')) aBlock.isVisible = true;
        // Skip validate variableBlock
        const sIsVariableBlock = aBlock.table.match(VARIABLE_REGEX);
        if (sIsVariableBlock) return aBlock;
        // Check full query
        const sHasKeyFullQuery = CheckObjectKey(aBlock, 'customFullTyping');
        const sResult: any = sHasKeyFullQuery
            ? {
                  ...aBlock,
                  customFullTyping: {
                      ...aBlock.customFullTyping,
                      dirty: aBlock.customFullTyping.dirty ?? aBlock.customFullTyping.text?.trim() !== '',
                  },
              }
            : { ...aBlock, customFullTyping: { use: false, text: '', dirty: false } };
        let DEFAULT_AGGREGATOR: string = 'count';
        let sAggList: string[] = [];
        if (sResDataType === 'TIME_VALUE') {
            const sAggregatorList = aBlock.type === 'tag' ? tagAggregatorList : logAggregatorList;
            sAggList = SEPARATE_DIFF ? sAggregatorList : [...sAggregatorList, ...DIFF_LIST];
        }
        if (sResDataType === 'NAME_VALUE') {
            if (aBlock.table.includes('V$')) {
                DEFAULT_AGGREGATOR = 'sum';
                sAggList = nameValueVirtualAggList;
            } else {
                DEFAULT_AGGREGATOR = 'last value';
                sAggList = nameValueAggregatorList;
            }
        }
        if (aPanel.type === 'Geomap') {
            DEFAULT_AGGREGATOR = 'value';
            sAggList = geomapAggregatorList;
        }

        if (aBlock.useCustom) {
            // Values
            const sValueList = aBlock.values;
            const sValidValueList = sValueList.map((aValue: any) => {
                if (sAggList.includes(aValue.aggregator)) return aValue;
                else {
                    return {
                        ...aValue,
                        aggregator: DEFAULT_AGGREGATOR,
                    };
                }
            });
            sResult.values = sValidValueList;
            // Duration
            sResult.duration = sResult?.duration ?? { from: '', to: '' };
            // if (aBlock.type.toUpperCase() === 'LOG' && aBlock.time.toUpperCase() !== '_ARRIVAL_TIME' && !sResult?.duration) sResult.duration = { from: '', to: '' };
        } else {
            // NAME column
            if (aBlock.name === '' || typeof aBlock.name !== 'string') sResult.name = aBlock.tableInfo[0][0];
            // TIME column
            if (aBlock.time === '' || typeof aBlock.time !== 'string') sResult.time = getDefaultTimeFieldColumn(aBlock.tableInfo) || aBlock.tableInfo[1][0];
            // VALUE column
            if (aBlock.value === '' || typeof aBlock.value !== 'string') sResult.value = aBlock.tableInfo[2][0];
            // AGG
            if (!sAggList.includes(aBlock.aggregator)) sResult.aggregator = DEFAULT_AGGREGATOR;
        }

        return sResult;
    });
    const sValidTrxBlockList = sTrxBlockList.map((aTrxBlock: TransformBlockType) => {
        if (!CheckObjectKey(aTrxBlock, 'isVisible')) aTrxBlock.isVisible = true;
        return aTrxBlock;
    });
    sResultPanel.blockList = sValidBlockList;
    sResultPanel.transformBlockList = sValidTrxBlockList;
    return sResultPanel;
};

/** Why this panel cannot be shown, or undefined when it can — mirrors the editor's loader (#1547). */
const sPanelLoadErrors = new WeakMap<object, string | undefined>();
export const getPanelLoadError = (aPanel: any): string | undefined => {
    // Panels in state are replaced, never mutated, so the answer for one object never changes.
    if (aPanel !== null && typeof aPanel === 'object' && sPanelLoadErrors.has(aPanel)) return sPanelLoadErrors.get(aPanel);
    let sError: string | undefined;
    try {
        repairDashboardPanel(JSON.parse(JSON.stringify(aPanel ?? null)));
    } catch (aError) {
        sError = aError instanceof Error ? aError.message : String(aError);
    }
    if (aPanel !== null && typeof aPanel === 'object') sPanelLoadErrors.set(aPanel, sError);
    return sError;
};

const DashboardCompatibility = (aData: any) => {
    const sDashboardInfo = JSON.parse(aData);

    // Check variables
    if (!sDashboardInfo?.dashboard?.variables) {
        sDashboardInfo.dashboard = {
            ...sDashboardInfo.dashboard,
            variables: [],
        };
    }

    // Backfill the board time range. Every reader dereferences `dashboard.timeRange.refresh` directly,
    // so a board saved without it took the whole app down on open (#1547). Same value a new dashboard gets.
    if (!sDashboardInfo?.dashboard?.timeRange) {
        sDashboardInfo.dashboard = {
            ...sDashboardInfo.dashboard,
            timeRange: { start: 'now-3h', end: 'now', refresh: 'Off' },
        };
    }

    if (Array.isArray(sDashboardInfo?.dashboard?.panels)) {
        // A panel that cannot be repaired stays as saved and shows as an error card in its own cell (#1547);
        // one bad panel used to throw here and leave the whole public board empty.
        sDashboardInfo.dashboard.panels = sDashboardInfo.dashboard.panels.map((aRawPanel: any) => {
            const sOriginal = JSON.parse(JSON.stringify(aRawPanel ?? null));
            try {
                return repairDashboardPanel(aRawPanel);
            } catch (aError) {
                console.error('[DashboardLoad]', `panel "${aRawPanel?.title || aRawPanel?.id}" kept as saved: ${aError instanceof Error ? aError.message : aError}`);
                return sOriginal;
            }
        });
    }
    return sDashboardInfo;
};

export const CheckDataCompatibility = (aData: any, sFileExtension: string) => {
    if (sFileExtension === 'dsh') return DashboardCompatibility(aData);
};
