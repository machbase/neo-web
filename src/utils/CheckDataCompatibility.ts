import { SqlResDataType } from './DashboardQueryParser';
import { DIFF_LIST, SEPARATE_DIFF, nameValueAggregatorList, nameValueVirtualAggList, tagAggregatorList } from './dashboardUtil';
import { chartTypeConverter } from './eChartHelper';

const DashboardCompatibility = (aData: any) => {
    const sDashboardInfo = JSON.parse(aData);
    const DEFAULT_AGGREGATOR = 'count';

    if (sDashboardInfo?.dashboard.panels.length > 0) {
        const sPanelList = sDashboardInfo.dashboard.panels;
        const sVaildPanelList = sPanelList.map((aPanel: any) => {
            const sResultPanel = aPanel;
            const sBlockList: any = aPanel.blockList;
            const sChartType: string = chartTypeConverter(aPanel.type);
            const sResDataType: string = SqlResDataType(sChartType);

            const sVaildBlockList = sBlockList.map((aBlock: any) => {
                const sResult: any = aBlock;
                let sAggList: string[] = [];
                if (sResDataType === 'TIME_VALUE') {
                    sAggList = SEPARATE_DIFF ? tagAggregatorList : tagAggregatorList.concat(DIFF_LIST);
                }
                if (sResDataType === 'NAME_VALUE') {
                    if (aBlock.table.includes('V$')) sAggList = nameValueVirtualAggList;
                    else sAggList = nameValueAggregatorList;
                }

                if (aBlock.useCustom) {
                    const sValueList = aBlock.values;
                    const sVaildValueList = sValueList.map((aValue: any) => {
                        if (sAggList.includes(aValue.aggregator)) return aValue;
                        else {
                            return {
                                ...aValue,
                                aggregator: DEFAULT_AGGREGATOR,
                            };
                        }
                    });
                    sResult.values = sVaildValueList;
                } else {
                    if (!sAggList.includes(aBlock.aggregator)) sResult.aggregator = DEFAULT_AGGREGATOR;
                }

                return sResult;
            });

            sResultPanel.blockList = sVaildBlockList;
            return sResultPanel;
        });
        sDashboardInfo.dashboard.panels = sVaildPanelList;
        return sDashboardInfo;
    } else return sDashboardInfo;
};

export const CheckDataCompatibility = (aData: any, sFileExtension: string) => {
    if (sFileExtension === 'dsh') return DashboardCompatibility(aData);
};
