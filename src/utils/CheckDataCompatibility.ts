import { SqlResDataType } from './DashboardQueryParser';
import { CheckObjectKey, SEPARATE_DIFF, geomapAggregatorList, logAggregatorList, nameValueAggregatorList, nameValueVirtualAggList, tagAggregatorList } from './dashboardUtil';
import { chartTypeConverter } from './eChartHelper';
import { concatTagSet } from './helpers/tags';
import { DIFF_LIST } from './aggregatorConstants';
import { TransformBlockType } from '@/components/dashboard/createPanel/Transform/type';
import { useExperiment } from '@/hooks/useExperiment';
import { getVersionByKey } from './version/utils';
import { validateAndRepairDashboardPanel, validateAndRepairTazPanel, BLOCK_CHART_TYPES, AXIS_CHART_TYPES } from './panelValidator';
import { getDefaultTimeFieldColumn } from './timeFieldColumns';

export const VARIABLE_REGEX = /\{\{.*?\}\}/g;
export const VARIABLE_RM_REGEX = /^{+|}+$/g;

const DashboardCompatibility = (aData: any) => {
    const sDashboardInfo = JSON.parse(aData);

    // Check variables
    if (!sDashboardInfo?.dashboard?.variables) {
        sDashboardInfo.dashboard = {
            ...sDashboardInfo.dashboard,
            variables: [],
        };
    }

    if (sDashboardInfo?.dashboard?.panels?.length > 0) {
        // Phase 1: Validate and repair all panels (structural integrity)
        sDashboardInfo.dashboard.panels = sDashboardInfo.dashboard.panels
            .map((aPanel: any) => {
                const result = validateAndRepairDashboardPanel(aPanel);
                if (result.repaired) {
                }
                if (!result.valid) {
                    aPanel._validationError = true;
                }
                return result.panel;
            })
            .filter((p: any) => !p._validationError);

        // Phase 2: Semantic compatibility patches (type-aware)
        const sPanelList = sDashboardInfo.dashboard.panels;

        const sVaildPanelList = sPanelList.map((aPanel: any) => {
            // Version stamp (all types)
            aPanel.version = getVersionByKey(aPanel);

            // Geomap titleColor
            if (aPanel.type === 'Geomap' && !CheckObjectKey(aPanel, 'titleColor')) aPanel.titleColor = '#000000';

            // Axis patches: only for types that use axes
            if (AXIS_CHART_TYPES.has(aPanel.type)) {
                if (aPanel.xAxisOptions?.[0]?.type === 'category') aPanel.xAxisOptions[0].type = 'time';

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
            }

            // Block patches: only for types that use blocks
            if (BLOCK_CHART_TYPES.has(aPanel.type)) {
                const sResultPanel = aPanel;
                const sBlockList: any = aPanel.blockList;
                const sTrxBlockList: TransformBlockType[] = aPanel.transformBlockList;
                const sChartType: string = chartTypeConverter(aPanel.type);
                const sResDataType: string = SqlResDataType(sChartType);

                const sValidBlockList = sBlockList.map((aBlock: any) => {
                    // Set block formula valid
                    if (!CheckObjectKey(aBlock, 'isValidMath')) aBlock.isValidMath = true;
                    // Set block visibility
                    if (!CheckObjectKey(aBlock, 'isVisible')) aBlock.isVisible = true;
                    // Skip validate variableBlock
                    const sIsVariableBlock = aBlock.table.match(VARIABLE_REGEX);
                    if (sIsVariableBlock) return aBlock;
                    // Check full query
                    const sHasKeyFullQuery = CheckObjectKey(aBlock, 'customFullTyping');
                    const sResult: any = sHasKeyFullQuery ? aBlock : { ...aBlock, customFullTyping: { use: false, text: '' } };
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
                    } else {
                        // NAME column
                        if (aBlock.name === '' || typeof aBlock.name !== 'string') sResult.name = aBlock.tableInfo?.[0]?.[0] ?? '';
                        // TIME column
                        if (aBlock.time === '' || typeof aBlock.time !== 'string') sResult.time = getDefaultTimeFieldColumn(aBlock.tableInfo) || (aBlock.tableInfo?.[1]?.[0] ?? 'TIME');
                        // VALUE column
                        if (aBlock.value === '' || typeof aBlock.value !== 'string') sResult.value = aBlock.tableInfo?.[2]?.[0] ?? 'VALUE';
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
            }

            return aPanel;
        });
        sDashboardInfo.dashboard.panels = sVaildPanelList;
        return sDashboardInfo;
    } else return sDashboardInfo;
};

const TagAnalyzerCompatibility = (aData: any) => {
    const sTazInfo = JSON.parse(aData);
    if (sTazInfo?.panels?.length > 0) {
        // Phase 1: Validate and repair all panels (structural integrity)
        sTazInfo.panels = sTazInfo.panels
            .map((aPanel: any) => {
                const result = isModernTagAnalyzerPanel(aPanel)
                    ? {
                          panel: aPanel,
                          repaired: false,
                          repairedKeys: [],
                          errors: [],
                          valid: true,
                      }
                    : validateAndRepairTazPanel(aPanel);
                if (result.repaired) {
                }
                if (!result.valid) {
                    aPanel._validationError = true;
                }
                return result.panel;
            })
            .filter((p: any) => !p._validationError);

        const ensureLegacyColumnShape = (aTag: any) => ({
            ...aTag,
            colName: aTag?.colName ? { ...aTag.colName, jsonKey: aTag.colName.jsonKey ?? '' } : aTag?.colName,
        });
        const ensureSeriesAnnotationShape = (aSeries: any) => ({
            ...ensureLegacyColumnShape(aSeries),
            annotations: Array.isArray(aSeries?.annotations) ? aSeries.annotations : [],
        });
        const ensureColoredSeries = (seriesList: any[]) => {
            const sSeriesList = seriesList.map(ensureLegacyColumnShape);
            return sSeriesList[0]?.color ? sSeriesList : concatTagSet([], sSeriesList);
        };

        // Phase 2: Existing tag color compatibility plus new nested TAZ persistence shape.
        const sPanelList = sTazInfo.panels.map((aPanel: any) => {
            if (Array.isArray(aPanel?.data?.tag_set)) {
                const sTagSet = ensureColoredSeries(aPanel.data.tag_set).map(ensureSeriesAnnotationShape);
                return {
                    ...aPanel,
                    highlights: Array.isArray(aPanel.highlights) ? aPanel.highlights : [],
                    data: {
                        ...aPanel.data,
                        tag_set: sTagSet,
                    },
                };
            }

            if (Array.isArray(aPanel?.data?.seriesList)) {
                const sSeriesList = ensureColoredSeries(aPanel.data.seriesList).map(ensureSeriesAnnotationShape);
                return {
                    ...aPanel,
                    highlights: Array.isArray(aPanel.highlights) ? aPanel.highlights : [],
                    data: {
                        ...aPanel.data,
                        seriesList: sSeriesList,
                    },
                };
            }

            if (Array.isArray(aPanel?.tag_set)) {
                const sTagSet = ensureColoredSeries(aPanel.tag_set);
                return {
                    ...aPanel,
                    tag_set: sTagSet,
                };
            }

            return aPanel;
        });
        sTazInfo.panels = sPanelList;
        return sTazInfo;
    } else return sTazInfo;
};

function isModernTagAnalyzerPanel(aPanel: any): boolean {
    return (
        !!aPanel &&
        typeof aPanel === 'object' &&
        !!aPanel.meta &&
        typeof aPanel.meta === 'object' &&
        typeof aPanel.meta.panelKey === 'string' &&
        typeof aPanel.meta.chartTitle === 'string' &&
        !!aPanel.data &&
        typeof aPanel.data === 'object' &&
        Array.isArray(aPanel.data.seriesList) &&
        !!aPanel.toolbar &&
        typeof aPanel.toolbar === 'object' &&
        typeof aPanel.toolbar.isRaw === 'boolean' &&
        !!aPanel.time &&
        typeof aPanel.time === 'object' &&
        !!aPanel.time.rangeConfig &&
        !!aPanel.axes &&
        typeof aPanel.axes === 'object' &&
        !!aPanel.axes.xAxis &&
        !!aPanel.axes.leftYAxis &&
        !!aPanel.axes.rightYAxis &&
        !!aPanel.display &&
        typeof aPanel.display === 'object'
    );
}

const WorkSheetCompatibility = (aData: any) => {
    const { getExperiment } = useExperiment();
    const sInfo = JSON.parse(aData);

    if (!getExperiment()) {
        if (sInfo?.data?.length > 0) {
            const sSectionList = sInfo?.data?.map((aSection: any) => {
                if (aSection?.type === 'chat') aSection.type = 'markdown';
                return aSection;
            });
            return sSectionList;
        }
    } else return sInfo;
};

export const CheckDataCompatibility = (aData: any, sFileExtension: string) => {
    if (sFileExtension === 'dsh') return DashboardCompatibility(aData);
    if (sFileExtension === 'taz') return TagAnalyzerCompatibility(aData);
    if (sFileExtension === 'wrk') return WorkSheetCompatibility(aData);
};
