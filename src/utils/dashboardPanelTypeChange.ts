import { CheckPlgChart, DefaultCommonOption, chartTypeConverter, getDefaultSeriesOption } from '@/utils/eChartHelper';
import { validateAndRepairDashboardPanel } from '@/utils/panelValidator';
import { geomapAggregatorList } from '@/utils/dashboardUtil';
import { VARIABLE_REGEX } from '@/utils/CheckDataCompatibility';
import { CalcBlockTotal, CalcBlockTotalType } from '@/utils/helpers/Dashboard/BlockHelper';
import { TrxParsedBlockType } from '@/utils/Chart/TransformDataParser';
import { deactivateFullTyping } from '@/utils/fullTypingDateBin';
import { ChartType, E_CHART_TYPE } from '@/type/eChart';

/** A pie's legend reads better beside the wheel than under it. */
const PIE_LEGEND_OPTION = { legendTop: 'top', legendLeft: 'right', legendOrient: 'vertical' };

export type PanelEditorMode = undefined | 'create' | 'edit';

/**
 * The common options a freshly-typed panel starts from.
 *
 * Every field is built into a NEW object. `DefaultCommonOption` is a module singleton that
 * `DefaultChartOption` hands to every new panel by reference, so assigning it here and then writing a
 * field (as the Adv scatter branch used to) mutated the default for every panel made afterwards — and
 * threw outright once a saved panel had carried that same object into Recoil, which deep-freezes state
 * in dev: `Cannot assign to read only property 'tooltipTrigger'`.
 */
const buildCommonOptions = (aChartType: string) => ({
    ...structuredClone(DefaultCommonOption),
    ...(aChartType === E_CHART_TYPE.PIE ? PIE_LEGEND_OPTION : {}),
    // An Adv scatter plots one series against another, so there is no shared x to gather a row per
    // series at — the tooltip describes the single point under the cursor.
    ...(aChartType === E_CHART_TYPE.ADV_SCATTER ? { tooltipTrigger: 'item' } : {}),
});

/**
 * The panel a type change produces, given the panel it started from.
 *
 * Pure: it reads nothing outside its arguments and mutates neither of them, so the editor can call it
 * from a state updater and tests can call it directly. `aTypeKey` is the display name the type select
 * emits ('Adv scatter'), not the internal id ('advScatter').
 */
export const buildPanelOptionForType = (aPrev: any, aTypeKey: string, aPanelMode: PanelEditorMode) => {
    const sConvertedChartType = chartTypeConverter(aTypeKey);
    const sIsPlgChart = CheckPlgChart(sConvertedChartType as ChartType);
    const sChangeChartOption = getDefaultSeriesOption(sConvertedChartType as ChartType);
    const sIsGeomap = sConvertedChartType === E_CHART_TYPE.GEOMAP;

    const sResVal = {
        ...aPrev,
        type: aTypeKey,
        chartInfo: sChangeChartOption,
        chartOptions: sChangeChartOption,
    };

    if (aPanelMode === 'create') sResVal.commonOptions = buildCommonOptions(sConvertedChartType);

    sResVal.tqlInfo = { path: '', params: [{ name: '', value: '', format: '' }], chart_id: '' };

    if (sIsPlgChart) sResVal.plg = sIsPlgChart.plg;
    else sResVal.plg = undefined;

    if (sIsGeomap) sResVal.transformBlockList = [];

    // Normalize the panel for the NEW type BEFORE any block manipulation, using the same repair the
    // loader runs when opening a .dsh. Backfills blockList (to [] if a TQL/legacy panel never had one),
    // each block's values/customFullTyping/filter/table/aggregator, axis/common/chart options, and
    // type-specific deep fields. MUST run before the blockList.map/block.values[0] accesses below —
    // those crash on an un-backfilled (e.g. blockList-undefined) TQL/legacy panel.
    //
    // validateAndRepairDashboardPanel mutates in place, but sResVal is only a shallow copy of the
    // previous panel (deep-frozen once it has been through Recoil) and chartOptions is a shared
    // default-option constant. Deep-clone the structures the repair writes to, so its in-place
    // mutations land on fresh, extensible objects — otherwise validateBlockItem's
    // `block.customFullTyping = {...}` throws "object is not extensible" on the frozen block, and the
    // geomap deep validator would mutate the shared default chartOptions.
    if (Array.isArray(sResVal.blockList)) sResVal.blockList = sResVal.blockList.map((aBlock: any) => structuredClone(aBlock));
    if (sResVal.chartOptions) {
        sResVal.chartOptions = structuredClone(sResVal.chartOptions);
        sResVal.chartInfo = sResVal.chartOptions;
    }
    validateAndRepairDashboardPanel(sResVal);
    // The loader patches xAxisOptions[0].useBlockList in a separate phase (not part of validateAndRepair);
    // YAxisOptions reads it, so ensure it for axis types here.
    if (Array.isArray(sResVal.xAxisOptions) && sResVal.xAxisOptions[0] && !Array.isArray(sResVal.xAxisOptions[0].useBlockList)) {
        sResVal.xAxisOptions = [{ ...sResVal.xAxisOptions[0], useBlockList: [0] }, ...sResVal.xAxisOptions.slice(1)];
    }

    const sBlockCntInfo: CalcBlockTotalType = CalcBlockTotal(sResVal);
    if (sBlockCntInfo.total > sBlockCntInfo.limit) {
        let sLimit = sBlockCntInfo.limit;
        const sQueryBlock = sResVal.blockList.map((qBlock: any) => {
            if (sLimit > 0) {
                --sLimit;
                return { ...qBlock, isVisible: true };
            } else return { ...qBlock, isVisible: false };
        });
        const sTrxBlock: TrxParsedBlockType[] = sResVal?.transformBlockList?.map((tBlock: TrxParsedBlockType) => {
            if (sLimit > 0) {
                --sLimit;
                return { ...tBlock, isVisible: true };
            } else return { ...tBlock, isVisible: false };
        });

        sResVal.blockList = sQueryBlock;
        sResVal.transformBlockList = sTrxBlock;
    }

    if (sConvertedChartType !== E_CHART_TYPE.GEOMAP) {
        if (sConvertedChartType !== E_CHART_TYPE.LINE && sConvertedChartType !== E_CHART_TYPE.BAR) {
            sResVal.blockList = sResVal.blockList.map((block: any) => {
                return { ...block, values: [block.values[0]], customFullTyping: deactivateFullTyping(block) };
            });
        } else {
            sResVal.blockList = sResVal.blockList.map((block: any) => {
                return { ...block, values: [block.values[0]] };
            });
        }
    } else {
        sResVal.blockList = sResVal.blockList.map((block: any) => {
            const sTmpValues = block.values.map((value: any) => {
                if (geomapAggregatorList.includes(value.aggregator) || value.aggregator?.match(VARIABLE_REGEX)) return value;
                else return { ...value, aggregator: geomapAggregatorList[0] };
            });
            return { ...block, values: sTmpValues, useCustom: true, customFullTyping: deactivateFullTyping(block) };
        });
    }

    return sResVal;
};
