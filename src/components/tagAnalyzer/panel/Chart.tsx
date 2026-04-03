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

// Renders the legacy Highcharts stock chart for a panel.
// It builds the chart options from panel state and keeps the graph synced with current data and ranges.
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
        const chartWidth = pAreaChart?.current?.clientWidth;
        const navigatorWidth = chartWidth ? chartWidth - 55 : chartWidth;
        const handleChartRender = () => {
            pChartWrap &&
                pChartWrap?.current?.container?.current
                    ?.getElementsByClassName('highcharts-series-group')[0]
                    ?.setAttribute('clip-path', 'none');
            pAreaChart && pAreaChart?.current && pAreaChart?.current?.setAttribute('data-processed', true);
        };

        setOptions({
            accessibility: accessibilityConfig,
            chart: buildChartConfig(
                pPanelInfo.show_legend,
                pPanelInfo.fill,
                chartWidth,
                pIsUpdate ? pViewMinMaxPopup : false,
                handleChartRender,
            ),
            time: {
                getTimezoneOffset: () => {
                    return getTimeZoneValue();
                },
            },
            series: pChartData,
            plotOptions: buildPlotOptionsConfig(
                pPanelInfo.stroke,
                pPanelInfo.fill,
                pPanelInfo.show_point,
                pPanelInfo.point_radius,
            ),
            scrollbar: scrollbarConfig,
            rangeSelector: rangeSelectorConfig,
            navigator: buildNavigatorConfig(pNavigatorData?.datasets, navigatorWidth, pNavigatorRange, pSetNavigatorExtremes),
            xAxis: buildXAxisConfig(pPanelInfo.use_zoom, pPanelInfo.show_x_tickline, pSetExtremes, pPanelRange),
            yAxis: buildYAxisConfig(
                {
                    use_normalize: pPanelInfo.use_normalize,
                    show_y_tickline: pPanelInfo.show_y_tickline,
                    use_ucl: pPanelInfo.use_ucl,
                    ucl_value: pPanelInfo.ucl_value,
                    use_lcl: pPanelInfo.use_lcl,
                    lcl_value: pPanelInfo.lcl_value,
                    custom_min2: pPanelInfo.custom_min2,
                    custom_max2: pPanelInfo.custom_max2,
                    custom_drilldown_min2: pPanelInfo.custom_drilldown_min2,
                    custom_drilldown_max2: pPanelInfo.custom_drilldown_max2,
                    show_y_tickline2: pPanelInfo.show_y_tickline2,
                    use_right_y2: pPanelInfo.use_right_y2,
                    use_ucl2: pPanelInfo.use_ucl2,
                    ucl2_value: pPanelInfo.ucl2_value,
                    use_lcl2: pPanelInfo.use_lcl2,
                    lcl2_value: pPanelInfo.lcl2_value,
                },
                pIsRaw,
                updateYaxis,
                newMinMax,
            ),
            tooltip: buildTooltipConfig(),
            legend: buildLegendConfig(pPanelInfo.show_legend, chartWidth),
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
