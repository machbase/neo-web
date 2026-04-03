import { getTimeZoneValue } from '@/utils/utils';
import Highcharts from 'highcharts/highstock';
import HighchartsBoost from 'highcharts/modules/boost';
import HighchartsReact from 'highcharts-react-official';
import { useEffect, useState } from 'react';
import {
    buildChartConfig,
    buildPlotOptionsConfig,
    buildNavigatorConfig,
    buildXAxisConfig,
    buildYAxisConfig,
    buildTooltipConfig,
    buildLegendConfig,
    scrollbarConfig,
    rangeSelectorConfig,
    accessibilityConfig,
    langConfig,
    noDataConfig,
    creditsConfig,
} from './HighChartConfigure';
import type { TagAnalyzerNewEChartProps } from './TagAnalyzerPanelTypes';
HighchartsBoost(Highcharts);

// Displays the main panel graph and its navigator/scroll area.
// It assembles the chart configuration, keeps it updated from panel state, and feeds the graph interactions back up.
const NewEChart = ({
    pChartRefs,
    pChartModel,
    pChartActions,
}: TagAnalyzerNewEChartProps) => {
    const [options, setOptions] = useState<any>({});
    const sPanelAxes = pChartModel.panelInfo.axes;
    const sPanelDisplay = pChartModel.panelInfo.display;

    const updateYaxis: () => yAxisType = getNewYAxis(pChartModel.chartData, pChartModel.panelInfo);
    const setValue: () => void = () => {
        const newMinMax = getYAxisRange(pChartModel.panelInfo, pChartModel.isRaw, updateYaxis);
        const chartWidth = (pChartRefs.areaChart as any)?.current?.clientWidth;
        const navigatorWidth = chartWidth ? chartWidth - 55 : chartWidth;
        const handleChartRender = () => {
            pChartRefs.chartWrap &&
                (pChartRefs.chartWrap as any)?.current?.container?.current
                    ?.getElementsByClassName('highcharts-series-group')[0]
                    ?.setAttribute('clip-path', 'none');
            pChartRefs.areaChart && (pChartRefs.areaChart as any)?.current && (pChartRefs.areaChart as any)?.current?.setAttribute('data-processed', true);
        };

        setOptions({
            accessibility: accessibilityConfig,
            chart: buildChartConfig(
                sPanelDisplay.show_legend,
                sPanelDisplay.fill,
                chartWidth,
                pChartModel.isUpdate ? pChartActions.onSelection : false,
                handleChartRender,
            ),
            time: {
                getTimezoneOffset: () => {
                    return getTimeZoneValue();
                },
            },
            series: pChartModel.chartData,
            plotOptions: buildPlotOptionsConfig(
                sPanelDisplay.stroke,
                sPanelDisplay.fill,
                sPanelDisplay.show_point,
                sPanelDisplay.point_radius,
            ),
            scrollbar: scrollbarConfig,
            rangeSelector: rangeSelectorConfig,
            navigator: buildNavigatorConfig(pChartModel.navigatorData?.datasets, navigatorWidth, pChartModel.navigatorRange, pChartActions.onSetNavigatorExtremes),
            xAxis: buildXAxisConfig(sPanelDisplay.use_zoom, sPanelAxes.show_x_tickline, pChartActions.onSetExtremes, pChartModel.panelRange),
            yAxis: buildYAxisConfig(
                {
                    use_normalize: (pChartModel.panelInfo as any).use_normalize,
                    show_y_tickline: sPanelAxes.show_y_tickline,
                    use_ucl: sPanelAxes.use_ucl,
                    ucl_value: sPanelAxes.ucl_value,
                    use_lcl: sPanelAxes.use_lcl,
                    lcl_value: sPanelAxes.lcl_value,
                    custom_min2: sPanelAxes.custom_min2,
                    custom_max2: sPanelAxes.custom_max2,
                    custom_drilldown_min2: sPanelAxes.custom_drilldown_min2,
                    custom_drilldown_max2: sPanelAxes.custom_drilldown_max2,
                    show_y_tickline2: sPanelAxes.show_y_tickline2,
                    use_right_y2: sPanelAxes.use_right_y2,
                    use_ucl2: sPanelAxes.use_ucl2,
                    ucl2_value: sPanelAxes.ucl2_value,
                    use_lcl2: sPanelAxes.use_lcl2,
                    lcl2_value: sPanelAxes.lcl2_value,
                },
                pChartModel.isRaw,
                updateYaxis,
                newMinMax,
            ),
            tooltip: buildTooltipConfig(),
            legend: buildLegendConfig(sPanelDisplay.show_legend, chartWidth),
            lang: langConfig,
            noData: noDataConfig,
            credits: creditsConfig,
        });
    };

    useEffect(() => {
        pChartRefs.areaChart && (pChartRefs.areaChart as any)?.current && (pChartRefs.areaChart as any)?.current?.removeAttribute('data-processed');
        setValue();
    }, [pChartRefs.areaChart, pChartModel, pChartActions]);

    return (
        pChartModel.navigatorData &&
        pChartModel.navigatorData.datasets && (
            <HighchartsReact
                ref={pChartRefs.chartWrap as any}
                highcharts={Highcharts}
                constructorType={'stockChart'}
                options={options}
            />
        )
    );
};
export default NewEChart;

