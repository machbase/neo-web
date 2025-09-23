import { SqlResDataType } from './DashboardQueryParser';
import { CheckObjectKey, SEPARATE_DIFF, geomapAggregatorList, logAggregatorList, nameValueAggregatorList, nameValueVirtualAggList, tagAggregatorList } from './dashboardUtil';
import { chartTypeConverter } from './eChartHelper';
import { concatTagSet } from './helpers/tags';
import { DIFF_LIST } from './aggregatorConstants';
import { TransformBlockType } from '@/components/dashboard/createPanel/Transform/type';

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

    if (sDashboardInfo?.dashboard.panels.length > 0) {
        const sPanelList = sDashboardInfo.dashboard.panels;
        const sVaildPanelList = sPanelList.map((aPanel: any) => {
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
                    // if (aBlock.type.toUpperCase() === 'LOG' && aBlock.time.toUpperCase() !== '_ARRIVAL_TIME' && !sResult?.duration) sResult.duration = { from: '', to: '' };
                } else {
                    // NAME column
                    if (aBlock.name === '' || typeof aBlock.name !== 'string') sResult.name = aBlock.tableInfo[0][0];
                    // TIME column
                    if (aBlock.time === '' || typeof aBlock.time !== 'string') sResult.time = aBlock.tableInfo[1][0];
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
        });
        sDashboardInfo.dashboard.panels = sVaildPanelList;
        return sDashboardInfo;
    } else return sDashboardInfo;
};

const TagAnalyzerCompatibility = (aData: any) => {
    const sTazInfo = JSON.parse(aData);
    if (sTazInfo?.panels.length > 0) {
        // Tag color
        const sPanelList = sTazInfo.panels.map((aPanel: any) => {
            if (aPanel?.tag_set && aPanel?.tag_set[0]?.color) return aPanel;
            else {
                return {
                    ...aPanel,
                    tag_set: concatTagSet([], aPanel.tag_set),
                };
            }
        });
        sTazInfo.panels = sPanelList;
        return sTazInfo;
    } else return sTazInfo;
};

export const CheckDataCompatibility = (aData: any, sFileExtension: string) => {
    if (sFileExtension === 'dsh') return DashboardCompatibility(aData);
    if (sFileExtension === 'taz') return TagAnalyzerCompatibility(aData);
};
