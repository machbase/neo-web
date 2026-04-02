import { getTimeZoneValue } from '@/utils/utils';
import Highcharts from 'highcharts/highstock';
import HighchartsBoost from 'highcharts/modules/boost';
import HighchartsReact from 'highcharts-react-official';
import { useEffect, useState } from 'react';
import {
    accessibilityConfig,
    buildChartConfig,
    buildLegendConfig,
    buildNavigatorConfig,
    buildPlotOptionsConfig,
    buildTooltipConfig,
    buildXAxisConfig,
    buildYAxisConfig,
    creditsConfig,
    langConfig,
    noDataConfig,
    rangeSelectorConfig,
    scrollbarConfig,
} from './HighChartConfigure';

HighchartsBoost(Highcharts);

const Chart = ({
    pPanelInfo,
    pIsRaw,
    pChartData,
    pAreaChart,
    pNavigatorData,
    pSetExtremes,
    pSetNavigatorExtremes,
    pPanelRange,
    pNavigatorRange,
    pChartWrap,
    pViewMinMaxPopup,
    pIsUpdate,
}: any) => {
    const [options, setOptions] = useState<any>({});


    const updateYaxis : () => yAxisType = getNewYAxis(pChartData, pPanelInfo);
    const setValue : () => void  = () => {
        const newMinMax   = getYAxisRange(pPanelInfo, pIsRaw, updateYaxis);
        setOptions({
            accessibility: accessibilityConfig,
            chart: buildChartConfig(pPanelInfo, pAreaChart, pIsUpdate, pViewMinMaxPopup, pChartWrap),
            time: {
                getTimezoneOffset: () => {
                    return getTimeZoneValue();
                },
            },
            series: pChartData,
            plotOptions: buildPlotOptionsConfig(pPanelInfo),
            scrollbar: scrollbarConfig,
            rangeSelector: rangeSelectorConfig,
            navigator: buildNavigatorConfig(pNavigatorData, pAreaChart, pNavigatorRange, pSetNavigatorExtremes),
            xAxis: buildXAxisConfig(pPanelInfo, pSetExtremes, pPanelRange),
            yAxis: buildYAxisConfig(pPanelInfo, pIsRaw, updateYaxis, newMinMax),
            tooltip: buildTooltipConfig(),
            legend: buildLegendConfig(pPanelInfo, pAreaChart),
            lang: langConfig,
            noData: noDataConfig,
            credits: creditsConfig,
        });
    };

    useEffect(() => {
        pAreaChart && pAreaChart?.current && pAreaChart?.current?.removeAttribute('data-processed');
        setValue();
    }, [pChartData, pNavigatorData, pPanelInfo, pIsRaw, pIsUpdate]);

    return pNavigatorData && pNavigatorData.datasets && <HighchartsReact ref={pChartWrap} highcharts={Highcharts} constructorType={'stockChart'} options={options} />;
};
export default Chart;

function getYAxisRange(pPanelInfo : any, pIsRaw: any, updateYaxis: any) {
    const isRaw = pIsRaw;

    const minVal = isRaw
        ? Number(pPanelInfo.custom_drilldown_min)
        : Number(pPanelInfo.custom_min);

    const maxVal = isRaw
        ? Number(pPanelInfo.custom_drilldown_max)
        : Number(pPanelInfo.custom_max);

    const isDefaultRange = minVal === 0 && maxVal === 0;

    if (isDefaultRange) {
        const [defaultMin, defaultMax] = updateYaxis().left;
        return { min: defaultMin, max: defaultMax };
    }

    return { min: minVal, max: maxVal };
}
function getNewYAxis(pChartData: any, pPanelInfo: any) : () => yAxisType {
    return () => {
        const yAxis: yAxisType = {
            left: [] as number[],
            right: [] as number[],
        };

        const newData = pChartData && JSON.parse(JSON.stringify(pChartData));
        newData?.forEach((item: any) => {
            if (item.yAxis === 0) {
                const yAxisLeftMin = getMinValue(item.data, pPanelInfo.zero_base === 'Y');
                const yAxisLeftMax = getMaxValue(item.data, pPanelInfo.zero_base === 'Y');
                if (!yAxis.left[0] || yAxis.left[0] > yAxisLeftMin) {
                    yAxis.left[0] = yAxisLeftMin;
                }
                if (!yAxis.left[1] || yAxis.left[1] < yAxisLeftMax) {
                    yAxis.left[1] = yAxisLeftMax;
                }
            }
            if (item.yAxis === 1) {
                const yAxisLeftMin = getMinValue(item.data, pPanelInfo.zero_base2 === 'Y');
                const yAxisLeftMax = getMaxValue(item.data, pPanelInfo.zero_base2 === 'Y');
                if (!yAxis.right[0] || yAxis.right[0] > yAxisLeftMin) {
                    yAxis.right[0] = yAxisLeftMin;
                }
                if (!yAxis.right[1] || yAxis.right[1] < yAxisLeftMax) {
                    yAxis.right[1] = yAxisLeftMax;
                }
            }
        });
        if (yAxis.left[0]) {
            yAxis.left[0] = Math.floor(yAxis.left[0] * 1000) / 1000;
            yAxis.left[1] = Math.ceil(yAxis.left[1] * 1000) / 1000;
        }
        if (yAxis.right[0]) {
            yAxis.right[0] = Math.floor(yAxis.right[0] * 1000) / 1000;
            yAxis.right[1] = Math.ceil(yAxis.right[1] * 1000) / 1000;
        }
        return yAxis;
    };
}
type yAxisType = 
{
    left: number[],
    right: number[],
};
function getMaxValue(array: number[][], zeroBaseCondition: boolean) {
    return array.reduce(
        (result: number, current: any) => {
            if (current[1] > result) result = current[1];
            return result;
        },
        zeroBaseCondition ? 0 : array[0]?.[1]
    );
}
function getMinValue(array: number[][], zeroBaseCondition: boolean) {
    return array.reduce(
        (result: number, current: any) => {
            if (current[1] < result) result = current[1];
            return result;
        },
        zeroBaseCondition ? 0 : array[0]?.[1]
    );
}    