function getYAxisRange(pPanelInfo: any, pIsRaw: any, updateYaxis: any) {
    const isRaw = pIsRaw;

    const minVal = isRaw ? Number(pPanelInfo.axes.custom_drilldown_min) : Number(pPanelInfo.axes.custom_min);

    const maxVal = isRaw ? Number(pPanelInfo.axes.custom_drilldown_max) : Number(pPanelInfo.axes.custom_max);

    const isDefaultRange = minVal === 0 && maxVal === 0;

    if (isDefaultRange) {
        const [defaultMin, defaultMax] = updateYaxis().left;
        return { min: defaultMin, max: defaultMax };
    }

    return { min: minVal, max: maxVal };
}

function getNewYAxis(pChartData: any, pPanelInfo: any): () => yAxisType {
    return () => {
        const yAxis: yAxisType = {
            left: [] as number[],
            right: [] as number[],
        };

        const newData = pChartData && JSON.parse(JSON.stringify(pChartData));
        newData?.forEach((item: any) => {
            if (item.yAxis === 0) {
                const yAxisLeftMin = getMinValue(item.data, pPanelInfo.axes.zero_base === 'Y');
                const yAxisLeftMax = getMaxValue(item.data, pPanelInfo.axes.zero_base === 'Y');
                if (!yAxis.left[0] || yAxis.left[0] > yAxisLeftMin) {
                    yAxis.left[0] = yAxisLeftMin;
                }
                if (!yAxis.left[1] || yAxis.left[1] < yAxisLeftMax) {
                    yAxis.left[1] = yAxisLeftMax;
                }
            }
            if (item.yAxis === 1) {
                const yAxisLeftMin = getMinValue(item.data, pPanelInfo.axes.zero_base2 === 'Y');
                const yAxisLeftMax = getMaxValue(item.data, pPanelInfo.axes.zero_base2 === 'Y');
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
type yAxisType = {
    left: number[];
    right: number[];
};
function getMaxValue(array: number[][], zeroBaseCondition: boolean) {
    return array.reduce(
        (result: number, current: any) => {
            if (current[1] > result) result = current[1];
            return result;
        },
        zeroBaseCondition ? 0 : array[0]?.[1],
    );
}
function getMinValue(array: number[][], zeroBaseCondition: boolean) {
    return array.reduce(
        (result: number, current: any) => {
            if (current[1] < result) result = current[1];
            return result;
        },
        zeroBaseCondition ? 0 : array[0]?.[1],
    );
}
